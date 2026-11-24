<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $headerMeta['title'] ?? 'Online Resources' }} — QR Sheet</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            padding: 28px;
        }
        .top-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 22px;
        }
        .banner-text h1 {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
        }
        .banner-text p {
            font-size: 13px;
            color: #475569;
            margin-top: 4px;
        }
        .hub-qr {
            text-align: center;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 8px 12px;
        }
        .hub-qr svg {
            width: 84px;
            height: 84px;
            display: block;
            margin: 0 auto;
        }
        .hub-qr span {
            display: block;
            font-size: 10px;
            font-weight: 700;
            color: #334155;
            margin-top: 4px;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .card {
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            padding: 16px;
            text-align: center;
            page-break-inside: avoid;
        }
        .card-title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
        }
        .card-desc {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 10px;
            min-height: 28px;
        }
        .card-qr svg {
            width: 150px;
            height: 150px;
            display: block;
            margin: 0 auto 8px;
        }
        .card-url {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 10px;
            color: #334155;
            word-break: break-all;
        }
        .card-meta {
            margin-top: 6px;
            font-size: 10px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="top-banner">
        <div class="banner-text">
            <h1>{{ $headerMeta['title'] ?? 'Online Resources' }} — QR Directory</h1>
            <p>{{ $headerMeta['school_name'] ?? config('app.name') }} &middot; Scan any category QR code with your phone camera</p>
        </div>
        @if ($hubQrSvg)
            <div class="hub-qr">
                {!! $hubQrSvg !!}
                <span>All Categories</span>
            </div>
        @endif
    </div>

    <div class="grid">
        @foreach ($items as $item)
            <div class="card">
                <div class="card-title">{{ $item['name'] }}</div>
                <div class="card-desc">{{ $item['description'] ?? 'Scan to view all links in this category.' }}</div>
                <div class="card-qr">{!! $item['qr_svg'] !!}</div>
                <div class="card-url">{{ $item['qr_url'] }}</div>
                <div class="card-meta">{{ $item['links_count'] }} {{ \Illuminate\Support\Str::plural('link', $item['links_count']) }} &middot; {{ $item['visibility'] }}</div>
            </div>
        @endforeach
    </div>
</body>
</html>
