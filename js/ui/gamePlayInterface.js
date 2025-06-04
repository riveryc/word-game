// js/ui/gamePlayInterface.js

// Module-specific state for the game play interface
let waitingForContinue = false;
let isProcessing = false;
// let isGamePlayActiveForFocus = false; // Focus lock logic may need to be re-evaluated or simplified
// let boundHandleDocumentClickForFocus = null; 

// References to functions from other modules, to be set during initialization
let processAnswerFn = null;
let requestNextWordFn = null;
let getTimerContextFn = null;
let stopWordTimerFn = null;
let startWordTimerFn = null;
let repeatWordFn = null;
// let getGameManagerCurrentWordFn = null; // Not actively used in this refactor, can be re-added if needed

// DOM Elements (cache them if frequently accessed)
let gameInterfaceDiv = null;
let wordDisplayDiv = null; 
let progressDiv = null;
let wordDescriptionDiv = null;
let feedbackDiv = null;

// Array to hold the actual HTML input elements for letters
let inputElements = []; 
let currentFocusedInputIndex = -1;

// Function to display the word challenge
function displayWordChallenge(currentWordData) { 
    console.log("[gamePlayInterface.displayWordChallenge] Called. Resetting flags.");
    isProcessing = false;
    waitingForContinue = false;
    inputElements = []; 
    currentFocusedInputIndex = -1;

    // Cache DOM elements if not already done
    if (!gameInterfaceDiv) gameInterfaceDiv = document.getElementById('game-interface');
    if (!wordDisplayDiv) wordDisplayDiv = document.getElementById('word-display');
    if (!progressDiv) progressDiv = document.getElementById('progress');
    if (!wordDescriptionDiv) wordDescriptionDiv = document.getElementById('word-description');
    if (!feedbackDiv) feedbackDiv = document.getElementById('feedback');

    gameInterfaceDiv.style.display = 'block';
    wordDisplayDiv.innerHTML = ''; // Clear previous content
    if(feedbackDiv) feedbackDiv.innerHTML = ''; // Clear previous feedback

    if (currentWordData && currentWordData.word && currentWordData.sentencePrefix !== undefined && currentWordData.sentenceSuffix !== undefined) {
        // 1. Display sentence prefix
        const prefixDiv = document.createElement('div');
        prefixDiv.textContent = currentWordData.sentencePrefix;
        prefixDiv.className = 'sentence-prefix sentence-segment'; // Ensure this class styles it as block/centered
        wordDisplayDiv.appendChild(prefixDiv);

        // 2. Create and display input fields for the missing word
        const wordGuessArea = document.createElement('div');
        wordGuessArea.className = 'word-guess-area'; // Styles for centering, flex display
        
        for (let i = 0; i < currentWordData.word.length; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'inline-input'; // Use the existing style for single letter inputs
            input.maxLength = 1;
            input.dataset.index = i; 
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('spellcheck', 'false');
            
            // Add event listeners directly to inputs for better control
            input.addEventListener('keydown', handleInputKeydown);
            input.addEventListener('input', handleInputChange); // For auto-focus next, and value manipulation
            input.addEventListener('focus', (e) => {
                currentFocusedInputIndex = parseInt(e.target.dataset.index);
            });

            wordGuessArea.appendChild(input);
            inputElements.push(input);
        }
        wordDisplayDiv.appendChild(wordGuessArea);

        // 3. Display sentence suffix
        const suffixDiv = document.createElement('div');
        suffixDiv.textContent = currentWordData.sentenceSuffix;
        suffixDiv.className = 'sentence-suffix sentence-segment'; // Ensure this class styles it as block/centered
        wordDisplayDiv.appendChild(suffixDiv);
        
        // Set initial focus on the first input element
        if (inputElements.length > 0) {
            currentFocusedInputIndex = 0;
            inputElements[0].focus();
        }

        // Remove the global keydown listener if it exists from the previous letter-box implementation
        document.removeEventListener('keydown', handleGlobalKeydown); 
        // Add a general keydown listener for Enter (to submit) and Space (to repeat) when inputs are not focused
        // or for actions that are not input-specific.
        document.addEventListener('keydown', handleDocumentKeydown);

    } else {
        wordDisplayDiv.textContent = 'Error: Word data is incomplete.';
        console.error("[gamePlayInterface.displayWordChallenge] Incomplete currentWordData:", currentWordData);
    }

    progressDiv.textContent = currentWordData.progressText || '';
    wordDescriptionDiv.innerHTML = currentWordData.hintText || (currentWordData.description || '');

    if (startWordTimerFn && currentWordData && currentWordData.word) {
        startWordTimerFn(currentWordData.word.length); 
    }
}

function focusInputElement(index) {
    if (index >= 0 && index < inputElements.length) {
        inputElements[index].focus();
        currentFocusedInputIndex = index;
    }
}

