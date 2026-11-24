<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Services;

use Closure;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Psr\Http\Message\StreamInterface;
use Throwable;

final class OnlineResourceMetadataService
{
    private const int MAX_REDIRECTS = 3;

    private const int MAX_BODY_BYTES = 65536;

    private const int MAX_TITLE_LENGTH = 160;

    private const int MAX_DESCRIPTION_LENGTH = 500;

    /**
     * @var list<string>
     */
    private const array BLOCKED_HOSTS = [
        'localhost',
        'localhost.localdomain',
        'ip6-localhost',
        'ip6-loopback',
        'metadata',
        'metadata.google.internal',
        'metadata.goog',
        'instance-data',
        'instance-data.ec2.internal',
    ];

    /**
     * @var list<string>
     */
    private const array NON_PUBLIC_CIDRS = [
        '0.0.0.0/8',
        '10.0.0.0/8',
        '100.64.0.0/10',
        '100.100.100.200/32',
        '127.0.0.0/8',
        '169.254.0.0/16',
        '172.16.0.0/12',
        '192.0.0.0/24',
        '192.0.2.0/24',
        '192.168.0.0/16',
        '198.18.0.0/15',
        '198.51.100.0/24',
        '203.0.113.0/24',
        '224.0.0.0/4',
        '240.0.0.0/4',
        '255.255.255.255/32',
        '::/128',
        '::1/128',
        '::ffff:0:0/96',
        '64:ff9b::/96',
        '100::/64',
        '2001::/32',
        '2001:10::/28',
        '2001:db8::/32',
        '2002::/16',
        'fc00::/7',
        'fe80::/10',
        'ff00::/8',
    ];

    /**
     * @var list<string>
     */
    private const array GENERIC_BLOCKED_TITLES = [
        'just a moment...',
        'just a moment',
        'attention required!',
        'access denied',
        '403 forbidden',
        '404 not found',
        'page not found',
        'not found',
        'forbidden',
        'error',
        'robot or human?',
        'verify you are human',
        'please wait...',
        'loading...',
        'redirecting...',
        'sign in',
        'log in',
        'login',
    ];

    /**
     * @var list<string>
     */
    private const array GENERIC_PATH_SEGMENTS = [
        'edit',
        'view',
        'preview',
        'index',
        'home',
        'default',
        'download',
        'watch',
        'open',
        'share',
        'pub',
        'embed',
        'd',
        'u',
        'p',
        'r',
        's',
    ];

    /**
     * Optional DNS resolver override for deterministic testing.
     *
     * @var (Closure(string): list<string>)|null
     */
    private ?Closure $dnsResolver;

    /**
     * @param  (Closure(string): list<string>)|null  $dnsResolver
     */
    public function __construct(?Closure $dnsResolver = null)
    {
        $this->dnsResolver = $dnsResolver;
    }

    /**
     * Resolve metadata (title & optional description) for a resource URL.
     * Falls back cleanly to a human-readable title derived from the URL when
     * remote fetching is blocked, unsupported, or fails.
     *
     * @return array{title: ?string, description: ?string, source: string}
     */
    public function resolve(string $url): array
    {
        $trimmed = mb_trim($url);

        if (! OnlineResourceService::isSafeHttpUrl($trimmed)) {
            return [
                'title' => null,
                'description' => null,
                'source' => 'none',
            ];
        }

        $fetched = $this->fetchRemoteMetadata($trimmed);

        if ($fetched !== null && $fetched['title'] !== null) {
            return [
                'title' => $fetched['title'],
                'description' => $fetched['description'],
                'source' => 'page',
            ];
        }

        $fallbackTitle = $this->titleFromUrl($trimmed);

        return [
            'title' => $fallbackTitle,
            'description' => $fetched['description'] ?? null,
            'source' => $fallbackTitle !== null ? 'url' : 'none',
        ];
    }

