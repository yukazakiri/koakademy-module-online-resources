<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('online_resource_hub_settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('owner_type', 40);
            $table->unsignedBigInteger('owner_id');
            $table->string('visibility', 32)->default('public');
            $table->boolean('is_published')->default(true);
            $table->string('headline', 160)->nullable();
            $table->string('tagline', 500)->nullable();
            $table->string('badge_text', 80)->nullable();
            $table->string('announcement_text', 300)->nullable();
            $table->string('announcement_url', 2048)->nullable();
            $table->string('cta_label', 60)->nullable();
            $table->string('cta_url', 2048)->nullable();
            $table->string('logo_path', 500)->nullable();
            $table->string('banner_path', 500)->nullable();
            $table->string('footer_text', 300)->nullable();
            $table->json('design_config')->nullable();
            $table->json('seo_config')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['school_id', 'owner_type', 'owner_id'],
                'orhs_school_owner_unique',
            );
            $table->index(['owner_type', 'owner_id'], 'orhs_owner_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('online_resource_hub_settings');
    }
};
