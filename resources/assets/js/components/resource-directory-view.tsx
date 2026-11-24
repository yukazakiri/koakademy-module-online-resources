import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { OnlineResourceCategoryItem, OnlineResourceLinkItem } from "../types";
import { ArrowUpRight, Globe, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getResourceAccent, getResourceIcon } from "./resource-icons";

interface ResourceDirectoryViewProps {
    categories: OnlineResourceCategoryItem[];
    initialCategoryId?: number | null;
    emptyTitle?: string;
    emptyDescription?: string;
    compact?: boolean;
}

export function ResourceDirectoryView({
    categories,
    initialCategoryId = null,
    emptyTitle = "No online resources yet",
    emptyDescription = "Resources published here will appear automatically as soon as they are added.",
    compact = false,
}: ResourceDirectoryViewProps) {
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">(
        initialCategoryId && categories.some((c) => c.id === initialCategoryId) ? initialCategoryId : "all",
    );
    const [query, setQuery] = useState("");

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

    if (categories.length === 0) {
        return (
            <div className="border-border/70 bg-card/60 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
                <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-2xl">
                    <Globe className="text-muted-foreground size-5" />
                </div>
                <h3 className="text-base font-semibold">{emptyTitle}</h3>
                <p className="text-muted-foreground mt-1 max-w-md text-sm">{emptyDescription}</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {(totalLinks > 4 || categories.length > 1) && (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:w-80 lg:shrink-0">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search links, topics, or websites..."
                            className="h-10 rounded-xl pl-10 pr-9"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                aria-label="Clear search"
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>

                    {categories.length > 1 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                type="button"
                                size="sm"
                                variant={selectedCategoryId === "all" ? "default" : "outline"}
                                className="h-8 rounded-full px-3 text-xs"
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
                                        className="h-8 gap-1.5 rounded-full px-3 text-xs"
                                        onClick={() => setSelectedCategoryId(category.id)}
                                    >
                                        <Icon className="size-3.5" />
                                        <span>{category.name}</span>
                                        <span className="opacity-70 tabular-nums">{category.links.length}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {filteredCategories.length === 0 ? (
                <div className="border-border/70 bg-card/50 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center">
                    <Search className="text-muted-foreground mb-2 size-6" />
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
                                            <CategoryIcon className="size-5" />
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
                                            <ResourceLinkCard key={link.id} link={link} categoryAccent={category.accent_color} />
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

function ResourceLinkCard({ link, categoryAccent }: { link: OnlineResourceLinkItem; categoryAccent: string }) {
    const LinkIcon = getResourceIcon(link.icon);
    const accent = getResourceAccent(categoryAccent);
    const hasBadges = link.is_featured || Boolean(link.badge_text);

    return (
        <a
            href={link.go_url}
            target={link.opens_in_new_tab ? "_blank" : undefined}
            rel={link.opens_in_new_tab ? "noopener noreferrer" : undefined}
            className={cn(
                "group border-border/70 bg-card hover:border-primary/40 hover:bg-accent/30 relative flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none",
                link.is_featured && "border-primary/35 ring-primary/10 ring-1",
            )}
        >
            <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105", accent.iconBg)}>
                        <LinkIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="group-hover:text-primary line-clamp-2 text-sm font-semibold leading-snug transition-colors">
                            {link.title}
                        </h3>
                        {hasBadges && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                {link.is_featured && (
                                    <Badge variant="secondary" className="h-5 gap-0.5 rounded-full px-1.5 text-[10px]">
                                        <Sparkles className="size-2.5" />
                                        Featured
                                    </Badge>
                                )}
                                {link.badge_text && (
                                    <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
                                        {link.badge_text}
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
                <ArrowUpRight className="text-muted-foreground group-hover:text-primary mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>

            <div className="border-border/50 text-muted-foreground flex items-center justify-between gap-2 border-t pt-2.5 text-[11px]">
                <span className="flex min-w-0 items-center gap-1.5 truncate font-mono">
                    <Globe className="size-3 shrink-0 opacity-70" />
                    <span className="truncate">{link.host || link.url}</span>
                </span>
                <span className="group-hover:text-primary shrink-0 font-medium transition-colors">Open</span>
            </div>
        </a>
    );
}
