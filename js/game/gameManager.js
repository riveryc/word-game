import { shuffleArray } from '../utils/helpers.js';
import { hideWordInSentence } from '../utils/sentenceUtils.js';
import { getTimerEvaluationContext } from './timerManager.js'; // For evaluateAnswerWithTimingInternal

// Game State (managed internally by this module)
let gameWords = [];
let gameDescriptions = [];
let gameExampleSentences = [];
let wordResults = []; // Tracks result for each word: { correct, timeElapsed, result }
let currentWordIndex = 0;
let currentWord = '';
let currentDescription = '';
let currentExampleSentence = '';
let missingLetters = '';
let correctAnswers = 0;
let totalWordsInGame = 0; // Renamed from totalWords to avoid confusion with total filtered words
let isRetryMode = false;
let wordRetryData = []; // {word, description, exampleSentence, reason, attempts, maxAttempts, originalIndex}
let currentWordOriginalIndex = -1; // To track the original index from the filtered list

// Game Configuration (set from outside, e.g., script.js)
let currentSelectedLevel = 3; // Default level
let currentSelectedWordCount = 20; // Default word count for a game session

// Callbacks for UI interaction (to be set by script.js or a UIManager)
let onShowNextWordUICallback = null;
let onShowFinalResultsUICallback = null;
let onUpdateBackButtonVisibilityCallback = null;
let onSpeakWordCallback = null; // To call the global speakWord

export function initializeGameManager(callbacks, config) {
    onShowNextWordUICallback = callbacks.showNextWordUI;
    onShowFinalResultsUICallback = callbacks.showFinalResultsUI;
    onUpdateBackButtonVisibilityCallback = callbacks.updateBackButtonVisibility;
    onSpeakWordCallback = callbacks.speakWord;

    if (config) {
        currentSelectedLevel = config.selectedLevel || currentSelectedLevel;
        currentSelectedWordCount = config.selectedWordCount || currentSelectedWordCount;
    }
}

export function setGameConfig({ selectedLevel, selectedWordCount }) {
    if (selectedLevel !== undefined) currentSelectedLevel = selectedLevel;
    if (selectedWordCount !== undefined) currentSelectedWordCount = selectedWordCount;
}

// Formerly selectLevel in script.js - now it just updates config here
export function updateSelectedLevel(level) {
    currentSelectedLevel = level;
    // UI update for level selection buttons is still handled in script.js directly
}

export function getCurrentSelectedLevel() {
    return currentSelectedLevel;
}

export function createPartialWord(word) {
    if (!word || word.length === 0) {
        return { wordStructure: [], missingLettersOutput: '' };
    }

    let wordStructure = [];
    let missingLettersOutput = [];
    const numTotalLetters = word.length;

    const alphabeticCharPositions = [];
    const originalWordChars = word.split('');

    originalWordChars.forEach((char, index) => {
        if (/[a-zA-Z]/.test(char)) {
            alphabeticCharPositions.push(index);
        }
    });

    const numAlphabeticChars = alphabeticCharPositions.length;
    let numToHide = 0;

    if (numAlphabeticChars === 0) { // No alphabetic characters to hide
        // All characters will be visible by default in the loop below
    } else {
        switch (currentSelectedLevel) {
            case 1: // Easy: hide 50%, at least 1
                numToHide = Math.round(numAlphabeticChars * 0.50);
                if (numToHide === 0 && numAlphabeticChars > 0) { // Ensure at least 1 is hidden if possible
                    numToHide = 1;
                }
                break;
            case 2: // Medium: hide 75%, at least 2 (or all if only 1 alphabetic char)
                numToHide = Math.round(numAlphabeticChars * 0.75);
                if (numAlphabeticChars === 1) {
                    numToHide = 1;
                } else if (numAlphabeticChars > 1 && numToHide < 2) { // Ensure at least 2 are hidden if possible and more than 1 available
                    numToHide = Math.min(2, numAlphabeticChars); // Hide 2, or all if only 2 are available
                }
                break;
            case 3: // Nightmare: hide 100% of alphabetic chars
                numToHide = numAlphabeticChars;
                break;
            default:
                console.warn(`Unknown level ${currentSelectedLevel}, defaulting to Easy logic.`);
                numToHide = Math.round(numAlphabeticChars * 0.50);
                if (numToHide === 0 && numAlphabeticChars > 0) {
                    numToHide = 1;
                }
                break;
        }
    }
    
    // Ensure numToHide doesn't exceed available alphabetic characters
    numToHide = Math.min(numToHide, numAlphabeticChars);

    let actualHiddenPositions = new Set();
    if (numToHide > 0) {
        const shuffledAlphabeticPositions = shuffleArray([...alphabeticCharPositions]);
        for (let i = 0; i < numToHide; i++) {
            actualHiddenPositions.add(shuffledAlphabeticPositions[i]);
        }
    }

    for (let i = 0; i < numTotalLetters; i++) {
        const char = originalWordChars[i];
        if (!/[a-zA-Z]/.test(char)) { // Symbol or non-alphabetic
            wordStructure.push({ type: 'visible', letter: char });
        } else {
            if (actualHiddenPositions.has(i)) {
                wordStructure.push({ type: 'input', letter: char, index: missingLettersOutput.length });
                missingLettersOutput.push(char);
            } else {
                wordStructure.push({ type: 'visible', letter: char });
            }
        }
    }

    return { wordStructure, missingLettersOutput: missingLettersOutput.join('') };
}

