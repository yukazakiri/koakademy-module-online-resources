import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
    OnlineResourceAudience,
    OnlineResourceCategoryItem,
    OnlineResourceColorMode,
    OnlineResourceDensity,
    OnlineResourceDesignConfig,
    OnlineResourceDesignMode,
    OnlineResourceScope,
    OnlineResourceSeoConfig,
    OnlineResourceVisibility,
} from "../types";
import axios from "axios";
import { ExternalLink, Globe, ImagePlus, Palette, Search, Settings2, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    DEFAULT_DESIGN_CONFIG,
    HUB_ACCENT_OPTIONS,
    HUB_CARD_STYLE_OPTIONS,
    HUB_FONT_PAIRING_OPTIONS,
    HUB_HERO_STYLE_OPTIONS,
    HUB_LAYOUT_OPTIONS,
    HUB_THEME_OPTIONS,
} from "./hub-themes";
import { RESOURCE_ACCENT_OPTIONS, RESOURCE_ICON_OPTIONS } from "./resource-icons";

export interface CategoryFormPayload {
    name: string;
    slug?: string;
    description: string;
    hero_tagline: string;
    icon: string;
    accent_color: string;
    design_mode: OnlineResourceDesignMode;
    design_config?: OnlineResourceDesignConfig | null;
    seo_config?: Partial<OnlineResourceSeoConfig> | null;
    visibility: OnlineResourceVisibility;
    audience: OnlineResourceAudience;
    is_active: boolean;
}

interface ResourceCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scope: OnlineResourceScope;
    category?: OnlineResourceCategoryItem | null;
    initialTab?: "general" | "design" | "seo";
    submitting: boolean;
    onSubmit: (payload: CategoryFormPayload) => void;
}

