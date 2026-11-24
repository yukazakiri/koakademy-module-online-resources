<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\OnlineResources\Enums\OnlineResourceAudience;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;

final class UpdateOnlineResourceCategoryRequest extends FormRequest
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

        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:120', 'regex:/^[a-zA-Z0-9\s\-_]+$/'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:60'],
            'accent_color' => ['sometimes', 'nullable', 'string', 'max:40'],
            'visibility' => ['sometimes', 'required', 'string', Rule::in(OnlineResourceVisibility::valuesForScope($scopeKey))],
            'audience' => ['sometimes', 'required', 'string', Rule::enum(OnlineResourceAudience::class)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
