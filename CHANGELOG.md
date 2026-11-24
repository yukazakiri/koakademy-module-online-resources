# Changelog

All notable changes to `koakademy/online-resources` will be documented in this file.

## v1.1.0 - 2026-11-25

### Added
- Automatic link title detection when adding resources to a category: pastes or typed URLs automatically fetch the target page title (`og:title` / `twitter:title` / `<title>` or `Content-Disposition` filename) via SSRF-hardened metadata endpoints (`POST /administrators/online-resources/links/metadata` and `POST /faculty/classes/{class}/resources/links/metadata`), with instant URL-derived fallback titles and a manual **Auto-fill from URL** trigger that never overwrites manually edited titles.
- Placed the **URL** field first in `ResourceLinkDialog` for a faster paste-and-save workflow.

## v1.0.0 - 2026-11-24

### Added
- Initial standalone KoAkademy module release (`koakademy/online-resources`).
- Extensible owner scope engine (`OnlineResourceScopeHandler`, `OnlineResourceScopeRegistry`) with built-in `school` and `class` scopes.
- Categorized online resource models, factories, and database migration (`online_resource_categories`, `online_resource_links`).
- Permanent short-code QR resolver (`/q/{shortCode}`), tracked link redirector (`/q/go/{shortCode}`), and school directory (`/resources/{schoolCode}`).
- SVG, PNG, A4 Category QR Poster PDF, and Multi-Category QR Sheet PDF exports.
- Inertia React pages and reusable components for Admin Management, Public Mobile-First QR Hub, Faculty Class Resources tab, and Student Portal Resources hub.
- Auto-registered admin sidebar navigation (`config/navigation.php`) and `ensure.module:OnlineResources` middleware integration.
