// Text-to-speech provider implementations

// Dictionary API TTS Provider
class DictionaryTTSProvider {
    constructor() {
        this.name = 'dictionary';
        this.baseUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
        this.timeout = 3000; // 3 second timeout
    }

    // Get audio URL from dictionary API
    async getAudioUrl(word) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(`${this.baseUrl}${word}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Dictionary API error: ${response.status}`);
            }

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

            // Return US audio if available, otherwise use first available
            return usAudioUrl || fallbackAudioUrl;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Dictionary API timeout');
            } else {
                console.log('Dictionary API failed:', error);
            }
            return null;
        }
    }

    // Play word using dictionary API
    async playWord(word, options = {}) {
        const { volume = 1.0, cache = null } = options;

        try {
            const audioUrl = await this.getAudioUrl(word);
            
            if (audioUrl) {
                // Cache the URL if cache is provided
                if (cache) {
                    cache.set(word, audioUrl);
                }

                const audio = new Audio(audioUrl);
                audio.volume = volume;

                return new Promise((resolve) => {
                    audio.onended = () => resolve(true);
                    audio.onerror = () => resolve(false);
                    audio.play().catch(() => resolve(false));
                });
            }

            return false;
        } catch (error) {
            console.error('Dictionary TTS playback failed:', error);
            return false;
        }
    }

    // Test if dictionary API is available
    async isAvailable() {
        try {
            const audioUrl = await this.getAudioUrl('test');
            return audioUrl !== null;
        } catch (error) {
            return false;
        }
    }
}

// Google TTS Provider
class GoogleTTSProvider {
    constructor() {
        this.name = 'google';
        this.baseUrl = 'https://translate.google.com/translate_tts';
    }

    // Generate Google TTS URL
    getAudioUrl(word, language = 'en') {
        const params = new URLSearchParams({
            ie: 'UTF-8',
            q: word,
            tl: language,
            client: 'tw-ob'
        });

        return `${this.baseUrl}?${params.toString()}`;
    }

    // Play word using Google TTS
    async playWord(word, options = {}) {
        const { volume = 1.0, language = 'en', cache = null } = options;

        try {
            const audioUrl = this.getAudioUrl(word, language);
            
            // Cache the URL if cache is provided
            if (cache) {
                const cacheKey = `google_${word}`;
                cache.set(cacheKey, audioUrl);
            }

            const audio = new Audio(audioUrl);
            audio.volume = volume;
            
            // Set crossOrigin for CORS (may not always work)
            audio.crossOrigin = 'anonymous';

            return new Promise((resolve) => {
                audio.onended = () => resolve(true);
                audio.onerror = () => resolve(false);
                audio.play().catch(() => resolve(false));
            });

        } catch (error) {
            console.error('Google TTS playback failed:', error);
            return false;
        }
    }

    // Test if Google TTS is available
    async isAvailable() {
        try {
            return await this.playWord('test');
        } catch (error) {
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
    }

    // Load available voices
    async loadVoices() {
        if (!this.isSupported) {
            return [];
        }

        return new Promise((resolve) => {
            const voices = speechSynthesis.getVoices();
            
            if (voices.length > 0) {
                this.voices = voices;
                this.voicesLoaded = true;
                resolve(voices);
            } else {
                // Wait for voices to load
                const onVoicesChanged = () => {
                    this.voices = speechSynthesis.getVoices();
                    this.voicesLoaded = true;
                    speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                    resolve(this.voices);
                };
                
                speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                    this.voices = speechSynthesis.getVoices();
                    this.voicesLoaded = true;
                    resolve(this.voices);
                }, 5000);
            }
        });
    }

    // Get best voice for language
    getBestVoice(language = 'en-US') {
        if (!this.voicesLoaded) {
            return null;
        }

        // Look for exact match
        let voice = this.voices.find(v => v.lang === language);
        if (voice) return voice;

        // Look for language prefix match
        const langPrefix = language.split('-')[0];
        voice = this.voices.find(v => v.lang.startsWith(langPrefix));
        if (voice) return voice;

        // Look for default voice
        voice = this.voices.find(v => v.default);
        if (voice) return voice;

        // Return first available voice
        return this.voices.length > 0 ? this.voices[0] : null;
    }

    // Play word using browser speech synthesis
    async playWord(word, options = {}) {
        const { 
            volume = 1.0, 
            rate = 0.6, 
            pitch = 1.0, 
            language = 'en-US',
            voice = null 
        } = options;

        if (!this.isSupported) {
            console.log('Speech synthesis not supported');
            return false;
        }

        return new Promise(async (resolve) => {
            try {
                // Stop any ongoing speech
                speechSynthesis.cancel();

                // Load voices if not already loaded
                if (!this.voicesLoaded) {
                    await this.loadVoices();
                }

                const utterance = new SpeechSynthesisUtterance(word);
                
                // Configure speech settings
                utterance.rate = rate;
                utterance.pitch = pitch;
                utterance.volume = volume;
                utterance.lang = language;

                // Set voice if specified, otherwise use best available
                if (voice) {
                    utterance.voice = voice;
                } else {
                    const bestVoice = this.getBestVoice(language);
                    if (bestVoice) {
                        utterance.voice = bestVoice;
                    }
                }

                // Set up event handlers
                utterance.onend = () => resolve(true);
                utterance.onerror = (error) => {
                    console.error('Speech synthesis error:', error);
                    resolve(false);
                };

                // Speak the word
                speechSynthesis.speak(utterance);

            } catch (error) {
                console.error('Browser TTS failed:', error);
                resolve(false);
            }
        });
    }

    // Stop current speech
    stop() {
        if (this.isSupported) {
            speechSynthesis.cancel();
        }
    }

    // Test if browser TTS is available
    async isAvailable() {
        return this.isSupported;
    }

    // Get available voices
    getVoices() {
        return this.voices;
    }

    // Get TTS status
    getStatus() {
        if (!this.isSupported) {
            return { supported: false };
        }

        return {
            supported: true,
            speaking: speechSynthesis.speaking,
            pending: speechSynthesis.pending,
            paused: speechSynthesis.paused,
            voicesLoaded: this.voicesLoaded,
            voiceCount: this.voices.length
        };
    }
}

// TTS Provider Factory
class TTSProviderFactory {
    constructor() {
        this.providers = {
            dictionary: new DictionaryTTSProvider(),
            google: new GoogleTTSProvider(),
            browser: new BrowserTTSProvider()
        };
    }

    // Get provider by name
    getProvider(name) {
        return this.providers[name] || null;
    }

    // Get all providers
    getAllProviders() {
        return this.providers;
    }

    // Test all providers
    async testAllProviders() {
        const results = {};

        for (const [name, provider] of Object.entries(this.providers)) {
            try {
                results[name] = {
                    available: await provider.isAvailable(),
                    name: provider.name
                };
            } catch (error) {
                results[name] = {
                    available: false,
                    name: provider.name,
                    error: error.message
                };
            }
        }

        return results;
    }
}

// Create global instances
const ttsProviderFactory = new TTSProviderFactory();
const dictionaryTTS = ttsProviderFactory.getProvider('dictionary');
const googleTTS = ttsProviderFactory.getProvider('google');
const browserTTS = ttsProviderFactory.getProvider('browser');

// Export for global access
window.ttsProviderFactory = ttsProviderFactory;
window.dictionaryTTS = dictionaryTTS;
window.googleTTS = googleTTS;
window.browserTTS = browserTTS;
