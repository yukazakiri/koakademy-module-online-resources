<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Controllers;

use App\Models\School;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Models\OnlineResourceLink;
use Modules\OnlineResources\Services\OnlineResourceQrService;
use Modules\OnlineResources\Services\OnlineResourceScopeRegistry;
use Modules\OnlineResources\Services\OnlineResourceService;

final class PublicOnlineResourceController extends Controller
{
    public function __construct(
        private readonly OnlineResourceScopeRegistry $scopes,
        private readonly OnlineResourceService $service,
        private readonly OnlineResourceQrService $qr,
    ) {}

    public function resolve(Request $request, string $shortCode): Response|RedirectResponse
    {
        $category = OnlineResourceCategory::withoutSchoolScope()
            ->where('short_code', $shortCode)
            ->first();

        if ($category instanceof OnlineResourceCategory) {
            return $this->renderCategoryHub($request, $category);
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

    public function directory(Request $request, string $schoolCode, ?string $categorySlug = null): Response
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

        $user = $request->user();
        $viewer = $user instanceof Authenticatable ? $user : null;

        $categories = $this->service->visibleCategoriesForOwner($school, $viewer);
        $selectedCategory = null;

        if ($categorySlug !== null && $categorySlug !== '') {
            $selectedCategory = $categories->firstWhere('slug', $categorySlug);
            if (! $selectedCategory instanceof OnlineResourceCategory) {
                abort(404);
            }
        }

        $headerMeta = $this->scopes->forModel($school)->resolveHeaderMeta($school);

        return Inertia::render('OnlineResources/Public/Hub', [
            'headerMeta' => $headerMeta,
            'focusedCategoryId' => $selectedCategory?->id,
            'categories' => $categories
                ->map(fn (OnlineResourceCategory $category): array => $this->service->serializeCategory(
                    category: $category,
                    onlyActiveLinks: true,
                    includeAdminMeta: false,
                ))
                ->values()
                ->all(),
            'hubUrl' => $this->qr->schoolHubUrl($school),
            'isAuthenticated' => $viewer instanceof Authenticatable,
            'portalUrl' => $viewer instanceof Authenticatable ? $this->resolvePortalUrl($viewer) : null,
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

    private function renderCategoryHub(Request $request, OnlineResourceCategory $category): Response|RedirectResponse
    {
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

        if (! $handler->canView($viewer, $owner, $category)) {
            if (! $viewer instanceof Authenticatable && $category->visibility !== OnlineResourceVisibility::Public) {
                return redirect()->guest(route('login'));
            }

            abort(403, 'You do not have permission to access this resource category.');
        }

        OnlineResourceCategory::withoutSchoolScope()
            ->whereKey($category->id)
            ->increment('scan_count');

        $visibleSiblings = $this->service->visibleCategoriesForOwner($owner, $viewer);
        if (! $visibleSiblings->contains('id', $category->id)) {
            $category->load('activeLinks');
            $visibleSiblings->prepend($category);
        }

        $headerMeta = $handler->resolveHeaderMeta($owner);

        return Inertia::render('OnlineResources/Public/Hub', [
            'headerMeta' => $headerMeta,
            'focusedCategoryId' => $category->id,
            'categories' => $visibleSiblings
                ->map(fn (OnlineResourceCategory $item): array => $this->service->serializeCategory(
                    category: $item,
                    onlyActiveLinks: true,
                    includeAdminMeta: false,
                ))
                ->values()
                ->all(),
            'hubUrl' => $headerMeta['hub_url'],
            'isAuthenticated' => $viewer instanceof Authenticatable,
            'portalUrl' => $viewer instanceof Authenticatable ? $this->resolvePortalUrl($viewer) : null,
        ]);
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