export function addWordToRetryList(wordData, reason, maxAttempts) {
    // wordData should be { word, description, exampleSentence, originalIndex }
    const existingEntry = wordRetryData.find(entry => entry.originalIndex === wordData.originalIndex);

    if (existingEntry) {
        if (reason === 'incorrect' && existingEntry.reason === 'timeout') {
            existingEntry.reason = 'incorrect'; // Upgrade reason
            existingEntry.maxAttempts = Math.max(existingEntry.maxAttempts, 2); // Ensure at least 2 attempts for incorrect
        } else if (reason === 'timeout' && existingEntry.reason === 'incorrect') {
            // If already marked incorrect, keep it as incorrect, possibly update attempts if needed
            existingEntry.maxAttempts = Math.max(existingEntry.maxAttempts, 2);
        } else {
            // If same reason, or timeout replacing timeout, or incorrect replacing incorrect, update attempts if new one is higher
            existingEntry.maxAttempts = Math.max(existingEntry.maxAttempts, maxAttempts);
        }
    } else {
        wordRetryData.push({
            ...wordData, // should include word, description, exampleSentence, originalIndex
            reason: reason,
            attempts: 0,
            maxAttempts: maxAttempts
        });
    }
}


export function startGame(allWordsFromFilter, allDescriptionsFromFilter, allExampleSentencesFromFilter) {
    // Hide UI elements (level selection, etc.) - This should be done by the calling context (script.js)
    // document.getElementById('content').style.display = 'none';
    // document.getElementById('level-selection').style.display = 'none';
    // document.getElementById('word-count-selection').style.display = 'none';
    // document.getElementById('game-interface').style.display = 'block';
    // document.getElementById('final-results').style.display = 'none';

    if (onUpdateBackButtonVisibilityCallback) onUpdateBackButtonVisibilityCallback();

    const wordDataPairs = allWordsFromFilter.map((word, index) => ({
        word: word,
        description: allDescriptionsFromFilter[index],
        exampleSentence: allExampleSentencesFromFilter[index],
        originalIndex: index // Store the original index from the filtered list
    }));

    const shuffledPairs = shuffleArray(wordDataPairs);
    const selectedPairs = shuffledPairs.slice(0, currentSelectedWordCount);

    gameWords = selectedPairs.map(pair => ({ word: pair.word, originalIndex: pair.originalIndex }));
    gameDescriptions = selectedPairs.map(pair => pair.description);
    gameExampleSentences = selectedPairs.map(pair => pair.exampleSentence);
    // Store original indices if needed for retry, or pass full objects to retry list
    // We are now storing originalIndex within the selectedPairs, so gameWords etc. are just strings,
    // but we can retrieve the originalIndex when calling showNextWordInternal.
    gameWords = selectedPairs.map(pair => ({ word: pair.word, originalIndex: pair.originalIndex }));
    gameDescriptions = selectedPairs.map(pair => pair.description); // Keep as strings
    gameExampleSentences = selectedPairs.map(pair => pair.exampleSentence); // Keep as strings

    currentWordIndex = 0;
    correctAnswers = 0;
    totalWordsInGame = gameWords.length;
    isRetryMode = false;

    wordResults = new Array(gameWords.length).fill(null).map(() => ({
        correct: false,
        timeElapsed: 0,
        result: 'pending'
    }));
    wordRetryData = []; // Clear previous retry data

    if (totalWordsInGame > 0) {
        showNextWordInternal();
    } else {
        // No words to play, perhaps show final results or an error/message
        if (onShowFinalResultsUICallback) onShowFinalResultsUICallback([], [], 0, 0, false, []); // Pass empty gameWordObjectsForResults
    }
}

