import { NextRequest, NextResponse } from 'next/server';
import { extractAudio } from '@/lib/video-utils';
import { rateLimit } from '@/lib/rate-limit';
import { ensureLocalFile } from '@/lib/blob-utils';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { AI_CONFIG } from '@/lib/ai-config';

export const maxDuration = 300;

const limiter = rateLimit({ interval: 60_000, limit: 5 });

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = limiter.check(ip);
    if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }

    let body: { jobId?: string; apiKey?: string; blobUrl?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { jobId, apiKey, blobUrl } = body;

    const finalApiKey = apiKey || process.env.TOGETHER_API_KEY;

    if (!jobId || !/^[a-zA-Z0-9-]+$/.test(jobId)) {
        return NextResponse.json({ error: 'Invalid or missing jobId' }, { status: 400 });
    }
    if (!finalApiKey) {
        return NextResponse.json({ error: 'No API key provided locally or in .env' }, { status: 401 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const emit = (event: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
            };

            try {
                const baseTempDir = process.env.NODE_ENV === 'production'
                    ? path.join('/tmp', 'substudio')
                    : path.join(process.cwd(), 'public', 'temp');
                const audioPath = path.join(baseTempDir, `${jobId}.mp3`);
                const videoPath = path.join(baseTempDir, `${jobId}.mp4`);

                // --- Stage: extract ---
                emit({ stage: 'extract' });

                if (!fs.existsSync(videoPath) && !fs.existsSync(audioPath)) {
                    if (blobUrl) {
                        if (!fs.existsSync(baseTempDir)) fs.mkdirSync(baseTempDir, { recursive: true });
                        await ensureLocalFile(videoPath, blobUrl);
                    }
                }

                const hasVideo = fs.existsSync(videoPath);
                const hasAudio = fs.existsSync(audioPath);

                if (!hasVideo && !hasAudio) {
                    const wavPath = path.join(baseTempDir, `${jobId}.wav`);
                    if (fs.existsSync(wavPath)) {
                        await extractAudio(wavPath, audioPath);
                    } else {
                        emit({ error: 'Media file not found' });
                        controller.close();
                        return;
                    }
                } else if (hasVideo && !hasAudio) {
                    await extractAudio(videoPath, audioPath);
                }

                // --- Stage: transcribe ---
                emit({ stage: 'transcribe' });

                const openai = new OpenAI({
                    apiKey: finalApiKey,
                    baseURL: AI_CONFIG.api.baseURL,
                });

                let words: Array<{ word: string; start: number; end: number }>;

                if (AI_CONFIG.model.wordTimestamps) {
                    const audioStream = fs.createReadStream(audioPath);
                    const response = await openai.audio.transcriptions.create({
                        file: audioStream,
                        model: AI_CONFIG.model.id,
                        response_format: "verbose_json",
                        timestamp_granularities: ["word"],
                    });
                    const raw = response as unknown as Record<string, unknown>;
                    words = raw.words as Array<{ word: string; start: number; end: number }> ?? [];
                } else {
                    // Fast path: get text + duration, synthesize word timestamps
                    const audioStream = fs.createReadStream(audioPath);
                    const response = await openai.audio.transcriptions.create({
                        file: audioStream,
                        model: AI_CONFIG.model.id,
                        response_format: "verbose_json",
                    });
                    const raw = response as unknown as Record<string, unknown>;
                    const text = String(raw.text || '');
                    const duration = typeof raw.duration === 'number' ? raw.duration : 0;
                    const tokens = text.split(/\s+/).filter(Boolean);
                    if (tokens.length === 0 || duration === 0) {
                        emit({ error: 'No transcription text returned' });
                        controller.close();
                        return;
                    }
                    const avgWordDur = duration / tokens.length;
                    words = tokens.map((w, i) => ({
                        word: w,
                        start: i * avgWordDur,
                        end: (i + 1) * avgWordDur,
                    }));
                }

                if (!words.length) {
                    emit({ error: 'No words found in transcription' });
                    controller.close();
                    return;
                }

                // --- Stage: format ---
                emit({ stage: 'format' });

                const MAX_WORDS = 10;
                const MAX_DURATION = 4.0;
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

                        if (wordCount > 1 && (wordCount >= MAX_WORDS || duration >= MAX_DURATION)) {
                            if (atSentenceBoundary) { chunkEnd++; break; }
                            break;
                        }

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

                // --- Done ---
                emit({
                    stage: 'done',
                    jobId,
                    status: 'success',
                    srtContent,
                    words,
                });

            } catch (error: unknown) {
                console.error("Transcription Error:", error);
                const message = error instanceof Error ? error.message : 'Internal Error';
                const safeMessage = message
                    .replace(/https?:\/\/[^\s]+/g, '[redacted-url]')
                    .replace(/sk-[a-zA-Z0-9]+/g, '[redacted-key]');
                emit({ error: safeMessage });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
    });
}

function formatTime(seconds: number): string {
    const date = new Date(seconds * 1000);
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
}
