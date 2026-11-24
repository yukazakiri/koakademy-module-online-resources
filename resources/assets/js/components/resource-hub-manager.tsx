import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { OnlineResourceCategoryItem, OnlineResourceLinkItem, OnlineResourceScope } from "../types";
import { router } from "@inertiajs/react";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpRight,
    EyeOff,
    FolderPlus,
    Globe,
    Link2,
    Lock,
    MousePointerClick,
    Pencil,
    Plus,
    QrCode,
    Search,
    Sparkles,
    Trash2,
    Users,
    X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ResourceCategoryDialog, type CategoryFormPayload } from "./resource-category-dialog";
import { getResourceAccent, getResourceIcon } from "./resource-icons";
import { ResourceLinkDialog, type LinkFormPayload } from "./resource-link-dialog";
import { ResourceQrDialog } from "./resource-qr-dialog";

export interface ResourceHubEndpoints {
    storeCategory: string;
    updateCategory: (categoryId: number) => string;
    destroyCategory: (categoryId: number) => string;
    reorderCategories: string;
    storeLink: (categoryId: number) => string;
    updateLink: (linkId: number) => string;
    destroyLink: (linkId: number) => string;
    reorderLinks: (categoryId: number) => string;
    fetchLinkMetadata?: string;
}

interface ResourceHubManagerProps {
    scope: OnlineResourceScope;
    categories: OnlineResourceCategoryItem[];
    canManage: boolean;
    endpoints: ResourceHubEndpoints;
    headerActions?: React.ReactNode;
    emptyStateTitle?: string;
    emptyStateDescription?: string;
}

