<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Scopes;

use App\Models\ClassEnrollment;
use App\Models\Classes;
use App\Models\Faculty;
use App\Models\School;
use App\Models\Scopes\SchoolScope;
use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Modules\OnlineResources\Contracts\OnlineResourceScopeHandler;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\OnlineResourceCategory;

final class ClassResourceScope implements OnlineResourceScopeHandler
{
    public function __construct(
        private readonly SchoolResourceScope $schoolScope,
    ) {}

    public function key(): string
    {
        return 'class';
    }

    public function modelClass(): string
    {
        return Classes::class;
    }

    public function findOwner(int $ownerId): ?Model
    {
        return Classes::withoutGlobalScope(SchoolScope::class)
            ->with(['school', 'Faculty', 'Subject', 'SubjectByCodeFallback', 'ShsSubject'])
            ->find($ownerId);
    }

    public function schoolIdForOwner(Model $owner): int
    {
        /** @var Classes $owner */
        return (int) $owner->school_id;
    }

    public function isEnabledForOwner(Model $owner): bool
    {
        if (! $owner instanceof Classes) {
            return false;
        }

        return (bool) $owner->getSetting('enable_online_resources', true);
    }

    public function canViewAdmin(Authenticatable $user, Model $owner): bool
    {
        return $this->canManage($user, $owner);
    }

    public function canManage(Authenticatable $user, Model $owner): bool
    {
        if (! $user instanceof User || ! $owner instanceof Classes) {
            return false;
        }

        if ($this->isAssignedFaculty($user, $owner)) {
            return true;
        }

        $school = $owner->school ?? School::query()->find($owner->school_id);

        return $school instanceof School && $this->schoolScope->canManage($user, $school);
    }

    public function canView(?Authenticatable $user, Model $owner, OnlineResourceCategory $category): bool
    {
        if (! $owner instanceof Classes || ! $category->is_active || ! $this->isEnabledForOwner($owner)) {
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

        if ($category->visibility === OnlineResourceVisibility::EnrolledOnly) {
            return $this->isEnrolledStudent($user, $owner);
        }

        // Authenticated visibility: any signed-in user belonging to this school or enrolled in the class
        if ($this->isEnrolledStudent($user, $owner)) {
            return true;
        }

        $school = $owner->school ?? School::query()->find($owner->school_id);

        return $school instanceof School && (
            (int) $user->school_id === (int) $school->id
            || $user->school_id === null
            || $this->schoolScope->canViewAdmin($user, $school)
        );
    }

    public function allowedVisibilities(): array
    {
        return [
            OnlineResourceVisibility::Public,
            OnlineResourceVisibility::EnrolledOnly,
            OnlineResourceVisibility::Authenticated,
        ];
    }

    public function resolveHeaderMeta(Model $owner): array
    {
        /** @var Classes $owner */
        $primarySubject = $owner->subjects->first();
        if (! $primarySubject) {
            $primarySubject = $owner->isShs()
                ? $owner->ShsSubject
                : ($owner->Subject ?: $owner->SubjectByCodeFallback);
        }

        $subjectCode = $primarySubject !== null ? ($primarySubject->code ?? $owner->subject_code ?? 'Class') : ($owner->subject_code ?? 'Class');
        $subjectTitle = $primarySubject !== null ? ($primarySubject->title ?? null) : null;
        $section = $owner->section ? "Section {$owner->section}" : null;
        $facultyName = $owner->Faculty?->full_name;

        $subtitleParts = array_values(array_filter([
            $subjectTitle,
            $section,
            $facultyName ? "Instructor: {$facultyName}" : null,
        ]));

        $school = $owner->school ?? School::query()->find($owner->school_id);
        $schoolName = $school instanceof School ? $school->name : (string) config('app.name', 'Koakademy');
        $schoolCode = $school instanceof School ? $school->code : null;

        return [
            'scope' => $this->key(),
            'title' => mb_trim($subjectCode.($owner->section ? " • {$owner->section}" : '')),
            'subtitle' => $subtitleParts !== [] ? implode(' · ', $subtitleParts) : 'Class Online Resources',
            'badge' => 'Class Resources',
            'school_name' => $schoolName,
            'school_code' => $schoolCode,
            'hub_url' => route('online-resources.class-directory', ['class' => $owner->id]),
            'school_hub_url' => $schoolCode !== null
                ? route('online-resources.directory', ['schoolCode' => $schoolCode])
                : null,
        ];
    }

    public function isAssignedFaculty(User $user, Classes $class): bool
    {
        if (! $user->isFaculty()) {
            return false;
        }

        $faculty = Faculty::withoutGlobalScope(SchoolScope::class)
            ->where('email', $user->email)
            ->first();

        return $faculty instanceof Faculty && (string) $class->faculty_id === (string) $faculty->id;
    }

    public function isEnrolledStudent(User $user, Classes $class): bool
    {
        if (! $user->isStudentRole()) {
            return false;
        }

        $student = Student::withoutGlobalScope(SchoolScope::class)
            ->where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->first();

        if (! $student instanceof Student) {
            return false;
        }

        return ClassEnrollment::query()
            ->where('class_id', $class->id)
            ->where('student_id', $student->id)
            ->exists();
    }
}
