<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Services;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Modules\OnlineResources\Enums\OnlineResourceAudience;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Models\OnlineResourceLink;

final readonly class OnlineResourceService
{
    public function __construct(
        private OnlineResourceScopeRegistry $scopes,
        private OnlineResourceQrService $qr,
        private OnlineResourceThemeService $themes,
        private OnlineResourceMediaService $media,
    ) {}

    /**
     * Validate that a URL uses an explicit safe http/https scheme.
     */
    public static function isSafeHttpUrl(string $url): bool
    {
        $trimmed = mb_trim($url);
        if ($trimmed === '' || str_starts_with($trimmed, '//')) {
            return false;
        }

        if (filter_var($trimmed, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $scheme = parse_url($trimmed, PHP_URL_SCHEME);
        $host = parse_url($trimmed, PHP_URL_HOST);

        return is_string($scheme)
            && in_array(mb_strtolower($scheme), ['http', 'https'], true)
            && is_string($host)
            && $host !== '';
    }

    /**
     * Fetch all categories + links owned by the given model (for management screens).
     *
     * @return Collection<int, OnlineResourceCategory>
     */
    public function categoriesForOwner(Model $owner, bool $onlyActive = false): Collection
    {
        $handler = $this->scopes->forModel($owner);
        $schoolId = $handler->schoolIdForOwner($owner);

        $query = OnlineResourceCategory::withoutSchoolScope()
            ->where('school_id', $schoolId)
            ->forOwner($handler->key(), (int) $owner->getKey())
            ->ordered();

        if ($onlyActive) {
            $query->active()->with(['activeLinks']);
        } else {
            $query->with(['links']);
        }

        return $query->get();
    }

    /**
     * Fetch categories visible to a specific viewer (guest or authenticated user).
     *
     * @return Collection<int, OnlineResourceCategory>
     */
    public function visibleCategoriesForOwner(Model $owner, ?Authenticatable $viewer): Collection
    {
        $handler = $this->scopes->forModel($owner);

        if (! $handler->isEnabledForOwner($owner)) {
            return new Collection;
        }

        return $this->categoriesForOwner($owner, onlyActive: true)
            ->filter(fn (OnlineResourceCategory $category): bool => $handler->canView($viewer, $owner, $category))
            ->values();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createCategory(Model $owner, array $data, ?Authenticatable $actor = null): OnlineResourceCategory
    {
        $handler = $this->scopes->forModel($owner);
        $schoolId = $handler->schoolIdForOwner($owner);
        $ownerType = $handler->key();
        $ownerId = (int) $owner->getKey();

        $nextOrder = ((int) OnlineResourceCategory::withoutSchoolScope()
            ->where('school_id', $schoolId)
            ->forOwner($ownerType, $ownerId)
            ->max('sort_order')) + 1;

        $name = mb_trim((string) $data['name']);
        $slugSource = isset($data['slug']) && is_string($data['slug']) && mb_trim($data['slug']) !== ''
            ? mb_trim($data['slug'])
            : $name;

        $designMode = isset($data['design_mode']) && in_array((string) $data['design_mode'], ['inherit', 'custom'], true)
            ? (string) $data['design_mode']
            : 'inherit';

        $designConfig = isset($data['design_config']) && is_array($data['design_config'])
            ? $this->themes->sanitizeDesignConfig($data['design_config'])
            : null;

        $seoConfig = isset($data['seo_config']) && is_array($data['seo_config'])
            ? $this->themes->sanitizeSeoConfig($data['seo_config'])
            : null;

        return OnlineResourceCategory::withoutSchoolScope()->create([
            'school_id' => $schoolId,
            'owner_type' => $ownerType,
            'owner_id' => $ownerId,
            'name' => $name,
            'slug' => OnlineResourceCategory::generateUniqueSlug($schoolId, $ownerType, $ownerId, $slugSource),
            'description' => isset($data['description']) ? mb_trim((string) $data['description']) ?: null : null,
            'hero_tagline' => isset($data['hero_tagline']) ? mb_trim((string) $data['hero_tagline']) ?: null : null,
            'icon' => (string) ($data['icon'] ?? 'link'),
            'accent_color' => (string) ($data['accent_color'] ?? 'blue'),
            'design_mode' => $designMode,
            'design_config' => $designConfig,
            'seo_config' => $seoConfig,
            'visibility' => (string) ($data['visibility'] ?? OnlineResourceVisibility::Public->value),
            'audience' => (string) ($data['audience'] ?? OnlineResourceAudience::All->value),
            'sort_order' => (int) ($data['sort_order'] ?? $nextOrder),
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            'created_by' => $actor !== null ? (int) $actor->getAuthIdentifier() : null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateCategory(OnlineResourceCategory $category, array $data): OnlineResourceCategory
    {
        $updates = [];

        if (array_key_exists('name', $data)) {
            $updates['name'] = mb_trim((string) $data['name']);
        }

        if (array_key_exists('slug', $data) && is_string($data['slug']) && mb_trim($data['slug']) !== '') {
            $updates['slug'] = OnlineResourceCategory::generateUniqueSlug(
                schoolId: $category->school_id,
                ownerType: $category->owner_type,
                ownerId: $category->owner_id,
                name: mb_trim($data['slug']),
                ignoreId: $category->id,
            );
        }

        if (array_key_exists('description', $data)) {
            $desc = mb_trim((string) ($data['description'] ?? ''));
            $updates['description'] = $desc !== '' ? $desc : null;
        }

        if (array_key_exists('hero_tagline', $data)) {
            $tagline = mb_trim((string) ($data['hero_tagline'] ?? ''));
            $updates['hero_tagline'] = $tagline !== '' ? $tagline : null;
        }

        if (array_key_exists('design_mode', $data) && in_array((string) $data['design_mode'], ['inherit', 'custom'], true)) {
            $updates['design_mode'] = (string) $data['design_mode'];
        }

        if (array_key_exists('design_config', $data)) {
            $updates['design_config'] = is_array($data['design_config'])
                ? $this->themes->sanitizeDesignConfig($data['design_config'], is_array($category->design_config) ? $category->design_config : null)
                : null;
        }

        if (array_key_exists('seo_config', $data)) {
            $updates['seo_config'] = is_array($data['seo_config'])
                ? $this->themes->sanitizeSeoConfig($data['seo_config'], is_array($category->seo_config) ? $category->seo_config : null)
                : null;
        }

        foreach (['icon', 'accent_color', 'visibility', 'audience'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] !== null) {
                $updates[$field] = (string) $data[$field];
            }
        }

        if (array_key_exists('is_active', $data)) {
            $updates['is_active'] = (bool) $data['is_active'];
        }

        if ($updates !== []) {
            $category->update($updates);
        }

        return $category->fresh(['links']) ?? $category;
    }

    public function deleteCategory(OnlineResourceCategory $category): void
    {
        $category->delete();
    }

    /**
     * @param  list<int>  $orderedIds
     */
    public function reorderCategories(Model $owner, array $orderedIds): void
    {
        $handler = $this->scopes->forModel($owner);
        $schoolId = $handler->schoolIdForOwner($owner);

        DB::transaction(function () use ($schoolId, $handler, $owner, $orderedIds): void {
            foreach ($orderedIds as $index => $categoryId) {
                OnlineResourceCategory::withoutSchoolScope()
                    ->where('school_id', $schoolId)
                    ->forOwner($handler->key(), (int) $owner->getKey())
                    ->where('id', $categoryId)
                    ->update(['sort_order' => $index + 1]);
            }
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createLink(OnlineResourceCategory $category, array $data, ?Authenticatable $actor = null): OnlineResourceLink
    {
        $nextOrder = ((int) OnlineResourceLink::withoutSchoolScope()
            ->where('category_id', $category->id)
            ->max('sort_order')) + 1;

        return OnlineResourceLink::withoutSchoolScope()->create([
            'school_id' => $category->school_id,
            'category_id' => $category->id,
            'title' => mb_trim((string) $data['title']),
            'url' => mb_trim((string) $data['url']),
            'description' => isset($data['description']) ? mb_trim((string) $data['description']) ?: null : null,
            'icon' => isset($data['icon']) && mb_trim((string) $data['icon']) !== '' ? mb_trim((string) $data['icon']) : null,
            'badge_text' => isset($data['badge_text']) ? mb_trim((string) $data['badge_text']) ?: null : null,
            'sort_order' => (int) ($data['sort_order'] ?? $nextOrder),
            'is_featured' => (bool) ($data['is_featured'] ?? false),
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            'opens_in_new_tab' => array_key_exists('opens_in_new_tab', $data) ? (bool) $data['opens_in_new_tab'] : true,
            'created_by' => $actor !== null ? (int) $actor->getAuthIdentifier() : null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateLink(OnlineResourceLink $link, array $data): OnlineResourceLink
    {
        $updates = [];

        if (array_key_exists('title', $data)) {
            $updates['title'] = mb_trim((string) $data['title']);
        }

        if (array_key_exists('url', $data)) {
            $nextUrl = mb_trim((string) $data['url']);
            $updates['url'] = $nextUrl;

            if ($nextUrl !== $link->url && $link->broken_report_count > 0) {
                $updates['broken_report_count'] = 0;
                $updates['last_reported_broken_at'] = null;
            }
        }

        if (array_key_exists('description', $data)) {
            $desc = mb_trim((string) ($data['description'] ?? ''));
            $updates['description'] = $desc !== '' ? $desc : null;
        }

        if (array_key_exists('icon', $data)) {
            $icon = mb_trim((string) ($data['icon'] ?? ''));
            $updates['icon'] = $icon !== '' ? $icon : null;
        }

        if (array_key_exists('badge_text', $data)) {
            $badge = mb_trim((string) ($data['badge_text'] ?? ''));
            $updates['badge_text'] = $badge !== '' ? $badge : null;
        }

        foreach (['is_featured', 'is_active', 'opens_in_new_tab'] as $boolField) {
            if (array_key_exists($boolField, $data)) {
                $updates[$boolField] = (bool) $data[$boolField];
            }
        }

        if (array_key_exists('category_id', $data) && $data['category_id'] !== null) {
            $updates['category_id'] = (int) $data['category_id'];
        }

        if ($updates !== []) {
            $link->update($updates);
        }

        return $link->fresh() ?? $link;
    }

    public function deleteLink(OnlineResourceLink $link): void
    {
        $link->delete();
    }

    public function clearBrokenReports(OnlineResourceLink $link): OnlineResourceLink
    {
        $link->update([
            'broken_report_count' => 0,
            'last_reported_broken_at' => null,
        ]);

        return $link->fresh() ?? $link;
    }

    /**
     * @param  list<int>  $orderedIds
     */
    public function reorderLinks(OnlineResourceCategory $category, array $orderedIds): void
    {
        DB::transaction(function () use ($category, $orderedIds): void {
            foreach ($orderedIds as $index => $linkId) {
                OnlineResourceLink::withoutSchoolScope()
                    ->where('category_id', $category->id)
                    ->where('id', $linkId)
                    ->update(['sort_order' => $index + 1]);
            }
        });
    }

    /**
     * Clone all categories and links from one owner to another (e.g., copying Class Resources
     * from a previous semester's class into a new class). Fresh short codes are generated.
     */
    public function cloneOwnerResources(Model $sourceOwner, Model $targetOwner, ?Authenticatable $actor = null): int
    {
        $sourceCategories = $this->categoriesForOwner($sourceOwner, onlyActive: false);
        $clonedCount = 0;

        DB::transaction(function () use ($sourceCategories, $targetOwner, $actor, &$clonedCount): void {
            foreach ($sourceCategories as $sourceCategory) {
                $newCategory = $this->createCategory($targetOwner, [
                    'name' => $sourceCategory->name,
                    'description' => $sourceCategory->description,
                    'hero_tagline' => $sourceCategory->hero_tagline,
                    'icon' => $sourceCategory->icon,
                    'accent_color' => $sourceCategory->accent_color,
                    'design_mode' => $sourceCategory->design_mode,
                    'design_config' => $sourceCategory->design_config,
                    'visibility' => $sourceCategory->visibility->value,
                    'audience' => $sourceCategory->audience->value,
                    'is_active' => $sourceCategory->is_active,
                ], $actor);

                $clonedCount++;

                foreach ($sourceCategory->links as $sourceLink) {
                    $this->createLink($newCategory, [
                        'title' => $sourceLink->title,
                        'url' => $sourceLink->url,
                        'description' => $sourceLink->description,
                        'icon' => $sourceLink->icon,
                        'badge_text' => $sourceLink->badge_text,
                        'is_featured' => $sourceLink->is_featured,
                        'is_active' => $sourceLink->is_active,
                        'opens_in_new_tab' => $sourceLink->opens_in_new_tab,
                    ], $actor);
                }
            }
        });

        return $clonedCount;
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeCategory(
        OnlineResourceCategory $category,
        bool $onlyActiveLinks = false,
        bool $includeAdminMeta = false,
        ?Model $owner = null,
    ): array {
        $links = $onlyActiveLinks
            ? ($category->relationLoaded('activeLinks') ? $category->activeLinks : $category->activeLinks()->get())
            : ($category->relationLoaded('links') ? $category->links : $category->links()->get());

        $seoConfig = $this->themes->sanitizeSeoConfig(
            is_array($category->seo_config) ? $category->seo_config : [],
        );
        $seoOgImageUrl = $this->media->url($seoConfig['og_image_path'] ?? null)
            ?? (is_string($seoConfig['og_image_url'] ?? null) ? $seoConfig['og_image_url'] : null);

        $payload = [
            'id' => $category->id,
            'owner_type' => $category->owner_type,
            'owner_id' => $category->owner_id,
            'short_code' => $category->short_code,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'hero_tagline' => $category->hero_tagline,
            'banner_url' => $this->media->url($category->banner_path),
            'icon' => $category->icon,
            'accent_color' => $category->accent_color,
            'design_mode' => $category->design_mode ?: 'inherit',
            'design_config' => is_array($category->design_config)
                ? $this->themes->sanitizeDesignConfig($category->design_config)
                : null,
            'seo_config' => array_merge($seoConfig, [
                'resolved_og_image_url' => $seoOgImageUrl,
            ]),
            'visibility' => $category->visibility->value,
            'visibility_label' => $category->visibility->label(),
            'audience' => $category->audience->value,
            'audience_label' => $category->audience->label(),
            'sort_order' => $category->sort_order,
            'is_active' => $category->is_active,
            'qr_url' => $this->qr->categoryUrl($category),
            'page_url' => $this->qr->categoryPageUrl($category, $owner),
            'links_count' => $links->count(),
            'links' => $links->map(fn (OnlineResourceLink $link): array => $this->serializeLink($link, $includeAdminMeta, $category))->values()->all(),
        ];

        if ($includeAdminMeta) {
            $payload['scan_count'] = $category->scan_count;
            $payload['total_clicks'] = $links->sum('click_count');
            $payload['qr_svg_url'] = $category->owner_type === 'class'
                ? route('faculty.classes.resources.categories.qr.svg', ['class' => $category->owner_id, 'category' => $category->id])
                : route('administrators.online-resources.categories.qr.svg', ['category' => $category->id]);
            $payload['qr_png_url'] = $category->owner_type === 'class'
                ? route('faculty.classes.resources.categories.qr.png', ['class' => $category->owner_id, 'category' => $category->id])
                : route('administrators.online-resources.categories.qr.png', ['category' => $category->id]);
            $payload['poster_pdf_url'] = $category->owner_type === 'class'
                ? route('faculty.classes.resources.categories.poster.pdf', ['class' => $category->owner_id, 'category' => $category->id])
                : route('administrators.online-resources.categories.poster.pdf', ['category' => $category->id]);
            $payload['media_upload_url'] = $category->owner_type === 'class'
                ? route('faculty.classes.resources.categories.media.store', ['class' => $category->owner_id, 'category' => $category->id])
                : route('administrators.online-resources.categories.media.store', ['category' => $category->id]);
            $payload['media_delete_url'] = $category->owner_type === 'class'
                ? route('faculty.classes.resources.categories.media.destroy', ['class' => $category->owner_id, 'category' => $category->id, 'slot' => '__SLOT__'])
                : route('administrators.online-resources.categories.media.destroy', ['category' => $category->id, 'slot' => '__SLOT__']);
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeLink(OnlineResourceLink $link, bool $includeAdminMeta = false, ?OnlineResourceCategory $category = null): array
    {
        $payload = [
            'id' => $link->id,
            'category_id' => $link->category_id,
            'short_code' => $link->short_code,
            'title' => $link->title,
            'url' => $link->url,
            'go_url' => $this->qr->linkUrl($link),
            'host' => $link->displayHost(),
            'description' => $link->description,
            'icon' => $link->icon,
            'badge_text' => $link->badge_text,
            'sort_order' => $link->sort_order,
            'is_featured' => $link->is_featured,
            'is_active' => $link->is_active,
            'opens_in_new_tab' => $link->opens_in_new_tab,
            'report_broken_url' => route('online-resources.qr.report-broken', ['shortCode' => $link->short_code]),
        ];

        if ($includeAdminMeta) {
            $ownerCategory = $category ?? ($link->relationLoaded('category') ? $link->category : null);
            $isClassScope = $ownerCategory instanceof OnlineResourceCategory && $ownerCategory->owner_type === 'class';

            $payload['click_count'] = $link->click_count;
            $payload['last_clicked_at'] = $link->last_clicked_at?->toIso8601String();
            $payload['broken_report_count'] = $link->broken_report_count;
            $payload['last_reported_broken_at'] = $link->last_reported_broken_at?->toIso8601String();
            $payload['qr_url'] = $this->qr->directLinkQrUrl($link);
            $payload['qr_svg_url'] = $isClassScope
                ? route('faculty.classes.resources.links.qr.svg', ['class' => $ownerCategory->owner_id, 'link' => $link->id])
                : route('administrators.online-resources.links.qr.svg', ['link' => $link->id]);
            $payload['qr_png_url'] = $isClassScope
                ? route('faculty.classes.resources.links.qr.png', ['class' => $ownerCategory->owner_id, 'link' => $link->id])
                : route('administrators.online-resources.links.qr.png', ['link' => $link->id]);
            $payload['clear_broken_report_url'] = $isClassScope
                ? route('faculty.classes.resources.links.clear-broken-report', ['class' => $ownerCategory->owner_id, 'link' => $link->id])
                : route('administrators.online-resources.links.clear-broken-report', ['link' => $link->id]);
        }

        return $payload;
    }

    /**
     * Serialize an owner's full category list for management or viewing.
     *
     * @return list<array<string, mixed>>
     */
    public function serializedForOwner(
        Model $owner,
        bool $onlyActive = false,
        bool $includeAdminMeta = false,
        ?Authenticatable $viewer = null,
    ): array {
        $categories = $onlyActive && $viewer !== null
            ? $this->visibleCategoriesForOwner($owner, $viewer)
            : $this->categoriesForOwner($owner, onlyActive: $onlyActive);

        return $categories
            ->map(fn (OnlineResourceCategory $category): array => $this->serializeCategory(
                category: $category,
                onlyActiveLinks: $onlyActive,
                includeAdminMeta: $includeAdminMeta,
                owner: $owner,
            ))
            ->values()
            ->all();
    }

    /**
     * Serialize visible school resources + enrolled class resources for the Student Portal.
     *
     * @param  Collection<int, Model>  $enrolledClasses
     * @return array{
     *     school_categories: list<array<string, mixed>>,
     *     class_groups: list<array<string, mixed>>,
     * }
     */
    public function forStudentPortal(?Model $school, Collection $enrolledClasses, Authenticatable $studentUser): array
    {
        $schoolCategories = $school instanceof Model
            ? $this->serializedForOwner($school, onlyActive: true, includeAdminMeta: false, viewer: $studentUser)
            : [];

        $classGroups = [];
        foreach ($enrolledClasses as $class) {
            $categories = $this->serializedForOwner($class, onlyActive: true, includeAdminMeta: false, viewer: $studentUser);
            if ($categories === []) {
                continue;
            }

            $meta = $this->scopes->forModel($class)->resolveHeaderMeta($class);

            $classGroups[] = [
                'class_id' => (int) $class->getKey(),
                'title' => $meta['title'],
                'subtitle' => $meta['subtitle'],
                'class_url' => route('student.classes.show', ['class' => $class->getKey(), 'tab' => 'resources']),
                'categories' => $categories,
            ];
        }

        return [
            'school_categories' => $schoolCategories,
            'class_groups' => $classGroups,
        ];
    }
}
