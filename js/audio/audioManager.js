// Audio system coordination and management

// Audio cache for storing audio URLs to avoid repeated API calls
let managerAudioCache = new Map();

// Current audio settings
let currentAudioMethod = 'dictionary'; // 'dictionary', 'google', or 'browser'
let audioVolume = 1.0;
let speechRate = 0.6; // Slower for better clarity
let speechPitch = 1.0;

// Audio manager class
class AudioManager {
    constructor() {
        this.cache = managerAudioCache;
        this.method = currentAudioMethod;
        this.volume = audioVolume;
        this.rate = speechRate;
        this.pitch = speechPitch;
        this.isEnabled = true;
        this.currentWord = null;
    }

    // Set audio method (dictionary, google, browser)
    setMethod(method) {
        if (['dictionary', 'google', 'browser'].includes(method)) {
            this.method = method;
            currentAudioMethod = method;
        }
    }

    // Get current audio method
    getMethod() {
        return this.method;
    }

    // Set audio volume (0.0 to 1.0)
    setVolume(volume) {
        if (volume >= 0 && volume <= 1) {
            this.volume = volume;
            audioVolume = volume;
        }
    }

    // Set speech rate (0.1 to 2.0)
    setRate(rate) {
        if (rate >= 0.1 && rate <= 2.0) {
            this.rate = rate;
            speechRate = rate;
        }
    }

    // Set speech pitch (0.0 to 2.0)
    setPitch(pitch) {
        if (pitch >= 0.0 && pitch <= 2.0) {
            this.pitch = pitch;
            speechPitch = pitch;
        }
    }

    // Enable audio
    enable() {
        this.isEnabled = true;
    }

    // Disable audio
    disable() {
        this.isEnabled = false;
    }

    // Check if audio is enabled
    isAudioEnabled() {
        return this.isEnabled;
    }

    // Play word using current method
    async playWord(word) {
        if (!this.isEnabled) {
            return false;
        }

        this.currentWord = word;

        try {
            switch (this.method) {
                case 'dictionary':
                    return await this.playWithDictionary(word);
                case 'google':
                    return await this.playWithGoogle(word);
                case 'browser':
                    return await this.playWithBrowser(word);
                default:
                    return await this.playWithDictionary(word);
            }
        } catch (error) {
            console.error('Audio playback failed:', error);
            return false;
        }
    }

    // Play word using dictionary API
    async playWithDictionary(word) {
        // Check cache first for faster loading
        if (this.cache.has(word)) {
            const cachedAudioUrl = this.cache.get(word);
            if (cachedAudioUrl) {
                try {
                    const audio = new Audio(cachedAudioUrl);
                    audio.volume = this.volume;
                    await audio.play();
                    return true; // Success with cached audio
                } catch (audioError) {
                    console.log('Cached audio playback failed, trying fresh API call');
                    this.cache.delete(word); // Remove bad cache entry
                }
            } else {
                // Cached as "no audio available", go straight to fallback
                return await this.playWithBrowser(word);
            }
        }

        try {
            // Fetch from dictionary API with timeout for faster response
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();

                // Look for audio URLs and prefer US pronunciation
                let usAudioUrl = null;
                let fallbackAudioUrl = null;

                // Check all entries for audio
                for (const entry of data) {
                    if (entry.phonetics) {
                        for (const phonetic of entry.phonetics) {
                            if (phonetic.audio && phonetic.audio.trim() !== '') {
                                // Prefer US pronunciation (contains "-us." in URL)
                                if (phonetic.audio.includes('-us.')) {
                                    usAudioUrl = phonetic.audio;
                                    break;
                                } else if (!fallbackAudioUrl) {
                                    // Store first available as fallback
                                    fallbackAudioUrl = phonetic.audio;
                                }
                            }
                        }
                        if (usAudioUrl) break;
                    }
                }

                // Use US audio if available, otherwise use first available
                const audioUrl = usAudioUrl || fallbackAudioUrl;

                if (audioUrl) {
                    // Cache the audio URL for faster future access
                    this.cache.set(word, audioUrl);

                    const audio = new Audio(audioUrl);
                    audio.volume = this.volume;

                    try {
                        await audio.play();
                        return true; // Success! Don't use fallback
                    } catch (audioError) {
                        console.log('Audio playback failed, falling back to speech synthesis');
                    }
                } else {
                    // Cache that no audio is available
                    this.cache.set(word, null);
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Dictionary API timeout, falling back to speech synthesis');
            } else {
                console.log('Dictionary API failed, falling back to speech synthesis:', error);
            }
        }

        // Fallback to browser speech synthesis
        return await this.playWithBrowser(word);
    }

