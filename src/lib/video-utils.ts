import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath.path);

/* ── YouTube helpers ── */

export function isYoutubeUrl(url: string): boolean {
    return /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
}

/** Resolve path to the bundled yt-dlp binary */
function getYtDlpPath(): string {
    const binPath = path.join(process.cwd(), 'bin', 'yt-dlp');
    if (fs.existsSync(binPath)) return binPath;
    return 'yt-dlp';
}

/**
 * Downloads a YouTube video using yt-dlp with an optional residential proxy.
 */
export async function downloadYoutubeVideo(url: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ytDlp = getYtDlpPath();
    const args = [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '--no-playlist',
        '--no-warnings',
        '-o', outputPath,
    ];

    const proxyUrl = process.env.RESIDENTIAL_PROXY_URL;
    if (proxyUrl) {
        args.push('--proxy', proxyUrl);
        console.log('[yt-dlp] Using residential proxy');
    }

    args.push(url);

    console.log(`[yt-dlp] Downloading: ${url}`);

    await new Promise<void>((resolve, reject) => {
        execFile(ytDlp, args, { timeout: 5 * 60 * 1000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('[yt-dlp] stderr:', stderr);
                if (fs.existsSync(outputPath)) try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
                reject(new Error(`yt-dlp failed: ${stderr || error.message}`));
                return;
            }
            console.log('[yt-dlp] stdout:', stdout);

            if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                reject(new Error('yt-dlp completed but output file is empty'));
                return;
            }

            console.log(`[yt-dlp] Download complete: ${outputPath}`);
            resolve();
        });
    });
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
                '-crf 17',
                '-preset medium',
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
