<?php

declare(strict_types=1);

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Modules\OnlineResources\Contracts\OnlineResourceScopeHandler;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Services\OnlineResourceQrService;
use Modules\OnlineResources\Services\OnlineResourceScopeRegistry;
use Modules\OnlineResources\Services\OnlineResourceService;

final class FakeSchoolOwner extends Model
{
    protected $table = 'schools';

    protected $guarded = [];
}

final class FakeSchoolScopeHandler implements OnlineResourceScopeHandler
{
    public function key(): string
    {
        return 'school';
    }

    public function modelClass(): string
    {
        return FakeSchoolOwner::class;
    }

    public function findOwner(int $ownerId): ?Model
    {
        return FakeSchoolOwner::query()->find($ownerId);
    }

    public function schoolIdForOwner(Model $owner): int
    {
        return (int) $owner->getKey();
    }

    public function isEnabledForOwner(Model $owner): bool
    {
        return (bool) $owner->getAttribute('is_active');
    }

    public function canViewAdmin(Authenticatable $user, Model $owner): bool
    {
        return true;
    }

    public function canManage(Authenticatable $user, Model $owner): bool
    {
        return true;
    }

    public function canView(?Authenticatable $user, Model $owner, OnlineResourceCategory $category): bool
    {
        if (! $category->is_active || ! $this->isEnabledForOwner($owner)) {
            return false;
        }

        return $category->visibility === OnlineResourceVisibility::Public || $user !== null;
    }

    public function allowedVisibilities(): array
    {
        return [
            OnlineResourceVisibility::Public,
            OnlineResourceVisibility::Authenticated,
        ];
    }

    public function resolveHeaderMeta(Model $owner): array
    {
        return [
            'scope' => 'school',
            'title' => (string) $owner->getAttribute('name'),
            'subtitle' => 'School Online Resources Directory',
            'badge' => 'School Resources',
            'school_name' => (string) $owner->getAttribute('name'),
            'school_code' => (string) $owner->getAttribute('code'),
            'hub_url' => route('online-resources.directory', ['schoolCode' => (string) $owner->getAttribute('code')]),
        ];
    }
}

beforeEach(function (): void {
    app(OnlineResourceScopeRegistry::class)->register(new FakeSchoolScopeHandler);

    $this->school = FakeSchoolOwner::query()->create([
        'name' => 'Test Academy',
        'code' => 'TEST',
        'is_active' => true,
    ]);
});

it('creates categories and links with permanent short codes and defaults to public visibility', function (): void {
    $service = app(OnlineResourceService::class);

    $category = $service->createCategory($this->school, [
        'name' => 'Student Services',
        'description' => 'Quick links for students',
    ]);

    expect($category->visibility)->toBe(OnlineResourceVisibility::Public)
        ->and($category->short_code)->toHaveLength(8)
        ->and($category->slug)->toBe('student-services');

    $originalCode = $category->short_code;

    $updated = $service->updateCategory($category, [
        'name' => 'Campus Services',
    ]);

    expect($updated->short_code)->toBe($originalCode)
        ->and($updated->name)->toBe('Campus Services');

    $link = $service->createLink($updated, [
        'title' => 'Online Library',
        'url' => 'https://library.example.edu/catalog',
        'is_featured' => true,
    ]);

    expect($link->short_code)->toHaveLength(8)
        ->and($link->displayHost())->toBe('library.example.edu')
        ->and($link->is_featured)->toBeTrue();
});

it('generates SVG and PNG QR codes for categories and hubs', function (): void {
    $service = app(OnlineResourceService::class);
    $qr = app(OnlineResourceQrService::class);

    $category = $service->createCategory($this->school, ['name' => 'Admissions']);

    $svg = $qr->generateSvg($qr->categoryUrl($category));
    $png = $qr->generatePng($qr->categoryUrl($category));

    expect($svg)->toContain('<svg')
        ->and(str_starts_with($png, "\x89PNG"))->toBeTrue();
});

it('tracks link clicks and redirects via /q/go/{shortCode} with no-referrer header', function (): void {
    $service = app(OnlineResourceService::class);

    $category = $service->createCategory($this->school, ['name' => 'Quick Links']);
    $link = $service->createLink($category, [
        'title' => 'Registrar Portal',
        'url' => 'https://registrar.example.edu/forms',
    ]);

    $response = $this->get(route('online-resources.qr.go', ['shortCode' => $link->short_code]));

    $response->assertRedirect('https://registrar.example.edu/forms');
    $response->assertHeader('Referrer-Policy', 'no-referrer');

    expect($link->fresh()->click_count)->toBe(1)
        ->and($link->fresh()->last_clicked_at)->not->toBeNull();
});