    // Play word using Google TTS
    async playWithGoogle(word) {
        try {
            // Check cache first
            const cacheKey = `google_${word}`;
            if (this.cache.has(cacheKey)) {
                const cachedAudioUrl = this.cache.get(cacheKey);
                if (cachedAudioUrl) {
                    const audio = new Audio(cachedAudioUrl);
                    audio.volume = this.volume;
                    await audio.play();
                    return true;
                }
            }

            // Generate Google TTS URL
            const googleTTSUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=en&client=tw-ob`;
            
            // Cache the URL
            this.cache.set(cacheKey, googleTTSUrl);

            const audio = new Audio(googleTTSUrl);
            audio.volume = this.volume;
            
            // Set referer header if possible (may not work due to CORS)
            audio.crossOrigin = 'anonymous';
            
            await audio.play();
            return true;
        } catch (error) {
            console.log('Google TTS failed, falling back to browser speech:', error);
            return await this.playWithBrowser(word);
        }
    }

    // Play word using browser speech synthesis
    async playWithBrowser(word) {
        return new Promise((resolve) => {
            if ('speechSynthesis' in window) {
                // Stop any ongoing speech
                speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(word);
                
                // Configure speech settings
                utterance.rate = this.rate;
                utterance.pitch = this.pitch;
                utterance.volume = this.volume;

                // Set up event handlers
                utterance.onend = () => resolve(true);
                utterance.onerror = () => resolve(false);

                // Speak the word
                speechSynthesis.speak(utterance);
            } else {
                console.log('Speech synthesis not supported');
                resolve(false);
            }
        });
    }

    // Repeat current word
    async repeatCurrentWord() {
        if (this.currentWord) {
            return await this.playWord(this.currentWord);
        }
        return false;
    }

    // Clear audio cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache size
    getCacheSize() {
        return this.cache.size;
    }

    // Get cache statistics
    getCacheStats() {
        const stats = {
            totalEntries: this.cache.size,
            dictionaryEntries: 0,
            googleEntries: 0,
            nullEntries: 0
        };

        for (const [key, value] of this.cache.entries()) {
            if (key.startsWith('google_')) {
                stats.googleEntries++;
            } else if (value === null) {
                stats.nullEntries++;
            } else {
                stats.dictionaryEntries++;
            }
        }

        return stats;
    }

    // Test audio functionality
    async testAudio(testWord = 'test') {
        const results = {
            dictionary: false,
            google: false,
            browser: false
        };

        const originalMethod = this.method;

        // Test dictionary API
        this.setMethod('dictionary');
        results.dictionary = await this.playWord(testWord);

        // Test Google TTS
        this.setMethod('google');
        results.google = await this.playWord(testWord);

        // Test browser speech
        this.setMethod('browser');
        results.browser = await this.playWord(testWord);

        // Restore original method
        this.setMethod(originalMethod);

        return results;
    }
}

// Create global audio manager instance
const audioManager = new AudioManager();

// Enhanced text-to-speech function (main interface)
async function speakWord(word) {
    return await audioManager.playWord(word);
}

// Function to repeat the current word
function repeatWord(wordToRepeat) {
    if (wordToRepeat && typeof speakWord === 'function') {
        speakWord(wordToRepeat);
    }
}

// Export functions for global access
window.audioManager = audioManager;
window.speakWord = speakWord;
window.repeatWord = repeatWord;
