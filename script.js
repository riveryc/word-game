import { parseCSVLine } from './js/data/csvParser.js';
import { shuffleArray } from './js/utils/helpers.js';
import { validateTimeoutInput } from './js/utils/validation.js';
import { initializeTimerManager, startWordTimer, stopWordTimer, getTimerEvaluationContext, getHasTimeLimit, getTimeoutPerLetter, getCurrentWordTimeoutThreshold, updateTimeoutThreshold } from './js/game/timerManager.js';
import { hideWordInSentence } from './js/utils/sentenceUtils.js';
import {
    initializeDataSourceHandler,
    setupDataSourceSelection as setupDataSourceSelectionHandler,
    loadSelectedDataSource as loadSelectedDataSourceHandler,
    setCurrentDataSource,
    getCurrentDataSource
} from './js/data/dataSourceHandler.js';
import {
    initializeFilterManager,
    setBaseWordData as setBaseWordDataForFilters,
    resetFilters as resetFiltersHandler
} from './js/ui/filterManager.js';

// Game state variables
let allWords = []; // Will be updated by filterManager callback
let allDescriptions = []; // Will be updated by filterManager callback
let allExampleSentences = []; // Will be updated by filterManager callback
let allWordData = []; // Base data set by dataSourceHandler, passed to filterManager
let filteredWordData = []; // Will be updated by filterManager callback
let gameWords = [];
let gameDescriptions = [];
let gameExampleSentences = [];
let wordResults = [];
let currentWordIndex = 0;
let currentWord = '';
let currentDescription = '';
let currentExampleSentence = '';
let partialWord = '';
let missingLetters = '';
let correctAnswers = 0;
let totalWords = 0;
let isRetryMode = false;
let lastFocusedInput = null;
let waitingForContinue = false;
let selectedLevel = 3;
let isProcessing = false;
let selectedWordCount = 20;
let wordRetryData = [];

// Timer system variables - These are now managed by timerManager.js
// let timeoutPerLetter = 5; 
// let currentWordTimeoutThreshold = 0; 
// let hasTimeLimit = true; 
// let showTimerDisplay = false; 
// let currentWordStartTime = null; 
// let currentWordTimer = null; 
// let timeElapsed = 0; 

// Data source variables - managed by dataSourceHandler.js
// let currentDataSource = 'local'; 
// let googleSheetsUrl = '';

// Filter variables - now managed by filterManager.js
// let availableGrades = [];
// let availableSources = [];
// let selectedGrades = [];
// let selectedSources = [];
// let dateFrom = '';
// let dateTo = '';

// Data source selection functions (now mostly handled by dataSourceHandler.js)
// function setupDataSourceSelection() { // MOVED
// ...
// }

// Wrapper function in script.js to call the handler's loadSelectedDataSource
async function loadSelectedDataSource() {
    // The handler will manage showing loading messages and calling back with data/errors
    await loadSelectedDataSourceHandler();
}

// function showUrlError(message) { // MOVED
// ...
// }

// Google Sheets integration functions (helpers, MOVED to dataSourceHandler.js)
// function extractSheetId(url) { // MOVED
// ... 
// }
// function generateCSVExportUrl(sheetId) { // MOVED
// ... 
// }

// function parseGoogleSheetsData(text) { // MOVED and modified in handler
// ...
// }

// function showDataSourceError(message) { // MOVED and modified in handler
// ...
// }

// function goBackToDataSource() { // MOVED and modified in handler
// ...
// }

// Filter functions - MOVED to filterManager.js
// function extractFilterOptions() { ... }
// function applyFilters() { ... }
// function setupFilters() { ... }
// function setupMultiSelect(containerId, options, selected, onChangeCallback) { ... }

