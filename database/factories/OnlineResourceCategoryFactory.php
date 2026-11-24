<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Database\Factories;

use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;
use Modules\OnlineResources\Enums\OnlineResourceAudience;
use Modules\OnlineResources\Enums\OnlineResourceVisibility;
use Modules\OnlineResources\Models\OnlineResourceCategory;

/**
 * @extends Factory<OnlineResourceCategory>
 */
final class OnlineResourceCategoryFactory extends Factory
{
    protected $model = OnlineResourceCategory::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $schoolFactory = class_exists(School::class)
            ? School::factory()
            : 1;

        return [
            'school_id' => $schoolFactory,
            'owner_type' => 'school',
            'owner_id' => fn (array $attributes): int => (int) $attributes['school_id'],
            'short_code' => fn (): string => OnlineResourceCategory::generateUniqueShortCode(),
            'name' => fake()->words(2, true),
            'description' => fake()->sentence(),
            'icon' => 'book',
            'accent_color' => 'blue',
            'visibility' => OnlineResourceVisibility::Public,
            'audience' => OnlineResourceAudience::All,
            'sort_order' => 0,
            'is_active' => true,
            'scan_count' => 0,
        ];
    }

    public function forSchoolOwner(Model $school): static
    {
        return $this->state(fn (): array => [
            'school_id' => (int) $school->getKey(),
            'owner_type' => 'school',
            'owner_id' => (int) $school->getKey(),
        ]);
    }

    public function forClassOwner(Model $class): static
    {
        return $this->state(fn (): array => [
            'school_id' => (int) $class->getAttribute('school_id'),
            'owner_type' => 'class',
            'owner_id' => (int) $class->getKey(),
        ]);
    }

    public function authenticated(): static
    {
        return $this->state(fn (): array => [
            'visibility' => OnlineResourceVisibility::Authenticated,
        ]);
    }

    public function enrolledOnly(): static
    {
        return $this->state(fn (): array => [
            'visibility' => OnlineResourceVisibility::EnrolledOnly,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => [
            'is_active' => false,
        ]);
    }
}