export function startRetryGame() {
    // UI Hiding should be done by script.js
    // removeRetryKeyboardShortcut(); // This was in script.js, belongs to UI/Input handling

    if (onUpdateBackButtonVisibilityCallback) onUpdateBackButtonVisibilityCallback();

    const retryWordsForGame = [];
    wordRetryData.forEach(retryEntry => {
        const attemptsNeeded = retryEntry.maxAttempts - retryEntry.attempts;
        for (let i = 0; i < attemptsNeeded; i++) {
            retryWordsForGame.push({
                word: retryEntry.word,
                description: retryEntry.description,
                exampleSentence: retryEntry.exampleSentence,
                // originalIndex: retryEntry.originalIndex // Not strictly needed for playing the retry game itself
            });
        }
    });

    const shuffledRetryWords = shuffleArray(retryWordsForGame);
    // Retry game words don't need originalIndex in the same way, but it might be useful for consistency
    gameWords = shuffledRetryWords.map(item => ({ word: item.word, originalIndex: item.originalIndex || -1 }));
    gameDescriptions = shuffledRetryWords.map(item => item.description);
    gameExampleSentences = shuffledRetryWords.map(item => item.exampleSentence);

    currentWordIndex = 0;
    correctAnswers = 0;
    totalWordsInGame = gameWords.length;
    isRetryMode = true;

    wordResults = new Array(gameWords.length).fill(null).map(() => ({
        correct: false,
        timeElapsed: 0,
        result: 'pending'
    }));
    // wordRetryData is not cleared here, as it holds the data for *this* retry session's performance
    // Or, it should be cleared if we don't allow retrying retries.
    // For simplicity, let's assume we clear it for now, and a new list is built *if* there are further errors.
    wordRetryData = []; 

    if (totalWordsInGame > 0) {
        showNextWordInternal();
    } else {
        // No words to retry, show final results (likely from a previous non-retry game)
        // This scenario might need refinement: what results to show if retry list is empty from the start?
        if (onShowFinalResultsUICallback) onShowFinalResultsUICallback([], [], 0, 0, true, []); // Pass empty gameWordObjectsForResults
    }
}

