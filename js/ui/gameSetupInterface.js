// js/ui/gameSetupInterface.js
// import audioManager from '../audio/audioManager.js'; // REMOVED

let wordCountInputElement;
let wordCountSelectionDivElement;
let levelSelectionDivElement;
let contentDivElement;
// let ttsOptionElements; // REMOVED - Cache for TTS option elements

// Callbacks to be set during initialization
let onWordCountChangeCallback; // Expected to be setGameManagerConfig({ selectedWordCount: ... })
let getGlobalStateCallback;    // Expected to be getScriptGlobals()
let updateBackButtonVisibilityCallback; // Expected to be the function from confirmationDialog.js

function _updateWordCountDisplayAndListener() {
    // Explicitly check if elements are valid DOM objects
    if (!(wordCountInputElement instanceof HTMLElement) || !document.body.contains(wordCountInputElement)) {
        console.error("[GameSetupInterface] _updateWordCountDisplayAndListener: wordCountInputElement is not a valid or attached DOM element.", wordCountInputElement);
        return;
    }
    if (!(wordCountSelectionDivElement instanceof HTMLElement) || !document.body.contains(wordCountSelectionDivElement)) {
        console.error("[GameSetupInterface] _updateWordCountDisplayAndListener: wordCountSelectionDivElement is not a valid or attached DOM element.", wordCountSelectionDivElement);
        return;
    }

    const globals = getGlobalStateCallback ? getGlobalStateCallback() : {};
    const numFilteredWords = globals.allWords ? globals.allWords.length : 0;
    let currentSelectedWordCount = globals.scriptSelectedWordCount || 20; // Default if not found

    console.log('[GameSetupInterface] _updateWordCountDisplayAndListener - numFilteredWords:', numFilteredWords);

    if (numFilteredWords > 0) {
        wordCountSelectionDivElement.style.display = 'block';
        
        wordCountInputElement.value = Math.min(currentSelectedWordCount, numFilteredWords);
        wordCountInputElement.max = numFilteredWords;

        const newWordCountInput = wordCountInputElement.cloneNode(true);
        if (wordCountInputElement.parentNode) {
            wordCountInputElement.parentNode.replaceChild(newWordCountInput, wordCountInputElement);
            wordCountInputElement = newWordCountInput; 
        } else {
            console.error("[GameSetupInterface] wordCountInputElement has no parentNode for replacement.");
            return; 
        }
        
        wordCountInputElement.addEventListener('input', function() {
            let newCount = parseInt(this.value) || 1;
            const currentGlobalsForMax = getGlobalStateCallback ? getGlobalStateCallback() : {};
            const currentMaxWords = currentGlobalsForMax.allWords ? currentGlobalsForMax.allWords.length : 1;
            newCount = Math.max(1, Math.min(newCount, currentMaxWords)); 
            this.value = newCount;
            if (onWordCountChangeCallback) {
                onWordCountChangeCallback({ selectedWordCount: newCount });
            }
        });
        
        if (onWordCountChangeCallback) {
            onWordCountChangeCallback({ selectedWordCount: parseInt(wordCountInputElement.value) });
        }

    } else {
        wordCountSelectionDivElement.style.display = 'none';
        if (onWordCountChangeCallback) {
            onWordCountChangeCallback({ selectedWordCount: 0 });
        }
    }
}

