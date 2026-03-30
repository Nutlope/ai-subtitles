import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo } from '@/lib/video-utils';
import { rateLimit } from '@/lib/rate-limit';
import fs from 'fs';
import path from 'path';

const limiter = rateLimit({ interval: 60_000, limit: 30 });

export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        const { success } = limiter.check(ip);
        if (!success) {
            return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
        }

        const jobId = req.nextUrl.searchParams.get('jobId');
        if (!jobId || !/^[a-zA-Z0-9-]+$/.test(jobId)) {
            return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
        }

        const baseTempDir = process.env.NODE_ENV === 'production'
            ? path.join('/tmp', 'substudio')
            : path.join(process.cwd(), 'public', 'temp');
        const videoPath = path.join(baseTempDir, `${jobId}.mp4`);

        if (!fs.existsSync(videoPath)) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        const info = await getVideoInfo(videoPath);
        return NextResponse.json(info);
    } catch (error: unknown) {
        console.error("Video Info Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Error' }, { status: 500 });
    }
}