function handleInputChange(event) {
    const input = event.target;
    const index = parseInt(input.dataset.index);

    // Force lowercase and keep only the first character
    input.value = input.value.toLowerCase().charAt(0);

    // If a character was entered and it's not the last input, move to the next one
    if (input.value && index < inputElements.length - 1) {
        focusInputElement(index + 1);
    }
}

// Keydown specifically for the input elements
function handleInputKeydown(event) {
    const index = parseInt(event.target.dataset.index);
    isProcessing = false; // Allow processing unless explicitly set by checkAnswer or continue

    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission if inputs are in a form
        if (waitingForContinue) { // If waiting for 'Enter' to continue to next word
            isProcessing = true; // Prevent further input processing during transition
            waitingForContinue = false;
            document.removeEventListener('keydown', handleDocumentKeydown);
            if (requestNextWordFn) requestNextWordFn();
        } else {
            checkAnswerInternal();
        }
    } else if (event.key === 'Backspace') {
        if (!event.target.value && index > 0) { // If input is empty and not the first one, move to previous
            event.preventDefault();
            focusInputElement(index - 1);
        } 
        // If it has value, normal backspace behavior will clear it. Then user can type or backspace again.
    } else if (event.key === 'ArrowLeft') {
        if (index > 0) {
            event.preventDefault();
            focusInputElement(index - 1);
        }
    } else if (event.key === 'ArrowRight') {
        if (index < inputElements.length - 1) {
            event.preventDefault();
            focusInputElement(index + 1);
        }
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        if (repeatWordFn) repeatWordFn();
    } else if (event.key.length === 1 && !event.key.match(/[a-z0-9]/i)) { // Allow only alpha-numeric
        event.preventDefault(); // Prevent non-alphanumeric characters (except space handled above)
    }
    // Let other keys (like letters) be handled by the input field itself and `handleInputChange`
}

// General keydown listener for the document (e.g., for space to repeat when inputs not focused, or global enter)
function handleDocumentKeydown(event) {
    if (event.target.nodeName === 'INPUT') return; // Already handled by handleInputKeydown

    if (event.key === 'Enter' && waitingForContinue) {
        isProcessing = true;
        waitingForContinue = false;
        document.removeEventListener('keydown', handleDocumentKeydown);
        if (requestNextWordFn) requestNextWordFn();
    } else if ((event.key === ' ' || event.key === 'Spacebar') && !isProcessing) {
        event.preventDefault();
        if (repeatWordFn) repeatWordFn();
    }
}

// This is the old global keydown, it should be removed or its logic merged if necessary.
// For now, it's effectively replaced by per-input listeners and handleDocumentKeydown.
function handleGlobalKeydown(event) { /* ... This function should be removed ... */ }


function applyFeedbackToInputs(userAttemptString, expectedWordString) {
    userAttemptString = String(userAttemptString || '').toLowerCase();
    expectedWordString = String(expectedWordString || ''); // Keep original case from game state
    let allCorrect = true;

    for (let i = 0; i < inputElements.length; i++) {
        const input = inputElements[i];
        const expectedCharOriginal = expectedWordString[i] || '';
        const userChar = userAttemptString[i] || '';

        input.value = expectedCharOriginal; // Show the correct letter
        input.readOnly = true; // Make input readonly after checking
        input.classList.remove('input-correct', 'input-incorrect'); // Clear previous feedback classes

        if (expectedCharOriginal.toLowerCase() !== userChar.toLowerCase()) {
            input.classList.add('input-incorrect');
            allCorrect = false;
        }
        // 'input-correct' class is no longer added for correct characters
    }
    return allCorrect;
}