// This function updates the UI for selecting the number of words to practice from the filtered set.
// The count of available filtered words is now handled by filterManager updating 'total-words-count' span.
function updatePracticeWordCountSelectionUI() {
    const numFilteredWords = allWords.length; // allWords is now the filtered list
    console.log('[Script.js] updatePracticeWordCountSelectionUI - numFilteredWords (allWords.length):', numFilteredWords);
    const wordCountSelectionDiv = document.getElementById('word-count-selection');
    const wordCountInput = document.getElementById('word-count-input');
    // const totalWordsCountSpan = document.getElementById('total-words-count'); // This is updated by filterManager

    if (wordCountSelectionDiv && wordCountInput) {
        if (numFilteredWords > 0) { // Only show if there are words to practice
            wordCountSelectionDiv.style.display = 'block';
            // totalWordsCountSpan.textContent = numFilteredWords; // Done by filterManager
            
            wordCountInput.value = Math.min(selectedWordCount, numFilteredWords); // Default to current selection or max available
            wordCountInput.max = numFilteredWords;
            selectedWordCount = parseInt(wordCountInput.value);

            // Ensure event listener for input changes is correctly set up
            // (Consider moving this setup to an init function if not already robust)
            const newWordCountInput = wordCountInput.cloneNode(true);
            wordCountInput.parentNode.replaceChild(newWordCountInput, wordCountInput);
            newWordCountInput.addEventListener('input', function() {
                selectedWordCount = parseInt(this.value) || 1;
                selectedWordCount = Math.max(1, Math.min(selectedWordCount, allWords.length)); // allWords is filtered list
                this.value = selectedWordCount;
            });

        } else {
            wordCountSelectionDiv.style.display = 'none';
            selectedWordCount = 0;
        }
    }
}

function resetFilters() {
    resetFiltersHandler(); // Call the imported handler function
    // The filterManager will call onFiltersApplied, which will update script.js state and UI
}

// Common function to show word count and level selection
function showWordCountAndLevelSelection() {
    document.getElementById('content').style.display = 'none'; // Hide loading message/content div
    updatePracticeWordCountSelectionUI(); 

    document.getElementById('level-selection').style.display = 'block';
    updateBackButtonVisibility();
}