export function initializeGameSetupInterface(dependencies) {
    console.log("%%%%%%%%%%%%%%%% GAMESETUPINTERFACE INITIALIZE STARTS %%%%%%%%%%%%%%%%");
    console.log("[GameSetupInterface] Initializing...");
    // Cache DOM elements
    wordCountInputElement = document.getElementById('word-count-input');
    console.log("[GameSetupInterface] wordCountInputElement found:", wordCountInputElement);

    wordCountSelectionDivElement = document.getElementById('word-count-selection');
    console.log("[GameSetupInterface] wordCountSelectionDivElement found:", wordCountSelectionDivElement);

    levelSelectionDivElement = document.getElementById('level-selection');
    console.log("[GameSetupInterface] levelSelectionDivElement found:", levelSelectionDivElement);

    contentDivElement = document.getElementById('content');
    console.log("[GameSetupInterface] contentDivElement found:", contentDivElement);

    // ttsOptionElements = document.querySelectorAll('.tts-selection .tts-option'); // REMOVED
    // console.log("[GameSetupInterface] ttsOptionElements found:", ttsOptionElements); // REMOVED

    if (!wordCountInputElement) {
        console.error("[GameSetupInterface] Failed to cache 'word-count-input'. Ensure it exists in index.html.");
    }
    if (!wordCountSelectionDivElement) {
        console.error("[GameSetupInterface] Failed to cache 'word-count-selection'. Ensure it exists in index.html.");
    }
    if (!levelSelectionDivElement) {
        console.error("[GameSetupInterface] Failed to cache 'level-selection'. Ensure it exists in index.html.");
    }
    if (!contentDivElement) {
        console.error("[GameSetupInterface] Failed to cache 'content'. Ensure it exists in index.html.");
    }
    // if (!ttsOptionElements || ttsOptionElements.length === 0) { // REMOVED
    //    console.error("[GameSetupInterface] Failed to cache TTS option elements. Ensure '.tts-selection .tts-option' exists in index.html.");
    // }

    // Setup dependencies
    onWordCountChangeCallback = dependencies.onWordCountChange; 
    getGlobalStateCallback = dependencies.getGlobalState;       
    updateBackButtonVisibilityCallback = dependencies.updateBackButtonVisibility; 

    if (typeof onWordCountChangeCallback !== 'function') {
        console.warn('[GameSetupInterface] onWordCountChangeCallback is not a function.');
    }
    if (typeof getGlobalStateCallback !== 'function') {
        console.warn('[GameSetupInterface] getGlobalStateCallback is not a function.');
    }
    if (typeof updateBackButtonVisibilityCallback !== 'function') {
        console.warn('[GameSetupInterface] updateBackButtonVisibilityCallback is not a function.');
    }
    // _setupTTSSelectionListeners(); // REMOVED - Setup listeners for TTS options
    console.log("[GameSetupInterface] Initialized.");
}

export function displayGameSetupScreen(callbacks) {
    console.log('[GameSetupInterface] displayGameSetupScreen called.');
    // Ensure elements are valid before trying to use them, in case initialization had issues.
    if (!(contentDivElement instanceof HTMLElement)) {
        console.error("[GameSetupInterface] displayGameSetupScreen: contentDivElement is not valid.");
    } else {
        // REMOVED: contentDivElement.style.display = 'none'; // core.js now manages content visibility
        // Ensure level selection and word count are children of a visible content div
    }
    
    _updateWordCountDisplayAndListener(); // Sets up word count UI and listener

    if (!(levelSelectionDivElement instanceof HTMLElement)) {
        console.error("[GameSetupInterface] displayGameSetupScreen: levelSelectionDivElement is not valid.");
    } else {
        levelSelectionDivElement.style.display = 'block';
    }

    // _updateTTSSelectionVisuals(); // REMOVED - Update visual state of TTS options

    // Call core.js callbacks to set up listeners for level selection and start game button
    if (callbacks && typeof callbacks.coreSetupLevelSelectListenersCallback === 'function') {
        console.log('[GameSetupInterface] Calling coreSetupLevelSelectListenersCallback.');
        callbacks.coreSetupLevelSelectListenersCallback();
    } else {
        console.warn('[GameSetupInterface] coreSetupLevelSelectListenersCallback not received or not a function.');
    }

    if (callbacks && typeof callbacks.coreSetupStartGameButtonListenerCallback === 'function') {
        console.log('[GameSetupInterface] Calling coreSetupStartGameButtonListenerCallback.');
        callbacks.coreSetupStartGameButtonListenerCallback();
    } else {
        console.warn('[GameSetupInterface] coreSetupStartGameButtonListenerCallback not received or not a function.');
    }

    if (updateBackButtonVisibilityCallback) {
        updateBackButtonVisibilityCallback();
    }
} 