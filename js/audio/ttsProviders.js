// Text-to-speech provider implementations

// Google TTS Provider (via your existing /api/audio-cache backend endpoint)
class GoogleTTSProvider {
    constructor() {
        this.name = 'google';
        this.cacheTriggerApiUrl = '/api/audio-cache'; // Your existing endpoint for caching
        this.staticAudioBasePath = '/audio_cache/';     // ASSUMPTION: Your server serves cached files from here
    }

    // This method is now primarily for triggering the cache and getting the filename.
    // The actual playable URL is constructed from the response.
    async playSentence(sentence, options = {}) {
        const { language = 'en-US', audioManager } = options; // volume, rate, pitch are handled by AudioManager on the <audio> element

        if (!audioManager) {
            console.error('GoogleTTSProvider: AudioManager instance not provided in options.');
            return false;
        }

        try {
            // Step 1: POST to your /api/audio-cache to ensure the audio is cached and get its filename.
            const response = await fetch(this.cacheTriggerApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ word: sentence, lang: language }) // Send sentence as 'word'
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error(`GoogleTTSProvider: Cache trigger API error (${response.status}):`, errorData);
                // Attempt to parse error if JSON, otherwise use text
                let detail = errorData;
                try { detail = JSON.parse(errorData).error || errorData; } catch (e) {}
                throw new Error(`Server failed to cache audio (${response.status}): ${detail}`);
            }

            const result = await response.json();

            if (result && result.file) {
                // Step 2: Construct the actual playable URL from the static base path and the returned filename.
                const playableAudioUrl = this.staticAudioBasePath + result.file;
                console.log(`GoogleTTSProvider: Cache success. Playing from: ${playableAudioUrl}`);
                return await audioManager.playAudioElement(playableAudioUrl);
            } else {
                console.error('GoogleTTSProvider: Cache trigger API did not return a valid file.', result);
                throw new Error('Server did not provide a valid audio file name after caching.');
            }

        } catch (error) {
            console.error('GoogleTTSProvider: playSentence failed:', error.message);
            return false;
        }
    }

    // The getAudioUrl method is no longer directly used by playSentence for playback URL construction
    // but can be kept if useful for other purposes or direct URL generation if needed.
    // For consistency, it might mirror the cache trigger logic if it were to be used for fetching.
    // However, the primary mechanism is now playSentence making the POST.
    getAudioUrl(sentence, language = 'en-US') {
        // This method is not directly used for the audio element src with the new POST-then-GET approach.
        // It could represent the POST endpoint URL if needed elsewhere.
        return this.cacheTriggerApiUrl; 
    }

    async isAvailable(audioManager) {
        try {
            // Test by trying to cache a short test sentence
            const response = await fetch(this.cacheTriggerApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: 'test', lang: 'en-US' })
            });
             // Check if response status is OK (200 or 201 for cache success/already cached)
            return response.ok || response.status === 201; 
        } catch (error) {
            console.warn('GoogleTTSProvider isAvailable check failed (POST to /api/audio-cache):', error);
            return false;
        }
    }
}

// Browser Speech Synthesis Provider
class BrowserTTSProvider {
    constructor() {
        this.name = 'browser';
        this.isSupported = 'speechSynthesis' in window;
        this.voices = [];
        this.voicesLoaded = false;
        this._loadVoicesPromise = null; // To avoid multiple concurrent loads
        this.selectedVoice = null; // Initialize selectedVoice
        this.ensureVoicesLoaded().then(voices => { // Start loading voices on instantiation
            if (voices && voices.length > 0) {
                // Attempt to set a default preferred voice once loaded
                this.getBestVoice('en-US').then(voice => { // Example: prefer 'en-US'
                    if (voice) this.selectedVoice = voice;
                });
            }
        }).catch(err => console.warn("BrowserTTSProvider: Error during initial voice loading:", err));
    }

