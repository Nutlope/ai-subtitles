import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath.path);

/* ── FFmpeg utilities ── */

export async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(videoPath)) {
            return reject(new Error('Media file not found. It may have expired.'));
        }

        const dir = path.dirname(audioPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        ffmpeg(videoPath)
            .outputOptions(['-vn', '-acodec libmp3lame', '-ac 1', '-ar 16000'])
            .on('error', (err) => {
                console.error('FFmpeg Extract Error:', err);
                reject(err);
            })
            .on('end', () => resolve())
            .save(audioPath);
    });
}

export async function burnSubtitles(
    videoPath: string,
    srtPath: string,
    outputPath: string,
    options?: { targetHeight?: number; fontsDir?: string; aspectRatio?: string },
    onProgress?: (p: { percent: number }) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(videoPath)) return reject(new Error('Video path missing'));
        if (!fs.existsSync(srtPath)) return reject(new Error('SRT path missing'));

        const safeSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "'\\''");
        const filters: string[] = [];

        if (options?.targetHeight) {
            filters.push(`scale=-2:'if(lt(ih,${options.targetHeight}),${options.targetHeight},ih)':flags=lanczos`);
        } else {
            // Cap at 720p — encoding 1080p+ is too slow on serverless vCPUs
            filters.push(`scale=-2:'if(gt(ih,720),720,ih)':flags=fast_bilinear`);
        }

        // Aspect ratio padding — adds black bars to match target ratio (never crops)
        if (options?.aspectRatio) {
            const parts = options.aspectRatio.split(':').map(Number);
            if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
                const [aw, ah] = parts;
                filters.push(
                    `pad=width='max(iw\\,ih*${aw}/${ah})':height='max(ih\\,iw*${ah}/${aw})'` +
                    `:x='(ow-iw)/2':y='(oh-ih)/2':color=black`
                );
            }
        }

        let subtitleFilter = `subtitles='${safeSrtPath}'`;
        if (options?.fontsDir) {
            const safeFontsDir = options.fontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');
            subtitleFilter += `:fontsdir='${safeFontsDir}'`;
        }
        subtitleFilter += `:force_style='Fontname=Noto Sans,Fontsize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=25'`;
        filters.push(subtitleFilter);

        console.log(`[burn] SRT size: ${fs.statSync(srtPath).size} bytes, filter: ${filters.join(',')}`);

        ffmpeg(videoPath)
            .videoFilters(filters)
            .outputOptions([
                '-c:v libx264',
                '-crf 28',
                '-preset ultrafast',
                '-threads 0',
                '-pix_fmt yuv420p',
                '-c:a copy',
                '-movflags +faststart',
            ])
            .on('progress', (p) => {
                const pct = typeof p.percent === 'number' && !isNaN(p.percent) ? p.percent : 0;
                onProgress?.({ percent: pct });
            })
            .on('error', (err) => {
                console.error('FFmpeg Burn Error:', err);
                reject(err);
            })
            .on('end', () => resolve())
            .save(outputPath);
    });
}
