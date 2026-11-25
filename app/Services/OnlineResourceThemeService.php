<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Services;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Modules\OnlineResources\Enums\OnlineResourceCardStyle;
use Modules\OnlineResources\Enums\OnlineResourceFontPairing;
use Modules\OnlineResources\Enums\OnlineResourceHeroStyle;
use Modules\OnlineResources\Enums\OnlineResourceLayout;
use Modules\OnlineResources\Enums\OnlineResourceTheme;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Models\OnlineResourceHubSetting;

final readonly class OnlineResourceThemeService
{
    /** @var list<string> */
    public const array ACCENT_SWATCHES = [
        'client',
        'blue',
        'emerald',
        'amber',
        'violet',
        'rose',
        'cyan',
        'orange',
        'slate',
    ];

    /** @var list<string> */
    public const array COLOR_MODES = ['system', 'light', 'dark'];

    /** @var list<string> */
    public const array DENSITIES = ['comfortable', 'compact'];

    /** @var list<string> */
    public const array SOCIAL_PLATFORMS = [
        'website',
        'facebook',
        'instagram',
        'x',
        'youtube',
        'linkedin',
        'github',
        'email',
    ];

    public function __construct(
        private OnlineResourceScopeRegistry $scopes,
        private OnlineResourceMediaService $media,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function defaultDesignConfig(): array
    {
        return [
            'layout' => OnlineResourceLayout::Directory->value,
            'theme' => OnlineResourceTheme::ClientDefault->value,
            'color_mode' => 'system',
            'accent_color' => 'client',
            'hero_style' => OnlineResourceHeroStyle::Gradient->value,
            'card_style' => OnlineResourceCardStyle::Elevated->value,
            'density' => 'comfortable',
            'font_pairing' => OnlineResourceFontPairing::Client->value,
            'show_search' => true,
            'show_category_nav' => true,
            'show_personal_strips' => true,
            'show_descriptions' => true,
            'show_hosts' => true,
            'show_report_broken' => true,
            'show_portal_button' => true,
            'show_footer' => true,
            'show_back_to_hub' => true,
            'social_links' => [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function defaultSeoConfig(): array
    {
        return [
            'meta_title' => null,
            'meta_description' => null,
            'keywords' => null,
            'og_title' => null,
            'og_description' => null,
            'og_image_path' => null,
            'og_image_url' => null,
            'twitter_card' => 'summary_large_image',
            'canonical_url' => null,
            'robots_index' => true,
            'structured_data_enabled' => true,
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>|null  $base
     * @return array<string, mixed>
     */
    public function sanitizeDesignConfig(array $input, ?array $base = null): array
    {
        $resolved = array_merge($this->defaultDesignConfig(), $base ?? []);

        if (isset($input['layout']) && in_array((string) $input['layout'], OnlineResourceLayout::values(), true)) {
            $resolved['layout'] = (string) $input['layout'];
        }

        if (isset($input['theme']) && in_array((string) $input['theme'], OnlineResourceTheme::values(), true)) {
            $resolved['theme'] = (string) $input['theme'];
        }

        if (isset($input['color_mode']) && in_array((string) $input['color_mode'], self::COLOR_MODES, true)) {
            $resolved['color_mode'] = (string) $input['color_mode'];
        }

        if (isset($input['accent_color']) && is_string($input['accent_color'])) {
            $accent = mb_trim($input['accent_color']);
            if (in_array($accent, self::ACCENT_SWATCHES, true) || preg_match('/^#[0-9A-Fa-f]{6}$/', $accent) === 1) {
                $resolved['accent_color'] = $accent;
            }
        }

        if (isset($input['hero_style']) && in_array((string) $input['hero_style'], OnlineResourceHeroStyle::values(), true)) {
            $resolved['hero_style'] = (string) $input['hero_style'];
        }

        if (isset($input['card_style']) && in_array((string) $input['card_style'], OnlineResourceCardStyle::values(), true)) {
            $resolved['card_style'] = (string) $input['card_style'];
        }

        if (isset($input['density']) && in_array((string) $input['density'], self::DENSITIES, true)) {
            $resolved['density'] = (string) $input['density'];
        }

        if (isset($input['font_pairing']) && in_array((string) $input['font_pairing'], OnlineResourceFontPairing::values(), true)) {
            $resolved['font_pairing'] = (string) $input['font_pairing'];
        }

        foreach ([
            'show_search',
            'show_category_nav',
            'show_personal_strips',
            'show_descriptions',
            'show_hosts',
            'show_report_broken',
            'show_portal_button',
            'show_footer',
            'show_back_to_hub',
        ] as $toggle) {
            if (array_key_exists($toggle, $input)) {
                $resolved[$toggle] = (bool) $input[$toggle];
            }
        }

        if (array_key_exists('social_links', $input) && is_array($input['social_links'])) {
            $cleanLinks = [];
            foreach (array_slice($input['social_links'], 0, 6) as $entry) {
                if (! is_array($entry)) {
                    continue;
                }

                $platform = mb_strtolower(mb_trim((string) ($entry['platform'] ?? 'website')));
                if (! in_array($platform, self::SOCIAL_PLATFORMS, true)) {
                    $platform = 'website';
                }

                $url = mb_trim((string) ($entry['url'] ?? ''));
                $isSafeEmail = $platform === 'email' && str_starts_with(mb_strtolower($url), 'mailto:') && filter_var(mb_substr($url, 7), FILTER_VALIDATE_EMAIL) !== false;

                if ($isSafeEmail || OnlineResourceService::isSafeHttpUrl($url)) {
                    $cleanLinks[] = [
                        'platform' => $platform,
                        'label' => mb_trim((string) ($entry['label'] ?? '')) ?: ucfirst($platform),
                        'url' => $url,
                    ];
                }
            }

            $resolved['social_links'] = $cleanLinks;
        }

        return $resolved;
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>|null  $base
     * @return array<string, mixed>
     */
    public function sanitizeSeoConfig(array $input, ?array $base = null): array
    {
        $resolved = array_merge($this->defaultSeoConfig(), $base ?? []);

        $nullableStrings = [
            'meta_title' => 120,
            'meta_description' => 320,
            'keywords' => 300,
            'og_title' => 120,
            'og_description' => 320,
            'og_image_path' => 500,
        ];

        foreach ($nullableStrings as $field => $maxLen) {
            if (array_key_exists($field, $input)) {
                $val = mb_trim((string) ($input[$field] ?? ''));
                $resolved[$field] = $val !== '' ? mb_substr($val, 0, $maxLen) : null;
            }
        }

        foreach (['og_image_url', 'canonical_url'] as $urlField) {
            if (array_key_exists($urlField, $input)) {
                $val = mb_trim((string) ($input[$urlField] ?? ''));
                $resolved[$urlField] = ($val !== '' && OnlineResourceService::isSafeHttpUrl($val)) ? $val : null;
            }
        }

        if (isset($input['twitter_card']) && in_array((string) $input['twitter_card'], ['summary', 'summary_large_image'], true)) {
            $resolved['twitter_card'] = (string) $input['twitter_card'];
        }

        foreach (['robots_index', 'structured_data_enabled'] as $boolField) {
            if (array_key_exists($boolField, $input)) {
                $resolved[$boolField] = (bool) $input[$boolField];
            }
        }

        return $resolved;
    }

    public function forOwner(Model $owner): ?OnlineResourceHubSetting
    {
        $handler = $this->scopes->forModel($owner);
        $schoolId = $handler->schoolIdForOwner($owner);

        return OnlineResourceHubSetting::withoutSchoolScope()
            ->where('school_id', $schoolId)
            ->forOwner($handler->key(), (int) $owner->getKey())
            ->first();
    }

    public function schoolFallbackForOwner(Model $owner): ?OnlineResourceHubSetting
    {
        $handler = $this->scopes->forModel($owner);
        if ($handler->key() === 'school') {
            return null;
        }

        $schoolId = $handler->schoolIdForOwner($owner);

        return OnlineResourceHubSetting::withoutSchoolScope()
            ->where('school_id', $schoolId)
            ->forOwner('school', $schoolId)
            ->first();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function upsertForOwner(Model $owner, array $data, ?Authenticatable $actor = null): OnlineResourceHubSetting
    {
        $handler = $this->scopes->forModel($owner);
        $schoolId = $handler->schoolIdForOwner($owner);
        $ownerType = $handler->key();
        $ownerId = (int) $owner->getKey();

        $existing = OnlineResourceHubSetting::withoutSchoolScope()
            ->where('school_id', $schoolId)
            ->forOwner($ownerType, $ownerId)
            ->first();

        $attributes = [
            'school_id' => $schoolId,
            'owner_type' => $ownerType,
            'owner_id' => $ownerId,
            'updated_by' => $actor !== null ? (int) $actor->getAuthIdentifier() : $existing?->updated_by,
        ];

        if (array_key_exists('visibility', $data) && $data['visibility'] !== null) {
            $allowedValues = array_map(
                static fn (OnlineResourceVisibility $v): string => $v->value,
                $handler->allowedVisibilities(),
            );
            $requested = (string) $data['visibility'];
            if (in_array($requested, $allowedValues, true)) {
                $attributes['visibility'] = $requested;
            }
        } elseif (! $existing instanceof OnlineResourceHubSetting) {
            $attributes['visibility'] = OnlineResourceVisibility::Public->value;
        }

        if (array_key_exists('is_published', $data)) {
            $attributes['is_published'] = (bool) $data['is_published'];
        } elseif (! $existing instanceof OnlineResourceHubSetting) {
            $attributes['is_published'] = true;
        }

        foreach (['headline', 'tagline', 'badge_text', 'announcement_text', 'cta_label', 'footer_text'] as $textField) {
            if (array_key_exists($textField, $data)) {
                $trimmed = mb_trim((string) ($data[$textField] ?? ''));
                $attributes[$textField] = $trimmed !== '' ? $trimmed : null;
            }
        }

        foreach (['announcement_url', 'cta_url'] as $urlField) {
            if (array_key_exists($urlField, $data)) {
                $trimmed = mb_trim((string) ($data[$urlField] ?? ''));
                $attributes[$urlField] = ($trimmed !== '' && OnlineResourceService::isSafeHttpUrl($trimmed)) ? $trimmed : null;
            }
        }

        if (array_key_exists('design_config', $data) && is_array($data['design_config'])) {
            $attributes['design_config'] = $this->sanitizeDesignConfig(
                $data['design_config'],
                $existing?->design_config,
            );
        }

        if (array_key_exists('seo_config', $data) && is_array($data['seo_config'])) {
            $attributes['seo_config'] = $this->sanitizeSeoConfig(
                $data['seo_config'],
                $existing?->seo_config,
            );
        }

        if ($existing instanceof OnlineResourceHubSetting) {
            $existing->update($attributes);

            return $existing->fresh() ?? $existing;
        }

        return OnlineResourceHubSetting::withoutSchoolScope()->create($attributes);
    }

    /**
     * Resolve effective design tokens for an owner (School or Class, inheriting from School when appropriate).
     *
     * @return array<string, mixed>
     */
    public function resolveDesignForOwner(?OnlineResourceHubSetting $setting, ?OnlineResourceHubSetting $schoolFallback = null): array
    {
        $base = $this->defaultDesignConfig();

        if ($schoolFallback instanceof OnlineResourceHubSetting && is_array($schoolFallback->design_config)) {
            $base = $this->sanitizeDesignConfig($schoolFallback->design_config, $base);
        }

        if ($setting instanceof OnlineResourceHubSetting && is_array($setting->design_config)) {
            return $this->sanitizeDesignConfig($setting->design_config, $base);
        }

        return $base;
    }

    /**
     * Resolve effective design tokens for a category (either inheriting from Hub or applying custom overrides).
     *
     * @param  array<string, mixed>  $hubDesign
     * @return array<string, mixed>
     */
    public function resolveDesignForCategory(OnlineResourceCategory $category, array $hubDesign): array
    {
        if ($category->design_mode !== 'custom' || ! is_array($category->design_config)) {
            return $hubDesign;
        }

        return $this->sanitizeDesignConfig($category->design_config, $hubDesign);
    }

    /**
     * Serialize hub settings for Admin/Faculty editors and Public Website rendering.
     *
     * @param  array<string, mixed>  $headerMeta
     * @return array<string, mixed>
     */
    public function serializeHubSetting(
        Model $owner,
        ?OnlineResourceHubSetting $setting,
        array $headerMeta,
        ?OnlineResourceHubSetting $schoolFallback = null,
    ): array {
        $design = $this->resolveDesignForOwner($setting, $schoolFallback);
        $seo = $this->sanitizeSeoConfig(
            is_array($setting?->seo_config) ? $setting->seo_config : [],
        );

        $logoPath = $setting?->logo_path ?? $schoolFallback?->logo_path;
        $bannerPath = $setting?->banner_path;

        $ogImageUrl = $this->media->url($seo['og_image_path'] ?? null)
            ?? (is_string($seo['og_image_url'] ?? null) ? $seo['og_image_url'] : null);

        return [
            'exists' => $setting instanceof OnlineResourceHubSetting,
            'visibility' => $setting?->visibility?->value ?? OnlineResourceVisibility::Public->value,
            'is_published' => $setting instanceof OnlineResourceHubSetting ? $setting->is_published : true,
            'headline' => $setting?->headline,
            'effective_headline' => $setting?->headline ?: (string) ($headerMeta['title'] ?? ''),
            'tagline' => $setting?->tagline,
            'effective_tagline' => $setting?->tagline ?: ($headerMeta['subtitle'] ?? null),
            'badge_text' => $setting?->badge_text,
            'effective_badge_text' => $setting?->badge_text ?: (string) ($headerMeta['badge'] ?? 'Online Resources'),
            'announcement_text' => $setting?->announcement_text,
            'announcement_url' => $setting?->announcement_url,
            'cta_label' => $setting?->cta_label,
            'cta_url' => $setting?->cta_url,
            'logo_path' => $setting?->logo_path,
            'logo_url' => $this->media->url($logoPath),
            'banner_path' => $bannerPath,
            'banner_url' => $this->media->url($bannerPath),
            'footer_text' => $setting?->footer_text,
            'design_config' => $design,
            'seo_config' => array_merge($seo, [
                'resolved_og_image_url' => $ogImageUrl,
            ]),
        ];
    }
}
