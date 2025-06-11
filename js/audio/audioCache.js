// Audio caching system for improved performance

// Audio cache manager class
class AudioCacheManager {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 100; // Maximum number of cached entries
        this.cacheStats = {
            hits: 0,
            misses: 0,
            totalRequests: 0
        };
        this.serverCacheEnabled = false;
        this.serverCacheEndpoint = '/api/audio-cache';
        
        this.init();
    }

    // Initialize cache manager
    init() {
        this.loadCacheFromStorage();
        this.detectServerCache();
    }

    // Detect if server-side caching is available
    async detectServerCache() {
        // Disable server cache detection for now since we don't have a server endpoint
        this.serverCacheEnabled = false;
        // Uncomment below when server endpoint is available:
        /*
        try {
            const response = await fetch(this.serverCacheEndpoint, {
                method: 'HEAD'
            });
            this.serverCacheEnabled = response.ok;
            console.log('Server cache:', this.serverCacheEnabled ? 'enabled' : 'disabled');
        } catch (error) {
            this.serverCacheEnabled = false;
        }
        */
    }

    // Load cache from localStorage
    loadCacheFromStorage() {
        try {
            const stored = localStorage.getItem('audioCache');
            if (stored) {
                const data = JSON.parse(stored);
                this.cache = new Map(data.entries || []);
                this.cacheStats = data.stats || this.cacheStats;
            }
        } catch (error) {
            console.warn('Failed to load audio cache from storage:', error);
            this.cache.clear();
        }
    }

    // Save cache to localStorage
    saveCacheToStorage() {
        try {
            const data = {
                entries: Array.from(this.cache.entries()),
                stats: this.cacheStats,
                timestamp: Date.now()
            };
            localStorage.setItem('audioCache', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save audio cache to storage:', error);
        }
    }

    // Generate cache key
    generateKey(word, provider = 'google') {
        return `${provider}_${word.toLowerCase()}`;
    }

    // Check if word is cached
    has(word, provider = 'google') {
        const key = this.generateKey(word, provider);
        return this.cache.has(key);
    }

    // Get cached audio URL
    get(word, provider = 'google') {
        const key = this.generateKey(word, provider);
        this.cacheStats.totalRequests++;
        
        if (this.cache.has(key)) {
            this.cacheStats.hits++;
            const entry = this.cache.get(key);
            
            // Update access time
            entry.lastAccessed = Date.now();
            entry.accessCount = (entry.accessCount || 0) + 1;
            
            return entry.url;
        } else {
            this.cacheStats.misses++;
            return null;
        }
    }

    // Set cached audio URL
    set(word, url, provider = 'google') {
        const key = this.generateKey(word, provider);
        
        const entry = {
            word: word,
            url: url,
            provider: provider,
            cachedAt: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 1
        };

        this.cache.set(key, entry);
        
        // Enforce cache size limit
        this.enforceMaxSize();
        
        // Save to storage
        this.saveCacheToStorage();
        
        // Cache on server if available
        if (this.serverCacheEnabled && url) {
            this.cacheOnServer(word, url, provider);
        }
    }

    // Cache audio on server
    async cacheOnServer(word, url, provider) {
        try {
            await fetch(this.serverCacheEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    word: word,
                    url: url,
                    provider: provider,
                    timestamp: Date.now()
                })
            });
        } catch (error) {
            console.warn('Failed to cache on server:', error);
        }
    }

    // Get cached audio from server
    async getFromServer(word, provider = 'google') {
        if (!this.serverCacheEnabled) {
            return null;
        }

        try {
            const response = await fetch(`${this.serverCacheEndpoint}?word=${encodeURIComponent(word)}&provider=${provider}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.url;
            }
        } catch (error) {
            console.warn('Failed to get from server cache:', error);
        }
        
        return null;
    }

    // Enforce maximum cache size
    enforceMaxSize() {
        if (this.cache.size <= this.maxCacheSize) {
            return;
        }

        // Convert to array and sort by last accessed time (oldest first)
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        // Remove oldest entries
        const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
        toRemove.forEach(([key]) => {
            this.cache.delete(key);
        });
    }

    // Clear cache
    clear() {
        this.cache.clear();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            totalRequests: 0
        };
        this.saveCacheToStorage();
    }

    // Remove specific entry
    remove(word, provider = 'google') {
        const key = this.generateKey(word, provider);
        return this.cache.delete(key);
    }

    // Get cache statistics
    getStats() {
        const hitRate = this.cacheStats.totalRequests > 0 
            ? (this.cacheStats.hits / this.cacheStats.totalRequests * 100).toFixed(1)
            : 0;

        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            hits: this.cacheStats.hits,
            misses: this.cacheStats.misses,
            totalRequests: this.cacheStats.totalRequests,
            hitRate: `${hitRate}%`,
            serverCacheEnabled: this.serverCacheEnabled
        };
    }

    // Get cache entries by provider
    getEntriesByProvider(provider) {
        const entries = [];
        for (const [key, entry] of this.cache.entries()) {
            if (entry.provider === provider) {
                entries.push(entry);
            }
        }
        return entries;
    }

    // Preload audio for multiple words
    async preloadWords(words, provider = 'google', progressCallback = null) {
        const results = {
            total: words.length,
            cached: 0,
            loaded: 0,
            failed: 0
        };

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            
            // Check if already cached
            if (this.has(word, provider)) {
                results.cached++;
            } else {
                // Try to load from server cache first
                const serverUrl = await this.getFromServer(word, provider);
                if (serverUrl) {
                    this.set(word, serverUrl, provider);
                    results.loaded++;
                } else {
                    results.failed++;
                }
            }

            // Call progress callback if provided
            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: words.length,
                    word: word,
                    progress: Math.round(((i + 1) / words.length) * 100)
                });
            }
        }

        return results;
    }

    // Export cache data
    exportCache() {
        return {
            entries: Array.from(this.cache.entries()),
            stats: this.cacheStats,
            timestamp: Date.now()
        };
    }

    // Import cache data
    importCache(data) {
        try {
            if (data.entries) {
                this.cache = new Map(data.entries);
            }
            if (data.stats) {
                this.cacheStats = data.stats;
            }
            this.saveCacheToStorage();
            return true;
        } catch (error) {
            console.error('Failed to import cache:', error);
            return false;
        }
    }

    // Set maximum cache size
    setMaxSize(size) {
        if (size > 0) {
            this.maxCacheSize = size;
            this.enforceMaxSize();
        }
    }

    // Get cache size
    getSize() {
        return this.cache.size;
    }

    // Check if cache is empty
    isEmpty() {
        return this.cache.size === 0;
    }

    // Get all cached words
    getAllWords() {
        const words = new Set();
        for (const entry of this.cache.values()) {
            words.add(entry.word);
        }
        return Array.from(words);
    }

    // Clean up expired entries (if we add expiration in the future)
    cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
        const now = Date.now();
        const toRemove = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.cachedAt > maxAge) {
                toRemove.push(key);
            }
        }

        toRemove.forEach(key => this.cache.delete(key));
        
        if (toRemove.length > 0) {
            this.saveCacheToStorage();
        }

        return toRemove.length;
    }
}

// Create and export a single instance of the AudioCacheManager
export const audioCache = new AudioCacheManager();

// Enhanced fallback speech function
function useFallbackSpeech(word) {
    if ('speechSynthesis' in window) {
        // Stop any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        
        // Configure speech settings
        utterance.rate = 0.6;  // Much slower for better clarity
        utterance.pitch = 1.0; // Normal pitch
        utterance.volume = 1.0; // Full volume

        // Speak the word
        speechSynthesis.speak(utterance);
    }
}

// Export for global access
window.audioCacheManager = audioCache;
window.useFallbackSpeech = useFallbackSpeech;
