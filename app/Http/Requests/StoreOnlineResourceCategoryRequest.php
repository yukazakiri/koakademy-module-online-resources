<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\OnlineResources\Enums\OnlineResourceAudience;
use Modules\OnlineResources\Enums\OnlineResourceCardStyle;
use Modules\OnlineResources\Enums\OnlineResourceFontPairing;
use Modules\OnlineResources\Enums\OnlineResourceHeroStyle;
use Modules\OnlineResources\Enums\OnlineResourceLayout;
use Modules\OnlineResources\Enums\OnlineResourceTheme;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Services\OnlineResourceService;
use Modules\OnlineResources\Services\OnlineResourceThemeService;

final class StoreOnlineResourceCategoryRequest extends FormRequest
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
                $fail('Invalid accent color.');
            }
        };

        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:120', 'regex:/^[a-zA-Z0-9\s\-_]+$/'],
            'description' => ['nullable', 'string', 'max:500'],
            'hero_tagline' => ['nullable', 'string', 'max:300'],
            'icon' => ['nullable', 'string', 'max:60'],
            'accent_color' => ['nullable', 'string', 'max:40'],
            'design_mode' => ['nullable', 'string', Rule::in(['inherit', 'custom'])],
            'visibility' => ['nullable', 'string', Rule::in(OnlineResourceVisibility::valuesForScope($scopeKey))],
            'audience' => ['nullable', 'string', Rule::enum(OnlineResourceAudience::class)],
            'is_active' => ['nullable', 'boolean'],

            'design_config' => ['nullable', 'array'],
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

            'seo_config' => ['nullable', 'array'],
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