    async ensureVoicesLoaded() {
        if (this.voicesLoaded || !this.isSupported) return this.voices; // Return existing voices if already loaded
        if (this._loadVoicesPromise) return this._loadVoicesPromise; // Return existing promise if load in progress

        this._loadVoicesPromise = new Promise((resolve, reject) => {
            const loadAttempts = 0;
            const tryLoad = () => {
                const voices = speechSynthesis.getVoices();
                if (voices.length > 0) {
                    this.voices = voices;
                    this.voicesLoaded = true;
                    console.log("BrowserTTSProvider: Voices loaded directly:", this.voices.length);
                    resolve(this.voices);
                } else if (speechSynthesis.onvoiceschanged !== undefined) {
                    const onVoicesChanged = () => {
                        speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                        this.voices = speechSynthesis.getVoices();
                        this.voicesLoaded = true;
                        console.log("BrowserTTSProvider: Voices loaded via onvoiceschanged event:", this.voices.length);
                        resolve(this.voices);
                    };
                    speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
                    // Timeout for onvoiceschanged
                    setTimeout(() => {
                        speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                        if (!this.voicesLoaded) {
                            this.voices = speechSynthesis.getVoices(); // Final attempt
                            this.voicesLoaded = true;
                             console.log("BrowserTTSProvider: Voices loaded via onvoiceschanged timeout fallback:", this.voices.length);
                            resolve(this.voices);
                        }
                    }, 1500); // Shorter timeout, e.g., 1.5 seconds
                } else {
                    // Fallback for browsers that don't support onvoiceschanged or if it fails
                    // Try a few times with a delay
                    let attemptCount = 0;
                    const intervalId = setInterval(() => {
                        const currentVoices = speechSynthesis.getVoices();
                        if (currentVoices.length > 0) {
                            clearInterval(intervalId);
                            this.voices = currentVoices;
                            this.voicesLoaded = true;
                            console.log("BrowserTTSProvider: Voices loaded via interval polling:", this.voices.length);
                            resolve(this.voices);
                        } else if (attemptCount >= 5) { // Max 5 attempts (e.g., 2.5 seconds)
                            clearInterval(intervalId);
                            console.warn("BrowserTTSProvider: Failed to load voices after multiple attempts.");
                            this.voicesLoaded = true; // Mark as loaded to prevent further attempts
                            resolve([]); // Resolve with empty array
                        }
                        attemptCount++;
                    }, 500);
                }
            };
            tryLoad();
        });
        return this._loadVoicesPromise;
    }

    async getBestVoice(language = 'en-US') {
        await this.ensureVoicesLoaded();
        if (!this.voicesLoaded || this.voices.length === 0) {
            console.warn("BrowserTTSProvider: No voices loaded when trying to get best voice.");
            return null;
        }
        // Prioritize voices that match the full language tag and are local
        let voice = this.voices.find(v => v.lang === language && v.localService);
        if (voice) return voice;
        // Fallback to any voice matching the full language tag
        voice = this.voices.find(v => v.lang === language);
        if (voice) return voice;
        
        // Fallback to voices matching the primary language (e.g., 'en' from 'en-US')
        const langPrefix = language.split('-')[0];
        voice = this.voices.find(v => v.lang.startsWith(langPrefix) && v.localService);
        if (voice) return voice;
        voice = this.voices.find(v => v.lang.startsWith(langPrefix));
        if (voice) return voice;

        // Fallback to a default local voice if available
        voice = this.voices.find(v => v.default && v.localService);
        if (voice) return voice;
        // Fallback to any default voice
        voice = this.voices.find(v => v.default);
        if (voice) return voice;
        
        // Fallback to the first local voice available
        voice = this.voices.find(v => v.localService);
        if(voice) return voice;

        // Absolute fallback to the very first voice in the list
        return this.voices.length > 0 ? this.voices[0] : null;
    }

