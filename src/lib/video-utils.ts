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
 * Burn subtitles into the video
 */
export async function burnSubtitles(videoPath: string, srtPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(videoPath)) return reject(new Error("Video path missing"));
        if (!fs.existsSync(srtPath)) return reject(new Error("SRT path missing"));

        // FFmpeg subtitle filter needs backslashes escaped for Windows/Paths if needed, 
        // but simple paths Usually work if not containing special characters.
        // It's safer to copy the srt to the same dir or use absolute path without weird spaces
        const safeSrtPath = srtPath.replace(/\\/g, '/');

        ffmpeg(videoPath)
            .outputOptions([
                '-vf', `subtitles='${safeSrtPath}':force_style='Fontname=Outfit,Fontsize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0'`,
                '-c:a copy' // Copy audio without recoding
            ])
            .on('error', (err) => {
                console.error("FFmpeg Burn Error:", err);
                reject(err);
            })
            .on('end', () => resolve())
            .save(outputPath);
    });
}