function checkAnswerInternal() {
    if (waitingForContinue || isProcessing) {
        console.log(`[gamePlayInterface.checkAnswerInternal] Blocked. waitingForContinue: ${waitingForContinue}, isProcessing: ${isProcessing}`);
        return;
    }
    console.log("[gamePlayInterface.checkAnswerInternal] Starting. Setting isProcessing=true.");
    isProcessing = true; 

    const finalTimeElapsed = stopWordTimerFn ? stopWordTimerFn() : 0;
    
    let userAnswer = inputElements.map(input => input.value.trim().toLowerCase()).join('');

    if (!inputElements.some(input => input.value.trim() !== '')) {
        if(feedbackDiv) feedbackDiv.innerHTML = '<span class="incorrect">Please type the missing word!</span>';
        if (inputElements.length > 0) focusInputElement(0);
        console.log("[gamePlayInterface.checkAnswerInternal] Empty input. Resetting isProcessing=false.");
        isProcessing = false; 
        return;
    }

    if (!processAnswerFn) {
        console.error("[gamePlayInterface.checkAnswerInternal] processAnswerFn is not initialized!");
        isProcessing = false;
        return;
    }

    const answerProcessingResult = processAnswerFn(userAnswer, finalTimeElapsed);
    
    applyFeedbackToInputs(userAnswer, answerProcessingResult.correctAnswer);
    
    let feedbackHTML = '';
    let timerInfoHTML = '';
    const timerEvalContext = getTimerContextFn ? getTimerContextFn() : { currentWordTimeoutThreshold: 0 };

    if (answerProcessingResult.resultStatus !== 'success' && answerProcessingResult.resultStatus !== 'timeout' && timerEvalContext.currentWordTimeoutThreshold > 0) {
        const timeTaken = answerProcessingResult.feedbackTime.toFixed(1);
        const timeLimit = (timerEvalContext.currentWordTimeoutThreshold * (answerProcessingResult.correctAnswer || '').length).toFixed(1);
        timerInfoHTML = `<div style="font-size: 0.9em; margin-top: 5px;">Time: ${timeTaken}s (Limit: ${timeLimit}s)</div>`;
    }

    if (answerProcessingResult.resultStatus === 'success') {
        feedbackHTML = `
            <div class="correct-feedback">
                <span class="correct" style="font-size: 1.5em;">✅ Perfect!</span><br>
                <div style="margin-top: 10px; font-size: 1.1em; color: #90EE90;">
                    Completed in ${answerProcessingResult.feedbackTime.toFixed(1)}s
                </div>
            </div>`;
    } else if (answerProcessingResult.resultStatus === 'timeout') { 
        feedbackHTML = `
            <div class="correct-feedback">
                <span class="correct" style="font-size: 1.5em;">✅ Correct (but a bit slow)</span><br>
                <div style="margin-top: 10px; font-size: 1.1em; color: #FFD700;">
                    Completed in ${answerProcessingResult.feedbackTime.toFixed(1)}s. Try to be faster!
                </div>
            </div>`;
    } else { // Incorrect
        feedbackHTML = `
            <div class="incorrect-feedback">
                <span class="incorrect" style="font-size: 1.5em;">❌ Incorrect.</span><br>
                <div class="feedback-details" style="margin-top: 10px; font-size: 1.1em; color: #FF6B6B;">
                    Press Enter to continue.
                    ${timerInfoHTML} 
                </div>
            </div>`;
    }
    
    if(feedbackDiv) feedbackDiv.innerHTML = feedbackHTML;

    waitingForContinue = true; 
    document.removeEventListener('keydown', handleDocumentKeydown); 
    document.addEventListener('keydown', handleDocumentKeydown);
}


export function clearGamePlayUI() {
    if (gameInterfaceDiv) gameInterfaceDiv.style.display = 'none';
    if (wordDisplayDiv) wordDisplayDiv.innerHTML = '';
    if (progressDiv) progressDiv.textContent = '';
    if (wordDescriptionDiv) wordDescriptionDiv.textContent = '';
    if (feedbackDiv) feedbackDiv.innerHTML = '';
    inputElements = [];
    currentFocusedInputIndex = -1;
    isProcessing = false;
    waitingForContinue = false;
    document.removeEventListener('keydown', handleInputKeydown); // This might not be necessary if inputs are removed
    document.removeEventListener('keydown', handleDocumentKeydown);
    document.removeEventListener('keydown', handleGlobalKeydown); // Cleanup old one just in case
    console.log("[gamePlayInterface.clearGamePlayUI] UI cleared and keydown listeners managed.");
}

export function deactivateGamePlayFocusLock() {
    // isGamePlayActiveForFocus = false;
    // if (boundHandleDocumentClickForFocus) {
    //     document.removeEventListener('click', boundHandleDocumentClickForFocus, true);
    //     console.log("[gamePlayInterface.js] Focus lock event listener REMOVED via deactivate.");
    // }
}

export function initializeGamePlayInterface(callbacks) {
    processAnswerFn = callbacks.processAnswer;
    requestNextWordFn = callbacks.requestNextWord;
    getTimerContextFn = callbacks.getTimerContext; 
    stopWordTimerFn = callbacks.stopWordTimer;
    startWordTimerFn = callbacks.startWordTimer;
    repeatWordFn = callbacks.repeatWord; 
    // getGameManagerCurrentWordFn = callbacks.getGameManagerCurrentWord;

    console.log("[gamePlayInterface.js] Initialized with callbacks.");
}

// Function to reset cached DOM elements for testing purposes
function resetUIStateForTesting() {
    gameInterfaceDiv = null;
    wordDisplayDiv = null;
    progressDiv = null;
    wordDescriptionDiv = null;
    feedbackDiv = null;
    inputElements = [];
    currentFocusedInputIndex = -1;
    // isProcessing and waitingForContinue are reset at the start of displayWordChallenge
    console.log("[gamePlayInterface.js] Resetting UI state for testing.");
}

// Remove obsolete/renamed functions from export if they are not used elsewhere
// export { displayWordChallenge, setActiveLetterBox, handleGlobalKeydown, createWordComparisonUI };
export { displayWordChallenge, resetUIStateForTesting }; // Main export 