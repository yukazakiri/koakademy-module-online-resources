<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Enums;

enum OnlineResourceLayout: string
{
    case Directory = 'directory';
    case Minimalist = 'minimalist';
    case VisualShowcase = 'visual_showcase';
    case Bento = 'bento';
    case LinkStack = 'link_stack';
    case EditorialPortal = 'editorial_portal';
    case CompactIndex = 'compact_index';

    public function label(): string
    {
        return match ($this) {
            self::Directory => 'Classic Directory',
            self::Minimalist => 'Minimalist',
            self::VisualShowcase => 'Visualizing Showcase',
            self::Bento => 'Bento Grid',
            self::LinkStack => 'Bio / Link Stack',
            self::EditorialPortal => 'Editorial Portal',
            self::CompactIndex => 'Compact Launchpad',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }
}
