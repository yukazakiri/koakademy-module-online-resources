<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('online_resource_categories', function (Blueprint $table): void {
            $table->string('design_mode', 16)->default('inherit')->after('accent_color');
            $table->string('hero_tagline', 300)->nullable()->after('description');
            $table->string('banner_path', 500)->nullable()->after('hero_tagline');
            $table->json('design_config')->nullable()->after('design_mode');
            $table->json('seo_config')->nullable()->after('design_config');
        });
    }

    public function down(): void
    {
        Schema::table('online_resource_categories', function (Blueprint $table): void {
            $table->dropColumn([
                'design_mode',
                'hero_tagline',
                'banner_path',
                'design_config',
                'seo_config',
            ]);
        });
    }
};
