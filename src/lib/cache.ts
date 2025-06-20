// TODO: switch to Redis later

interface CacheItem<T> {
    value: T;
    expiry: number;
}

class SimpleCache {
    private cache = new Map<string, CacheItem<any>>();

    /**
     * Get value from cache
     * @param key Cache key
     * @returns Cached value or null if not found/expired
     */
    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * Set value in cache
     * @param key Cache key
     * @param value Value to cache
     * @param ttlSeconds Time to live in seconds (default 5 minutes)
     */
    set<T>(key: string, value: T, ttlSeconds: number = 300): void {
        const expiry = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, { value, expiry });
    }

    /**
     * Delete specific key from cache
     * @param key Cache key to delete
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    cleanup(): void {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }

    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

export const cache = new SimpleCache();

if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        cache.cleanup();
    }, 10 * 60 * 1000);
}

/**
 * Cache wrapper for async functions
 * @param key Cache key
 * @param fn Function to execute if cache miss
 * @param ttlSeconds Cache TTL in seconds
 * @returns Cached or fresh result
 */
export async function withCache<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 300
): Promise<T> {
    const cached = cache.get<T>(key);
    if (cached !== null) {
        return cached;
    }

    const result = await fn();
    cache.set(key, result, ttlSeconds);
    
    return result;
}

/**
 * Generate cache key for user-specific data
 * @param userId User ID
 * @param operation Operation name
 * @param params Additional parameters
 * @returns Formatted cache key
 */
export function createUserCacheKey(userId: string, operation: string, params?: string): string {
    return `user:${userId}:${operation}${params ? `:${params}` : ''}`;
}

/**
 * Generate cache key for global data
 * @param operation Operation name
 * @param params Additional parameters
 * @returns Formatted cache key
 */
export function createGlobalCacheKey(operation: string, params?: string): string {
    return `global:${operation}${params ? `:${params}` : ''}`;
}

/**
 * Invalidate cache keys matching a pattern
 * @param pattern Pattern to match (supports wildcards with *)
 */
export function invalidateCachePattern(pattern: string): void {
    const keys = cache.getStats().keys;
    const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\');
    const regex = new RegExp(escaped.replace(/\*/g, '.*'));
    
    for (const key of keys) {
        if (regex.test(key)) {
            cache.delete(key);
        }
    }
} 