import { shuffleArray } from '../utils/helpers.js';
// import { hideWordInSentence } from '../utils/sentenceUtils.js'; // Likely unused now
import { getTimerEvaluationContext } from './timerManager.js'; // Might be handled by gameState or re-evaluated
import { gameState } from './gameState.js'; // Import the global gameState instance
import { audioManager } from '../audio/audioManager.js'; // ADDED IMPORT
import { RESULT_TYPES } from '../app/config.js';

// Game State (local gameManager state is now minimized, gameState is primary)
// let gameWords = []; // Handled by gameState
// let gameDescriptions = []; // Handled by gameState
// let gameExampleSentences = []; // Handled by gameState
let wordResults = []; // Tracks result for each word: { correct, timeElapsed, result } - May need alignment with gameState.results
// let currentWordIndex = 0; // Handled by gameState
// let currentWord = ''; // Handled by gameState
// let currentDescription = ''; // Handled by gameState
// let currentExampleSentence = ''; // Handled by gameState
// let missingLetters = ''; // Not used with new sentence UI
// let correctAnswers = 0; // Handled by gameState
let totalWordsInGame = 0; 
let isRetryMode = false; // gameState has retry logic, this might need to sync or be removed
let wordRetryData = []; // gameState has retry logic
// let currentWordOriginalIndex = -1; // gameState handles word objects

// Game Configuration (set from outside, e.g., script.js)
let currentSelectedLevel = 3; // Default level (gameState also has level)
let currentSelectedWordCount = 20; // Default word count (gameState also has wordCount)

// Callbacks for UI interaction
let onShowNextWordUICallback = null;
let onShowFinalResultsUICallback = null;
let onUpdateBackButtonVisibilityCallback = null;
let onSpeakWordCallback = null;

export function initializeGameManager(callbacks, config) {
    onShowNextWordUICallback = callbacks.showNextWordUI; // This is gamePlayInterface.displayWordChallenge
    onShowFinalResultsUICallback = callbacks.showFinalResultsUI;
    onUpdateBackButtonVisibilityCallback = callbacks.updateBackButtonVisibility;
    onSpeakWordCallback = callbacks.speakWord;

    if (config) {
        currentSelectedLevel = config.selectedLevel || currentSelectedLevel;
        currentSelectedWordCount = config.selectedWordCount || currentSelectedWordCount;
    }

    console.log(`[gameManager.initializeGameManager] Using gameState instance ID: ${gameState.instanceId}`);
}

export function setGameConfig({ selectedLevel, selectedWordCount }) {
    if (selectedLevel !== undefined) currentSelectedLevel = selectedLevel;
    if (selectedWordCount !== undefined) currentSelectedWordCount = selectedWordCount;
    // This config should ideally also update gameState if it's the source of truth for these settings
}

export function updateSelectedLevel(level) {
    currentSelectedLevel = level;
}

export function getCurrentSelectedLevel() {
    return currentSelectedLevel;
}

// createPartialWord is no longer needed for the sentence-based UI
/*
export function createPartialWord(word) {
    // ... old implementation ...
}
*/

export function addWordToRetryList(wordData, reason, maxAttempts) {
    // This should now leverage gameState.addToRetryList or be aligned with it.
    // For now, keeping local wordRetryData but this is a refactor point.
    const existingEntry = wordRetryData.find(entry => entry.originalIndex === wordData.originalIndex);
    if (existingEntry) {
        // ... (existing logic) ...
    } else {
        wordRetryData.push({
            ...wordData, 
            reason: reason,
            attempts: 0,
            maxAttempts: maxAttempts
        });
    }
}


export function startGame(allWordsFromFilter, allDescriptionsFromFilter, allExampleSentencesFromFilter) {
    audioManager.stopCurrentAudio(); // ADDED: Stop any audio from previous game/menu
    if (onUpdateBackButtonVisibilityCallback) onUpdateBackButtonVisibilityCallback();

    const wordDataForGameState = allWordsFromFilter.map((wordStr, index) => ({
        word: wordStr, // The actual word string
        description: allDescriptionsFromFilter[index],
        'Example sentence': allExampleSentencesFromFilter[index],
        // originalIndex could be added if needed by gameState or for local tracking
    }));

    const gameSettings = {
        level: currentSelectedLevel,
        wordCount: currentSelectedWordCount,
        // TODO: Pass other relevant settings like timeoutPerLetter, showTimer from gameManager's config if needed
        // timeoutPerLetter: GAME_CONFIG.DEFAULT_TIMEOUT_PER_LETTER, (example)
        // showTimer: false, (example)
    };
    
    gameState.initialize(wordDataForGameState, gameSettings);
    gameState.startGame(); // This also sets the first currentWord in gameState

    totalWordsInGame = gameState.gameWords.length;
    isRetryMode = false; // Assuming fresh start

    // Reset local results tracking if it's still used, aligned with gameState
    wordResults = new Array(totalWordsInGame).fill(null).map(() => ({
        correct: false,
        timeElapsed: 0,
        result: 'pending' // or use RESULT_TYPES from config
    }));
    wordRetryData = []; // Clear local retry data as gameState handles its own retry words

    if (totalWordsInGame > 0) {
        showNextWordInternal();
    } else {
        if (onShowFinalResultsUICallback) onShowFinalResultsUICallback([], [], 0, 0, false, []);
    }
}

