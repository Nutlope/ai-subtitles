import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { downloadYoutubeVideo } from '@/lib/video-utils';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const jobId = uuidv4();
        const baseTempDir = path.join(process.cwd(), 'public', 'temp');

        // Ensure /public/temp directory exists
        if (!fs.existsSync(baseTempDir)) {
            fs.mkdirSync(baseTempDir, { recursive: true });
        }

        const videoPath = path.join(baseTempDir, `${jobId}.mp4`);

        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;

            if (!file) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }

            // Convert to buffer robustly
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Save to disk
            fs.writeFileSync(videoPath, buffer);

            return NextResponse.json({ jobId, status: 'success', type: 'upload' });

        } else if (contentType.includes('application/json')) {
            const body = await req.json();
            const { youtubeUrl } = body;

            if (!youtubeUrl) {
                return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
            }

            if (youtubeUrl.endsWith('.mp4') || youtubeUrl.includes('.mp4?')) {
                // Direct MP4 fetching
                console.log(`Fetching direct URL for job ${jobId}...`);
                const response = await fetch(youtubeUrl, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`Failed to fetch media: ${response.statusText}`);
                }

                const fileStream = fs.createWriteStream(videoPath);
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
            } else {
                // Assume YouTube URL
                console.log(`Downloading YouTube URL for job ${jobId}...`);
                await downloadYoutubeVideo(youtubeUrl, videoPath);
            }

            return NextResponse.json({ jobId, status: 'success', type: 'url' });
        } else {
            return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 });
        }

    } catch (error: unknown) {
        console.error("API Process Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Error' }, { status: 500 });
    }
}