    /**
     * Derive a clean, human-readable title directly from a URL when remote
     * HTML metadata is unavailable.
     */
    public function titleFromUrl(string $url): ?string
    {
        $parts = parse_url(mb_trim($url));

        if (! is_array($parts)) {
            return null;
        }

        $host = mb_strtolower((string) ($parts['host'] ?? ''));
        $path = (string) ($parts['path'] ?? '');

        if ($host === '') {
            return null;
        }

        $normalizedHost = preg_replace('/^www\./i', '', $host) ?? $host;

        $knownTitle = $this->knownPlatformTitle($normalizedHost, $path);
        if ($knownTitle !== null) {
            return $this->cleanText($knownTitle, self::MAX_TITLE_LENGTH);
        }

        $segments = array_values(array_filter(
            explode('/', $path),
            static fn (string $segment): bool => mb_trim($segment) !== '',
        ));

        for ($i = count($segments) - 1; $i >= 0; $i--) {
            $candidate = $this->humanizeSegment($segments[$i]);
            if ($candidate !== null) {
                return $this->cleanText($candidate, self::MAX_TITLE_LENGTH);
            }
        }

        return $this->cleanText($this->humanizeHost($normalizedHost), self::MAX_TITLE_LENGTH);
    }

    /**
     * Validate that a URL is safe to fetch server-side and return its pinned public IP.
     *
     * @return array{host: string, port: int, ip: string}|null
     */
    public function resolveSafeTarget(string $url): ?array
    {
        if (preg_match('/[\x00-\x20\x7f\\\\]/', $url) === 1) {
            return null;
        }

        $parts = parse_url($url);
        if (! is_array($parts)) {
            return null;
        }

        $scheme = mb_strtolower((string) ($parts['scheme'] ?? ''));
        if (! in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        if (isset($parts['user']) || isset($parts['pass'])) {
            return null;
        }

        $port = isset($parts['port']) ? (int) $parts['port'] : ($scheme === 'https' ? 443 : 80);
        if (! in_array($port, [80, 443], true)) {
            return null;
        }

        $host = mb_rtrim(mb_strtolower((string) ($parts['host'] ?? '')), '.');
        $host = trim($host, '[]');

        if ($host === '' || $this->isBlockedHostname($host)) {
            return null;
        }

        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            return $this->isPublicIp($host)
                ? ['host' => $host, 'port' => $port, 'ip' => $host]
                : null;
        }

        $ips = $this->resolveHostIps($host);
        if ($ips === []) {
            return null;
        }

        foreach ($ips as $ip) {
            if (! $this->isPublicIp($ip)) {
                return null;
            }
        }

        return [
            'host' => $host,
            'port' => $port,
            'ip' => $ips[0],
        ];
    }

    /**
     * @return array{title: ?string, description: ?string}|null
     */
    private function fetchRemoteMetadata(string $url): ?array
    {
        $currentUrl = $url;

        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            $target = $this->resolveSafeTarget($currentUrl);
            if ($target === null) {
                return null;
            }

            try {
                $options = [
                    'allow_redirects' => false,
                    'stream' => true,
                ];

                if (defined('CURLOPT_RESOLVE')) {
                    $pinIp = str_contains($target['ip'], ':') ? "[{$target['ip']}]" : $target['ip'];
                    $options['curl'] = [
                        CURLOPT_RESOLVE => ["{$target['host']}:{$target['port']}:{$pinIp}"],
                    ];
                }

                $response = Http::withHeaders([
                    'Accept' => 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
                    'Accept-Language' => 'en-US,en;q=0.9',
                    'User-Agent' => 'Mozilla/5.0 (compatible; KoAkademy-ResourceBot/1.0)',
                ])
                    ->withOptions($options)
                    ->connectTimeout(2)
                    ->timeout(4)
                    ->get($currentUrl);
            } catch (Throwable) {
                return null;
            }

            $status = $response->status();

            if (in_array($status, [301, 302, 303, 307, 308], true)) {
                $location = $response->header('Location');
                if ($location === '' || $hop === self::MAX_REDIRECTS) {
                    return null;
                }

                $nextUrl = $this->resolveRedirectUrl($currentUrl, $location);
                if ($nextUrl === null) {
                    return null;
                }

                $currentUrl = $nextUrl;

                continue;
            }

            if (! $response->successful()) {
                return null;
            }

            $contentType = mb_strtolower($response->header('Content-Type'));
            $isHtml = $contentType === ''
                || str_contains($contentType, 'text/html')
                || str_contains($contentType, 'application/xhtml+xml');

            if (! $isHtml) {
                $filename = $this->filenameFromContentDisposition($response->header('Content-Disposition'));

                return [
                    'title' => $filename !== null ? $this->humanizeSegment($filename) : null,
                    'description' => null,
                ];
            }

            $html = $this->readLimitedBody($response->toPsrResponse()->getBody());
            if ($html === '') {
                return null;
            }

            $charset = $this->detectCharset($contentType, $html);
            if ($charset !== null && ! in_array(mb_strtoupper($charset), ['UTF-8', 'UTF8'], true)) {
                $converted = @mb_convert_encoding($html, 'UTF-8', $charset);
                if (is_string($converted) && $converted !== '') {
                    $html = $converted;
                }
            }

            $title = $this->extractHtmlTitle($html);
            $description = $this->extractHtmlDescription($html);

            if ($title !== null && $this->isGenericBlockedTitle($title)) {
                $title = null;
            }

            return [
                'title' => $title,
                'description' => $description,
            ];
        }

