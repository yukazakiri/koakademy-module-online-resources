<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('online_resource_links', function (Blueprint $table): void {
            $table->unsignedInteger('broken_report_count')->default(0)->after('last_clicked_at');
            $table->timestamp('last_reported_broken_at')->nullable()->after('broken_report_count');
        });
    }

    public function down(): void
    {
        Schema::table('online_resource_links', function (Blueprint $table): void {
            $table->dropColumn(['broken_report_count', 'last_reported_broken_at']);
        });
    }
};
