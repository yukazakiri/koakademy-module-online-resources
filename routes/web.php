<?php

declare(strict_types=1);

use App\Http\Middleware\EnsureModuleEnabled;
use Illuminate\Support\Facades\Route;
use Modules\OnlineResources\Http\Controllers\AdministratorOnlineResourceController;
use Modules\OnlineResources\Http\Controllers\FacultyClassOnlineResourceController;
use Modules\OnlineResources\Http\Controllers\PublicOnlineResourceController;
use Modules\OnlineResources\Http\Controllers\StudentOnlineResourceController;

$isKoAkademyHost = class_exists(EnsureModuleEnabled::class);

$qrPrefix = mb_trim((string) config('online-resources.prefixes.qr', 'q'), '/');
$directoryPrefix = mb_trim((string) config('online-resources.prefixes.directory', 'resources'), '/');
$adminPrefix = mb_trim((string) config('online-resources.prefixes.admin', 'administrators/online-resources'), '/');
$facultyClassPrefix = mb_trim((string) config('online-resources.prefixes.faculty_class', 'faculty/classes/{class}/resources'), '/');
$studentPrefix = mb_trim((string) config('online-resources.prefixes.student', 'student/resources'), '/');

$adminMiddleware = $isKoAkademyHost
    ? (array) config('online-resources.middleware.admin', ['auth', 'administrators.only'])
    : ['auth'];

$facultyMiddleware = $isKoAkademyHost
    ? (array) config('online-resources.middleware.faculty', ['auth', 'faculty.verified', 'faculty.only', 'ensure.feature'])
    : ['auth'];

$studentMiddleware = $isKoAkademyHost
    ? (array) config('online-resources.middleware.student', ['auth', 'student.only', 'ensure.feature'])
    : ['auth'];

// Public / Hybrid QR & Directory Routes
Route::get("/{$qrPrefix}/go/{shortCode}", [PublicOnlineResourceController::class, 'go'])
    ->middleware('throttle:120,1')
    ->name('online-resources.qr.go');

Route::get("/{$qrPrefix}/{shortCode}", [PublicOnlineResourceController::class, 'resolve'])
    ->middleware('throttle:60,1')
    ->name('online-resources.qr.resolve');

Route::get("/{$directoryPrefix}/{schoolCode}/{categorySlug?}", [PublicOnlineResourceController::class, 'directory'])
    ->middleware('throttle:60,1')
    ->name('online-resources.directory');

// School Administrator Online Resources Management
Route::middleware($adminMiddleware)
    ->prefix($adminPrefix)
    ->name('administrators.online-resources.')
    ->group(function (): void {
        Route::get('/', [AdministratorOnlineResourceController::class, 'index'])->name('index');
        Route::post('/categories', [AdministratorOnlineResourceController::class, 'storeCategory'])->name('categories.store');
        Route::put('/categories/{category}', [AdministratorOnlineResourceController::class, 'updateCategory'])->name('categories.update');
        Route::delete('/categories/{category}', [AdministratorOnlineResourceController::class, 'destroyCategory'])->name('categories.destroy');
        Route::patch('/categories/reorder', [AdministratorOnlineResourceController::class, 'reorderCategories'])->name('categories.reorder');

        Route::post('/links/metadata', [AdministratorOnlineResourceController::class, 'fetchLinkMetadata'])
            ->middleware('throttle:30,1')
            ->name('links.metadata');

        Route::post('/categories/{category}/links', [AdministratorOnlineResourceController::class, 'storeLink'])->name('links.store');
        Route::put('/links/{link}', [AdministratorOnlineResourceController::class, 'updateLink'])->name('links.update');
        Route::delete('/links/{link}', [AdministratorOnlineResourceController::class, 'destroyLink'])->name('links.destroy');
        Route::patch('/categories/{category}/links/reorder', [AdministratorOnlineResourceController::class, 'reorderLinks'])->name('links.reorder');

        Route::get('/categories/{category}/qr.svg', [AdministratorOnlineResourceController::class, 'categoryQrSvg'])->name('categories.qr.svg');
        Route::get('/categories/{category}/qr.png', [AdministratorOnlineResourceController::class, 'categoryQrPng'])->name('categories.qr.png');
        Route::get('/categories/{category}/poster.pdf', [AdministratorOnlineResourceController::class, 'categoryPosterPdf'])->name('categories.poster.pdf');
        Route::get('/links/{link}/qr.svg', [AdministratorOnlineResourceController::class, 'linkQrSvg'])->name('links.qr.svg');
        Route::get('/links/{link}/qr.png', [AdministratorOnlineResourceController::class, 'linkQrPng'])->name('links.qr.png');
        Route::get('/hub/qr.svg', [AdministratorOnlineResourceController::class, 'hubQrSvg'])->name('hub.qr.svg');
        Route::get('/hub/qr.png', [AdministratorOnlineResourceController::class, 'hubQrPng'])->name('hub.qr.png');
        Route::get('/sheet.pdf', [AdministratorOnlineResourceController::class, 'sheetPdf'])->name('sheet.pdf');
    });

// Faculty Class Online Resources Management
Route::middleware($facultyMiddleware)
    ->prefix($facultyClassPrefix)
    ->name('faculty.classes.resources.')
    ->group(function (): void {
        Route::post('/categories', [FacultyClassOnlineResourceController::class, 'storeCategory'])->name('categories.store');
        Route::put('/categories/{category}', [FacultyClassOnlineResourceController::class, 'updateCategory'])->name('categories.update');
        Route::delete('/categories/{category}', [FacultyClassOnlineResourceController::class, 'destroyCategory'])->name('categories.destroy');
        Route::patch('/categories/reorder', [FacultyClassOnlineResourceController::class, 'reorderCategories'])->name('categories.reorder');

        Route::post('/links/metadata', [FacultyClassOnlineResourceController::class, 'fetchLinkMetadata'])
            ->middleware('throttle:30,1')
            ->name('links.metadata');

        Route::post('/categories/{category}/links', [FacultyClassOnlineResourceController::class, 'storeLink'])->name('links.store');
        Route::put('/links/{link}', [FacultyClassOnlineResourceController::class, 'updateLink'])->name('links.update');
        Route::delete('/links/{link}', [FacultyClassOnlineResourceController::class, 'destroyLink'])->name('links.destroy');
        Route::patch('/categories/{category}/links/reorder', [FacultyClassOnlineResourceController::class, 'reorderLinks'])->name('links.reorder');

        Route::post('/copy-from-class', [FacultyClassOnlineResourceController::class, 'copyFromClass'])->name('copy-from-class');
        Route::get('/categories/{category}/qr.svg', [FacultyClassOnlineResourceController::class, 'categoryQrSvg'])->name('categories.qr.svg');
        Route::get('/categories/{category}/qr.png', [FacultyClassOnlineResourceController::class, 'categoryQrPng'])->name('categories.qr.png');
        Route::get('/categories/{category}/poster.pdf', [FacultyClassOnlineResourceController::class, 'categoryPosterPdf'])->name('categories.poster.pdf');
        Route::get('/links/{link}/qr.svg', [FacultyClassOnlineResourceController::class, 'linkQrSvg'])->name('links.qr.svg');
        Route::get('/links/{link}/qr.png', [FacultyClassOnlineResourceController::class, 'linkQrPng'])->name('links.qr.png');
    });

// Student Portal Online Resources Hub
Route::middleware($studentMiddleware)
    ->get("/{$studentPrefix}", [StudentOnlineResourceController::class, 'index'])
    ->name('student.resources.index');
