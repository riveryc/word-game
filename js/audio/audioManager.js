// Audio system coordination and management
import { googleTTSProvider, browserTTSProvider } from './ttsProviders.js';
import { audioCache } from './audioCache.js'; // Assuming audioCache.js exports an instance or class

// Default audio settings
const DEFAULT_AUDIO_METHOD = 'google'; // Try Google TTS first, then browser
const DEFAULT_VOLUME = 1.0;
const DEFAULT_SPEECH_RATE = 0.8;
const DEFAULT_SPEECH_PITCH = 1.0;

class AudioManager {
    constructor() {
        this.cache = audioCache; // Use the dedicated audioCache module
        this.method = DEFAULT_AUDIO_METHOD; // 'google' or 'browser'
        this.volume = DEFAULT_VOLUME;
        this.rate = DEFAULT_SPEECH_RATE;
        this.pitch = DEFAULT_SPEECH_PITCH;
        this.isEnabled = true;
        this.currentText = null; // Stores the sentence/text being played or last played
        this.currentAudioElement = null; // For <audio> element playback
        this.isSpeaking = false; // Tracks if audio is currently playing

        // Ensure browserTTSProvider voices are loaded early if it's a potential fallback
        if (browserTTSProvider && typeof browserTTSProvider.ensureVoicesLoaded === 'function') {
            browserTTSProvider.ensureVoicesLoaded();
        }
    }

    setMethod(method) {
        if (['google', 'browser'].includes(method)) {
            this.method = method;
            console.log(`AudioManager: Method set to: ${method}`);
        } else {
            console.warn(`AudioManager: Invalid audio method: ${method}. Allowed: google, browser.`);
        }
    }

    getMethod() { return this.method; }
    setVolume(volume) { if (volume >= 0 && volume <= 1) this.volume = volume; }
    getVolume() { return this.volume; }
    setRate(rate) { if (rate >= 0.1 && rate <= 2.0) this.rate = rate; }
    getRate() { return this.rate; }
    setPitch(pitch) { if (pitch >= 0.0 && pitch <= 2.0) this.pitch = pitch; }
    getPitch() { return this.pitch; }
    enable() { this.isEnabled = true; }
    disable() { 
        this.isEnabled = false;
        this.stopCurrentAudio();
    }
    isAudioEnabled() { return this.isEnabled; }

    stopCurrentAudio() {
        if (this.currentAudioElement && !this.currentAudioElement.paused) {
            this.currentAudioElement.pause();
            this.currentAudioElement.src = ''; // Release resource
            this.currentAudioElement = null;
            console.log("AudioManager: Stopped <audio> element playback.");
        }
        if (this.isSupportedNatively() && speechSynthesis.speaking) {
            speechSynthesis.cancel();
            console.log("AudioManager: Cancelled native speech synthesis.");
        }
        this.isSpeaking = false;
    }

