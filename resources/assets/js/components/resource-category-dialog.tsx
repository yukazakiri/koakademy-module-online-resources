import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
    OnlineResourceAudience,
    OnlineResourceCategoryItem,
    OnlineResourceScope,
    OnlineResourceVisibility,
} from "../types";
import { useEffect, useState } from "react";
import { RESOURCE_ACCENT_OPTIONS, RESOURCE_ICON_OPTIONS } from "./resource-icons";

export interface CategoryFormPayload {
    name: string;
    description: string;
    icon: string;
    accent_color: string;
    visibility: OnlineResourceVisibility;
    audience: OnlineResourceAudience;
    is_active: boolean;
}

interface ResourceCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scope: OnlineResourceScope;
    category?: OnlineResourceCategoryItem | null;
    submitting: boolean;
    onSubmit: (payload: CategoryFormPayload) => void;
}

export function ResourceCategoryDialog({
    open,
    onOpenChange,
    scope,
    category,
    submitting,
    onSubmit,
}: ResourceCategoryDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [icon, setIcon] = useState("link");
    const [accentColor, setAccentColor] = useState("blue");
    const [visibility, setVisibility] = useState<OnlineResourceVisibility>("public");
    const [audience, setAudience] = useState<OnlineResourceAudience>("all");
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (!open) return;
        if (category) {
            setName(category.name);
            setDescription(category.description ?? "");
            setIcon(category.icon || "link");
            setAccentColor(category.accent_color || "blue");
            setVisibility(category.visibility);
            setAudience(category.audience);
            setIsActive(category.is_active);
        } else {
            setName("");
            setDescription("");
            setIcon(scope === "class" ? "book" : "library");
            setAccentColor("blue");
            setVisibility("public");
            setAudience("all");
            setIsActive(true);
        }
    }, [open, category, scope]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (name.trim() === "") return;
        onSubmit({
            name: name.trim(),
            description: description.trim(),
            icon,
            accent_color: accentColor,
            visibility,
            audience,
            is_active: isActive,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{category ? "Edit Category" : "New Resource Category"}</DialogTitle>
                    <DialogDescription>
                        {scope === "class"
                            ? "Group class materials, slides, tools, or reading links under a scannable QR code."
                            : "Create a category with its own permanent QR code so students can access links quickly."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="resource-category-name">Category Name</Label>
                        <Input
                            id="resource-category-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={scope === "class" ? "e.g. Week 1–4 Lecture Slides" : "e.g. Library & Research Databases"}
                            required
                            maxLength={120}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="resource-category-description">Short Description</Label>
                        <Textarea
                            id="resource-category-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional context shown on the QR landing page and printable poster."
                            rows={2}
                            maxLength={500}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>QR Access Visibility</Label>
                            <Select value={visibility} onValueChange={(value) => setVisibility(value as OnlineResourceVisibility)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">Public (Instant QR Access)</SelectItem>
                                    {scope === "class" && (
                                        <SelectItem value="enrolled_only">Enrolled Students Only</SelectItem>
                                    )}
                                    <SelectItem value="authenticated">Signed-in Users Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {scope === "school" && (
                            <div className="space-y-2">
                                <Label>Target Audience</Label>
                                <Select value={audience} onValueChange={(value) => setAudience(value as OnlineResourceAudience)}>
                                    <SelectTrigger>
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
                        <Label>Icon</Label>
                        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                            {RESOURCE_ICON_OPTIONS.map((option) => {
                                const Icon = option.Icon;
                                const selected = icon === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        title={option.label}
                                        onClick={() => setIcon(option.value)}
                                        className={cn(
                                            "flex h-9 items-center justify-center rounded-lg border transition-colors",
                                            selected
                                                ? "border-primary bg-primary/12 text-primary"
                                                : "border-border/70 bg-background hover:bg-muted text-muted-foreground",
                                        )}
                                    >
                                        <Icon className="size-4" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Accent Color</Label>
                        <div className="flex flex-wrap gap-2">
                            {RESOURCE_ACCENT_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    title={option.label}
                                    onClick={() => setAccentColor(option.value)}
                                    className={cn(
                                        "size-7 rounded-full border-2 transition-transform",
                                        option.swatch,
                                        accentColor === option.value
                                            ? "border-foreground scale-110 ring-2 ring-foreground/20"
                                            : "border-transparent hover:scale-105",
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="bg-muted/40 border-border/70 flex items-center justify-between rounded-xl border px-3.5 py-2.5">
                        <div>
                            <p className="text-sm font-medium">Published & scannable</p>
                            <p className="text-muted-foreground text-xs">Inactive categories are hidden from students and QR scans.</p>
                        </div>
                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                    </div>

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
