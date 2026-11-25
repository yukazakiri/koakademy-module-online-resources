import { ResourceDirectoryView } from "../components/resource-directory-view";
import type { OnlineResourceCategoryItem } from "../types";

interface StudentResourcesTabProps {
    categories: OnlineResourceCategoryItem[];
}

export function StudentResourcesTab({ categories }: StudentResourcesTabProps) {
    const ownerId = categories[0]?.owner_id;

    return (
        <div className="space-y-4">
            <ResourceDirectoryView
                categories={categories}
                storageKey={ownerId ? `student-class:${ownerId}` : undefined}
                emptyTitle="No class resources posted yet"
                emptyDescription="When your instructor shares categorized websites, slides, or reference links for this class, they will appear here."
            />
        </div>
    );
}
