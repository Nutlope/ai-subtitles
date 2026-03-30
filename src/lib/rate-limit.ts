/**
 * Simple in-memory rate limiter using a sliding window counter.
 * No external dependencies — suitable for Vercel serverless.
 *
 * Usage:
 *   const limiter = rateLimit({ interval: 60_000, limit: 10 });
 *   // In your route handler:
 *   const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
 *   const { success } = limiter.check(ip);
 *   if (!success) return NextResponse.json({ error: '...' }, { status: 429 });
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

interface RateLimitOptions {
    /** Window duration in milliseconds */
    interval: number;
    /** Max requests per window */
    limit: number;
}

const globalStore = new Map<string, Map<string, RateLimitEntry>>();

export function rateLimit({ interval, limit }: RateLimitOptions) {
    // Each limiter instance gets its own namespace so different routes don't share counters
    const id = `rl_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    if (!globalStore.has(id)) {
        globalStore.set(id, new Map());
    }

    const store = globalStore.get(id)!;

    // Periodically clean up expired entries to prevent memory leaks
    const cleanup = () => {
        const now = Date.now();
        store.forEach((entry, key) => {
            if (now > entry.resetTime) {
                store.delete(key);
            }
        });
    };

    // Run cleanup every 60 seconds
    if (typeof setInterval !== 'undefined') {
        const timer = setInterval(cleanup, 60_000);
        // Don't prevent Node from exiting
        if (timer && typeof timer === 'object' && 'unref' in timer) {
            timer.unref();
        }
    }

    return {
        check(token: string): { success: boolean; remaining: number } {
            const now = Date.now();
            const entry = store.get(token);

            if (!entry || now > entry.resetTime) {
                store.set(token, { count: 1, resetTime: now + interval });
                return { success: true, remaining: limit - 1 };
            }

            if (entry.count >= limit) {
                return { success: false, remaining: 0 };
            }

            entry.count++;
            return { success: true, remaining: limit - entry.count };
        },
    };
}
