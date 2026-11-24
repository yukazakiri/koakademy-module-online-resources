import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { OnlineResourceLinkItem } from "../types";
import axios from "axios";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface LinkFormPayload {
    title: string;
    url: string;
    description: string;
    badge_text: string;
    is_featured: boolean;
    is_active: boolean;
    opens_in_new_tab: boolean;
}

interface ResourceLinkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoryName: string;
    link?: OnlineResourceLinkItem | null;
    metadataUrl?: string;
    submitting: boolean;
    onSubmit: (payload: LinkFormPayload) => void;
}

interface LinkMetadataResponse {
    title?: string | null;
    description?: string | null;
    source?: "page" | "url" | "none";
}

const GENERIC_SEGMENTS = new Set([
    "edit",
    "view",
    "preview",
    "index",
    "home",
    "default",
    "download",
    "watch",
    "open",
    "share",
    "pub",
    "embed",
    "d",
    "u",
    "p",
    "r",
    "s",
]);

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "via"]);

function isFetchableHttpUrl(raw: string): boolean {
    const trimmed = raw.trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;

    try {
        const parsed = new URL(trimmed);
        return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.includes(".");
    } catch {
        return false;
    }
}

function smartTitleCase(text: string): string {
    return text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word, index) => {
            if (/^[A-Z0-9]{2,8}$/.test(word)) {
                return word;
            }
            const lower = word.toLowerCase();
            if (index > 0 && SMALL_WORDS.has(lower)) {
                return lower;
            }
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(" ");
}

function deriveTitleFromUrl(raw: string): string | null {
    try {
        const parsed = new URL(raw.trim());
        const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
        const lowerPath = parsed.pathname.toLowerCase();

        if (host === "docs.google.com") {
            if (lowerPath.startsWith("/document")) return "Google Docs";
            if (lowerPath.startsWith("/spreadsheets")) return "Google Sheets";
            if (lowerPath.startsWith("/presentation")) return "Google Slides";
            if (lowerPath.startsWith("/forms")) return "Google Forms";
            return "Google Docs";
        }

        const knownHosts: Record<string, string> = {
            "drive.google.com": "Google Drive",
            "scholar.google.com": "Google Scholar",
            "classroom.google.com": "Google Classroom",
            "meet.google.com": "Google Meet",
            "forms.gle": "Google Forms",
            "youtube.com": "YouTube",
            "m.youtube.com": "YouTube",
            "youtu.be": "YouTube",
            "khanacademy.org": "Khan Academy",
            "canva.com": "Canva",
            "figma.com": "Figma",
            "notion.so": "Notion",
            "notion.site": "Notion",
            "coursera.org": "Coursera",
            "edx.org": "edX",
        };

        if (knownHosts[host]) {
            return knownHosts[host];
        }

        const segments = parsed.pathname
            .split("/")
            .map((segment) => {
                try {
                    return decodeURIComponent(segment).trim();
                } catch {
                    return segment.trim();
                }
            })
            .filter(Boolean);

        if (host === "github.com" && segments.length >= 2) {
            return `${segments[0]}/${segments[1]} — GitHub`.slice(0, 160);
        }

        for (let i = segments.length - 1; i >= 0; i--) {
            const cleaned = segments[i]
                .replace(/\.(html?|php|aspx?|jsp|pdf|docx?|pptx?|xlsx?|csv|txt|md)$/i, "")
                .trim();

            if (
                !cleaned ||
                GENERIC_SEGMENTS.has(cleaned.toLowerCase()) ||
                /^\d+$/.test(cleaned) ||
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleaned) ||
                (cleaned.length >= 20 && /^[A-Za-z0-9]+$/.test(cleaned))
            ) {
                continue;
            }

            const spaced = cleaned
                .replace(/[-_+]+/g, " ")
                .replace(/([a-z])([A-Z])/g, "$1 $2")
                .replace(/\s+/g, " ")
                .trim();

            if (/[A-Za-z0-9]/.test(spaced)) {
                return smartTitleCase(spaced).slice(0, 160);
            }
        }

        const hostParts = host.split(".");
        if (hostParts.length >= 2) {
            hostParts.pop();
        }
        const hostLabel = hostParts.join(" ").replace(/[-_]+/g, " ").trim();
        return hostLabel ? smartTitleCase(hostLabel).slice(0, 160) : null;
    } catch {
        return null;
    }
}

