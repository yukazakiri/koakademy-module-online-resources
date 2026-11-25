<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Enums;

enum OnlineResourceTheme: string
{
    case ClientDefault = 'client_default';
    case Minimalist = 'minimalist';
    case VisualShowcase = 'visual_showcase';
    case Compact = 'compact';
    case GlassModern = 'glass_modern';
    case EditorialClassic = 'editorial_classic';
    case HighContrast = 'high_contrast';

    public function label(): string
    {
        return match ($this) {
            self::ClientDefault => 'Client Native',
            self::Minimalist => 'Minimalist',
            self::VisualShowcase => 'Visualizing',
            self::Compact => 'Compact',
            self::GlassModern => 'Glass Modern',
            self::EditorialClassic => 'Editorial Classic',
            self::HighContrast => 'High Contrast',
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
