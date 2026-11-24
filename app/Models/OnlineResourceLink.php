<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Modules\OnlineResources\Database\Factories\OnlineResourceLinkFactory;
use Modules\OnlineResources\Models\Concerns\BelongsToTenantSchool;
use Override;

/**
 * @property int $id
 * @property int $school_id
 * @property int $category_id
 * @property string $short_code
 * @property string $title
 * @property string $url
 * @property string|null $description
 * @property string|null $icon
 * @property string|null $badge_text
 * @property int $sort_order
 * @property bool $is_featured
 * @property bool $is_active
 * @property bool $opens_in_new_tab
 * @property int $click_count
 * @property Carbon|null $last_clicked_at
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read OnlineResourceCategory|null $category
 * @property-read Model|null $creator
 *
 * @method static OnlineResourceLinkFactory factory($count = null, $state = [])
 */
final class OnlineResourceLink extends Model
{
    use BelongsToTenantSchool;

    /** @use HasFactory<OnlineResourceLinkFactory> */
    use HasFactory;

    use SoftDeletes;

    #[Override]
    protected $table = 'online_resource_links';

    #[Override]
    protected $fillable = [
        'school_id',
        'category_id',
        'short_code',
        'title',
        'url',
        'description',
        'icon',
        'badge_text',
        'sort_order',
        'is_featured',
        'is_active',
        'opens_in_new_tab',
        'click_count',
        'last_clicked_at',
        'created_by',
    ];

    /** @return BelongsTo<OnlineResourceCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(OnlineResourceCategory::class, 'category_id');
    }

    /** @return BelongsTo<Model, $this> */
    public function creator(): BelongsTo
    {
        /** @var class-string<Model> $userModel */
        $userModel = config('auth.providers.users.model', 'App\\Models\\User');

        return $this->belongsTo($userModel, 'created_by');
    }

    protected static function newFactory(): OnlineResourceLinkFactory
    {
        return OnlineResourceLinkFactory::new();
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
     * Extract clean display hostname for UI badges.
     */
    public function displayHost(): string
    {
        $host = parse_url($this->url, PHP_URL_HOST);

        if (! is_string($host) || $host === '') {
            return '';
        }

        return preg_replace('/^www\./i', '', $host) ?? $host;
    }

    protected static function booted(): void
    {
        self::creating(function (self $link): void {
            if ($link->short_code === '' || ! isset($link->attributes['short_code'])) {
                $link->short_code = OnlineResourceCategory::generateUniqueShortCode();
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
            'category_id' => 'int',
            'sort_order' => 'int',
            'is_featured' => 'bool',
            'is_active' => 'bool',
            'opens_in_new_tab' => 'bool',
            'click_count' => 'int',
            'last_clicked_at' => 'datetime',
            'created_by' => 'int',
        ];
    }
}
