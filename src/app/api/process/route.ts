import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit } from '@/lib/rate-limit';
import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from '@/lib/limits';
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

            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    { error: `File too large. Maximum size is ${MAX_FILE_SIZE_LABEL}.` },
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
            const { mediaUrl, blobUrl } = body;
            const sourceUrl = blobUrl || mediaUrl;

            if (!sourceUrl) {
                return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
            }

            // Detect URL type: direct media file or blob upload
            const urlLower = sourceUrl.toLowerCase();
            const isBlobUpload = urlLower.includes('.blob.vercel-storage.com') || urlLower.includes('.blob.core.windows.net');
            const isDirectMedia = /\.(mp4|webm|mov|mp3|wav)(\?.*)?$/i.test(urlLower) || isBlobUpload;

            if (isBlobUpload) {
                // Blob uploads: skip downloading here — downstream routes
                // will fetch from Blob on demand via ensureLocalFile.
                const urlExt = urlLower.match(/\.(mp4|webm|mov|mp3|wav)/)?.[1] || 'mp4';
                console.log(`Blob upload registered for job ${jobId}, skipping eager download`);
                return NextResponse.json({ jobId, status: 'success', type: 'blob', ext: urlExt });

            } else if (isDirectMedia) {
                // Non-blob direct media URLs: download eagerly
                const urlExt = urlLower.match(/\.(mp4|webm|mov|mp3|wav)/)?.[1] || 'mp4';
                const filePath = path.join(baseTempDir, `${jobId}.${urlExt}`);

                console.log(`Fetching direct URL for job ${jobId}...`);
                const response = await fetch(sourceUrl, { cache: 'no-store' });
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

            } else {
                return NextResponse.json(
                    { error: 'Unsupported URL. Please provide a direct video or audio URL.' },
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
