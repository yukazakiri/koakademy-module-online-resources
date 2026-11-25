import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
    OnlineResourceCategoryItem,
    OnlineResourceDesignConfig,
    OnlineResourceHeaderMeta,
    OnlineResourceHubSettings,
    OnlineResourceLinkItem,
    OnlineResourceSocialLink,
} from "../types";
import { Link } from "@inertiajs/react";
import axios from "axios";
import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    ChevronRight,
    Clock,
    Copy,
    ExternalLink,
    Flag,
    Globe,
    Lock,
    LogIn,
    Mail,
    Megaphone,
    QrCode,
    School,
    Search,
    Share2,
    Sparkles,
    Star,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { buildHubCssVars, DEFAULT_DESIGN_CONFIG, getHubThemeTokens } from "./hub-themes";
import { detectResourceTypeLabel, getResourceAccent, getResourceIcon, inferResourceIconFromUrl } from "./resource-icons";

export interface PublicHubRendererProps {
    viewMode: "hub" | "category";
    headerMeta: OnlineResourceHeaderMeta;
    hubSettings: OnlineResourceHubSettings;
    resolvedDesign?: OnlineResourceDesignConfig | null;
    activeCategory?: OnlineResourceCategoryItem | null;
    categories: OnlineResourceCategoryItem[];
    hubUrl: string | null;
    isAuthenticated: boolean;
    portalUrl?: string | null;
    previewMode?: boolean;
}

interface StoredPreferences {
    pinned: number[];
    recent: number[];
}

function readStoredPreferences(key?: string): StoredPreferences {
    if (!key || typeof window === "undefined") {
        return { pinned: [], recent: [] };
    }

    try {
        const raw = window.localStorage.getItem(`koakademy:online-resources:v1:${key}`);
        if (!raw) return { pinned: [], recent: [] };
        const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
        return {
            pinned: Array.isArray(parsed.pinned) ? parsed.pinned.filter((id): id is number => typeof id === "number") : [],
            recent: Array.isArray(parsed.recent) ? parsed.recent.filter((id): id is number => typeof id === "number") : [],
        };
    } catch {
        return { pinned: [], recent: [] };
    }
}

function writeStoredPreferences(key: string | undefined, value: StoredPreferences): void {
    if (!key || typeof window === "undefined") return;
    try {
        window.localStorage.setItem(`koakademy:online-resources:v1:${key}`, JSON.stringify(value));
    } catch {
        // Ignore storage errors in private browsing.
    }
}

