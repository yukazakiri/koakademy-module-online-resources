# Changelog

All notable changes to `koakademy/online-resources` will be documented in this file.

## v1.3.0 - 2026-11-25

### Added
- **Customizable Public Website Engine (Main Hub + Dedicated Category Hubs + Class Resource Hubs):**
  - Added polymorphic `online_resource_hub_settings` table and additive category customization/SEO columns (`design_mode`, `hero_tagline`, `banner_path`, `design_config`, `seo_config`).
  - Added **7 Layout Templates** (`directory`, `minimalist`, `visual_showcase`, `bento`, `link_stack`, `editorial_portal`, `compact_index`) and **7 Client-Token-Linked Design Systems** (`client_default`, `minimalist`, `visual_showcase`, `compact`, `glass_modern`, `editorial_classic`, `high_contrast`) that dynamically derive colors, surfaces, borders, and gradients from the client's configured CSS tokens (`--primary`, `--background`, `--card`, `--border`, `--chart-1`), with optional accent swatch or custom `#RRGGBB` overrides.
  - Added dedicated **Class Resource Hub Websites** (`/resources/class/{class}` and `/resources/class/{class}/{categorySlug}`) with Master Class Hub QR & PDF sheet exports and full Faculty customization.
  - Added **Visibility-Enforced Customizable SEO & Dynamic Sitemap (`/resources/sitemap.xml`)**: custom meta titles, descriptions, keywords, Open Graph & Twitter Cards, canonical URLs (`/q/{shortCode}` automatically canonicalizes to human-readable category URLs), and Schema.org JSON-LD (`CollectionPage`, `ItemList`, `BreadcrumbList`). Restricted (`authenticated` / `enrolled_only`), unpublished, or unlisted pages automatically enforce `noindex, nofollow`, `X-Robots-Tag`, `Cache-Control: private, no-store`, and sitemap exclusion.
  - Added raster-only (JPG/PNG/WebP, SVG-blocked) logo, cover banner, and social OG image upload endpoints for Hubs and Categories.
  - Added split-screen **Website & SEO Customization Studio** with live Desktop/Mobile preview, Google SERP preview, and Open Graph card preview for both School Admins and Faculty Class Resources.

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
