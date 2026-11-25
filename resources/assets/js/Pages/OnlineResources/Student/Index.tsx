import { ResourceDirectoryView } from "../../../components/resource-directory-view";
import StudentLayout from "@/components/student/student-layout";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OnlineResourceCategoryItem, StudentClassResourceGroup } from "../../../types";
import { Head, Link } from "@inertiajs/react";
import { ArrowRight, BookOpen, ExternalLink, Globe, QrCode, School, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

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

function filterCategoriesByQuery(categories: OnlineResourceCategoryItem[], normalizedQuery: string): OnlineResourceCategoryItem[] {
    if (normalizedQuery === "") return categories;

    return categories
        .map((category) => {
            const categoryMatches =
                category.name.toLowerCase().includes(normalizedQuery) ||
                (category.description ?? "").toLowerCase().includes(normalizedQuery);

            const links = categoryMatches
                ? category.links
                : category.links.filter(
                      (link) =>
                          link.title.toLowerCase().includes(normalizedQuery) ||
                          (link.description ?? "").toLowerCase().includes(normalizedQuery) ||
                          link.host.toLowerCase().includes(normalizedQuery) ||
                          (link.badge_text ?? "").toLowerCase().includes(normalizedQuery),
                  );

            return { ...category, links };
        })
        .filter((category) => category.links.length > 0);
}

export default function StudentOnlineResourcesIndex({
    user,
    school,
    schoolCategories,
    classGroups,
}: StudentResourcesPageProps) {
    const [globalQuery, setGlobalQuery] = useState("");

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

    const normalizedQuery = globalQuery.trim().toLowerCase();
    const isGlobalSearching = normalizedQuery !== "";

    const unifiedResults = useMemo(() => {
        if (!isGlobalSearching) {
            return { school: [] as OnlineResourceCategoryItem[], classes: [] as StudentClassResourceGroup[], totalLinks: 0 };
        }

        const matchedSchool = filterCategoriesByQuery(schoolCategories, normalizedQuery);
        const matchedClasses = classGroups
            .map((group) => {
                const classHeaderMatches =
                    group.title.toLowerCase().includes(normalizedQuery) ||
                    (group.subtitle ?? "").toLowerCase().includes(normalizedQuery);
                const categories = classHeaderMatches ? group.categories : filterCategoriesByQuery(group.categories, normalizedQuery);
                return { ...group, categories };
            })
            .filter((group) => group.categories.length > 0);

        const totalLinks =
            matchedSchool.reduce((sum, cat) => sum + cat.links.length, 0) +
            matchedClasses.reduce(
                (groupSum, group) => groupSum + group.categories.reduce((catSum, cat) => catSum + cat.links.length, 0),
                0,
            );

        return { school: matchedSchool, classes: matchedClasses, totalLinks };
    }, [isGlobalSearching, normalizedQuery, schoolCategories, classGroups]);

    const defaultTab = schoolCategories.length === 0 && classGroups.length > 0 ? "classes" : "school";
    const storageKey = school ? `student:${school.code}` : "student";

    return (
        <StudentLayout user={user}>
            <Head title="Online Resources" />

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 pb-20 sm:px-6">
                <header className="border-border/70 bg-card flex flex-col gap-4 rounded-2xl border p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="gap-1 rounded-full">
                                <QrCode className="size-3" aria-hidden="true" />
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
                            <ExternalLink className="size-4" aria-hidden="true" />
                            Public School Hub
                            <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                    )}
                </header>

                {schoolLinkCount + classLinkCount > 0 && (
                    <div className="relative max-w-xl">
                        <Search
                            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                            aria-hidden="true"
                        />
                        <Input
                            value={globalQuery}
                            onChange={(e) => setGlobalQuery(e.target.value)}
                            aria-label="Search all school and class resources"
                            placeholder="Search across all school & class resources..."
                            className="h-11 rounded-xl pl-10 pr-10"
                        />
                        {globalQuery && (
                            <button
                                type="button"
                                onClick={() => setGlobalQuery("")}
                                aria-label="Clear search"
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-2"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                )}

                {isGlobalSearching ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between gap-2">
                            <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
                                Found <strong className="text-foreground tabular-nums">{unifiedResults.totalLinks}</strong>{" "}
                                {unifiedResults.totalLinks === 1 ? "resource" : "resources"} matching "{globalQuery}"
                            </p>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setGlobalQuery("")}>
                                Clear search
                            </Button>
                        </div>

                        {unifiedResults.totalLinks === 0 ? (
                            <div className="border-border/70 bg-card/50 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center">
                                <Search className="text-muted-foreground mb-2 size-6" aria-hidden="true" />
                                <p className="text-sm font-medium">No school or class resources match "{globalQuery}"</p>
                                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setGlobalQuery("")}>
                                    Clear search
                                </Button>
                            </div>
                        ) : (
                            <>
                                {unifiedResults.school.length > 0 && (
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <School className="text-muted-foreground size-4" aria-hidden="true" />
                                            <h2 className="text-sm font-semibold tracking-wide uppercase">School Resources</h2>
                                        </div>
                                        <ResourceDirectoryView categories={unifiedResults.school} hideToolbar storageKey={storageKey} />
                                    </section>
                                )}

                                {unifiedResults.classes.map((group) => (
                                    <section
                                        key={`search-class-${group.class_id}`}
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
                                                <ArrowRight className="size-3.5" aria-hidden="true" />
                                            </Link>
                                        </div>
                                        <ResourceDirectoryView
                                            categories={group.categories}
                                            compact
                                            hideToolbar
                                            storageKey={`${storageKey}:class:${group.class_id}`}
                                        />
                                    </section>
                                ))}
                            </>
                        )}
                    </div>
                ) : (
                    <Tabs defaultValue={defaultTab} className="w-full space-y-5">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="school" className="gap-2">
                                <School className="size-4" aria-hidden="true" />
                                <span>School Resources</span>
                                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px] tabular-nums">
                                    {schoolLinkCount}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="classes" className="gap-2">
                                <BookOpen className="size-4" aria-hidden="true" />
                                <span>My Classes</span>
                                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px] tabular-nums">
                                    {classLinkCount}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="school" className="mt-0">
                            <ResourceDirectoryView
                                categories={schoolCategories}
                                storageKey={storageKey}
                                emptyTitle="No school online resources yet"
                                emptyDescription="Your school has not published any online resource categories yet. Check back soon."
                            />
                        </TabsContent>

                        <TabsContent value="classes" className="mt-0 space-y-6">
                            {classGroups.length === 0 ? (
                                <div className="border-border/70 bg-card/60 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
                                    <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-2xl">
                                        <Globe className="text-muted-foreground size-5" aria-hidden="true" />
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
                                                <ArrowRight className="size-3.5" aria-hidden="true" />
                                            </Link>
                                        </div>

                                        <ResourceDirectoryView
                                            categories={group.categories}
                                            compact
                                            storageKey={`${storageKey}:class:${group.class_id}`}
                                        />
                                    </section>
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </main>
        </StudentLayout>
    );
}
