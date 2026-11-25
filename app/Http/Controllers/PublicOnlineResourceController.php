<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Controllers;

use App\Models\Classes;
use App\Models\School;
use App\Models\Scopes\SchoolScope;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Models\OnlineResourceHubSetting;
use Modules\OnlineResources\Models\OnlineResourceLink;
use Modules\OnlineResources\Services\OnlineResourceMediaService;
use Modules\OnlineResources\Services\OnlineResourceQrService;
use Modules\OnlineResources\Services\OnlineResourceScopeRegistry;
use Modules\OnlineResources\Services\OnlineResourceSeoService;
use Modules\OnlineResources\Services\OnlineResourceService;
use Modules\OnlineResources\Services\OnlineResourceThemeService;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

final class PublicOnlineResourceController extends Controller
{
    public function __construct(
        private readonly OnlineResourceScopeRegistry $scopes,
        private readonly OnlineResourceService $service,
        private readonly OnlineResourceQrService $qr,
        private readonly OnlineResourceThemeService $themes,
        private readonly OnlineResourceSeoService $seo,
        private readonly OnlineResourceMediaService $media,
    ) {}

    public function resolve(Request $request, string $shortCode): SymfonyResponse|RedirectResponse
    {
        $category = OnlineResourceCategory::withoutSchoolScope()
            ->where('short_code', $shortCode)
            ->first();

        if ($category instanceof OnlineResourceCategory) {
            return $this->renderCategoryHub($request, $category, incrementScan: true);
        }

        $link = OnlineResourceLink::withoutSchoolScope()
            ->with('category')
            ->where('short_code', $shortCode)
            ->first();

        if ($link instanceof OnlineResourceLink) {
            return $this->redirectToLink($request, $link);
        }

        abort(404);
    }

    public function directory(Request $request, string $schoolCode, ?string $categorySlug = null): SymfonyResponse|RedirectResponse
    {
        if (! class_exists(School::class)) {
            abort(404);
        }

        $school = School::query()
            ->whereRaw('LOWER(code) = ?', [mb_strtolower(mb_trim($schoolCode))])
            ->where('is_active', true)
            ->first();

        if (! $school instanceof School) {
            abort(404);
        }

        return $this->renderOwnerWebsite($request, $school, $categorySlug);
    }

    public function classDirectory(Request $request, int $class, ?string $categorySlug = null): SymfonyResponse|RedirectResponse
    {
        if (! class_exists(Classes::class)) {
            abort(404);
        }

        $classModel = Classes::withoutGlobalScope(SchoolScope::class)
            ->with(['school', 'Faculty', 'Subject', 'SubjectByCodeFallback', 'ShsSubject'])
            ->find($class);

        if (! $classModel instanceof Classes) {
            abort(404);
        }

        return $this->renderOwnerWebsite($request, $classModel, $categorySlug);
    }

    public function sitemap(): HttpResponse
    {
        $entries = [];

        if (class_exists(School::class)) {
            $schools = School::query()
                ->where('is_active', true)
                ->get(['id', 'code', 'updated_at']);

            $hubSettingsBySchool = OnlineResourceHubSetting::withoutSchoolScope()
                ->where('owner_type', 'school')
                ->whereIn('owner_id', $schools->pluck('id'))
                ->get()
                ->keyBy('owner_id');

            foreach ($schools as $school) {
                /** @var OnlineResourceHubSetting|null $setting */
                $setting = $hubSettingsBySchool->get($school->id);
                $isPublished = $setting instanceof OnlineResourceHubSetting ? $setting->is_published : true;
                $visibility = $setting instanceof OnlineResourceHubSetting ? $setting->visibility : OnlineResourceVisibility::Public;
                $seoConfig = is_array($setting?->seo_config) ? $setting->seo_config : [];
                $hubAllowsIndex = (bool) ($seoConfig['robots_index'] ?? true);

                if (! $isPublished || $visibility !== OnlineResourceVisibility::Public) {
                    continue;
                }

                $publicCategories = OnlineResourceCategory::withoutSchoolScope()
                    ->where('school_id', $school->id)
                    ->forOwner('school', (int) $school->id)
                    ->active()
                    ->where('visibility', OnlineResourceVisibility::Public->value)
                    ->ordered()
                    ->get();

                if ($hubAllowsIndex && $publicCategories->isNotEmpty()) {
                    $entries[] = [
                        'loc' => $this->qr->schoolHubUrl($school),
                        'lastmod' => ($setting?->updated_at ?? $school->updated_at ?? now())->toAtomString(),
                        'priority' => '0.8',
                    ];
                }

                foreach ($publicCategories as $category) {
                    $catSeo = is_array($category->seo_config) ? $category->seo_config : [];
                    $catAllowsIndex = array_key_exists('robots_index', $catSeo)
                        ? (bool) $catSeo['robots_index']
                        : $hubAllowsIndex;

                    if (! $catAllowsIndex) {
                        continue;
                    }

                    $entries[] = [
                        'loc' => $this->qr->categoryPageUrl($category, $school),
                        'lastmod' => ($category->updated_at ?? now())->toAtomString(),
                        'priority' => '0.7',
                    ];
                }
            }
        }

        $xmlLines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ];

