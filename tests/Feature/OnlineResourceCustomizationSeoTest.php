<?php

declare(strict_types=1);

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\OnlineResources\Enums\OnlineResourceLayout;
use Modules\OnlineResources\Enums\OnlineResourceTheme;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Services\OnlineResourceMediaService;
use Modules\OnlineResources\Services\OnlineResourceScopeRegistry;
use Modules\OnlineResources\Services\OnlineResourceSeoService;
use Modules\OnlineResources\Services\OnlineResourceService;
use Modules\OnlineResources\Services\OnlineResourceThemeService;

beforeEach(function (): void {
    app(OnlineResourceScopeRegistry::class)->register(new FakeSchoolScopeHandler);

    $this->school = FakeSchoolOwner::query()->create([
        'name' => 'Custom Hub Academy',
        'code' => 'CHA',
        'is_active' => true,
    ]);
});

it('persists hub customization linked to client CSS tokens by default and supports category inheritance or override', function (): void {
    $themes = app(OnlineResourceThemeService::class);
    $service = app(OnlineResourceService::class);

    $defaults = $themes->defaultDesignConfig();
    expect($defaults['theme'])->toBe(OnlineResourceTheme::ClientDefault->value)
        ->and($defaults['accent_color'])->toBe('client')
        ->and($defaults['font_pairing'])->toBe('client');

    $setting = $themes->upsertForOwner($this->school, [
        'headline' => 'Campus Digital Portal',
        'tagline' => 'Fast access to every student tool.',
        'announcement_text' => 'Enrollment open now',
        'announcement_url' => 'https://enroll.example.edu',
        'cta_label' => 'Student Portal',
        'cta_url' => 'https://portal.example.edu',
        'design_config' => [
            'layout' => OnlineResourceLayout::Bento->value,
            'theme' => OnlineResourceTheme::Minimalist->value,
            'accent_color' => '#2563EB',
            'social_links' => [
                ['platform' => 'website', 'label' => 'Main Site', 'url' => 'https://example.edu'],
                ['platform' => 'website', 'label' => 'Bad XSS', 'url' => 'javascript:alert(1)'],
            ],
        ],
        'seo_config' => [
            'meta_title' => 'Custom SEO Title',
            'meta_description' => 'Custom SEO Description',
            'keywords' => 'campus, portal, resources',
            'robots_index' => true,
        ],
    ]);

    expect($setting->headline)->toBe('Campus Digital Portal')
        ->and($setting->design_config['layout'])->toBe('bento')
        ->and($setting->design_config['theme'])->toBe('minimalist')
        ->and($setting->design_config['accent_color'])->toBe('#2563EB')
        ->and($setting->design_config['social_links'])->toHaveCount(1);

    $hubDesign = $themes->resolveDesignForOwner($setting);

    $inheritedCategory = $service->createCategory($this->school, [
        'name' => 'Library',
        'design_mode' => 'inherit',
    ]);

    $customCategory = $service->createCategory($this->school, [
        'name' => 'Campus Socials',
        'design_mode' => 'custom',
        'hero_tagline' => 'Follow all official campus channels.',
        'design_config' => [
            'layout' => OnlineResourceLayout::LinkStack->value,
            'theme' => OnlineResourceTheme::VisualShowcase->value,
            'accent_color' => 'client',
        ],
        'seo_config' => [
            'meta_title' => 'Official Social Links',
            'robots_index' => false,
        ],
    ]);

    expect($themes->resolveDesignForCategory($inheritedCategory, $hubDesign)['layout'])->toBe('bento')
        ->and($themes->resolveDesignForCategory($customCategory, $hubDesign)['layout'])->toBe('link_stack')
        ->and($themes->resolveDesignForCategory($customCategory, $hubDesign)['theme'])->toBe('visual_showcase')
        ->and($themes->resolveDesignForCategory($customCategory, $hubDesign)['accent_color'])->toBe('client');
});

