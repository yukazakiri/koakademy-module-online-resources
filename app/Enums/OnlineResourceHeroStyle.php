<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Enums;

enum OnlineResourceHeroStyle: string
{
    case Minimal = 'minimal';
    case Gradient = 'gradient';
    case BannerImage = 'banner_image';
    case CenteredProfile = 'centered_profile';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }
}
