// js/ui/gamePlayInterface.js

// Module-specific state for the game play interface
let waitingForContinue = false;
let isProcessing = false;
let isGamePlayActiveForFocus = false; // Re-enabled
let boundHandleDocumentClickForFocus = null; // Re-enabled

// Mobile focus management state
let isMobileDevice = false;
let initialViewportHeight = 0;
let currentViewportHeight = 0;
let keyboardVisible = false;
let focusHelperButton = null;
let lastFocusedInput = null;
let refocusTimeout = null;

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

// Initialize mobile detection and viewport monitoring
function initializeMobileSupport() {
    // Detect mobile device
    isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    ('ontouchstart' in window) ||
                    (window.innerWidth <= 768);
    
    if (isMobileDevice) {
        console.log("[gamePlayInterface] Mobile device detected, enabling enhanced focus management");
        
        // Store initial viewport height
        initialViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        currentViewportHeight = initialViewportHeight;
        
        // Monitor viewport changes for keyboard detection
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
        } else {
            window.addEventListener('resize', handleViewportChange);
        }
        
        // Create focus helper button
        createFocusHelperButton();
        
        // Add touch-specific event listeners
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
}

// Handle viewport changes to detect keyboard show/hide
function handleViewportChange() {
    if (!isMobileDevice || !isGamePlayActiveForFocus) return;
    
    const newHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const heightDifference = initialViewportHeight - newHeight;
    const wasKeyboardVisible = keyboardVisible;
    
    // Keyboard is considered visible if viewport height decreased significantly
    keyboardVisible = heightDifference > 150;
    
    if (wasKeyboardVisible && !keyboardVisible) {
        // Keyboard was hidden
        console.log("[gamePlayInterface] Mobile keyboard hidden, showing focus helper");
        showFocusHelper();
        
        // Attempt to refocus after a short delay
        if (refocusTimeout) clearTimeout(refocusTimeout);
        refocusTimeout = setTimeout(() => {
            refocusLastActiveInput();
        }, 300);
    } else if (!wasKeyboardVisible && keyboardVisible) {
        // Keyboard was shown
        console.log("[gamePlayInterface] Mobile keyboard shown, hiding focus helper");
        hideFocusHelper();
    }
    
    currentViewportHeight = newHeight;
}

// Create floating focus helper button
function createFocusHelperButton() {
    if (focusHelperButton) return;
    
    focusHelperButton = document.createElement('button');
    focusHelperButton.id = 'mobile-focus-helper';
    focusHelperButton.innerHTML = '⌨️ Tap to continue typing';
    focusHelperButton.className = 'mobile-focus-helper';
    focusHelperButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 25px;
        padding: 12px 24px;
        font-size: 16px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        display: none;
        cursor: pointer;
        animation: pulse 2s infinite;
    `;
    
    // Add CSS animation
    if (!document.getElementById('mobile-focus-styles')) {
        const style = document.createElement('style');
        style.id = 'mobile-focus-styles';
        style.textContent = `
            @keyframes pulse {
                0% { transform: translateX(-50%) scale(1); }
                50% { transform: translateX(-50%) scale(1.05); }
                100% { transform: translateX(-50%) scale(1); }
            }
            
            .mobile-focus-helper:active {
                transform: translateX(-50%) scale(0.95) !important;
            }
            
            .inline-input.mobile-focused {
                box-shadow: 0 0 0 3px #4CAF50 !important;
                border-color: #4CAF50 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    focusHelperButton.addEventListener('click', handleFocusHelperClick);
    focusHelperButton.addEventListener('touchend', handleFocusHelperClick);
    
    document.body.appendChild(focusHelperButton);
}

// Handle focus helper button click
function handleFocusHelperClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    hideFocusHelper();
    refocusLastActiveInput();
}

// Show focus helper button
function showFocusHelper() {
    if (focusHelperButton && isGamePlayActiveForFocus) {
        focusHelperButton.style.display = 'block';
    }
}

// Hide focus helper button
function hideFocusHelper() {
    if (focusHelperButton) {
        focusHelperButton.style.display = 'none';
    }
}

// Refocus the last active input or first editable input
function refocusLastActiveInput() {
    if (!isGamePlayActiveForFocus || waitingForContinue || isProcessing) return;
    
    let targetInput = null;
    
    // Try to focus the last focused input if it's still editable
    if (lastFocusedInput && !lastFocusedInput.readOnly && inputElements.includes(lastFocusedInput)) {
        targetInput = lastFocusedInput;
    } else if (currentFocusedInputIndex >= 0 && inputElements[currentFocusedInputIndex] && !inputElements[currentFocusedInputIndex].readOnly) {
        targetInput = inputElements[currentFocusedInputIndex];
    } else {
        // Fallback to first empty editable input
        targetInput = inputElements.find(input => !input.readOnly && !input.value);
        if (!targetInput) {
            // If no empty inputs, focus first editable input
            targetInput = inputElements.find(input => !input.readOnly);
        }
    }
    
    if (targetInput) {
        // Add visual emphasis
        inputElements.forEach(input => input.classList.remove('mobile-focused'));
        targetInput.classList.add('mobile-focused');
        
        // Focus with iOS-specific attributes
        targetInput.setAttribute('inputmode', 'text');
        targetInput.setAttribute('autocomplete', 'off');
        targetInput.focus();
        
        // Force keyboard on iOS
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            targetInput.click();
        }
        
        console.log("[gamePlayInterface] Refocused input element");
    }
}

