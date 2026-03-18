import { NextRequest, NextResponse } from 'next/server';
import { burnSubtitles, getVideoInfo } from '@/lib/video-utils';
import fs from 'fs';
import path from 'path';

export const maxDuration = 300; // 5 mins max duration

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { jobId, srtContent, targetHeight } = body;

        if (!jobId) {
            return NextResponse.json({ error: 'No jobId provided' }, { status: 400 });
        }

        const isProduction = process.env.NODE_ENV === 'production';
        const baseTempDir = isProduction
            ? path.join('/tmp', 'substudio')
            : path.join(process.cwd(), 'public', 'temp');
        const videoPath = path.join(baseTempDir, `${jobId}.mp4`);
        const srtPath = path.join(baseTempDir, `${jobId}.srt`);
        const outputPath = path.join(baseTempDir, `${jobId}_burned.mp4`);

        if (!fs.existsSync(videoPath)) {
            return NextResponse.json({ error: 'Source video not found' }, { status: 404 });
        }

        // Write the edited SRT content to the file
        if (srtContent) {
            fs.writeFileSync(srtPath, srtContent);
        } else if (!fs.existsSync(srtPath)) {
            return NextResponse.json({ error: 'No SRT content provided or found' }, { status: 400 });
        }

        // Start burning process (this can take time)
        const enhanceOpts = targetHeight ? { targetHeight: Number(targetHeight) } : undefined;
        console.log(`Burning subtitles for ${jobId}...${enhanceOpts ? ` (upscale to ${enhanceOpts.targetHeight}p)` : ''}`);
        await burnSubtitles(videoPath, srtPath, outputPath, enhanceOpts);
        console.log(`Finished burning subtitles for ${jobId}. Output saved to ${outputPath}`);

        if (isProduction) {
            // In production (/tmp is not publicly served), stream the file back
            const fileBuffer = fs.readFileSync(outputPath);
            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Disposition': `attachment; filename="${jobId}_burned.mp4"`,
                },
            });
        }

        return NextResponse.json({
            jobId,
            status: 'success',
            outputUrl: `/temp/${jobId}_burned.mp4`
        });

    } catch (error: unknown) {
        console.error("Burn API Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Error' }, { status: 500 });
    }
}
