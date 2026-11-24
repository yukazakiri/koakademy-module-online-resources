<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Providers;

use App\Models\Classes;
use App\Models\School;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Policies\OnlineResourceCategoryPolicy;
use Modules\OnlineResources\Scopes\ClassResourceScope;
use Modules\OnlineResources\Scopes\SchoolResourceScope;
use Modules\OnlineResources\Services\OnlineResourceQrService;
use Modules\OnlineResources\Services\OnlineResourceScopeRegistry;
use Modules\OnlineResources\Services\OnlineResourceService;

final class OnlineResourcesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(dirname(__DIR__, 2).'/config/online-resources.php', 'online-resources');

        $this->app->singleton(OnlineResourceScopeRegistry::class, function ($app): OnlineResourceScopeRegistry {
            $registry = new OnlineResourceScopeRegistry;

            if (class_exists(School::class)) {
                $schoolScope = $app->make(SchoolResourceScope::class);
                $registry->register($schoolScope);

                if (class_exists(Classes::class)) {
                    $registry->register($app->make(ClassResourceScope::class));
                }
            }

            return $registry;
        });

        $this->app->singleton(OnlineResourceQrService::class);
        $this->app->singleton(OnlineResourceService::class);

        $this->app->register(RouteServiceProvider::class);
    }

    public function boot(): void
    {
        $packageRoot = dirname(__DIR__, 2);

        $this->loadMigrationsFrom($packageRoot.'/database/migrations');
        $this->loadViewsFrom($packageRoot.'/resources/views', 'online-resources');

        $this->publishes([
            $packageRoot.'/config/online-resources.php' => config_path('online-resources.php'),
        ], 'online-resources-config');

        Gate::policy(OnlineResourceCategory::class, OnlineResourceCategoryPolicy::class);
    }
}
