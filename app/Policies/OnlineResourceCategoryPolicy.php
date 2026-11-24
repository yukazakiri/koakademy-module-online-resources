<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Services\OnlineResourceScopeRegistry;

final class OnlineResourceCategoryPolicy
{
    use HandlesAuthorization;

    public function __construct(
        private readonly OnlineResourceScopeRegistry $scopes,
    ) {}

    public function viewAnyForOwner(Authenticatable $user, Model $owner): bool
    {
        return $this->scopes->forModel($owner)->canViewAdmin($user, $owner);
    }

    public function manageForOwner(Authenticatable $user, Model $owner): bool
    {
        return $this->scopes->forModel($owner)->canManage($user, $owner);
    }

    public function update(Authenticatable $user, OnlineResourceCategory $category): bool
    {
        $owner = $this->scopes->resolveOwner($category);

        return $owner instanceof Model && $this->scopes->forCategory($category)->canManage($user, $owner);
    }

    public function delete(Authenticatable $user, OnlineResourceCategory $category): bool
    {
        return $this->update($user, $category);
    }

    public function exportQr(Authenticatable $user, Model $owner): bool
    {
        if ($this->scopes->forModel($owner)->canViewAdmin($user, $owner)) {
            return true;
        }

        return method_exists($user, 'can') && (bool) $user->can('online-resources.export-qr');
    }
}
