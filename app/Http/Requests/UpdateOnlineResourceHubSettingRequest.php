<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\OnlineResources\Enums\OnlineResourceCardStyle;
use Modules\OnlineResources\Enums\OnlineResourceFontPairing;
use Modules\OnlineResources\Enums\OnlineResourceHeroStyle;
use Modules\OnlineResources\Enums\OnlineResourceLayout;
use Modules\OnlineResources\Enums\OnlineResourceTheme;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Services\OnlineResourceService;
use Modules\OnlineResources\Services\OnlineResourceThemeService;

final class UpdateOnlineResourceHubSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $scopeKey = $this->routeIs('faculty.classes.resources.*') ? 'class' : 'school';

        $safeUrlRule = static function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value === null || $value === '') {
                return;
            }
            if (! is_string($value) || ! OnlineResourceService::isSafeHttpUrl($value)) {
                $fail('The '.$attribute.' must be a valid http:// or https:// URL.');
            }
        };

        $accentRule = static function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value === null || $value === '') {
                return;
            }
            if (! is_string($value)) {
                $fail('Invalid accent color.');

                return;
            }
            $trimmed = mb_trim($value);
            if (
                ! in_array($trimmed, OnlineResourceThemeService::ACCENT_SWATCHES, true)
                && preg_match('/^#[0-9A-Fa-f]{6}$/', $trimmed) !== 1
            ) {
                $fail('Accent color must be a preset swatch, "client", or a 6-digit hex color like #2563EB.');
            }
        };

        return [
            'visibility' => ['sometimes', 'string', Rule::in(OnlineResourceVisibility::valuesForScope($scopeKey))],
            'is_published' => ['sometimes', 'boolean'],
            'headline' => ['sometimes', 'nullable', 'string', 'max:160'],
            'tagline' => ['sometimes', 'nullable', 'string', 'max:500'],
            'badge_text' => ['sometimes', 'nullable', 'string', 'max:80'],
            'announcement_text' => ['sometimes', 'nullable', 'string', 'max:300'],
            'announcement_url' => ['sometimes', 'nullable', 'string', 'max:2048', $safeUrlRule],
            'cta_label' => ['sometimes', 'nullable', 'string', 'max:60'],
            'cta_url' => ['sometimes', 'nullable', 'string', 'max:2048', $safeUrlRule],
            'footer_text' => ['sometimes', 'nullable', 'string', 'max:300'],

            'design_config' => ['sometimes', 'array'],
            'design_config.layout' => ['sometimes', 'string', Rule::in(OnlineResourceLayout::values())],
            'design_config.theme' => ['sometimes', 'string', Rule::in(OnlineResourceTheme::values())],
            'design_config.color_mode' => ['sometimes', 'string', Rule::in(OnlineResourceThemeService::COLOR_MODES)],
            'design_config.accent_color' => ['sometimes', 'string', 'max:20', $accentRule],
            'design_config.hero_style' => ['sometimes', 'string', Rule::in(OnlineResourceHeroStyle::values())],
            'design_config.card_style' => ['sometimes', 'string', Rule::in(OnlineResourceCardStyle::values())],
            'design_config.density' => ['sometimes', 'string', Rule::in(OnlineResourceThemeService::DENSITIES)],
            'design_config.font_pairing' => ['sometimes', 'string', Rule::in(OnlineResourceFontPairing::values())],
            'design_config.show_search' => ['sometimes', 'boolean'],
            'design_config.show_category_nav' => ['sometimes', 'boolean'],
            'design_config.show_personal_strips' => ['sometimes', 'boolean'],
            'design_config.show_descriptions' => ['sometimes', 'boolean'],
            'design_config.show_hosts' => ['sometimes', 'boolean'],
            'design_config.show_report_broken' => ['sometimes', 'boolean'],
            'design_config.show_portal_button' => ['sometimes', 'boolean'],
            'design_config.show_footer' => ['sometimes', 'boolean'],
            'design_config.show_back_to_hub' => ['sometimes', 'boolean'],
            'design_config.social_links' => ['sometimes', 'array', 'max:6'],
            'design_config.social_links.*.platform' => ['required_with:design_config.social_links', 'string', Rule::in(OnlineResourceThemeService::SOCIAL_PLATFORMS)],
            'design_config.social_links.*.label' => ['nullable', 'string', 'max:40'],
            'design_config.social_links.*.url' => ['required_with:design_config.social_links', 'string', 'max:2048'],

            'seo_config' => ['sometimes', 'array'],
            'seo_config.meta_title' => ['sometimes', 'nullable', 'string', 'max:120'],
            'seo_config.meta_description' => ['sometimes', 'nullable', 'string', 'max:320'],
            'seo_config.keywords' => ['sometimes', 'nullable', 'string', 'max:300'],
            'seo_config.og_title' => ['sometimes', 'nullable', 'string', 'max:120'],
            'seo_config.og_description' => ['sometimes', 'nullable', 'string', 'max:320'],
            'seo_config.og_image_url' => ['sometimes', 'nullable', 'string', 'max:2048', $safeUrlRule],
            'seo_config.twitter_card' => ['sometimes', 'string', Rule::in(['summary', 'summary_large_image'])],
            'seo_config.canonical_url' => ['sometimes', 'nullable', 'string', 'max:2048', $safeUrlRule],
            'seo_config.robots_index' => ['sometimes', 'boolean'],
            'seo_config.structured_data_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
