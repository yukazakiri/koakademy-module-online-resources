<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Providers;

use App\Http\Middleware\EnsureModuleEnabled;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        parent::boot();
    }

    public function map(): void
    {
        $middleware = ['web'];

        if (class_exists(EnsureModuleEnabled::class)) {
            $middleware[] = 'ensure.module:OnlineResources';
        }

        Route::middleware($middleware)->group(dirname(__DIR__, 2).'/routes/web.php');
    }
}
