<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Enums;

enum OnlineResourceCardStyle: string
{
    case Elevated = 'elevated';
    case Bordered = 'bordered';
    case SoftFilled = 'soft_filled';
    case PillButton = 'pill_button';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }
}
