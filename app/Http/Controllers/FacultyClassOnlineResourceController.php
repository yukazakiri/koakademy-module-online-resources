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
use Modules\OnlineResources\Http\Requests\UpdateOnlineResourceLinkRequest;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Models\OnlineResourceLink;
use Modules\OnlineResources\Services\OnlineResourceMetadataService;
use Modules\OnlineResources\Services\OnlineResourceQrService;
use Modules\OnlineResources\Services\OnlineResourceScopeRegistry;
use Modules\OnlineResources\Services\OnlineResourceService;
use Spatie\LaravelPdf\PdfBuilder;

final class FacultyClassOnlineResourceController extends Controller
{
    public function __construct(
        private readonly OnlineResourceService $service,
        private readonly OnlineResourceQrService $qr,
        private readonly OnlineResourceScopeRegistry $scopes,
        private readonly OnlineResourceMetadataService $metadata,
    ) {}

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
