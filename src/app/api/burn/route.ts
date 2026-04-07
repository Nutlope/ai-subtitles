import { NextRequest, NextResponse } from 'next/server';
import { burnSubtitles } from '@/lib/video-utils';
import { rateLimit } from '@/lib/rate-limit';
import { ensureLocalFile } from '@/lib/blob-utils';
import fs from 'fs';
import path from 'path';

export const maxDuration = 300; // 5 mins max duration

const limiter = rateLimit({ interval: 60_000, limit: 5 });

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        const { success } = limiter.check(ip);
        if (!success) {
            return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
        }

        const body = await req.json();
        const { jobId, srtContent, targetHeight, aspectRatio, isSample, blobUrl } = body;

        if (!jobId || !/^[a-zA-Z0-9-]+$/.test(jobId)) {
            return NextResponse.json({ error: 'Invalid or missing jobId' }, { status: 400 });
        }

        const isProduction = process.env.NODE_ENV === 'production';
        const baseTempDir = isProduction
            ? path.join('/tmp', 'substudio')
            : path.join(process.cwd(), 'public', 'temp');

        if (!fs.existsSync(baseTempDir)) fs.mkdirSync(baseTempDir, { recursive: true });

        const videoPath = path.join(baseTempDir, `${jobId}.mp4`);
        const srtPath = path.join(baseTempDir, `${jobId}.srt`);
        const outputPath = path.join(baseTempDir, `${jobId}_burned.mp4`);

        // --- Validate inputs synchronously before starting the stream ---

        // For sample videos, copy from public/ if not already in temp
        if (!fs.existsSync(videoPath) && isSample) {
            const sampleSource = path.join(process.cwd(), 'public', 'sample-demo.mp4');
            if (fs.existsSync(sampleSource)) {
                fs.copyFileSync(sampleSource, videoPath);
            } else {
                const origin = req.headers.get('origin') || req.nextUrl.origin;
                const res = await fetch(`${origin}/sample-demo.mp4`);
                if (res.ok) {
                    fs.writeFileSync(videoPath, Buffer.from(await res.arrayBuffer()));
                }
            }
        }

        if (!fs.existsSync(videoPath)) {
            const found = await ensureLocalFile(videoPath, blobUrl);
            if (!found) {
                return NextResponse.json({ error: 'Source video not found' }, { status: 404 });
            }
        }

        if (srtContent) {
            fs.writeFileSync(srtPath, srtContent);
            console.log(`[burn] Wrote SRT (${srtContent.length} chars) to ${srtPath}`);
        } else if (!fs.existsSync(srtPath)) {
            return NextResponse.json({ error: 'No SRT content provided or found' }, { status: 400 });
        }

        // --- Set up bundled font for ffmpeg subtitle rendering ---
        const fontsDir = path.join(baseTempDir, 'fonts');
        if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true });

        const fontDest = path.join(fontsDir, 'NotoSans-Regular.ttf');
        if (!fs.existsSync(fontDest)) {
            const fontSource = path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Regular.ttf');
            if (fs.existsSync(fontSource)) {
                fs.copyFileSync(fontSource, fontDest);
            } else {
                // Fallback: fetch from own CDN
                const origin = req.headers.get('origin') || req.nextUrl.origin;
                try {
                    const res = await fetch(`${origin}/fonts/NotoSans-Regular.ttf`);
                    if (res.ok) {
                        fs.writeFileSync(fontDest, Buffer.from(await res.arrayBuffer()));
                    }
                } catch (e) {
                    console.warn('[burn] Could not fetch font from CDN:', e);
                }
            }
        }

        // --- Stream progress + video binary back to client ---
        const encoder = new TextEncoder();
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        const sendEvent = (data: Record<string, unknown>) => {
            return writer.write(encoder.encode(JSON.stringify(data) + '\n'));
        };

        // Run the burn in the background while streaming progress
        (async () => {
            try {
                await sendEvent({ stage: 'preparing', progress: 0 });

                const enhanceOpts: { targetHeight?: number; fontsDir?: string; aspectRatio?: string } = { fontsDir };
                if (targetHeight) enhanceOpts.targetHeight = Number(targetHeight);
                if (aspectRatio) enhanceOpts.aspectRatio = String(aspectRatio);

                console.log(`[burn] Starting burn for ${jobId}...${targetHeight ? ` (upscale to ${targetHeight}p)` : ''}`);

                await burnSubtitles(videoPath, srtPath, outputPath, enhanceOpts, (p) => {
                    sendEvent({ stage: 'encoding', progress: Math.round(p.percent || 0) });
                });

                console.log(`[burn] Finished burning for ${jobId}. Output: ${outputPath}`);
                await sendEvent({ stage: 'finalizing', progress: 100 });
                await sendEvent({ done: true });

                // Stream the output video binary
                const fileBuffer = fs.readFileSync(outputPath);
                await writer.write(new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength));
                await writer.close();

                // Clean up the burned file to save disk space
                try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
            } catch (err) {
                console.error('[burn] Error:', err);
                try {
                    await sendEvent({ stage: 'error', message: err instanceof Error ? err.message : 'Encoding failed' });
                    await writer.close();
                } catch { /* stream may already be closed */ }
            }
        })();

        return new Response(readable, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error: unknown) {
        console.error('[burn] Route Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Error' },
            { status: 500 }
        );
    }
}
