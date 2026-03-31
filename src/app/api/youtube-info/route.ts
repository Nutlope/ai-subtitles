import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

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
    title: string;
    lengthSeconds: string;
    adaptiveFormats: YTStreamFormat[];
    formats: YTStreamFormat[];
}

export async function POST(req: NextRequest) {
    try {
        const { youtubeUrl } = await req.json();
        if (!youtubeUrl) {
            return NextResponse.json({ error: 'No YouTube URL provided' }, { status: 400 });
        }

        const videoId = extractYoutubeId(youtubeUrl);
        if (!videoId) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        const apiKey = process.env.RAPIDAPI_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 500 });
        }

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

        if (!res.ok) {
            return NextResponse.json(
                { error: `YouTube API error: ${res.status}` },
                { status: 502 }
            );
        }

        const data = (await res.json()) as YTStreamResponse;
        if (data.status !== 'OK') {
            return NextResponse.json(
                { error: `YouTube API returned: ${data.status}` },
                { status: 502 }
            );
        }

        // Pick best MP4 video (avc1) — prefer 720p for speed, fallback to highest
        const videoStreams = data.adaptiveFormats
            .filter((f) => f.mimeType.startsWith('video/mp4') && f.mimeType.includes('avc1') && f.url)
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        const videoStream = videoStreams.find((f) => f.qualityLabel === '720p') || videoStreams[0];

        // Pick best M4A audio
        const audioStream = data.adaptiveFormats
            .filter((f) => f.mimeType.startsWith('audio/mp4') && f.url)
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        // Also get combined format as fallback
        const combinedStream = data.formats?.find(
            (f) => f.mimeType.startsWith('video/mp4') && f.url
        );

        return NextResponse.json({
            videoId,
            title: data.title,
            duration: parseInt(data.lengthSeconds, 10),
            videoUrl: videoStream?.url || null,
            audioUrl: audioStream?.url || null,
            combinedUrl: combinedStream?.url || null,
            quality: videoStream?.qualityLabel || combinedStream?.qualityLabel || 'unknown',
        });
    } catch (error) {
        console.error('YouTube info error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal error' },
            { status: 500 }
        );
    }
}
