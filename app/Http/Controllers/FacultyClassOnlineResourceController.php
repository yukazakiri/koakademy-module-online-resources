<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Controllers;

use App\Models\Classes;
use App\Models\Scopes\SchoolScope;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
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

final class FacultyClassOnlineResourceController extends Controller
{
    public function __construct(
        private readonly OnlineResourceService $service,
        private readonly OnlineResourceQrService $qr,
        private readonly OnlineResourceScopeRegistry $scopes,
        private readonly OnlineResourceMetadataService $metadata,
        private readonly OnlineResourceThemeService $themes,
        private readonly OnlineResourceMediaService $media,
    ) {}

    public function updateHubSettings(UpdateOnlineResourceHubSettingRequest $request, Classes $class): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $this->themes->upsertForOwner($class, $request->validated(), $user);

        return redirect()
            ->back()
            ->with('flash', ['success' => 'Class resource hub appearance and SEO settings updated.']);
    }

    public function uploadHubMedia(UploadOnlineResourceMediaRequest $request, Classes $class): JsonResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $slot = (string) $request->validated('slot');
        $setting = $this->themes->upsertForOwner($class, [], $user);
        $storedPath = $this->media->storeImage($request->file('file'), (int) $class->school_id, $slot);

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

    public function deleteHubMedia(Request $request, Classes $class, string $slot): JsonResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        if (! in_array($slot, ['logo', 'banner', 'og_image'], true)) {
            abort(422, 'Unsupported media slot.');
        }

        $setting = $this->themes->forOwner($class);
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

    public function uploadCategoryMedia(UploadOnlineResourceMediaRequest $request, Classes $class, int $category): JsonResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $slot = (string) $request->validated('slot');
        if (! in_array($slot, ['banner', 'og_image'], true)) {
            abort(422, 'Unsupported category media slot.');
        }

        $model = $this->findClassCategory($class, $category);
        $storedPath = $this->media->storeImage($request->file('file'), (int) $class->school_id, $slot);

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

    public function deleteCategoryMedia(Request $request, Classes $class, int $category, string $slot): JsonResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        if (! in_array($slot, ['banner', 'og_image'], true)) {
            abort(422, 'Unsupported category media slot.');
        }

        $model = $this->findClassCategory($class, $category);

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

    public function storeCategory(StoreOnlineResourceCategoryRequest $request, Classes $class): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $this->service->createCategory($class, $request->validated(), $user);

        return redirect()
            ->back()
            ->with('flash', ['success' => 'Class resource category created.']);
    }

    public function updateCategory(UpdateOnlineResourceCategoryRequest $request, Classes $class, int $category): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $model = $this->findClassCategory($class, $category);
        $this->service->updateCategory($model, $request->validated());

        return redirect()
            ->back()
            ->with('flash', ['success' => 'Class resource category updated.']);
    }

    public function destroyCategory(Request $request, Classes $class, int $category): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $model = $this->findClassCategory($class, $category);
        $this->service->deleteCategory($model);

        return redirect()
            ->back()
            ->with('flash', ['success' => 'Class resource category deleted.']);
    }

    public function reorderCategories(ReorderOnlineResourcesRequest $request, Classes $class): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        /** @var list<int> $orderedIds */
        $orderedIds = array_map(static fn (mixed $id): int => (int) $id, $request->validated('ordered_ids'));

        $this->service->reorderCategories($class, $orderedIds);

        return redirect()->back();
    }

    public function fetchLinkMetadata(FetchOnlineResourceMetadataRequest $request, Classes $class): JsonResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        return response()->json(
            $this->metadata->resolve((string) $request->validated('url')),
        );
    }

    public function storeLink(StoreOnlineResourceLinkRequest $request, Classes $class, int $category): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $categoryModel = $this->findClassCategory($class, $category);
        $this->service->createLink($categoryModel, $request->validated(), $user);

        return redirect()
            ->back()
            ->with('flash', ['success' => 'Class resource link added.']);
    }

    public function updateLink(UpdateOnlineResourceLinkRequest $request, Classes $class, int $link): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $linkModel = $this->findClassLink($class, $link);
        $validated = $request->validated();

        if (isset($validated['category_id'])) {
            $this->findClassCategory($class, (int) $validated['category_id']);
        }

        $this->service->updateLink($linkModel, $validated);

        return redirect()
            ->back()
            ->with('flash', ['success' => 'Class resource link updated.']);
    }

    public function destroyLink(Request $request, Classes $class, int $link): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $linkModel = $this->findClassLink($class, $link);
        $this->service->deleteLink($linkModel);

        return redirect()
            ->back()
            ->with('flash', ['success' => 'Class resource link deleted.']);
    }

    public function clearLinkBrokenReport(Request $request, Classes $class, int $link): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $linkModel = $this->findClassLink($class, $link);
        $this->service->clearBrokenReports($linkModel);

        return redirect()
            ->back()
            ->with('flash', ['success' => 'Broken link report cleared.']);
    }

    public function reorderLinks(ReorderOnlineResourcesRequest $request, Classes $class, int $category): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $categoryModel = $this->findClassCategory($class, $category);

        /** @var list<int> $orderedIds */
        $orderedIds = array_map(static fn (mixed $id): int => (int) $id, $request->validated('ordered_ids'));

        $this->service->reorderLinks($categoryModel, $orderedIds);

        return redirect()->back();
    }

    public function copyFromClass(Request $request, Classes $class): RedirectResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $class]);

        $validated = $request->validate([
            'source_class_id' => ['required', 'integer', 'different:target_class_id'],
        ]);

        $sourceClassId = (int) $validated['source_class_id'];
        if ($sourceClassId === $class->id) {
            abort(422, 'Cannot copy resources from the same class.');
        }

        $sourceClass = Classes::withoutGlobalScope(SchoolScope::class)
            ->where('id', $sourceClassId)
            ->where('school_id', $class->school_id)
            ->first();

        if (! $sourceClass instanceof Classes) {
            abort(404);
        }

        Gate::forUser($user)->authorize('manageForOwner', [OnlineResourceCategory::class, $sourceClass]);

        $clonedCount = $this->service->cloneOwnerResources($sourceClass, $class, $user);

        return redirect()
            ->back()
            ->with('flash', [
                'success' => $clonedCount > 0
                    ? "Copied {$clonedCount} resource ".($clonedCount === 1 ? 'category' : 'categories').' into this class.'
                    : 'The selected class had no resource categories to copy.',
            ]);
    }

    public function categoryQrSvg(Request $request, Classes $class, int $category): HttpResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $class]);

        $model = $this->findClassCategory($class, $category);

        return $this->qr->svgResponse(
            url: $this->qr->categoryUrl($model),
            filename: 'class-'.$class->id.'-'.$model->slug.'-qr',
        );
    }

    public function categoryQrPng(Request $request, Classes $class, int $category): HttpResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $class]);

        $model = $this->findClassCategory($class, $category);

        return $this->qr->pngDownloadResponse(
            url: $this->qr->categoryUrl($model),
            filename: 'class-'.$class->id.'-'.$model->slug.'-qr',
        );
    }

    public function categoryPosterPdf(Request $request, Classes $class, int $category): PdfBuilder
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $class]);

        $model = $this->findClassCategory($class, $category);
        $headerMeta = $this->scopes->forModel($class)->resolveHeaderMeta($class);

        return $this->qr->categoryPosterPdf($model, $headerMeta);
    }

    public function linkQrSvg(Request $request, Classes $class, int $link): HttpResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $class]);

        $model = $this->findClassLink($class, $link);

        return $this->qr->svgResponse(
            url: $this->qr->directLinkQrUrl($model),
            filename: 'class-'.$class->id.'-'.$model->title.'-qr',
        );
    }

    public function linkQrPng(Request $request, Classes $class, int $link): HttpResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $class]);

        $model = $this->findClassLink($class, $link);

        return $this->qr->pngDownloadResponse(
            url: $this->qr->directLinkQrUrl($model),
            filename: 'class-'.$class->id.'-'.$model->title.'-qr',
        );
    }

    public function hubQrSvg(Request $request, Classes $class): HttpResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $class]);

        return $this->qr->svgResponse(
            url: $this->qr->classHubUrl($class),
            filename: 'class-'.$class->id.'-online-resources-hub-qr',
        );
    }

    public function hubQrPng(Request $request, Classes $class): HttpResponse
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $class]);

        return $this->qr->pngDownloadResponse(
            url: $this->qr->classHubUrl($class),
            filename: 'class-'.$class->id.'-online-resources-hub-qr',
        );
    }

    public function sheetPdf(Request $request, Classes $class): PdfBuilder
    {
        $user = $this->requireUser($request);
        Gate::forUser($user)->authorize('exportQr', [OnlineResourceCategory::class, $class]);

        $categories = $this->service->categoriesForOwner($class, onlyActive: true);
        $headerMeta = $this->scopes->forModel($class)->resolveHeaderMeta($class);

        return $this->qr->categoriesSheetPdf(
            categories: $categories,
            headerMeta: $headerMeta,
            hubUrl: $this->qr->classHubUrl($class),
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

    private function findClassCategory(Classes $class, int $categoryId): OnlineResourceCategory
    {
        $category = OnlineResourceCategory::withoutGlobalScope(SchoolScope::class)
            ->where('id', $categoryId)
            ->where('school_id', $class->school_id)
            ->forOwner('class', $class->id)
            ->first();

        if (! $category instanceof OnlineResourceCategory) {
            abort(404);
        }

        return $category;
    }

    private function findClassLink(Classes $class, int $linkId): OnlineResourceLink
    {
        $link = OnlineResourceLink::withoutGlobalScope(SchoolScope::class)
            ->with('category')
            ->where('id', $linkId)
            ->where('school_id', $class->school_id)
            ->first();

        if (
            ! $link instanceof OnlineResourceLink
            || ! $link->category instanceof OnlineResourceCategory
            || $link->category->owner_type !== 'class'
            || $link->category->owner_id !== $class->id
        ) {
            abort(404);
        }

        return $link;
    }
}
