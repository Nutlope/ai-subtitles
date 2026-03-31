import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath.path);

/* ── YouTube helpers ── */

function extractYoutubeId(url: string): string | null {
    const m = url.match(
        /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return m?.[1] || null;
}

export function isYoutubeUrl(url: string): boolean {
    return ytdl.validateURL(url) || extractYoutubeId(url) !== null;
}

/**
 * Downloads a YouTube video using @distube/ytdl-core with browser-like headers.
 * Retries with different quality/filter settings if the first attempt fails.
 */
export async function downloadYoutubeVideo(url: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const browserHeaders = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
    };

    // Attempt strategies in order — different filters/quality can bypass different blocks
    const strategies: Array<{ filter: 'videoandaudio' | 'video' | 'audio'; quality: string }> = [
        { filter: 'videoandaudio', quality: 'highest' },
        { filter: 'videoandaudio', quality: 'lowest' },
        { filter: 'video', quality: 'highest' },
    ];

    let lastError: Error | null = null;

    for (const strategy of strategies) {
        try {
            console.log(`[yt] Trying strategy: filter=${strategy.filter}, quality=${strategy.quality}`);

            const stream = ytdl(url, {
                filter: strategy.filter,
                quality: strategy.quality,
                requestOptions: { headers: browserHeaders },
            });

            const fileStream = fs.createWriteStream(outputPath);

            await new Promise<void>((resolve, reject) => {
                stream.pipe(fileStream);
                stream.on('error', (err: Error) => {
                    fileStream.close();
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    reject(err);
                });
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
            });

            if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                throw new Error('Download completed but output file is empty');
            }

            console.log(`[yt] Success with strategy: filter=${strategy.filter}, quality=${strategy.quality}`);
            return; // Success — exit
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`[yt] Strategy failed (filter=${strategy.filter}):`, lastError.message);
            // Clean up before retrying
            if (fs.existsSync(outputPath)) try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
        }
    }

    // All strategies failed
    const message = lastError?.message || 'Unknown error';
    console.error('YouTube download failed after all strategies:', message);

    if (
        message.includes('Sign in') ||
        message.includes('bot') ||
        message.includes('confirm') ||
        message.includes('UNPLAYABLE') ||
        message.includes('unavailable') ||
        message.includes('403') ||
        message.includes('parsing watch') ||
        message.includes('made a change')
    ) {
        throw new Error(
            'YouTube downloads are currently unavailable due to YouTube restrictions. Please download the video manually from YouTube and upload the file instead.'
        );
    }
    throw new Error(`Failed to download YouTube video: ${message}`);
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
