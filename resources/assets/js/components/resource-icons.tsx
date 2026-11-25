import {
    BookOpen,
    Briefcase,
    Calendar,
    Code2,
    Compass,
    FileText,
    FolderOpen,
    Globe,
    GraduationCap,
    HelpCircle,
    Laptop,
    Library,
    Link2,
    Sparkles,
    Video,
    Wifi,
} from "lucide-react";
import type { ComponentType } from "react";

export interface ResourceIconOption {
    value: string;
    label: string;
    Icon: ComponentType<{ className?: string }>;
}

export const RESOURCE_ICON_OPTIONS: ResourceIconOption[] = [
    { value: "link", label: "Link", Icon: Link2 },
    { value: "book", label: "Books / Study", Icon: BookOpen },
    { value: "library", label: "Library", Icon: Library },
    { value: "graduation", label: "Academics", Icon: GraduationCap },
    { value: "laptop", label: "Portals / LMS", Icon: Laptop },
    { value: "document", label: "Forms & Guides", Icon: FileText },
    { value: "folder", label: "Files / Drives", Icon: FolderOpen },
    { value: "video", label: "Lectures & Media", Icon: Video },
    { value: "code", label: "Labs & Code", Icon: Code2 },
    { value: "calendar", label: "Schedules", Icon: Calendar },
    { value: "globe", label: "Web Resources", Icon: Globe },
    { value: "wifi", label: "Campus IT", Icon: Wifi },
    { value: "briefcase", label: "Careers", Icon: Briefcase },
    { value: "compass", label: "Orientation", Icon: Compass },
    { value: "help", label: "Support & FAQ", Icon: HelpCircle },
    { value: "sparkles", label: "Featured", Icon: Sparkles },
];

export const RESOURCE_ACCENT_OPTIONS = [
    {
        value: "blue",
        label: "Blue",
        swatch: "bg-blue-500",
        pill: "bg-blue-500/12 text-blue-700 border-blue-500/25 dark:bg-blue-500/20 dark:text-blue-300",
        iconBg: "bg-blue-500/12 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
        ring: "ring-blue-500/30",
    },
    {
        value: "emerald",
        label: "Emerald",
        swatch: "bg-emerald-500",
        pill: "bg-emerald-500/12 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-300",
        iconBg: "bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
        ring: "ring-emerald-500/30",
    },
    {
        value: "amber",
        label: "Amber",
        swatch: "bg-amber-500",
        pill: "bg-amber-500/12 text-amber-700 border-amber-500/25 dark:bg-amber-500/20 dark:text-amber-300",
        iconBg: "bg-amber-500/12 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
        ring: "ring-amber-500/30",
    },
    {
        value: "violet",
        label: "Violet",
        swatch: "bg-violet-500",
        pill: "bg-violet-500/12 text-violet-700 border-violet-500/25 dark:bg-violet-500/20 dark:text-violet-300",
        iconBg: "bg-violet-500/12 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
        ring: "ring-violet-500/30",
    },
    {
        value: "rose",
        label: "Rose",
        swatch: "bg-rose-500",
        pill: "bg-rose-500/12 text-rose-700 border-rose-500/25 dark:bg-rose-500/20 dark:text-rose-300",
        iconBg: "bg-rose-500/12 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
        ring: "ring-rose-500/30",
    },
    {
        value: "cyan",
        label: "Cyan",
        swatch: "bg-cyan-500",
        pill: "bg-cyan-500/12 text-cyan-700 border-cyan-500/25 dark:bg-cyan-500/20 dark:text-cyan-300",
        iconBg: "bg-cyan-500/12 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300",
        ring: "ring-cyan-500/30",
    },
    {
        value: "orange",
        label: "Orange",
        swatch: "bg-orange-500",
        pill: "bg-orange-500/12 text-orange-700 border-orange-500/25 dark:bg-orange-500/20 dark:text-orange-300",
        iconBg: "bg-orange-500/12 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300",
        ring: "ring-orange-500/30",
    },
    {
        value: "slate",
        label: "Slate",
        swatch: "bg-slate-500",
        pill: "bg-slate-500/12 text-slate-700 border-slate-500/25 dark:bg-slate-500/20 dark:text-slate-300",
        iconBg: "bg-slate-500/12 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
        ring: "ring-slate-500/30",
    },
] as const;

export function getResourceIcon(iconName?: string | null): ComponentType<{ className?: string }> {
    const match = RESOURCE_ICON_OPTIONS.find((item) => item.value === iconName);
    return match ? match.Icon : Link2;
}

export function getResourceAccent(accent?: string | null) {
    return RESOURCE_ACCENT_OPTIONS.find((item) => item.value === accent) ?? RESOURCE_ACCENT_OPTIONS[0];
}

export function inferResourceIconFromUrl(rawUrl: string): string | null {
    try {
        const parsed = new URL(rawUrl.trim());
        const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
        const path = parsed.pathname.toLowerCase();

        if (
            host === "youtube.com" ||
            host === "m.youtube.com" ||
            host === "youtu.be" ||
            host === "vimeo.com" ||
            host === "loom.com" ||
            host === "meet.google.com" ||
            host.endsWith(".zoom.us") ||
            host === "zoom.us"
        ) {
            return "video";
        }

        if (
            host === "github.com" ||
            host === "gitlab.com" ||
            host === "codepen.io" ||
            host === "replit.com" ||
            host === "codesandbox.io" ||
            host === "stackoverflow.com"
        ) {
            return "code";
        }

        if (host === "drive.google.com" || host === "dropbox.com" || host === "onedrive.live.com") {
            return "folder";
        }

        if (host === "scholar.google.com" || host === "jstor.org" || host === "arxiv.org" || host.endsWith("wikipedia.org")) {
            return "book";
        }

        if (host === "calendar.google.com" || host === "calendly.com") {
            return "calendar";
        }

        if (host === "classroom.google.com" || host === "khanacademy.org" || host === "coursera.org" || host === "edx.org") {
            return "graduation";
        }

        if (
            host === "docs.google.com" ||
            host === "forms.gle" ||
            /\.(pdf|docx?|pptx?|xlsx?|csv|txt|md)$/i.test(path)
        ) {
            return "document";
        }

        return null;
    } catch {
        return null;
    }
}
