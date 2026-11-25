import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
    OnlineResourceCategoryItem,
    OnlineResourceColorMode,
    OnlineResourceDensity,
    OnlineResourceDesignConfig,
    OnlineResourceHeaderMeta,
    OnlineResourceHubSettings,
    OnlineResourceScope,
    OnlineResourceSeoConfig,
    OnlineResourceSocialLink,
    OnlineResourceVisibility,
} from "../types";
import { router } from "@inertiajs/react";
import axios from "axios";
import {
    ExternalLink,
    Eye,
    Globe,
    ImagePlus,
    LayoutGrid,
    Lock,
    Monitor,
    Palette,
    Plus,
    Save,
    Search,
    Smartphone,
    Sparkles,
    Trash2,
    Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { PublicHubRenderer } from "./public-hub-renderer";

interface ResourceHubCustomizerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scope: OnlineResourceScope;
    headerMeta: OnlineResourceHeaderMeta;
    hubSettings: OnlineResourceHubSettings;
    categories: OnlineResourceCategoryItem[];
    hubUrl: string;
    sitemapUrl?: string | null;
    endpoints: {
        updateHubSettings: string;
        uploadHubMedia: string;
        deleteHubMedia: (slot: "logo" | "banner" | "og_image") => string;
    };
}

export function ResourceHubCustomizerDialog({
    open,
    onOpenChange,
    scope,
    headerMeta,
    hubSettings,
    categories,
    hubUrl,
    sitemapUrl,
    endpoints,
}: ResourceHubCustomizerDialogProps) {
    const [activeTab, setActiveTab] = useState("design");
    const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
    const [mobileShowPreview, setMobileShowPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

    const [visibility, setVisibility] = useState<OnlineResourceVisibility>("public");
    const [isPublished, setIsPublished] = useState(true);
    const [headline, setHeadline] = useState("");
    const [tagline, setTagline] = useState("");
    const [badgeText, setBadgeText] = useState("");
    const [announcementText, setAnnouncementText] = useState("");
    const [announcementUrl, setAnnouncementUrl] = useState("");
    const [ctaLabel, setCtaLabel] = useState("");
    const [ctaUrl, setCtaUrl] = useState("");
    const [footerText, setFooterText] = useState("");
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [design, setDesign] = useState<OnlineResourceDesignConfig>(DEFAULT_DESIGN_CONFIG);
    const [seo, setSeo] = useState<OnlineResourceSeoConfig>(hubSettings.seo_config);
    const [customHex, setCustomHex] = useState("#2563eb");

    const logoInputRef = useRef<HTMLInputElement | null>(null);
    const bannerInputRef = useRef<HTMLInputElement | null>(null);
    const ogInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;
        setVisibility(hubSettings.visibility || "public");
        setIsPublished(hubSettings.is_published ?? true);
        setHeadline(hubSettings.headline ?? "");
        setTagline(hubSettings.tagline ?? "");
        setBadgeText(hubSettings.badge_text ?? "");
        setAnnouncementText(hubSettings.announcement_text ?? "");
        setAnnouncementUrl(hubSettings.announcement_url ?? "");
        setCtaLabel(hubSettings.cta_label ?? "");
        setCtaUrl(hubSettings.cta_url ?? "");
        setFooterText(hubSettings.footer_text ?? "");
        setLogoUrl(hubSettings.logo_url ?? null);
        setBannerUrl(hubSettings.banner_url ?? null);
        const mergedDesign = { ...DEFAULT_DESIGN_CONFIG, ...(hubSettings.design_config ?? {}) };
        setDesign(mergedDesign);
        if (/^#[0-9A-Fa-f]{6}$/.test(mergedDesign.accent_color)) {
            setCustomHex(mergedDesign.accent_color);
        }
        setSeo({
            meta_title: hubSettings.seo_config?.meta_title ?? null,
            meta_description: hubSettings.seo_config?.meta_description ?? null,
            keywords: hubSettings.seo_config?.keywords ?? null,
            og_title: hubSettings.seo_config?.og_title ?? null,
            og_description: hubSettings.seo_config?.og_description ?? null,
            og_image_path: hubSettings.seo_config?.og_image_path ?? null,
            og_image_url: hubSettings.seo_config?.og_image_url ?? null,
            resolved_og_image_url: hubSettings.seo_config?.resolved_og_image_url ?? null,
            twitter_card: hubSettings.seo_config?.twitter_card ?? "summary_large_image",
            canonical_url: hubSettings.seo_config?.canonical_url ?? null,
            robots_index: hubSettings.seo_config?.robots_index ?? true,
            structured_data_enabled: hubSettings.seo_config?.structured_data_enabled ?? true,
        });
    }, [open, hubSettings]);

    const previewHubSettings: OnlineResourceHubSettings = useMemo(
        () => ({
            ...hubSettings,
            visibility,
            is_published: isPublished,
            headline: headline.trim() || null,
            effective_headline: headline.trim() || headerMeta.title,
            tagline: tagline.trim() || null,
            effective_tagline: tagline.trim() || headerMeta.subtitle,
            badge_text: badgeText.trim() || null,
            effective_badge_text: badgeText.trim() || headerMeta.badge,
            announcement_text: announcementText.trim() || null,
            announcement_url: announcementUrl.trim() || null,
            cta_label: ctaLabel.trim() || null,
            cta_url: ctaUrl.trim() || null,
            logo_url: logoUrl,
            banner_url: bannerUrl,
            footer_text: footerText.trim() || null,
            design_config: design,
            seo_config: seo,
        }),
        [
            hubSettings,
            visibility,
            isPublished,
            headline,
            tagline,
            badgeText,
            announcementText,
            announcementUrl,
            ctaLabel,
            ctaUrl,
            logoUrl,
            bannerUrl,
            footerText,
            design,
            seo,
            headerMeta,
        ],
    );

    const isPubliclyIndexable = isPublished && visibility === "public";
    const serpTitle = seo.meta_title?.trim() || `${previewHubSettings.effective_headline} — ${headerMeta.school_name}`;
    const serpDescription =
        seo.meta_description?.trim() ||
        previewHubSettings.effective_tagline ||
        `Browse curated online resources, portals, and quick-access links from ${headerMeta.school_name}.`;
    const previewOgImage = seo.resolved_og_image_url || seo.og_image_url || bannerUrl;

    const handleMediaUpload = async (slot: "logo" | "banner" | "og_image", file: File | null) => {
        if (!file) return;
        setUploadingSlot(slot);
        try {
            const formData = new FormData();
            formData.append("slot", slot);
            formData.append("file", file);
            const { data } = await axios.post<{ url: string | null; path: string }>(endpoints.uploadHubMedia, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (slot === "logo") {
                setLogoUrl(data.url);
            } else if (slot === "banner") {
                setBannerUrl(data.url);
            } else {
                setSeo((prev) => ({
                    ...prev,
                    og_image_path: data.path,
                    resolved_og_image_url: data.url,
                }));
            }
            toast.success(`${slot === "og_image" ? "Social preview image" : slot === "banner" ? "Cover banner" : "Logo"} uploaded`);
        } catch {
            toast.error("Upload failed. Use JPG, PNG, or WebP within size limits.");
        } finally {
            setUploadingSlot(null);
        }
    };

    const handleMediaDelete = async (slot: "logo" | "banner" | "og_image") => {
        setUploadingSlot(slot);
        try {
            await axios.delete(endpoints.deleteHubMedia(slot));
            if (slot === "logo") {
                setLogoUrl(null);
            } else if (slot === "banner") {
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

    const handleSave = () => {
        setSaving(true);
        router.put(
            endpoints.updateHubSettings,
            {
                visibility,
                is_published: isPublished,
                headline: headline.trim() || null,
                tagline: tagline.trim() || null,
                badge_text: badgeText.trim() || null,
                announcement_text: announcementText.trim() || null,
                announcement_url: announcementUrl.trim() || null,
                cta_label: ctaLabel.trim() || null,
                cta_url: ctaUrl.trim() || null,
                footer_text: footerText.trim() || null,
                design_config: design,
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
            } as unknown as Record<string, string | boolean>,
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Website design & SEO saved");
                    onOpenChange(false);
                },
                onError: (errors: Record<string, string>) => {
                    toast.error(Object.values(errors)[0] || "Could not save settings");
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const addSocialLink = () => {
        if ((design.social_links?.length ?? 0) >= 6) return;
        setDesign((prev) => ({
            ...prev,
            social_links: [...(prev.social_links ?? []), { platform: "website", label: "Website", url: "" }],
        }));
    };

    const updateSocialLink = (index: number, patch: Partial<OnlineResourceSocialLink>) => {
        setDesign((prev) => ({
            ...prev,
            social_links: (prev.social_links ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
        }));
    };

    const removeSocialLink = (index: number) => {
        setDesign((prev) => ({
            ...prev,
            social_links: (prev.social_links ?? []).filter((_, i) => i !== index),
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[92dvh] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 lg:max-w-7xl">
                <DialogHeader className="border-border/70 flex flex-row flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
                    <div>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Palette className="text-primary size-4" aria-hidden="true" />
                            {scope === "class" ? "Customize Class Resource Website & SEO" : "Customize Resource Hub Website & SEO"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            All design systems automatically adapt to your client's configured CSS theme tokens.
                        </DialogDescription>
                    </div>

                    <div className="flex items-center gap-2 pr-6">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 rounded-xl text-xs xl:hidden"
                            onClick={() => setMobileShowPreview((prev) => !prev)}
                        >
                            <Eye className="size-3.5" />
                            {mobileShowPreview ? "Back to Editor" : "Live Preview"}
                        </Button>

                        <a
                            href={hubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border-border/80 bg-background hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors"
                        >
                            <ExternalLink className="size-3.5" />
                            <span className="hidden sm:inline">Open Live Site</span>
                        </a>

                        <Button type="button" size="sm" className="gap-1.5 rounded-xl" disabled={saving} onClick={handleSave}>
                            <Save className="size-3.5" />
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogHeader>

                <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[440px_1fr]">
                    {/* Left Column: Controls */}
                    <div
                        className={cn(
                            "border-border/70 flex min-h-0 flex-col overflow-y-auto border-r p-4",
                            mobileShowPreview && "hidden xl:flex",
                        )}
                    >
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="design" className="gap-1 text-xs">
                                    <LayoutGrid className="size-3.5" />
                                    <span className="hidden sm:inline">Design</span>
                                </TabsTrigger>
                                <TabsTrigger value="branding" className="gap-1 text-xs">
                                    <Sparkles className="size-3.5" />
                                    <span className="hidden sm:inline">Brand</span>
                                </TabsTrigger>
                                <TabsTrigger value="access" className="gap-1 text-xs">
                                    <Lock className="size-3.5" />
                                    <span className="hidden sm:inline">Access</span>
                                </TabsTrigger>
                                <TabsTrigger value="seo" className="gap-1 text-xs">
                                    <Search className="size-3.5" />
                                    <span className="hidden sm:inline">SEO</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: DESIGN & LAYOUT */}
                            <TabsContent value="design" className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Layout Template
                                    </Label>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {HUB_LAYOUT_OPTIONS.map((opt) => {
                                            const selected = design.layout === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setDesign((prev) => ({ ...prev, layout: opt.value }))}
                                                    className={cn(
                                                        "rounded-xl border p-2.5 text-left transition-colors",
                                                        selected
                                                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                                            : "border-border/75 bg-card hover:bg-muted/50",
                                                    )}
                                                >
                                                    <p className="text-xs font-semibold">{opt.label}</p>
                                                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">{opt.tagline}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Design System (Client CSS Tokens)
                                        </Label>
                                        <Badge variant="outline" className="rounded-full text-[10px]">
                                            Token-Linked
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {HUB_THEME_OPTIONS.map((opt) => {
                                            const selected = design.theme === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setDesign((prev) => ({ ...prev, theme: opt.value }))}
                                                    className={cn(
                                                        "rounded-xl border p-2.5 text-left transition-colors",
                                                        selected
                                                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                                            : "border-border/75 bg-card hover:bg-muted/50",
                                                    )}
                                                >
                                                    <p className="text-xs font-semibold">{opt.label}</p>
                                                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                                                        {opt.description}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Accent Color
                                    </Label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {HUB_ACCENT_OPTIONS.map((opt) => {
                                            const selected = design.accent_color === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    title={opt.label}
                                                    onClick={() => setDesign((prev) => ({ ...prev, accent_color: opt.value }))}
                                                    className={cn(
                                                        "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-all",
                                                        selected
                                                            ? "border-primary bg-primary/12 text-foreground ring-1 ring-primary/30"
                                                            : "border-border/80 bg-card text-muted-foreground hover:text-foreground",
                                                    )}
                                                >
                                                    <span
                                                        className="size-3.5 rounded-full border border-black/15"
                                                        style={{ backgroundColor: opt.hex ?? "var(--primary)" }}
                                                    />
                                                    {opt.value === "client" ? "Client Primary" : opt.label}
                                                </button>
                                            );
                                        })}
                                        <label className="border-border/80 bg-card inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium">
                                            <input
                                                type="color"
                                                value={customHex}
                                                onChange={(e) => {
                                                    setCustomHex(e.target.value);
                                                    setDesign((prev) => ({ ...prev, accent_color: e.target.value }));
                                                }}
                                                className="size-4 cursor-pointer rounded border-0 bg-transparent p-0"
                                            />
                                            <span>Custom</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Hero Style</Label>
                                        <Select
                                            value={design.hero_style}
                                            onValueChange={(v) => setDesign((prev) => ({ ...prev, hero_style: v as OnlineResourceDesignConfig["hero_style"] }))}
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
                                            onValueChange={(v) => setDesign((prev) => ({ ...prev, card_style: v as OnlineResourceDesignConfig["card_style"] }))}
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

                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Color Mode & Density</Label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <Select
                                                value={design.color_mode}
                                                onValueChange={(v) => setDesign((prev) => ({ ...prev, color_mode: v as OnlineResourceColorMode }))}
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
                                            <Select
                                                value={design.density}
                                                onValueChange={(v) => setDesign((prev) => ({ ...prev, density: v as OnlineResourceDensity }))}
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

                                <div className="space-y-2 border-t pt-4">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Visible Elements
                                    </Label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(
                                            [
                                                ["show_search", "Search bar & category filter"],
                                                ["show_category_nav", "Category pills / sidebar navigation"],
                                                ["show_personal_strips", "Student Pinned & Recently Opened strips"],
                                                ["show_descriptions", "Link descriptions"],
                                                ["show_hosts", "Website hostnames on cards"],
                                                ["show_report_broken", "Report broken link button"],
                                                ["show_portal_button", "Sign-In / Portal button in navbar"],
                                                ["show_back_to_hub", "Back-to-Hub breadcrumb on category pages"],
                                                ["show_footer", "Website footer & social links"],
                                            ] as const
                                        ).map(([key, label]) => (
                                            <div key={key} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1">
                                                <Label htmlFor={`toggle-${key}`} className="cursor-pointer text-xs font-normal">
                                                    {label}
                                                </Label>
                                                <Switch
                                                    id={`toggle-${key}`}
                                                    checked={Boolean(design[key])}
                                                    onCheckedChange={(checked) => setDesign((prev) => ({ ...prev, [key]: checked }))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 2: BRANDING & CONTENT */}
                            <TabsContent value="branding" className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="hub-headline" className="text-xs">Website Headline</Label>
                                    <Input
                                        id="hub-headline"
                                        value={headline}
                                        onChange={(e) => setHeadline(e.target.value)}
                                        placeholder={headerMeta.title}
                                        maxLength={160}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="hub-tagline" className="text-xs">Hero Tagline / Subtitle</Label>
                                    <Textarea
                                        id="hub-tagline"
                                        value={tagline}
                                        onChange={(e) => setTagline(e.target.value)}
                                        placeholder={headerMeta.subtitle ?? "Welcome to our online resources hub."}
                                        rows={2}
                                        maxLength={500}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="hub-badge" className="text-xs">Eyebrow Badge Text</Label>
                                    <Input
                                        id="hub-badge"
                                        value={badgeText}
                                        onChange={(e) => setBadgeText(e.target.value)}
                                        placeholder={headerMeta.badge}
                                        maxLength={80}
                                    />
                                </div>

                                {/* Media Uploads */}
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="border-border/75 bg-muted/30 space-y-2 rounded-xl border p-3">
                                        <Label className="text-xs font-medium">Hub Logo</Label>
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Hub logo" className="size-12 rounded-xl border object-cover" />
                                        ) : (
                                            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
                                                <ImagePlus className="size-5" />
                                            </div>
                                        )}
                                        <input
                                            ref={logoInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                void handleMediaUpload("logo", e.target.files?.[0] ?? null);
                                                e.target.value = "";
                                            }}
                                        />
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 gap-1 px-2 text-[11px]"
                                                disabled={uploadingSlot === "logo"}
                                                onClick={() => logoInputRef.current?.click()}
                                            >
                                                <Upload className="size-3" />
                                                {uploadingSlot === "logo" ? "..." : "Upload"}
                                            </Button>
                                            {logoUrl && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive h-7 px-2 text-[11px]"
                                                    onClick={() => void handleMediaDelete("logo")}
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-border/75 bg-muted/30 space-y-2 rounded-xl border p-3">
                                        <Label className="text-xs font-medium">Cover Banner</Label>
                                        {bannerUrl ? (
                                            <img src={bannerUrl} alt="Cover banner" className="h-12 w-full rounded-xl border object-cover" />
                                        ) : (
                                            <div className="bg-muted text-muted-foreground flex h-12 w-full items-center justify-center rounded-xl">
                                                <ImagePlus className="size-5" />
                                            </div>
                                        )}
                                        <input
                                            ref={bannerInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                void handleMediaUpload("banner", e.target.files?.[0] ?? null);
                                                e.target.value = "";
                                            }}
                                        />
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 gap-1 px-2 text-[11px]"
                                                disabled={uploadingSlot === "banner"}
                                                onClick={() => bannerInputRef.current?.click()}
                                            >
                                                <Upload className="size-3" />
                                                {uploadingSlot === "banner" ? "..." : "Upload"}
                                            </Button>
                                            {bannerUrl && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive h-7 px-2 text-[11px]"
                                                    onClick={() => void handleMediaDelete("banner")}
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t pt-3">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Announcement Bar (Optional)
                                    </Label>
                                    <Input
                                        value={announcementText}
                                        onChange={(e) => setAnnouncementText(e.target.value)}
                                        placeholder="e.g. 2nd Semester Enrollment & Library Guides Updated"
                                        maxLength={300}
                                    />
                                    <Input
                                        value={announcementUrl}
                                        onChange={(e) => setAnnouncementUrl(e.target.value)}
                                        placeholder="Optional link URL (https://...)"
                                        maxLength={2048}
                                    />
                                </div>

                                <div className="space-y-2 border-t pt-3">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Primary Hero CTA Button (Optional)
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            value={ctaLabel}
                                            onChange={(e) => setCtaLabel(e.target.value)}
                                            placeholder="Button label"
                                            maxLength={60}
                                        />
                                        <Input
                                            value={ctaUrl}
                                            onChange={(e) => setCtaUrl(e.target.value)}
                                            placeholder="https://..."
                                            maxLength={2048}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 border-t pt-3">
                                    <Label htmlFor="hub-footer-text" className="text-xs">Footer Text</Label>
                                    <Input
                                        id="hub-footer-text"
                                        value={footerText}
                                        onChange={(e) => setFooterText(e.target.value)}
                                        placeholder={`© ${new Date().getFullYear()} ${headerMeta.school_name}`}
                                        maxLength={300}
                                    />
                                </div>

                                <div className="space-y-2 border-t pt-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Footer Social / Contact Links
                                        </Label>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-7 gap-1 text-[11px]"
                                            disabled={(design.social_links?.length ?? 0) >= 6}
                                            onClick={addSocialLink}
                                        >
                                            <Plus className="size-3" />
                                            Add Link
                                        </Button>
                                    </div>
                                    {(design.social_links ?? []).map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-[100px_1fr_auto] gap-1.5">
                                            <Input
                                                value={item.label}
                                                onChange={(e) => updateSocialLink(idx, { label: e.target.value })}
                                                placeholder="Label"
                                                className="h-8 text-xs"
                                            />
                                            <Input
                                                value={item.url}
                                                onChange={(e) => updateSocialLink(idx, { url: e.target.value })}
                                                placeholder="https://..."
                                                className="h-8 text-xs"
                                            />
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="text-destructive size-8"
                                                onClick={() => removeSocialLink(idx)}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* TAB 3: VISIBILITY & WEBSITE ACCESS */}
                            <TabsContent value="access" className="space-y-4">
                                <div className="border-border/75 bg-muted/35 flex items-center justify-between gap-3 rounded-xl border p-3.5">
                                    <div>
                                        <Label htmlFor="hub-published-switch" className="cursor-pointer text-sm font-medium">
                                            Publish Hub Website
                                        </Label>
                                        <p className="text-muted-foreground text-xs">
                                            When turned off, visitors receive a 404 page while managers can still edit.
                                        </p>
                                    </div>
                                    <Switch
                                        id="hub-published-switch"
                                        checked={isPublished}
                                        onCheckedChange={setIsPublished}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="hub-visibility-select" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Website Access Visibility
                                    </Label>
                                    <Select value={visibility} onValueChange={(v) => setVisibility(v as OnlineResourceVisibility)}>
                                        <SelectTrigger id="hub-visibility-select">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="public">Public Website (Instant Access & Searchable)</SelectItem>
                                            {scope === "class" && (
                                                <SelectItem value="enrolled_only">Enrolled Students Only (Private, Noindex)</SelectItem>
                                            )}
                                            <SelectItem value="authenticated">Signed-in Campus Users Only (Private, Noindex)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-muted-foreground text-xs leading-relaxed">
                                        {visibility === "public"
                                            ? "Served like a fast public website with custom SEO, social preview cards, and sitemap discovery (unless you turn off indexing in the SEO tab)."
                                            : "Guests are redirected to Sign In with zero metadata leakage. Search engine indexing and public caching are automatically disabled."}
                                    </p>
                                </div>

                                <div className="border-border/75 bg-card space-y-2 rounded-xl border p-3.5 text-xs">
                                    <p className="font-semibold">Live Website Endpoints</p>
                                    <div className="text-muted-foreground flex items-center justify-between gap-2 font-mono text-[11px]">
                                        <span className="truncate">{hubUrl}</span>
                                        <a href={hubUrl} target="_blank" rel="noopener noreferrer" className="text-primary shrink-0 hover:underline">
                                            Open
                                        </a>
                                    </div>
                                    {sitemapUrl && (
                                        <div className="text-muted-foreground flex items-center justify-between gap-2 border-t pt-2 font-mono text-[11px]">
                                            <span className="truncate">{sitemapUrl}</span>
                                            <a href={sitemapUrl} target="_blank" rel="noopener noreferrer" className="text-primary shrink-0 hover:underline">
                                                XML Sitemap
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* TAB 4: SEO & SOCIAL SHARING */}
                            <TabsContent value="seo" className="space-y-4">
                                {!isPubliclyIndexable && (
                                    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                                        <p className="font-semibold">Search indexing is locked to noindex</p>
                                        <p className="mt-0.5 opacity-90">
                                            Because this hub is {isPublished ? "restricted to signed-in/enrolled users" : "unpublished"}, search engines and sitemaps are automatically blocked.
                                        </p>
                                    </div>
                                )}

                                {/* Live Google SERP Preview */}
                                <div className="border-border/80 bg-card space-y-1 rounded-xl border p-3.5">
                                    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                                        Google Search Preview
                                    </p>
                                    <p className="text-muted-foreground truncate text-xs">{seo.canonical_url || hubUrl}</p>
                                    <p className="line-clamp-1 text-sm font-semibold text-blue-600 dark:text-blue-400">{serpTitle}</p>
                                    <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">{serpDescription}</p>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="seo-meta-title" className="text-xs">SEO Meta Title</Label>
                                        <span className="text-muted-foreground text-[11px] tabular-nums">
                                            {(seo.meta_title ?? "").length}/60
                                        </span>
                                    </div>
                                    <Input
                                        id="seo-meta-title"
                                        value={seo.meta_title ?? ""}
                                        onChange={(e) => setSeo((prev) => ({ ...prev, meta_title: e.target.value }))}
                                        placeholder={serpTitle}
                                        maxLength={120}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="seo-meta-desc" className="text-xs">SEO Meta Description</Label>
                                        <span className="text-muted-foreground text-[11px] tabular-nums">
                                            {(seo.meta_description ?? "").length}/160
                                        </span>
                                    </div>
                                    <Textarea
                                        id="seo-meta-desc"
                                        value={seo.meta_description ?? ""}
                                        onChange={(e) => setSeo((prev) => ({ ...prev, meta_description: e.target.value }))}
                                        placeholder={serpDescription}
                                        rows={2}
                                        maxLength={320}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="seo-keywords" className="text-xs">Keywords (Comma-separated)</Label>
                                    <Input
                                        id="seo-keywords"
                                        value={seo.keywords ?? ""}
                                        onChange={(e) => setSeo((prev) => ({ ...prev, keywords: e.target.value }))}
                                        placeholder="student portal, library databases, campus links"
                                        maxLength={300}
                                    />
                                </div>

                                {/* Social Share OG Card Preview & Upload */}
                                <div className="border-border/80 bg-muted/25 space-y-2.5 rounded-xl border p-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold">Social Share Card (Open Graph / Twitter)</Label>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                ref={ogInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="hidden"
                                                onChange={(e) => {
                                                    void handleMediaUpload("og_image", e.target.files?.[0] ?? null);
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
                                                {uploadingSlot === "og_image" ? "..." : "Upload 1200×630"}
                                            </Button>
                                            {seo.og_image_path && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive h-7 px-2 text-[11px]"
                                                    onClick={() => void handleMediaDelete("og_image")}
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-border/70 bg-card overflow-hidden rounded-lg border">
                                        {previewOgImage ? (
                                            <img src={previewOgImage} alt="Social preview" className="h-28 w-full object-cover" />
                                        ) : (
                                            <div className="bg-muted text-muted-foreground flex h-20 items-center justify-center text-xs">
                                                Uses Cover Banner or School Default OG Image
                                            </div>
                                        )}
                                        <div className="p-2.5">
                                            <p className="text-muted-foreground text-[10px] uppercase">{headerMeta.school_name}</p>
                                            <p className="truncate text-xs font-semibold">{seo.og_title || serpTitle}</p>
                                            <p className="text-muted-foreground line-clamp-1 text-[11px]">{seo.og_description || serpDescription}</p>
                                        </div>
                                    </div>

                                    <Input
                                        value={seo.og_image_url ?? ""}
                                        onChange={(e) => setSeo((prev) => ({ ...prev, og_image_url: e.target.value }))}
                                        placeholder="Or paste external OG image URL (https://...)"
                                        className="h-8 text-xs"
                                    />
                                </div>

                                <div className="space-y-2 border-t pt-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <Label htmlFor="seo-robots-index" className="cursor-pointer text-xs font-medium">
                                                Allow Search Engine Indexing
                                            </Label>
                                            <p className="text-muted-foreground text-[11px]">
                                                Include in Google/Bing results and public sitemap.xml
                                            </p>
                                        </div>
                                        <Switch
                                            id="seo-robots-index"
                                            disabled={!isPubliclyIndexable}
                                            checked={isPubliclyIndexable && seo.robots_index}
                                            onCheckedChange={(checked) => setSeo((prev) => ({ ...prev, robots_index: checked }))}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <Label htmlFor="seo-jsonld" className="cursor-pointer text-xs font-medium">
                                                JSON-LD Structured Data
                                            </Label>
                                            <p className="text-muted-foreground text-[11px]">
                                                Emit Schema.org CollectionPage & ItemList markup
                                            </p>
                                        </div>
                                        <Switch
                                            id="seo-jsonld"
                                            disabled={!isPubliclyIndexable}
                                            checked={isPubliclyIndexable && seo.structured_data_enabled}
                                            onCheckedChange={(checked) =>
                                                setSeo((prev) => ({ ...prev, structured_data_enabled: checked }))
                                            }
                                        />
                                    </div>

                                    <div className="space-y-1 pt-1">
                                        <Label htmlFor="seo-canonical" className="text-xs">Canonical URL Override (Optional)</Label>
                                        <Input
                                            id="seo-canonical"
                                            value={seo.canonical_url ?? ""}
                                            onChange={(e) => setSeo((prev) => ({ ...prev, canonical_url: e.target.value }))}
                                            placeholder={hubUrl}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Column: Live Interactive Preview */}
                    <div
                        className={cn(
                            "bg-muted/35 flex min-h-0 flex-col overflow-hidden",
                            !mobileShowPreview && "hidden xl:flex",
                        )}
                    >
                        <div className="border-border/70 bg-card/80 flex items-center justify-between gap-2 border-b px-4 py-2">
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                <Globe className="size-3.5" />
                                <span className="max-w-[260px] truncate font-mono text-[11px]">{hubUrl}</span>
                                <Badge variant={isPubliclyIndexable ? "secondary" : "outline"} className="rounded-full text-[10px]">
                                    {isPubliclyIndexable ? "Public Website" : "Private / Noindex"}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1 rounded-lg border p-0.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                                    className="h-7 gap-1 px-2 text-xs"
                                    onClick={() => setPreviewDevice("desktop")}
                                >
                                    <Monitor className="size-3.5" />
                                    Desktop
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                                    className="h-7 gap-1 px-2 text-xs"
                                    onClick={() => setPreviewDevice("mobile")}
                                >
                                    <Smartphone className="size-3.5" />
                                    Mobile
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <div
                                className={cn(
                                    "border-border/80 bg-background mx-auto overflow-hidden rounded-2xl border shadow-lg transition-all",
                                    previewDevice === "mobile" ? "max-w-[390px]" : "w-full",
                                )}
                            >
                                <PublicHubRenderer
                                    viewMode="hub"
                                    headerMeta={headerMeta}
                                    hubSettings={previewHubSettings}
                                    resolvedDesign={design}
                                    categories={categories.filter((c) => c.is_active)}
                                    hubUrl={hubUrl}
                                    isAuthenticated={false}
                                    previewMode
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
