<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\OnlineResources\Enums\OnlineResourceAudience;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;

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

        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:120', 'regex:/^[a-zA-Z0-9\s\-_]+$/'],
            'description' => ['nullable', 'string', 'max:500'],
            'icon' => ['nullable', 'string', 'max:60'],
            'accent_color' => ['nullable', 'string', 'max:40'],
            'visibility' => ['nullable', 'string', Rule::in(OnlineResourceVisibility::valuesForScope($scopeKey))],
            'audience' => ['nullable', 'string', Rule::enum(OnlineResourceAudience::class)],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