it('enforces visibility rules on SEO indexing, canonical URLs, and structured data', function (): void {
    $themes = app(OnlineResourceThemeService::class);
    $seo = app(OnlineResourceSeoService::class);
    $service = app(OnlineResourceService::class);

    $setting = $themes->upsertForOwner($this->school, [
        'visibility' => OnlineResourceVisibility::Public->value,
        'seo_config' => [
            'meta_title' => 'CHA Resources Hub',
            'meta_description' => 'All public campus links.',
            'robots_index' => true,
            'structured_data_enabled' => true,
        ],
    ]);

    $publicCat = $service->createCategory($this->school, [
        'name' => 'Admissions',
        'visibility' => OnlineResourceVisibility::Public->value,
        'seo_config' => [
            'meta_title' => 'Admissions Guide',
            'robots_index' => true,
        ],
    ]);
    $service->createLink($publicCat, [
        'title' => 'Apply Online',
        'url' => 'https://apply.example.edu',
    ]);

    $privateCat = $service->createCategory($this->school, [
        'name' => 'Faculty Internal',
        'visibility' => OnlineResourceVisibility::Authenticated->value,
        'seo_config' => [
            'meta_title' => 'Secret Faculty Links',
            'robots_index' => true,
        ],
    ]);

    $headerMeta = app(OnlineResourceScopeRegistry::class)->forModel($this->school)->resolveHeaderMeta($this->school);
    $serializedHub = $themes->serializeHubSetting($this->school, $setting, $headerMeta);

    $publicHubSeo = $seo->buildForHub(
        headerMeta: $headerMeta,
        serializedHub: $serializedHub,
        categories: OnlineResourceCategory::query()->whereKey($publicCat->id)->get(),
        canonicalUrl: 'https://campus.test/resources/CHA',
        currentUrl: 'https://campus.test/resources/CHA',
        isPubliclyVisible: true,
    );

    expect($publicHubSeo['robots'])->toBe('index, follow')
        ->and($publicHubSeo['allow_indexing'])->toBeTrue()
        ->and($publicHubSeo['canonical_url'])->toBe('https://campus.test/resources/CHA')
        ->and($publicHubSeo['structured_data'])->toBeArray()
        ->and($publicHubSeo['structured_data']['@type'])->toBe('CollectionPage');

    $publicCatSeo = $seo->buildForCategory(
        category: $publicCat->load('activeLinks'),
        headerMeta: $headerMeta,
        serializedHub: $serializedHub,
        canonicalUrl: 'https://campus.test/resources/CHA/admissions',
        currentUrl: 'https://campus.test/q/'.$publicCat->short_code,
        isPubliclyVisible: true,
    );

    expect($publicCatSeo['title'])->toBe('Admissions Guide')
        ->and($publicCatSeo['robots'])->toBe('index, follow')
        ->and($publicCatSeo['canonical_url'])->toBe('https://campus.test/resources/CHA/admissions')
        ->and($publicCatSeo['structured_data']['mainEntity']['numberOfItems'])->toBe(1);

    // Private / authenticated categories MUST force noindex, nofollow and omit structured data even if robots_index is true.
    $privateCatSeo = $seo->buildForCategory(
        category: $privateCat,
        headerMeta: $headerMeta,
        serializedHub: $serializedHub,
        canonicalUrl: 'https://campus.test/resources/CHA/faculty-internal',
        currentUrl: 'https://campus.test/q/'.$privateCat->short_code,
        isPubliclyVisible: false,
    );

    expect($privateCatSeo['robots'])->toBe('noindex, nofollow')
        ->and($privateCatSeo['allow_indexing'])->toBeFalse()
        ->and($privateCatSeo['canonical_url'])->toBeNull()
        ->and($privateCatSeo['structured_data'])->toBeNull();
});

it('stores safe raster images and rejects SVG uploads', function (): void {
    Storage::fake('public');
    config()->set('online-resources.media_disk', 'public');

    $media = app(OnlineResourceMediaService::class);

    $png = UploadedFile::fake()->image('banner.png', 1200, 400);
    $path = $media->storeImage($png, (int) $this->school->id, 'banner');

    expect($path)->toStartWith('online-resources/'.$this->school->id.'/banner/')
        ->and(Storage::disk('public')->exists($path))->toBeTrue()
        ->and($media->url($path))->not->toBeNull();

    $media->delete($path);
    expect(Storage::disk('public')->exists($path))->toBeFalse();

    $svg = UploadedFile::fake()->create('xss.svg', 10, 'image/svg+xml');
    expect(fn () => $media->storeImage($svg, (int) $this->school->id, 'logo'))
        ->toThrow(InvalidArgumentException::class);
});