        foreach ($entries as $entry) {
            $loc = htmlspecialchars($entry['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $lastmod = htmlspecialchars($entry['lastmod'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $priority = htmlspecialchars($entry['priority'], ENT_XML1 | ENT_QUOTES, 'UTF-8');

            $xmlLines[] = "  <url><loc>{$loc}</loc><lastmod>{$lastmod}</lastmod><priority>{$priority}</priority></url>";
        }

        $xmlLines[] = '</urlset>';

        return response(implode("\n", $xmlLines)."\n", 200, [
            'Content-Type' => 'application/xml; charset=utf-8',
            'Cache-Control' => 'public, max-age=300',
        ]);
    }

    public function go(Request $request, string $shortCode): RedirectResponse
    {
        $link = OnlineResourceLink::withoutSchoolScope()
            ->with('category')
            ->where('short_code', $shortCode)
            ->first();

        if (! $link instanceof OnlineResourceLink) {
            abort(404);
        }

        return $this->redirectToLink($request, $link);
    }

    public function reportBroken(Request $request, string $shortCode): JsonResponse
    {
        $link = OnlineResourceLink::withoutSchoolScope()
            ->with('category')
            ->where('short_code', $shortCode)
            ->first();

        if (! $link instanceof OnlineResourceLink) {
            abort(404);
        }

        $category = $link->category;

        if (! $link->is_active || ! $category instanceof OnlineResourceCategory || ! $category->is_active) {
            abort(404);
        }

        $owner = $this->scopes->resolveOwner($category);
        if ($owner === null) {
            abort(404);
        }

        $handler = $this->scopes->forCategory($category);
        if (! $handler->isEnabledForOwner($owner)) {
            abort(404);
        }

        $user = $request->user();
        $viewer = $user instanceof Authenticatable ? $user : null;

        if (! $handler->canView($viewer, $owner, $category)) {
            abort(403, 'You do not have permission to report this resource link.');
        }

        OnlineResourceLink::withoutSchoolScope()
            ->whereKey($link->id)
            ->increment('broken_report_count', 1, [
                'last_reported_broken_at' => now(),
            ]);

        return response()->json([
            'reported' => true,
            'broken_report_count' => (int) ($link->fresh()?->broken_report_count ?? ($link->broken_report_count + 1)),
        ]);
    }

    private function renderOwnerWebsite(
        Request $request,
        Model $owner,
        ?string $categorySlug = null,
    ): SymfonyResponse|RedirectResponse {
        $handler = $this->scopes->forModel($owner);
        if (! $handler->isEnabledForOwner($owner)) {
            abort(404);
        }

        $user = $request->user();
        $viewer = $user instanceof Authenticatable ? $user : null;

        $hubSetting = $this->themes->forOwner($owner);
        $schoolFallback = $this->themes->schoolFallbackForOwner($owner);
        $isPublished = $hubSetting instanceof OnlineResourceHubSetting ? $hubSetting->is_published : true;
        $hubVisibility = $hubSetting instanceof OnlineResourceHubSetting
            ? $hubSetting->visibility
            : OnlineResourceVisibility::Public;

        if (! $isPublished && (! $viewer instanceof Authenticatable || ! $handler->canManage($viewer, $owner))) {
            abort(404);
        }

        if ($categorySlug !== null && $categorySlug !== '') {
            $category = OnlineResourceCategory::withoutSchoolScope()
                ->where('school_id', $handler->schoolIdForOwner($owner))
                ->forOwner($handler->key(), (int) $owner->getKey())
                ->where('slug', $categorySlug)
                ->first();

            if (! $category instanceof OnlineResourceCategory) {
                abort(404);
            }

            return $this->renderCategoryHub($request, $category, incrementScan: false);
        }

        if ($hubVisibility !== OnlineResourceVisibility::Public) {
            if (! $viewer instanceof Authenticatable) {
                return redirect()->guest(route('login'));
            }

            if (! $this->canViewerAccessRestrictedHub($viewer, $owner, $hubVisibility)) {
                abort(403, 'You do not have permission to access this resource hub.');
            }
        }

        $categories = $this->service->visibleCategoriesForOwner($owner, $viewer);
        $headerMeta = $handler->resolveHeaderMeta($owner);
        $serializedHub = $this->themes->serializeHubSetting($owner, $hubSetting, $headerMeta, $schoolFallback);

        $canonicalUrl = $headerMeta['hub_url'] ?? $request->url();
        $isPubliclyVisible = $isPublished && $hubVisibility === OnlineResourceVisibility::Public;

        $seo = $this->seo->buildForHub(
            headerMeta: $headerMeta,
            serializedHub: $serializedHub,
            categories: $categories,
            canonicalUrl: (string) $canonicalUrl,
            currentUrl: $request->url(),
            isPubliclyVisible: $isPubliclyVisible,
        );

        Inertia::share('page_seo', $seo);

        $response = Inertia::render('OnlineResources/Public/Hub', [
            'viewMode' => 'hub',
            'headerMeta' => $headerMeta,
            'hubSettings' => $serializedHub,
            'resolvedDesign' => $serializedHub['design_config'],
            'seo' => $seo,
            'activeCategory' => null,
            'focusedCategoryId' => null,
            'categories' => $categories
                ->map(fn (OnlineResourceCategory $category): array => $this->service->serializeCategory(
                    category: $category,
                    onlyActiveLinks: true,
                    includeAdminMeta: false,
                    owner: $owner,
                ))
                ->values()
                ->all(),
            'hubUrl' => $headerMeta['hub_url'] ?? null,
            'isAuthenticated' => $viewer instanceof Authenticatable,
            'portalUrl' => $viewer instanceof Authenticatable ? $this->resolvePortalUrl($viewer) : null,
        ])->toResponse($request);

        return $this->applyVisibilityHeaders($response, $seo, $isPubliclyVisible, $viewer instanceof Authenticatable);
    }

    private function renderCategoryHub(
        Request $request,
        OnlineResourceCategory $category,
        bool $incrementScan = true,
    ): SymfonyResponse|RedirectResponse {
        if (! $category->is_active) {
            abort(404);
        }

        $owner = $this->scopes->resolveOwner($category);
        if ($owner === null) {
            abort(404);
        }

        $handler = $this->scopes->forCategory($category);
        if (! $handler->isEnabledForOwner($owner)) {
            abort(404);
        }

        $user = $request->user();
        $viewer = $user instanceof Authenticatable ? $user : null;

        $hubSetting = $this->themes->forOwner($owner);
        $schoolFallback = $this->themes->schoolFallbackForOwner($owner);
        $isHubPublished = $hubSetting instanceof OnlineResourceHubSetting ? $hubSetting->is_published : true;

        if (! $isHubPublished && (! $viewer instanceof Authenticatable || ! $handler->canManage($viewer, $owner))) {
            abort(404);
        }

        if (! $handler->canView($viewer, $owner, $category)) {
            if (! $viewer instanceof Authenticatable && $category->visibility !== OnlineResourceVisibility::Public) {
                return redirect()->guest(route('login'));
            }

            abort(403, 'You do not have permission to access this resource category.');
        }

        if ($incrementScan) {
            OnlineResourceCategory::withoutSchoolScope()
                ->whereKey($category->id)
                ->increment('scan_count');
        }

        $visibleSiblings = $this->service->visibleCategoriesForOwner($owner, $viewer);
        if (! $visibleSiblings->contains('id', $category->id)) {
            $category->load('activeLinks');
            $visibleSiblings->prepend($category);
        } else {
            $category = $visibleSiblings->firstWhere('id', $category->id) ?? $category;
        }

        $headerMeta = $handler->resolveHeaderMeta($owner);
        $serializedHub = $this->themes->serializeHubSetting($owner, $hubSetting, $headerMeta, $schoolFallback);
        $resolvedDesign = $this->themes->resolveDesignForCategory($category, $serializedHub['design_config']);

        $hubVisibility = $hubSetting instanceof OnlineResourceHubSetting
            ? $hubSetting->visibility
            : OnlineResourceVisibility::Public;

        $isPubliclyVisible = $isHubPublished
            && $hubVisibility === OnlineResourceVisibility::Public
            && $category->visibility === OnlineResourceVisibility::Public;

        $canonicalUrl = $this->qr->categoryPageUrl($category, $owner);

        $seo = $this->seo->buildForCategory(
            category: $category,
            headerMeta: $headerMeta,
            serializedHub: $serializedHub,
            canonicalUrl: $canonicalUrl,
            currentUrl: $request->url(),
            isPubliclyVisible: $isPubliclyVisible,
        );

        Inertia::share('page_seo', $seo);

        $serializedCategory = $this->service->serializeCategory(
            category: $category,
            onlyActiveLinks: true,
            includeAdminMeta: false,
            owner: $owner,
        );

        $response = Inertia::render('OnlineResources/Public/Hub', [
            'viewMode' => 'category',
            'headerMeta' => $headerMeta,
            'hubSettings' => $serializedHub,
            'resolvedDesign' => $resolvedDesign,
            'seo' => $seo,
            'activeCategory' => $serializedCategory,
            'focusedCategoryId' => $category->id,
            'categories' => $visibleSiblings
                ->map(fn (OnlineResourceCategory $item): array => $this->service->serializeCategory(
                    category: $item,
                    onlyActiveLinks: true,
                    includeAdminMeta: false,
                    owner: $owner,
                ))
                ->values()
                ->all(),
            'hubUrl' => $headerMeta['hub_url'] ?? null,
            'isAuthenticated' => $viewer instanceof Authenticatable,
            'portalUrl' => $viewer instanceof Authenticatable ? $this->resolvePortalUrl($viewer) : null,
        ])->toResponse($request);

        return $this->applyVisibilityHeaders($response, $seo, $isPubliclyVisible, $viewer instanceof Authenticatable);
    }

    private function canViewerAccessRestrictedHub(
        Authenticatable $viewer,
        Model $owner,
        OnlineResourceVisibility $visibility,
    ): bool {
        $handler = $this->scopes->forModel($owner);
        if ($handler->canManage($viewer, $owner)) {
            return true;
        }

        $syntheticCategory = new OnlineResourceCategory([
            'visibility' => $visibility,
            'audience' => 'all',
            'is_active' => true,
        ]);

        return $handler->canView($viewer, $owner, $syntheticCategory);
    }

    /**
     * @param  array<string, mixed>  $seo
     */
    private function applyVisibilityHeaders(
        SymfonyResponse $response,
        array $seo,
        bool $isPubliclyVisible,
        bool $isAuthenticated,
    ): SymfonyResponse {
        $allowIndex = (bool) ($seo['allow_indexing'] ?? false);

        if (! $allowIndex) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        }

        if (! $isPubliclyVisible || $isAuthenticated) {
            $response->headers->set('Cache-Control', 'private, no-store');
        } else {
            $response->headers->set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        }

        return $response;
    }

