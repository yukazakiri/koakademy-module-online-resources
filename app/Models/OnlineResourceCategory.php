<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Modules\OnlineResources\Database\Factories\OnlineResourceCategoryFactory;
use Modules\OnlineResources\Enums\OnlineResourceAudience;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\Concerns\BelongsToTenantSchool;
use Override;

/**
 * @property int $id
 * @property int $school_id
 * @property string $owner_type
 * @property int $owner_id
 * @property string $short_code
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string $icon
 * @property string $accent_color
 * @property OnlineResourceVisibility $visibility
 * @property OnlineResourceAudience $audience
 * @property int $sort_order
 * @property bool $is_active
 * @property int $scan_count
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Collection<int, OnlineResourceLink> $links
 * @property-read Collection<int, OnlineResourceLink> $activeLinks
 * @property-read Model|null $creator
 *
 * @method static OnlineResourceCategoryFactory factory($count = null, $state = [])
 */
final class OnlineResourceCategory extends Model
{
    use BelongsToTenantSchool;

    /** @use HasFactory<OnlineResourceCategoryFactory> */
    use HasFactory;

    use SoftDeletes;

    private const string SHORT_CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

    #[Override]
    protected $table = 'online_resource_categories';

    #[Override]
    protected $fillable = [
        'school_id',
        'owner_type',
        'owner_id',
        'short_code',
        'name',
        'slug',
        'description',
        'icon',
        'accent_color',
        'visibility',
        'audience',
        'sort_order',
        'is_active',
        'scan_count',
        'created_by',
    ];

    public static function generateUniqueShortCode(int $length = 8): string
    {
        $alphabet = self::SHORT_CODE_ALPHABET;
        $maxIndex = mb_strlen($alphabet) - 1;

        for ($attempt = 0; $attempt < 20; $attempt++) {
            $code = '';
            for ($i = 0; $i < $length; $i++) {
                $code .= $alphabet[random_int(0, $maxIndex)];
            }

            $existsInCategories = self::withoutGlobalScopes()
                ->withTrashed()
                ->where('short_code', $code)
                ->exists();

            $existsInLinks = OnlineResourceLink::withoutGlobalScopes()
                ->withTrashed()
                ->where('short_code', $code)
                ->exists();

            if (! $existsInCategories && ! $existsInLinks) {
                return $code;
            }
        }

        return mb_strtolower(Str::random(12));
    }

    public static function generateUniqueSlug(
        int $schoolId,
        string $ownerType,
        int $ownerId,
        string $name,
        ?int $ignoreId = null,
    ): string {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'resources';
        }

        $candidate = Str::limit($base, 120, '');
        $suffix = 1;

        while (
            self::withoutGlobalScopes()
                ->withTrashed()
                ->where('school_id', $schoolId)
                ->where('owner_type', $ownerType)
                ->where('owner_id', $ownerId)
                ->where('slug', $candidate)
                ->when($ignoreId !== null, fn (Builder $query) => $query->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $suffix++;
            $candidate = Str::limit($base, 112, '').'-'.$suffix;
        }

        return $candidate;
    }

    /** @return HasMany<OnlineResourceLink, $this> */
    public function links(): HasMany
    {
        return $this->hasMany(OnlineResourceLink::class, 'category_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /** @return HasMany<OnlineResourceLink, $this> */
    public function activeLinks(): HasMany
    {
        return $this->links()->where('is_active', true);
    }

    /** @return BelongsTo<Model, $this> */
    public function creator(): BelongsTo
    {
        /** @var class-string<Model> $userModel */
        $userModel = config('auth.providers.users.model', 'App\\Models\\User');

        return $this->belongsTo($userModel, 'created_by');
    }

    protected static function newFactory(): OnlineResourceCategoryFactory
    {
        return OnlineResourceCategoryFactory::new();
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeForOwner(Builder $query, string $ownerType, int $ownerId): Builder
    {
        return $query
            ->where($this->getTable().'.owner_type', $ownerType)
            ->where($this->getTable().'.owner_id', $ownerId);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where($this->getTable().'.is_active', true);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query
            ->orderBy($this->getTable().'.sort_order')
            ->orderBy($this->getTable().'.id');
    }

    protected static function booted(): void
    {
        self::creating(function (self $category): void {
            if ($category->short_code === '' || ! isset($category->attributes['short_code'])) {
                $category->short_code = self::generateUniqueShortCode();
            }

            if ($category->slug === '' || ! isset($category->attributes['slug'])) {
                $category->slug = self::generateUniqueSlug(
                    schoolId: (int) $category->school_id,
                    ownerType: (string) $category->owner_type,
                    ownerId: (int) $category->owner_id,
                    name: (string) $category->name,
                );
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    #[Override]
    protected function casts(): array
    {
        return [
            'school_id' => 'int',
            'owner_id' => 'int',
            'visibility' => OnlineResourceVisibility::class,
            'audience' => OnlineResourceAudience::class,
            'sort_order' => 'int',
            'is_active' => 'bool',
            'scan_count' => 'int',
            'created_by' => 'int',
        ];
    }
}
