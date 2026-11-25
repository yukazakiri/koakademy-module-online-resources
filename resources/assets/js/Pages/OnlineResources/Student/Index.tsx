import { ResourceDirectoryView } from "../../../components/resource-directory-view";
import StudentLayout from "@/components/student/student-layout";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OnlineResourceCategoryItem, StudentClassResourceGroup } from "../../../types";
import { Head, Link } from "@inertiajs/react";
import { ArrowRight, BookOpen, ExternalLink, Globe, QrCode, School } from "lucide-react";
import { useMemo } from "react";

interface StudentResourcesPageProps {
    user: {
        name: string;
        email: string;
        avatar: string | null;
        role: string;
    };
    school: {
        id: number;
        name: string;
        code: string;
        hub_url: string;
    } | null;
    schoolCategories: OnlineResourceCategoryItem[];
    classGroups: StudentClassResourceGroup[];
}

export default function StudentOnlineResourcesIndex({
    user,
    school,
    schoolCategories,
    classGroups,
}: StudentResourcesPageProps) {
    const schoolLinkCount = useMemo(
        () => schoolCategories.reduce((sum, category) => sum + category.links.length, 0),
        [schoolCategories],
    );

    const classLinkCount = useMemo(
        () =>
            classGroups.reduce(
                (groupSum, group) =>
                    groupSum + group.categories.reduce((catSum, category) => catSum + category.links.length, 0),
                0,
            ),
        [classGroups],
    );

    const defaultTab = schoolCategories.length === 0 && classGroups.length > 0 ? "classes" : "school";

    return (
        <StudentLayout user={user}>
            <Head title="Online Resources" />

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 pb-20 sm:px-6">
                <header className="border-border/70 bg-card flex flex-col gap-4 rounded-2xl border p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="gap-1 rounded-full">
                                <QrCode className="size-3" />
                                Quick Access Hub
                            </Badge>
                            {school && (
                                <Badge variant="outline" className="rounded-full text-[11px]">
                                    {school.name}
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Online Resources</h1>
                        <p className="text-muted-foreground max-w-2xl text-sm">
                            Quickly open curated school links and resources shared by your instructors across all of your enrolled classes.
                        </p>
                    </div>

                    {school && (
                        <a
                            href={school.hub_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit gap-1.5 rounded-xl" })}
                        >
                            <ExternalLink className="size-4" />
                            Public School Hub
                        </a>
                    )}
                </header>

                <Tabs defaultValue={defaultTab} className="w-full space-y-5">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="school" className="gap-2">
                            <School className="size-4" />
                            <span>School Resources</span>
                            <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px] tabular-nums">
                                {schoolLinkCount}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="classes" className="gap-2">
                            <BookOpen className="size-4" />
                            <span>My Classes</span>
                            <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px] tabular-nums">
                                {classLinkCount}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="school" className="mt-0">
                        <ResourceDirectoryView
                            categories={schoolCategories}
                            emptyTitle="No school online resources yet"
                            emptyDescription="Your school has not published any online resource categories yet. Check back soon."
                        />
                    </TabsContent>

                    <TabsContent value="classes" className="mt-0 space-y-6">
                        {classGroups.length === 0 ? (
                            <div className="border-border/70 bg-card/60 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
                                <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-2xl">
                                    <Globe className="text-muted-foreground size-5" />
                                </div>
                                <h3 className="text-base font-semibold">No class resources posted yet</h3>
                                <p className="text-muted-foreground mt-1 max-w-md text-sm">
                                    When instructors share categorized links or QR resources inside your enrolled classes, they will appear here automatically.
                                </p>
                            </div>
                        ) : (
                            classGroups.map((group) => (
                                <section
                                    key={group.class_id}
                                    className="border-border/70 bg-card/70 space-y-4 rounded-2xl border p-4 shadow-2xs sm:p-5"
                                >
                                    <div className="border-border/60 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold tracking-tight">{group.title}</h2>
                                            {group.subtitle && (
                                                <p className="text-muted-foreground text-xs sm:text-sm">{group.subtitle}</p>
                                            )}
                                        </div>
                                        <Link
                                            href={group.class_url}
                                            className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit gap-1.5 rounded-xl" })}
                                        >
                                            Open Class
                                            <ArrowRight className="size-3.5" />
                                        </Link>
                                    </div>

                                    <ResourceDirectoryView categories={group.categories} compact />
                                </section>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </StudentLayout>
    );
}
