import fs from 'fs';

/**
 * Ensure a file exists locally — if not, download it from the given Blob URL.
 * Returns the local file path.
 */
export async function ensureLocalFile(localPath: string, blobUrl: string | null): Promise<boolean> {
    if (fs.existsSync(localPath)) return true;
    if (!blobUrl) return false;

    const headers: Record<string, string> = {};
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
    }

    const response = await fetch(blobUrl, { cache: 'no-store', headers });
    if (!response.ok || !response.body) return false;

    const dir = localPath.substring(0, localPath.lastIndexOf('/'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileStream = fs.createWriteStream(localPath);
    const reader = response.body.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fileStream.write(Buffer.from(value));
    }
    fileStream.end();
    await new Promise<void>((resolve) => fileStream.on('finish', resolve));
    return true;
}