    async playSentence(sentence) {
        if (!this.isEnabled || !sentence || typeof sentence !== 'string' || sentence.trim() === '') {
            console.log('AudioManager: Playback skipped (disabled or empty sentence).');
            return false;
        }
        this.currentText = sentence;
        this.stopCurrentAudio();
        this.isSpeaking = true;

        let success = false;
        const options = {
            volume: this.volume,
            rate: this.rate,
            pitch: this.pitch,
            audioManager: this // Pass reference to this AudioManager instance
        };

        try {
            if (this.method === 'google') {
                const cacheKey = `google_${sentence}`;
                const cachedAudioUrl = await this.cache.get(cacheKey);

                if (cachedAudioUrl) {
                    console.log(`AudioManager: Playing "${sentence.substring(0,30)}..." from cache (Google).`);
                    try {
                        success = await this.playAudioElement(cachedAudioUrl);
                    } catch (e) {
                        console.warn('AudioManager: Cached audio playback failed, deleting from cache.', e);
                        await this.cache.remove(cacheKey);
                        success = false; // Ensure fallback is attempted
                    }
                } else {
                    console.log(`AudioManager: Attempting Google TTS for "${sentence.substring(0,30)}...".`);
                    success = await googleTTSProvider.playSentence(sentence, options);
                    if (success && googleTTSProvider.lastPlayedUrl) { // Assuming provider might expose this for caching
                         // The current GoogleTTSProvider gets the URL and calls playAudioElement itself.
                         // Caching should happen if playAudioElement was successful from a new URL.
                         // This needs careful handling: playAudioElement is generic.
                         // Let's assume googleTTSProvider.playSentence will return an object {success: true, url: audioUrl}
                         // For now, caching will be implicit if playAudioElement is called with a new URL directly from provider
                         // OR the provider gives back the URL to cache here.
                         // For now, we will rely on the /api/tts being cachable by the browser if headers are set right.
                         // Or, more explicitly, the cache key needs to be set after successful fetch if URL is from /api/tts.
                    }
                }
                
                if (!success) {
                    console.log('AudioManager: Google TTS failed or no audio, falling back to browser TTS.');
                    success = await browserTTSProvider.playSentence(sentence, options);
                }
            } else if (this.method === 'browser') {
                console.log(`AudioManager: Attempting Browser TTS for "${sentence.substring(0,30)}...".`);
                success = await browserTTSProvider.playSentence(sentence, options);
            } else {
                console.warn(`AudioManager: Unknown method ${this.method}, defaulting to browser TTS.`);
                success = await browserTTSProvider.playSentence(sentence, options);
            }
        } catch (error) {
            console.error(`AudioManager: Error during playback of "${sentence.substring(0,30)}...":`, error);
            success = false;
            // Final attempt with browser if a catastrophic error occurred above primary/secondary choice
            if (this.method === 'google') { // if primary was google and it exploded badly
                 try {
                    console.log('AudioManager: Catastrophic error fallback to browser TTS.');
                    success = await browserTTSProvider.playSentence(sentence, options);
                } catch (finalError) { console.error('AudioManager: Final fallback to browser TTS also failed:', finalError); }
            }
        }

        this.isSpeaking = false;
        if (!success) console.warn(`AudioManager: All playback attempts failed for "${sentence.substring(0,30)}...".`);
        return success;
    }

    async playAudioElement(audioUrl) {
        this.stopCurrentAudio(); // Stop anything previous before playing new URL
        this.isSpeaking = true;
        
        return new Promise((resolve, reject) => {
            this.currentAudioElement = new Audio(audioUrl);
            this.currentAudioElement.volume = this.volume;
            this.currentAudioElement.crossOrigin = 'anonymous'; // Important for some audio sources

            const onEnded = () => {
                cleanup();
                this.isSpeaking = false;
                resolve(true);
            };
            const onError = (e) => {
                console.error('AudioManager: <audio> element error:', e, 'URL:', audioUrl);
                cleanup();
                this.isSpeaking = false;
                resolve(false); // Resolve false for fallback, don't reject promise chain for this error type
            };
            const onAbort = () => {
                console.log('AudioManager: <audio> element playback aborted.', 'URL:', audioUrl);
                cleanup();
                this.isSpeaking = false;
                resolve(false);
            };

            const cleanup = () => {
                if (this.currentAudioElement) {
                    this.currentAudioElement.removeEventListener('ended', onEnded);
                    this.currentAudioElement.removeEventListener('error', onError);
                    this.currentAudioElement.removeEventListener('abort', onAbort);
                }
            };

            this.currentAudioElement.addEventListener('ended', onEnded);
            this.currentAudioElement.addEventListener('error', onError);
            this.currentAudioElement.addEventListener('abort', onAbort);
            
            this.currentAudioElement.play().catch(playError => {
                console.error('AudioManager: <audio> element .play() rejected:', playError, 'URL:', audioUrl);
                cleanup();
                this.currentAudioElement = null; // Ensure it is nulled
                this.isSpeaking = false;
                resolve(false); // Resolve false for fallback
            });
        });
    }

    isSupportedNatively() {
        return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    }

    async repeatCurrentSentence() {
        if (this.currentText) {
            console.log(`AudioManager: Repeating "${this.currentText.substring(0,30)}...".`);
            // If audio is already playing, stop it and then replay.
            // The playSentence method itself calls stopCurrentAudio, so this should be fine.
            if (this.isSpeaking) {
                console.log('AudioManager: Repeat called while speaking, will stop and restart.');
            }
            return await this.playSentence(this.currentText);
        } else {
            console.log('AudioManager: No current sentence to repeat.');
            return false;
        }
    }

    clearCache() {
        this.cache.clear();
        console.log('AudioManager: Cache cleared.');
    }

    // Add other methods like getCacheSize, getCacheStats if needed, 
    // interacting with the new audioCache module.
}

// Export a single instance of the AudioManager
export const audioManager = new AudioManager();
