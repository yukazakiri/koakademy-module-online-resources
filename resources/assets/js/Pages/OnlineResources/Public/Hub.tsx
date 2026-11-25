import { ResourceDirectoryView } from "../../../components/resource-directory-view";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { OnlineResourceCategoryItem, OnlineResourceHeaderMeta } from "../../../types";
import { Head, Link } from "@inertiajs/react";
import { Check, Copy, ExternalLink, LogIn, QrCode, School } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PublicOnlineResourcesHubProps {
    headerMeta: OnlineResourceHeaderMeta;
    focusedCategoryId: number | null;
    categories: OnlineResourceCategoryItem[];
    hubUrl: string | null;
    isAuthenticated: boolean;
    portalUrl?: string | null;
}

export default function PublicOnlineResourcesHub({
    headerMeta,
    focusedCategoryId,
    categories,
    hubUrl,
    isAuthenticated,
    portalUrl,
}: PublicOnlineResourcesHubProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyLink = async () => {
        try {
            const shareUrl = window.location.href;
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success("Page link copied");
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error("Could not copy link");
        }
    };

    return (
        <div className="bg-background text-foreground flex min-h-dvh flex-col">
            <Head title={`${headerMeta.title} — ${headerMeta.school_name}`} />

            <a
                href="#online-resources-main"
                className="bg-primary text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md"
            >
                Skip to resources
            </a>

            <header className="border-border/70 bg-card/85 sticky top-0 z-20 border-b backdrop-blur-md">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                            <School className="size-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-tight">{headerMeta.school_name}</p>
                            <p className="text-muted-foreground truncate text-xs">{headerMeta.badge}</p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={copied ? "Page link copied" : "Share this page"}
                            className="min-h-10 gap-1.5 rounded-full text-xs sm:min-h-8"
                            onClick={handleCopyLink}
                        >
                            {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                            <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
                        </Button>

                        {isAuthenticated ? (
                            <Link
                                href={portalUrl || "/student/resources"}
                                className={buttonVariants({ size: "sm", className: "min-h-10 gap-1.5 rounded-full text-xs sm:min-h-8" })}
                            >
                                <ExternalLink className="size-3.5" aria-hidden="true" />
                                Portal
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className={buttonVariants({ size: "sm", variant: "secondary", className: "min-h-10 gap-1.5 rounded-full text-xs sm:min-h-8" })}
                            >
                                <LogIn className="size-3.5" aria-hidden="true" />
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main id="online-resources-main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
                <section className="from-primary/8 via-card to-card border-border/70 relative overflow-hidden rounded-3xl border bg-gradient-to-br p-5 sm:p-7">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="gap-1 rounded-full">
                                    <QrCode className="size-3" />
                                    {headerMeta.badge}
                                </Badge>
                                {headerMeta.school_code && (
                                    <Badge variant="outline" className="rounded-full font-mono text-[11px]">
                                        {headerMeta.school_code}
                                    </Badge>
                                )}
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{headerMeta.title}</h1>
                            {headerMeta.subtitle && (
                                <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">{headerMeta.subtitle}</p>
                            )}
                        </div>

                        {hubUrl && focusedCategoryId !== null && (
                            <a
                                href={hubUrl}
                                className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit gap-1.5 rounded-full" })}
                            >
                                View Full School Directory
                            </a>
                        )}
                    </div>
                </section>

                <ResourceDirectoryView
                    categories={categories}
                    initialCategoryId={focusedCategoryId}
                    emptyTitle="No published resources available"
                    emptyDescription="There are no active resource links visible in this directory right now."
                />
            </main>

            <footer className="border-border/60 text-muted-foreground mt-auto border-t py-4 text-center text-xs">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6">
                    <span>{headerMeta.school_name}</span>
                    <span>Online Resources Hub</span>
                </div>
            </footer>
        </div>
    );
}