    async playSentence(sentence, options = {}) {
        const {
            volume = 1.0,
            rate = 0.8, 
            pitch = 1.0,
            language = 'en-US',
            audioManager 
        } = options;

        if (!this.isSupported) {
            console.warn('BrowserTTSProvider: Speech synthesis not supported.');
            return false;
        }

        await this.ensureVoicesLoaded(); // Ensure voices are loaded before proceeding

        return new Promise(async (resolve, reject) => { // Executor is now async
            let resolved = false; // Moved declaration outside try block
            try {
                // It's crucial to cancel any ongoing speech *before* creating a new utterance
                // or attempting to speak, especially with rapid calls.
                if (speechSynthesis.speaking || speechSynthesis.pending) {
                    console.log("BrowserTTSProvider: Cancelling existing speech.");
                    speechSynthesis.cancel();
                }

                const utterance = new SpeechSynthesisUtterance(sentence);
                utterance.lang = language;
                utterance.volume = audioManager ? audioManager.volume : volume;
                utterance.rate = audioManager ? audioManager.rate : rate;
                utterance.pitch = audioManager ? audioManager.pitch : pitch;
                
                // Use the instance's selectedVoice if available and matches language,
                // otherwise try to get the best one.
                let voiceToUse = null;
                if (this.selectedVoice && this.selectedVoice.lang === language) {
                    voiceToUse = this.selectedVoice;
                } else {
                    voiceToUse = await this.getBestVoice(language);
                    if (voiceToUse) this.selectedVoice = voiceToUse; // Update instance's selected voice
                }
                
                if (voiceToUse) {
                    utterance.voice = voiceToUse;
                    console.log(`BrowserTTSProvider: Using voice: ${voiceToUse.name} (${voiceToUse.lang})`);
                } else {
                    console.warn(`BrowserTTSProvider: No specific voice found for ${language}. Using browser default for the utterance.`);
                    // If voiceToUse is null, utterance.voice is not set, browser uses its default for the utterance.lang
                }

                utterance.onend = () => {
                    if (!resolved) { resolved = true; resolve(true); }
                };
                utterance.onerror = (e) => {
                    console.error('BrowserTTSProvider: SpeechSynthesisUtterance error event:', e);
                    if (!resolved) { resolved = true; resolve(false); } // Resolve false for AudioManager to fallback
                };
                utterance.onboundary = (event) => { 
                    // Can be used for word highlighting if needed.
                    // Some browsers (like Safari) might clear pending queue on cancel,
                    // and onend might not fire reliably if canceled mid-speech.
                    // onboundary is not directly used for promise resolution here.
                };

                const estimatedDuration = (sentence.length / 10) * 1000 * (1 / (utterance.rate || 1)) + 2000; // Add buffer
                const playTimeout = Math.max(5000, estimatedDuration); 

                const timeoutId = setTimeout(() => {
                    if (!resolved) {
                        console.warn(`BrowserTTSProvider: Speech synthesis 'onend' or 'onerror' event timeout after ${playTimeout}ms for: "${sentence.substring(0,30)}..." Attempting to cancel.`);
                        speechSynthesis.cancel(); // Attempt to stop it
                        resolved = true; 
                        resolve(false); // Indicate failure to allow fallback
                    }
                }, playTimeout);

                // Clear timeout on normal resolution
                const originalResolve = resolve;
                resolve = (val) => {
                    clearTimeout(timeoutId);
                    originalResolve(val);
                };
                // No need to wrap reject, as onerror already handles it via resolve(false)

                speechSynthesis.speak(utterance);

            } catch (error) { // Catches errors from setup (e.g. new SpeechSynthesisUtterance, or if speak itself throws early)
                console.error('BrowserTTSProvider: Error in playSentence promise execution:', error);
                if (!resolved) { 
                    // No need to set resolved = true here, as resolve(false) handles it via the wrapped resolve
                    resolve(false); // Use the wrapped resolve to ensure timeout is cleared
                }
            }
        });
    }

    stop() {
        if (this.isSupported) {
            console.log("BrowserTTSProvider: stop() called, cancelling speech.");
            speechSynthesis.cancel();
        }
    }

    async isAvailable() {
        if (!this.isSupported) return false;
        await this.ensureVoicesLoaded();
        return this.voices.length > 0;
    }

    getVoices() {
        // Returns a promise that resolves with the voices array
        return this.ensureVoicesLoaded();
    }
    
    getCurrentVoicesList() { // Synchronous way to get currently loaded voices
        return this.voicesLoaded ? this.voices : [];
    }


    getStatus() {
        return {
            supported: this.isSupported,
            voicesLoaded: this.voicesLoaded,
            voiceCount: this.voices.length,
            selectedVoiceName: this.selectedVoice ? this.selectedVoice.name : 'None'
        };
    }
}

// Factory to get providers (optional, but good for organization)
class TTSProviderFactory {
    constructor() {
        this.providers = {
            google: new GoogleTTSProvider(),
            browser: new BrowserTTSProvider()
        };
    }

    getProvider(name) {
        return this.providers[name];
    }

    getAllProviders() {
        return this.providers;
    }

    // Example: Test all providers
    async testAllProviders(audioManagerInstance) {
        const results = {};
        for (const name in this.providers) {
            const provider = this.providers[name];
            if (provider && typeof provider.isAvailable === 'function') {
                results[name] = await provider.isAvailable(audioManagerInstance);
                console.log(`Provider ${name} available: ${results[name]}`);
                if (results[name] && typeof provider.playSentence === 'function') {
                    console.log(`Testing playback for ${name}...`);
                    // Pass options including the audioManager instance
                    await provider.playSentence('Hello from provider test.', { audioManager: audioManagerInstance });
                }
            }
        }
        return results;
    }
}

// Export instances or the factory
export const googleTTSProvider = new GoogleTTSProvider();
export const browserTTSProvider = new BrowserTTSProvider();
export const ttsProviderFactory = new TTSProviderFactory();
