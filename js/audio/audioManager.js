// Audio system coordination and management

// Audio cache for storing audio URLs to avoid repeated API calls
const managerAudioCache = new Map();

// Default audio settings (can be changed by UI later)
let currentAudioMethodDefault = 'dictionary'; // Changed default to dictionary
let audioVolumeDefault = 1.0;
let speechRateDefault = 0.8;
let speechPitchDefault = 1.0;

// Audio manager class
class AudioManager {
    constructor() {
        this.cache = managerAudioCache;
        this.method = currentAudioMethodDefault;
        this.volume = audioVolumeDefault;
        this.rate = speechRateDefault;
        this.pitch = speechPitchDefault;
        this.isEnabled = true;
        this.currentWord = null;
        this.currentAudioElement = null;
    }

    // Set audio method (dictionary, browser)
    setMethod(method) {
        if (['dictionary', 'browser'].includes(method)) {
            this.method = method;
            console.log(`Audio method set to: ${method}`);
        } else {
            console.warn(`Attempted to set invalid audio method: ${method}. Allowed: dictionary, browser.`);
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
        }
    }

    // Set speech rate (0.1 to 2.0)
    setRate(rate) {
        if (rate >= 0.1 && rate <= 2.0) {
            this.rate = rate;
        }
    }

    // Set speech pitch (0.0 to 2.0)
    setPitch(pitch) {
        if (pitch >= 0.0 && pitch <= 2.0) {
            this.pitch = pitch;
        }
    }

    // Enable audio
    enable() {
        this.isEnabled = true;
    }

    // Disable audio
    disable() {
        this.isEnabled = false;
        this.stopCurrentAudio();
    }

    // Check if audio is enabled
    isAudioEnabled() {
        return this.isEnabled;
    }

    stopCurrentAudio() {
        if (this.currentAudioElement && !this.currentAudioElement.paused) {
            this.currentAudioElement.pause();
            this.currentAudioElement.currentTime = 0;
            console.log("Stopped current audio playback.");
        }
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            console.log("Cancelled speech synthesis.");
        }
    }

    // Play word using current method
    async playWord(word) {
        if (!this.isEnabled || !word) {
            return false;
        }
        this.currentWord = word;
        this.stopCurrentAudio();

        try {
            let success = false;
            switch (this.method) {
                case 'dictionary':
                    success = await this.playWithDictionary(word);
                    break;
                case 'browser':
                    success = await this.playWithBrowser(word);
                    break;
                default:
                    console.warn(`Unknown or unsupported audio method: ${this.method}, defaulting to browser.`);
                    success = await this.playWithBrowser(word);
                    break;
            }
            return success;
        } catch (error) {
            console.error(`Audio playback failed for word "${word}" using method "${this.method}":`, error);
            return false;
        }
    }

    async playAudioElement(audioUrl) {
        return new Promise((resolve, reject) => {
            this.currentAudioElement = new Audio(audioUrl);
            this.currentAudioElement.volume = this.volume;
            this.currentAudioElement.crossOrigin = 'anonymous';
            this.currentAudioElement.onended = () => {
                this.currentAudioElement = null;
                resolve(true);
            }
            this.currentAudioElement.onerror = (e) => {
                console.error('Audio element playback error:', e, 'URL:', audioUrl);
                this.currentAudioElement = null;
                reject(e);
            };
            this.currentAudioElement.onabort = () => {
                console.log('Audio element playback aborted.', 'URL:', audioUrl);
                this.currentAudioElement = null;
                resolve(false);
            };
            this.currentAudioElement.play().catch(playError => {
                console.error('Audio element .play() rejected:', playError, 'URL:', audioUrl);
                this.currentAudioElement = null;
                reject(playError);
            });
        });
    }

    // Play word using dictionary API
    async playWithDictionary(word) {
        const cacheKey = `dict_${word}`;
        if (this.cache.has(cacheKey)) {
            const cachedAudioUrl = this.cache.get(cacheKey);
            if (cachedAudioUrl) {
                try {
                    console.log('Playing from dictionary cache:', word);
                    return await this.playAudioElement(cachedAudioUrl);
                } catch (audioError) {
                    console.log('Dictionary cached audio playback failed, trying fresh API call');
                    this.cache.delete(cacheKey);
                }
            } else {
                console.log('Dictionary cache indicates no audio for:', word, ', falling back to browser.');
                return await this.playWithBrowser(word);
            }
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                let audioUrl = null;
                if (data && data.length > 0 && data[0].phonetics && data[0].phonetics.length > 0) {
                    const usPhonetic = data[0].phonetics.find(p => p.audio && p.audio.includes('-us.'));
                    const anyPhonetic = data[0].phonetics.find(p => p.audio && p.audio.trim() !== '');
                    audioUrl = usPhonetic ? usPhonetic.audio : (anyPhonetic ? anyPhonetic.audio : null);
                }

                if (audioUrl) {
                    this.cache.set(cacheKey, audioUrl);
                    console.log('Playing from dictionary API:', word);
                    return await this.playAudioElement(audioUrl);
                } else {
                    this.cache.set(cacheKey, null);
                    console.log('No audio URL from Dictionary API for:', word, ', falling back to browser.');
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') console.log('Dictionary API timeout for:', word, ', falling back to browser.');
            else console.log('Dictionary API error for:', word, error, ', falling back to browser.');
        }
        return await this.playWithBrowser(word);
    }

    // Play word using browser speech synthesis
    async playWithBrowser(word) {
        console.log('Playing with browser speech synthesis:', word);
        return new Promise((resolve) => {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = 'en-US';
                utterance.rate = this.rate;
                utterance.pitch = this.pitch;
                utterance.volume = this.volume;
                utterance.onend = () => resolve(true);
                utterance.onerror = (e) => {
                    console.error('Browser speech synthesis error:', e);
                    resolve(false);
                };
                speechSynthesis.speak(utterance);
            } else {
                console.warn('Browser speech synthesis not supported.');
                resolve(false);
            }
        });
    }

    // Repeat current word
    async repeatCurrentWord() {
        if (this.currentWord) {
            console.log('Repeating word:', this.currentWord);
            return await this.playWord(this.currentWord);
        } else {
            console.log('No current word to repeat.');
            return false;
        }
    }

    // Clear audio cache
    clearCache() {
        this.cache.clear();
        console.log('Audio cache cleared.');
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
            nullEntries: 0
        };

        for (const [key, value] of this.cache.entries()) {
            if (key.startsWith('dict_')) {
                if (value !== null) stats.dictionaryEntries++;
                else stats.nullEntries++;
            }
        }

        return stats;
    }

    // Test audio functionality
    async testAudio(testWord = 'test') {
        const results = {
            dictionary: false,
            browser: false
        };

        const originalMethod = this.method;

        this.setMethod('dictionary');
        results.dictionary = await this.playWord(testWord);

        this.setMethod('browser');
        results.browser = await this.playWord(testWord);

        this.setMethod(originalMethod);
        return results;
    }
}

// Create and export a single instance of the AudioManager
const audioManagerInstance = new AudioManager();
export default audioManagerInstance;
