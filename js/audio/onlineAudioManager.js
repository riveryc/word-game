// Placeholder for onlineAudioManager.js
// This file will handle:
// - Initializing audio controls (online/offline selection)
// - Playing word audio based on selection (calling backend or browser TTS)
// - Handling fallback to browser TTS if online methods fail or timeout

console.log("onlineAudioManager.js evaluating");

// Global state for the selected audio source
window.currentAudioSource = 'online'; // Default to online, matching the checked radio button

// Helper for word normalization (should be consistent with backend)
function normalizeWordForAudio(word) {
    if (typeof word !== 'string') return '';
    return word.trim().toLowerCase(); // Example, align with server normalize_word if more complex
}

/**
 * Initializes audio controls, sets up event listeners for audio source selection.
 */
function initAudioControls() {
    console.log("Attempting to initialize Online Audio Manager controls (div-based)...");
    const audioOptions = document.querySelectorAll('.tts-option');

    if (audioOptions.length > 0) {
        console.log("Audio option divs found for div-based selection.");

        const updateSelection = (selectedOptionDiv) => {
            audioOptions.forEach(opt => opt.classList.remove('selected'));
            selectedOptionDiv.classList.add('selected');
            
            const method = selectedOptionDiv.dataset.method;
            if (method) {
                window.currentAudioSource = method;
                console.log("Audio source changed to:", window.currentAudioSource);
            } else {
                console.warn("Clicked audio option div is missing data-method attribute.");
            }
        };

        audioOptions.forEach(optionDiv => {
            optionDiv.addEventListener('click', function() {
                updateSelection(this);
            });
        });
        
        // Set initial state from the div that has .selected class from HTML
        let initialStateSet = false;
        const initiallySelectedDiv = document.querySelector('.tts-option.selected');
        if (initiallySelectedDiv) {
            const initialMethod = initiallySelectedDiv.dataset.method;
            if (initialMethod) {
                window.currentAudioSource = initialMethod;
                console.log("Initial audio source (from selected div):", window.currentAudioSource);
                initialStateSet = true;
            } else {
                console.warn("Initially selected div is missing data-method. Defaulting...");
            }
        }

        // Fallback if no .selected class was found in HTML or data-method was missing
        if (!initialStateSet) {
            console.log("No initial .selected div with data-method found, or data-method missing. Defaulting to 'online'.");
            const onlineOptionDiv = Array.from(audioOptions).find(opt => opt.dataset.method === 'online');
            if (onlineOptionDiv) {
                updateSelection(onlineOptionDiv);
            } else if (audioOptions.length > 0) {
                // If online specifically isn't found, default to the first option available
                updateSelection(audioOptions[0]); 
            }
        }

    } else {
        console.error("Audio option divs (.tts-option) not found for div-based selection!");
    }
}

/**
 * Main function to play audio for a given word based on the current source selection.
 * This function should be called by your game logic, e.g., gameManager.js
 * @param {string} word The word to play.
 */
function playWordAudio(word) {
    const normalizedWord = normalizeWordForAudio(word);
    if (!normalizedWord) {
        console.error("playWordAudio: Word is empty after normalization.");
        return;
    }

    console.log(`playWordAudio called for: '${normalizedWord}', source: ${window.currentAudioSource}`);

    if (window.currentAudioSource === 'offline') {
        playBrowserTTS(normalizedWord);
    } else { // 'online'
        playOnlineAudioUnified(normalizedWord);
    }
}

/**
 * Handles fetching/playing audio from online sources (via backend).
 * Includes logic for POSTing to /api/cache_audio and then playing from /api/audio/<filename>.
 * Implements timeout and fallback to browser TTS.
 * @param {string} word The normalized word to play online.
 */
