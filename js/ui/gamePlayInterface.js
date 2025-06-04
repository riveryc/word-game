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

// Helper function to find the index of the next editable input
function findNextEditableInputIndex(currentIndex) {
    for (let i = currentIndex + 1; i < inputElements.length; i++) {
        if (inputElements[i] && !inputElements[i].readOnly) {
            return i;
        }
    }
    return -1; // No next editable input found
}

// Helper function to find the index of the previous editable input
function findPreviousEditableInputIndex(currentIndex) {
    for (let i = currentIndex - 1; i >= 0; i--) {
        if (inputElements[i] && !inputElements[i].readOnly) {
            return i;
        }
    }
    return -1; // No previous editable input found
}

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

    // Check for the new displayableWordParts property
    if (currentWordData && currentWordData.displayableWordParts && currentWordData.sentencePrefix !== undefined && currentWordData.sentenceSuffix !== undefined) {
        // 1. Display sentence prefix
        const prefixDiv = document.createElement('div');
        prefixDiv.textContent = currentWordData.sentencePrefix;
        prefixDiv.className = 'sentence-prefix sentence-segment'; 
        wordDisplayDiv.appendChild(prefixDiv);

        // 2. Create and display input fields for the missing word using displayableWordParts
        const wordGuessArea = document.createElement('div');
        wordGuessArea.className = 'word-guess-area'; 
        
        currentWordData.displayableWordParts.forEach((part, index) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'inline-input'; 
            input.maxLength = 1;
            input.dataset.index = index; 
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('spellcheck', 'false');

            if (!part.isHidden) { // If the letter is a hint (not hidden)
                input.value = part.letter; // Pre-fill the letter
                input.readOnly = true;    // Make it read-only
                input.classList.add('hint-letter'); // Optional class for styling hints
            } else { // Letter is hidden, user needs to guess
                // Add event listeners only for active input fields
                input.addEventListener('keydown', handleInputKeydown);
                input.addEventListener('input', handleInputChange);
                input.addEventListener('focus', (e) => {
                    currentFocusedInputIndex = parseInt(e.target.dataset.index);
                });
            }
            
            wordGuessArea.appendChild(input);
            inputElements.push(input); // Still keep all inputs for reference, e.g. for checkAnswerInternal
        });
        wordDisplayDiv.appendChild(wordGuessArea);

        // 3. Display sentence suffix
        const suffixDiv = document.createElement('div');
        suffixDiv.textContent = currentWordData.sentenceSuffix;
        suffixDiv.className = 'sentence-suffix sentence-segment'; 
        wordDisplayDiv.appendChild(suffixDiv);
        
        // Set initial focus on the first *editable* input element
        const firstEditableInput = inputElements.find(input => !input.readOnly);
        if (firstEditableInput) {
            firstEditableInput.focus();
            currentFocusedInputIndex = parseInt(firstEditableInput.dataset.index);
        } else if (inputElements.length > 0) {
             // Fallback if all are read-only (e.g. 0% missing), focus first one anyway
            inputElements[0].focus();
            currentFocusedInputIndex = 0;
        }

        document.removeEventListener('keydown', handleGlobalKeydown); 
        document.addEventListener('keydown', handleDocumentKeydown);

    } else {
        wordDisplayDiv.textContent = 'Error: Word data is incomplete or missing displayableWordParts.';
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
        // Ensure we only try to focus if the element exists and is focusable 
        // (though readOnly inputs are focusable, the main goal is editable ones here)
        if(inputElements[index]) {
            inputElements[index].focus();
            currentFocusedInputIndex = index; // Keep track of the numerically focused index
        }
    }
}

function handleInputChange(event) {
    const input = event.target;
    const index = parseInt(input.dataset.index);

    input.value = input.value.toLowerCase().charAt(0);

    if (input.value) { // If a character was entered
        const nextEditableIndex = findNextEditableInputIndex(index);
        if (nextEditableIndex !== -1) {
            focusInputElement(nextEditableIndex);
        }
        // If no next editable input, focus might stay, or if it was the last actual input field, user might press Enter.
    }
}

function handleInputKeydown(event) {
    const index = parseInt(event.target.dataset.index);
    isProcessing = false; 

    if (event.key === 'Enter') {
        event.preventDefault();
        if (waitingForContinue) { 
            isProcessing = true; 
            waitingForContinue = false;
            document.removeEventListener('keydown', handleDocumentKeydown);
            if (requestNextWordFn) requestNextWordFn();
        } else {
            checkAnswerInternal();
        }
    } else if (event.key === 'Backspace') {
        if (!event.target.value && index >= 0) { // Check index >= 0 for safety
            const prevEditableIndex = findPreviousEditableInputIndex(index);
            if (prevEditableIndex !== -1) {
                event.preventDefault();
                focusInputElement(prevEditableIndex);
            }
            // If no previous editable (e.g., at the first editable input), default backspace behavior on empty field, or nothing.
        } 
    } else if (event.key === 'ArrowLeft') {
        const prevEditableIndex = findPreviousEditableInputIndex(index);
        if (prevEditableIndex !== -1) {
            event.preventDefault();
            focusInputElement(prevEditableIndex);
        }
    } else if (event.key === 'ArrowRight') {
        const nextEditableIndex = findNextEditableInputIndex(index);
        if (nextEditableIndex !== -1) {
            event.preventDefault();
            focusInputElement(nextEditableIndex);
        }
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        if (repeatWordFn) repeatWordFn();
    } else if (event.key.length === 1 && !event.key.match(/[a-z0-9]/i)) { 
        event.preventDefault(); 
    }
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
    expectedWordString = String(expectedWordString || ''); 
    let allCorrect = true;

    for (let i = 0; i < inputElements.length; i++) {
        const input = inputElements[i];
        const expectedCharOriginal = expectedWordString[i] || '';
        const userChar = userAttemptString[i] || ''; // This will include user's input for non-hints

        // If it was not a hint letter initially, apply feedback.
        // Hint letters (readOnly) should retain their initial value and not get feedback classes for correctness/incorrectness of the hint itself.
        if (!input.classList.contains('hint-letter')) {
            input.value = expectedCharOriginal; // Show the correct letter for user-guessed spots
            input.readOnly = true; // Make input readonly after checking
            input.classList.remove('input-incorrect'); // Clear previous incorrect feedback class
    
            if (expectedCharOriginal.toLowerCase() !== userChar.toLowerCase()) {
                input.classList.add('input-incorrect');
                allCorrect = false;
            }
        } else {
            // For hint letters, ensure they are still readOnly and show the original hint.
            // Their value was already set and they are readOnly. No further action needed unless specific styling changes.
            // If the original word from expectedWordString differs from the hint (should not happen with correct logic),
            // this ensures the hint is preserved.
            input.value = expectedCharOriginal; // Ensure it displays the definitive correct letter (which should be the hint)
            // AllCorrect flag should consider if the user's input for non-hint parts matches.
            // The loop structure correctly does this as `allCorrect` is only set to false if a non-hint character is wrong.
        }
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