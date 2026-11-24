import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, Download, ExternalLink, FileDown, Maximize2, Minimize2, QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ResourceQrDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    subtitle?: string | null;
    visibilityLabel?: string;
    qrUrl: string;
    svgUrl: string;
    pngUrl: string;
    posterPdfUrl?: string | null;
}

export function ResourceQrDialog({
    open,
    onOpenChange,
    title,
    subtitle,
    visibilityLabel,
    qrUrl,
    svgUrl,
    pngUrl,
    posterPdfUrl,
}: ResourceQrDialogProps) {
    const [copied, setCopied] = useState(false);
    const [projectorMode, setProjectorMode] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(qrUrl);
            setCopied(true);
            toast.success("QR link copied to clipboard");
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error("Could not copy link");
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) setProjectorMode(false);
                onOpenChange(nextOpen);
            }}
        >
            <DialogContent
                className={
                    projectorMode
                        ? "flex h-[96dvh] w-[96vw] max-w-none flex-col items-center justify-center gap-6 p-8 text-center"
                        : "sm:max-w-md"
                }
            >
                <DialogHeader className={projectorMode ? "items-center text-center" : undefined}>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="gap-1 rounded-full">
                            <QrCode className="size-3" />
                            Permanent QR Code
                        </Badge>
                        {visibilityLabel && (
                            <Badge variant="outline" className="rounded-full text-[11px]">
                                {visibilityLabel}
                            </Badge>
                        )}
                    </div>
                    <DialogTitle className={projectorMode ? "text-3xl font-bold" : "text-lg"}>{title}</DialogTitle>
                    {subtitle && (
                        <DialogDescription className={projectorMode ? "max-w-xl text-base" : undefined}>
                            {subtitle}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-2">
                    <div className="border-border/80 rounded-2xl border bg-white p-4 shadow-sm">
                        <img
                            src={svgUrl}
                            alt={`QR code for ${title}`}
                            className={projectorMode ? "size-80 sm:size-96" : "size-56"}
                        />
                    </div>

                    <div className="bg-muted/60 border-border/70 flex w-full max-w-md items-center gap-2 rounded-xl border px-3 py-2">
                        <code className="flex-1 truncate font-mono text-xs">{qrUrl}</code>
                        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={handleCopy}>
                            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                            {copied ? "Copied" : "Copy"}
                        </Button>
                    </div>

                    <p className="text-muted-foreground max-w-sm text-center text-xs">
                        You can rename this category or update its links anytime without reprinting or replacing this QR code.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {posterPdfUrl && (
                            <a
                                href={posterPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ size: "sm", className: "flex-1 gap-1.5 sm:flex-none" })}
                            >
                                <FileDown className="size-3.5" />
                                Printable Poster (PDF)
                            </a>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5 sm:flex-none"
                            onClick={() => setProjectorMode((prev) => !prev)}
                        >
                            {projectorMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                            {projectorMode ? "Exit Projector View" : "Project Fullscreen"}
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <a href={pngUrl} download className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}>
                            <Download className="size-3.5" />
                            PNG
                        </a>

                        <a href={svgUrl} download className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}>
                            <Download className="size-3.5" />
                            SVG
                        </a>

                        <a
                            href={qrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5" })}
                        >
                            <ExternalLink className="size-3.5" />
                            Preview Page
                        </a>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
