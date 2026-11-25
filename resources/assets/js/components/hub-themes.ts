import type React from "react";
import type {
    OnlineResourceCardStyleKey,
    OnlineResourceDesignConfig,
    OnlineResourceFontPairingKey,
    OnlineResourceHeroStyleKey,
    OnlineResourceLayoutKey,
    OnlineResourceThemeKey,
} from "../types";

export const DEFAULT_DESIGN_CONFIG: OnlineResourceDesignConfig = {
    layout: "directory",
    theme: "client_default",
    color_mode: "system",
    accent_color: "client",
    hero_style: "gradient",
    card_style: "elevated",
    density: "comfortable",
    font_pairing: "client",
    show_search: true,
    show_category_nav: true,
    show_personal_strips: true,
    show_descriptions: true,
    show_hosts: true,
    show_report_broken: true,
    show_portal_button: true,
    show_footer: true,
    show_back_to_hub: true,
    social_links: [],
};

export interface LayoutPresetOption {
    value: OnlineResourceLayoutKey;
    label: string;
    tagline: string;
    bestFor: string;
}

export const HUB_LAYOUT_OPTIONS: LayoutPresetOption[] = [
    {
        value: "directory",
        label: "Classic Directory",
        tagline: "Multi-column card grid with search & category pills",
        bestFor: "School-wide directories & general resource hubs",
    },
    {
        value: "minimalist",
        label: "Minimalist",
        tagline: "Generous whitespace, hairline rules, typography-first feed",
        bestFor: "Clean editorial links with zero visual clutter",
    },
    {
        value: "visual_showcase",
        label: "Visualizing Showcase",
        tagline: "Bold visual cards, accent headers, featured spotlight",
        bestFor: "Admissions, campus tours, media & visual portals",
    },
    {
        value: "bento",
        label: "Bento Grid",
        tagline: "Asymmetric modern tiles where featured links span wide",
        bestFor: "Modern campus portals & highlight collections",
    },
    {
        value: "link_stack",
        label: "Bio / Link Stack",
        tagline: "Centered mobile-first vertical stack (Linktree style)",
        bestFor: "QR posters, orientation & campus social links",
    },
    {
        value: "editorial_portal",
        label: "Editorial Portal",
        tagline: "Sticky category sidebar + rich descriptive knowledge cards",
        bestFor: "Library, research guides & student services sites",
    },
    {
        value: "compact_index",
        label: "Compact Launchpad",
        tagline: "High-density 2-column rows for rapid scan & launch",
        bestFor: "IT helpdesk, downloadable forms & faculty toolkits",
    },
];

export interface ThemePresetOption {
    value: OnlineResourceThemeKey;
    label: string;
    description: string;
}

export const HUB_THEME_OPTIONS: ThemePresetOption[] = [
    {
        value: "client_default",
        label: "Client Native",
        description: "Pure expression of your configured client CSS tokens",
    },
    {
        value: "minimalist",
        label: "Minimalist",
        description: "Flat canvas, crisp hairlines, restrained client accents",
    },
    {
        value: "visual_showcase",
        label: "Visualizing",
        description: "Expressive client-token gradients & bold icon canvases",
    },
    {
        value: "compact",
        label: "Compact",
        description: "Tighter spacing, sharp corners, information-dense surfaces",
    },
    {
        value: "glass_modern",
        label: "Glass Modern",
        description: "Translucent frosted cards with soft ambient client glow",
    },
    {
        value: "editorial_classic",
        label: "Editorial Classic",
        description: "Serif display headlines & institutional magazine polish",
    },
    {
        value: "high_contrast",
        label: "High Contrast",
        description: "Bold ink borders & maximum WCAG AAA legibility",
    },
];

export const HUB_HERO_STYLE_OPTIONS: Array<{ value: OnlineResourceHeroStyleKey; label: string; description: string }> = [
    { value: "gradient", label: "Token Gradient", description: "Soft atmospheric gradient derived from client tokens" },
    { value: "banner_image", label: "Cover Banner", description: "Full visual header using your uploaded cover banner" },
    { value: "centered_profile", label: "Centered Profile", description: "Centered logo/avatar & intro (great with Link Stack)" },
    { value: "minimal", label: "Minimal Header", description: "Clean typographic header with hairline divider" },
];

export const HUB_CARD_STYLE_OPTIONS: Array<{ value: OnlineResourceCardStyleKey; label: string }> = [
    { value: "elevated", label: "Elevated" },
    { value: "bordered", label: "Crisp Border" },
    { value: "soft_filled", label: "Soft Tinted" },
    { value: "pill_button", label: "Tactile Pill" },
];

