<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\Concerns\BelongsToTenantSchool;
use Override;

/**
 * @property int $id
 * @property int $school_id
 * @property string $owner_type
 * @property int $owner_id
 * @property OnlineResourceVisibility $visibility
 * @property bool $is_published
 * @property string|null $headline
 * @property string|null $tagline
 * @property string|null $badge_text
 * @property string|null $announcement_text
 * @property string|null $announcement_url
 * @property string|null $cta_label
 * @property string|null $cta_url
 * @property string|null $logo_path
 * @property string|null $banner_path
 * @property string|null $footer_text
 * @property array<string, mixed>|null $design_config
 * @property array<string, mixed>|null $seo_config
 * @property int|null $updated_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
final class OnlineResourceHubSetting extends Model
{
    use BelongsToTenantSchool;

    #[Override]
    protected $table = 'online_resource_hub_settings';

    #[Override]
    protected $fillable = [
        'school_id',
        'owner_type',
        'owner_id',
        'visibility',
        'is_published',
        'headline',
        'tagline',
        'badge_text',
        'announcement_text',
        'announcement_url',
        'cta_label',
        'cta_url',
        'logo_path',
        'banner_path',
        'footer_text',
        'design_config',
        'seo_config',
        'updated_by',
    ];

    /** @return BelongsTo<Model, $this> */
    public function editor(): BelongsTo
    {
        /** @var class-string<Model> $userModel */
        $userModel = config('auth.providers.users.model', 'App\\Models\\User');

        return $this->belongsTo($userModel, 'updated_by');
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
     * @return array<string, mixed>
     */
    #[Override]
    protected function casts(): array
    {
        return [
            'school_id' => 'int',
            'owner_id' => 'int',
            'visibility' => OnlineResourceVisibility::class,
            'is_published' => 'bool',
            'design_config' => 'array',
            'seo_config' => 'array',
            'updated_by' => 'int',
        ];
    }
}
