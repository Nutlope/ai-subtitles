import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath.path);

/* ── YouTube helpers ── */

export function isYoutubeUrl(url: string): boolean {
    return /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
}

function extractYoutubeId(url: string): string | null {
    const m = url.match(
        /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return m?.[1] || null;
}

interface YTStreamFormat {
    url: string;
    mimeType: string;
    qualityLabel?: string;
    contentLength?: string;
    bitrate?: number;
}

interface YTStreamResponse {
    status: string;
    adaptiveFormats: YTStreamFormat[];
    formats: YTStreamFormat[];
}

/**
 * Downloads a YouTube video using the YTStream RapidAPI service.
 * Fetches separate video + audio streams and merges with ffmpeg.
 */
export async function downloadYoutubeVideo(url: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const videoId = extractYoutubeId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) throw new Error('RAPIDAPI_KEY environment variable is not set');

    console.log(`[ytstream] Fetching formats for ${videoId}...`);

    const res = await fetch(
        `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${videoId}`,
        {
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com',
                'x-rapidapi-key': apiKey,
            },
        }
    );

    if (!res.ok) throw new Error(`YTStream API error: ${res.status} ${res.statusText}`);

    const data = (await res.json()) as YTStreamResponse;
    if (data.status !== 'OK') throw new Error(`YTStream API returned status: ${data.status}`);

    // Pick best MP4 video stream (prefer 720p avc1 for speed/compatibility)
    const videoStream = data.adaptiveFormats
        .filter((f) => f.mimeType.startsWith('video/mp4') && f.mimeType.includes('avc1') && f.url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    // Pick best M4A audio stream
    const audioStream = data.adaptiveFormats
        .filter((f) => f.mimeType.startsWith('audio/mp4') && f.url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    if (!videoStream || !audioStream) {
        // Fallback: try combined format
        const combined = data.formats?.find(
            (f) => f.mimeType.startsWith('video/mp4') && f.url
        );
        if (combined) {
            console.log(`[ytstream] Using combined format: ${combined.qualityLabel}`);
            await downloadFile(combined.url, outputPath);
            return;
        }
        throw new Error('No suitable video/audio streams found');
    }

    console.log(`[ytstream] Video: ${videoStream.qualityLabel}, Audio: ${audioStream.mimeType}`);

    // Download video and audio to temp files
    const videoTmp = outputPath.replace('.mp4', '.video.mp4');
    const audioTmp = outputPath.replace('.mp4', '.audio.m4a');

    try {
        await Promise.all([
            downloadFile(videoStream.url, videoTmp),
            downloadFile(audioStream.url, audioTmp),
        ]);

        // Merge with ffmpeg
        await mergeVideoAudio(videoTmp, audioTmp, outputPath);
        console.log(`[ytstream] Download complete: ${outputPath}`);
    } finally {
        // Clean up temp files
        for (const f of [videoTmp, audioTmp]) {
            if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch { /* ignore */ }
        }
    }
}

async function downloadFile(url: string, dest: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`Failed to download: ${res.status}`);

    const fileStream = fs.createWriteStream(dest);
    const reader = res.body.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fileStream.write(Buffer.from(value));
    }
    fileStream.end();
    await new Promise<void>((resolve) => fileStream.on('finish', resolve));
}

function mergeVideoAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .input(audioPath)
            .outputOptions(['-c:v copy', '-c:a copy', '-movflags +faststart'])
            .on('error', (err) => {
                console.error('[ytstream] FFmpeg merge error:', err);
                if (fs.existsSync(outputPath)) try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
                reject(err);
            })
            .on('end', () => resolve())
            .save(outputPath);
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
