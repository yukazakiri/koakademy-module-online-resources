<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Modules\OnlineResources\Services\OnlineResourceService;

final class UpdateOnlineResourceLinkRequest extends FormRequest
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
        return [
            'title' => ['sometimes', 'required', 'string', 'max:160'],
            'url' => [
                'sometimes',
                'required',
                'string',
                'max:2048',
                static function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value) || ! OnlineResourceService::isSafeHttpUrl($value)) {
                        $fail('The resource URL must be a valid http:// or https:// web address.');
                    }
                },
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:60'],
            'badge_text' => ['sometimes', 'nullable', 'string', 'max:40'],
            'is_featured' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'opens_in_new_tab' => ['sometimes', 'boolean'],
            'category_id' => ['sometimes', 'integer', 'exists:online_resource_categories,id'],
        ];
    }
}