async function playOnlineAudioUnified(word) {
    console.log(`playOnlineAudioUnified: Attempting to play '${word}' online.`);
    let audioPlayer = null; // To control the audio player instance
    let fallbackTimeoutId = null;

    const fallbackToBrowserTTS = () => {
        clearTimeout(fallbackTimeoutId);
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.src = ''; // Detach source to stop any further loading/playing
            audioPlayer = null;
        }
        console.warn(`Online audio failed or timed out for '${word}'. Falling back to browser TTS.`);
        playBrowserTTS(word);
    };

    try {
        const cacheResponse = await fetch('/api/audio-cache', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ word: word })
        });

        if (!cacheResponse.ok) {
            const errorData = await cacheResponse.json().catch(() => ({ error: "Failed to parse error from cache_audio" }));
            console.error(`Error response from /api/cache_audio for '${word}': ${cacheResponse.status}`, errorData);
            fallbackToBrowserTTS();
            return;
        }

        const cacheData = await cacheResponse.json();
        if (cacheData && cacheData.file) {
            const audioUrl = `/audio_cache/${cacheData.file}`;
            console.log(`playOnlineAudioUnified: Playing from ${audioUrl} (cached via ${cacheData.method_used})`);

            audioPlayer = new Audio(audioUrl);

            fallbackTimeoutId = setTimeout(fallbackToBrowserTTS, 3000); // 3-second timeout

            audioPlayer.oncanplaythrough = () => {
                if (!audioPlayer) return; // Player might have been nulled by timeout already
                clearTimeout(fallbackTimeoutId);
                console.log(`Audio for '${word}' is ready to play from server.`);
                audioPlayer.play().catch(err => {
                    console.error(`Error playing server audio for '${word}':`, err);
                    fallbackToBrowserTTS(); // Fallback if play() itself fails
                });
            };

            audioPlayer.onerror = (e) => {
                if (!audioPlayer) return; // Avoid acting if already handled by timeout
                clearTimeout(fallbackTimeoutId);
                console.error(`Error loading audio from ${audioUrl} for '${word}':`, e);
                fallbackToBrowserTTS();
            };
            
            // Start loading the audio. Some browsers require this explicitly.
            audioPlayer.load(); 

        } else {
            console.error(`Invalid response from /api/cache_audio for '${word}':`, cacheData);
            fallbackToBrowserTTS();
        }

    } catch (error) {
        console.error(`Network or other error in playOnlineAudioUnified for '${word}':`, error);
        fallbackToBrowserTTS();
    }
}

/**
 * Plays the given word using the browser's SpeechSynthesis API.
 * This function might already exist or be similar to one in js/audio/audioManager.js
 * Ensure this is adapted or replaced if a central TTS function exists.
 * @param {string} word The word to speak.
 */
function playBrowserTTS(word) {
    console.log(`playBrowserTTS: Speaking '${word}' using browser synthesis.`);
    if ('speechSynthesis' in window) {
        // Cancel any currently speaking utterances to prevent overlap / queue buildup
        window.speechSynthesis.cancel(); 
        
        const utterance = new SpeechSynthesisUtterance(word);
        // Optional: Configure utterance (e.g., lang, rate, voice)
        // utterance.lang = 'en-US'; // Example: set language
        // utterance.rate = 1.0;    // Example: set rate
        
        // Log available voices for debugging, if needed
        // if (!playBrowserTTS.voicesLogged) {
        //     console.log("Available browser voices:", window.speechSynthesis.getVoices());
        //     playBrowserTTS.voicesLogged = true; // Log only once
        // }

        window.speechSynthesis.speak(utterance);
    } else {
        console.error("Browser SpeechSynthesis not supported.");
        // Potentially provide some UI feedback if browser TTS is selected but not supported.
    }
}

// Initialize controls when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initAudioControls);

// Make playWordAudio globally accessible if it's called from other scripts not using modules
window.playWordAudio = playWordAudio; 

/**
 * Ensures a word's audio is cached on the server without playing it.
 * @param {string} word The word to cache.
 * @returns {Promise<boolean>} True if caching was successful or already cached, false otherwise.
 */
async function ensureWordIsCached(word) {
    const normalizedWord = normalizeWordForAudio(word);
    if (!normalizedWord) {
        console.error("ensureWordIsCached: Word is empty after normalization.");
        return false;
    }

    console.log(`ensureWordIsCached: Attempting to cache '${normalizedWord}'.`);
    try {
        const cacheResponse = await fetch('/api/audio-cache', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ word: normalizedWord })
        });

        if (!cacheResponse.ok) {
            const errorData = await cacheResponse.json().catch(() => ({ error: "Failed to parse error from cache_audio" }));
            console.error(`Error response from /api/cache_audio for '${normalizedWord}' during caching: ${cacheResponse.status}`, errorData);
            return false;
        }
        // Success (200 or 201)
        const responseData = await cacheResponse.json();
        console.log(`ensureWordIsCached: Successfully processed '${normalizedWord}'. Server response:`, responseData.message);
        return true;
    } catch (error) {
        console.error(`Network or other error in ensureWordIsCached for '${normalizedWord}':`, error);
        return false;
    }
}
window.ensureWordIsCached = ensureWordIsCached; // Expose globally
// Or, if using modules, export it and import where needed. 