export function ResourceCategoryDialog({
    open,
    onOpenChange,
    scope,
    category,
    initialTab = "general",
    submitting,
    onSubmit,
}: ResourceCategoryDialogProps) {
    const [tab, setTab] = useState<"general" | "design" | "seo">(initialTab);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [heroTagline, setHeroTagline] = useState("");
    const [icon, setIcon] = useState("link");
    const [accentColor, setAccentColor] = useState("blue");
    const [visibility, setVisibility] = useState<OnlineResourceVisibility>("public");
    const [audience, setAudience] = useState<OnlineResourceAudience>("all");
    const [isActive, setIsActive] = useState(true);

    const [designMode, setDesignMode] = useState<OnlineResourceDesignMode>("inherit");
    const [design, setDesign] = useState<OnlineResourceDesignConfig>(DEFAULT_DESIGN_CONFIG);
    const [customHex, setCustomHex] = useState("#2563eb");

    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
    const [seo, setSeo] = useState<OnlineResourceSeoConfig>({
        meta_title: null,
        meta_description: null,
        keywords: null,
        og_title: null,
        og_description: null,
        og_image_path: null,
        og_image_url: null,
        resolved_og_image_url: null,
        twitter_card: "summary_large_image",
        canonical_url: null,
        robots_index: true,
        structured_data_enabled: true,
    });

    const bannerInputRef = useRef<HTMLInputElement | null>(null);
    const ogInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;
        setTab(initialTab);
        if (category) {
            setName(category.name);
            setSlug(category.slug ?? "");
            setDescription(category.description ?? "");
            setHeroTagline(category.hero_tagline ?? "");
            setIcon(category.icon || "link");
            setAccentColor(category.accent_color || "blue");
            setVisibility(category.visibility);
            setAudience(category.audience);
            setIsActive(category.is_active);
            setDesignMode(category.design_mode ?? "inherit");
            const nextDesign = { ...DEFAULT_DESIGN_CONFIG, ...(category.design_config ?? {}) };
            setDesign(nextDesign);
            if (/^#[0-9A-Fa-f]{6}$/.test(nextDesign.accent_color)) {
                setCustomHex(nextDesign.accent_color);
            }
            setBannerUrl(category.banner_url ?? null);
            setSeo({
                meta_title: category.seo_config?.meta_title ?? null,
                meta_description: category.seo_config?.meta_description ?? null,
                keywords: category.seo_config?.keywords ?? null,
                og_title: category.seo_config?.og_title ?? null,
                og_description: category.seo_config?.og_description ?? null,
                og_image_path: category.seo_config?.og_image_path ?? null,
                og_image_url: category.seo_config?.og_image_url ?? null,
                resolved_og_image_url: category.seo_config?.resolved_og_image_url ?? null,
                twitter_card: category.seo_config?.twitter_card ?? "summary_large_image",
                canonical_url: category.seo_config?.canonical_url ?? null,
                robots_index: category.seo_config?.robots_index ?? true,
                structured_data_enabled: category.seo_config?.structured_data_enabled ?? true,
            });
        } else {
            setName("");
            setSlug("");
            setDescription("");
            setHeroTagline("");
            setIcon(scope === "class" ? "book" : "library");
            setAccentColor("blue");
            setVisibility("public");
            setAudience("all");
            setIsActive(true);
            setDesignMode("inherit");
            setDesign(DEFAULT_DESIGN_CONFIG);
            setBannerUrl(null);
            setSeo({
                meta_title: null,
                meta_description: null,
                keywords: null,
                og_title: null,
                og_description: null,
                og_image_path: null,
                og_image_url: null,
                resolved_og_image_url: null,
                twitter_card: "summary_large_image",
                canonical_url: null,
                robots_index: true,
                structured_data_enabled: true,
            });
        }
    }, [open, category, scope, initialTab]);

    const handleUploadMedia = async (slot: "banner" | "og_image", file: File | null) => {
        if (!file || !category?.media_upload_url) return;
        setUploadingSlot(slot);
        try {
            const formData = new FormData();
            formData.append("slot", slot);
            formData.append("file", file);
            const { data } = await axios.post<{ url: string | null; path: string }>(category.media_upload_url, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (slot === "banner") {
                setBannerUrl(data.url);
            } else {
                setSeo((prev) => ({
                    ...prev,
                    og_image_path: data.path,
                    resolved_og_image_url: data.url,
                }));
            }
            toast.success(slot === "banner" ? "Category banner uploaded" : "Social preview image uploaded");
        } catch {
            toast.error("Upload failed. Use JPG, PNG, or WebP within size limits.");
        } finally {
            setUploadingSlot(null);
        }
    };

    const handleDeleteMedia = async (slot: "banner" | "og_image") => {
        if (!category?.media_delete_url) return;
        setUploadingSlot(slot);
        try {
            await axios.delete(category.media_delete_url.replace("__SLOT__", slot));
            if (slot === "banner") {
                setBannerUrl(null);
            } else {
                setSeo((prev) => ({
                    ...prev,
                    og_image_path: null,
                    resolved_og_image_url: prev.og_image_url || null,
                }));
            }
            toast.success("Image removed");
        } catch {
            toast.error("Could not remove image");
        } finally {
            setUploadingSlot(null);
        }
    };

    const isPublicCategory = visibility === "public" && isActive;
    const serpTitle = seo.meta_title?.trim() || name.trim() || "Category Hub Page";
    const serpDesc =
        seo.meta_description?.trim() ||
        heroTagline.trim() ||
        description.trim() ||
        "Curated quick-access links and resources.";

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (name.trim() === "") return;
        onSubmit({
            name: name.trim(),
            slug: slug.trim() || undefined,
            description: description.trim(),
            hero_tagline: heroTagline.trim(),
            icon,
            accent_color: accentColor,
            design_mode: designMode,
            design_config: designMode === "custom" ? design : null,
            seo_config: {
                meta_title: seo.meta_title?.trim() || null,
                meta_description: seo.meta_description?.trim() || null,
                keywords: seo.keywords?.trim() || null,
                og_title: seo.og_title?.trim() || null,
                og_description: seo.og_description?.trim() || null,
                og_image_url: seo.og_image_url?.trim() || null,
                twitter_card: seo.twitter_card,
                canonical_url: seo.canonical_url?.trim() || null,
                robots_index: seo.robots_index,
                structured_data_enabled: seo.structured_data_enabled,
            },
            visibility,
            audience,
            is_active: isActive,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                        <div>
                            <DialogTitle>{category ? "Edit Category & Page Settings" : "New Resource Category"}</DialogTitle>
                            <DialogDescription>
                                {scope === "class"
                                    ? "Configure class materials, dedicated page layout, QR visibility, and SEO."
                                    : "Configure category links, dedicated website layout, QR visibility, and SEO."}
                            </DialogDescription>
                        </div>
                        {category?.page_url && (
                            <a
                                href={category.page_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border-border/80 bg-background hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors"
                            >
                                <ExternalLink className="size-3.5" />
                                Open Page
                            </a>
                        )}
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Tabs value={tab} onValueChange={(v) => setTab(v as "general" | "design" | "seo")} className="space-y-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="general" className="gap-1.5 text-xs">
                                <Settings2 className="size-3.5" />
                                General
                            </TabsTrigger>
                            <TabsTrigger value="design" className="gap-1.5 text-xs">
                                <Palette className="size-3.5" />
                                Design & Layout
                            </TabsTrigger>
                            <TabsTrigger value="seo" className="gap-1.5 text-xs">
                                <Search className="size-3.5" />
                                SEO & Sharing
                            </TabsTrigger>
                        </TabsList>

                        {/* GENERAL TAB */}
                        <TabsContent value="general" className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="resource-category-name">Category Name</Label>
                                    <Input
                                        id="resource-category-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={scope === "class" ? "e.g. Week 1–4 Lecture Slides" : "e.g. Library & Research"}
                                        required
                                        maxLength={120}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="resource-category-slug">Website URL Slug</Label>
                                    <Input
                                        id="resource-category-slug"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        placeholder="auto-generated-from-name"
                                        maxLength={120}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="resource-category-description">Short Description</Label>
                                <Textarea
                                    id="resource-category-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Context shown on the Hub directory, Category page, and printable QR poster."
                                    rows={2}
                                    maxLength={500}
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="resource-category-visibility">QR & Website Visibility</Label>
                                    <Select value={visibility} onValueChange={(value) => setVisibility(value as OnlineResourceVisibility)}>
                                        <SelectTrigger id="resource-category-visibility">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="public">Public Website (Instant QR Access)</SelectItem>
                                            {scope === "class" && (
                                                <SelectItem value="enrolled_only">Enrolled Students Only (Private)</SelectItem>
                                            )}
                                            <SelectItem value="authenticated">Signed-in Users Only (Private)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {scope === "school" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="resource-category-audience">Target Audience</Label>
                                        <Select value={audience} onValueChange={(value) => setAudience(value as OnlineResourceAudience)}>
                                            <SelectTrigger id="resource-category-audience">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Everyone</SelectItem>
                                                <SelectItem value="students">Students</SelectItem>
                                                <SelectItem value="faculty">Faculty & Staff</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label id="resource-category-icon-label">Icon</Label>
                                <div
                                    role="radiogroup"
                                    aria-labelledby="resource-category-icon-label"
                                    className="grid grid-cols-4 gap-1.5 sm:grid-cols-8"
                                >
                                    {RESOURCE_ICON_OPTIONS.map((option) => {
                                        const Icon = option.Icon;
                                        const selected = icon === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                aria-label={option.label}
                                                title={option.label}
                                                onClick={() => setIcon(option.value)}
                                                className={cn(
                                                    "flex h-9 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:outline-none",
                                                    selected
                                                        ? "border-primary bg-primary/12 text-primary"
                                                        : "border-border/70 bg-background hover:bg-muted text-muted-foreground",
                                                )}
                                            >
                                                <Icon className="size-4" aria-hidden="true" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label id="resource-category-accent-label">Category Swatch</Label>
                                <div
                                    role="radiogroup"
                                    aria-labelledby="resource-category-accent-label"
                                    className="flex flex-wrap gap-2"
                                >
                                    {RESOURCE_ACCENT_OPTIONS.map((option) => {
                                        const selected = accentColor === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                aria-label={option.label}
                                                title={option.label}
                                                onClick={() => setAccentColor(option.value)}
                                                className={cn(
                                                    "size-7 rounded-full border-2 transition-transform focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:transform-none",
                                                    option.swatch,
                                                    selected
                                                        ? "border-foreground scale-110 ring-2 ring-foreground/20"
                                                        : "border-transparent hover:scale-105",
                                                )}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-muted/40 border-border/70 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5">
                                <div>
                                    <Label htmlFor="resource-category-active" className="cursor-pointer text-sm font-medium">
                                        Published & scannable
                                    </Label>
                                    <p id="resource-category-active-desc" className="text-muted-foreground text-xs">
                                        Inactive categories are hidden from visitors, QR scans, and sitemaps.
                                    </p>
                                </div>
                                <Switch
                                    id="resource-category-active"
                                    aria-describedby="resource-category-active-desc"
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                />
                            </div>
                        </TabsContent>

                        {/* DESIGN & LAYOUT TAB */}
                        <TabsContent value="design" className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDesignMode("inherit")}
                                    className={cn(
                                        "rounded-xl border p-3 text-left transition-colors",
                                        designMode === "inherit"
                                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                            : "border-border/75 bg-card hover:bg-muted/40",
                                    )}
                                >
                                    <p className="text-xs font-semibold">Inherit from Hub</p>
                                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                                        Automatically matches the {scope === "class" ? "Class / School" : "School"} Hub design.
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDesignMode("custom")}
                                    className={cn(
                                        "rounded-xl border p-3 text-left transition-colors",
                                        designMode === "custom"
                                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                            : "border-border/75 bg-card hover:bg-muted/40",
                                    )}
                                >
                                    <p className="text-xs font-semibold">Custom Category Design</p>
                                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                                        Choose a unique layout, theme, and hero just for this category page.
                                    </p>
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="category-hero-tagline" className="text-xs">Dedicated Hero Intro (Optional)</Label>
                                <Input
                                    id="category-hero-tagline"
                                    value={heroTagline}
                                    onChange={(e) => setHeroTagline(e.target.value)}
                                    placeholder="Extended intro copy shown on this category's dedicated webpage"
                                    maxLength={300}
                                />
                            </div>

                            {category?.media_upload_url && (
                                <div className="border-border/75 bg-muted/25 flex items-center justify-between gap-3 rounded-xl border p-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {bannerUrl ? (
                                            <img src={bannerUrl} alt="Category banner" className="h-12 w-20 shrink-0 rounded-lg border object-cover" />
                                        ) : (
                                            <div className="bg-muted text-muted-foreground flex h-12 w-20 shrink-0 items-center justify-center rounded-lg">
                                                <ImagePlus className="size-4" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold">Category Cover Banner</p>
                                            <p className="text-muted-foreground text-[11px]">JPG, PNG, or WebP up to 4 MB.</p>
                                        </div>
                                    </div>
                                    <input
                                        ref={bannerInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={(e) => {
                                            void handleUploadMedia("banner", e.target.files?.[0] ?? null);
                                            e.target.value = "";
                                        }}
                                    />
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 gap-1 text-xs"
                                            disabled={uploadingSlot === "banner"}
                                            onClick={() => bannerInputRef.current?.click()}
                                        >
                                            <Upload className="size-3.5" />
                                            {uploadingSlot === "banner" ? "..." : "Upload"}
                                        </Button>
                                        {bannerUrl && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive h-8 px-2"
                                                onClick={() => void handleDeleteMedia("banner")}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {designMode === "custom" && (
                                <div className="space-y-4 border-t pt-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Page Layout</Label>
                                            <Select
                                                value={design.layout}
                                                onValueChange={(v) =>
                                                    setDesign((prev) => ({ ...prev, layout: v as OnlineResourceDesignConfig["layout"] }))
                                                }
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {HUB_LAYOUT_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Design System (Token-Linked)</Label>
                                            <Select
                                                value={design.theme}
                                                onValueChange={(v) =>
                                                    setDesign((prev) => ({ ...prev, theme: v as OnlineResourceDesignConfig["theme"] }))
                                                }
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {HUB_THEME_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Hero Style</Label>
                                            <Select
                                                value={design.hero_style}
                                                onValueChange={(v) =>
                                                    setDesign((prev) => ({
                                                        ...prev,
                                                        hero_style: v as OnlineResourceDesignConfig["hero_style"],
                                                    }))
                                                }
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {HUB_HERO_STYLE_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Card Style</Label>
                                            <Select
                                                value={design.card_style}
                                                onValueChange={(v) =>
                                                    setDesign((prev) => ({
                                                        ...prev,
                                                        card_style: v as OnlineResourceDesignConfig["card_style"],
                                                    }))
                                                }
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {HUB_CARD_STYLE_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Typography</Label>
                                            <Select
                                                value={design.font_pairing}
                                                onValueChange={(v) =>
                                                    setDesign((prev) => ({
                                                        ...prev,
                                                        font_pairing: v as OnlineResourceDesignConfig["font_pairing"],
                                                    }))
                                                }
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {HUB_FONT_PAIRING_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Mode</Label>
                                                <Select
                                                    value={design.color_mode}
                                                    onValueChange={(v) =>
                                                        setDesign((prev) => ({ ...prev, color_mode: v as OnlineResourceColorMode }))
                                                    }
                                                >
                                                    <SelectTrigger className="h-9 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="system">System</SelectItem>
                                                        <SelectItem value="light">Light</SelectItem>
                                                        <SelectItem value="dark">Dark</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Density</Label>
                                                <Select
                                                    value={design.density}
                                                    onValueChange={(v) =>
                                                        setDesign((prev) => ({ ...prev, density: v as OnlineResourceDensity }))
                                                    }
                                                >
                                                    <SelectTrigger className="h-9 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="comfortable">Roomy</SelectItem>
                                                        <SelectItem value="compact">Compact</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs">Page Accent Color</Label>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {HUB_ACCENT_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setDesign((prev) => ({ ...prev, accent_color: opt.value }))}
                                                    className={cn(
                                                        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium",
                                                        design.accent_color === opt.value
                                                            ? "border-primary bg-primary/12 text-foreground"
                                                            : "border-border/80 bg-card text-muted-foreground",
                                                    )}
                                                >
                                                    <span
                                                        className="size-3 rounded-full border border-black/15"
                                                        style={{ backgroundColor: opt.hex ?? "var(--primary)" }}
                                                    />
                                                    {opt.value === "client" ? "Client Primary" : opt.label}
                                                </button>
                                            ))}
                                            <label className="border-border/80 bg-card inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2 text-[11px]">
                                                <input
                                                    type="color"
                                                    value={customHex}
                                                    onChange={(e) => {
                                                        setCustomHex(e.target.value);
                                                        setDesign((prev) => ({ ...prev, accent_color: e.target.value }));
                                                    }}
                                                    className="size-3.5 cursor-pointer border-0 bg-transparent p-0"
                                                />
                                                Custom
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                                        <Label htmlFor="cat-show-back-hub" className="cursor-pointer text-xs">
                                            Show "Back to Hub" breadcrumb & sibling categories
                                        </Label>
                                        <Switch
                                            id="cat-show-back-hub"
                                            checked={design.show_back_to_hub}
                                            onCheckedChange={(checked) => setDesign((prev) => ({ ...prev, show_back_to_hub: checked }))}
                                        />
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* SEO & SHARING TAB */}
                        <TabsContent value="seo" className="space-y-4">
                            {!isPublicCategory && (
                                <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                                    <p className="font-semibold">Indexing automatically disabled (noindex, nofollow)</p>
                                    <p className="mt-0.5 opacity-90">
                                        Private, signed-in, enrolled-only, or unpublished categories are never indexed by search engines or included in sitemaps.
                                    </p>
                                </div>
                            )}

                            <div className="border-border/80 bg-card space-y-1 rounded-xl border p-3">
                                <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide">
                                    <Globe className="size-3" /> Search Result Preview
                                </p>
                                <p className="text-muted-foreground truncate text-xs">{seo.canonical_url || category?.page_url || "/resources/..."}</p>
                                <p className="line-clamp-1 text-sm font-semibold text-blue-600 dark:text-blue-400">{serpTitle}</p>
                                <p className="text-muted-foreground line-clamp-2 text-xs">{serpDesc}</p>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="cat-seo-title" className="text-xs">Meta Title Override</Label>
                                    <span className="text-muted-foreground text-[11px] tabular-nums">{(seo.meta_title ?? "").length}/60</span>
                                </div>
                                <Input
                                    id="cat-seo-title"
                                    value={seo.meta_title ?? ""}
                                    onChange={(e) => setSeo((prev) => ({ ...prev, meta_title: e.target.value }))}
                                    placeholder={serpTitle}
                                    maxLength={120}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="cat-seo-desc" className="text-xs">Meta Description Override</Label>
                                    <span className="text-muted-foreground text-[11px] tabular-nums">{(seo.meta_description ?? "").length}/160</span>
                                </div>
                                <Textarea
                                    id="cat-seo-desc"
                                    value={seo.meta_description ?? ""}
                                    onChange={(e) => setSeo((prev) => ({ ...prev, meta_description: e.target.value }))}
                                    placeholder={serpDesc}
                                    rows={2}
                                    maxLength={320}
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="cat-seo-keywords" className="text-xs">Keywords</Label>
                                    <Input
                                        id="cat-seo-keywords"
                                        value={seo.keywords ?? ""}
                                        onChange={(e) => setSeo((prev) => ({ ...prev, keywords: e.target.value }))}
                                        placeholder="comma, separated, keywords"
                                        maxLength={300}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="cat-seo-canonical" className="text-xs">Canonical URL (Optional)</Label>
                                    <Input
                                        id="cat-seo-canonical"
                                        value={seo.canonical_url ?? ""}
                                        onChange={(e) => setSeo((prev) => ({ ...prev, canonical_url: e.target.value }))}
                                        placeholder="https://..."
                                        maxLength={2048}
                                    />
                                </div>
                            </div>

                            <div className="border-border/75 bg-muted/25 space-y-2 rounded-xl border p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <Label className="text-xs font-semibold">Social Share (OG) Image</Label>
                                    {category?.media_upload_url && (
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                ref={ogInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="hidden"
                                                onChange={(e) => {
                                                    void handleUploadMedia("og_image", e.target.files?.[0] ?? null);
                                                    e.target.value = "";
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 gap-1 px-2 text-[11px]"
                                                disabled={uploadingSlot === "og_image"}
                                                onClick={() => ogInputRef.current?.click()}
                                            >
                                                <Upload className="size-3" />
                                                {uploadingSlot === "og_image" ? "..." : "Upload"}
                                            </Button>
                                            {seo.og_image_path && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive h-7 px-2"
                                                    onClick={() => void handleDeleteMedia("og_image")}
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {(seo.resolved_og_image_url || seo.og_image_url) && (
                                    <img
                                        src={seo.resolved_og_image_url || seo.og_image_url || ""}
                                        alt="Category OG preview"
                                        className="h-24 w-full rounded-lg border object-cover"
                                    />
                                )}
                                <Input
                                    value={seo.og_image_url ?? ""}
                                    onChange={(e) => setSeo((prev) => ({ ...prev, og_image_url: e.target.value }))}
                                    placeholder="Or external HTTPS image URL (defaults to Category Banner or Hub OG Image)"
                                    className="h-8 text-xs"
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                                <div>
                                    <Label htmlFor="cat-seo-index" className="cursor-pointer text-xs font-medium">
                                        Allow Search Engine Indexing
                                    </Label>
                                    <p className="text-muted-foreground text-[11px]">
                                        Include this category page in search results & sitemap.xml when Public.
                                    </p>
                                </div>
                                <Switch
                                    id="cat-seo-index"
                                    disabled={!isPublicCategory}
                                    checked={isPublicCategory && seo.robots_index}
                                    onCheckedChange={(checked) => setSeo((prev) => ({ ...prev, robots_index: checked }))}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || name.trim() === ""}>
                            {submitting ? "Saving..." : category ? "Save Changes" : "Create Category"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
