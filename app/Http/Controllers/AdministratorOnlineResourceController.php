<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Controllers;

use App\Models\School;
use App\Models\Scopes\SchoolScope;
use App\Models\User;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Modules\OnlineResources\Http\Requests\FetchOnlineResourceMetadataRequest;
use Modules\OnlineResources\Http\Requests\ReorderOnlineResourcesRequest;
use Modules\OnlineResources\Http\Requests\StoreOnlineResourceCategoryRequest;
use Modules\OnlineResources\Http\Requests\StoreOnlineResourceLinkRequest;
use Modules\OnlineResources\Http\Requests\UpdateOnlineResourceCategoryRequest;
use Modules\OnlineResources\Http\Requests\UpdateOnlineResourceHubSettingRequest;
use Modules\OnlineResources\Http\Requests\UpdateOnlineResourceLinkRequest;
use Modules\OnlineResources\Http\Requests\UploadOnlineResourceMediaRequest;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Models\OnlineResourceLink;
use Modules\OnlineResources\Services\OnlineResourceMediaService;
use Modules\OnlineResources\Services\OnlineResourceMetadataService;
use Modules\OnlineResources\Services\OnlineResourceQrService;
use Modules\OnlineResources\Services\OnlineResourceScopeRegistry;
use Modules\OnlineResources\Services\OnlineResourceService;
use Modules\OnlineResources\Services\OnlineResourceThemeService;
use Spatie\LaravelPdf\PdfBuilder;

final class AdministratorOnlineResourceController extends Controller
{
    public function __construct(
        private readonly OnlineResourceService $service,
        private readonly OnlineResourceQrService $qr,
        private readonly OnlineResourceScopeRegistry $scopes,
        private readonly TenantContext $tenantContext,
        private readonly OnlineResourceMetadataService $metadata,
        private readonly OnlineResourceThemeService $themes,
        private readonly OnlineResourceMediaService $media,
    ) {}

    public function index(Request $request): Response
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('viewAnyForOwner', [OnlineResourceCategory::class, $school]);

        $categories = $this->service->serializedForOwner(
            owner: $school,
            onlyActive: false,
            includeAdminMeta: true,
        );

        $headerMeta = $this->scopes->forModel($school)->resolveHeaderMeta($school);
        $hubSetting = $this->themes->forOwner($school);
        $serializedHub = $this->themes->serializeHubSetting($school, $hubSetting, $headerMeta);

