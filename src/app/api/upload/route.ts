import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { MAX_FILE_SIZE } from '@/lib/limits';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async () => ({
                allowedContentTypes: [
                    'video/mp4', 'video/quicktime', 'video/webm',
                    'audio/mpeg', 'audio/wav',
                ],
                maximumSizeInBytes: MAX_FILE_SIZE,
            }),
            onUploadCompleted: async () => {
                // Could log or track uploads here
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 },
        );
    }
}
