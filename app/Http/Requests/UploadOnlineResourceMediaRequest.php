<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UploadOnlineResourceMediaRequest extends FormRequest
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
        $slot = (string) $this->input('slot', 'banner');
        $maxKb = $slot === 'banner' ? 4096 : 2048;

        return [
            'slot' => ['required', 'string', Rule::in(['logo', 'banner', 'og_image'])],
            'file' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:'.$maxKb,
            ],
        ];
    }
}
