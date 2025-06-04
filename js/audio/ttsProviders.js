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
        this.ensureVoicesLoaded(); // Start loading voices on instantiation
    }

    async ensureVoicesLoaded() {
        if (this.voicesLoaded || !this.isSupported) return;
        if (this._loadVoicesPromise) return this._loadVoicesPromise; // Return existing promise if load in progress

        this._loadVoicesPromise = new Promise((resolve) => {
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                this.voices = voices;
                this.voicesLoaded = true;
                resolve(this.voices);
            } else {
                const onVoicesChanged = () => {
                    this.voices = speechSynthesis.getVoices();
                    this.voicesLoaded = true;
                    speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                    resolve(this.voices);
                };
                speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
                // Timeout to avoid waiting indefinitely if event doesn't fire
                setTimeout(() => {
                    speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                    if (!this.voicesLoaded) {
                         this.voices = speechSynthesis.getVoices(); // Try one last time
                         this.voicesLoaded = true; 
                         resolve(this.voices);
                    }
                }, 2000); // 2 second timeout for voices loading
            }
        });
        return this._loadVoicesPromise;
    }

    async getBestVoice(language = 'en-US') {
        await this.ensureVoicesLoaded();
        if (!this.voicesLoaded || this.voices.length === 0) {
            return null;
        }
        let voice = this.voices.find(v => v.lang === language && v.localService);
        if (voice) return voice;
        voice = this.voices.find(v => v.lang === language);
        if (voice) return voice;
        const langPrefix = language.split('-')[0];
        voice = this.voices.find(v => v.lang.startsWith(langPrefix) && v.localService);
        if (voice) return voice;
        voice = this.voices.find(v => v.lang.startsWith(langPrefix));
        if (voice) return voice;
        voice = this.voices.find(v => v.default && v.localService);
        if (voice) return voice;
        voice = this.voices.find(v => v.default);
        if (voice) return voice;
        return this.voices.find(v => v.localService) || this.voices[0];
    }

    async playSentence(sentence, options = {}) {
        const {
            volume = 1.0,
            rate = 0.8, // AudioManager default
            pitch = 1.0, // AudioManager default
            language = 'en-US',
            audioManager // Access AudioManager settings directly
        } = options;

        if (!this.isSupported) {
            console.warn('Browser speech synthesis not supported.');
            return false;
        }

        await this.ensureVoicesLoaded();

        return new Promise((resolve, reject) => {
            try {
                speechSynthesis.cancel(); // Stop any ongoing speech

                const utterance = new SpeechSynthesisUtterance(sentence);
                utterance.lang = language;
                utterance.volume = audioManager ? audioManager.volume : volume;
                utterance.rate = audioManager ? audioManager.rate : rate;
                utterance.pitch = audioManager ? audioManager.pitch : pitch;
                
                const selectedVoice = this.getBestVoice(language);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    console.log(`BrowserTTSProvider: Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
                } else {
                    console.log(`BrowserTTSProvider: No specific voice found for ${language}, using default.`);
                }

                let resolved = false;
                utterance.onend = () => {
                    if (!resolved) { resolved = true; resolve(true); }
                };
                utterance.onerror = (e) => {
                    console.error('Browser speech synthesis error:', e);
                    if (!resolved) { resolved = true; resolve(false); } // resolve(false) instead of reject to allow AudioManager to fallback
                };
                 utterance.onboundary = (event) => { // Safari might not fire onend if interrupted early by cancel()
                    if (event.name === 'word') { 
                        // useful for highlighting, not used here for resolving promise
                    }
                };

                // Safety timeout for onend event (e.g. if speech engine hangs)
                const estimatedDuration = (sentence.length / 10) * 1000 * (1 / utterance.rate) + 1000; // Crude estimation
                const playTimeout = Math.max(5000, estimatedDuration); // Min 5s

                setTimeout(() => {
                    if (!resolved) {
                        console.warn(`BrowserTTSProvider: Speech synthesis 'onend' or 'onerror' event timeout after ${playTimeout}ms for: "${sentence.substring(0,30)}..."`);
                        speechSynthesis.cancel(); // Attempt to stop it
                        resolved = true; 
                        resolve(false); // Indicate failure to allow fallback
                    }
                }, playTimeout);

                speechSynthesis.speak(utterance);

            } catch (error) {
                console.error('Error in BrowserTTSProvider.playSentence:', error);
                if (!resolved) { resolved = true; resolve(false); }
            }
        });
    }

    stop() {
        if (this.isSupported) {
            speechSynthesis.cancel();
        }
    }

    async isAvailable() {
        if (!this.isSupported) return false;
        await this.ensureVoicesLoaded();
        return this.voices.length > 0;
    }

    getVoices() {
        return this.voicesLoaded ? this.voices : [];
    }

    getStatus() {
        return {
            supported: this.isSupported,
            voicesLoaded: this.voicesLoaded,
            voiceCount: this.voices.length
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