    private function redirectToLink(Request $request, OnlineResourceLink $link): RedirectResponse
    {
        $category = $link->category;

        if (! $link->is_active || ! $category instanceof OnlineResourceCategory || ! $category->is_active) {
            abort(404);
        }

        $owner = $this->scopes->resolveOwner($category);
        if ($owner === null) {
            abort(404);
        }

        $handler = $this->scopes->forCategory($category);
        if (! $handler->isEnabledForOwner($owner)) {
            abort(404);
        }

        $user = $request->user();
        $viewer = $user instanceof Authenticatable ? $user : null;

        if (! $handler->canView($viewer, $owner, $category)) {
            if (! $viewer instanceof Authenticatable && $category->visibility !== OnlineResourceVisibility::Public) {
                return redirect()->guest(route('login'));
            }

            abort(403, 'You do not have permission to open this resource link.');
        }

        if (! OnlineResourceService::isSafeHttpUrl($link->url)) {
            abort(404);
        }

        OnlineResourceLink::withoutSchoolScope()
            ->whereKey($link->id)
            ->increment('click_count', 1, [
                'last_clicked_at' => now(),
            ]);

        return redirect()
            ->away($link->url)
            ->header('Referrer-Policy', 'no-referrer');
    }

    private function resolvePortalUrl(Authenticatable $viewer): string
    {
        if (method_exists($viewer, 'isStudentRole') && (bool) $viewer->isStudentRole()) {
            return '/student/resources';
        }

        if (method_exists($viewer, 'isFaculty') && (bool) $viewer->isFaculty()) {
            return '/faculty/dashboard';
        }

        if (
            (method_exists($viewer, 'isAdministrative') && (bool) $viewer->isAdministrative())
            || (bool) ($viewer->is_super_admin ?? false)
        ) {
            return '/administrators/online-resources';
        }

        return '/dashboard';
    }
}
