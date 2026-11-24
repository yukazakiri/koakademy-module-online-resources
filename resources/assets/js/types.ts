export type OnlineResourceVisibility = "public" | "authenticated" | "enrolled_only";

export type OnlineResourceAudience = "all" | "students" | "faculty";

export type OnlineResourceScope = "school" | "class";

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
    click_count?: number;
    last_clicked_at?: string | null;
}

export interface OnlineResourceCategoryItem {
    id: number;
    owner_type: string;
    owner_id: number;
    short_code: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string;
    accent_color: string;
    visibility: OnlineResourceVisibility;
    visibility_label: string;
    audience: OnlineResourceAudience;
    audience_label: string;
    sort_order: number;
    is_active: boolean;
    qr_url: string;
    links_count: number;
    links: OnlineResourceLinkItem[];
    scan_count?: number;
    total_clicks?: number;
    qr_svg_url?: string;
    qr_png_url?: string;
    poster_pdf_url?: string;
}

export interface OnlineResourceHeaderMeta {
    scope: string;
    title: string;
    subtitle: string | null;
    badge: string;
    school_name: string;
    school_code: string | null;
    hub_url: string | null;
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