export function startRetryGame() {
    audioManager.stopCurrentAudio(); // ADDED: Stop any lingering audio before starting retry
    if (onUpdateBackButtonVisibilityCallback) onUpdateBackButtonVisibilityCallback();

    if (gameState.startRetrySession()) { // gameState.startRetrySession handles word prep
        isRetryMode = true;
        totalWordsInGame = gameState.gameWords.length;
        // Reset local results tracking for the retry session
        wordResults = new Array(totalWordsInGame).fill(null).map(() => ({
            correct: false, timeElapsed: 0, result: 'pending'
        }));
        showNextWordInternal();
    } else {
        // No retry words, perhaps show a message or go to final results of original game
        console.log("GameManager: No words to retry.");
        if (onShowFinalResultsUICallback) {
            // TODO: Gather results from the *original* game session from gameState to display
            // This requires gameState to retain or provide access to previous session results.
            // For now, showing empty/generic results if retry fails to start.
            const stats = gameState.getStatistics(); // Get stats from last completed session
            const gameDataForResults = gameState.exportGameData();
            onShowFinalResultsUICallback(
                gameDataForResults.results.map(r => r.word), // Need to ensure `word` object is what UI expects
                gameDataForResults.results,
                stats.correctCount,
                stats.totalWords,
                false, // isRetry
                [] // No further retry words
            );
        }
    }
}

function showNextWordInternal() {
    // ---- START DEBUG LOG for gameManager ----
    console.log(`[gameManager.showNextWordInternal] Accessing gameState instance ID: ${gameState.instanceId}`);
    // ---- END DEBUG LOG for gameManager ----

    const currentWordData = gameState.getCurrentWord();

    // ---- START Re-simplified DEBUG LOG ----
    console.log("[gameManager.showNextWordInternal] Raw currentWordData from gameState:", currentWordData);
    if (currentWordData) {
        console.log("[gameManager.showNextWordInternal] currentWordData.hasOwnProperty('displayableWordParts') check:", currentWordData.hasOwnProperty('displayableWordParts'));
    } else {
        console.log("[gameManager.showNextWordInternal] currentWordData from gameState is null/undefined.");
    }
    // ---- END Re-simplified DEBUG LOG ----

    if (!currentWordData || !currentWordData.displayableWordParts) { // Added check for displayableWordParts here
        console.error("[gameManager.showNextWordInternal] Error: currentWordData is missing or missing displayableWordParts. Bailing out of showNextWordInternal.", currentWordData);
        // Potentially call a UI error display function here
        if (onShowNextWordUICallback) { // If UI callback exists, show an error state through it.
            onShowNextWordUICallback({ 
                error: "Critical error: Word data is incomplete.", 
                sentencePrefix: "Error", word:"loading", sentenceSuffix: "word.", displayableWordParts: [] 
            });
        }
        return;
    }

    // Prepare UI Data first
    const progress = gameState.getProgress();
    const uiData = {
        sentencePrefix: currentWordData.sentencePrefix,
        word: currentWordData.word, 
        sentenceSuffix: currentWordData.sentenceSuffix,
        displayableWordParts: currentWordData.displayableWordParts,
        hintText: currentWordData.description || '',
        progressText: `Word ${progress.currentWordIndex + 1} of ${progress.totalWords}`,
    };

    // 1. Display UI
    if (onShowNextWordUICallback) {
        onShowNextWordUICallback(uiData); // Calls gamePlayInterface.displayWordChallenge
    } else {
        console.error("onShowNextWordUICallback is not defined in gameManager.");
    }

    // 2. Audio: Play the full sentence (after UI is set up)
    if (onSpeakWordCallback && currentWordData['Example sentence']) {
        onSpeakWordCallback(currentWordData['Example sentence']); 
    } else if (onSpeakWordCallback && currentWordData.word) {
        // Fallback to word if sentence somehow missing, though filtering should prevent this
        console.warn("GameManager: Example sentence missing, attempting to speak word only for:", currentWordData.word);
        onSpeakWordCallback(currentWordData.word);
    }
    // Timer start is now handled within gamePlayInterface.js after audio completion (future) or immediately.
    // For now, gamePlayInterface.js calls startWordTimerFn(currentWordData.word.length).
}

