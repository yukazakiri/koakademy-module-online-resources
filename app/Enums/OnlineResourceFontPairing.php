<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Enums;

enum OnlineResourceFontPairing: string
{
    case Client = 'client';
    case Sans = 'sans';
    case EditorialSerif = 'editorial_serif';
    case TechnicalMono = 'technical_mono';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }
}
