import { NextRequest, NextResponse } from 'next/server';
import { extractAudio } from '@/lib/video-utils';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

export const maxDuration = 300; // 5 mins max duration for long transcriptions if deployed

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { jobId, apiKey } = body;

        const finalApiKey = apiKey || process.env.TOGETHER_API_KEY;

        if (!jobId) {
            return NextResponse.json({ error: 'No jobId provided' }, { status: 400 });
        }
        if (!finalApiKey) {
            return NextResponse.json({ error: 'No API key provided locally or in .env' }, { status: 401 });
        }

        const baseTempDir = path.join(process.cwd(), 'public', 'temp');
        const videoPath = path.join(baseTempDir, `${jobId}.mp4`);
        const audioPath = path.join(baseTempDir, `${jobId}.mp3`);

        if (!fs.existsSync(videoPath)) {
            return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
        }

        // 1. Extract audio
        console.log(`Extracting audio for ${jobId}...`);
        await extractAudio(videoPath, audioPath);

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
        const words = (response as any).words;
        if (!words || !words.length) {
            return NextResponse.json({ error: 'No words found in transcription' }, { status: 400 });
        }

        // Extremely simple SRT generation: bundle every 5-6 words or 2-3 seconds into a subtitle block.
        // Actually, for word-level animation, users often want 1-2 words per line (TikTok style).
        // Let's create an SRT with 3 words max per line for dynamic captions.
        let srtContent = "";
        let index = 1;
        for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3);
            const startStr = formatTime(chunk[0].start);
            const endStr = formatTime(chunk[chunk.length - 1].end);
            const text = chunk.map((w: any) => w.word.trim()).join(" ");

            srtContent += `${index}\n${startStr} --> ${endStr}\n${text}\n\n`;
            index++;
        }

        const srtPath = path.join(baseTempDir, `${jobId}.srt`);
        fs.writeFileSync(srtPath, srtContent);

        return NextResponse.json({
            jobId,
            status: 'success',
            srtContent,
            words, // Return raw words so EditorView can provide a custom editor
        });

    } catch (error: any) {
        console.error("Transcription Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
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
