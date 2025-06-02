import { shuffleArray } from './js/utils/helpers.js';
import { initializeTimerManager, startWordTimer, stopWordTimer, getTimerEvaluationContext, getHasTimeLimit, getTimeoutPerLetter, getCurrentWordTimeoutThreshold, updateTimeoutThreshold as updateTimerTimeoutThreshold } from './js/game/timerManager.js';
import { hideWordInSentence } from './js/utils/sentenceUtils.js';
import {
    initializeDataSourceHandler,
    setupDataSourceSelection as setupDataSourceSelectionHandler,
    loadSelectedDataSource as loadSelectedDataSourceHandler,
    getCurrentDataSource
} from './js/data/dataSourceHandler.js';
import {
    initializeFilterManager,
    setBaseWordData as setBaseWordDataForFilters,
    resetFilters as resetFiltersHandler
} from './js/ui/filterManager.js';
import {
    initializeGameManager,
    setGameConfig as setGameManagerConfig,
    updateSelectedLevel as updateGameManagerSelectedLevel,
    getCurrentSelectedLevel as getGameManagerCurrentLevel,
    startGame as startGameInManager,
    startRetryGame as startRetryGameInManager,
    processAnswer as processAnswerInManager,
    getGameStatusForRetry as getGameManagerStatusForRetry,
    getCurrentWord as getGameManagerCurrentWord,
    requestNextWordOrEndGameDisplay
} from './js/game/gameManager.js';
import { updateBackButtonVisibility, showExitConfirmation, selectConfirmationOption, confirmExitSelection as confirmExitSelectionDialog, exitToMainMenu as exitToMainMenuDialog, initializeConfirmationDialogEventListeners } from './js/ui/confirmationDialog.js';
import { showFinalResults as showFinalResultsInterface, addRetryKeyboardShortcut, removeRetryKeyboardShortcut, handleRetryKeydown } from './js/ui/resultsInterface.js';
import audioManager from './js/audio/audioManager.js'; // Import the audio manager instance
import { initializeGamePlayInterface, displayWordChallenge } from './js/ui/gamePlayInterface.js';

// Game state variables - most are now in gameManager.js
let allWords = [];
let allDescriptions = [];
let allExampleSentences = [];
let allWordData = [];
let filteredWordData = [];

// Game config - these will be passed to gameManager
let scriptSelectedLevel = 1; // Default to Easy (level 1)
let scriptSelectedWordCount = 20; // Renamed

// UI/Input state still in script.js (or to be moved to specific UI/Input handlers)
let lastFocusedInput = null;
let waitingForContinue = false;
let isProcessing = false; // Prevent rapid Enter key presses

// Callbacks for gameManager - these will be new or adapted functions in script.js
function showNextWordUI(data) {
    console.log("[showNextWordUI] Called. Resetting isProcessing and waitingForContinue.");
    isProcessing = false;
    waitingForContinue = false;

    document.getElementById('game-interface').style.display = 'block'; 
    const wordDisplayDiv = document.getElementById('word-display');
    wordDisplayDiv.innerHTML = '';

    data.wordStructure.forEach((item) => {
        if (item.type === 'visible') {
            const span = document.createElement('span');
            span.textContent = item.letter;
            span.className = 'visible-letter';
            wordDisplayDiv.appendChild(span);
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'inline-input';
            input.dataset.index = item.index;
            input.dataset.expectedLetter = item.letter; 
            input.addEventListener('input', handleInlineInput);
            input.addEventListener('keydown', handleInlineKeydown);
            input.addEventListener('focus', handleInputFocus);
            wordDisplayDiv.appendChild(input);
        }
    });

    document.getElementById('progress').textContent = data.progressText;
    document.getElementById('word-description').innerHTML = data.hintText;
    document.getElementById('feedback').textContent = '';

    lastFocusedInput = null;

    startWordTimer(data.missingLetterCount); 

    const firstInput = wordDisplayDiv.querySelector('.inline-input');
    if (firstInput) {
        firstInput.focus();
        lastFocusedInput = firstInput;
    }
}

