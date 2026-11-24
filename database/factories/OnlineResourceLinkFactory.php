<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Models\OnlineResourceLink;

/**
 * @extends Factory<OnlineResourceLink>
 */
final class OnlineResourceLinkFactory extends Factory
{
    protected $model = OnlineResourceLink::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => OnlineResourceCategory::factory(),
            'school_id' => function (array $attributes): int {
                $category = OnlineResourceCategory::withoutGlobalScopes()->find($attributes['category_id']);

                return (int) ($category?->school_id ?? 1);
            },
            'short_code' => fn (): string => OnlineResourceCategory::generateUniqueShortCode(),
            'title' => fake()->sentence(3),
            'url' => 'https://'.fake()->domainName().'/'.fake()->slug(2),
            'description' => fake()->sentence(),
            'icon' => null,
            'badge_text' => null,
            'sort_order' => 0,
            'is_featured' => false,
            'is_active' => true,
            'opens_in_new_tab' => true,
            'click_count' => 0,
        ];
    }

    public function forCategory(OnlineResourceCategory $category): static
    {
        return $this->state(fn (): array => [
            'school_id' => $category->school_id,
            'category_id' => $category->id,
        ]);
    }

    public function featured(): static
    {
        return $this->state(fn (): array => [
            'is_featured' => true,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => [
            'is_active' => false,
        ]);
    }
}
