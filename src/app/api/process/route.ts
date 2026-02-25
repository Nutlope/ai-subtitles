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
                return NextResponse.json({ error: 'No youtubeUrl provided' }, { status: 400 });
            }

            await downloadYoutubeVideo(youtubeUrl, videoPath);

            return NextResponse.json({ jobId, status: 'success', type: 'youtube' });
        } else {
            return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 });
        }

    } catch (error: any) {
        console.error("API Process Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
