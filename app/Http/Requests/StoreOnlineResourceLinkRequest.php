<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Modules\OnlineResources\Services\OnlineResourceService;

final class StoreOnlineResourceLinkRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:160'],
            'url' => [
                'required',
                'string',
                'max:2048',
                static function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value) || ! OnlineResourceService::isSafeHttpUrl($value)) {
                        $fail('The resource URL must be a valid http:// or https:// web address.');
                    }
                },
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'icon' => ['nullable', 'string', 'max:60'],
            'badge_text' => ['nullable', 'string', 'max:40'],
            'is_featured' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'opens_in_new_tab' => ['nullable', 'boolean'],
        ];
    }
}
