<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $category->name }} — QR Poster</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            padding: 36px;
        }
        .poster {
            border: 2px solid #e2e8f0;
            border-radius: 20px;
            padding: 36px 40px;
            min-height: 980px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .header {
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 24px;
        }
        .badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #1d4ed8;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 999px;
            padding: 5px 14px;
            margin-bottom: 14px;
        }
        .school-name {
            font-size: 15px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 8px;
        }
        .title {
            font-size: 34px;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #0f172a;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 15px;
            color: #475569;
            max-width: 560px;
            margin: 0 auto;
            line-height: 1.5;
        }
        .qr-section {
            text-align: center;
            padding: 32px 0;
        }
        .qr-frame {
            display: inline-block;
            padding: 20px;
            border: 2px solid #0f172a;
            border-radius: 20px;
            background: #ffffff;
        }
        .qr-frame svg {
            display: block;
            width: 310px;
            height: 310px;
        }
        .scan-label {
            margin-top: 18px;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
        }
        .url-pill {
            display: inline-block;
            margin-top: 8px;
            padding: 8px 16px;
            border-radius: 10px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 13px;
            color: #334155;
            word-break: break-all;
        }
        .preview {
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
        .preview-title {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 10px;
        }
        .links-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
        }
        .link-item {
            font-size: 13px;
            color: #1e293b;
            padding: 6px 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
        }
        .link-host {
            display: block;
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="poster">
        <div class="header">
            <div class="badge">{{ $headerMeta['badge'] ?? 'Online Resources' }}</div>
            <div class="school-name">
                {{ $headerMeta['school_name'] ?? config('app.name') }}
                @if (! empty($headerMeta['title']) && ($headerMeta['scope'] ?? 'school') !== 'school')
                    &middot; {{ $headerMeta['title'] }}
                @endif
            </div>
            <h1 class="title">{{ $category->name }}</h1>
            @if ($category->description)
                <p class="subtitle">{{ $category->description }}</p>
            @endif
        </div>

        <div class="qr-section">
            <div class="qr-frame">
                {!! $qrSvg !!}
            </div>
            <div class="scan-label">Scan with your phone camera for instant access</div>
            <div class="url-pill">{{ $qrUrl }}</div>
        </div>

        <div class="preview">
            <div class="preview-title">
                Included Resources ({{ $totalLinksCount }})
            </div>
            @if ($links->isNotEmpty())
                <div class="links-grid">
                    @foreach ($links as $link)
                        <div class="link-item">
                            <strong>{{ $link->title }}</strong>
                            @if ($link->displayHost() !== '')
                                <span class="link-host">{{ $link->displayHost() }}</span>
                            @endif
                        </div>
                    @endforeach
                </div>
            @endif
            <div class="footer">
                Links can be updated anytime without reprinting this QR code &middot; Access: {{ $category->visibility->label() }}
            </div>
        </div>
    </div>
</body>
</html>
