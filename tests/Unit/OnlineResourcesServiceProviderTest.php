<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\OnlineResources\Services\OnlineResourceQrService;
use Modules\OnlineResources\Services\OnlineResourceScopeRegistry;
use Modules\OnlineResources\Services\OnlineResourceService;

it('registers core services and module configuration', function (): void {
    expect(config('online-resources.default_visibility'))->toBe('public')
        ->and(app(OnlineResourceScopeRegistry::class))->toBeInstanceOf(OnlineResourceScopeRegistry::class)
        ->and(app(OnlineResourceQrService::class))->toBeInstanceOf(OnlineResourceQrService::class)
        ->and(app(OnlineResourceService::class))->toBeInstanceOf(OnlineResourceService::class);
});

it('registers public, administrator, faculty, and student routes', function (): void {
    expect(Route::has('online-resources.qr.resolve'))->toBeTrue()
        ->and(Route::has('online-resources.qr.go'))->toBeTrue()
        ->and(Route::has('online-resources.directory'))->toBeTrue()
        ->and(Route::has('administrators.online-resources.index'))->toBeTrue()
        ->and(Route::has('administrators.online-resources.categories.store'))->toBeTrue()
        ->and(Route::has('faculty.classes.resources.categories.store'))->toBeTrue()
        ->and(Route::has('student.resources.index'))->toBeTrue();
});

it('validates safe http and https urls only', function (): void {
    expect(OnlineResourceService::isSafeHttpUrl('https://portal.school.edu/library'))->toBeTrue()
        ->and(OnlineResourceService::isSafeHttpUrl('http://example.org/docs'))->toBeTrue()
        ->and(OnlineResourceService::isSafeHttpUrl('javascript:alert(1)'))->toBeFalse()
        ->and(OnlineResourceService::isSafeHttpUrl('data:text/html,<h1>x</h1>'))->toBeFalse()
        ->and(OnlineResourceService::isSafeHttpUrl('//evil.example.com'))->toBeFalse()
        ->and(OnlineResourceService::isSafeHttpUrl(''))->toBeFalse();
});
