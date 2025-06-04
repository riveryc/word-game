// js/ui/gamePlayInterface.js

// Module-specific state for the game play interface
let waitingForContinue = false;
let isProcessing = false;
let isGamePlayActiveForFocus = false; // Re-enabled
let boundHandleDocumentClickForFocus = null; // Re-enabled

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

// Refined function to handle document clicks for focus lock
function handleDocumentClickForFocus(event) {
    if (!isGamePlayActiveForFocus || isProcessing || waitingForContinue) {
        return; // Lock not active or game is processing
    }

    const target = event.target;

    // Check if the click target is an interactive element within the game interface
    // or an input element itself.
    if (inputElements.includes(target) || // Clicked on one of our known input elements
        (target.closest && target.closest('#game-interface') && // Is the click target inside the game-interface?
         (target.nodeName === 'BUTTON' || target.classList.contains('repeat-button')) // And is it a button?
        )
       ) {
        // If the click is on a known input or a button inside the game-interface,
        // let the browser handle the focus naturally.
        // The 'focus' event listener on individual inputs should handle updating currentFocusedInputIndex.
        console.log("[gamePlayInterface.handleDocumentClickForFocus] Click on interactive element or input. No refocus.");
        return; 
    }

    // If the click was outside interactive elements, refocus.
    console.log("[gamePlayInterface.handleDocumentClickForFocus] Click detected outside inputs. Refocusing.");
    // Attempt to focus the last known focused *editable* input first
    if (currentFocusedInputIndex !== -1 && 
        inputElements[currentFocusedInputIndex] && 
        !inputElements[currentFocusedInputIndex].readOnly) {
        focusInputElement(currentFocusedInputIndex);
    } else {
        // Fallback to the first *editable* input
        const firstEditableInput = inputElements.find(input => !input.readOnly);
        if (firstEditableInput) {
            // focusInputElement will call .focus() and update currentFocusedInputIndex
            focusInputElement(inputElements.indexOf(firstEditableInput)); 
        }
    }
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
    
    // Remove the word-description element if it exists
    const wordDescriptionElementToRemove = document.getElementById('word-description');
    if (wordDescriptionElementToRemove && wordDescriptionElementToRemove.parentNode) {
        wordDescriptionElementToRemove.parentNode.removeChild(wordDescriptionElementToRemove);
        console.log("[gamePlayInterface.displayWordChallenge] Removed #word-description element.");
        wordDescriptionDiv = null; // Clear the cached variable for it
    } else {
        // If it was already removed or never existed, wordDescriptionDiv might be null or the element not found
        // console.log("[gamePlayInterface.displayWordChallenge] #word-description element not found or already removed.");
    }
    
    if (!wordDescriptionDiv) { 
        // If it was removed, try to get it again - though it shouldn't be used if removed.
        // This line was previously here, but if we remove the element, this cache will be invalid.
        // wordDescriptionDiv = document.getElementById('word-description'); 
        // Let's ensure it's not used later if removed.
    }

    if (!feedbackDiv) feedbackDiv = document.getElementById('feedback');

    gameInterfaceDiv.style.display = 'block';
    wordDisplayDiv.innerHTML = ''; // Clear previous content
    if(feedbackDiv) feedbackDiv.innerHTML = ''; // Clear previous feedback

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

        // Activate focus lock
        isGamePlayActiveForFocus = true;
        if (!boundHandleDocumentClickForFocus) {
            boundHandleDocumentClickForFocus = handleDocumentClickForFocus.bind(this);
        }
        document.removeEventListener('click', boundHandleDocumentClickForFocus, true);
        document.addEventListener('click', boundHandleDocumentClickForFocus, true);
        console.log("[gamePlayInterface.displayWordChallenge] Focus lock ACTIVATED.");

    } else {
        wordDisplayDiv.textContent = 'Error: Word data is incomplete or missing displayableWordParts.';
        console.error("[gamePlayInterface.displayWordChallenge] Incomplete currentWordData:", currentWordData);
    }

    progressDiv.textContent = currentWordData.progressText || '';
    
    // Conditional usage of wordDescriptionDiv
    if (wordDescriptionDiv) { // Check if it still exists (it shouldn't if we removed it)
        wordDescriptionDiv.innerHTML = currentWordData.hintText || (currentWordData.description || '');
    } else {
        console.log("[gamePlayInterface.displayWordChallenge] wordDescriptionDiv is null, not setting hint/description.");
    }

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

    if (event.key === 'Enter') {
        event.preventDefault(); 
        if (waitingForContinue) { 
            // Deactivate focus lock before moving to next word/results
            deactivateGamePlayFocusLock(); 
            isProcessing = true; 
            waitingForContinue = false;
            document.removeEventListener('keydown', handleDocumentKeydown);
            if (requestNextWordFn) {
                requestNextWordFn();
            } else {
                console.error("[gamePlayInterface.handleInputKeydown] requestNextWordFn is null!");
            }
        } else {
            checkAnswerInternal();
        }
    } else if (event.key === 'Backspace') {
        const currentInput = event.target;
        if (currentInput.value === '') { // If the current input field is empty
            const prevEditableIndex = findPreviousEditableInputIndex(index);
            if (prevEditableIndex !== -1) {
                event.preventDefault(); // Prevent default browser action (e.g., page back)
                const prevInputToClear = inputElements[prevEditableIndex];
                focusInputElement(prevEditableIndex); // Move focus to the previous editable input
                prevInputToClear.value = '';         // Clear the character in that input
            }
            // If no previous editable input, do nothing further (e.g., at the start).
        } else {
            // If the current input field has a character, let the default Backspace behavior clear it.
            // No event.preventDefault() here, so the character in the current field gets deleted.
            // The cursor will remain in the current field, now empty.
            // A subsequent Backspace will then trigger the (currentInput.value === '') block above.
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

function handleDocumentKeydown(event) {
    if (event.target.nodeName === 'INPUT') return;

    if (event.key === 'Enter' && waitingForContinue) {
        // Deactivate focus lock before moving to next word/results
        deactivateGamePlayFocusLock();
        isProcessing = true;
        waitingForContinue = false;
        document.removeEventListener('keydown', handleDocumentKeydown);
        if (requestNextWordFn) {
            requestNextWordFn();
        } else {
            console.error("[gamePlayInterface.handleDocumentKeydown] requestNextWordFn is null!");
        }
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
        const userChar = userAttemptString[i] || ''; 

        if (!input.classList.contains('hint-letter')) {
            input.value = expectedCharOriginal; 
            input.readOnly = true; 
            input.classList.remove('input-incorrect'); 
            if (expectedCharOriginal.toLowerCase() !== userChar.toLowerCase()) {
                input.classList.add('input-incorrect');
                allCorrect = false;
            }
        } else {
            input.value = expectedCharOriginal; 
        }
    }
    // Log active element after inputs are made read-only
    console.log("[gamePlayInterface.applyFeedbackToInputs] Active element after setting inputs readOnly:", document.activeElement);
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
        const firstEditable = inputElements.find(input => !input.readOnly);
        if (firstEditable) focusInputElement(inputElements.indexOf(firstEditable));
        else if (inputElements.length > 0) focusInputElement(0);
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
        feedbackHTML = `<div class="correct-feedback"><span class="correct" style="font-size: 1.5em;">✅ Perfect!</span><br><div style="margin-top: 10px; font-size: 1.1em; color: #90EE90;">Completed in ${answerProcessingResult.feedbackTime.toFixed(1)}s</div></div>`;
    } else if (answerProcessingResult.resultStatus === 'timeout') { 
        feedbackHTML = `<div class="correct-feedback"><span class="correct" style="font-size: 1.5em;">✅ Correct (but a bit slow)</span><br><div style="margin-top: 10px; font-size: 1.1em; color: #FFD700;">Completed in ${answerProcessingResult.feedbackTime.toFixed(1)}s. Try to be faster!</div></div>`;
    } else { 
        feedbackHTML = `<div class="incorrect-feedback"><span class="incorrect" style="font-size: 1.5em;">❌ Incorrect.</span><br><div class="feedback-details" style="margin-top: 10px; font-size: 1.1em; color: #FF6B6B;">Press Enter to continue.${timerInfoHTML}</div></div>`;
    }
    
    if(feedbackDiv) feedbackDiv.innerHTML = feedbackHTML;

    console.log("[gamePlayInterface.checkAnswerInternal] Before setting waitingForContinue:", waitingForContinue);
    waitingForContinue = true; 
    console.log("[gamePlayInterface.checkAnswerInternal] After setting waitingForContinue:", waitingForContinue);
    
    document.removeEventListener('keydown', handleDocumentKeydown); // Remove any old one first
    document.addEventListener('keydown', handleDocumentKeydown);
    console.log("[gamePlayInterface.checkAnswerInternal] Added document event listener for handleDocumentKeydown.");
}


export function clearGamePlayUI() {
    // Deactivate focus lock when clearing UI
    deactivateGamePlayFocusLock();

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
    // Re-enable the original logic
    isGamePlayActiveForFocus = false;
    if (boundHandleDocumentClickForFocus) {
        document.removeEventListener('click', boundHandleDocumentClickForFocus, true);
        console.log("[gamePlayInterface.js] Focus lock event listener REMOVED via deactivate.");
    }
}

export function initializeGamePlayInterface(callbacks) {
    processAnswerFn = callbacks.processAnswer;
    requestNextWordFn = callbacks.requestNextWordOrEndGameDisplay;
    getTimerContextFn = callbacks.getTimerEvaluationContext;
    stopWordTimerFn = callbacks.stopWordTimer;
    startWordTimerFn = callbacks.startWordTimer;
    repeatWordFn = callbacks.repeatWord;
    // getGameManagerCurrentWordFn = callbacks.getGameManagerCurrentWord;

    console.log("[gamePlayInterface.js] Initialized with callbacks. requestNextWordFn type:", typeof requestNextWordFn, "getTimerContextFn type:", typeof getTimerContextFn);
    
    // Attempt to remove word-description on initialization as well, if it exists then.
    // This handles cases where displayWordChallenge might not be the first point of interaction.
    const descriptionElement = document.getElementById('word-description');
    if (descriptionElement && descriptionElement.parentNode) {
        descriptionElement.parentNode.removeChild(descriptionElement);
        console.log("[gamePlayInterface.initializeGamePlayInterface] Removed #word-description element during init.");
        wordDescriptionDiv = null; // Ensure cache is cleared
    }
}

// Function to reset cached DOM elements for testing purposes
function resetUIStateForTesting() {
    gameInterfaceDiv = null;
    wordDisplayDiv = null;
    progressDiv = null;
    // wordDescriptionDiv = null; // This will be nulled if removed, or if it's not found.
                                // Explicitly nulling here ensures it's reset for tests.
    if (document.getElementById('word-description')) {
        // If test re-adds it, this will get it. Otherwise, it remains null if removed.
        // This is tricky as the element is actively removed.
        // For tests, it might be better to ensure the element *is* present before a test that needs it.
        // For now, if we always remove it, tests shouldn't expect it.
    }
    feedbackDiv = null;
    inputElements = [];
    currentFocusedInputIndex = -1;
    console.log("[gamePlayInterface.js] Resetting UI state for testing.");
}

// Remove obsolete/renamed functions from export if they are not used elsewhere
// export { displayWordChallenge, setActiveLetterBox, handleGlobalKeydown, createWordComparisonUI };
export { displayWordChallenge, resetUIStateForTesting }; // Main export 