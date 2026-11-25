<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class OnlineResourceMediaService
{
    /** @var list<string> */
    private const array ALLOWED_SLOTS = ['logo', 'banner', 'og_image'];

    /** @var list<string> */
    private const array ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    public function disk(): string
    {
        $configured = config('online-resources.media_disk');
        if (is_string($configured) && mb_trim($configured) !== '') {
            return mb_trim($configured);
        }

        $default = config('filesystems.default', 'public');

        return is_string($default) && mb_trim($default) !== '' ? mb_trim($default) : 'public';
    }

    public function storeImage(UploadedFile $file, int $schoolId, string $slot): string
    {
        if (! in_array($slot, self::ALLOWED_SLOTS, true)) {
            throw new InvalidArgumentException("Unsupported media slot [{$slot}].");
        }

        $extension = mb_strtolower((string) ($file->guessExtension() ?: $file->getClientOriginalExtension()));
        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }

        if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new InvalidArgumentException('Only JPG, PNG, and WebP images are supported.');
        }

        $directory = sprintf('online-resources/%d/%s', $schoolId, $slot);
        $filename = Str::uuid()->toString().'.'.$extension;

        $stored = $file->storePubliclyAs($directory, $filename, $this->disk());

        if (! is_string($stored) || $stored === '') {
            throw new InvalidArgumentException('Failed to store uploaded image.');
        }

        return $stored;
    }

    public function delete(?string $path): void
    {
        if (! is_string($path) || mb_trim($path) === '') {
            return;
        }

        $trimmed = mb_trim($path);
        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://') || str_starts_with($trimmed, '/')) {
            return;
        }

        if (! str_starts_with($trimmed, 'online-resources/')) {
            return;
        }

        try {
            Storage::disk($this->disk())->delete($trimmed);
        } catch (\Throwable) {
            // Ignore cleanup failures when object was already removed.
        }
    }

    public function url(?string $path): ?string
    {
        if (! is_string($path) || mb_trim($path) === '') {
            return null;
        }

        $trimmed = mb_trim($path);

        if (OnlineResourceService::isSafeHttpUrl($trimmed)) {
            return $trimmed;
        }

        if (str_starts_with($trimmed, '/')) {
            return url($trimmed);
        }

        try {
            return Storage::disk($this->disk())->url($trimmed);
        } catch (\Throwable) {
            return null;
        }
    }
}
