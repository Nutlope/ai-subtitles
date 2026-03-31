import { NextRequest, NextResponse } from 'next/server';
import { extractAudio } from '@/lib/video-utils';
import { rateLimit } from '@/lib/rate-limit';
import { ensureLocalFile } from '@/lib/blob-utils';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

export const maxDuration = 300; // 5 mins max duration for long transcriptions if deployed

const limiter = rateLimit({ interval: 60_000, limit: 5 });

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        const { success } = limiter.check(ip);
        if (!success) {
            return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
        }

        const body = await req.json();
        const { jobId, apiKey, blobUrl } = body;

        const finalApiKey = apiKey || process.env.TOGETHER_API_KEY;

        if (!jobId || !/^[a-zA-Z0-9-]+$/.test(jobId)) {
            return NextResponse.json({ error: 'Invalid or missing jobId' }, { status: 400 });
        }
        if (!finalApiKey) {
            return NextResponse.json({ error: 'No API key provided locally or in .env' }, { status: 401 });
        }

        const baseTempDir = process.env.NODE_ENV === 'production'
            ? path.join('/tmp', 'substudio')
            : path.join(process.cwd(), 'public', 'temp');
        const audioPath = path.join(baseTempDir, `${jobId}.mp3`);

        // Check if the input is already an audio file (MP3 upload) or a video
        const videoPath = path.join(baseTempDir, `${jobId}.mp4`);

        // If file not on disk, try fetching from Blob
        if (!fs.existsSync(videoPath) && !fs.existsSync(audioPath)) {
            if (blobUrl) {
                if (!fs.existsSync(baseTempDir)) fs.mkdirSync(baseTempDir, { recursive: true });
                await ensureLocalFile(videoPath, blobUrl);
            }
        }

        const hasVideo = fs.existsSync(videoPath);
        const hasAudio = fs.existsSync(audioPath);

        if (!hasVideo && !hasAudio) {
            // Check for wav too
            const wavPath = path.join(baseTempDir, `${jobId}.wav`);
            if (fs.existsSync(wavPath)) {
                // Convert wav to mp3 for Whisper
                console.log(`Converting WAV to MP3 for ${jobId}...`);
                await extractAudio(wavPath, audioPath);
            } else {
                return NextResponse.json({ error: 'Media file not found' }, { status: 404 });
            }
        } else if (hasVideo && !hasAudio) {
            // Extract audio from video
            console.log(`Extracting audio for ${jobId}...`);
            await extractAudio(videoPath, audioPath);
        } else {
            // Audio already exists (MP3 upload), skip extraction
            console.log(`Audio file already exists for ${jobId}, skipping extraction`);
        }

        // 2. Transcribe via Together AI (Whisper large-v3)
        console.log(`Transcribing audio for ${jobId}...`);
        const openai = new OpenAI({
            apiKey: finalApiKey,
            baseURL: 'https://api.together.xyz/v1',
        });

        // Create ReadStream for the audio file
        const audioStream = fs.createReadStream(audioPath);

        // Request timestamp_granularities="word" for word-level alignment, format "verbose_json"
        const response = await openai.audio.transcriptions.create({
            file: audioStream,
            model: "openai/whisper-large-v3",
            response_format: "verbose_json",
            timestamp_granularities: ["word"],
        });

        // 3. Generate SRT from words
        // We get verbose_json which includes .words array -> [{ word: string, start: number, end: number }]
        const words = (response as unknown as Record<string, unknown>).words as Array<{ word: string; start: number; end: number }> | undefined;
        if (!words || !words.length) {
            return NextResponse.json({ error: 'No words found in transcription' }, { status: 400 });
        }

        // Generate SRT with longer, more readable subtitle blocks.
        // Group ~8-10 words or ~4 seconds per block, breaking at sentence boundaries.
        const MAX_WORDS = 10;
        const MAX_DURATION = 4.0; // seconds
        const SENTENCE_ENDINGS = /[.!?;]$/;

        let srtContent = "";
        let index = 1;
        let chunkStart = 0;

        while (chunkStart < words.length) {
            let chunkEnd = chunkStart;
            const startTime = words[chunkStart].start;

            while (chunkEnd < words.length) {
                const wordCount = chunkEnd - chunkStart + 1;
                const duration = words[chunkEnd].end - startTime;
                const word = words[chunkEnd].word.trim();
                const atSentenceBoundary = SENTENCE_ENDINGS.test(word);

                // If we've hit limits, break (but always include at least 1 word)
                if (wordCount > 1 && (wordCount >= MAX_WORDS || duration >= MAX_DURATION)) {
                    // If current word ends a sentence, include it then break
                    if (atSentenceBoundary) { chunkEnd++; break; }
                    break;
                }

                // If this word ends a sentence and we have a reasonable chunk, break after it
                if (atSentenceBoundary && wordCount >= 4) {
                    chunkEnd++;
                    break;
                }

                chunkEnd++;
            }

            const chunk = words.slice(chunkStart, chunkEnd);
            if (chunk.length === 0) break;

            const startStr = formatTime(chunk[0].start);
            const endStr = formatTime(chunk[chunk.length - 1].end);
            const text = chunk.map((w) => w.word.trim()).join(" ");

            srtContent += `${index}\n${startStr} --> ${endStr}\n${text}\n\n`;
            index++;
            chunkStart = chunkEnd;
        }

        const srtPath = path.join(baseTempDir, `${jobId}.srt`);
        fs.writeFileSync(srtPath, srtContent);

        return NextResponse.json({
            jobId,
            status: 'success',
            srtContent,
            words, // Return raw words so EditorView can provide a custom editor
        });

    } catch (error: unknown) {
        console.error("Transcription Error:", error);
        const message = error instanceof Error ? error.message : 'Internal Error';
        // Strip URLs and API keys from error messages before sending to client
        const safeMessage = message
            .replace(/https?:\/\/[^\s]+/g, '[redacted-url]')
            .replace(/sk-[a-zA-Z0-9]+/g, '[redacted-key]');
        return NextResponse.json({ error: safeMessage }, { status: 500 });
    }
}

function formatTime(seconds: number): string {
    const date = new Date(seconds * 1000);
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
}