export function ResourceLinkDialog({
    open,
    onOpenChange,
    categoryName,
    link,
    metadataUrl,
    submitting,
    onSubmit,
}: ResourceLinkDialogProps) {
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [description, setDescription] = useState("");
    const [badgeText, setBadgeText] = useState("");
    const [isFeatured, setIsFeatured] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [opensInNewTab, setOpensInNewTab] = useState(true);

    const [fetchingTitle, setFetchingTitle] = useState(false);
    const [autoFillSource, setAutoFillSource] = useState<"page" | "url" | null>(null);

    const titleManuallyEditedRef = useRef(false);
    const lastFetchedUrlRef = useRef<string>("");
    const abortControllerRef = useRef<AbortController | null>(null);

    const cancelPendingFetch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setFetchingTitle(false);
    }, []);

    useEffect(() => {
        if (!open) {
            cancelPendingFetch();
            return;
        }

        lastFetchedUrlRef.current = "";
        setAutoFillSource(null);
        setFetchingTitle(false);

        if (link) {
            setTitle(link.title);
            setUrl(link.url);
            setDescription(link.description ?? "");
            setBadgeText(link.badge_text ?? "");
            setIsFeatured(link.is_featured);
            setIsActive(link.is_active);
            setOpensInNewTab(link.opens_in_new_tab);
            titleManuallyEditedRef.current = link.title.trim() !== "";
        } else {
            setTitle("");
            setUrl("");
            setDescription("");
            setBadgeText("");
            setIsFeatured(false);
            setIsActive(true);
            setOpensInNewTab(true);
            titleManuallyEditedRef.current = false;
        }
    }, [open, link, cancelPendingFetch]);

    useEffect(() => {
        return () => cancelPendingFetch();
    }, [cancelPendingFetch]);

    const fetchMetadataForUrl = useCallback(
        async (targetUrl: string, force = false) => {
            const trimmedUrl = targetUrl.trim();
            if (!isFetchableHttpUrl(trimmedUrl)) {
                return;
            }

            if (!force && (titleManuallyEditedRef.current || lastFetchedUrlRef.current === trimmedUrl)) {
                return;
            }

            cancelPendingFetch();
            lastFetchedUrlRef.current = trimmedUrl;

            if (!metadataUrl) {
                const fallbackTitle = deriveTitleFromUrl(trimmedUrl);
                if (fallbackTitle && (force || !titleManuallyEditedRef.current)) {
                    setTitle(fallbackTitle);
                    setAutoFillSource("url");
                }
                return;
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;
            setFetchingTitle(true);

            try {
                const response = await axios.post<LinkMetadataResponse>(
                    metadataUrl,
                    { url: trimmedUrl },
                    { signal: controller.signal },
                );

                if (controller.signal.aborted || (!force && titleManuallyEditedRef.current)) {
                    return;
                }

                const resolvedTitle = response.data?.title?.trim() || deriveTitleFromUrl(trimmedUrl);
                if (resolvedTitle) {
                    setTitle(resolvedTitle.slice(0, 160));
                    setAutoFillSource(response.data?.source === "page" ? "page" : "url");
                }
            } catch (error) {
                if (axios.isCancel(error) || controller.signal.aborted) {
                    return;
                }

                if (force || !titleManuallyEditedRef.current) {
                    const fallbackTitle = deriveTitleFromUrl(trimmedUrl);
                    if (fallbackTitle) {
                        setTitle(fallbackTitle);
                        setAutoFillSource("url");
                    }
                }
            } finally {
                if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                    setFetchingTitle(false);
                }
            }
        },
        [cancelPendingFetch, metadataUrl],
    );

    useEffect(() => {
        if (!open || link || titleManuallyEditedRef.current) {
            return;
        }

        const trimmedUrl = url.trim();
        if (!isFetchableHttpUrl(trimmedUrl) || lastFetchedUrlRef.current === trimmedUrl) {
            return;
        }

        const timer = window.setTimeout(() => {
            void fetchMetadataForUrl(trimmedUrl, false);
        }, 450);

        return () => window.clearTimeout(timer);
    }, [open, link, url, fetchMetadataForUrl]);

    const handleUrlPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
        if (link || titleManuallyEditedRef.current) {
            return;
        }

        const pastedText = event.clipboardData.getData("text").trim();
        if (isFetchableHttpUrl(pastedText)) {
            void fetchMetadataForUrl(pastedText, false);
        }
    };

    const handleTitleChange = (value: string) => {
        setTitle(value);
        setAutoFillSource(null);

        if (value.trim() === "") {
            titleManuallyEditedRef.current = false;
        } else {
            titleManuallyEditedRef.current = true;
            cancelPendingFetch();
        }
    };

    const handleManualAutoFill = () => {
        if (!isFetchableHttpUrl(url)) return;
        titleManuallyEditedRef.current = false;
        lastFetchedUrlRef.current = "";
        void fetchMetadataForUrl(url, true);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (title.trim() === "" || url.trim() === "") return;
        onSubmit({
            title: title.trim(),
            url: url.trim(),
            description: description.trim(),
            badge_text: badgeText.trim(),
            is_featured: isFeatured,
            is_active: isActive,
            opens_in_new_tab: opensInNewTab,
        });
    };

    const canAutoFill = isFetchableHttpUrl(url);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{link ? "Edit Resource Link" : "Add Resource Link"}</DialogTitle>
                    <DialogDescription>Category: {categoryName}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="resource-link-url">URL</Label>
                        <Input
                            id="resource-link-url"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onPaste={handleUrlPaste}
                            placeholder="https://..."
                            required
                            maxLength={2048}
                            autoFocus={!link}
                        />
                        <p className="text-muted-foreground text-[11px]">
                            Must start with https:// or http://. Paste a link to auto-fill the title.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="resource-link-title">Title</Label>
                            {fetchingTitle ? (
                                <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                                    <Loader2 className="size-3 animate-spin" />
                                    Fetching title...
                                </span>
                            ) : canAutoFill ? (
                                <button
                                    type="button"
                                    onClick={handleManualAutoFill}
                                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
                                >
                                    <Sparkles className="size-3" />
                                    Auto-fill from URL
                                </button>
                            ) : null}
                        </div>
                        <Input
                            id="resource-link-title"
                            value={title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder={fetchingTitle ? "Detecting title from URL..." : "e.g. Google Scholar, Course Syllabus, LMS Portal"}
                            required
                            maxLength={160}
                        />
                        {autoFillSource && !fetchingTitle && (
                            <p className="text-muted-foreground text-[11px]">
                                {autoFillSource === "page"
                                    ? "Title auto-filled from the page. You can edit it anytime."
                                    : "Title suggested from the URL. You can edit it anytime."}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="resource-link-description">Description</Label>
                            <Textarea
                                id="resource-link-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief note to help students recognize what this link opens."
                                rows={2}
                                maxLength={500}
                            />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="resource-link-badge">Optional Badge Label</Label>
                            <Input
                                id="resource-link-badge"
                                value={badgeText}
                                onChange={(e) => setBadgeText(e.target.value)}
                                placeholder="e.g. Required, PDF, Video, Tool"
                                maxLength={40}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="bg-muted/40 border-border/70 flex items-center justify-between rounded-xl border px-3.5 py-2">
                            <div>
                                <p className="text-sm font-medium">Highlight as Featured</p>
                                <p className="text-muted-foreground text-xs">Draws visual emphasis for essential links.</p>
                            </div>
                            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                        </div>

                        <div className="bg-muted/40 border-border/70 flex items-center justify-between rounded-xl border px-3.5 py-2">
                            <div>
                                <p className="text-sm font-medium">Open in new tab</p>
                                <p className="text-muted-foreground text-xs">Keeps the resource hub open when tapped.</p>
                            </div>
                            <Switch checked={opensInNewTab} onCheckedChange={setOpensInNewTab} />
                        </div>

                        <div className="bg-muted/40 border-border/70 flex items-center justify-between rounded-xl border px-3.5 py-2">
                            <div>
                                <p className="text-sm font-medium">Active</p>
                                <p className="text-muted-foreground text-xs">Hide temporarily without deleting this link.</p>
                            </div>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || title.trim() === "" || url.trim() === ""}>
                            {submitting ? "Saving..." : link ? "Save Changes" : "Add Link"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
