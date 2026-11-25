# Changelog

All notable changes to `koakademy/online-resources` will be documented in this file.

## v1.2.0 - 2026-11-25

### Fixed
- Fixed duplicate `?tab=resources` query string on the Student Portal **Open Class** button.
- Made link click counting atomic (`increment('click_count', 1, ...)`) to prevent lost counts during concurrent classroom QR scans.
- Resolved role-aware `portalUrl` on the Public Hub header so signed-in Administrators and Faculty return to their own portals instead of `/student/resources`.

### Added
- **Phase 1:** Link icon picker with URL-based auto-inference, **Move to Category** selector when editing links, 1-click **"Use page description"** suggestion chip from URL metadata, and direct **Single-Link QR** endpoints (`links/{link}/qr.svg`, `links/{link}/qr.png`) + modal action.
- **Phase 2 (WCAG 2.1 AA):** Contextual `aria-label` on all icon-only management controls, `role="radiogroup"` / `aria-checked` on icon & color pickers, explicit `<Label htmlFor>` + `aria-describedby` on all switches/selects, skip-to-resources link, `aria-live="polite"` search result announcements, screen-reader `(opens in a new tab)` notices, `motion-reduce` animations, and touch-friendly `44px` horizontally scrollable mobile category pills.
- **Phase 3 (Student & Mobile UX):** Unified cross-scope Student Portal search across School + all Enrolled Classes, per-device **Pinned by You** & **Recently Opened** quick-access strips, 1-tap **Copy URL** and native mobile **Web Share** (`navigator.share`), auto-detected resource type badges (PDF, Video, Google Docs/Sheets/Slides/Forms, GitHub, Meeting), and throttled **"Report broken link"** flagging with Admin/Faculty alert banners, **"Mark fixed"** dismissal, and automatic reset on URL update.

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
