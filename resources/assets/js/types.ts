export type OnlineResourceVisibility = "public" | "authenticated" | "enrolled_only";

export type OnlineResourceAudience = "all" | "students" | "faculty";

export type OnlineResourceScope = "school" | "class";

export type OnlineResourceLayoutKey =
    | "directory"
    | "minimalist"
    | "visual_showcase"
    | "bento"
    | "link_stack"
    | "editorial_portal"
    | "compact_index";

export type OnlineResourceThemeKey =
    | "client_default"
    | "minimalist"
    | "visual_showcase"
    | "compact"
    | "glass_modern"
    | "editorial_classic"
    | "high_contrast";

export type OnlineResourceHeroStyleKey = "minimal" | "gradient" | "banner_image" | "centered_profile";

export type OnlineResourceCardStyleKey = "elevated" | "bordered" | "soft_filled" | "pill_button";

export type OnlineResourceFontPairingKey = "client" | "sans" | "editorial_serif" | "technical_mono";

export type OnlineResourceColorMode = "system" | "light" | "dark";

export type OnlineResourceDensity = "comfortable" | "compact";

export type OnlineResourceDesignMode = "inherit" | "custom";

export interface OnlineResourceSocialLink {
    platform: "website" | "facebook" | "instagram" | "x" | "youtube" | "linkedin" | "github" | "email";
    label: string;
    url: string;
}

export interface OnlineResourceDesignConfig {
    layout: OnlineResourceLayoutKey;
    theme: OnlineResourceThemeKey;
    color_mode: OnlineResourceColorMode;
    accent_color: string;
    hero_style: OnlineResourceHeroStyleKey;
    card_style: OnlineResourceCardStyleKey;
    density: OnlineResourceDensity;
    font_pairing: OnlineResourceFontPairingKey;
    show_search: boolean;
    show_category_nav: boolean;
    show_personal_strips: boolean;
    show_descriptions: boolean;
    show_hosts: boolean;
    show_report_broken: boolean;
    show_portal_button: boolean;
    show_footer: boolean;
    show_back_to_hub: boolean;
    social_links: OnlineResourceSocialLink[];
}

export interface OnlineResourceSeoConfig {
    meta_title: string | null;
    meta_description: string | null;
    keywords: string | null;
    og_title: string | null;
    og_description: string | null;
    og_image_path: string | null;
    og_image_url: string | null;
    resolved_og_image_url?: string | null;
    twitter_card: "summary" | "summary_large_image";
    canonical_url: string | null;
    robots_index: boolean;
    structured_data_enabled: boolean;
}

export interface OnlineResourceHubSettings {
    exists: boolean;
    visibility: OnlineResourceVisibility;
    is_published: boolean;
    headline: string | null;
    effective_headline: string;
    tagline: string | null;
    effective_tagline: string | null;
    badge_text: string | null;
    effective_badge_text: string;
    announcement_text: string | null;
    announcement_url: string | null;
    cta_label: string | null;
    cta_url: string | null;
    logo_path: string | null;
    logo_url: string | null;
    banner_path: string | null;
    banner_url: string | null;
    footer_text: string | null;
    design_config: OnlineResourceDesignConfig;
    seo_config: OnlineResourceSeoConfig;
}

export interface OnlineResourceResolvedSeo {
    title: string;
    description: string;
    keywords: string | null;
    og_title: string;
    og_description: string;
    og_image: string | null;
    og_type: string;
    og_url: string;
    site_name: string;
    twitter_card: string;
    canonical_url: string | null;
    robots: string;
    allow_indexing: boolean;
    structured_data: Record<string, unknown> | null;
}

export interface OnlineResourceLinkItem {
    id: number;
    category_id: number;
    short_code: string;
    title: string;
    url: string;
    go_url: string;
    host: string;
    description: string | null;
    icon: string | null;
    badge_text: string | null;
    sort_order: number;
    is_featured: boolean;
    is_active: boolean;
    opens_in_new_tab: boolean;
    report_broken_url?: string;
    click_count?: number;
    last_clicked_at?: string | null;
    broken_report_count?: number;
    last_reported_broken_at?: string | null;
    qr_url?: string;
    qr_svg_url?: string;
    qr_png_url?: string;
    clear_broken_report_url?: string;
}

export interface OnlineResourceCategoryItem {
    id: number;
    owner_type: string;
    owner_id: number;
    short_code: string;
    name: string;
    slug: string;
    description: string | null;
    hero_tagline?: string | null;
    banner_url?: string | null;
    icon: string;
    accent_color: string;
    design_mode?: OnlineResourceDesignMode;
    design_config?: OnlineResourceDesignConfig | null;
    seo_config?: OnlineResourceSeoConfig | null;
    visibility: OnlineResourceVisibility;
    visibility_label: string;
    audience: OnlineResourceAudience;
    audience_label: string;
    sort_order: number;
    is_active: boolean;
    qr_url: string;
    page_url?: string;
    links_count: number;
    links: OnlineResourceLinkItem[];
    scan_count?: number;
    total_clicks?: number;
    qr_svg_url?: string;
    qr_png_url?: string;
    poster_pdf_url?: string;
    media_upload_url?: string;
    media_delete_url?: string;
}

export interface OnlineResourceHeaderMeta {
    scope: string;
    title: string;
    subtitle: string | null;
    badge: string;
    school_name: string;
    school_code: string | null;
    hub_url: string | null;
    school_hub_url?: string | null;
}

export interface StudentClassResourceGroup {
    class_id: number;
    title: string;
    subtitle: string | null;
    class_url: string;
    categories: OnlineResourceCategoryItem[];
}

export interface CopyableClassOption {
    id: number;
    label: string;
    term: string;
}
