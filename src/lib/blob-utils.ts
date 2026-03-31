import fs from 'fs';

const BLOB_STORE_HOST = '5bl7udrfii8u9xcy.private.blob.vercel-storage.com';

function isOwnBlobUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.hostname === BLOB_STORE_HOST;
    } catch {
        return false;
    }
}

/**
 * Ensure a file exists locally — if not, download it from the given Blob URL.
 * Returns the local file path.
 */
export async function ensureLocalFile(localPath: string, blobUrl: string | null): Promise<boolean> {
    if (fs.existsSync(localPath)) return true;
    if (!blobUrl) return false;
    if (!isOwnBlobUrl(blobUrl)) throw new Error('Invalid blob URL');

    const headers: Record<string, string> = {};
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
    }

    const response = await fetch(blobUrl, { cache: 'no-store', headers });
    if (!response.ok || !response.body) return false;

    const dir = localPath.substring(0, localPath.lastIndexOf('/'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tmpPath = localPath + '.tmp';
    const fileStream = fs.createWriteStream(tmpPath);
    try {
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fileStream.write(Buffer.from(value));
        }
        fileStream.end();
        await new Promise<void>((resolve) => fileStream.on('finish', resolve));
        fs.renameSync(tmpPath, localPath);
    } catch (err) {
        fileStream.end();
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        throw err;
    }
    return true;
}