export const HUB_FONT_PAIRING_OPTIONS: Array<{ value: OnlineResourceFontPairingKey; label: string; sampleClass: string }> = [
    { value: "client", label: "Client Default", sampleClass: "font-sans" },
    { value: "sans", label: "Modern Sans", sampleClass: "font-sans tracking-tight" },
    { value: "editorial_serif", label: "Editorial Serif", sampleClass: "font-serif" },
    { value: "technical_mono", label: "Technical Mono", sampleClass: "font-mono" },
];

const SWATCH_HEX_MAP: Record<string, string> = {
    blue: "#2563eb",
    emerald: "#059669",
    amber: "#d97706",
    violet: "#7c3aed",
    rose: "#e11d48",
    cyan: "#0891b2",
    orange: "#ea580c",
    slate: "#475569",
};

export const HUB_ACCENT_OPTIONS = [
    { value: "client", label: "Client Primary Token", hex: null },
    { value: "blue", label: "Blue", hex: SWATCH_HEX_MAP.blue },
    { value: "emerald", label: "Emerald", hex: SWATCH_HEX_MAP.emerald },
    { value: "amber", label: "Amber", hex: SWATCH_HEX_MAP.amber },
    { value: "violet", label: "Violet", hex: SWATCH_HEX_MAP.violet },
    { value: "rose", label: "Rose", hex: SWATCH_HEX_MAP.rose },
    { value: "cyan", label: "Cyan", hex: SWATCH_HEX_MAP.cyan },
    { value: "orange", label: "Orange", hex: SWATCH_HEX_MAP.orange },
    { value: "slate", label: "Slate", hex: SWATCH_HEX_MAP.slate },
] as const;

function contrastForegroundForHex(hex: string): string {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return "#ffffff";
    const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
    const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
    const b = Number.parseInt(clean.slice(4, 6), 16) / 255;

    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

    return luminance > 0.48 ? "#0f172a" : "#ffffff";
}

/**
 * Derive scoped CSS custom properties linked directly to the active client CSS tokens
 * (--primary, --primary-foreground, --background, --card, --border, --radius, --chart-1).
 * Only overrides --hub-accent when an admin explicitly selects a swatch or custom hex.
 */
export function buildHubCssVars(design: OnlineResourceDesignConfig): React.CSSProperties {
    const rawAccent = (design.accent_color || "client").trim();
    let accentValue = "var(--primary)";
    let accentFg = "var(--primary-foreground)";

    if (rawAccent !== "client") {
        if (SWATCH_HEX_MAP[rawAccent]) {
            accentValue = SWATCH_HEX_MAP[rawAccent];
            accentFg = contrastForegroundForHex(accentValue);
        } else if (/^#[0-9A-Fa-f]{6}$/.test(rawAccent)) {
            accentValue = rawAccent;
            accentFg = contrastForegroundForHex(rawAccent);
        }
    }

    return {
        "--hub-accent": accentValue,
        "--hub-accent-foreground": accentFg,
        "--hub-accent-soft": `color-mix(in oklch, ${accentValue} 13%, transparent)`,
        "--hub-accent-softer": `color-mix(in oklch, ${accentValue} 7%, transparent)`,
        "--hub-accent-border": `color-mix(in oklch, ${accentValue} 32%, var(--border))`,
        "--hub-surface-glass": "color-mix(in oklch, var(--card) 74%, transparent)",
        "--hub-hero-gradient": `radial-gradient(circle at 12% 15%, color-mix(in oklch, ${accentValue} 18%, transparent), transparent 55%), radial-gradient(circle at 88% 82%, color-mix(in oklch, var(--chart-1, ${accentValue}) 14%, transparent), transparent 50%), linear-gradient(135deg, color-mix(in oklch, ${accentValue} 8%, var(--card)) 0%, var(--card) 58%, color-mix(in oklch, var(--accent) 45%, var(--card)) 100%)`,
    } as React.CSSProperties;
}

export interface HubThemeTokens {
    pageBg: string;
    header: string;
    heroSurface: string;
    headingFont: string;
    eyebrowFont: string;
    cardBase: string;
    cardHover: string;
    cardRadius: string;
    sectionGap: string;
    cardPadding: string;
    colorModeClass: string;
}

