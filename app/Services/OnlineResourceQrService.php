<?php

declare(strict_types=1);

namespace Modules\OnlineResources\Services;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\Writer\SvgWriter;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Modules\OnlineResources\Models\OnlineResourceCategory;
use Modules\OnlineResources\Models\OnlineResourceLink;
use Spatie\LaravelPdf\Facades\Pdf;
use Spatie\LaravelPdf\PdfBuilder;

final class OnlineResourceQrService
{
    public function categoryUrl(OnlineResourceCategory $category): string
    {
        return route('online-resources.qr.resolve', ['shortCode' => $category->short_code]);
    }

    public function linkUrl(OnlineResourceLink $link): string
    {
        return route('online-resources.qr.go', ['shortCode' => $link->short_code]);
    }

    public function directLinkQrUrl(OnlineResourceLink $link): string
    {
        return route('online-resources.qr.resolve', ['shortCode' => $link->short_code]);
    }

    public function schoolHubUrl(Model $school): string
    {
        return route('online-resources.directory', ['schoolCode' => (string) $school->getAttribute('code')]);
    }

    public function classHubUrl(Model $class): string
    {
        return route('online-resources.class-directory', ['class' => (int) $class->getKey()]);
    }

    public function categoryPageUrl(OnlineResourceCategory $category, ?Model $owner = null): string
    {
        if ($category->owner_type === 'class') {
            return route('online-resources.class-directory', [
                'class' => $category->owner_id,
                'categorySlug' => $category->slug,
            ]);
        }

        if ($category->owner_type === 'school' && $owner instanceof Model) {
            $schoolCode = (string) $owner->getAttribute('code');
            if ($schoolCode !== '') {
                return route('online-resources.directory', [
                    'schoolCode' => $schoolCode,
                    'categorySlug' => $category->slug,
                ]);
            }
        }

        return $this->categoryUrl($category);
    }

    public function generateSvg(string $url, int $size = 320): string
    {
        $result = new Builder(
            writer: new SvgWriter,
            writerOptions: [SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true],
            validateResult: false,
            data: $url,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: $size,
            margin: 8,
            roundBlockSizeMode: RoundBlockSizeMode::Margin,
        )->build();

        return $result->getString();
    }

    public function generatePng(string $url, int $size = 512): string
    {
        $result = new Builder(
            writer: new PngWriter,
            writerOptions: [],
            validateResult: false,
            data: $url,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: $size,
            margin: 12,
            roundBlockSizeMode: RoundBlockSizeMode::Margin,
        )->build();

        return $result->getString();
    }

    public function svgResponse(string $url, string $filename, int $size = 360): Response
    {
        return response($this->generateSvg($url, $size), 200, [
            'Content-Type' => 'image/svg+xml; charset=utf-8',
            'Content-Disposition' => 'inline; filename="'.$this->safeFilename($filename).'.svg"',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    public function pngDownloadResponse(string $url, string $filename, int $size = 768): Response
    {
        return response($this->generatePng($url, $size), 200, [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'attachment; filename="'.$this->safeFilename($filename).'.png"',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    /**
     * Build a printable A4 QR poster PDF for a single category.
     *
     * @param  array<string, mixed>  $headerMeta
     */
    public function categoryPosterPdf(OnlineResourceCategory $category, array $headerMeta): PdfBuilder
    {
        $url = $this->categoryUrl($category);
        $qrSvg = $this->generateSvg($url, 420);
        $links = $category->activeLinks()->limit(8)->get();

        return Pdf::view('online-resources::pdf.qr-poster', [
            'category' => $category,
            'headerMeta' => $headerMeta,
            'qrUrl' => $url,
            'qrSvg' => $qrSvg,
            'links' => $links,
            'totalLinksCount' => $category->activeLinks()->count(),
        ])
            ->format('a4')
            ->name($this->safeFilename($category->slug.'-qr-poster').'.pdf');
    }

    /**
     * Build a multi-QR printable sheet PDF for all active categories of an owner.
     *
     * @param  Collection<int, OnlineResourceCategory>  $categories
     * @param  array<string, mixed>  $headerMeta
     */
    public function categoriesSheetPdf(Collection $categories, array $headerMeta, ?string $hubUrl = null): PdfBuilder
    {
        $items = $categories->map(function (OnlineResourceCategory $category): array {
            $url = $this->categoryUrl($category);

            return [
                'name' => $category->name,
                'description' => $category->description,
                'visibility' => $category->visibility->label(),
                'links_count' => $category->activeLinks()->count(),
                'qr_url' => $url,
                'qr_svg' => $this->generateSvg($url, 220),
            ];
        })->values()->all();

        return Pdf::view('online-resources::pdf.qr-sheet', [
            'headerMeta' => $headerMeta,
            'hubUrl' => $hubUrl,
            'hubQrSvg' => $hubUrl !== null ? $this->generateSvg($hubUrl, 160) : null,
            'items' => $items,
        ])
            ->format('a4')
            ->name($this->safeFilename(($headerMeta['title'] ?? 'online-resources').'-qr-sheet').'.pdf');
    }

    private function safeFilename(string $raw): string
    {
        $slug = Str::slug($raw);

        return $slug !== '' ? $slug : 'online-resources-qr';
    }
}
