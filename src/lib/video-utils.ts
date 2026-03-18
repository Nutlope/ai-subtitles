import youtubedl from 'youtube-dl-exec';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';

// Set fluent-ffmpeg to use the @ffmpeg-installer binary
ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * Downloads a video from a YouTube URL using yt-dlp (via youtube-dl-exec).
 * This approach is actively maintained and handles YouTube's evolving protections.
 */
export async function downloadYoutubeVideo(url: string, outputPath: string): Promise<void> {
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    try {
        await youtubedl(url, {
            output: outputPath,
            format: 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best',
            mergeOutputFormat: 'mp4',
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: false,
            addHeader: [
                'referer:youtube.com',
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ],
        });

        // Verify the file was created
        if (!fs.existsSync(outputPath)) {
            throw new Error('Download completed but output file was not created');
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('yt-dlp download error:', message);
        throw new Error(`Failed to download video: ${message}`);
    }
}

/**
 * Extract audio from an MP4 file using FFmpeg
 */
export async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Ensure the input file exists
        if (!fs.existsSync(videoPath)) {
            return reject(new Error(`Video file does not exist at path: ${videoPath}`));
        }

        const dir = path.dirname(audioPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        ffmpeg(videoPath)
            .outputOptions([
                '-vn',            // No video
                '-acodec libmp3lame', // Use mp3 encoder
                '-ac 1',          // 1 channel (mono) for faster transcription
                '-ar 16000'       // 16kHz is usually sufficient for whisper
            ])
            .on('error', (err) => {
                console.error("FFmpeg Extract Error:", err);
                reject(err);
            })
            .on('end', () => resolve())
            .save(audioPath);
    });
}

/**
 * Get video metadata (resolution, bitrate, etc.)
 */
export function getVideoInfo(videoPath: string): Promise<{ width: number; height: number; bitrate: number }> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) return reject(err);
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            resolve({
                width: videoStream?.width || 1920,
                height: videoStream?.height || 1080,
                bitrate: metadata.format.bit_rate ? parseInt(String(metadata.format.bit_rate)) : 0,
            });
        });
    });
}

/**
 * Burn subtitles into the video with high-quality encoding.
 * Uses CRF 17 (visually lossless) and copies audio without re-encoding.
 * Optionally upscales to a target height (e.g. 1080, 1440, 2160).
 */
export async function burnSubtitles(
    videoPath: string,
    srtPath: string,
    outputPath: string,
    options?: { targetHeight?: number }
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(videoPath)) return reject(new Error("Video path missing"));
        if (!fs.existsSync(srtPath)) return reject(new Error("SRT path missing"));

        const safeSrtPath = srtPath.replace(/\\/g, '/');

        // Build the video filter chain
        const filters: string[] = [];

        // Optional upscale — only scale UP, never down
        if (options?.targetHeight) {
            // scale=-2:targetHeight uses lanczos for high-quality upscaling
            // The expression only upscales: if input is already >= target, keep original
            filters.push(`scale=-2:'if(lt(ih,${options.targetHeight}),${options.targetHeight},ih)':flags=lanczos`);
        }

        // Subtitle burn filter
        filters.push(`subtitles='${safeSrtPath}':force_style='Fontname=Outfit,Fontsize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0'`);

        ffmpeg(videoPath)
            .outputOptions([
                '-vf', filters.join(','),
                '-c:v libx264',   // Explicit H.264 codec
                '-crf 17',        // Visually lossless quality
                '-preset medium', // Good balance of speed and compression
                '-pix_fmt yuv420p', // Maximum compatibility
                '-c:a copy'       // Copy audio without re-encoding
            ])
            .on('error', (err) => {
                console.error("FFmpeg Burn Error:", err);
                reject(err);
            })
            .on('end', () => resolve())
            .save(outputPath);
    });
}