export function PublicHubRenderer({
    viewMode,
    headerMeta,
    hubSettings,
    resolvedDesign,
    activeCategory = null,
    categories,
    hubUrl,
    isAuthenticated,
    portalUrl,
    previewMode = false,
}: PublicHubRendererProps) {
    const design: OnlineResourceDesignConfig = useMemo(
        () => ({
            ...DEFAULT_DESIGN_CONFIG,
            ...(hubSettings?.design_config ?? {}),
            ...(resolvedDesign ?? {}),
        }),
        [hubSettings?.design_config, resolvedDesign],
    );

    const cssVars = useMemo(() => buildHubCssVars(design), [design]);
    const tokens = useMemo(() => getHubThemeTokens(design), [design]);

    const isCategoryView = viewMode === "category" && activeCategory !== null;
    const storageKey = previewMode
        ? undefined
        : headerMeta.school_code
          ? `public:${headerMeta.school_code}:${headerMeta.scope}`
          : "public";

    const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">(
        isCategoryView && activeCategory ? activeCategory.id : "all",
    );
    const [editorialCategoryId, setEditorialCategoryId] = useState<number>(
        (isCategoryView && activeCategory ? activeCategory.id : categories[0]?.id) ?? 0,
    );
    const [query, setQuery] = useState("");
    const [copiedPage, setCopiedPage] = useState(false);
    const [prefs, setPrefs] = useState<StoredPreferences>({ pinned: [], recent: [] });
    const [reportedIds, setReportedIds] = useState<Record<number, boolean>>({});
    const [reportingIds, setReportingIds] = useState<Record<number, boolean>>({});

    useEffect(() => {
        setSelectedCategoryId(isCategoryView && activeCategory ? activeCategory.id : "all");
        if (isCategoryView && activeCategory) {
            setEditorialCategoryId(activeCategory.id);
        } else if (categories.length > 0 && !categories.some((c) => c.id === editorialCategoryId)) {
            setEditorialCategoryId(categories[0].id);
        }
    }, [isCategoryView, activeCategory, categories]);

    useEffect(() => {
        setPrefs(readStoredPreferences(storageKey));
    }, [storageKey]);

    const togglePin = useCallback(
        (linkId: number) => {
            if (previewMode) return;
            setPrefs((prev) => {
                const exists = prev.pinned.includes(linkId);
                const nextPinned = exists ? prev.pinned.filter((id) => id !== linkId) : [linkId, ...prev.pinned].slice(0, 12);
                const next = { ...prev, pinned: nextPinned };
                writeStoredPreferences(storageKey, next);
                return next;
            });
        },
        [previewMode, storageKey],
    );

    const recordRecent = useCallback(
        (linkId: number) => {
            if (previewMode || !storageKey) return;
            setPrefs((prev) => {
                const nextRecent = [linkId, ...prev.recent.filter((id) => id !== linkId)].slice(0, 6);
                const next = { ...prev, recent: nextRecent };
                writeStoredPreferences(storageKey, next);
                return next;
            });
        },
        [previewMode, storageKey],
    );

    const handleReportBroken = useCallback(
        async (link: OnlineResourceLinkItem) => {
            if (previewMode || !link.report_broken_url || reportedIds[link.id] || reportingIds[link.id]) return;

            setReportingIds((prev) => ({ ...prev, [link.id]: true }));
            try {
                await axios.post(link.report_broken_url);
                setReportedIds((prev) => ({ ...prev, [link.id]: true }));
                toast.success("Reported as broken. Thank you for letting us know!");
            } catch {
                toast.error("Could not submit broken link report right now.");
            } finally {
                setReportingIds((prev) => ({ ...prev, [link.id]: false }));
            }
        },
        [previewMode, reportedIds, reportingIds],
    );

    const handleSharePage = async () => {
        if (previewMode) {
            toast.info("Share preview");
            return;
        }
        const shareUrl = window.location.href;
        const shareTitle = isCategoryView && activeCategory
            ? `${activeCategory.name} — ${hubSettings.effective_headline}`
            : `${hubSettings.effective_headline} — ${headerMeta.school_name}`;

        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
            try {
                await navigator.share({
                    title: shareTitle,
                    text:
                        (isCategoryView ? activeCategory?.hero_tagline || activeCategory?.description : hubSettings.effective_tagline) ??
                        `Online resources from ${headerMeta.school_name}`,
                    url: shareUrl,
                });
                return;
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedPage(true);
            toast.success("Page link copied");
            window.setTimeout(() => setCopiedPage(false), 1800);
        } catch {
            toast.error("Could not copy link");
        }
    };

    // Visible categories for current view mode
    const scopedCategories = useMemo(() => {
        if (isCategoryView && activeCategory) {
            return [activeCategory];
        }
        return categories;
    }, [isCategoryView, activeCategory, categories]);

    const totalLinks = useMemo(
        () => scopedCategories.reduce((sum, category) => sum + category.links.length, 0),
        [scopedCategories],
    );

    const filteredCategories = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return scopedCategories
            .filter((category) => isCategoryView || selectedCategoryId === "all" || category.id === selectedCategoryId)
            .map((category) => {
                if (normalizedQuery === "") return category;

                const categoryMatches =
                    category.name.toLowerCase().includes(normalizedQuery) ||
                    (category.description ?? "").toLowerCase().includes(normalizedQuery);

                const matchingLinks = categoryMatches
                    ? category.links
                    : category.links.filter(
                          (link) =>
                              link.title.toLowerCase().includes(normalizedQuery) ||
                              (link.description ?? "").toLowerCase().includes(normalizedQuery) ||
                              link.host.toLowerCase().includes(normalizedQuery) ||
                              (link.badge_text ?? "").toLowerCase().includes(normalizedQuery),
                      );

                return { ...category, links: matchingLinks };
            })
            .filter((category) => category.links.length > 0 || (normalizedQuery === "" && (isCategoryView || selectedCategoryId === category.id)));
    }, [scopedCategories, isCategoryView, selectedCategoryId, query]);

    const filteredLinkCount = useMemo(
        () => filteredCategories.reduce((sum, category) => sum + category.links.length, 0),
        [filteredCategories],
    );

    const linkIndex = useMemo(() => {
        const map = new Map<number, { link: OnlineResourceLinkItem; accent: string; categoryName: string }>();
        for (const category of scopedCategories) {
            for (const link of category.links) {
                map.set(link.id, { link, accent: category.accent_color, categoryName: category.name });
            }
        }
        return map;
    }, [scopedCategories]);

    const pinnedItems = useMemo(
        () =>
            prefs.pinned
                .map((id) => linkIndex.get(id))
                .filter((entry): entry is { link: OnlineResourceLinkItem; accent: string; categoryName: string } => Boolean(entry)),
        [prefs.pinned, linkIndex],
    );

    const recentItems = useMemo(
        () =>
            prefs.recent
                .filter((id) => !prefs.pinned.includes(id))
                .map((id) => linkIndex.get(id))
                .filter((entry): entry is { link: OnlineResourceLinkItem; accent: string; categoryName: string } => Boolean(entry))
                .slice(0, 4),
        [prefs.recent, prefs.pinned, linkIndex],
    );

    const heroTitle = isCategoryView && activeCategory ? activeCategory.name : hubSettings.effective_headline || headerMeta.title;
    const heroSubtitle =
        isCategoryView && activeCategory
            ? activeCategory.hero_tagline || activeCategory.description
            : hubSettings.effective_tagline || headerMeta.subtitle;
    const heroBadge =
        isCategoryView && activeCategory
            ? activeCategory.visibility !== "public"
                ? activeCategory.visibility_label
                : hubSettings.effective_badge_text
            : hubSettings.effective_badge_text || headerMeta.badge;
    const heroBannerUrl = isCategoryView && activeCategory?.banner_url ? activeCategory.banner_url : hubSettings.banner_url;
    const ActiveCategoryIcon = isCategoryView && activeCategory ? getResourceIcon(activeCategory.icon) : null;

    const isNarrowLayout = design.layout === "link_stack" || design.layout === "minimalist";
    const containerWidth = design.layout === "link_stack" ? "max-w-xl" : design.layout === "minimalist" ? "max-w-3xl" : "max-w-6xl";

    const showPersonalStrips =
        design.show_personal_strips && Boolean(storageKey) && query.trim() === "" && (isCategoryView || selectedCategoryId === "all");

    const showToolbar =
        design.show_search && (totalLinks > 3 || (!isCategoryView && scopedCategories.length > 1));

    const effectiveHeroStyle =
        design.layout === "link_stack" && design.hero_style === "gradient" ? "centered_profile" : design.hero_style;

    return (
        <div
            style={cssVars}
            className={cn(
                "flex min-h-dvh flex-col transition-colors",
                tokens.colorModeClass,
                tokens.pageBg,
                design.theme === "glass_modern" &&
                    "bg-[radial-gradient(ellipse_at_top,var(--hub-accent-softer),transparent_60%)]",
            )}
        >
            {!previewMode && (
                <a
                    href="#online-resources-main"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md"
                    style={{ backgroundColor: "var(--hub-accent)", color: "var(--hub-accent-foreground)" }}
                >
                    Skip to resources
                </a>
            )}

            {/* Optional Announcement Bar */}
            {hubSettings.announcement_text && (
                <div
                    className="px-4 py-2 text-center text-xs font-medium"
                    style={{ backgroundColor: "var(--hub-accent)", color: "var(--hub-accent-foreground)" }}
                >
                    <div className={cn("mx-auto flex w-full items-center justify-center gap-2", containerWidth)}>
                        <Megaphone className="size-3.5 shrink-0 opacity-90" aria-hidden="true" />
                        {hubSettings.announcement_url ? (
                            <a
                                href={previewMode ? "#" : hubSettings.announcement_url}
                                target={previewMode ? undefined : "_blank"}
                                rel={previewMode ? undefined : "noopener noreferrer"}
                                onClick={previewMode ? (e) => e.preventDefault() : undefined}
                                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                            >
                                <span>{hubSettings.announcement_text}</span>
                                <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
                            </a>
                        ) : (
                            <span>{hubSettings.announcement_text}</span>
                        )}
                    </div>
                </div>
            )}

            {/* Top Website Navigation Bar */}
            <header className={cn("sticky top-0 z-20", tokens.header)}>
                <div className={cn("mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6", containerWidth)}>
                    <div className="flex min-w-0 items-center gap-2.5">
                        {hubSettings.logo_url ? (
                            <img
                                src={hubSettings.logo_url}
                                alt={`${headerMeta.school_name} logo`}
                                className="border-border/60 size-9 shrink-0 rounded-xl border object-cover"
                            />
                        ) : (
                            <div
                                className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                                style={{ backgroundColor: "var(--hub-accent-soft)", color: "var(--hub-accent)" }}
                            >
                                <School className="size-5" aria-hidden="true" />
                            </div>
                        )}
                        <div className="min-w-0">
                            {hubUrl && isCategoryView && !previewMode ? (
                                <a href={hubUrl} className="block truncate text-sm font-semibold leading-tight hover:underline">
                                    {hubSettings.effective_headline || headerMeta.school_name}
                                </a>
                            ) : (
                                <p className="truncate text-sm font-semibold leading-tight">{headerMeta.school_name}</p>
                            )}
                            <p className={cn("text-muted-foreground truncate text-xs", tokens.eyebrowFont)}>
                                {hubSettings.effective_badge_text || headerMeta.badge}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={copiedPage ? "Page link copied" : "Share this page"}
                            className="min-h-10 gap-1.5 rounded-full text-xs sm:min-h-8"
                            onClick={() => void handleSharePage()}
                        >
                            {copiedPage ? (
                                <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                            ) : (
                                <Share2 className="size-3.5" aria-hidden="true" />
                            )}
                            <span className="hidden sm:inline">{copiedPage ? "Copied" : "Share"}</span>
                        </Button>

                        {design.show_portal_button &&
                            (isAuthenticated ? (
                                previewMode ? (
                                    <span className={buttonVariants({ size: "sm", className: "min-h-8 gap-1.5 rounded-full text-xs" })}>
                                        <ExternalLink className="size-3.5" aria-hidden="true" />
                                        Portal
                                    </span>
                                ) : (
                                    <Link
                                        href={portalUrl || "/student/resources"}
                                        className={buttonVariants({ size: "sm", className: "min-h-10 gap-1.5 rounded-full text-xs sm:min-h-8" })}
                                    >
                                        <ExternalLink className="size-3.5" aria-hidden="true" />
                                        Portal
                                    </Link>
                                )
                            ) : previewMode ? (
                                <span
                                    className={buttonVariants({
                                        size: "sm",
                                        variant: "secondary",
                                        className: "min-h-8 gap-1.5 rounded-full text-xs",
                                    })}
                                >
                                    <LogIn className="size-3.5" aria-hidden="true" />
                                    Sign In
                                </span>
                            ) : (
                                <Link
                                    href="/login"
                                    className={buttonVariants({
                                        size: "sm",
                                        variant: "secondary",
                                        className: "min-h-10 gap-1.5 rounded-full text-xs sm:min-h-8",
                                    })}
                                >
                                    <LogIn className="size-3.5" aria-hidden="true" />
                                    Sign In
                                </Link>
                            ))}
                    </div>
                </div>
            </header>

            <main
                id="online-resources-main"
                className={cn(
                    "mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8",
                    containerWidth,
                )}
            >
                {/* Breadcrumb / Back-to-Hub bar on Dedicated Category Website */}
                {isCategoryView && design.show_back_to_hub && hubUrl && (
                    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5">
                            <li>
                                <a
                                    href={previewMode ? "#" : hubUrl}
                                    onClick={previewMode ? (e) => e.preventDefault() : undefined}
                                    className="hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
                                >
                                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                                    {hubSettings.effective_headline || "All Resources"}
                                </a>
                            </li>
                            <li aria-hidden="true">
                                <ChevronRight className="size-3.5 opacity-60" />
                            </li>
                            <li className="text-foreground font-semibold" aria-current="page">
                                {activeCategory?.name}
                            </li>
                        </ol>

                        {categories.length > 1 && design.show_category_nav && (
                            <div className="flex flex-wrap items-center gap-1">
                                {categories
                                    .filter((c) => c.id !== activeCategory?.id)
                                    .slice(0, 4)
                                    .map((sibling) => (
                                        <a
                                            key={sibling.id}
                                            href={previewMode ? "#" : sibling.page_url || sibling.qr_url}
                                            onClick={previewMode ? (e) => e.preventDefault() : undefined}
                                            className="border-border/70 bg-card/70 text-muted-foreground hover:text-foreground hover:border-[var(--hub-accent-border)] rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
                                        >
                                            {sibling.name}
                                        </a>
                                    ))}
                            </div>
                        )}
                    </nav>
                )}

                {/* Hero Section (4 Styles, all client-token linked) */}
                <HeroSection
                    heroStyle={effectiveHeroStyle}
                    tokens={tokens}
                    title={heroTitle}
                    subtitle={heroSubtitle}
                    badge={heroBadge}
                    schoolCode={headerMeta.school_code}
                    logoUrl={hubSettings.logo_url}
                    bannerUrl={heroBannerUrl}
                    ctaLabel={!isCategoryView ? hubSettings.cta_label : null}
                    ctaUrl={!isCategoryView ? hubSettings.cta_url : null}
                    isRestricted={Boolean(isCategoryView && activeCategory && activeCategory.visibility !== "public")}
                    CategoryIcon={ActiveCategoryIcon}
                    previewMode={previewMode}
                    isVisualTheme={design.theme === "visual_showcase"}
                />

                {/* Search & Category Filter Toolbar */}
                {showToolbar && (
                    <div
                        className={cn(
                            "flex flex-col gap-3",
                            !isNarrowLayout && "lg:flex-row lg:items-center lg:justify-between",
                        )}
                    >
                        <div className={cn("relative w-full", !isNarrowLayout && "lg:w-80 lg:shrink-0")}>
                            <Search
                                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                                aria-hidden="true"
                            />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                aria-label="Search online resources"
                                placeholder="Search links, topics, or websites..."
                                className="h-11 rounded-xl pl-10 pr-10 sm:h-10"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery("")}
                                    aria-label="Clear search"
                                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-2 sm:p-1"
                                >
                                    <X className="size-3.5" aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        {!isCategoryView && design.show_category_nav && scopedCategories.length > 1 && design.layout !== "editorial_portal" && (
                            <div
                                role="group"
                                aria-label="Filter by category"
                                className="-mx-1 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
                            >
                                <button
                                    type="button"
                                    aria-pressed={selectedCategoryId === "all"}
                                    onClick={() => setSelectedCategoryId("all")}
                                    style={
                                        selectedCategoryId === "all"
                                            ? { backgroundColor: "var(--hub-accent)", color: "var(--hub-accent-foreground)", borderColor: "transparent" }
                                            : undefined
                                    }
                                    className={cn(
                                        "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors sm:min-h-8 sm:px-3",
                                        selectedCategoryId !== "all" && "border-border/80 bg-card text-foreground hover:border-[var(--hub-accent-border)]",
                                    )}
                                >
                                    All ({totalLinks})
                                </button>
                                {scopedCategories.map((category) => {
                                    const Icon = getResourceIcon(category.icon);
                                    const isActive = selectedCategoryId === category.id;
                                    return (
                                        <button
                                            key={category.id}
                                            type="button"
                                            aria-pressed={isActive}
                                            onClick={() => setSelectedCategoryId(category.id)}
                                            style={
                                                isActive
                                                    ? { backgroundColor: "var(--hub-accent)", color: "var(--hub-accent-foreground)", borderColor: "transparent" }
                                                    : undefined
                                            }
                                            className={cn(
                                                "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors sm:min-h-8 sm:px-3",
                                                !isActive && "border-border/80 bg-card text-foreground hover:border-[var(--hub-accent-border)]",
                                            )}
                                        >
                                            <Icon className="size-3.5" aria-hidden="true" />
                                            <span>{category.name}</span>
                                            <span className="opacity-70 tabular-nums">{category.links.length}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <p className="sr-only" role="status" aria-live="polite">
                    {`Showing ${filteredLinkCount} ${filteredLinkCount === 1 ? "link" : "links"} across ${filteredCategories.length} ${filteredCategories.length === 1 ? "category" : "categories"}.`}
                </p>

                {/* Personal Pinned & Recent Strips */}
                {showPersonalStrips && pinnedItems.length > 0 && (
                    <section aria-label="Pinned resources" className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Star className="size-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                            <h2 className={cn("text-sm font-semibold", tokens.headingFont)}>Pinned by You</h2>
                            <Badge variant="secondary" className="rounded-full text-[11px] tabular-nums">
                                {pinnedItems.length}
                            </Badge>
                        </div>
                        <div
                            className={cn(
                                "grid gap-3",
                                design.layout === "link_stack" || design.layout === "minimalist"
                                    ? "grid-cols-1"
                                    : "sm:grid-cols-2 lg:grid-cols-3",
                            )}
                        >
                            {pinnedItems.map(({ link, accent }) => (
                                <PublicResourceCard
                                    key={`pinned-${link.id}`}
                                    link={link}
                                    categoryAccent={accent}
                                    design={design}
                                    tokens={tokens}
                                    isPinned
                                    canPin={Boolean(storageKey)}
                                    reported={Boolean(reportedIds[link.id])}
                                    reporting={Boolean(reportingIds[link.id])}
                                    onTogglePin={() => togglePin(link.id)}
                                    onOpen={() => recordRecent(link.id)}
                                    onReportBroken={() => void handleReportBroken(link)}
                                    previewMode={previewMode}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {showPersonalStrips && recentItems.length > 0 && (
                    <section aria-label="Recently opened resources" className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Clock className="text-muted-foreground size-3.5" aria-hidden="true" />
                            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Recently Opened</h2>
                        </div>
                        <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                            {recentItems.map(({ link }) => (
                                <a
                                    key={`recent-${link.id}`}
                                    href={previewMode ? "#" : link.go_url}
                                    target={!previewMode && link.opens_in_new_tab ? "_blank" : undefined}
                                    rel={!previewMode && link.opens_in_new_tab ? "noopener noreferrer" : undefined}
                                    onClick={(e) => {
                                        if (previewMode) e.preventDefault();
                                        else recordRecent(link.id);
                                    }}
                                    className="border-border/70 bg-card hover:border-[var(--hub-accent-border)] inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors sm:min-h-8"
                                >
                                    <span className="max-w-[200px] truncate">{link.title}</span>
                                    <ArrowUpRight className="text-muted-foreground size-3 shrink-0" aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                {/* Main Content Area — 7 Distinct Layout Templates */}
                {scopedCategories.length === 0 ? (
                    <div className="border-border/70 bg-card/60 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
                        <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-2xl">
                            <Globe className="text-muted-foreground size-5" aria-hidden="true" />
                        </div>
                        <h3 className="text-base font-semibold">No published resources available</h3>
                        <p className="text-muted-foreground mt-1 max-w-md text-sm">
                            There are no active resource links visible in this directory right now.
                        </p>
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="border-border/70 bg-card/50 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center">
                        <Search className="text-muted-foreground mb-2 size-6" aria-hidden="true" />
                        <p className="text-sm font-medium">No resources match "{query}"</p>
                        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setQuery("")}>
                            Clear search
                        </Button>
                    </div>
                ) : design.layout === "editorial_portal" && !isCategoryView && filteredCategories.length > 1 ? (
                    <EditorialPortalLayout
                        categories={filteredCategories}
                        activeCategoryId={editorialCategoryId}
                        onSelectCategory={setEditorialCategoryId}
                        design={design}
                        tokens={tokens}
                        prefs={prefs}
                        canPin={Boolean(storageKey)}
                        reportedIds={reportedIds}
                        reportingIds={reportingIds}
                        onTogglePin={togglePin}
                        onOpen={recordRecent}
                        onReportBroken={(link) => void handleReportBroken(link)}
                        previewMode={previewMode}
                    />
                ) : (
                    <div className={tokens.sectionGap}>
                        {filteredCategories.map((category) => (
                            <CategorySection
                                key={category.id}
                                category={category}
                                isSingleCategoryPage={isCategoryView}
                                design={design}
                                tokens={tokens}
                                prefs={prefs}
                                canPin={Boolean(storageKey)}
                                reportedIds={reportedIds}
                                reportingIds={reportingIds}
                                onTogglePin={togglePin}
                                onOpen={recordRecent}
                                onReportBroken={(link) => void handleReportBroken(link)}
                                previewMode={previewMode}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            {design.show_footer && (
                <footer className="border-border/60 text-muted-foreground mt-auto border-t py-6 text-xs">
                    <div
                        className={cn(
                            "mx-auto flex w-full flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6",
                            containerWidth,
                        )}
                    >
                        <div className="text-center sm:text-left">
                            <p className="text-foreground/85 font-medium">{hubSettings.footer_text || headerMeta.school_name}</p>
                            {hubSettings.footer_text && <p className="mt-0.5 opacity-75">{headerMeta.school_name}</p>}
                        </div>

                        {design.social_links && design.social_links.length > 0 && (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {design.social_links.map((social, idx) => (
                                    <SocialLinkChip key={`${social.platform}-${idx}`} social={social} previewMode={previewMode} />
                                ))}
                            </div>
                        )}
                    </div>
                </footer>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Hero Section (4 Styles)                                                    */
/* -------------------------------------------------------------------------- */

function HeroSection({
    heroStyle,
    tokens,
    title,
    subtitle,
    badge,
    schoolCode,
    logoUrl,
    bannerUrl,
    ctaLabel,
    ctaUrl,
    isRestricted,
    CategoryIcon,
    previewMode,
    isVisualTheme,
}: {
    heroStyle: OnlineResourceDesignConfig["hero_style"];
    tokens: ReturnType<typeof getHubThemeTokens>;
    title: string;
    subtitle: string | null;
    badge: string;
    schoolCode: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
    isRestricted: boolean;
    CategoryIcon: React.ComponentType<{ className?: string }> | null;
    previewMode: boolean;
    isVisualTheme: boolean;
}) {
    const ctaElement =
        ctaLabel && ctaUrl ? (
            <a
                href={previewMode ? "#" : ctaUrl}
                target={previewMode ? undefined : "_blank"}
                rel={previewMode ? undefined : "noopener noreferrer"}
                onClick={previewMode ? (e) => e.preventDefault() : undefined}
                style={{ backgroundColor: "var(--hub-accent)", color: "var(--hub-accent-foreground)" }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-xs transition-opacity hover:opacity-90"
            >
                <span>{ctaLabel}</span>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
        ) : null;

    if (heroStyle === "minimal") {
        return (
            <section className="border-border/70 border-b pb-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={cn("inline-flex items-center gap-1 text-xs font-semibold", tokens.eyebrowFont)}
                                style={{ color: "var(--hub-accent)" }}
                            >
                                {isRestricted ? <Lock className="size-3" /> : <QrCode className="size-3" />}
                                {badge}
                            </span>
                            {schoolCode && (
                                <Badge variant="outline" className="rounded-full font-mono text-[10px]">
                                    {schoolCode}
                                </Badge>
                            )}
                        </div>
                        <h1 className={cn("text-2xl font-bold sm:text-3xl", tokens.headingFont)}>{title}</h1>
                        {subtitle && <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">{subtitle}</p>}
                    </div>
                    {ctaElement}
                </div>
            </section>
        );
    }

    if (heroStyle === "centered_profile") {
        return (
            <section className="flex flex-col items-center py-3 text-center">
                {bannerUrl && (
                    <div className="border-border/60 relative mb-4 h-36 w-full overflow-hidden rounded-3xl border sm:h-44">
                        <img src={bannerUrl} alt="" className="size-full object-cover" />
                    </div>
                )}

                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt=""
                        className={cn(
                            "border-background bg-card size-20 rounded-full border-4 object-cover shadow-md",
                            bannerUrl && "-mt-14 relative z-10",
                        )}
                    />
                ) : (
                    <div
                        className={cn(
                            "border-background flex size-16 items-center justify-center rounded-2xl border-4 shadow-sm",
                            bannerUrl && "-mt-12 relative z-10",
                        )}
                        style={{ backgroundColor: "var(--hub-accent)", color: "var(--hub-accent-foreground)" }}
                    >
                        {CategoryIcon ? <CategoryIcon className="size-7" /> : <School className="size-7" />}
                    </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="secondary" className={cn("gap-1 rounded-full text-[11px]", tokens.eyebrowFont)}>
                        {isRestricted ? <Lock className="size-3" /> : <QrCode className="size-3" />}
                        {badge}
                    </Badge>
                </div>

                <h1 className={cn("mt-2.5 text-2xl font-bold sm:text-3xl", tokens.headingFont)}>{title}</h1>
                {subtitle && <p className="text-muted-foreground mt-1.5 max-w-lg text-sm leading-relaxed">{subtitle}</p>}
                {ctaElement && <div className="mt-4">{ctaElement}</div>}
            </section>
        );
    }

    if (heroStyle === "banner_image" && bannerUrl) {
        return (
            <section className={cn("relative overflow-hidden rounded-3xl border", tokens.heroSurface)}>
                <div className="relative min-h-[200px] sm:min-h-[240px]">
                    <img src={bannerUrl} alt="" className="absolute inset-0 size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20" />
                    <div className="relative z-10 flex min-h-[200px] flex-col justify-end gap-3 p-6 text-white sm:min-h-[240px] sm:flex-row sm:items-end sm:justify-between sm:p-8">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md",
                                        tokens.eyebrowFont,
                                    )}
                                >
                                    {isRestricted ? <Lock className="size-3" /> : <QrCode className="size-3" />}
                                    {badge}
                                </span>
                                {schoolCode && (
                                    <span className="rounded-full bg-white/15 px-2.5 py-1 font-mono text-[11px] backdrop-blur-md">
                                        {schoolCode}
                                    </span>
                                )}
                            </div>
                            <h1 className={cn("text-2xl font-bold sm:text-4xl", tokens.headingFont)}>{title}</h1>
                            {subtitle && <p className="max-w-2xl text-sm text-white/85 sm:text-base">{subtitle}</p>}
                        </div>
                        {ctaElement}
                    </div>
                </div>
            </section>
        );
    }

    // Default: Token Gradient Hero (adapts live to client CSS tokens!)
    return (
        <section
            style={{ background: "var(--hub-hero-gradient)" }}
            className={cn(
                "relative overflow-hidden rounded-3xl p-6 sm:p-8",
                tokens.heroSurface,
                isVisualTheme && "sm:p-10",
            )}
        >
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    {CategoryIcon && (
                        <div
                            className="hidden size-12 shrink-0 items-center justify-center rounded-2xl shadow-xs sm:flex"
                            style={{ backgroundColor: "var(--hub-accent)", color: "var(--hub-accent-foreground)" }}
                        >
                            <CategoryIcon className="size-6" aria-hidden="true" />
                        </div>
                    )}
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className={cn("gap-1 rounded-full", tokens.eyebrowFont)}>
                                {isRestricted ? <Lock className="size-3" /> : <QrCode className="size-3" />}
                                {badge}
                            </Badge>
                            {schoolCode && (
                                <Badge variant="outline" className="rounded-full font-mono text-[11px]">
                                    {schoolCode}
                                </Badge>
                            )}
                        </div>
                        <h1 className={cn("text-2xl font-bold sm:text-3xl", isVisualTheme && "sm:text-4xl", tokens.headingFont)}>
                            {title}
                        </h1>
                        {subtitle && <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">{subtitle}</p>}
                    </div>
                </div>
                {ctaElement}
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Editorial Portal Layout (Sidebar + Focused Category Panel)                 */
/* -------------------------------------------------------------------------- */

function EditorialPortalLayout({
    categories,
    activeCategoryId,
    onSelectCategory,
    design,
    tokens,
    prefs,
    canPin,
    reportedIds,
    reportingIds,
    onTogglePin,
    onOpen,
    onReportBroken,
    previewMode,
}: {
    categories: OnlineResourceCategoryItem[];
    activeCategoryId: number;
    onSelectCategory: (id: number) => void;
    design: OnlineResourceDesignConfig;
    tokens: ReturnType<typeof getHubThemeTokens>;
    prefs: StoredPreferences;
    canPin: boolean;
    reportedIds: Record<number, boolean>;
    reportingIds: Record<number, boolean>;
    onTogglePin: (id: number) => void;
    onOpen: (id: number) => void;
    onReportBroken: (link: OnlineResourceLinkItem) => void;
    previewMode: boolean;
}) {
    const active = categories.find((c) => c.id === activeCategoryId) ?? categories[0];

    return (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
            <aside aria-label="Resource categories" className="lg:sticky lg:top-20">
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
                    {categories.map((cat) => {
                        const Icon = getResourceIcon(cat.icon);
                        const isSelected = cat.id === active.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => onSelectCategory(cat.id)}
                                aria-current={isSelected ? "true" : undefined}
                                style={
                                    isSelected
                                        ? {
                                              backgroundColor: "var(--hub-accent-soft)",
                                              color: "var(--hub-accent)",
                                              borderColor: "var(--hub-accent-border)",
                                          }
                                        : undefined
                                }
                                className={cn(
                                    "flex shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors lg:w-full",
                                    !isSelected && "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                )}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                                    <span className="truncate">{cat.name}</span>
                                </span>
                                <span className="text-[11px] opacity-70 tabular-nums">{cat.links.length}</span>
                            </button>
                        );
                    })}
                </div>
            </aside>

            <div>
                <CategorySection
                    category={active}
                    isSingleCategoryPage={false}
                    design={{ ...design, layout: "directory" }}
                    tokens={tokens}
                    prefs={prefs}
                    canPin={canPin}
                    reportedIds={reportedIds}
                    reportingIds={reportingIds}
                    onTogglePin={onTogglePin}
                    onOpen={onOpen}
                    onReportBroken={onReportBroken}
                    previewMode={previewMode}
                />
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Category Section (Adapts Across Directory, Minimalist, Visual, Bento, etc) */
/* -------------------------------------------------------------------------- */

function CategorySection({
    category,
    isSingleCategoryPage,
    design,
    tokens,
    prefs,
    canPin,
    reportedIds,
    reportingIds,
    onTogglePin,
    onOpen,
    onReportBroken,
    previewMode,
}: {
    category: OnlineResourceCategoryItem;
    isSingleCategoryPage: boolean;
    design: OnlineResourceDesignConfig;
    tokens: ReturnType<typeof getHubThemeTokens>;
    prefs: StoredPreferences;
    canPin: boolean;
    reportedIds: Record<number, boolean>;
    reportingIds: Record<number, boolean>;
    onTogglePin: (id: number) => void;
    onOpen: (id: number) => void;
    onReportBroken: (link: OnlineResourceLinkItem) => void;
    previewMode: boolean;
}) {
    const CategoryIcon = getResourceIcon(category.icon);
    const useClientAccent = design.accent_color === "client";
    const swatchAccent = getResourceAccent(category.accent_color);

    const gridClass =
        design.layout === "link_stack"
            ? "flex flex-col gap-2.5"
            : design.layout === "minimalist"
              ? "divide-border/70 divide-y border-y border-border/70"
              : design.layout === "compact_index"
                ? "grid gap-2 sm:grid-cols-2"
                : design.layout === "bento"
                  ? "grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
                  : design.layout === "visual_showcase"
                    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

    return (
        <section className="space-y-3.5">
            {!isSingleCategoryPage && (
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div
                            className={cn(
                                "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
                                !useClientAccent && swatchAccent.iconBg,
                            )}
                            style={
                                useClientAccent
                                    ? { backgroundColor: "var(--hub-accent-soft)", color: "var(--hub-accent)" }
                                    : undefined
                            }
                        >
                            <CategoryIcon className="size-5" aria-hidden="true" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className={cn("text-base font-semibold sm:text-lg", tokens.headingFont)}>
                                    {category.name}
                                </h2>
                                <Badge variant="outline" className="rounded-full text-[11px] tabular-nums">
                                    {category.links.length} {category.links.length === 1 ? "link" : "links"}
                                </Badge>
                            </div>
                            {category.description && (
                                <p className="text-muted-foreground mt-0.5 text-sm">{category.description}</p>
                            )}
                        </div>
                    </div>

                    {category.page_url && (
                        <a
                            href={previewMode ? "#" : category.page_url}
                            onClick={previewMode ? (e) => e.preventDefault() : undefined}
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                        >
                            <span>Open Category Page</span>
                            <ChevronRight className="size-3.5" aria-hidden="true" />
                        </a>
                    )}
                </div>
            )}

            {category.links.length === 0 ? (
                <div className="border-border/60 text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                    No active links in this category yet.
                </div>
            ) : (
                <div className={gridClass}>
                    {category.links.map((link, index) => (
                        <PublicResourceCard
                            key={link.id}
                            link={link}
                            categoryAccent={category.accent_color}
                            design={design}
                            tokens={tokens}
                            isBentoWide={design.layout === "bento" && (link.is_featured || (index === 0 && category.links.length >= 3))}
                            isPinned={prefs.pinned.includes(link.id)}
                            canPin={canPin}
                            reported={Boolean(reportedIds[link.id])}
                            reporting={Boolean(reportingIds[link.id])}
                            onTogglePin={() => onTogglePin(link.id)}
                            onOpen={() => onOpen(link.id)}
                            onReportBroken={() => onReportBroken(link)}
                            previewMode={previewMode}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Resource Card (Adapts to All 7 Layouts + Client CSS Tokens)                */
/* -------------------------------------------------------------------------- */

function PublicResourceCard({
    link,
    categoryAccent,
    design,
    tokens,
    isBentoWide = false,
    isPinned,
    canPin,
    reported,
    reporting,
    onTogglePin,
    onOpen,
    onReportBroken,
    previewMode,
}: {
    link: OnlineResourceLinkItem;
    categoryAccent: string;
    design: OnlineResourceDesignConfig;
    tokens: ReturnType<typeof getHubThemeTokens>;
    isBentoWide?: boolean;
    isPinned: boolean;
    canPin: boolean;
    reported: boolean;
    reporting: boolean;
    onTogglePin: () => void;
    onOpen: () => void;
    onReportBroken: () => void;
    previewMode: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const effectiveIcon = link.icon || inferResourceIconFromUrl(link.url);
    const LinkIcon = getResourceIcon(effectiveIcon);
    const useClientAccent = design.accent_color === "client";
    const swatchAccent = getResourceAccent(categoryAccent);
    const autoTypeBadge = !link.badge_text ? detectResourceTypeLabel(link.url) : null;
    const displayBadge = link.badge_text || autoTypeBadge;

    const handleCopy = async () => {
        if (previewMode) return;
        try {
            await navigator.clipboard.writeText(link.url);
            setCopied(true);
            toast.success("Link copied to clipboard");
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            toast.error("Could not copy link");
        }
    };

    const href = previewMode ? "#" : link.go_url;
    const linkTarget = !previewMode && link.opens_in_new_tab ? "_blank" : undefined;
    const linkRel = !previewMode && link.opens_in_new_tab ? "noopener noreferrer" : undefined;

    // 1. Minimalist Row
    if (design.layout === "minimalist") {
        return (
            <article className="group flex items-center justify-between gap-4 py-3.5 transition-colors">
                <a
                    href={href}
                    target={linkTarget}
                    rel={linkRel}
                    onClick={(e) => {
                        if (previewMode) e.preventDefault();
                        else onOpen();
                    }}
                    className="flex min-w-0 flex-1 items-start gap-3 focus-visible:ring-2 focus-visible:outline-none"
                >
                    <LinkIcon className="text-muted-foreground group-hover:text-foreground mt-0.5 size-4 shrink-0 transition-colors" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="group-hover:underline text-sm font-medium underline-offset-4">{link.title}</h3>
                            {link.is_featured && (
                                <Badge variant="secondary" className="h-4.5 rounded-full px-1.5 text-[10px]">
                                    Featured
                                </Badge>
                            )}
                            {displayBadge && (
                                <span className="text-muted-foreground text-[11px]">{displayBadge}</span>
                            )}
                        </div>
                        {design.show_descriptions && link.description && (
                            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{link.description}</p>
                        )}
                        {design.show_hosts && (
                            <p className="text-muted-foreground/80 mt-0.5 truncate font-mono text-[11px]">{link.host}</p>
                        )}
                    </div>
                </a>
                <ArrowUpRight className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </article>
        );
    }

    // 2. Bio / Link-in-Bio Stack Button
    if (design.layout === "link_stack") {
        return (
            <article
                className={cn(
                    "group relative flex items-center justify-between gap-3 transition-all duration-150",
                    tokens.cardBase,
                    tokens.cardHover,
                    design.card_style === "pill_button" ? "rounded-full px-5 py-3.5" : cn(tokens.cardRadius, "px-4 py-3.5"),
                    link.is_featured && "ring-1 ring-[var(--hub-accent-border)]",
                )}
            >
                <a
                    href={href}
                    target={linkTarget}
                    rel={linkRel}
                    onClick={(e) => {
                        if (previewMode) e.preventDefault();
                        else onOpen();
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3.5 focus-visible:ring-2 focus-visible:outline-none"
                >
                    <div
                        className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            design.card_style === "pill_button" && "rounded-full",
                            !useClientAccent && swatchAccent.iconBg,
                        )}
                        style={
                            useClientAccent
                                ? { backgroundColor: "var(--hub-accent-soft)", color: "var(--hub-accent)" }
                                : undefined
                        }
                    >
                        <LinkIcon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="truncate text-sm font-semibold">{link.title}</h3>
                            {displayBadge && (
                                <Badge variant="secondary" className="h-4.5 rounded-full px-1.5 text-[10px]">
                                    {displayBadge}
                                </Badge>
                            )}
                        </div>
                        {design.show_descriptions && link.description && (
                            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">{link.description}</p>
                        )}
                    </div>
                </a>
                <ArrowUpRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </article>
        );
    }

    // 3. Compact Launchpad Row
    if (design.layout === "compact_index") {
        return (
            <article
                className={cn(
                    "group flex items-center justify-between gap-2.5 px-3 py-2.5 transition-all duration-150",
                    tokens.cardBase,
                    tokens.cardHover,
                    tokens.cardRadius,
                )}
            >
                <a
                    href={href}
                    target={linkTarget}
                    rel={linkRel}
                    onClick={(e) => {
                        if (previewMode) e.preventDefault();
                        else onOpen();
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 focus-visible:ring-2 focus-visible:outline-none"
                >
                    <div
                        className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", !useClientAccent && swatchAccent.iconBg)}
                        style={
                            useClientAccent
                                ? { backgroundColor: "var(--hub-accent-soft)", color: "var(--hub-accent)" }
                                : undefined
                        }
                    >
                        <LinkIcon className="size-3.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-xs font-semibold sm:text-sm">{link.title}</h3>
                            {displayBadge && (
                                <Badge variant="outline" className="h-4 rounded-full px-1.5 text-[9px]">
                                    {displayBadge}
                                </Badge>
                            )}
                        </div>
                        {design.show_hosts && (
                            <p className="text-muted-foreground truncate font-mono text-[10px]">{link.host}</p>
                        )}
                    </div>
                </a>
                <button
                    type="button"
                    onClick={() => void handleCopy()}
                    aria-label={`Copy link for ${link.title}`}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md"
                >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </button>
            </article>
        );
    }

    // 4. Visualizing Showcase & Bento & Classic Directory Cards
    const isVisualCard = design.layout === "visual_showcase";

    return (
        <article
            className={cn(
                "group relative flex flex-col justify-between gap-3 overflow-hidden transition-all duration-150",
                tokens.cardBase,
                tokens.cardHover,
                tokens.cardRadius,
                !isVisualCard && tokens.cardPadding,
                isBentoWide && "sm:col-span-2",
                link.is_featured && "ring-1 ring-[var(--hub-accent-border)]",
            )}
        >
            {isVisualCard && (
                <div
                    className="flex items-center justify-between px-4 py-3.5"
                    style={{ background: "var(--hub-hero-gradient)" }}
                >
                    <div
                        className="flex size-11 items-center justify-center rounded-2xl shadow-xs"
                        style={{ backgroundColor: "var(--hub-accent)", color: "var(--hub-accent-foreground)" }}
                    >
                        <LinkIcon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        {link.is_featured && (
                            <Badge variant="secondary" className="h-5 gap-0.5 rounded-full px-2 text-[10px]">
                                <Sparkles className="size-2.5" aria-hidden="true" />
                                Featured
                            </Badge>
                        )}
                        {displayBadge && (
                            <Badge variant="outline" className="bg-background/80 h-5 rounded-full px-2 text-[10px] backdrop-blur-xs">
                                {displayBadge}
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            <div className={cn("flex flex-1 flex-col justify-between gap-3", isVisualCard && "px-4 pb-4")}>
                <a
                    href={href}
                    target={linkTarget}
                    rel={linkRel}
                    onClick={(e) => {
                        if (previewMode) e.preventDefault();
                        else onOpen();
                    }}
                    className="flex items-start justify-between gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                        {!isVisualCard && (
                            <div
                                className={cn(
                                    "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 motion-reduce:group-hover:scale-100",
                                    !useClientAccent && swatchAccent.iconBg,
                                )}
                                style={
                                    useClientAccent
                                        ? { backgroundColor: "var(--hub-accent-soft)", color: "var(--hub-accent)" }
                                        : undefined
                                }
                            >
                                <LinkIcon className="size-4" aria-hidden="true" />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h3
                                className={cn(
                                    "line-clamp-2 font-semibold leading-snug transition-colors",
                                    isBentoWide || isVisualCard ? "text-base" : "text-sm",
                                    tokens.headingFont,
                                )}
                            >
                                {link.title}
                                {link.opens_in_new_tab && <span className="sr-only"> (opens in a new tab)</span>}
                            </h3>
                            {!isVisualCard && (link.is_featured || displayBadge) && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                    {link.is_featured && (
                                        <Badge variant="secondary" className="h-5 gap-0.5 rounded-full px-1.5 text-[10px]">
                                            <Sparkles className="size-2.5" aria-hidden="true" />
                                            Featured
                                        </Badge>
                                    )}
                                    {displayBadge && (
                                        <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
                                            {displayBadge}
                                        </Badge>
                                    )}
                                </div>
                            )}
                            {design.show_descriptions && link.description && (
                                <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-relaxed">
                                    {link.description}
                                </p>
                            )}
                        </div>
                    </div>
                    <ArrowUpRight
                        className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
                        aria-hidden="true"
                    />
                </a>

                {(design.show_hosts || canPin || design.show_report_broken) && (
                    <div className="border-border/50 text-muted-foreground flex items-center justify-between gap-2 border-t pt-2.5 text-[11px]">
                        {design.show_hosts ? (
                            <span className="flex min-w-0 items-center gap-1.5 truncate font-mono">
                                <Globe className="size-3 shrink-0 opacity-70" aria-hidden="true" />
                                <span className="truncate">{link.host || link.url}</span>
                            </span>
                        ) : (
                            <span />
                        )}

                        <div className="flex shrink-0 items-center gap-0.5">
                            {canPin && (
                                <button
                                    type="button"
                                    onClick={onTogglePin}
                                    aria-pressed={isPinned}
                                    aria-label={isPinned ? `Unpin ${link.title}` : `Pin ${link.title}`}
                                    title={isPinned ? "Unpin" : "Pin to top"}
                                    className={cn(
                                        "hover:bg-muted inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none",
                                        isPinned ? "text-amber-500" : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Star className={cn("size-3.5", isPinned && "fill-current")} aria-hidden="true" />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => void handleCopy()}
                                aria-label={copied ? `Copied ${link.title}` : `Copy link for ${link.title}`}
                                title="Copy URL"
                                className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                                {copied ? (
                                    <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                                ) : (
                                    <Copy className="size-3.5" aria-hidden="true" />
                                )}
                            </button>

                            {design.show_report_broken && link.report_broken_url && (
                                <button
                                    type="button"
                                    disabled={reported || reporting}
                                    onClick={onReportBroken}
                                    aria-label={reported ? `Reported ${link.title} as broken` : `Report ${link.title} as broken`}
                                    title={reported ? "Reported as broken" : "Report broken link"}
                                    className={cn(
                                        "hover:bg-muted inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60",
                                        reported ? "text-amber-600" : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Flag className="size-3.5" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}

function SocialLinkChip({ social, previewMode }: { social: OnlineResourceSocialLink; previewMode: boolean }) {
    return (
        <a
            href={previewMode ? "#" : social.url}
            target={previewMode || social.platform === "email" ? undefined : "_blank"}
            rel={previewMode || social.platform === "email" ? undefined : "noopener noreferrer"}
            onClick={previewMode ? (e) => e.preventDefault() : undefined}
            className="border-border/70 bg-card/80 text-muted-foreground hover:text-foreground hover:border-[var(--hub-accent-border)] inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
        >
            {social.platform === "email" ? (
                <Mail className="size-3" aria-hidden="true" />
            ) : (
                <Globe className="size-3" aria-hidden="true" />
            )}
            <span>{social.label || social.platform}</span>
        </a>
    );
}
