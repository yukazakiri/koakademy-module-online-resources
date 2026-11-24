import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { OnlineResourceLinkItem } from "../types";
import { useEffect, useState } from "react";

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
    submitting: boolean;
    onSubmit: (payload: LinkFormPayload) => void;
}

export function ResourceLinkDialog({
    open,
    onOpenChange,
    categoryName,
    link,
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

    useEffect(() => {
        if (!open) return;
        if (link) {
            setTitle(link.title);
            setUrl(link.url);
            setDescription(link.description ?? "");
            setBadgeText(link.badge_text ?? "");
            setIsFeatured(link.is_featured);
            setIsActive(link.is_active);
            setOpensInNewTab(link.opens_in_new_tab);
        } else {
            setTitle("");
            setUrl("");
            setDescription("");
            setBadgeText("");
            setIsFeatured(false);
            setIsActive(true);
            setOpensInNewTab(true);
        }
    }, [open, link]);

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{link ? "Edit Resource Link" : "Add Resource Link"}</DialogTitle>
                    <DialogDescription>Category: {categoryName}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="resource-link-title">Title</Label>
                        <Input
                            id="resource-link-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Google Scholar, Course Syllabus, LMS Portal"
                            required
                            maxLength={160}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="resource-link-url">URL</Label>
                        <Input
                            id="resource-link-url"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://..."
                            required
                            maxLength={2048}
                        />
                        <p className="text-muted-foreground text-[11px]">Must start with https:// or http://.</p>
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
