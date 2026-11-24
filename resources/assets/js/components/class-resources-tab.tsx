import { ResourceHubManager } from "../components/resource-hub-manager";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CopyableClassOption, OnlineResourceCategoryItem } from "../types";
import { router } from "@inertiajs/react";
import { Copy, EyeOff, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface ClassResourcesTabProps {
    classId: number;
    categories: OnlineResourceCategoryItem[];
    copyableClasses?: CopyableClassOption[];
    enableOnlineResources: boolean;
    onOpenSettings?: () => void;
}

export function ClassResourcesTab({
    classId,
    categories,
    copyableClasses = [],
    enableOnlineResources,
    onOpenSettings,
}: ClassResourcesTabProps) {
    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [sourceClassId, setSourceClassId] = useState<string>("");
    const [copying, setCopying] = useState(false);

    const endpoints = useMemo(
        () => ({
            storeCategory: `/faculty/classes/${classId}/resources/categories`,
            updateCategory: (categoryId: number) => `/faculty/classes/${classId}/resources/categories/${categoryId}`,
            destroyCategory: (categoryId: number) => `/faculty/classes/${classId}/resources/categories/${categoryId}`,
            reorderCategories: `/faculty/classes/${classId}/resources/categories/reorder`,
            storeLink: (categoryId: number) => `/faculty/classes/${classId}/resources/categories/${categoryId}/links`,
            updateLink: (linkId: number) => `/faculty/classes/${classId}/resources/links/${linkId}`,
            destroyLink: (linkId: number) => `/faculty/classes/${classId}/resources/links/${linkId}`,
            reorderLinks: (categoryId: number) => `/faculty/classes/${classId}/resources/categories/${categoryId}/links/reorder`,
            fetchLinkMetadata: `/faculty/classes/${classId}/resources/links/metadata`,
        }),
        [classId],
    );

    const handleCopyFromClass = (event: React.FormEvent) => {
        event.preventDefault();
        if (!sourceClassId) return;
        setCopying(true);

        router.post(
            `/faculty/classes/${classId}/resources/copy-from-class`,
            { source_class_id: Number(sourceClassId) },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCopyDialogOpen(false);
                    setSourceClassId("");
                    toast.success("Class resources copied");
                },
                onError: (errors: Record<string, string>) => {
                    toast.error(Object.values(errors)[0] || "Could not copy class resources");
                },
                onFinish: () => setCopying(false),
            },
        );
    };

    return (
        <div className="space-y-4">
            {!enableOnlineResources && (
                <div className="border-amber-500/35 bg-amber-500/10 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <EyeOff className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                Class Online Resources are currently turned off for students
                            </p>
                            <p className="text-xs text-amber-800/85 dark:text-amber-300/85">
                                You can keep preparing categories and links here, but students and QR codes will not be accessible until you re-enable Online Resources in Class Settings.
                            </p>
                        </div>
                    </div>
                    {onOpenSettings && (
                        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-xl" onClick={onOpenSettings}>
                            <Settings2 className="size-3.5" />
                            Open Class Settings
                        </Button>
                    )}
                </div>
            )}

            <ResourceHubManager
                scope="class"
                categories={categories}
                canManage
                endpoints={endpoints}
                emptyStateTitle="No class online resources yet"
                emptyStateDescription="Group lecture slides, reading links, lab repositories, or study tools into categories and project a permanent QR code for your class."
                headerActions={
                    copyableClasses.length > 0 ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 rounded-xl"
                            onClick={() => setCopyDialogOpen(true)}
                        >
                            <Copy className="size-3.5" />
                            Copy from Class
                        </Button>
                    ) : null
                }
            />

            <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Copy Resources from Another Class</DialogTitle>
                        <DialogDescription>
                            Duplicate categories and links from one of your other classes. Fresh QR codes are automatically generated for this class.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCopyFromClass} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Source Class</Label>
                            <Select value={sourceClassId} onValueChange={setSourceClassId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a class to copy from..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {copyableClasses.map((option) => (
                                        <SelectItem key={option.id} value={String(option.id)}>
                                            {option.label} {option.term ? `(${option.term})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCopyDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={copying || !sourceClassId}>
                                {copying ? "Copying..." : "Copy Resources"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
