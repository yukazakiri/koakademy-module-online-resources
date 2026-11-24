<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Contracts;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\OnlineResourceCategory;

interface OnlineResourceScopeHandler
{
    public function key(): string;

    /**
     * @return class-string<Model>
     */
    public function modelClass(): string;

    public function findOwner(int $ownerId): ?Model;

    public function schoolIdForOwner(Model $owner): int;

    public function isEnabledForOwner(Model $owner): bool;

    public function canViewAdmin(Authenticatable $user, Model $owner): bool;

    public function canManage(Authenticatable $user, Model $owner): bool;

    public function canView(?Authenticatable $user, Model $owner, OnlineResourceCategory $category): bool;

    /**
     * @return list<OnlineResourceVisibility>
     */
    public function allowedVisibilities(): array;

    /**
     * @return array{
     *     scope: string,
     *     title: string,
     *     subtitle: string|null,
     *     badge: string,
     *     school_name: string,
     *     school_code: string|null,
     *     hub_url: string|null,
     * }
     */
    public function resolveHeaderMeta(Model $owner): array;
}
