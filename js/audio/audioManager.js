// Audio system coordination and management
import { googleTTSProvider, browserTTSProvider } from './ttsProviders.js';
import { audioCache } from './audioCache.js'; // Assuming audioCache.js exports an instance or class

// Default audio settings
const DEFAULT_AUDIO_METHOD = 'google'; // Try Google TTS first, then browser
const DEFAULT_VOLUME = 1.0;
const DEFAULT_SPEECH_RATE = 0.8;
const DEFAULT_SPEECH_PITCH = 1.0;
const GOOGLE_TTS_INITIATION_TIMEOUT_MS = 3000; // 3 seconds timeout for Google TTS initiation

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
        this.isSpeaking = false; // Master flag: true if any audio playback is active or pending completion
        this.currentAudioElementPromise = null; // To track the promise of the currently playing <audio> element for its full duration

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
        console.log("AudioManager: stopCurrentAudio called.");
        if (this.currentAudioElement) {
            if (!this.currentAudioElement.paused) {
                this.currentAudioElement.pause();
            }
            this.currentAudioElement.src = ''; // Listeners are managed by playAudioElement's completion promise resolution
            this.currentAudioElement = null;
            console.log("AudioManager: Stopped and cleared <audio> element.");
        }
        this.currentAudioElementPromise = null; // Clear the promise for audio completion
        
        if (this.isSupportedNatively() && (speechSynthesis.speaking || speechSynthesis.pending)) {
            speechSynthesis.cancel();
            console.log("AudioManager: Cancelled native speech synthesis via speechSynthesis.cancel().");
        }
        this.isSpeaking = false; 
        console.log("AudioManager: stopCurrentAudio finished, isSpeaking set to false.");
    }

    async playSentence(sentence) {
        if (!this.isEnabled || !sentence || typeof sentence !== 'string' || sentence.trim() === '') {
            console.log('AudioManager: Playback skipped (disabled or empty/invalid sentence).');
            return false;
        }

        if (this.isSpeaking) {
            console.log(`AudioManager: playSentence called for "${sentence.substring(0,30)}..." but already speaking. Request ignored.`);
            return false; 
        }
        
        this.isSpeaking = true; 
        this.currentText = sentence; 
        console.log(`AudioManager: Attempting to play "${this.currentText.substring(0,30)}...". isSpeaking = true.`);

        let operationSucceeded = false; // Tracks the success of the entire playSentence operation
        const options = {
            volume: this.volume,
            rate: this.rate,
            pitch: this.pitch,
            audioManager: this,
            initiationTimeout: GOOGLE_TTS_INITIATION_TIMEOUT_MS 
        };

        try {
            if (this.method === 'google') {
                console.log(`AudioManager: Trying Google TTS for "${this.currentText.substring(0,30)}...".`);
                
                const googlePlayInitiationPromise = googleTTSProvider.playSentence(this.currentText, options);
                const timeoutPromise = new Promise(resolve => 
                    setTimeout(() => resolve("timeout"), GOOGLE_TTS_INITIATION_TIMEOUT_MS)
                );

                const initiationResult = await Promise.race([googlePlayInitiationPromise, timeoutPromise]);

                if (initiationResult === true) { // Google TTS initiation was successful
                    console.log("AudioManager: Google TTS initiation successful. Waiting for playback completion.");
                    if (this.currentAudioElementPromise) {
                        operationSucceeded = await this.currentAudioElementPromise; 
                        if (!operationSucceeded) {
                            console.log("AudioManager: Google TTS initiated but playback failed/aborted during its course.");
                        } else {
                            console.log("AudioManager: Google TTS playback completed successfully.");
                        }
                    } else {
                        console.error("AudioManager: Google TTS initiated but currentAudioElementPromise is missing.");
                        operationSucceeded = false; 
                    }
                } else { // Initiation failed (provider returned false) or timed out (race returned "timeout")
                    if (initiationResult === "timeout") {
                        console.warn("AudioManager: Google TTS initiation timed out.");
                    } else {
                        console.log("AudioManager: Google TTS provider indicated initiation failure (returned false).");
                    }
                    this.stopCurrentAudio(); // Stop any partial Google attempt. Sets isSpeaking = false.
                    this.isSpeaking = true;  // Re-claim lock for BrowserTTS for this playSentence operation.
                    
                    console.log("AudioManager: Falling back to browser TTS.");
                    operationSucceeded = await browserTTSProvider.playSentence(this.currentText, options);
                }
            } else if (this.method === 'browser') {
                console.log(`AudioManager: Trying Browser TTS for "${this.currentText.substring(0,30)}...".`);
                operationSucceeded = await browserTTSProvider.playSentence(this.currentText, options);
            } else { // Fallback for unknown method
                console.warn(`AudioManager: Unknown method ${this.method}, defaulting to browser TTS.`);
                operationSucceeded = await browserTTSProvider.playSentence(this.currentText, options);
            }
        } catch (error) { 
            console.error(`AudioManager: Overall error during playSentence for "${this.currentText.substring(0,30)}...":`, error);
            operationSucceeded = false;
            if (this.method === 'google' && !operationSucceeded) { 
                 try {
                    console.log('AudioManager: Catastrophic error in GoogleTTS path, attempting final direct browser fallback.');
                    this.stopCurrentAudio(); 
                    this.isSpeaking = true; 
                    operationSucceeded = await browserTTSProvider.playSentence(this.currentText, options);
                } catch (finalError) { 
                    console.error('AudioManager: Final browser TTS fallback also failed catastrophically:', finalError); 
                }
            }
        } finally {
            this.isSpeaking = false; 
            console.log(`AudioManager: playSentence for "${this.currentText.substring(0,30)}..." finished. isSpeaking = false. Final operationSucceeded: ${operationSucceeded}`);
        }
        return operationSucceeded;
    }

    // This method should resolve TRUE upon successful *initiation* of playback,
    // and FALSE if initiation fails. It also sets up a promise (this.currentAudioElementPromise)
    // that resolves/rejects when the audio actually finishes/errors.
    async playAudioElement(audioUrl) {
        console.log("AudioManager.playAudioElement: Called for URL:", audioUrl);
        
        if (this.currentAudioElement && this.currentAudioElement.src === audioUrl && !this.currentAudioElement.paused) {
            console.warn("AudioManager.playAudioElement: Attempt to play same URL that is already playing. Stopping existing and replaying for new promise chain.");
            this.currentAudioElement.pause();
            this.currentAudioElement.src = ''; // Ensure it stops and releases old listeners context
        } else if (this.currentAudioElement && this.currentAudioElement.src !== audioUrl && !this.currentAudioElement.paused) {
            console.log("AudioManager.playAudioElement: Stopping different existing audio element.");
            this.currentAudioElement.pause();
            this.currentAudioElement.src = '';
        }
        // Always clear old promise before creating a new audio element and its promise
        this.currentAudioElementPromise = null; 

        this.currentAudioElement = new Audio(audioUrl);
        this.currentAudioElement.volume = this.volume;
        this.currentAudioElement.crossOrigin = 'anonymous'; 

        // This promise (currentAudioElementPromise) is for the *completion* of the audio playback.
        this.currentAudioElementPromise = new Promise((resolveCompletion) => {
            const element = this.currentAudioElement; 
            if (!element) {
                console.error("AudioManager.playAudioElement: currentAudioElement is null unexpectedly during completion promise setup.");
                resolveCompletion(false); 
                return;
            }
            let hasSettledCompletion = false;
            const uniqueId = Date.now() + Math.random(); // For debugging listener scope
            // console.log(`AudioManager.playAudioElement [${uniqueId}]: Setting up completion listeners for ${audioUrl}`);

            const onEnded = () => {
                if (hasSettledCompletion) return;
                hasSettledCompletion = true;
                console.log(`AudioManager.playAudioElement [${uniqueId}]: Playback ended for`, audioUrl);
                cleanupListeners();
                resolveCompletion(true); 
            };
            const onError = (e) => {
                if (hasSettledCompletion) return;
                hasSettledCompletion = true;
                console.error(`AudioManager.playAudioElement [${uniqueId}]: Error event for`, audioUrl, e);
                cleanupListeners();
                resolveCompletion(false); 
            };
            const onAbort = () => {
                if (hasSettledCompletion) return;
                hasSettledCompletion = true;
                console.log(`AudioManager.playAudioElement [${uniqueId}]: Abort event for`, audioUrl);
                cleanupListeners();
                resolveCompletion(false); 
            };

            const cleanupListeners = () => {
                // console.log(`AudioManager.playAudioElement [${uniqueId}]: Cleaning up listeners for ${audioUrl}`);
                if (element) {
                    element.removeEventListener('ended', onEnded);
                    element.removeEventListener('error', onError);
                    element.removeEventListener('abort', onAbort);
                }
            };
            
            element.addEventListener('ended', onEnded);
            element.addEventListener('error', onError);
            element.addEventListener('abort', onAbort);
        });
        
        // This returned promise is for the *initiation* of playback.
        return new Promise((resolveInitiation) => {
            if (!this.currentAudioElement) { 
                 console.error("AudioManager.playAudioElement: currentAudioElement is null before play() call.");
                 this.currentAudioElementPromise = Promise.resolve(false); 
                 resolveInitiation(false);
                 return;
            }
            this.currentAudioElement.play()
                .then(() => {
                    console.log("AudioManager.playAudioElement: .play() successful (initiation) for", audioUrl);
                    resolveInitiation(true); 
                })
                .catch(playError => {
                    console.error('AudioManager.playAudioElement: .play() rejected (initiation failed) for', audioUrl, playError);
                    // Ensure the completion promise also reflects this failure if it hasn't already been settled by an error/abort event.
                    if (this.currentAudioElementPromise) { // Check if it was set
                        // Manually resolve completion as false if initiation failed, unless it already settled.
                        // This is tricky because error/abort events might fire. For now, let them handle completion promise.
                        // The main thing is initiation failed.
                    }
                    this.currentAudioElementPromise = Promise.resolve(false); // Overwrite/set if it wasn't already failed.
                    resolveInitiation(false); 
                });
        });
    }

    isSupportedNatively() {
        return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    }

    async repeatCurrentSentence() {
        if (!this.isEnabled) {
            console.log("AudioManager: Repeat skipped (AudioManager disabled).");
            return false;
        }
        if (this.isSpeaking) { 
            console.log("AudioManager: Repeat skipped (already speaking).");
            return false;
        }
        if (!this.currentText) {
            console.log('AudioManager: No current sentence to repeat.');
            return false;
        }
        
        console.log(`AudioManager: repeatCurrentSentence called for "${this.currentText.substring(0,30)}...".`);
        return await this.playSentence(this.currentText); 
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