// Level selection functions
function selectLevel(level) {
    selectedLevel = level;

    // Update visual selection
    document.querySelectorAll('.level-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector(`[data-level="${level}"]`).classList.add('selected');
}

function startGameWithLevel() {
    // Ensure timeout settings are properly initialized before starting game
    updateTimeoutThreshold();

    // Hide level selection and start the game
    document.getElementById('level-selection').style.display = 'none';
    startGame();
}

function createPartialWord(word) {
    if (!word || word.length === 0) {
        return { wordStructure: [], missingLetters: '' };
    }

    let wordStructure = [];
    let missingLetters = [];

    // Calculate how many letters to show based on selected level
    const missingPercentage = [50, 60, 70, 80, 90, 100][selectedLevel - 1];
    const totalLetters = word.length;
    const lettersToShow = Math.max(0, Math.ceil(totalLetters * (1 - missingPercentage / 100)));

    // Special case: for nightmare mode (level 6), show 0 letters always
    // For very short words at level 5, might show 0 letters
    const actualLettersToShow = selectedLevel === 6 ? 0 :
        (totalLetters <= 2 && selectedLevel === 5) ?
        Math.max(0, lettersToShow) : Math.max(1, lettersToShow);

    // Determine which positions to show - make it more random
    let visiblePositions = [];

    if (actualLettersToShow === 0) {
        // Show no letters (only for very short words at highest difficulty)
        visiblePositions = [];
    } else {
        // Create array of all possible positions
        const allPositions = [];
        for (let i = 0; i < totalLetters; i++) {
            allPositions.push(i);
        }

        // Randomly select positions to show
        const shuffledPositions = shuffleArray(allPositions);
        visiblePositions = shuffledPositions.slice(0, actualLettersToShow);
        visiblePositions.sort((a, b) => a - b);
    }

    // Build word structure
    for (let i = 0; i < word.length; i++) {
        if (visiblePositions.includes(i)) {
            wordStructure.push({ type: 'visible', letter: word[i] });
        } else {
            wordStructure.push({ type: 'input', letter: word[i], index: missingLetters.length });
            missingLetters.push(word[i]);
        }
    }

    return { wordStructure, missingLetters };
}

function addWordToRetryList(wordIndex, reason, maxAttempts) {
    // Check if word is already in retry list
    const existingEntry = wordRetryData.find(entry => entry.originalIndex === wordIndex);

    if (existingEntry) {
        // Update existing entry if this is a worse result
        if (reason === 'incorrect' && existingEntry.reason === 'timeout') {
            existingEntry.reason = 'incorrect';
            existingEntry.maxAttempts = 2;
        }
    } else {
        // Add new entry
        wordRetryData.push({
            word: gameWords[wordIndex],
            description: gameDescriptions[wordIndex],
            exampleSentence: gameExampleSentences[wordIndex],
            reason: reason,
            attempts: 0,
            maxAttempts: maxAttempts,
            originalIndex: wordIndex
        });
    }
}

function startGame() {
    // Hide the main content, level selection, word count selection and show game interface
    document.getElementById('content').style.display = 'none';
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    document.getElementById('game-interface').style.display = 'block';
    document.getElementById('final-results').style.display = 'none';

    // Update back button visibility
    updateBackButtonVisibility();

    // Initialize game state - shuffle words, descriptions, and example sentences together
    const wordDataPairs = allWords.map((word, index) => ({
        word: word,
        description: allDescriptions[index],
        exampleSentence: allExampleSentences[index]
    }));

    const shuffledPairs = shuffleArray(wordDataPairs);

    // Use only the selected number of words
    const selectedPairs = shuffledPairs.slice(0, selectedWordCount);
    gameWords = selectedPairs.map(pair => pair.word);
    gameDescriptions = selectedPairs.map(pair => pair.description);
    gameExampleSentences = selectedPairs.map(pair => pair.exampleSentence);

    currentWordIndex = 0;
    correctAnswers = 0;
    totalWords = gameWords.length;
    isRetryMode = false;

    // Initialize enhanced word results tracking
    wordResults = new Array(gameWords.length).fill(null).map(() => ({
        correct: false,
        timeElapsed: 0,
        result: 'pending'
    }));

    // Clear retry data
    wordRetryData = [];

    // Start the first word
    showNextWord();
}

function startRetryGame() {
    // Remove retry keyboard shortcut
    removeRetryKeyboardShortcut();

    // Hide final results, level selection, word count selection and show game interface
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    document.getElementById('game-interface').style.display = 'block';

    // Update back button visibility
    updateBackButtonVisibility();

    // Create retry game from wordRetryData
    const retryWords = [];

    // Process each word in retry list based on attempts vs maxAttempts
    for (const retryEntry of wordRetryData) {
        const attemptsNeeded = retryEntry.maxAttempts - retryEntry.attempts;

        // Add the word multiple times based on how many attempts are needed
        for (let i = 0; i < attemptsNeeded; i++) {
            retryWords.push({
                word: retryEntry.word,
                description: retryEntry.description,
                exampleSentence: retryEntry.exampleSentence,
                retryReason: retryEntry.reason,
                originalIndex: retryEntry.originalIndex
            });
        }
    }

    // Shuffle the retry words
    const shuffledRetryWords = shuffleArray(retryWords);
    gameWords = shuffledRetryWords.map(item => item.word);
    gameDescriptions = shuffledRetryWords.map(item => item.description);
    gameExampleSentences = shuffledRetryWords.map(item => item.exampleSentence);

    currentWordIndex = 0;
    correctAnswers = 0;
    totalWords = gameWords.length;
    isRetryMode = true;

    // Initialize enhanced word results tracking for retry
    wordResults = new Array(gameWords.length).fill(null).map(() => ({
        correct: false,
        timeElapsed: 0,
        result: 'pending'
    }));

    // Clear retry data for this retry session
    wordRetryData = [];

    // Start the first word
    showNextWord();
}

function showNextWord() {
    if (currentWordIndex >= gameWords.length) {
        showFinalResults();
        return;
    }

    currentWord = gameWords[currentWordIndex];
    currentDescription = gameDescriptions[currentWordIndex];
    currentExampleSentence = gameExampleSentences[currentWordIndex];
    const wordData = createPartialWord(currentWord);
    missingLetters = wordData.missingLetters;

    // Create the word display with inline input fields
    const wordDisplayDiv = document.getElementById('word-display');
    wordDisplayDiv.innerHTML = '';

    wordData.wordStructure.forEach((item, index) => {
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

    // Update progress and description
    const progressText = isRetryMode ?
        `Retry Word ${currentWordIndex + 1} of ${totalWords}` :
        `Word ${currentWordIndex + 1} of ${totalWords}`;
    document.getElementById('progress').textContent = progressText;

    // Show example sentence with hidden word, or description if no example sentence
    if (currentExampleSentence && currentExampleSentence.trim() !== '') {
        const hiddenSentence = hideWordInSentence(currentExampleSentence, currentWord);
        document.getElementById('word-description').innerHTML = `
            <div class="example-sentence">
                <strong>📝 Example:</strong> ${hiddenSentence}
            </div>
        `;
    } else if (currentDescription && currentDescription.trim() !== '') {
        document.getElementById('word-description').innerHTML = `
            <div class="word-description">
                <strong>💡 Hint:</strong> ${currentDescription}
            </div>
        `;
    } else {
        document.getElementById('word-description').textContent = '';
    }

    document.getElementById('feedback').textContent = '';

    // Reset focus tracking, waiting state, and processing flag for new word
    lastFocusedInput = null;
    waitingForContinue = false;
    isProcessing = false;

    // Calculate timeout threshold for this word based on missing letters
    const missingLetterCount = wordData.wordStructure.filter(item => item.type === 'input').length;
    // currentWordTimeoutThreshold = getHasTimeLimit() ? (missingLetterCount * getTimeoutPerLetter()) : 0; // Updated
    // No, currentWordTimeoutThreshold is calculated and stored within startWordTimer

    // Speak the word
    if (typeof speakWord === 'function') {
        speakWord(currentWord);
    }

    // Start the timer for this word
    startWordTimer(missingLetterCount); // Pass missingLetterCount

    // Focus on first input field
    const firstInput = wordDisplayDiv.querySelector('.inline-input');
    if (firstInput) {
        firstInput.focus();
        lastFocusedInput = firstInput;
    }
}

function handleInputFocus(event) {
    // Track which input field was last focused
    lastFocusedInput = event.target;
}

function handleInlineInput(event) {
    const input = event.target;
    const value = input.value.toLowerCase();

    // Move to next input field if this one is filled
    if (value) {
        const allInputs = document.querySelectorAll('.inline-input');
        const currentIndex = Array.from(allInputs).indexOf(input);

        if (currentIndex < allInputs.length - 1) {
            allInputs[currentIndex + 1].focus();
        }
        // Note: Removed auto-submit when all fields are filled
        // Users must now press Enter to confirm their answer
    }
}

function handleInlineKeydown(event) {
    const input = event.target;

    if (event.key === 'Enter') {
        // Prevent rapid Enter key presses
        if (isProcessing) {
            return;
        }

        if (waitingForContinue) {
            // Continue to next word (works for both correct and incorrect answers now)
            isProcessing = true;
            waitingForContinue = false;
            currentWordIndex++;
            showNextWord();
        } else {
            // Normal answer checking
            checkAnswer();
        }
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        // Space bar to repeat the word
        event.preventDefault(); // Prevent space from being typed in input
        if (typeof window.repeatWord === 'function' && currentWord) {
            window.repeatWord(currentWord); // Pass currentWord
        }
    } else if (event.key === 'Backspace' && !input.value && !waitingForContinue) {
        // Move to previous input field if current is empty and backspace is pressed
        const allInputs = document.querySelectorAll('.inline-input');
        const currentIndex = Array.from(allInputs).indexOf(input);

        if (currentIndex > 0) {
            allInputs[currentIndex - 1].focus();
        }
    }
}

// Function to create a visual comparison between user input and correct answer
function createWordComparison(userAnswers, expectedWord) {
    const allInputs = document.querySelectorAll('.inline-input');
    const wordDisplayDiv = document.getElementById('word-display');

    // Reconstruct the user's full attempted word
    let userAttempt = '';
    let inputIndex = 0;

    // Go through each character in the word display to reconstruct user's attempt
    for (let child of wordDisplayDiv.children) {
        if (child.classList.contains('visible-letter')) {
            // This was a visible letter, add it as-is
            userAttempt += child.textContent.toLowerCase();
        } else if (child.classList.contains('inline-input')) {
            // This was an input field, add what the user typed (or empty if nothing)
            userAttempt += (userAnswers[inputIndex] || '_').toLowerCase();
            inputIndex++;
        }
    }

    // Create highlighted comparison of the correct word
    let correctWordHighlighted = '';
    for (let i = 0; i < expectedWord.length; i++) {
        const correctLetter = expectedWord[i].toLowerCase();
        const userLetter = i < userAttempt.length ? userAttempt[i] : '_';

        if (correctLetter === userLetter) {
            // Correct letter - show in normal green
            correctWordHighlighted += `<span style="color: #90EE90;">${expectedWord[i]}</span>`;
        } else {
            // Incorrect letter - show in bold red with larger size
            correctWordHighlighted += `<span style="color: #FF6B6B; font-weight: bold; font-size: 1.2em; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);">${expectedWord[i]}</span>`;
        }
    }

    return {
        userAttempt: userAttempt.replace(/_/g, '?'), // Replace underscores with question marks for display
        correctWordHighlighted: correctWordHighlighted
    };
}

function checkAnswer() {
    // Don't process if we're already waiting for continue or isProcessing
    if (waitingForContinue || isProcessing) {
        return;
    }

    // Stop the timer and get final elapsed time
    const finalTimeElapsed = stopWordTimer();

    const allInputs = document.querySelectorAll('.inline-input');
    const userAnswers = Array.from(allInputs).map(input => input.value.toLowerCase().trim());
    const feedbackDiv = document.getElementById('feedback');

    // Check if all inputs are filled
    if (userAnswers.some(answer => answer === '')) {
        feedbackDiv.innerHTML = '<span class="incorrect">Please fill in all the missing letters!</span>';
        // DON'T restart timer - let it continue running so time accumulates properly
        return;
    }

    // Compare with expected answers
    const isCorrect = userAnswers.every((answer, index) => answer === missingLetters[index]);

    // Evaluate answer with timing
    const result = evaluateAnswerWithTiming(isCorrect, finalTimeElapsed);

    // Store enhanced result data
    wordResults[currentWordIndex] = {
        correct: isCorrect,
        timeElapsed: finalTimeElapsed,
        result: result
    };
    
    const currentTimeoutThreshold = getCurrentWordTimeoutThreshold(); // Get from timerManager

    if (result === 'success') {
        // Perfect answer - correct and within time limit
        correctAnswers++;

        feedbackDiv.innerHTML = `
            <div class="correct-feedback">
                <span class="correct" style="font-size: 1.5em;">✅ Perfect!</span><br>
                <div style="margin-top: 10px; font-size: 1.1em; color: #90EE90;">
                    Completed in ${finalTimeElapsed.toFixed(1)}s
                </div>
                <div style="margin-top: 15px; font-size: 1.2em;">
                    Press <strong>Enter</strong> to continue to the next word
                </div>
            </div>
        `;
        feedbackDiv.className = 'feedback correct';

    } else if (result === 'timeout') {
        // Correct but too slow - add to retry list
        addWordToRetryList(currentWordIndex, 'timeout', 1);

        feedbackDiv.innerHTML = `
            <div class="correct-feedback">
                <span class="correct" style="font-size: 1.5em;">✅ Correct!</span><br>
                <span style="color: #FFD700; font-size: 1.2em;">⚠️ But took too long</span><br>
                <div style="margin-top: 10px; font-size: 1.1em; color: #FFD700;">
                    Time: ${finalTimeElapsed.toFixed(1)}s (limit: ${currentTimeoutThreshold}s for ${missingLetters.length} letters)
                </div>
                <div style="margin-top: 10px; font-size: 1em; color: #E6E6FA;">
                    This word will be retried once for speed practice
                </div>
                <div style="margin-top: 15px; font-size: 1.2em;">
                    Press <strong>Enter</strong> to continue to the next word
                </div>
            </div>
        `;
        feedbackDiv.className = 'feedback correct';

    } else if (result === 'timeout_incorrect') {
        // Wrong AND slow - add to retry list with 2 attempts (worst case)
        addWordToRetryList(currentWordIndex, 'incorrect', 2);

        const expectedWord = currentWord;
        const comparison = createWordComparison(userAnswers, expectedWord);

        feedbackDiv.innerHTML = `
            <span class="incorrect" style="font-size: 1.5em;">❌ Incorrect!</span><br>
            <span style="color: #FFD700; font-size: 1.1em;">⚠️ And took too long</span><br>
            <div style="margin-top: 10px; font-size: 1.1em; color: #FFB6C1;">
                Time: ${finalTimeElapsed.toFixed(1)}s (limit: ${currentTimeoutThreshold}s for ${missingLetters.length} letters)
            </div>
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
                This word will be retried twice (accuracy + speed practice)
            </div>
            <div style="margin-top: 15px; font-size: 1.2em;">
                <strong>💡 Red letters</strong> show where you made mistakes<br>
                Press <strong>Enter</strong> to continue to the next word
            </div>
        `;
        feedbackDiv.className = 'feedback incorrect';

    } else {
        // Incorrect answer (within time limit) - add to retry list
        addWordToRetryList(currentWordIndex, 'incorrect', 2);

        const expectedWord = currentWord;
        const comparison = createWordComparison(userAnswers, expectedWord);

        feedbackDiv.innerHTML = `
            <span class="incorrect" style="font-size: 1.5em;">❌ Incorrect!</span><br>
            <div style="margin-top: 10px; font-size: 1.1em; color: #FFB6C1;">
                Time: ${finalTimeElapsed.toFixed(1)}s
            </div>
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
                This word will be retried twice for accuracy practice
            </div>
            <div style="margin-top: 15px; font-size: 1.2em;">
                <strong>💡 Red letters</strong> show where you made mistakes<br>
                Press <strong>Enter</strong> to continue to the next word
            </div>
        `;
        feedbackDiv.className = 'feedback incorrect';
    }

    // Set waiting state for all results
    waitingForContinue = true;

    // Focus on first input to capture Enter
    if (allInputs.length > 0) {
        allInputs[0].focus();
    }
}

// Global keyboard event handler
function handleGlobalKeydown(event) {
    const overlay = document.getElementById('confirmation-overlay');
    const isConfirmationVisible = overlay && overlay.style.display === 'flex';

    if (isConfirmationVisible) {
        // Handle keyboard navigation in confirmation dialog
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            confirmationSelection = confirmationSelection === 'no' ? 'yes' : 'no';
            updateConfirmationSelection();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            confirmExitSelection();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            hideExitConfirmation();
        }
    } else {
        // Handle ESC key to show confirmation dialog
        if (event.key === 'Escape') {
            const gameInterface = document.getElementById('game-interface');
            const levelSelection = document.getElementById('level-selection');
            const finalResults = document.getElementById('final-results');

            // Only show confirmation if we're in a screen that has the back button
            const shouldShowConfirmation = (gameInterface && gameInterface.style.display === 'block') ||
                                         (levelSelection && levelSelection.style.display === 'block') ||
                                         (finalResults && finalResults.style.display === 'block');

            if (shouldShowConfirmation) {
                event.preventDefault();
                showExitConfirmation();
            }
        }
    }
}

// Initialize back button and confirmation dialog when the page loads
function initializeBackButton() {
    // Add global keyboard event listener
    document.addEventListener('keydown', handleGlobalKeydown);

    // Update back button visibility initially
    updateBackButtonVisibility();
}

function evaluateAnswerWithTiming(isCorrect, timeElapsed) {
    const { hasTimeLimit, currentWordTimeoutThreshold } = getTimerEvaluationContext(); // Updated

    if (!hasTimeLimit || currentWordTimeoutThreshold === 0) {
        // No time limit - only check correctness
        return isCorrect ? 'success' : 'incorrect';
    }

    const isWithinTimeLimit = timeElapsed <= currentWordTimeoutThreshold;

    if (isCorrect && isWithinTimeLimit) {
        return 'success'; // ✅ Perfect! Correct and fast
    } else if (isCorrect && !isWithinTimeLimit) {
        return 'timeout'; // ⚠️ Correct but slow (took longer than timeout)
    } else if (!isCorrect && !isWithinTimeLimit) {
        return 'timeout_incorrect'; // ❌ Wrong AND slow (worst case - retry twice)
    } else {
        return 'incorrect'; // ❌ Wrong but within time limit
    }
}

window.loadSelectedDataSource = loadSelectedDataSource;
window.startGameWithLevel = startGameWithLevel;
window.selectLevel = selectLevel;
window.resetFilters = resetFilters;

// Initialize data source selection when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Data Source Handler with callbacks
    initializeDataSourceHandler({
        onDataLoaded: (parsedData) => {
            console.log('[Script.js] onDataLoaded - Received allWordData length:', parsedData.allWordData.length);
            allWordData = parsedData.allWordData; // Set the base data in script.js
            // Pass the base data to the filter manager to extract options and apply initial filters
            setBaseWordDataForFilters(allWordData);
            // The filterManager will call its onFiltersAppliedCallback, which is defined below.
        },
        onDataError: (errorMessage) => {
            // script.js can decide how to display this error, if different from handler's default
            console.error("Data loading error (from script.js):", errorMessage);
            // The handler already shows an error message, so this might be redundant unless script.js
            // wants to do more.
        },
        onUrlError: (errorMessage) => {
            // script.js can decide how to display this error
            console.error("URL error (from script.js):", errorMessage);
            // The handler already shows an error message for URL input.
        },
        onGoBack: (isErrorState) => {
            // This callback is used when the handler determines a need to return to data source selection
            document.getElementById('content').style.display = 'none';
            document.getElementById('data-source-selection').style.display = 'block';
            if (isErrorState) {
                // Potentially focus on the problematic input or show additional messages from script.js
                if (getCurrentDataSource() === 'google') {
                    const sheetsUrlInput = document.getElementById('sheets-url');
                    if (sheetsUrlInput) sheetsUrlInput.focus();
                }
            }
            updateBackButtonVisibility(); // This function is still in script.js
        }
    });

    initializeFilterManager({
        onFiltersApplied: (filteredResults) => {
            console.log('[Script.js] onFiltersApplied - Received filteredResults.allWords length:', filteredResults.allWords.length);
            // Update script.js state with the data processed by filterManager
            allWords = filteredResults.allWords;
            allDescriptions = filteredResults.allDescriptions;
            allExampleSentences = filteredResults.allExampleSentences;
            filteredWordData = filteredResults.filteredWordData; // The full filtered objects

            // Now that filters are applied and script.js state is updated,
            // update the UI that depends on the filtered word count.
            showWordCountAndLevelSelection();
        }
    });

    setupDataSourceSelectionHandler();
    initializeBackButton();
    initializeTimerManager();

    // Attach event listener to the load data button
    const loadDataButton = document.getElementById('load-data-button');
    if (loadDataButton) {
        loadDataButton.addEventListener('click', loadSelectedDataSource);
    }
});

// Make loadSelectedDataSource globally available if it's called from HTML onclick
window.loadSelectedDataSource = loadSelectedDataSource;
