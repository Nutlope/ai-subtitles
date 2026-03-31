import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import { Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

ffmpeg.setFfmpegPath(ffmpegPath.path);

/* ── YouTube helpers ── */

const YTPROXY_URL = 'https://www.ytproxy.io/api/download';

export function isYoutubeUrl(url: string): boolean {
    return /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
}

/**
 * Downloads a YouTube video via ytproxy.io and streams it to disk.
 */
export async function downloadYoutubeVideo(url: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    console.log(`[ytproxy] Downloading: ${url}`);

    const res = await fetch(YTPROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });

    if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        throw new Error(`ytproxy failed (${res.status}): ${text}`);
    }

    const fileStream = fs.createWriteStream(outputPath);
    await pipeline(Readable.fromWeb(res.body as never), fileStream);

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw new Error('ytproxy returned an empty file');
    }

    console.log(`[ytproxy] Download complete: ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
}

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
    options?: { targetHeight?: number; fontsDir?: string },
    onProgress?: (p: { percent: number }) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(videoPath)) return reject(new Error('Video path missing'));
        if (!fs.existsSync(srtPath)) return reject(new Error('SRT path missing'));

        const safeSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "'\\''");
        const filters: string[] = [];

        if (options?.targetHeight) {
            filters.push(`scale=-2:'if(lt(ih,${options.targetHeight}),${options.targetHeight},ih)':flags=lanczos`);
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