        return null;
    }

    private function readLimitedBody(StreamInterface $stream): string
    {
        $buffer = '';

        while (! $stream->eof() && strlen($buffer) < self::MAX_BODY_BYTES) {
            $remaining = self::MAX_BODY_BYTES - strlen($buffer);
            $chunk = $stream->read(min(8192, $remaining));
            if ($chunk === '') {
                break;
            }

            $buffer .= $chunk;

            if (stripos($buffer, '</head>') !== false) {
                break;
            }
        }

        return $buffer;
    }

    private function extractHtmlTitle(string $html): ?string
    {
        $metaTitle = $this->extractMetaContent($html, 'property', 'og:title')
            ?? $this->extractMetaContent($html, 'name', 'twitter:title')
            ?? $this->extractMetaContent($html, 'name', 'title');

        if ($metaTitle !== null) {
            return $this->cleanText($metaTitle, self::MAX_TITLE_LENGTH);
        }

        if (preg_match('/<title\b[^>]*>(.*?)<\/title>/is', $html, $matches) === 1) {
            return $this->cleanText(strip_tags($matches[1]), self::MAX_TITLE_LENGTH);
        }

        return null;
    }

    private function extractHtmlDescription(string $html): ?string
    {
        $metaDescription = $this->extractMetaContent($html, 'property', 'og:description')
            ?? $this->extractMetaContent($html, 'name', 'description')
            ?? $this->extractMetaContent($html, 'name', 'twitter:description');

        if ($metaDescription === null) {
            return null;
        }

        return $this->cleanText($metaDescription, self::MAX_DESCRIPTION_LENGTH);
    }

    private function extractMetaContent(string $html, string $attribute, string $value): ?string
    {
        if (preg_match_all('/<meta\b[^>]*>/i', $html, $tags) === false) {
            return null;
        }

        $targetAttr = mb_strtolower($attribute);
        $targetValue = mb_strtolower($value);

        foreach ($tags[0] as $tag) {
            $attrValue = $this->extractHtmlAttribute($tag, $targetAttr);
            if ($attrValue === null || mb_strtolower(mb_trim($attrValue)) !== $targetValue) {
                continue;
            }

            $content = $this->extractHtmlAttribute($tag, 'content');
            if ($content !== null && mb_trim($content) !== '') {
                return $content;
            }
        }

        return null;
    }

    private function extractHtmlAttribute(string $tag, string $attribute): ?string
    {
        $pattern = '/\b'.preg_quote($attribute, '/').'\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s"\'=<>`]+))/i';

        if (preg_match($pattern, $tag, $matches) !== 1) {
            return null;
        }

        return $matches[1] !== '' ? $matches[1] : ($matches[2] !== '' ? $matches[2] : ($matches[3] ?? ''));
    }

    private function detectCharset(string $contentType, string $html): ?string
    {
        if (preg_match('/charset\s*=\s*["\']?([a-z0-9\-_]+)/i', $contentType, $matches) === 1) {
            return $matches[1];
        }

        if (preg_match('/<meta[^>]+charset\s*=\s*["\']?([a-z0-9\-_]+)/i', $html, $matches) === 1) {
            return $matches[1];
        }

        return null;
    }

    private function filenameFromContentDisposition(string $header): ?string
    {
        if ($header === '') {
            return null;
        }

        if (preg_match("/filename\*\s*=\s*UTF-8''([^;\r\n]+)/i", $header, $matches) === 1) {
            return rawurldecode(trim($matches[1], "\"' "));
        }

        if (preg_match('/filename\s*=\s*(?:"([^"]+)"|([^;\r\n]+))/i', $header, $matches) === 1) {
            $raw = $matches[1] !== '' ? $matches[1] : ($matches[2] ?? '');

            return trim($raw, "\"' ");
        }

        return null;
    }

    private function cleanText(string $value, int $maxLength): ?string
    {
        $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $normalized = preg_replace('/[\x00-\x1f\x7f]+/u', ' ', $decoded) ?? $decoded;
        $normalized = preg_replace('/\s+/u', ' ', $normalized) ?? $normalized;
        $normalized = mb_trim($normalized);

        if ($normalized === '') {
            return null;
        }

        return Str::limit($normalized, $maxLength, '');
    }

    private function isGenericBlockedTitle(string $title): bool
    {
        $lower = mb_strtolower(mb_trim($title));

        if (in_array($lower, self::GENERIC_BLOCKED_TITLES, true)) {
            return true;
        }

        return str_contains($lower, 'cloudflare') && str_contains($lower, 'attention required');
    }

    private function knownPlatformTitle(string $host, string $path): ?string
    {
        $lowerPath = mb_strtolower($path);

        if ($host === 'docs.google.com') {
            return match (true) {
                str_starts_with($lowerPath, '/document') => 'Google Docs',
                str_starts_with($lowerPath, '/spreadsheets') => 'Google Sheets',
                str_starts_with($lowerPath, '/presentation') => 'Google Slides',
                str_starts_with($lowerPath, '/forms') => 'Google Forms',
                default => 'Google Docs',
            };
        }

        if ($host === 'github.com') {
            $segments = array_values(array_filter(explode('/', $path), static fn (string $s): bool => $s !== ''));
            if (count($segments) >= 2) {
                return $segments[0].'/'.$segments[1].' — GitHub';
            }

            return 'GitHub';
        }

        return match ($host) {
            'drive.google.com' => 'Google Drive',
            'scholar.google.com' => 'Google Scholar',
            'classroom.google.com' => 'Google Classroom',
            'meet.google.com' => 'Google Meet',
            'forms.gle' => 'Google Forms',
            'youtube.com', 'm.youtube.com', 'youtu.be' => 'YouTube',
            'khanacademy.org' => 'Khan Academy',
            'canva.com' => 'Canva',
            'figma.com' => 'Figma',
            'notion.so', 'notion.site' => 'Notion',
            'coursera.org' => 'Coursera',
            'edx.org' => 'edX',
            default => null,
        };
    }

    private function humanizeSegment(string $segment): ?string
    {
        $decoded = mb_trim(rawurldecode($segment));
        if ($decoded === '') {
            return null;
        }

        $withoutExt = preg_replace('/\.(html?|php|aspx?|jsp|pdf|docx?|pptx?|xlsx?|csv|txt|md)$/i', '', $decoded) ?? $decoded;
        $withoutExt = mb_trim($withoutExt);

        if ($withoutExt === '' || in_array(mb_strtolower($withoutExt), self::GENERIC_PATH_SEGMENTS, true)) {
            return null;
        }

        // Ignore opaque IDs (UUIDs, long random hashes, or pure numbers).
        if (
            preg_match('/^\d+$/', $withoutExt) === 1
            || preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $withoutExt) === 1
            || (strlen($withoutExt) >= 20 && preg_match('/^[A-Za-z0-9_-]+$/', $withoutExt) === 1 && ! str_contains($withoutExt, '-') && ! str_contains($withoutExt, '_'))
        ) {
            return null;
        }

        $spaced = preg_replace('/[-_+]+/', ' ', $withoutExt) ?? $withoutExt;
        $spaced = preg_replace('/([a-z])([A-Z])/', '$1 $2', $spaced) ?? $spaced;
        $spaced = preg_replace('/\s+/', ' ', mb_trim($spaced)) ?? mb_trim($spaced);

        if ($spaced === '' || preg_match('/[A-Za-z0-9]/', $spaced) !== 1) {
            return null;
        }

        return $this->smartTitleCase($spaced);
    }

    private function humanizeHost(string $host): string
    {
        $parts = explode('.', $host);

        if (count($parts) >= 3 && in_array(end($parts), ['uk', 'ph', 'au', 'jp', 'nz', 'za', 'br', 'in', 'sg'], true) && in_array($parts[count($parts) - 2], ['edu', 'ac', 'gov', 'org', 'co', 'com'], true)) {
            array_splice($parts, -2);
        } elseif (count($parts) >= 2) {
            array_pop($parts);
        }

        $label = implode(' ', array_filter($parts, static fn (string $part): bool => $part !== ''));

        return $this->smartTitleCase(str_replace(['-', '_'], ' ', $label !== '' ? $label : $host));
    }

    private function smartTitleCase(string $text): string
    {
        $words = preg_split('/\s+/', mb_trim($text)) ?: [];
        $result = [];

        foreach ($words as $index => $word) {
            if ($word === '') {
                continue;
            }

            // Preserve intentional uppercase acronyms / course codes like CS101, LMS, PDF, STEM.
            if (preg_match('/^[A-Z0-9]{2,8}$/', $word) === 1) {
                $result[] = $word;

                continue;
            }

            $lower = mb_strtolower($word);
            if ($index > 0 && in_array($lower, ['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'via'], true)) {
                $result[] = $lower;

                continue;
            }

            $result[] = mb_strtoupper(mb_substr($lower, 0, 1)).mb_substr($lower, 1);
        }

        return implode(' ', $result);
    }

    private function resolveRedirectUrl(string $baseUrl, string $location): ?string
    {
        $location = mb_trim($location);
        if ($location === '') {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $location) === 1) {
            return OnlineResourceService::isSafeHttpUrl($location) ? $location : null;
        }

        $base = parse_url($baseUrl);
        if (! is_array($base) || ! isset($base['scheme'], $base['host'])) {
            return null;
        }

        $port = isset($base['port']) ? ':'.$base['port'] : '';

        if (str_starts_with($location, '//')) {
            $resolved = $base['scheme'].':'.$location;
        } elseif (str_starts_with($location, '/')) {
            $resolved = $base['scheme'].'://'.$base['host'].$port.$location;
        } else {
            $basePath = (string) ($base['path'] ?? '/');
            $dir = str_contains($basePath, '/') ? substr($basePath, 0, (int) strrpos($basePath, '/') + 1) : '/';
            $resolved = $base['scheme'].'://'.$base['host'].$port.$dir.$location;
        }

        return OnlineResourceService::isSafeHttpUrl($resolved) ? $resolved : null;
    }

    private function isBlockedHostname(string $host): bool
    {
        if (in_array($host, self::BLOCKED_HOSTS, true)) {
            return true;
        }

        foreach (['.localhost', '.local', '.internal', '.localdomain', '.home.arpa'] as $suffix) {
            if (str_ends_with($host, $suffix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private function resolveHostIps(string $host): array
    {
        if ($this->dnsResolver !== null) {
            return ($this->dnsResolver)($host);
        }

        $ips = [];

        if (function_exists('dns_get_record')) {
            $records = @dns_get_record($host, DNS_A | DNS_AAAA);
            if (is_array($records)) {
                foreach ($records as $record) {
                    $ip = $record['ip'] ?? $record['ipv6'] ?? null;
                    if (is_string($ip) && filter_var($ip, FILTER_VALIDATE_IP) !== false) {
                        $ips[] = $ip;
                    }
                }
            }
        }

        if ($ips === []) {
            $resolved = @gethostbynamel($host);
            if (is_array($resolved)) {
                foreach ($resolved as $ip) {
                    if (is_string($ip) && filter_var($ip, FILTER_VALIDATE_IP) !== false) {
                        $ips[] = $ip;
                    }
                }
            }
        }

        return array_values(array_unique($ips));
    }

    private function isPublicIp(string $ip): bool
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return false;
        }

        foreach (self::NON_PUBLIC_CIDRS as $cidr) {
            if ($this->ipInCidr($ip, $cidr)) {
                return false;
            }
        }

        return true;
    }

    private function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $prefixLength] = explode('/', $cidr, 2);
        $ipBin = @inet_pton($ip);
        $subnetBin = @inet_pton($subnet);

        if ($ipBin === false || $subnetBin === false || strlen($ipBin) !== strlen($subnetBin)) {
            return false;
        }

        $prefix = (int) $prefixLength;
        $fullBytes = intdiv($prefix, 8);
        $remainingBits = $prefix % 8;

        if ($fullBytes > 0 && substr($ipBin, 0, $fullBytes) !== substr($subnetBin, 0, $fullBytes)) {
            return false;
        }

        if ($remainingBits === 0) {
            return true;
        }

        $mask = (0xFF << (8 - $remainingBits)) & 0xFF;

        return (ord($ipBin[$fullBytes]) & $mask) === (ord($subnetBin[$fullBytes]) & $mask);
    }
}