function showFinalResultsUI(wordResults, wordRetryDataFromManager, correctAnswers, totalWordsInGame, isRetryModeFlag, gameWordObjectsForResults) {
    console.log("[showFinalResultsUI] Called.");
    // isProcessing and waitingForContinue are managed by gamePlayInterface if active.

    const resultsDataForInterface = wordResults.map((res, index) => {
        const gameWordObject = gameWordObjectsForResults && gameWordObjectsForResults[index] ? gameWordObjectsForResults[index] :
                               { word: res.word, description: '', exampleSentence: '' }; 
        return {
            word: gameWordObject.word,
            status: res.result, 
            time: res.timeElapsed.toFixed(1) + 's',
            description: gameWordObject.description,
            exampleSentence: gameWordObject.exampleSentence
        };
    });
    
    const canRetry = wordRetryDataFromManager.length > 0;

    showFinalResultsInterface(correctAnswers, totalWordsInGame, resultsDataForInterface, canRetry, isRetryModeFlag);
}

async function loadSelectedDataSource() {
    await loadSelectedDataSourceHandler();
}

function updatePracticeWordCountSelectionUI() {
    const numFilteredWords = allWords.length;
    console.log('[Script.js] updatePracticeWordCountSelectionUI - numFilteredWords (allWords.length):', numFilteredWords);
    const wordCountSelectionDiv = document.getElementById('word-count-selection');
    const wordCountInput = document.getElementById('word-count-input');

    if (wordCountSelectionDiv && wordCountInput) {
        if (numFilteredWords > 0) {
            wordCountSelectionDiv.style.display = 'block';
            
            wordCountInput.value = Math.min(scriptSelectedWordCount, numFilteredWords);
            wordCountInput.max = numFilteredWords;
            // scriptSelectedWordCount = parseInt(wordCountInput.value); // This is now set on input change

            const newWordCountInput = wordCountInput.cloneNode(true);
            wordCountInput.parentNode.replaceChild(newWordCountInput, wordCountInput);
            newWordCountInput.addEventListener('input', function() {
                scriptSelectedWordCount = parseInt(this.value) || 1;
                scriptSelectedWordCount = Math.max(1, Math.min(scriptSelectedWordCount, allWords.length));
                this.value = scriptSelectedWordCount;
                setGameManagerConfig({ selectedWordCount: scriptSelectedWordCount }); // Update gameManager
            });
             // Set initial value for game manager
            setGameManagerConfig({ selectedWordCount: parseInt(newWordCountInput.value) });

        } else {
            wordCountSelectionDiv.style.display = 'none';
            scriptSelectedWordCount = 0;
            setGameManagerConfig({ selectedWordCount: 0 });
        }
    }
}

function resetFilters() {
    resetFiltersHandler();
}

function showWordCountAndLevelSelectionScreen() { // Renamed for clarity
    document.getElementById('content').style.display = 'none';
    updatePracticeWordCountSelectionUI();
    document.getElementById('level-selection').style.display = 'block';
    updateBackButtonVisibility();
}

