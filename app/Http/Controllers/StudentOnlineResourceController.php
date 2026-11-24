<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Http\Controllers;

use App\Models\ClassEnrollment;
use App\Models\Classes;
use App\Models\School;
use App\Models\Scopes\SchoolScope;
use App\Models\Student;
use App\Models\User;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response;
use Modules\OnlineResources\Services\OnlineResourceQrService;
use Modules\OnlineResources\Services\OnlineResourceService;

final class StudentOnlineResourceController extends Controller
{
    public function __construct(
        private readonly OnlineResourceService $service,
        private readonly OnlineResourceQrService $qr,
        private readonly TenantContext $tenantContext,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(401);
        }

        $student = Student::withoutGlobalScope(SchoolScope::class)
            ->where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->first();

        $school = $this->resolveStudentSchool($user, $student);

        /** @var Collection<int, Classes> $enrolledClasses */
        $enrolledClasses = new Collection;

        if ($student instanceof Student) {
            $classIds = ClassEnrollment::query()
                ->where('student_id', $student->id)
                ->pluck('class_id');

            if ($classIds->isNotEmpty()) {
                $enrolledClasses = Classes::withoutGlobalScope(SchoolScope::class)
                    ->with(['school', 'Faculty', 'Subject', 'SubjectByCodeFallback', 'ShsSubject'])
                    ->whereIn('id', $classIds)
                    ->when($school instanceof School, fn ($query) => $query->where('school_id', $school->id))
                    ->orderByDesc('id')
                    ->get();
            }
        }

        $portalData = $this->service->forStudentPortal($school, $enrolledClasses, $user);

        return Inertia::render('OnlineResources/Student/Index', [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar_url ?? null,
                'role' => $user->role->getLabel(),
            ],
            'school' => $school instanceof School ? [
                'id' => $school->id,
                'name' => $school->name,
                'code' => $school->code,
                'hub_url' => $this->qr->schoolHubUrl($school),
            ] : null,
            'schoolCategories' => $portalData['school_categories'],
            'classGroups' => $portalData['class_groups'],
        ]);
    }

    private function resolveStudentSchool(User $user, ?Student $student): ?School
    {
        $school = $this->tenantContext->getCurrentSchool();

        if (! $school instanceof School && $user->school_id !== null) {
            $school = School::query()->find($user->school_id);
        }

        if (! $school instanceof School && $student instanceof Student && $student->school_id !== null) {
            $school = School::query()->find($student->school_id);
        }

        if (! $school instanceof School) {
            $school = School::query()->where('is_active', true)->orderBy('id')->first();
        }

        return $school;
    }
}
