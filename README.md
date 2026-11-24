# KoAkademy Online Resources Module

`koakademy/online-resources` is a standalone Laravel & Inertia module for KoAkademy that provides a categorized **Online Resources** directory with permanent QR codes, printable QR posters & sheets, school-wide resource hubs, faculty-managed class resources, and a unified student portal hub.

## Features

- **Permanent Short-Code QR Links**: Every category (`/q/{shortCode}`) and individual link (`/q/go/{shortCode}`) receives an immutable short code so printed QR posters never break when URLs, titles, or categories are updated.
- **Public-by-Default Hybrid Access**: Defaults to `public` visibility for frictionless mobile QR scanning, with optional `authenticated` (signed-in school members) and `enrolled_only` (class-enrolled students) modes, plus audience filtering (`all`, `students`, `faculty`).
- **Printable QR Assets**: Export high-resolution SVG, PNG, single-category A4 QR Poster PDFs, and multi-category QR Sheet PDFs.
- **Extensible Owner Scope Architecture**: Built around `OnlineResourceScopeHandler` and `OnlineResourceScopeRegistry`. Ships with built-in `school` (`SchoolResourceScope`) and `class` (`ClassResourceScope`) handlers, and allows other modules to register custom scopes (e.g., departments, clubs, libraries, guidance offices) without schema changes.
- **Role-Tailored Interfaces**:
  - **Administrators**: School-wide resource management at `/administrators/online-resources` (auto-registered in admin sidebar under *Student Services*).
  - **Faculty**: Per-class **Resources** tab with category/link management, copy-from-previous-class workflow, and classroom QR posters.
  - **Students**: Unified `/student/resources` hub combining school resources and enrolled class resources, plus an inline **Resources** tab inside each class detail view.
  - **Public / Guests**: Mobile-first QR landing & school directory at `/resources/{schoolCode}`.

## Installation

Install via Composer in a KoAkademy host application:

```bash
composer require koakademy/online-resources
php artisan migrate
php artisan modules:validate --all
npm run build
```

Enable the module in `modules_statuses.json` or via the KoAkademy Module Marketplace:

```json
{
    "OnlineResources": true
}
```

## Extending with Custom Scopes

Register any custom `OnlineResourceScopeHandler` in your module's service provider:

```php
use Modules\OnlineResources\Services\OnlineResourceScopeRegistry;

$this->app->afterResolving(OnlineResourceScopeRegistry::class, function (OnlineResourceScopeRegistry $registry): void {
    $registry->register(new MyCustomResourceScope);
});
```

## Testing

```bash
composer install
composer validate --no-check-publish --strict
composer test
```

## License

Licensed under the [AGPL-3.0-or-later](LICENSE.md).
