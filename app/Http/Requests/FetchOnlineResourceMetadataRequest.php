<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Modules\OnlineResources\Services\OnlineResourceService;

final class FetchOnlineResourceMetadataRequest extends FormRequest
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
        ];
    }
}
