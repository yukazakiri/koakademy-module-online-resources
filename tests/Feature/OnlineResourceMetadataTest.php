<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Http;
use Modules\OnlineResources\Services\OnlineResourceMetadataService;

function makePublicMetadataService(): OnlineResourceMetadataService
{
    return new OnlineResourceMetadataService(
        dnsResolver: static fn (string $host): array => match ($host) {
            'private.example.test' => ['10.0.0.15'],
            'cgnat.example.test' => ['100.64.1.5'],
            'metadata-alias.example.test' => ['169.254.169.254'],
            'mixed.example.test' => ['93.184.216.34', '127.0.0.1'],
            default => ['93.184.216.34'],
        },
    );
}

it('extracts og:title with priority over title tag and decodes entities', function (): void {
    Http::fake([
        'https://docs.example.edu/handbook' => Http::response(
            '<!doctype html><html><head>'
            .'<title>Fallback Page Title</title>'
            .'<meta property="og:title" content="Student &amp; Faculty Handbook — 2026">'
            .'<meta property="og:description" content="Official campus guide &amp; policies.">'
            .'</head><body>Hello</body></html>',
            200,
            ['Content-Type' => 'text/html; charset=UTF-8'],
        ),
    ]);

    $result = makePublicMetadataService()->resolve('https://docs.example.edu/handbook');

    expect($result)->toBe([
        'title' => 'Student & Faculty Handbook — 2026',
        'description' => 'Official campus guide & policies.',
        'source' => 'page',
    ]);
});

it('falls back to the HTML title tag when og:title is absent', function (): void {
    Http::fake([
        'https://library.example.edu/catalog' => Http::response(
            '<html><head><title>  Main Campus   Library Catalog  </title></head></html>',
            200,
            ['Content-Type' => 'text/html'],
        ),
    ]);

    $result = makePublicMetadataService()->resolve('https://library.example.edu/catalog');

    expect($result['title'])->toBe('Main Campus Library Catalog')
        ->and($result['source'])->toBe('page');
});

it('extracts humanized titles from Content-Disposition headers for downloadable files', function (): void {
    Http::fake([
        'https://files.example.edu/download/42' => Http::response(
            '%PDF-1.7 binary content',
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="CS101_Midterm_Study-Guide.pdf"',
            ],
        ),
    ]);

    $result = makePublicMetadataService()->resolve('https://files.example.edu/download/42');

    expect($result['title'])->toBe('CS101 Midterm Study Guide')
        ->and($result['source'])->toBe('page');
});

it('ignores generic bot-challenge titles and falls back to a URL-derived title', function (): void {
    Http::fake([
        'https://portal.example.edu/resources/student-enrollment-guide' => Http::response(
            '<html><head><title>Just a moment...</title></head></html>',
            200,
            ['Content-Type' => 'text/html'],
        ),
    ]);

    $result = makePublicMetadataService()->resolve('https://portal.example.edu/resources/student-enrollment-guide');

    expect($result['title'])->toBe('Student Enrollment Guide')
        ->and($result['source'])->toBe('url');
});

it('follows safe public redirects and blocks redirects to private or metadata addresses', function (): void {
    Http::fake([
        'https://short.example.edu/go' => Http::response('', 302, [
            'Location' => 'https://target.example.edu/syllabus',
        ]),
        'https://target.example.edu/syllabus' => Http::response(
            '<html><head><title>Introduction to Computer Science</title></head></html>',
            200,
            ['Content-Type' => 'text/html'],
        ),
        'https://evil.example.edu/bounce' => Http::response('', 302, [
            'Location' => 'http://169.254.169.254/latest/meta-data/',
        ]),
    ]);

    $service = makePublicMetadataService();

    $safe = $service->resolve('https://short.example.edu/go');
    expect($safe['title'])->toBe('Introduction to Computer Science')
        ->and($safe['source'])->toBe('page');

    $blocked = $service->resolve('https://evil.example.edu/bounce');
    expect($blocked['title'])->toBe('Bounce')
        ->and($blocked['source'])->toBe('url');

    Http::assertNotSent(static fn ($request): bool => str_contains($request->url(), '169.254.169.254'));
});

it('blocks SSRF targets without sending HTTP requests and still derives a safe fallback title', function (string $url, string $expectedFallback): void {
    Http::fake();

    $result = makePublicMetadataService()->resolve($url);

    Http::assertNothingSent();

    expect($result['title'])->toBe($expectedFallback)
        ->and($result['source'])->toBe('url');
})->with([
    'localhost' => ['http://localhost/campus-portal', 'Campus Portal'],
    'loopback IP' => ['http://127.0.0.1/student-handbook.pdf', 'Student Handbook'],
    'cloud metadata IP' => ['http://169.254.169.254/latest/meta-data', 'Meta Data'],
    'metadata hostname' => ['http://metadata.google.internal/computeMetadata', 'Compute Metadata'],
    'DNS resolving to RFC1918' => ['https://private.example.test/lab-notes', 'Lab Notes'],
    'DNS resolving to CGNAT' => ['https://cgnat.example.test/course-slides', 'Course Slides'],
    'DNS resolving to metadata IP' => ['https://metadata-alias.example.test/docs', 'Docs'],
    'DNS returning mixed public and loopback IPs' => ['https://mixed.example.test/study-pack', 'Study Pack'],
    'non-standard port' => ['https://portal.example.edu:8443/student-portal', 'Student Portal'],
]);

it('derives clean titles from known educational platforms and file URLs', function (string $url, string $expected): void {
    $service = makePublicMetadataService();

    expect($service->titleFromUrl($url))->toBe($expected);
})->with([
    'Google Docs' => ['https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit', 'Google Docs'],
    'Google Sheets' => ['https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit', 'Google Sheets'],
    'Google Slides' => ['https://docs.google.com/presentation/d/abc123/edit', 'Google Slides'],
    'Google Forms' => ['https://docs.google.com/forms/d/e/1FAIpQLSe/viewform', 'Google Forms'],
    'Google Scholar' => ['https://scholar.google.com/', 'Google Scholar'],
    'GitHub repository' => ['https://github.com/yukazakiri/koakademy', 'yukazakiri/koakademy — GitHub'],
    'PDF filename' => ['https://school.edu.ph/uploads/STEM_Physics_Week-03.pdf', 'STEM Physics Week 03'],
    'Root domain' => ['https://library.harvard.edu/', 'Library Harvard'],
]);