export function ResourceHubManager({
    scope,
    categories,
    canManage,
    endpoints,
    headerActions,
    emptyStateTitle = "No resource categories yet",
    emptyStateDescription = "Create your first category, add useful links, and share its permanent QR code with students.",
}: ResourceHubManagerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<OnlineResourceCategoryItem | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<OnlineResourceCategoryItem | null>(null);

    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkTargetCategory, setLinkTargetCategory] = useState<OnlineResourceCategoryItem | null>(null);
    const [editingLink, setEditingLink] = useState<OnlineResourceLinkItem | null>(null);
    const [deletingLink, setDeletingLink] = useState<OnlineResourceLinkItem | null>(null);

    const [qrCategory, setQrCategory] = useState<OnlineResourceCategoryItem | null>(null);

    const filteredCategories = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase();
        if (normalized === "") return categories;

        return categories.filter((category) => {
            if (
                category.name.toLowerCase().includes(normalized) ||
                (category.description ?? "").toLowerCase().includes(normalized) ||
                category.short_code.toLowerCase().includes(normalized)
            ) {
                return true;
            }

            return category.links.some(
                (link) =>
                    link.title.toLowerCase().includes(normalized) ||
                    link.url.toLowerCase().includes(normalized) ||
                    (link.description ?? "").toLowerCase().includes(normalized) ||
                    (link.badge_text ?? "").toLowerCase().includes(normalized),
            );
        });
    }, [categories, searchQuery]);

    const openCreateCategory = () => {
        setEditingCategory(null);
        setCategoryDialogOpen(true);
    };

    const openEditCategory = (category: OnlineResourceCategoryItem) => {
        setEditingCategory(category);
        setCategoryDialogOpen(true);
    };

    const handleCategorySubmit = (payload: CategoryFormPayload) => {
        setSubmitting(true);
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setCategoryDialogOpen(false);
                setEditingCategory(null);
                toast.success(editingCategory ? "Category updated" : "Category created");
            },
            onError: (errors: Record<string, string>) => {
                const firstError = Object.values(errors)[0];
                toast.error(firstError || "Could not save category");
            },
            onFinish: () => setSubmitting(false),
        };

        if (editingCategory) {
            router.put(endpoints.updateCategory(editingCategory.id), payload as unknown as Record<string, string | boolean>, options);
        } else {
            router.post(endpoints.storeCategory, payload as unknown as Record<string, string | boolean>, options);
        }
    };

    const handleDeleteCategory = () => {
        if (!deletingCategory) return;
        setSubmitting(true);
        router.delete(endpoints.destroyCategory(deletingCategory.id), {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingCategory(null);
                toast.success("Category deleted");
            },
            onError: () => toast.error("Could not delete category"),
            onFinish: () => setSubmitting(false),
        });
    };

    const handleMoveCategory = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= categories.length) return;
        const reordered = [...categories];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(targetIndex, 0, moved);

        router.patch(
            endpoints.reorderCategories,
            { ordered_ids: reordered.map((item) => item.id) },
            {
                preserveScroll: true,
                onError: () => toast.error("Could not reorder categories"),
            },
        );
    };

    const openAddLink = (category: OnlineResourceCategoryItem) => {
        setLinkTargetCategory(category);
        setEditingLink(null);
        setLinkDialogOpen(true);
    };

    const openEditLink = (category: OnlineResourceCategoryItem, link: OnlineResourceLinkItem) => {
        setLinkTargetCategory(category);
        setEditingLink(link);
        setLinkDialogOpen(true);
    };

    const handleLinkSubmit = (payload: LinkFormPayload) => {
        if (!linkTargetCategory) return;
        setSubmitting(true);
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setLinkDialogOpen(false);
                setEditingLink(null);
                toast.success(editingLink ? "Link updated" : "Link added");
            },
            onError: (errors: Record<string, string>) => {
                const firstError = Object.values(errors)[0];
                toast.error(firstError || "Could not save link");
            },
            onFinish: () => setSubmitting(false),
        };

        if (editingLink) {
            router.put(endpoints.updateLink(editingLink.id), payload as unknown as Record<string, string | boolean>, options);
        } else {
            router.post(endpoints.storeLink(linkTargetCategory.id), payload as unknown as Record<string, string | boolean>, options);
        }
    };

    const handleDeleteLink = () => {
        if (!deletingLink) return;
        setSubmitting(true);
        router.delete(endpoints.destroyLink(deletingLink.id), {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingLink(null);
                toast.success("Link deleted");
            },
            onError: () => toast.error("Could not delete link"),
            onFinish: () => setSubmitting(false),
        });
    };

    const handleMoveLink = (category: OnlineResourceCategoryItem, index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= category.links.length) return;
        const reordered = [...category.links];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(targetIndex, 0, moved);

        router.patch(
            endpoints.reorderLinks(category.id),
            { ordered_ids: reordered.map((item) => item.id) },
            {
                preserveScroll: true,
                onError: () => toast.error("Could not reorder links"),
            },
        );
    };

    const isSearching = searchQuery.trim() !== "";

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-sm">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter categories or links..."
                        className="h-9 rounded-xl pl-9 pr-8"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear filter"
                            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {headerActions}
                    {canManage && (
                        <Button type="button" size="sm" className="gap-1.5 rounded-xl" onClick={openCreateCategory}>
                            <FolderPlus className="size-4" />
                            New Category
                        </Button>
                    )}
                </div>
            </div>

            {categories.length === 0 ? (
                <div className="border-border/70 bg-card/60 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
                    <div className="bg-primary/10 text-primary mb-3 flex size-12 items-center justify-center rounded-2xl">
                        <QrCode className="size-6" />
                    </div>
                    <h3 className="text-base font-semibold">{emptyStateTitle}</h3>
                    <p className="text-muted-foreground mt-1 max-w-md text-sm">{emptyStateDescription}</p>
                    {canManage && (
                        <Button type="button" size="sm" className="mt-4 gap-1.5 rounded-xl" onClick={openCreateCategory}>
                            <FolderPlus className="size-4" />
                            Create First Category
                        </Button>
                    )}
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="border-border/70 bg-card/50 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center">
                    <Search className="text-muted-foreground mb-2 size-5" />
                    <p className="text-sm font-medium">No categories or links match "{searchQuery}"</p>
                    <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setSearchQuery("")}>
                        Clear filter
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredCategories.map((category) => {
                        const originalIndex = categories.findIndex((item) => item.id === category.id);
                        const CategoryIcon = getResourceIcon(category.icon);
                        const accent = getResourceAccent(category.accent_color);

                        return (
                            <section
                                key={category.id}
                                className={cn(
                                    "border-border/70 bg-card overflow-hidden rounded-2xl border shadow-2xs transition-colors",
                                    !category.is_active && "opacity-75",
                                )}
                            >
                                <div className="border-border/60 bg-muted/20 flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className={cn("mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl", accent.iconBg)}>
                                            <CategoryIcon className="size-5" />
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <h3 className="text-base font-semibold tracking-tight">{category.name}</h3>
                                                <VisibilityBadge visibility={category.visibility} label={category.visibility_label} />
                                                {scope === "school" && category.audience !== "all" && (
                                                    <Badge variant="outline" className="gap-1 rounded-full text-[11px]">
                                                        <Users className="size-3" />
                                                        {category.audience_label}
                                                    </Badge>
                                                )}
                                                {!category.is_active && (
                                                    <Badge variant="secondary" className="gap-1 rounded-full text-[11px]">
                                                        <EyeOff className="size-3" />
                                                        Hidden
                                                    </Badge>
                                                )}
                                            </div>
                                            {category.description && (
                                                <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
                                                    {category.description}
                                                </p>
                                            )}
                                            <div className="text-muted-foreground flex flex-wrap items-center gap-3 pt-0.5 text-xs tabular-nums">
                                                <span className="inline-flex items-center gap-1">
                                                    <Link2 className="size-3.5" />
                                                    {category.links.length} {category.links.length === 1 ? "link" : "links"}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <QrCode className="size-3.5" />
                                                    {category.scan_count ?? 0} scans
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <MousePointerClick className="size-3.5" />
                                                    {category.total_clicks ?? 0} clicks
                                                </span>
                                                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
                                                    /q/{category.short_code}
                                                </code>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 self-start">
                                        {category.qr_svg_url && category.qr_png_url && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-1.5 rounded-lg text-xs"
                                                onClick={() => setQrCategory(category)}
                                            >
                                                <QrCode className="size-3.5" />
                                                QR Code
                                            </Button>
                                        )}

                                        {canManage && (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-8 gap-1 rounded-lg text-xs"
                                                    onClick={() => openAddLink(category)}
                                                >
                                                    <Plus className="size-3.5" />
                                                    Add Link
                                                </Button>

                                                {!isSearching && categories.length > 1 && (
                                                    <div className="border-border/70 flex items-center rounded-lg border">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 rounded-r-none"
                                                            disabled={originalIndex <= 0}
                                                            title="Move category up"
                                                            onClick={() => handleMoveCategory(originalIndex, -1)}
                                                        >
                                                            <ArrowUp className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 rounded-l-none"
                                                            disabled={originalIndex >= categories.length - 1}
                                                            title="Move category down"
                                                            onClick={() => handleMoveCategory(originalIndex, 1)}
                                                        >
                                                            <ArrowDown className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                )}

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 rounded-lg"
                                                    title="Edit category"
                                                    onClick={() => openEditCategory(category)}
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8 rounded-lg"
                                                    title="Delete category"
                                                    onClick={() => setDeletingCategory(category)}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="divide-border/60 divide-y">
                                    {category.links.length === 0 ? (
                                        <div className="text-muted-foreground flex flex-col items-center justify-between gap-2 px-4 py-6 text-center text-sm sm:flex-row sm:text-left">
                                            <span>No links in this category yet.</span>
                                            {canManage && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5 rounded-lg"
                                                    onClick={() => openAddLink(category)}
                                                >
                                                    <Plus className="size-3.5" />
                                                    Add First Link
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        category.links.map((link, linkIndex) => (
                                            <div
                                                key={link.id}
                                                className={cn(
                                                    "hover:bg-muted/30 flex flex-col gap-2.5 px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between",
                                                    !link.is_active && "opacity-60",
                                                )}
                                            >
                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <a
                                                            href={link.go_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:text-primary inline-flex items-center gap-1 text-sm font-medium transition-colors"
                                                        >
                                                            <span className="truncate">{link.title}</span>
                                                            <ArrowUpRight className="size-3.5 shrink-0 opacity-70" />
                                                        </a>
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
                                                        {!link.is_active && (
                                                            <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
                                                                Inactive
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {link.description && (
                                                        <p className="text-muted-foreground line-clamp-1 text-xs">{link.description}</p>
                                                    )}

                                                    <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-[11px]">
                                                        <span className="inline-flex max-w-xs items-center gap-1 truncate font-mono sm:max-w-md">
                                                            <Globe className="size-3 shrink-0" />
                                                            <span className="truncate">{link.url}</span>
                                                        </span>
                                                        <span className="tabular-nums">{link.click_count ?? 0} clicks</span>
                                                    </div>
                                                </div>

                                                {canManage && (
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        {category.links.length > 1 && (
                                                            <div className="border-border/70 flex items-center rounded-lg border">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-7 rounded-r-none"
                                                                    disabled={linkIndex === 0}
                                                                    title="Move link up"
                                                                    onClick={() => handleMoveLink(category, linkIndex, -1)}
                                                                >
                                                                    <ArrowUp className="size-3" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-7 rounded-l-none"
                                                                    disabled={linkIndex === category.links.length - 1}
                                                                    title="Move link down"
                                                                    onClick={() => handleMoveLink(category, linkIndex, 1)}
                                                                >
                                                                    <ArrowDown className="size-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 rounded-lg"
                                                            title="Edit link"
                                                            onClick={() => openEditLink(category, link)}
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive size-7 rounded-lg"
                                                            title="Delete link"
                                                            onClick={() => setDeletingLink(link)}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            <ResourceCategoryDialog
                open={categoryDialogOpen}
                onOpenChange={setCategoryDialogOpen}
                scope={scope}
                category={editingCategory}
                submitting={submitting}
                onSubmit={handleCategorySubmit}
            />

            <ResourceLinkDialog
                open={linkDialogOpen}
                onOpenChange={setLinkDialogOpen}
                categoryName={linkTargetCategory?.name ?? ""}
                link={editingLink}
                metadataUrl={endpoints.fetchLinkMetadata}
                submitting={submitting}
                onSubmit={handleLinkSubmit}
            />

            {qrCategory && qrCategory.qr_svg_url && qrCategory.qr_png_url && (
                <ResourceQrDialog
                    open={qrCategory !== null}
                    onOpenChange={(open) => {
                        if (!open) setQrCategory(null);
                    }}
                    title={qrCategory.name}
                    subtitle={qrCategory.description}
                    visibilityLabel={qrCategory.visibility_label}
                    qrUrl={qrCategory.qr_url}
                    svgUrl={qrCategory.qr_svg_url}
                    pngUrl={qrCategory.qr_png_url}
                    posterPdfUrl={qrCategory.poster_pdf_url}
                />
            )}

            <AlertDialog
                open={deletingCategory !== null}
                onOpenChange={(open) => {
                    if (!open) setDeletingCategory(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete category "{deletingCategory?.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will archive the category and hide its links and QR code from students.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={submitting}
                            onClick={handleDeleteCategory}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Category
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={deletingLink !== null}
                onOpenChange={(open) => {
                    if (!open) setDeletingLink(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete link "{deletingLink?.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Students will no longer see or be able to open this resource link.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={submitting}
                            onClick={handleDeleteLink}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Link
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function VisibilityBadge({ visibility, label }: { visibility: OnlineResourceCategoryItem["visibility"]; label: string }) {
    const isPublic = visibility === "public";
    return (
        <Badge
            variant="outline"
            className={cn(
                "gap-1 rounded-full text-[11px]",
                isPublic
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
        >
            {isPublic ? <Globe className="size-3" /> : <Lock className="size-3" />}
            {label}
        </Badge>
    );
}