export function getHubThemeTokens(design: OnlineResourceDesignConfig): HubThemeTokens {
    const isCompact = design.density === "compact" || design.theme === "compact";

    const headingFont =
        design.font_pairing === "editorial_serif" ||
        (design.font_pairing === "client" && design.theme === "editorial_classic")
            ? "font-serif tracking-tight"
            : design.font_pairing === "technical_mono"
              ? "font-mono tracking-tight"
              : "font-sans tracking-tight";

    const eyebrowFont =
        design.font_pairing === "technical_mono" || design.theme === "high_contrast"
            ? "font-mono uppercase tracking-wider"
            : "font-sans";

    let pageBg = "bg-background text-foreground";
    let header = "border-border/70 bg-card/85 border-b backdrop-blur-md";
    let heroSurface = "border-border/70 bg-card border";
    let cardRadius = isCompact ? "rounded-xl" : "rounded-2xl";
    let cardBase = "border-border/75 bg-card text-card-foreground border shadow-2xs";
    let cardHover =
        "hover:border-[var(--hub-accent-border)] hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0";

    switch (design.theme) {
        case "minimalist":
            header = "border-border/60 bg-background/90 border-b backdrop-blur-sm";
            heroSurface = "border-border/60 bg-transparent border-b rounded-none px-0";
            cardRadius = "rounded-xl";
            cardBase = "border-border/70 bg-background/70 text-foreground border shadow-none";
            cardHover = "hover:border-[var(--hub-accent-border)] hover:bg-card/80";
            break;

        case "visual_showcase":
            pageBg = "bg-background text-foreground";
            header = "border-border/60 bg-card/80 border-b backdrop-blur-lg";
            heroSurface = "border-[var(--hub-accent-border)] border shadow-sm";
            cardRadius = "rounded-3xl";
            cardBase = "border-border/70 bg-card text-card-foreground border shadow-sm";
            cardHover =
                "hover:border-[var(--hub-accent-border)] hover:shadow-lg hover:-translate-y-1 motion-reduce:hover:translate-y-0";
            break;

        case "compact":
            header = "border-border/80 bg-card/95 border-b";
            heroSurface = "border-border/80 bg-card border";
            cardRadius = "rounded-lg";
            cardBase = "border-border/80 bg-card text-card-foreground border shadow-none";
            cardHover = "hover:border-[var(--hub-accent-border)] hover:bg-accent/35";
            break;

        case "glass_modern":
            pageBg = "bg-background text-foreground";
            header = "border-border/50 bg-[var(--hub-surface-glass)] border-b backdrop-blur-xl";
            heroSurface = "border-border/60 bg-[var(--hub-surface-glass)] border backdrop-blur-xl shadow-sm";
            cardRadius = "rounded-2xl";
            cardBase = "border-border/60 bg-[var(--hub-surface-glass)] text-card-foreground border backdrop-blur-md shadow-xs";
            cardHover =
                "hover:border-[var(--hub-accent-border)] hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0";
            break;

        case "editorial_classic":
            header = "border-border bg-card/95 border-b";
            heroSurface = "border-border bg-card border";
            cardRadius = "rounded-xl";
            cardBase = "border-border/85 bg-card text-card-foreground border shadow-none";
            cardHover = "hover:border-[var(--hub-accent-border)] hover:bg-accent/25";
            break;

        case "high_contrast":
            header = "border-foreground/80 bg-background border-b-2";
            heroSurface = "border-foreground/85 bg-card border-2 shadow-[4px_4px_0_0_var(--foreground)]";
            cardRadius = "rounded-lg";
            cardBase = "border-foreground/80 bg-card text-card-foreground border-2 shadow-[3px_3px_0_0_var(--foreground)]";
            cardHover =
                "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--hub-accent)] motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0";
            break;

        default:
            break;
    }

    // Apply explicit Card Style modifier on top of the theme
    if (design.card_style === "bordered" && design.theme !== "high_contrast") {
        cardBase = "border-border bg-transparent text-foreground border shadow-none";
    } else if (design.card_style === "soft_filled" && design.theme !== "high_contrast") {
        cardBase = "border-transparent bg-muted/55 text-foreground border shadow-none";
        cardHover = "hover:bg-accent/65 hover:border-[var(--hub-accent-border)]";
    } else if (design.card_style === "pill_button") {
        cardRadius = "rounded-full";
    }

    const colorModeClass = design.color_mode === "dark" ? "dark" : design.color_mode === "light" ? "light" : "";

    return {
        pageBg,
        header,
        heroSurface,
        headingFont,
        eyebrowFont,
        cardBase,
        cardHover,
        cardRadius,
        sectionGap: isCompact ? "space-y-4" : "space-y-7",
        cardPadding: isCompact ? "p-3" : "p-4",
        colorModeClass,
    };
}