function showNextWordInternal() {
    console.log(`[gameManager.showNextWordInternal] Called. currentWordIndex: ${currentWordIndex}, totalWordsInGame: ${totalWordsInGame}`);
    if (currentWordIndex >= totalWordsInGame) {
        console.log("[gameManager.showNextWordInternal] End of game. Calling onShowFinalResultsUICallback.");
        const gameWordObjectsForResults = gameWords.map((gw, idx) => ({
            word: gw.word,
            description: gameDescriptions[idx],
            exampleSentence: gameExampleSentences[idx]
        }));
        if (onShowFinalResultsUICallback) onShowFinalResultsUICallback(wordResults, wordRetryData, correctAnswers, totalWordsInGame, isRetryMode, gameWordObjectsForResults);
        return;
    }

    currentWord = gameWords[currentWordIndex].word;
    currentWordOriginalIndex = gameWords[currentWordIndex].originalIndex;
    currentDescription = gameDescriptions[currentWordIndex];
    currentExampleSentence = gameExampleSentences[currentWordIndex];
    console.log(`[gameManager.showNextWordInternal] Displaying word: "${currentWord}" at index ${currentWordIndex}`);
    
    const partialWordData = createPartialWord(currentWord);
    missingLetters = partialWordData.missingLettersOutput;

    if (onShowNextWordUICallback) {
        onShowNextWordUICallback({
            wordStructure: partialWordData.wordStructure,
            progressText: isRetryMode ? `Retry Word ${currentWordIndex + 1} of ${totalWordsInGame}` : `Word ${currentWordIndex + 1} of ${totalWordsInGame}`,
            hintText: currentExampleSentence && currentExampleSentence.trim() !== '' ? 
                        `<strong>📝 Example:</strong> ${hideWordInSentence(currentExampleSentence, currentWord)}` :
                      currentDescription && currentDescription.trim() !== '' ? 
                        `<strong>💡 Hint:</strong> ${currentDescription}` :
                        '',
            missingLetterCount: missingLetters.length
        });
    }

    if (onSpeakWordCallback) onSpeakWordCallback(currentWord);
}

// NEW Function: Called by script.js when Enter is pressed after feedback
export function requestNextWordOrEndGameDisplay() {
    // processAnswer already incremented currentWordIndex. 
    // So, showNextWordInternal will correctly fetch the *new* current word or end the game.
    showNextWordInternal();
}

export function processAnswer(userSubmittedAnswers, timeTaken) {
    console.log(`[gameManager.processAnswer] Start. currentWordIndex BEFORE increment: ${currentWordIndex}`);
    const isCorrectBySpelling = userSubmittedAnswers.join('').toLowerCase() === missingLetters.toLowerCase();
    
    const timerContext = getTimerEvaluationContext(); 
    const resultStatus = evaluateAnswerWithTimingInternal(
        isCorrectBySpelling, 
        timeTaken, 
        timerContext.hasTimeLimit, 
        timerContext.currentWordTimeoutThreshold
    );

    wordResults[currentWordIndex] = {
        word: currentWord, 
        correct: isCorrectBySpelling, 
        timeElapsed: timeTaken,
        result: resultStatus 
    };

    if (resultStatus === 'success') {
        correctAnswers++;
    } else {
        let reason = 'incorrect';
        let maxAttempts = 2; 
        if (resultStatus === 'timeout') {
            reason = 'timeout';
            maxAttempts = 1; 
        }
        addWordToRetryList(
            { 
                word: currentWord, 
                description: currentDescription, 
                exampleSentence: currentExampleSentence, 
                originalIndex: currentWordOriginalIndex 
            }, 
            reason, 
            maxAttempts
        );
    }

    currentWordIndex++; 
    console.log(`[gameManager.processAnswer] currentWordIndex AFTER increment: ${currentWordIndex}`);

    const showFinals = currentWordIndex >= totalWordsInGame;
    const canCont = !showFinals;

    return {
        isCorrect: isCorrectBySpelling,
        resultStatus: resultStatus,   
        correctWord: currentWord,      
        userAttempt: userSubmittedAnswers.join(''),
        feedbackTime: timeTaken,
        canContinue: canCont, 
        showFinalResults: showFinals 
    };
}

// Moved from script.js
function evaluateAnswerWithTimingInternal(isCorrect, timeElapsed, hasLimit, threshold) {
    if (!hasLimit || threshold === 0) {
        return isCorrect ? 'success' : 'incorrect';
    }
    const isWithinTimeLimit = timeElapsed <= threshold;
    if (isCorrect && isWithinTimeLimit) return 'success';
    if (isCorrect && !isWithinTimeLimit) return 'timeout'; // Correct but too slow
    if (!isCorrect && !isWithinTimeLimit) return 'timeout_incorrect'; // Incorrect and too slow
    return 'incorrect'; // Incorrect but within time limit
}


export function getGameStatusForRetry() {
    return { canRetry: wordRetryData.length > 0 };
}

export function getCurrentWord() {
    return { word: currentWord };
} 