<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Scopes;

use App\Enums\UserRole;
use App\Models\School;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Modules\OnlineResources\Contracts\OnlineResourceScopeHandler;
use Modules\OnlineResources\Enums\OnlineResourceAudience;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\OnlineResourceCategory;

final class SchoolResourceScope implements OnlineResourceScopeHandler
{
    /** @var list<UserRole> */
    private const array MANAGER_ROLES = [
        UserRole::Developer,
        UserRole::SuperAdmin,
        UserRole::Admin,
        UserRole::President,
        UserRole::VicePresident,
        UserRole::Dean,
        UserRole::AssociateDean,
        UserRole::DepartmentHead,
        UserRole::ProgramChair,
        UserRole::Registrar,
        UserRole::AssistantRegistrar,
        UserRole::StudentAffairsOfficer,
        UserRole::GuidanceCounselor,
        UserRole::Librarian,
    ];

    public function key(): string
    {
        return 'school';
    }

    public function modelClass(): string
    {
        return School::class;
    }

    public function findOwner(int $ownerId): ?Model
    {
        return School::query()->find($ownerId);
    }

    public function schoolIdForOwner(Model $owner): int
    {
        /** @var School $owner */
        return (int) $owner->id;
    }

    public function isEnabledForOwner(Model $owner): bool
    {
        return $owner instanceof School && (bool) $owner->is_active;
    }

    public function canViewAdmin(Authenticatable $user, Model $owner): bool
    {
        if (! $user instanceof User || ! $owner instanceof School || ! $this->userBelongsToOrAccessesSchool($user, $owner)) {
            return false;
        }

        if ($this->canManage($user, $owner)) {
            return true;
        }

        return $user->can('online-resources.view')
            || $user->can('ViewAny:OnlineResourceCategory')
            || $user->can('View:OnlineResourceCategory');
    }

    public function canManage(Authenticatable $user, Model $owner): bool
    {
        if (! $user instanceof User || ! $owner instanceof School || ! $this->userBelongsToOrAccessesSchool($user, $owner)) {
            return false;
        }

        if ($user->can('online-resources.manage')
            || $user->can('Create:OnlineResourceCategory')
            || $user->can('Update:OnlineResourceCategory')
        ) {
            return true;
        }

        return in_array($user->role, self::MANAGER_ROLES, true);
    }

    public function canView(?Authenticatable $user, Model $owner, OnlineResourceCategory $category): bool
    {
        if (! $owner instanceof School || ! $category->is_active || ! $this->isEnabledForOwner($owner)) {
            return false;
        }

        if ($category->visibility === OnlineResourceVisibility::Public) {
            return true;
        }

        if (! $user instanceof User) {
            return false;
        }

        if ($this->canManage($user, $owner)) {
            return true;
        }

        if (! $this->userBelongsToOrAccessesSchool($user, $owner)) {
            return false;
        }

        return match ($category->audience) {
            OnlineResourceAudience::All => true,
            OnlineResourceAudience::Students => $user->isStudentRole(),
            OnlineResourceAudience::Faculty => $user->isFaculty() || $user->isAdministrative(),
        };
    }

    public function allowedVisibilities(): array
    {
        return [
            OnlineResourceVisibility::Public,
            OnlineResourceVisibility::Authenticated,
        ];
    }

    public function resolveHeaderMeta(Model $owner): array
    {
        /** @var School $owner */
        return [
            'scope' => $this->key(),
            'title' => $owner->name,
            'subtitle' => $owner->description ?: 'School Online Resources Directory',
            'badge' => 'School Resources',
            'school_name' => $owner->name,
            'school_code' => $owner->code,
            'hub_url' => route('online-resources.directory', ['schoolCode' => $owner->code]),
        ];
    }

    private function userBelongsToOrAccessesSchool(User $user, School $school): bool
    {
        if (in_array($user->role, [UserRole::Developer, UserRole::SuperAdmin], true)) {
            return true;
        }

        if ((int) $user->school_id === (int) $school->id) {
            return true;
        }

        if ($user->organizations()->where('schools.id', $school->id)->wherePivot('is_active', true)->exists()) {
            return true;
        }

        // Student users may link to their school through their Student record when user.school_id is null
        if ($user->school_id === null && $user->isStudentRole()) {
            return true;
        }

        return false;
    }
}
