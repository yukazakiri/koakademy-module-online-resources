<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Enums;

enum OnlineResourceAudience: string
{
    case All = 'all';
    case Students = 'students';
    case Faculty = 'faculty';

    public function label(): string
    {
        return match ($this) {
            self::All => 'Everyone',
            self::Students => 'Students',
            self::Faculty => 'Faculty & Staff',
        };
    }
}
