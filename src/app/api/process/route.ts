import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { downloadYoutubeVideo, isYoutubeUrl } from '@/lib/video-utils';
import { rateLimit } from '@/lib/rate-limit';
import fs from 'fs';
import path from 'path';

export const maxDuration = 300; // 5 mins max for downloads

const limiter = rateLimit({ interval: 60_000, limit: 10 });

/** Detect file extension from MIME type or filename */
function detectExt(mimeType: string, fileName: string): string {
    if (mimeType.includes('audio/mpeg') || fileName.endsWith('.mp3')) return 'mp3';
    if (mimeType.includes('audio/wav') || fileName.endsWith('.wav')) return 'wav';
    if (mimeType.includes('audio/')) return 'mp3'; // default audio
    return 'mp4'; // default video
}

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        const { success } = limiter.check(ip);
        if (!success) {
            return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
        }

        const jobId = uuidv4();
        const baseTempDir = process.env.NODE_ENV === 'production'
            ? path.join('/tmp', 'substudio')
            : path.join(process.cwd(), 'public', 'temp');

        if (!fs.existsSync(baseTempDir)) {
            fs.mkdirSync(baseTempDir, { recursive: true });
        }

        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;

            if (!file) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }

            const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    { error: 'File too large. Maximum size is 500MB.' },
                    { status: 413 }
                );
            }

            const ext = detectExt(file.type, file.name);
            const filePath = path.join(baseTempDir, `${jobId}.${ext}`);

            const bytes = await file.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(bytes));

            return NextResponse.json({ jobId, status: 'success', type: 'upload', ext });

        } else if (contentType.includes('application/json')) {
            const body = await req.json();
            const { youtubeUrl } = body;

            if (!youtubeUrl) {
                return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
            }

            // Detect URL type: direct media file, or YouTube
            const urlLower = youtubeUrl.toLowerCase();
            const isDirectMedia = /\.(mp4|webm|mov|mp3|wav)(\?.*)?$/i.test(urlLower);

            if (isDirectMedia) {
                // Determine extension from URL
                const urlExt = urlLower.match(/\.(mp4|webm|mov|mp3|wav)/)?.[1] || 'mp4';
                const filePath = path.join(baseTempDir, `${jobId}.${urlExt}`);

                console.log(`Fetching direct URL for job ${jobId}...`);
                const response = await fetch(youtubeUrl, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`Failed to fetch media: ${response.statusText}`);
                }

                const fileStream = fs.createWriteStream(filePath);
                if (response.body) {
                    const reader = response.body.getReader();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        fileStream.write(Buffer.from(value));
                    }
                    fileStream.end();
                    await new Promise<void>((resolve) => fileStream.on('finish', () => resolve()));
                } else {
                    throw new Error("Response body is null");
                }

                return NextResponse.json({ jobId, status: 'success', type: 'url', ext: urlExt });

            } else if (isYoutubeUrl(youtubeUrl)) {
                const videoPath = path.join(baseTempDir, `${jobId}.mp4`);
                console.log(`Downloading YouTube video for job ${jobId}...`);
                await downloadYoutubeVideo(youtubeUrl, videoPath);

                return NextResponse.json({ jobId, status: 'success', type: 'url', ext: 'mp4' });

            } else {
                return NextResponse.json(
                    { error: 'Unsupported URL. Please provide a YouTube link or a direct video/audio URL.' },
                    { status: 400 }
                );
            }
        } else {
            return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 });
        }

    } catch (error: unknown) {
        console.error("API Process Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Error' }, { status: 500 });
    }
}
