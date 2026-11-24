<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Models\Concerns;

use App\Models\School;
use App\Models\Scopes\SchoolScope;
use App\Services\TenantContext;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Multi-school tenant scoping trait that integrates seamlessly with KoAkademy's
 * SchoolScope and TenantContext when present, while remaining safe in standalone tests.
 *
 * @property int|null $school_id
 *
 * @method static Builder<static> forSchool(Model|int $school)
 * @method static Builder<static> withoutSchoolScope()
 */
trait BelongsToTenantSchool
{
    public static function bootBelongsToTenantSchool(): void
    {
        if (class_exists(SchoolScope::class)) {
            static::addGlobalScope(new SchoolScope);
        }

        static::creating(function (Model $model): void {
            if (! empty($model->getAttribute('school_id'))) {
                return;
            }

            if (! class_exists(TenantContext::class)) {
                return;
            }

            try {
                if (! app()->bound(TenantContext::class)) {
                    return;
                }

                $schoolId = app(TenantContext::class)->getCurrentSchoolId();
                if ($schoolId) {
                    $model->setAttribute('school_id', $schoolId);
                }
            } catch (BindingResolutionException) {
                // Skip auto-setting school_id if container is not ready.
            }
        });
    }

    /**
     * @return BelongsTo<Model, $this>
     */
    public function school(): BelongsTo
    {
        /** @var class-string<Model> $schoolClass */
        $schoolClass = class_exists(School::class) ? School::class : static::class;

        return $this->belongsTo($schoolClass, 'school_id', 'id');
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeForSchool(Builder $query, Model|int $school): Builder
    {
        $schoolId = $school instanceof Model ? $school->getKey() : $school;

        return $query->where($this->getTable().'.school_id', $schoolId);
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeWithoutSchoolScope(Builder $query): Builder
    {
        if (class_exists(SchoolScope::class)) {
            return $query->withoutGlobalScope(SchoolScope::class);
        }

        return $query;
    }

    public function belongsToSchool(Model|int $school): bool
    {
        $schoolId = $school instanceof Model ? (int) $school->getKey() : $school;

        return (int) $this->getAttribute('school_id') === $schoolId;
    }
}