        return Inertia::render('OnlineResources/Admin/Index', [
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
                'code' => $school->code,
            ],
            'headerMeta' => $headerMeta,
            'canManage' => Gate::forUser($user)->allows('manageForOwner', [OnlineResourceCategory::class, $school]),
            'categories' => $categories,
            'hubSettings' => $serializedHub,
            'hub' => [
                'url' => $this->qr->schoolHubUrl($school),
                'sitemap_url' => route('online-resources.sitemap'),
                'qr_svg_url' => route('administrators.online-resources.hub.qr.svg'),
                'qr_png_url' => route('administrators.online-resources.hub.qr.png'),
                'sheet_pdf_url' => route('administrators.online-resources.sheet.pdf'),
            ],
        ]);
    }

    public function updateHubSettings(UpdateOnlineResourceHubSettingRequest $request): RedirectResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $this->themes->upsertForOwner($school, $request->validated(), $user);

        return redirect()
            ->back()
            ->with('status', 'Hub website appearance and SEO settings updated.');
    }

    public function uploadHubMedia(UploadOnlineResourceMediaRequest $request): JsonResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $slot = (string) $request->validated('slot');
        $file = $request->file('file');
        $setting = $this->themes->upsertForOwner($school, [], $user);

        $storedPath = $this->media->storeImage($file, (int) $school->id, $slot);

        if ($slot === 'logo') {
            $this->media->delete($setting->logo_path);
            $setting->update(['logo_path' => $storedPath, 'updated_by' => $user->id]);
        } elseif ($slot === 'banner') {
            $this->media->delete($setting->banner_path);
            $setting->update(['banner_path' => $storedPath, 'updated_by' => $user->id]);
        } else {
            $seo = is_array($setting->seo_config) ? $setting->seo_config : [];
            $this->media->delete(is_string($seo['og_image_path'] ?? null) ? $seo['og_image_path'] : null);
            $seo['og_image_path'] = $storedPath;
            $setting->update(['seo_config' => $this->themes->sanitizeSeoConfig($seo), 'updated_by' => $user->id]);
        }

        return response()->json([
            'slot' => $slot,
            'path' => $storedPath,
            'url' => $this->media->url($storedPath),
        ]);
    }

    public function deleteHubMedia(Request $request, string $slot): JsonResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        if (! in_array($slot, ['logo', 'banner', 'og_image'], true)) {
            abort(422, 'Unsupported media slot.');
        }

        $setting = $this->themes->forOwner($school);
        if ($setting !== null) {
            if ($slot === 'logo') {
                $this->media->delete($setting->logo_path);
                $setting->update(['logo_path' => null, 'updated_by' => $user->id]);
            } elseif ($slot === 'banner') {
                $this->media->delete($setting->banner_path);
                $setting->update(['banner_path' => null, 'updated_by' => $user->id]);
            } else {
                $seo = is_array($setting->seo_config) ? $setting->seo_config : [];
                $this->media->delete(is_string($seo['og_image_path'] ?? null) ? $seo['og_image_path'] : null);
                $seo['og_image_path'] = null;
                $setting->update(['seo_config' => $this->themes->sanitizeSeoConfig($seo), 'updated_by' => $user->id]);
            }
        }

        return response()->json(['deleted' => true, 'slot' => $slot]);
    }

    public function uploadCategoryMedia(UploadOnlineResourceMediaRequest $request, int $category): JsonResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $slot = (string) $request->validated('slot');
        if (! in_array($slot, ['banner', 'og_image'], true)) {
            abort(422, 'Unsupported category media slot.');
        }

        $model = $this->findSchoolCategory($school, $category);
        $storedPath = $this->media->storeImage($request->file('file'), (int) $school->id, $slot);

        if ($slot === 'banner') {
            $this->media->delete($model->banner_path);
            $model->update(['banner_path' => $storedPath]);
        } else {
            $seo = is_array($model->seo_config) ? $model->seo_config : [];
            $this->media->delete(is_string($seo['og_image_path'] ?? null) ? $seo['og_image_path'] : null);
            $seo['og_image_path'] = $storedPath;
            $model->update(['seo_config' => $this->themes->sanitizeSeoConfig($seo)]);
        }

        return response()->json([
            'slot' => $slot,
            'path' => $storedPath,
            'url' => $this->media->url($storedPath),
        ]);
    }

    public function deleteCategoryMedia(Request $request, int $category, string $slot): JsonResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        if (! in_array($slot, ['banner', 'og_image'], true)) {
            abort(422, 'Unsupported category media slot.');
        }

        $model = $this->findSchoolCategory($school, $category);

        if ($slot === 'banner') {
            $this->media->delete($model->banner_path);
            $model->update(['banner_path' => null]);
        } else {
            $seo = is_array($model->seo_config) ? $model->seo_config : [];
            $this->media->delete(is_string($seo['og_image_path'] ?? null) ? $seo['og_image_path'] : null);
            $seo['og_image_path'] = null;
            $model->update(['seo_config' => $this->themes->sanitizeSeoConfig($seo)]);
        }

        return response()->json(['deleted' => true, 'slot' => $slot]);
    }

    public function storeCategory(StoreOnlineResourceCategoryRequest $request): RedirectResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $this->service->createCategory($school, $request->validated(), $user);

        return redirect()
            ->back()
            ->with('status', 'Online resource category created.');
    }

    public function updateCategory(UpdateOnlineResourceCategoryRequest $request, int $category): RedirectResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $model = $this->findSchoolCategory($school, $category);
        $this->service->updateCategory($model, $request->validated());

        return redirect()
            ->back()
            ->with('status', 'Online resource category updated.');
    }

    public function destroyCategory(Request $request, int $category): RedirectResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $model = $this->findSchoolCategory($school, $category);
        $this->service->deleteCategory($model);

        return redirect()
            ->back()
            ->with('status', 'Online resource category deleted.');
    }

    public function reorderCategories(ReorderOnlineResourcesRequest $request): RedirectResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        /** @var list<int> $orderedIds */
        $orderedIds = array_map(static fn (mixed $id): int => (int) $id, $request->validated('ordered_ids'));

        $this->service->reorderCategories($school, $orderedIds);

        return redirect()->back();
    }

    public function fetchLinkMetadata(FetchOnlineResourceMetadataRequest $request): JsonResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        return response()->json(
            $this->metadata->resolve((string) $request->validated('url')),
        );
    }

    public function storeLink(StoreOnlineResourceLinkRequest $request, int $category): RedirectResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $categoryModel = $this->findSchoolCategory($school, $category);
        $this->service->createLink($categoryModel, $request->validated(), $user);

        return redirect()
            ->back()
            ->with('status', 'Online resource link added.');
    }

    public function updateLink(UpdateOnlineResourceLinkRequest $request, int $link): RedirectResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $linkModel = $this->findSchoolLink($school, $link);
        $validated = $request->validated();

        if (isset($validated['category_id'])) {
            $this->findSchoolCategory($school, (int) $validated['category_id']);
        }

        $this->service->updateLink($linkModel, $validated);

        return redirect()
            ->back()
            ->with('status', 'Online resource link updated.');
    }

    public function destroyLink(Request $request, int $link): RedirectResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $linkModel = $this->findSchoolLink($school, $link);
        $this->service->deleteLink($linkModel);

        return redirect()
            ->back()
            ->with('status', 'Online resource link deleted.');
    }

    public function clearLinkBrokenReport(Request $request, int $link): RedirectResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $linkModel = $this->findSchoolLink($school, $link);
        $this->service->clearBrokenReports($linkModel);

        return redirect()
            ->back()
            ->with('status', 'Broken link report cleared.');
    }

    public function reorderLinks(ReorderOnlineResourcesRequest $request, int $category): RedirectResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $school]);

        $categoryModel = $this->findSchoolCategory($school, $category);

        /** @var list<int> $orderedIds */
        $orderedIds = array_map(static fn (mixed $id): int => (int) $id, $request->validated('ordered_ids'));

        $this->service->reorderLinks($categoryModel, $orderedIds);

        return redirect()->back();
    }

    public function categoryQrSvg(Request $request, int $category): HttpResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $school]);

        $model = $this->findSchoolCategory($school, $category);

        return $this->qr->svgResponse(
            url: $this->qr->categoryUrl($model),
            filename: $school->code.'-'.$model->slug.'-qr',
        );
    }

    public function categoryQrPng(Request $request, int $category): HttpResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $school]);

        $model = $this->findSchoolCategory($school, $category);

        return $this->qr->pngDownloadResponse(
            url: $this->qr->categoryUrl($model),
            filename: $school->code.'-'.$model->slug.'-qr',
        );
    }

    public function categoryPosterPdf(Request $request, int $category): PdfBuilder
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $school]);

        $model = $this->findSchoolCategory($school, $category);
        $headerMeta = $this->scopes->forModel($school)->resolveHeaderMeta($school);

        return $this->qr->categoryPosterPdf($model, $headerMeta);
    }

    public function linkQrSvg(Request $request, int $link): HttpResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $school]);

        $model = $this->findSchoolLink($school, $link);

        return $this->qr->svgResponse(
            url: $this->qr->directLinkQrUrl($model),
            filename: $school->code.'-'.$model->title.'-qr',
        );
    }

    public function linkQrPng(Request $request, int $link): HttpResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $school]);

        $model = $this->findSchoolLink($school, $link);

        return $this->qr->pngDownloadResponse(
            url: $this->qr->directLinkQrUrl($model),
            filename: $school->code.'-'.$model->title.'-qr',
        );
    }

    public function hubQrSvg(Request $request): HttpResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $school]);

        return $this->qr->svgResponse(
            url: $this->qr->schoolHubUrl($school),
            filename: $school->code.'-online-resources-hub-qr',
        );
    }

    public function hubQrPng(Request $request): HttpResponse
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $school]);

        return $this->qr->pngDownloadResponse(
            url: $this->qr->schoolHubUrl($school),
            filename: $school->code.'-online-resources-hub-qr',
        );
    }

    public function sheetPdf(Request $request): PdfBuilder
    {
        $user = $this->requireUser($request);
        $school = $this->resolveActiveSchool($user);

        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $school]);

        $categories = $this->service->categoriesForOwner($school, onlyActive: true);
        $headerMeta = $this->scopes->forModel($school)->resolveHeaderMeta($school);

        return $this->qr->categoriesSheetPdf(
            categories: $categories,
            headerMeta: $headerMeta,
            hubUrl: $this->qr->schoolHubUrl($school),
        );
    }

    private function requireUser(Request $request): User
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(401);
        }

        return $user;
    }

    private function resolveActiveSchool(User $user): School
    {
        $school = $this->tenantContext->getCurrentSchool();

        if (! $school instanceof School && $user->school_id !== null) {
            $school = School::query()->find($user->school_id);
        }

        if (! $school instanceof School) {
            $school = School::query()->where('is_active', true)->orderBy('id')->first();
        }

        if (! $school instanceof School) {
            abort(404, 'No active school selected.');
        }

        return $school;
    }

    private function findSchoolCategory(School $school, int $categoryId): OnlineResourceCategory
    {
        $category = OnlineResourceCategory::withoutGlobalScope(SchoolScope::class)
            ->where('id', $categoryId)
            ->where('school_id', $school->id)
            ->forOwner('school', $school->id)
            ->first();

        if (! $category instanceof OnlineResourceCategory) {
            abort(404);
        }

        return $category;
    }

    private function findSchoolLink(School $school, int $linkId): OnlineResourceLink
    {
        $link = OnlineResourceLink::withoutGlobalScope(SchoolScope::class)
            ->with('category')
            ->where('id', $linkId)
            ->where('school_id', $school->id)
            ->first();

        if (
            ! $link instanceof OnlineResourceLink
            || ! $link->category instanceof OnlineResourceCategory
            || $link->category->owner_type !== 'school'
            || $link->category->owner_id !== $school->id
        ) {
            abort(404);
        }

        return $link;
    }
}
