<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Services;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Models\OnlineResourceLink;

final readonly class OnlineResourceSeoService
{
    public function __construct(
        private OnlineResourceMediaService $media,
        private OnlineResourceQrService $qr,
    ) {}

    /**
     * Build visibility-enforced SEO metadata for a Main Hub website (School or Class).
     *
     * @param  array<string, mixed>  $headerMeta
     * @param  array<string, mixed>  $serializedHub
     * @param  Collection<int, OnlineResourceCategory>  $categories
     * @return array<string, mixed>
     */
    public function buildForHub(
        array $headerMeta,
        array $serializedHub,
        Collection $categories,
        string $canonicalUrl,
        string $currentUrl,
        bool $isPubliclyVisible,
    ): array {
        $seoConfig = is_array($serializedHub['seo_config'] ?? null) ? $serializedHub['seo_config'] : [];

        $schoolName = (string) ($headerMeta['school_name'] ?? config('app.name', 'KoAkademy'));
        $headline = (string) ($serializedHub['effective_headline'] ?? $headerMeta['title'] ?? $schoolName);
        $tagline = is_string($serializedHub['effective_tagline'] ?? null) ? $serializedHub['effective_tagline'] : null;

        $defaultTitle = $headline === $schoolName
            ? "{$schoolName} — Online Resources"
            : "{$headline} — {$schoolName}";
        $defaultDescription = $tagline ?: "Browse curated online resources, portals, and quick-access links from {$schoolName}.";

        $metaTitle = $this->cleanString($seoConfig['meta_title'] ?? null) ?? $defaultTitle;
        $metaDescription = Str::limit($this->cleanString($seoConfig['meta_description'] ?? null) ?? $defaultDescription, 300, '');
        $ogTitle = $this->cleanString($seoConfig['og_title'] ?? null) ?? $metaTitle;
        $ogDescription = $this->cleanString($seoConfig['og_description'] ?? null) ?? $metaDescription;
        $keywords = $this->cleanString($seoConfig['keywords'] ?? null);
        $twitterCard = in_array((string) ($seoConfig['twitter_card'] ?? ''), ['summary', 'summary_large_image'], true)
            ? (string) $seoConfig['twitter_card']
            : 'summary_large_image';

        $ogImage = $this->resolveOgImage($seoConfig, $serializedHub['banner_url'] ?? null);

        $adminAllowsIndex = (bool) ($seoConfig['robots_index'] ?? true);
        $allowIndex = $isPubliclyVisible && $adminAllowsIndex;
        $robots = $allowIndex ? 'index, follow' : 'noindex, nofollow';

        $customCanonical = $this->cleanString($seoConfig['canonical_url'] ?? null);
        $resolvedCanonical = ($customCanonical !== null && OnlineResourceService::isSafeHttpUrl($customCanonical))
            ? $customCanonical
            : $canonicalUrl;

        $structuredData = null;
        if ($allowIndex && (bool) ($seoConfig['structured_data_enabled'] ?? true)) {
            $itemList = [];
            $position = 1;
            foreach ($categories as $category) {
                $itemList[] = [
                    '@type' => 'ListItem',
                    'position' => $position++,
                    'name' => $category->name,
                    'description' => $category->description,
                    'url' => $this->qr->categoryUrl($category),
                ];
            }

            $structuredData = [
                '@context' => 'https://schema.org',
                '@type' => 'CollectionPage',
                'name' => $metaTitle,
                'description' => $metaDescription,
                'url' => $resolvedCanonical,
                'publisher' => [
                    '@type' => 'EducationalOrganization',
                    'name' => $schoolName,
                ],
                'mainEntity' => [
                    '@type' => 'ItemList',
                    'numberOfItems' => count($itemList),
                    'itemListElement' => $itemList,
                ],
            ];
        }

        return [
            'title' => $metaTitle,
            'description' => $metaDescription,
            'keywords' => $keywords,
            'og_title' => $ogTitle,
            'og_description' => $ogDescription,
            'og_image' => $ogImage,
            'og_type' => 'website',
            'og_url' => $currentUrl,
            'site_name' => $schoolName,
            'twitter_card' => $twitterCard,
            'canonical_url' => $allowIndex ? $resolvedCanonical : null,
            'robots' => $robots,
            'allow_indexing' => $allowIndex,
            'structured_data' => $structuredData,
        ];
    }

    /**
     * Build visibility-enforced SEO metadata for a Dedicated Category Hub website.
     *
     * @param  array<string, mixed>  $headerMeta
     * @param  array<string, mixed>  $serializedHub
     * @return array<string, mixed>
     */
    public function buildForCategory(
        OnlineResourceCategory $category,
        array $headerMeta,
        array $serializedHub,
        string $canonicalUrl,
        string $currentUrl,
        bool $isPubliclyVisible,
    ): array {
        $hubSeo = is_array($serializedHub['seo_config'] ?? null) ? $serializedHub['seo_config'] : [];
        $catSeo = is_array($category->seo_config) ? $category->seo_config : [];

        $schoolName = (string) ($headerMeta['school_name'] ?? config('app.name', 'KoAkademy'));
        $hubTitle = (string) ($serializedHub['effective_headline'] ?? $headerMeta['title'] ?? $schoolName);
        $defaultTitle = "{$category->name} — {$hubTitle}";
        $defaultDescription = $category->hero_tagline
            ?: $category->description
            ?: "Quick-access links and resources for {$category->name} at {$schoolName}.";

        $metaTitle = $this->cleanString($catSeo['meta_title'] ?? null) ?? $defaultTitle;
        $metaDescription = Str::limit($this->cleanString($catSeo['meta_description'] ?? null) ?? $defaultDescription, 300, '');
        $ogTitle = $this->cleanString($catSeo['og_title'] ?? null) ?? $metaTitle;
        $ogDescription = $this->cleanString($catSeo['og_description'] ?? null) ?? $metaDescription;
        $keywords = $this->cleanString($catSeo['keywords'] ?? null) ?? $this->cleanString($hubSeo['keywords'] ?? null);

        $twitterCard = in_array((string) ($catSeo['twitter_card'] ?? ''), ['summary', 'summary_large_image'], true)
            ? (string) $catSeo['twitter_card']
            : (in_array((string) ($hubSeo['twitter_card'] ?? ''), ['summary', 'summary_large_image'], true)
                ? (string) $hubSeo['twitter_card']
                : 'summary_large_image');

        $categoryBannerUrl = $this->media->url($category->banner_path);
        $ogImage = $this->resolveOgImage($catSeo, $categoryBannerUrl)
            ?? $this->resolveOgImage($hubSeo, $serializedHub['banner_url'] ?? null);

        $hubAllowsIndex = (bool) ($hubSeo['robots_index'] ?? true);
        $catAllowsIndex = array_key_exists('robots_index', $catSeo) ? (bool) $catSeo['robots_index'] : $hubAllowsIndex;
        $allowIndex = $isPubliclyVisible && $catAllowsIndex;
        $robots = $allowIndex ? 'index, follow' : 'noindex, nofollow';

        $customCanonical = $this->cleanString($catSeo['canonical_url'] ?? null);
        $resolvedCanonical = ($customCanonical !== null && OnlineResourceService::isSafeHttpUrl($customCanonical))
            ? $customCanonical
            : $canonicalUrl;

        $structuredData = null;
        if ($allowIndex && (bool) ($catSeo['structured_data_enabled'] ?? ($hubSeo['structured_data_enabled'] ?? true))) {
            $links = $category->relationLoaded('activeLinks')
                ? $category->activeLinks
                : $category->activeLinks()->get();

            $itemList = [];
            $position = 1;
            /** @var OnlineResourceLink $link */
            foreach ($links as $link) {
                $itemList[] = [
                    '@type' => 'ListItem',
                    'position' => $position++,
                    'name' => $link->title,
                    'description' => $link->description,
                    'url' => $link->url,
                ];
            }

            $breadcrumbs = [
                [
                    '@type' => 'ListItem',
                    'position' => 1,
                    'name' => $hubTitle,
                    'item' => $headerMeta['hub_url'] ?? $resolvedCanonical,
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 2,
                    'name' => $category->name,
                    'item' => $resolvedCanonical,
                ],
            ];

            $structuredData = [
                '@context' => 'https://schema.org',
                '@type' => 'CollectionPage',
                'name' => $metaTitle,
                'description' => $metaDescription,
                'url' => $resolvedCanonical,
                'publisher' => [
                    '@type' => 'EducationalOrganization',
                    'name' => $schoolName,
                ],
                'breadcrumb' => [
                    '@type' => 'BreadcrumbList',
                    'itemListElement' => $breadcrumbs,
                ],
                'mainEntity' => [
                    '@type' => 'ItemList',
                    'numberOfItems' => count($itemList),
                    'itemListElement' => $itemList,
                ],
            ];
        }

        return [
            'title' => $metaTitle,
            'description' => $metaDescription,
            'keywords' => $keywords,
            'og_title' => $ogTitle,
            'og_description' => $ogDescription,
            'og_image' => $ogImage,
            'og_type' => 'website',
            'og_url' => $currentUrl,
            'site_name' => $schoolName,
            'twitter_card' => $twitterCard,
            'canonical_url' => $allowIndex ? $resolvedCanonical : null,
            'robots' => $robots,
            'allow_indexing' => $allowIndex,
            'structured_data' => $structuredData,
        ];
    }

    /**
     * @param  array<string, mixed>  $seoConfig
     */
    private function resolveOgImage(array $seoConfig, mixed $fallbackBannerUrl): ?string
    {
        $uploaded = $this->media->url(is_string($seoConfig['og_image_path'] ?? null) ? $seoConfig['og_image_path'] : null);
        if ($uploaded !== null) {
            return $uploaded;
        }

        $external = $this->cleanString($seoConfig['og_image_url'] ?? null);
        if ($external !== null && OnlineResourceService::isSafeHttpUrl($external)) {
            return $external;
        }

        return is_string($fallbackBannerUrl) && $fallbackBannerUrl !== '' ? $fallbackBannerUrl : null;
    }

    private function cleanString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = mb_trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
