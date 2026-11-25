import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { OnlineResourceCategoryItem, OnlineResourceLinkItem } from "../types";
import axios from "axios";
import { ArrowUpRight, Check, Clock, Copy, Flag, Globe, Search, Sparkles, Star, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { detectResourceTypeLabel, getResourceAccent, getResourceIcon, inferResourceIconFromUrl } from "./resource-icons";

interface ResourceDirectoryViewProps {
    categories: OnlineResourceCategoryItem[];
    initialCategoryId?: number | null;
    emptyTitle?: string;
    emptyDescription?: string;
    compact?: boolean;
    storageKey?: string;
    hideToolbar?: boolean;
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
        // Ignore storage quota or private browsing errors.
    }
}

export function ResourceDirectoryView({
    categories,
    initialCategoryId = null,
    emptyTitle = "No online resources yet",
    emptyDescription = "Resources published here will appear automatically as soon as they are added.",
    compact = false,
    storageKey,
    hideToolbar = false,
}: ResourceDirectoryViewProps) {
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">(
        initialCategoryId && categories.some((c) => c.id === initialCategoryId) ? initialCategoryId : "all",
    );
    const [query, setQuery] = useState("");
    const [prefs, setPrefs] = useState<StoredPreferences>({ pinned: [], recent: [] });
    const [reportedIds, setReportedIds] = useState<Record<number, boolean>>({});
    const [reportingIds, setReportingIds] = useState<Record<number, boolean>>({});

    useEffect(() => {
        setPrefs(readStoredPreferences(storageKey));
    }, [storageKey]);

    const togglePin = useCallback(
        (linkId: number) => {
            setPrefs((prev) => {
                const exists = prev.pinned.includes(linkId);
                const nextPinned = exists ? prev.pinned.filter((id) => id !== linkId) : [linkId, ...prev.pinned].slice(0, 12);
                const next = { ...prev, pinned: nextPinned };
                writeStoredPreferences(storageKey, next);
                return next;
            });
        },
        [storageKey],
    );

    const recordRecent = useCallback(
        (linkId: number) => {
            if (!storageKey) return;
            setPrefs((prev) => {
                const nextRecent = [linkId, ...prev.recent.filter((id) => id !== linkId)].slice(0, 6);
                const next = { ...prev, recent: nextRecent };
                writeStoredPreferences(storageKey, next);
                return next;
            });
        },
        [storageKey],
    );

    const handleReportBroken = useCallback(async (link: OnlineResourceLinkItem) => {
        if (!link.report_broken_url || reportedIds[link.id] || reportingIds[link.id]) return;

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
    }, [reportedIds, reportingIds]);

    const linkIndex = useMemo(() => {
        const map = new Map<number, { link: OnlineResourceLinkItem; accent: string; categoryName: string }>();
        for (const category of categories) {
            for (const link of category.links) {
                map.set(link.id, { link, accent: category.accent_color, categoryName: category.name });
            }
        }
        return map;
    }, [categories]);

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

    const totalLinks = useMemo(
        () => categories.reduce((sum, category) => sum + category.links.length, 0),
        [categories],
    );

    const filteredCategories = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return categories
            .filter((category) => selectedCategoryId === "all" || category.id === selectedCategoryId)
            .map((category) => {
                if (normalizedQuery === "") {
                    return category;
                }

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

                return {
                    ...category,
                    links: matchingLinks,
                };
            })
            .filter((category) => category.links.length > 0 || (normalizedQuery === "" && selectedCategoryId === category.id));
    }, [categories, selectedCategoryId, query]);

    const filteredLinkCount = useMemo(
        () => filteredCategories.reduce((sum, category) => sum + category.links.length, 0),
        [filteredCategories],
    );

    if (categories.length === 0) {
        return (
            <div className="border-border/70 bg-card/60 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
                <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-2xl">
                    <Globe className="text-muted-foreground size-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold">{emptyTitle}</h3>
                <p className="text-muted-foreground mt-1 max-w-md text-sm">{emptyDescription}</p>
            </div>
        );
    }

    const showPersonalStrips = Boolean(storageKey) && query.trim() === "" && selectedCategoryId === "all";

    return (
        <div className="space-y-5">
            {!hideToolbar && (totalLinks > 4 || categories.length > 1) && (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:w-80 lg:shrink-0">
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

                    {categories.length > 1 && (
                        <div
                            role="group"
                            aria-label="Filter by category"
                            className="-mx-1 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
                        >
                            <Button
                                type="button"
                                size="sm"
                                variant={selectedCategoryId === "all" ? "default" : "outline"}
                                aria-pressed={selectedCategoryId === "all"}
                                className="min-h-11 shrink-0 rounded-full px-3.5 text-xs sm:min-h-8 sm:px-3"
                                onClick={() => setSelectedCategoryId("all")}
                            >
                                All ({totalLinks})
                            </Button>
                            {categories.map((category) => {
                                const Icon = getResourceIcon(category.icon);
                                const isActive = selectedCategoryId === category.id;
                                return (
                                    <Button
                                        key={category.id}
                                        type="button"
                                        size="sm"
                                        variant={isActive ? "default" : "outline"}
                                        aria-pressed={isActive}
                                        className="min-h-11 shrink-0 gap-1.5 rounded-full px-3.5 text-xs sm:min-h-8 sm:px-3"
                                        onClick={() => setSelectedCategoryId(category.id)}
                                    >
                                        <Icon className="size-3.5" aria-hidden="true" />
                                        <span>{category.name}</span>
                                        <span className="opacity-70 tabular-nums">{category.links.length}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <p className="sr-only" role="status" aria-live="polite">
                {`Showing ${filteredLinkCount} ${filteredLinkCount === 1 ? "link" : "links"} across ${filteredCategories.length} ${filteredCategories.length === 1 ? "category" : "categories"}.`}
            </p>

            {showPersonalStrips && pinnedItems.length > 0 && (
                <section aria-label="Pinned resources" className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Star className="size-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                        <h2 className="text-sm font-semibold tracking-tight">Pinned by You</h2>
                        <Badge variant="secondary" className="rounded-full text-[11px] tabular-nums">
                            {pinnedItems.length}
                        </Badge>
                    </div>
                    <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
                        {pinnedItems.map(({ link, accent }) => (
                            <ResourceLinkCard
                                key={`pinned-${link.id}`}
                                link={link}
                                categoryAccent={accent}
                                isPinned
                                canPin={Boolean(storageKey)}
                                reported={Boolean(reportedIds[link.id])}
                                reporting={Boolean(reportingIds[link.id])}
                                onTogglePin={() => togglePin(link.id)}
                                onOpen={() => recordRecent(link.id)}
                                onReportBroken={() => void handleReportBroken(link)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {showPersonalStrips && recentItems.length > 0 && (
                <section aria-label="Recently opened resources" className="space-y-2.5">
                    <div className="flex items-center gap-2">
                        <Clock className="text-muted-foreground size-3.5" aria-hidden="true" />
                        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Recently Opened</h2>
                    </div>
                    <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                        {recentItems.map(({ link }) => (
                            <a
                                key={`recent-${link.id}`}
                                href={link.go_url}
                                target={link.opens_in_new_tab ? "_blank" : undefined}
                                rel={link.opens_in_new_tab ? "noopener noreferrer" : undefined}
                                onClick={() => recordRecent(link.id)}
                                className="border-border/70 bg-card hover:border-primary/40 hover:bg-accent/30 inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors sm:min-h-8"
                            >
                                <span className="max-w-[200px] truncate">{link.title}</span>
                                {link.opens_in_new_tab && <span className="sr-only"> (opens in a new tab)</span>}
                                <ArrowUpRight className="text-muted-foreground size-3 shrink-0" aria-hidden="true" />
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {filteredCategories.length === 0 ? (
                <div className="border-border/70 bg-card/50 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center">
                    <Search className="text-muted-foreground mb-2 size-6" aria-hidden="true" />
                    <p className="text-sm font-medium">No resources match "{query}"</p>
                    <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setQuery("")}>
                        Clear search
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredCategories.map((category) => {
                        const CategoryIcon = getResourceIcon(category.icon);
                        const accent = getResourceAccent(category.accent_color);

                        return (
                            <section key={category.id} className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className={cn("mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl", accent.iconBg)}>
                                            <CategoryIcon className="size-5" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-base font-semibold tracking-tight sm:text-lg">{category.name}</h2>
                                                <Badge variant="outline" className="rounded-full text-[11px] tabular-nums">
                                                    {category.links.length} {category.links.length === 1 ? "link" : "links"}
                                                </Badge>
                                            </div>
                                            {category.description && (
                                                <p className="text-muted-foreground mt-0.5 text-sm">{category.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {category.links.length === 0 ? (
                                    <div className="border-border/60 text-muted-foreground rounded-xl border border-dashed p-5 text-center text-sm">
                                        No active links in this category yet.
                                    </div>
                                ) : (
                                    <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
                                        {category.links.map((link) => (
                                            <ResourceLinkCard
                                                key={link.id}
                                                link={link}
                                                categoryAccent={category.accent_color}
                                                isPinned={prefs.pinned.includes(link.id)}
                                                canPin={Boolean(storageKey)}
                                                reported={Boolean(reportedIds[link.id])}
                                                reporting={Boolean(reportingIds[link.id])}
                                                onTogglePin={() => togglePin(link.id)}
                                                onOpen={() => recordRecent(link.id)}
                                                onReportBroken={() => void handleReportBroken(link)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface ResourceLinkCardProps {
    link: OnlineResourceLinkItem;
    categoryAccent: string;
    isPinned: boolean;
    canPin: boolean;
    reported: boolean;
    reporting: boolean;
    onTogglePin: () => void;
    onOpen: () => void;
    onReportBroken: () => void;
}

export function ResourceLinkCard({
    link,
    categoryAccent,
    isPinned,
    canPin,
    reported,
    reporting,
    onTogglePin,
    onOpen,
    onReportBroken,
}: ResourceLinkCardProps) {
    const [copied, setCopied] = useState(false);

    const effectiveIcon = link.icon || inferResourceIconFromUrl(link.url);
    const LinkIcon = getResourceIcon(effectiveIcon);
    const accent = getResourceAccent(categoryAccent);
    const autoTypeBadge = !link.badge_text ? detectResourceTypeLabel(link.url) : null;
    const displayBadge = link.badge_text || autoTypeBadge;
    const hasBadges = link.is_featured || Boolean(displayBadge);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(link.url);
            setCopied(true);
            toast.success("Link copied to clipboard");
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            toast.error("Could not copy link");
        }
    };

    return (
        <article
            className={cn(
                "group border-border/70 bg-card hover:border-primary/40 hover:bg-accent/20 relative flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                link.is_featured && "border-primary/35 ring-primary/10 ring-1",
            )}
        >
            <a
                href={link.go_url}
                target={link.opens_in_new_tab ? "_blank" : undefined}
                rel={link.opens_in_new_tab ? "noopener noreferrer" : undefined}
                onClick={onOpen}
                className="flex items-start justify-between gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
            >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                        className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
                            accent.iconBg,
                        )}
                    >
                        <LinkIcon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="group-hover:text-primary line-clamp-2 text-sm font-semibold leading-snug transition-colors">
                            {link.title}
                            {link.opens_in_new_tab && <span className="sr-only"> (opens in a new tab)</span>}
                        </h3>
                        {hasBadges && (
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
                        {link.description && (
                            <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-relaxed">
                                {link.description}
                            </p>
                        )}
                    </div>
                </div>
                <ArrowUpRight
                    className="text-muted-foreground group-hover:text-primary mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
                    aria-hidden="true"
                />
            </a>

            <div className="border-border/50 text-muted-foreground flex items-center justify-between gap-2 border-t pt-2.5 text-[11px]">
                <span className="flex min-w-0 items-center gap-1.5 truncate font-mono">
                    <Globe className="size-3 shrink-0 opacity-70" aria-hidden="true" />
                    <span className="truncate">{link.host || link.url}</span>
                </span>

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
                        {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                    </button>

                    {link.report_broken_url && (
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
        </article>
    );
}