// UI part of selecting a level - updates button appearance
function selectLevelUI(level) {
    scriptSelectedLevel = level;
    updateGameManagerSelectedLevel(level); // Update gameManager's internal state

    document.querySelectorAll('.level-option').forEach(option => {
        option.classList.remove('selected');
    });
    const selectedOption = document.querySelector(`.level-option[data-level="${level}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    } else {
        // Fallback if data-level somehow doesn't match, select default (level 1)
        console.warn(`Selected level ${level} not found, defaulting to level 1.`);
        document.querySelector('.level-option[data-level="1"]').classList.add('selected');
        scriptSelectedLevel = 1;
        updateGameManagerSelectedLevel(1);
    }
}

// Called by HTML button
function startGameWithLevel() {
    updateTimerTimeoutThreshold(); // Ensure timer settings are fresh
    
    // Hide level selection UI
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none'; // Also hide this
    document.getElementById('game-interface').style.display = 'block'; // Show game screen

    // Pass the filtered words from script.js to gameManager to start the game
    startGameInManager(allWords, allDescriptions, allExampleSentences);
}

// Game Input Handling functions (to be potentially moved to an InputHandler module)
function handleInputFocus(event) {
    lastFocusedInput = event.target;
}

function handleInlineInput(event) {
    const input = event.target;
    const value = input.value.toLowerCase();
    if (value) {
        const allInputs = Array.from(document.querySelectorAll('.inline-input'));
        const currentIndex = allInputs.indexOf(input);
        if (currentIndex < allInputs.length - 1) {
            allInputs[currentIndex + 1].focus();
        }
    }
}

function handleInlineKeydown(event) {
    const input = event.target;
    console.log(`[handleInlineKeydown] Key: ${event.key}, isProcessing: ${isProcessing}, waitingForContinue: ${waitingForContinue}`);

    if (event.key === 'Enter') {
        if (isProcessing) {
            console.log("[handleInlineKeydown] Enter pressed, but blocked by isProcessing=true.");
            return; 
        }

        if (waitingForContinue) {
            console.log("[handleInlineKeydown] Enter to continue. Setting isProcessing=true, waitingForContinue=false.");
            isProcessing = true;    
            waitingForContinue = false; 
            requestNextWordOrEndGameDisplay(); 
        } else { 
            console.log("[handleInlineKeydown] Enter to check answer.");
            checkAnswer(); 
        }
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        audioManager.repeatCurrentWord();
    } else if (event.key === 'Backspace' && !input.value && !waitingForContinue) {
        const allInputs = Array.from(document.querySelectorAll('.inline-input'));
        const currentIndex = allInputs.indexOf(input);
        if (currentIndex > 0) {
            allInputs[currentIndex - 1].focus();
        }
    }
}

function createWordComparisonUI(userAnswers, expectedWord) {
    // This function remains largely the same but is called by the new checkAnswer.
    // It's purely for creating UI elements for feedback.
    let userAttempt = '';
    const wordDisplayChildren = document.getElementById('word-display').children;
    let inputIdx = 0;
    for (let child of wordDisplayChildren) {
        if (child.classList.contains('visible-letter')) {
            userAttempt += child.textContent.toLowerCase();
        } else if (child.classList.contains('inline-input')) {
            userAttempt += (userAnswers[inputIdx] || '_').toLowerCase();
            inputIdx++;
        }
    }

    let correctWordHighlighted = '';
    for (let i = 0; i < expectedWord.length; i++) {
        const correctLetter = expectedWord[i].toLowerCase();
        const userLetter = i < userAttempt.length ? userAttempt[i] : '_';
        if (correctLetter === userLetter) {
            correctWordHighlighted += `<span style="color: #90EE90;">${expectedWord[i]}</span>`;
        } else {
            correctWordHighlighted += `<span style="color: #FF6B6B; font-weight: bold; font-size: 1.2em; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);">${expectedWord[i]}</span>`;
        }
    }
    return { userAttempt: userAttempt.replace(/_/g, '?'), correctWordHighlighted };
}

function checkAnswer() {
    if (waitingForContinue || isProcessing) {
        console.log(`[checkAnswer] Blocked. waitingForContinue: ${waitingForContinue}, isProcessing: ${isProcessing}`);
        return;
    }
    console.log("[checkAnswer] Starting. Setting isProcessing=true.");
    isProcessing = true; 

    const finalTimeElapsed = stopWordTimer();
    const allInputs = document.querySelectorAll('.inline-input');
    const userAnswers = Array.from(allInputs).map(input => input.value.trim());
    const feedbackDiv = document.getElementById('feedback');

    if (userAnswers.some(answer => answer === '')) {
        feedbackDiv.innerHTML = '<span class="incorrect">Please fill in all the missing letters!</span>';
        console.log("[checkAnswer] Empty input. Resetting isProcessing=false.");
        isProcessing = false; 
        return;
    }

    const answerProcessingResult = processAnswerInManager(userAnswers, finalTimeElapsed);
    // answerProcessingResult = { isCorrect, resultStatus, correctWord, userAttempt, feedbackTime, canContinue, showFinalResults }

    let feedbackHTML = '';
    const timerEvalContext = getTimerEvaluationContext(); // For timeout message display, if needed

    if (answerProcessingResult.resultStatus === 'success') {
        feedbackHTML = `
            <div class="correct-feedback">
                <span class="correct" style="font-size: 1.5em;">✅ Perfect!</span><br>
                <div style="margin-top: 10px; font-size: 1.1em; color: #90EE90;">
                    Completed in ${answerProcessingResult.feedbackTime.toFixed(1)}s
                </div>`;
    } else if (answerProcessingResult.resultStatus === 'timeout') {
        feedbackHTML = `
            <div class="correct-feedback">
                <span class="correct" style="font-size: 1.5em;">✅ Correct!</span><br>
                <span style="color: #FFD700; font-size: 1.2em;">⚠️ But took too long</span><br>
                <div style="margin-top: 10px; font-size: 1.1em; color: #FFD700;">
                    Time: ${answerProcessingResult.feedbackTime.toFixed(1)}s (limit: ${timerEvalContext.currentWordTimeoutThreshold}s)
                </div>
                <div style="margin-top: 10px; font-size: 1em; color: #E6E6FA;">
                    This word will be retried once for speed practice
                </div>`;
    } else { // 'incorrect' or 'timeout_incorrect'
        const comparison = createWordComparisonUI(userAnswers, answerProcessingResult.correctWord);
        feedbackHTML = `
            <span class="incorrect" style="font-size: 1.5em;">❌ Incorrect!</span><br>`;
        if (answerProcessingResult.resultStatus === 'timeout_incorrect') {
            feedbackHTML += `<span style="color: #FFD700; font-size: 1.1em;">⚠️ And took too long</span><br>
                             <div style="margin-top: 10px; font-size: 1.1em; color: #FFB6C1;">
                                Time: ${answerProcessingResult.feedbackTime.toFixed(1)}s (limit: ${timerEvalContext.currentWordTimeoutThreshold}s)
                             </div>`;
        } else { // 'incorrect'
             feedbackHTML += `<div style="margin-top: 10px; font-size: 1.1em; color: #FFB6C1;">
                                Time: ${answerProcessingResult.feedbackTime.toFixed(1)}s
                             </div>`;
        }
        feedbackHTML += `
            <div class="comparison-section">
                <div style="margin-bottom: 15px;">
                    <strong>Your answer:</strong>
                    <div class="user-answer-display">${comparison.userAttempt}</div>
                </div>
                <div>
                    <strong>Correct answer:</strong>
                    <div class="correct-word-display" style="letter-spacing: 3px;">${comparison.correctWordHighlighted}</div>
                </div>
            </div>
            <div style="margin-top: 10px; font-size: 1em; color: #E6E6FA;">
                This word will be retried (accuracy / speed practice)
            </div>`;
    }
    
    feedbackHTML += `
        <div style="margin-top: 15px; font-size: 1.2em;">
            Press <strong>Enter</strong> to continue
        </div>
    </div>`;
    feedbackDiv.innerHTML = feedbackHTML;
    feedbackDiv.className = `feedback ${answerProcessingResult.isCorrect && (answerProcessingResult.resultStatus === 'success' || answerProcessingResult.resultStatus === 'timeout') ? 'correct' : 'incorrect'}`;

    console.log("[checkAnswer] Feedback displayed. Setting waitingForContinue=true.");
    waitingForContinue = true; 

    if (answerProcessingResult.showFinalResults) {
        console.log("[checkAnswer] Game will show final results.");
    } else if (answerProcessingResult.canContinue) {
        console.log("[checkAnswer] Game can continue.");
    } else {
        console.error("[checkAnswer] Game logic error: Cannot continue, but not showing final results.");
    }

    if (allInputs.length > 0 && !answerProcessingResult.showFinalResults) {
         allInputs[0].focus(); 
    } 
    
    console.log("[checkAnswer] Ending. Resetting isProcessing=false.");
    isProcessing = false; 
}

// Global keydown (ESC for confirmation)
function handleGlobalKeydown(event) {
    const overlay = document.getElementById('confirmation-overlay');
    const isConfirmationVisible = overlay && overlay.style.display === 'flex';

    if (isConfirmationVisible) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            // confirmationDialog.js now manages its internal selection state via selectConfirmationOption
            // We need to know the current selection to toggle it, or confirmationDialog.js needs a toggle function.
            // For simplicity, let's assume `selectConfirmationOption` is robust enough or we call it with the new state.
            // The `dialogConfirmationSelection` is internal to confirmationDialog.js. 
            // We should call `selectConfirmationOption` with the desired new option.
            // This part of global keydown might be better inside confirmationDialog.js if it directly manipulates its state.
            // For now, let's assume script.js tells it what to select. We need a way to get current selection or just pass 'yes'/'no'.
            // Let confirmationDialog.js handle its own internal arrow key navigation if it sets up its own event listener.
            // For now, removing direct manipulation from here as selectConfirmationOption exists.
            // This logic is better placed inside confirmationDialog.js itself if it is to handle its own key events.
            // Since script.js is currently handling global keys, we pass the *action* to confirmationDialog.
            // This might require confirmationDialog to expose its current selection or have a toggle function.
            // Keeping it simple: we'll just call selectConfirmationOption if we know what to toggle to. 
            // This specific arrow key logic might be best moved into confirmationDialog.js and initialized there.

        } else if (event.key === 'Enter') {
            event.preventDefault();
            confirmExitSelectionDialog();
            if (document.getElementById('data-source-selection').style.display === 'block') { 
                removeRetryKeyboardShortcut(); 
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            exitToMainMenuDialog(false); 
            removeRetryKeyboardShortcut();
        }
    } else {
        if (event.key === 'Escape') {
            const gameInterface = document.getElementById('game-interface');
            const levelSelectionScreen = document.getElementById('level-selection');
            const finalResultsScreen = document.getElementById('final-results');

            const shouldShow = (gameInterface && gameInterface.style.display === 'block') ||
                               (levelSelectionScreen && levelSelectionScreen.style.display === 'block') ||
                               (finalResultsScreen && finalResultsScreen.style.display === 'block');
            if (shouldShow) {
                event.preventDefault();
                showExitConfirmation(); 
            }
        }
        // Retry (R or r) on final results screen is handled by resultsInterface.js's handleRetryKeydown
    }
}

function initializeMainAppEventListeners() { // Renamed
    document.addEventListener('keydown', handleGlobalKeydown);
    // Removed: document.addEventListener('keydown', handleRetryKeydown); // Now in resultsInterface
    updateBackButtonVisibility();
}

// Updated speakWord function to use the imported audioManager
function speakWord(word) {
    if (audioManager && typeof audioManager.playWord === 'function') {
        audioManager.playWord(word).catch(error => {
            console.warn("Audio manager playWord failed:", error, "Word:", word);
        });
    } else {
        console.warn("speakWord called, but audioManager or playWord function is not available. Word:", word);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializeDataSourceHandler({
        onDataLoaded: (parsedData) => {
            console.log('[Script.js] onDataLoaded - Received allWordData length:', parsedData.allWordData.length);
            allWordData = parsedData.allWordData;
            setBaseWordDataForFilters(allWordData);
        },
        onDataError: (errorMessage) => console.error("Data loading error (from script.js):", errorMessage),
        onUrlError: (errorMessage) => console.error("URL error (from script.js):", errorMessage),
        onGoBack: (isErrorState) => {
            document.getElementById('content').style.display = 'none';
            document.getElementById('data-source-selection').style.display = 'block';
            if (isErrorState && getCurrentDataSource() === 'google') {
                const sheetsUrlInput = document.getElementById('sheets-url');
                if (sheetsUrlInput) sheetsUrlInput.focus();
            }
            updateBackButtonVisibility();
        }
    });

    initializeFilterManager({
        onFiltersApplied: (filteredResults) => {
            console.log('[Script.js] onFiltersApplied - Received filteredResults.allWords length:', filteredResults.allWords.length);
            allWords = filteredResults.allWords;
            allDescriptions = filteredResults.allDescriptions;
            allExampleSentences = filteredResults.allExampleSentences;
            filteredWordData = filteredResults.filteredWordData;
            showWordCountAndLevelSelectionScreen(); // Renamed
        }
    });
    
    initializeTimerManager(); // Initialize timer systems

    initializeGameManager({ 
        showNextWordUI: displayWordChallenge,
        showFinalResultsUI: showFinalResultsUI, 
        updateBackButtonVisibility: updateBackButtonVisibility, 
        speakWord: speakWord // Pass the updated speakWord function
    }, { 
        selectedLevel: scriptSelectedLevel,
        selectedWordCount: scriptSelectedWordCount
    });

    // Initialize the new game play interface module
    initializeGamePlayInterface({
        processAnswerFn: processAnswerInManager, 
        requestNextWordFn: requestNextWordOrEndGameDisplay,
        getTimerContextFn: getTimerEvaluationContext,
        stopWordTimerFn: stopWordTimer,
        startWordTimerFn: startWordTimer,
        repeatWordFn: () => audioManager.repeatCurrentWord(), // Pass a function that calls the method
        getGameManagerCurrentWordFn: getGameManagerCurrentWord // Kept for now, may be removed if repeatWordFn is enough
    });

    setupDataSourceSelectionHandler();
    initializeMainAppEventListeners(); 
    if (typeof initializeConfirmationDialogEventListeners === 'function') {
        initializeConfirmationDialogEventListeners();
    }

    const loadDataButton = document.getElementById('load-data-button');
    if (loadDataButton) loadDataButton.addEventListener('click', loadSelectedDataSource);
    
    document.querySelectorAll('.level-option').forEach(option => {
        option.addEventListener('click', function() {
            selectLevelUI(parseInt(this.dataset.level));
        });
    });
    selectLevelUI(scriptSelectedLevel);

    const startGameButtonLevelSelection = document.querySelector('#level-selection .start-button');
    if (startGameButtonLevelSelection) {
        startGameButtonLevelSelection.addEventListener('click', startGameWithLevel);
    }
    
    window.resetFilters = resetFilters; 

    const repeatButton = document.getElementById('repeat-button');
    if(repeatButton) {
        // Remove any existing onclick attribute from HTML if present
        repeatButton.removeAttribute('onclick'); 
        repeatButton.addEventListener('click', () => { 
            audioManager.repeatCurrentWord();
        });
    }

    // Setup TTS Method Selection Buttons
    // Assumes buttons have class "tts-option" and "data-method" attribute
    // e.g., <button class="tts-option" data-method="google">Google TTS</button>
    const ttsOptionButtons = document.querySelectorAll('.tts-option');
    ttsOptionButtons.forEach(button => {
        // Remove any existing onclick attribute from HTML if present
        button.removeAttribute('onclick'); 
        button.addEventListener('click', function() {
            const method = this.dataset.method;
            if (method && audioManager && typeof audioManager.setMethod === 'function') {
                audioManager.setMethod(method);
                // Optionally, update UI to show which method is selected
                ttsOptionButtons.forEach(btn => btn.classList.remove('selected'));
                this.classList.add('selected');
                console.log(`TTS method selected: ${method}`);
            }
        });
    });

    // Set default selected TTS option UI (if one is set in audioManager by default)
    const initialAudioMethod = audioManager.getMethod();
    const initialSelectedButton = document.querySelector(`.tts-option[data-method="${initialAudioMethod}"]`);
    if (initialSelectedButton) {
        initialSelectedButton.classList.add('selected');
    }
});
