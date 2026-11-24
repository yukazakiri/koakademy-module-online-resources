<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('online_resource_categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('owner_type', 40);
            $table->unsignedBigInteger('owner_id');
            $table->string('short_code', 16)->unique();
            $table->string('name', 120);
            $table->string('slug', 140);
            $table->text('description')->nullable();
            $table->string('icon', 60)->default('link');
            $table->string('accent_color', 40)->default('blue');
            $table->string('visibility', 32)->default('public');
            $table->string('audience', 32)->default('all');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('scan_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(
                ['school_id', 'owner_type', 'owner_id', 'slug'],
                'orc_school_owner_slug_unique',
            );
            $table->index(
                ['school_id', 'owner_type', 'owner_id', 'is_active', 'sort_order'],
                'orc_school_owner_active_sort_idx',
            );
            $table->index(['owner_type', 'owner_id'], 'orc_owner_idx');
        });

        Schema::create('online_resource_links', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('category_id')
                ->constrained('online_resource_categories')
                ->cascadeOnDelete();
            $table->string('short_code', 16)->unique();
            $table->string('title', 160);
            $table->string('url', 2048);
            $table->text('description')->nullable();
            $table->string('icon', 60)->nullable();
            $table->string('badge_text', 40)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('opens_in_new_tab')->default(true);
            $table->unsignedBigInteger('click_count')->default(0);
            $table->timestamp('last_clicked_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(
                ['category_id', 'is_active', 'sort_order'],
                'orl_category_active_sort_idx',
            );
            $table->index(['school_id', 'is_active'], 'orl_school_active_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('online_resource_links');
        Schema::dropIfExists('online_resource_categories');
    }
};