export function requestNextWordOrEndGameDisplay() {
    audioManager.stopCurrentAudio(); // ADDED: Stop audio before deciding next word or results
    console.log("[gameManager.requestNextWordOrEndGameDisplay] Called, audio stopped.");
    const hasNextWord = gameState.nextWord();
    console.log("[gameManager.requestNextWordOrEndGameDisplay] gameState.nextWord() returned:", hasNextWord);

    if (hasNextWord) { 
        console.log("[gameManager.requestNextWordOrEndGameDisplay] Proceeding to showNextWordInternal.");
        showNextWordInternal();
    } else {
        console.log("[gameManager.requestNextWordOrEndGameDisplay] No next word. Showing final results.");
        // Game is complete, show final results
        const stats = gameState.getStatistics();
        const gameDataForResults = gameState.exportGameData(); 
        
        if (onShowFinalResultsUICallback) {
            onShowFinalResultsUICallback(
                gameDataForResults.results,                          // Actual result items for wordResults
                gameState.getRetryWords(),                           // Retry words for wordRetryDataFromManager
                stats.correctCount,                                  // correctAnswers
                stats.totalWords,                                    // totalWordsInGame
                isRetryMode,                                         // isRetryModeFlag
                gameDataForResults.results.map(r => r.word)          // Array of full word objects for gameWordObjectsForResults
            );
        }
        if (onUpdateBackButtonVisibilityCallback) onUpdateBackButtonVisibilityCallback(true);
    }
}

export function processAnswer(userAnswerString, timeTaken) {
    audioManager.stopCurrentAudio(); // ADDED: Stop any audio as soon as an answer is processed
    console.log("[gameManager.processAnswer] Called, audio stopped.");

    const currentWordData = gameState.getCurrentWord();
    if (!currentWordData) {
        console.error("GameManager processAnswer: No current word data from gameState.");
        return { resultStatus: 'error', feedbackTime: timeTaken, correctAnswer: '', userAnswer: userAnswerString };
    }

    const correctAnswer = currentWordData.word;
    const isCorrectBase = userAnswerString.toLowerCase() === correctAnswer.toLowerCase();

    const { hasTimeLimit, currentWordTimeoutThreshold } = getTimerEvaluationContext();
    let resultType;

    if (isCorrectBase) {
        if (hasTimeLimit && timeTaken > currentWordTimeoutThreshold) {
            resultType = RESULT_TYPES.TIMEOUT; // Correct but slow
        } else {
            resultType = RESULT_TYPES.SUCCESS; // Correct and within time (or no time limit)
        }
    } else { // Incorrect
        if (hasTimeLimit && timeTaken > currentWordTimeoutThreshold) {
            resultType = RESULT_TYPES.TIMEOUT_INCORRECT; // Incorrect and timed out
        } else {
            resultType = RESULT_TYPES.INCORRECT; // Incorrect and within time (or no time limit)
        }
    }

    gameState.recordResult(userAnswerString, resultType, timeTaken); // gameState handles results internally

    // Update local wordResults if still needed for some reason (ideally phase out)
    if (gameState.currentWordIndex < wordResults.length) {
        wordResults[gameState.currentWordIndex] = {
            correct: isCorrectBase,
            timeElapsed: timeTaken,
            result: resultType
        };
    }

    return {
        resultStatus: resultType,
        feedbackTime: timeTaken,
        correctAnswer: correctAnswer, // Expected by gamePlayInterface for feedback
        userAnswer: userAnswerString  // Expected by gamePlayInterface for feedback
    };
}

// This function might need to be re-evaluated based on gameState's timer config
/* function evaluateAnswerWithTimingInternal(isCorrect, timeElapsed, hasLimit, threshold) {
    // ... old implementation ... 
    // This logic should align with how gameState determines timeout and result types.
} */

export function getGameStatusForRetry() {
    return {
        canRetry: gameState.hasRetryWords(),
        retryWordCount: gameState.getRetryWords().length
    };
}

// This provides the raw word string, might not be needed if UI gets full object from gameState
export function getCurrentWord() { 
    const currentWordObj = gameState.getCurrentWord();
    return currentWordObj ? currentWordObj.word : '';
}

// Other functions like resetGameState, getGameWordObjectsForResults might need review
// to ensure they align with gameState as the source of truth.

// REMOVE THE DUPLICATE DEFINITIONS BELOW
/*
export function getGameStatusForRetry() {
    return { canRetry: wordRetryData.length > 0 };
}

export function getCurrentWord() {
    return { word: currentWord };
} 
*/
// End of file after this removal or any other remaining code 

export function getGameConfig() {
    // ... existing code ...
}

export function getOverallStats() {
    // ... existing code ...
}

export function getWordResults() {
    // ... existing code ...
}

export function getWordRetryData() {
    // ... existing code ...
} 