import { PublicHubRenderer } from "../../../components/public-hub-renderer";
import { DEFAULT_DESIGN_CONFIG } from "../../../components/hub-themes";
import type {
    OnlineResourceCategoryItem,
    OnlineResourceDesignConfig,
    OnlineResourceHeaderMeta,
    OnlineResourceHubSettings,
    OnlineResourceResolvedSeo,
} from "../../../types";
import { Head } from "@inertiajs/react";

interface PublicOnlineResourcesHubProps {
    viewMode?: "hub" | "category";
    headerMeta: OnlineResourceHeaderMeta;
    hubSettings?: OnlineResourceHubSettings | null;
    resolvedDesign?: OnlineResourceDesignConfig | null;
    seo?: OnlineResourceResolvedSeo | null;
    activeCategory?: OnlineResourceCategoryItem | null;
    focusedCategoryId: number | null;
    categories: OnlineResourceCategoryItem[];
    hubUrl: string | null;
    isAuthenticated: boolean;
    portalUrl?: string | null;
}

export default function PublicOnlineResourcesHub({
    viewMode,
    headerMeta,
    hubSettings,
    resolvedDesign,
    seo,
    activeCategory,
    focusedCategoryId,
    categories,
    hubUrl,
    isAuthenticated,
    portalUrl,
}: PublicOnlineResourcesHubProps) {
    const fallbackHubSettings: OnlineResourceHubSettings = hubSettings ?? {
        exists: false,
        visibility: "public",
        is_published: true,
        headline: null,
        effective_headline: headerMeta.title,
        tagline: null,
        effective_tagline: headerMeta.subtitle,
        badge_text: null,
        effective_badge_text: headerMeta.badge,
        announcement_text: null,
        announcement_url: null,
        cta_label: null,
        cta_url: null,
        logo_path: null,
        logo_url: null,
        banner_path: null,
        banner_url: null,
        footer_text: null,
        design_config: DEFAULT_DESIGN_CONFIG,
        seo_config: {
            meta_title: null,
            meta_description: null,
            keywords: null,
            og_title: null,
            og_description: null,
            og_image_path: null,
            og_image_url: null,
            twitter_card: "summary_large_image",
            canonical_url: null,
            robots_index: true,
            structured_data_enabled: true,
        },
    };

    const effectiveCategory =
        activeCategory ?? (focusedCategoryId !== null ? categories.find((c) => c.id === focusedCategoryId) ?? null : null);
    const effectiveViewMode: "hub" | "category" = viewMode ?? (effectiveCategory ? "category" : "hub");
    const pageTitle = seo?.title || `${headerMeta.title} — ${headerMeta.school_name}`;

    return (
        <>
            <Head title={pageTitle}>
                {seo?.description && <meta head-key="description" name="description" content={seo.description} />}
                {seo?.robots && <meta head-key="robots" name="robots" content={seo.robots} />}
            </Head>

            <PublicHubRenderer
                viewMode={effectiveViewMode}
                headerMeta={headerMeta}
                hubSettings={fallbackHubSettings}
                resolvedDesign={resolvedDesign ?? fallbackHubSettings.design_config}
                activeCategory={effectiveCategory}
                categories={categories}
                hubUrl={hubUrl}
                isAuthenticated={isAuthenticated}
                portalUrl={portalUrl}
            />
        </>
    );
}