// Handle touch start events
function handleTouchStart(event) {
    if (!isGamePlayActiveForFocus || waitingForContinue || isProcessing) return;
    
    const target = event.target;
    
    // If touch is on an input element, store it as last focused
    if (inputElements.includes(target)) {
        lastFocusedInput = target;
        return;
    }
    
    // If touch is on focus helper, let it handle
    if (target === focusHelperButton) {
        return;
    }
    
    // If touch is on game interface elements, allow it
    if (target.closest('#game-interface')) {
        return;
    }
}

// Handle touch end events  
function handleTouchEnd(event) {
    if (!isGamePlayActiveForFocus || waitingForContinue || isProcessing) return;
    
    const target = event.target;
    
    // If touch ended outside game interface and not on an input
    if (!target.closest('#game-interface') && !inputElements.includes(target)) {
        // Prevent default behavior that might hide keyboard
        event.preventDefault();
        
        // Schedule refocus after a brief delay
        if (refocusTimeout) clearTimeout(refocusTimeout);
        refocusTimeout = setTimeout(() => {
            if (!keyboardVisible) {
                showFocusHelper();
            } else {
                refocusLastActiveInput();
            }
        }, 100);
    }
}

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

// Enhanced focus management for both desktop and mobile
function handleDocumentClickForFocus(event) {
    if (!isGamePlayActiveForFocus || isProcessing || waitingForContinue) {
        return; // Lock not active or game is processing
    }

    const target = event.target;

    // Check if the click target is an interactive element within the game interface
    if (inputElements.includes(target) || 
        (target.closest && target.closest('#game-interface') && 
         (target.nodeName === 'BUTTON' || target.classList.contains('repeat-button'))
        )) {
        console.log("[gamePlayInterface.handleDocumentClickForFocus] Click on interactive element or input. No refocus.");
        return; 
    }

    // If mobile and keyboard is hidden, show helper instead of immediate refocus
    if (isMobileDevice && !keyboardVisible) {
        console.log("[gamePlayInterface.handleDocumentClickForFocus] Mobile click outside, showing focus helper.");
        showFocusHelper();
        return;
    }

    // Desktop or mobile with keyboard visible - refocus immediately
    console.log("[gamePlayInterface.handleDocumentClickForFocus] Click detected outside inputs. Refocusing.");
    refocusLastActiveInput();
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
        wordGuessArea.style.display = 'flex'; // Ensure flex layout for children
        wordGuessArea.style.alignItems = 'baseline'; // Align children on their baseline
        
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
                // Enhanced mobile attributes
                if (isMobileDevice) {
                    input.setAttribute('inputmode', 'text');
                    input.setAttribute('autocapitalize', 'none');
                    input.setAttribute('enterkeyhint', 'next');
                }
                
                // Add event listeners only for active input fields
                input.addEventListener('keydown', handleInputKeydown);
                input.addEventListener('input', handleInputChange);
                input.addEventListener('focus', (e) => {
                    currentFocusedInputIndex = parseInt(e.target.dataset.index);
                    lastFocusedInput = e.target;
                    
                    // Remove mobile focus styling from other inputs
                    if (isMobileDevice) {
                        inputElements.forEach(inp => inp.classList.remove('mobile-focused'));
                        e.target.classList.add('mobile-focused');
                        hideFocusHelper();
                    }
                });
                
                input.addEventListener('blur', (e) => {
                    // On mobile, detect if blur was caused by keyboard hiding
                    if (isMobileDevice) {
                        setTimeout(() => {
                            if (!keyboardVisible && isGamePlayActiveForFocus) {
                                showFocusHelper();
                            }
                        }, 100);
                    }
                });
            }
            
            wordGuessArea.appendChild(input);
            inputElements.push(input); // Still keep all inputs for reference, e.g. for checkAnswerInternal
        });
        wordDisplayDiv.appendChild(wordGuessArea);

        // 3. Display sentence suffix
        if (currentWordData.sentenceSuffix === '.') {
            const periodSpan = document.createElement('span');
            periodSpan.textContent = '.';
            // Font size should be inherited. Baseline alignment is handled by parent.
            wordGuessArea.appendChild(periodSpan); 
        } else if (currentWordData.sentenceSuffix && currentWordData.sentenceSuffix.length > 0) {
            // If suffix is not just a period, or is more than a period, create the standard suffix div
            const suffixDiv = document.createElement('div');
            suffixDiv.textContent = currentWordData.sentenceSuffix;
            suffixDiv.className = 'sentence-suffix sentence-segment'; 
            wordDisplayDiv.appendChild(suffixDiv);
        }
        
        // Set initial focus on the first *editable* input element
        const firstEditableInput = inputElements.find(input => !input.readOnly);
        if (firstEditableInput) {
            // Enhanced mobile input setup
            if (isMobileDevice) {
                firstEditableInput.setAttribute('inputmode', 'text');
                firstEditableInput.setAttribute('enterkeyhint', 'next');
            }
            firstEditableInput.focus();
            currentFocusedInputIndex = parseInt(firstEditableInput.dataset.index);
            lastFocusedInput = firstEditableInput;
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
        
        // Hide focus helper when new word starts
        if (isMobileDevice) {
            hideFocusHelper();
        }
        
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

    if (startWordTimerFn && currentWordData && currentWordData.word && currentWordData.displayableWordParts) {
        const missingLetterCount = currentWordData.displayableWordParts.filter(part => part.isHidden).length;
        startWordTimerFn(missingLetterCount > 0 ? missingLetterCount : 1); // Ensure at least 1 if no letters are hidden but timer is on
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

// Helper function to show warning for incomplete input submission
let fillInputsWarningTimeout = null;
let shakeTimeout = null;

function showFillAllInputsWarning() {
    if (!feedbackDiv) feedbackDiv = document.getElementById('feedback');
    const wordGuessContainer = document.querySelector('.word-guess-area');

    if (feedbackDiv) {
        feedbackDiv.innerHTML = '<span class="warning-feedback">Please fill all missing letters before pressing Enter.</span>';
        // Clear previous timeout if any
        if (fillInputsWarningTimeout) clearTimeout(fillInputsWarningTimeout);
        fillInputsWarningTimeout = setTimeout(() => {
            if (feedbackDiv && feedbackDiv.innerHTML.includes('Please fill all missing letters')) {
                feedbackDiv.innerHTML = '';
            }
        }, 3000);
    }

    if (wordGuessContainer) {
        wordGuessContainer.classList.add('shake');
        // Clear previous timeout if any
        if (shakeTimeout) clearTimeout(shakeTimeout);
        shakeTimeout = setTimeout(() => {
            wordGuessContainer.classList.remove('shake');
        }, 500); // Match CSS animation duration
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
            // Check if all editable inputs are filled
            const allEditableFilled = inputElements.every(input => input.readOnly || input.value.trim() !== '');
            if (!allEditableFilled) {
                showFillAllInputsWarning();
                return; // Stop further processing
            }
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

    const missingLetterCount = inputElements.filter(input => !input.readOnly).length;

    if (!processAnswerFn) {
        console.error("[gamePlayInterface.checkAnswerInternal] processAnswerFn is not initialized!");
        isProcessing = false;
        return;
    }

    const answerProcessingResult = processAnswerFn(userAnswer, finalTimeElapsed);
    
    applyFeedbackToInputs(userAnswer, answerProcessingResult.correctAnswer);
    
    let feedbackHTML = '';
    let timerInfoHTML = '';
    const timerEvalContext = getTimerContextFn ? getTimerContextFn() : { currentWordTimeoutThreshold: 0, timeoutPerLetter: 0 };

    if (answerProcessingResult.resultStatus !== 'success' && answerProcessingResult.resultStatus !== 'timeout' && timerEvalContext.currentWordTimeoutThreshold > 0) {
        const timeTaken = answerProcessingResult.feedbackTime.toFixed(1);
        const timeLimit = (timerEvalContext.timeoutPerLetter * (missingLetterCount > 0 ? missingLetterCount : 1)).toFixed(1);
        console.log(`[gamePlayInterface] Time limit calculation: timePerLetter=${timerEvalContext.timeoutPerLetter}s, missing letters=${missingLetterCount}, totalLimit=${timeLimit}s`);
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
    lastFocusedInput = null;
    isProcessing = false;
    waitingForContinue = false;
    
    // Clear mobile-specific resources
    if (isMobileDevice) {
        hideFocusHelper();
        if (refocusTimeout) {
            clearTimeout(refocusTimeout);
            refocusTimeout = null;
        }
    }
    
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
    
    // Clean up mobile-specific resources
    if (isMobileDevice) {
        hideFocusHelper();
        if (refocusTimeout) {
            clearTimeout(refocusTimeout);
            refocusTimeout = null;
        }
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
    
    // Initialize mobile support
    initializeMobileSupport();
    
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