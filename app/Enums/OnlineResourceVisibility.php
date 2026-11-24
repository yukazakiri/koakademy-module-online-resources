<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Enums;

enum OnlineResourceVisibility: string
{
    case Public = 'public';
    case Authenticated = 'authenticated';
    case EnrolledOnly = 'enrolled_only';

    /**
     * @return list<string>
     */
    public static function valuesForScope(string $scopeKey): array
    {
        if ($scopeKey === 'class') {
            return [
                self::Public->value,
                self::EnrolledOnly->value,
                self::Authenticated->value,
            ];
        }

        return [
            self::Public->value,
            self::Authenticated->value,
        ];
    }

    public function label(): string
    {
        return match ($this) {
            self::Public => 'Public (Instant QR Access)',
            self::Authenticated => 'Signed-in Users Only',
            self::EnrolledOnly => 'Enrolled Class Students Only',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Public => 'Anyone who scans the QR code can view and open links immediately without signing in.',
            self::Authenticated => 'Requires a Koakademy account from this school before viewing links.',
            self::EnrolledOnly => 'Restricted to students enrolled in this class, its instructor, and school administrators.',
        };
    }
}
