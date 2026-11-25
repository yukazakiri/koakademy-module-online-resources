import AdminLayout from "@/components/administrators/admin-layout";
import { ResourceHubCustomizerDialog } from "../../../components/resource-hub-customizer-dialog";
import { ResourceHubManager } from "../../../components/resource-hub-manager";
import { ResourceQrDialog } from "../../../components/resource-qr-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { OnlineResourceCategoryItem, OnlineResourceHeaderMeta, OnlineResourceHubSettings } from "../../../types";
import { Head } from "@inertiajs/react";
import { ExternalLink, FileDown, FolderOpen, Link2, MousePointerClick, Palette, QrCode } from "lucide-react";
import { useMemo, useState } from "react";

interface AdministratorOnlineResourcesPageProps {
    school: {
        id: number;
        name: string;
        code: string;
    };
    headerMeta: OnlineResourceHeaderMeta;
    canManage: boolean;
    categories: OnlineResourceCategoryItem[];
    hubSettings?: OnlineResourceHubSettings | null;
    hub: {
        url: string;
        sitemap_url?: string | null;
        qr_svg_url: string;
        qr_png_url: string;
        sheet_pdf_url: string;
    };
}

export default function AdministratorOnlineResourcesIndex({
    school,
    headerMeta,
    canManage,
    categories,
    hubSettings,
    hub,
}: AdministratorOnlineResourcesPageProps) {
    const [hubQrOpen, setHubQrOpen] = useState(false);
    const [customizerOpen, setCustomizerOpen] = useState(false);

    const stats = useMemo(() => {
        const totalLinks = categories.reduce((sum, category) => sum + category.links.length, 0);
        const totalScans = categories.reduce((sum, category) => sum + (category.scan_count ?? 0), 0);
        const totalClicks = categories.reduce((sum, category) => sum + (category.total_clicks ?? 0), 0);

        return {
            categories: categories.length,
            links: totalLinks,
            scans: totalScans,
            clicks: totalClicks,
        };
    }, [categories]);

    const endpoints = useMemo(
        () => ({
            storeCategory: "/administrators/online-resources/categories",
            updateCategory: (categoryId: number) => `/administrators/online-resources/categories/${categoryId}`,
            destroyCategory: (categoryId: number) => `/administrators/online-resources/categories/${categoryId}`,
            reorderCategories: "/administrators/online-resources/categories/reorder",
            storeLink: (categoryId: number) => `/administrators/online-resources/categories/${categoryId}/links`,
            updateLink: (linkId: number) => `/administrators/online-resources/links/${linkId}`,
            destroyLink: (linkId: number) => `/administrators/online-resources/links/${linkId}`,
            reorderLinks: (categoryId: number) => `/administrators/online-resources/categories/${categoryId}/links/reorder`,
            fetchLinkMetadata: "/administrators/online-resources/links/metadata",
        }),
        [],
    );

    const hubCustomizerEndpoints = useMemo(
        () => ({
            updateHubSettings: "/administrators/online-resources/hub-settings",
            uploadHubMedia: "/administrators/online-resources/hub-settings/media",
            deleteHubMedia: (slot: "logo" | "banner" | "og_image") => `/administrators/online-resources/hub-settings/media/${slot}`,
        }),
        [],
    );

    return (
        <AdminLayout title="Online Resources">
            <Head title="Online Resources" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
                <header className="border-border/70 bg-card flex flex-col gap-4 rounded-2xl border p-5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="gap-1 rounded-full">
                                <QrCode className="size-3" />
                                {headerMeta.badge}
                            </Badge>
                            <Badge variant="outline" className="rounded-full font-mono text-[11px]">
                                {school.code}
                            </Badge>
                            {hubSettings && (
                                <Badge variant="outline" className="rounded-full text-[11px]">
                                    {hubSettings.is_published
                                        ? hubSettings.visibility === "public"
                                            ? "Public Website"
                                            : "Campus Login Required"
                                        : "Unpublished Draft"}
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Online Resources</h1>
                        <p className="text-muted-foreground max-w-2xl text-sm">
                            Curate categorized web links for {school.name}, customize the public website layout & SEO, and generate permanent QR codes.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {canManage && hubSettings && (
                            <Button
                                type="button"
                                size="sm"
                                className="gap-1.5 rounded-xl"
                                onClick={() => setCustomizerOpen(true)}
                            >
                                <Palette className="size-4" />
                                Customize Website & SEO
                            </Button>
                        )}

                        <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => setHubQrOpen(true)}>
                            <QrCode className="size-4" />
                            Master Hub QR
                        </Button>

                        <a
                            href={hub.sheet_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 rounded-xl" })}
                        >
                            <FileDown className="size-4" />
                            Print All QRs (PDF)
                        </a>

                        <a
                            href={hub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "secondary", size: "sm", className: "gap-1.5 rounded-xl" })}
                        >
                            <ExternalLink className="size-4" />
                            Open Public Hub
                        </a>
                    </div>
                </header>

                <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard label="Categories" value={stats.categories} icon={<FolderOpen className="size-4" />} />
                    <StatCard label="Curated Links" value={stats.links} icon={<Link2 className="size-4" />} />
                    <StatCard label="QR Scans" value={stats.scans} icon={<QrCode className="size-4" />} />
                    <StatCard label="Link Clicks" value={stats.clicks} icon={<MousePointerClick className="size-4" />} />
                </section>

                <ResourceHubManager
                    scope="school"
                    categories={categories}
                    canManage={canManage}
                    endpoints={endpoints}
                    emptyStateTitle="No school online resource categories yet"
                    emptyStateDescription="Create categories such as Library Databases, Student Forms, or LMS Portals. Every category gets a permanent QR code and customizable webpage."
                />
            </div>

            <ResourceQrDialog
                open={hubQrOpen}
                onOpenChange={setHubQrOpen}
                title={`${school.name} Online Resources`}
                subtitle="Master QR code linking to all active public resource categories for this school."
                visibilityLabel="Master School Directory"
                qrUrl={hub.url}
                svgUrl={hub.qr_svg_url}
                pngUrl={hub.qr_png_url}
                posterPdfUrl={hub.sheet_pdf_url}
            />

            {canManage && hubSettings && (
                <ResourceHubCustomizerDialog
                    open={customizerOpen}
                    onOpenChange={setCustomizerOpen}
                    scope="school"
                    headerMeta={headerMeta}
                    hubSettings={hubSettings}
                    categories={categories}
                    hubUrl={hub.url}
                    sitemapUrl={hub.sitemap_url}
                    endpoints={hubCustomizerEndpoints}
                />
            )}
        </AdminLayout>
    );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="border-border/70 bg-card flex items-center justify-between rounded-2xl border px-4 py-3.5 shadow-2xs">
            <div>
                <p className="text-muted-foreground text-xs font-medium">{label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value.toLocaleString()}</p>
            </div>
            <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-xl">{icon}</div>
        </div>
    );
}