it('clones categories and links across owners with fresh short codes', function (): void {
    $service = app(OnlineResourceService::class);

    $otherSchool = FakeSchoolOwner::query()->create([
        'name' => 'Second Academy',
        'code' => 'SEC',
        'is_active' => true,
    ]);

    $sourceCat = $service->createCategory($this->school, ['name' => 'Syllabus']);
    $sourceLink = $service->createLink($sourceCat, [
        'title' => 'Course Outline',
        'url' => 'https://docs.example.edu/outline',
    ]);

    $clonedCount = $service->cloneOwnerResources($this->school, $otherSchool);

    expect($clonedCount)->toBe(1);

    $targetCategories = $service->categoriesForOwner($otherSchool);

    expect($targetCategories)->toHaveCount(1)
        ->and($targetCategories->first()->name)->toBe('Syllabus')
        ->and($targetCategories->first()->short_code)->not->toBe($sourceCat->short_code)
        ->and($targetCategories->first()->links)->toHaveCount(1)
        ->and($targetCategories->first()->links->first()->short_code)->not->toBe($sourceLink->short_code);
});

it('reorders categories and links deterministically', function (): void {
    $service = app(OnlineResourceService::class);

    $first = $service->createCategory($this->school, ['name' => 'First']);
    $second = $service->createCategory($this->school, ['name' => 'Second']);

    $service->reorderCategories($this->school, [$second->id, $first->id]);

    $ordered = $service->categoriesForOwner($this->school);

    expect($ordered->pluck('id')->all())->toBe([$second->id, $first->id]);

    $linkA = $service->createLink($first, ['title' => 'A', 'url' => 'https://a.example.edu']);
    $linkB = $service->createLink($first, ['title' => 'B', 'url' => 'https://b.example.edu']);

    $service->reorderLinks($first, [$linkB->id, $linkA->id]);

    expect($first->fresh('links')->links->pluck('id')->all())->toBe([$linkB->id, $linkA->id]);
});

it('enforces visibility filtering for guests on authenticated categories', function (): void {
    $service = app(OnlineResourceService::class);

    $publicCat = $service->createCategory($this->school, [
        'name' => 'Public Info',
        'visibility' => OnlineResourceVisibility::Public->value,
    ]);
    $authCat = $service->createCategory($this->school, [
        'name' => 'Internal Docs',
        'visibility' => OnlineResourceVisibility::Authenticated->value,
    ]);

    $guestVisible = $service->visibleCategoriesForOwner($this->school, null);

    expect($guestVisible->pluck('id')->all())->toBe([$publicCat->id]);

    $link = $service->createLink($authCat, [
        'title' => 'Internal Form',
        'url' => 'https://intranet.example.edu/form',
    ]);

    // Define login route so guest redirect works cleanly
    app('router')->get('/login', fn () => 'login')->name('login');

    $this->get(route('online-resources.qr.go', ['shortCode' => $link->short_code]))
        ->assertRedirect('/login');
});

it('increments link click counts atomically across repeated visits', function (): void {
    $service = app(OnlineResourceService::class);

    $category = $service->createCategory($this->school, ['name' => 'Atomic Clicks']);
    $link = $service->createLink($category, [
        'title' => 'Campus Portal',
        'url' => 'https://portal.example.edu',
    ]);

    $this->get(route('online-resources.qr.go', ['shortCode' => $link->short_code]))->assertRedirect('https://portal.example.edu');
    $this->get(route('online-resources.qr.go', ['shortCode' => $link->short_code]))->assertRedirect('https://portal.example.edu');
    $this->get(route('online-resources.qr.go', ['shortCode' => $link->short_code]))->assertRedirect('https://portal.example.edu');

    expect($link->fresh()->click_count)->toBe(3)
        ->and($link->fresh()->last_clicked_at)->not->toBeNull();
});

it('serializes direct single-link QR URLs and supports moving links with custom icons across categories', function (): void {
    $service = app(OnlineResourceService::class);
    $qr = app(OnlineResourceQrService::class);

    $first = $service->createCategory($this->school, ['name' => 'Forms']);
    $second = $service->createCategory($this->school, ['name' => 'Guides']);
    $link = $service->createLink($first, [
        'title' => 'Registrar Request Form',
        'url' => 'https://docs.google.com/forms/d/e/test/viewform',
        'icon' => 'document',
    ]);

    $serialized = $service->serializeCategory($first, onlyActiveLinks: false, includeAdminMeta: true);

    expect($serialized['links'][0]['icon'])->toBe('document')
        ->and($serialized['links'][0]['qr_url'])->toBe($qr->directLinkQrUrl($link))
        ->and($serialized['links'][0]['qr_svg_url'])->toContain('/links/'.$link->id.'/qr.svg')
        ->and($serialized['links'][0]['qr_png_url'])->toContain('/links/'.$link->id.'/qr.png');

    $moved = $service->updateLink($link, [
        'category_id' => $second->id,
        'icon' => 'book',
    ]);

    expect($moved->category_id)->toBe($second->id)
        ->and($moved->icon)->toBe('book');
});
