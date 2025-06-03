// js/ui/gamePlayInterface.js

// Module-specific state for the game play interface
let lastFocusedInput = null;
let waitingForContinue = false;
let isProcessing = false;

// References to functions from other modules, to be set during initialization
let processAnswerFn = null;
let requestNextWordFn = null;
let getTimerContextFn = null;
let stopWordTimerFn = null;
let startWordTimerFn = null;
let repeatWordFn = null;
let getGameManagerCurrentWordFn = null; // Let's use this to store the callback

// DOM Elements (cache them if frequently accessed)
let gameInterfaceDiv = null;
let wordDisplayDiv = null;
let progressDiv = null;
let wordDescriptionDiv = null;
let feedbackDiv = null;

// Function to display the word challenge (replaces showNextWordUI from script.js)
function displayWordChallenge(data) {
    console.log("[gamePlayInterface.displayWordChallenge] Called. Resetting flags.");
    isProcessing = false;
    waitingForContinue = false;

    if (!gameInterfaceDiv) gameInterfaceDiv = document.getElementById('game-interface');
    if (!wordDisplayDiv) wordDisplayDiv = document.getElementById('word-display');
    if (!progressDiv) progressDiv = document.getElementById('progress');
    if (!wordDescriptionDiv) wordDescriptionDiv = document.getElementById('word-description');
    if (!feedbackDiv) feedbackDiv = document.getElementById('feedback');

    gameInterfaceDiv.style.display = 'block';
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

    progressDiv.textContent = data.progressText;
    wordDescriptionDiv.innerHTML = data.hintText;
    if(feedbackDiv) feedbackDiv.textContent = ''; 

    lastFocusedInput = null;

    if (startWordTimerFn) {
        startWordTimerFn(data.missingLetterCount);
    }

    const firstInput = wordDisplayDiv.querySelector('.inline-input');
    if (firstInput) {
        firstInput.focus();
        lastFocusedInput = firstInput;
    }
}

function handleInputFocus(event) {
    lastFocusedInput = event.target;
}

function handleInlineInput(event) {
    const input = event.target;
    const value = input.value.toLowerCase();
    if (value) {
        const allInputs = Array.from(wordDisplayDiv.querySelectorAll('.inline-input'));
        const currentIndex = allInputs.indexOf(input);
        if (currentIndex < allInputs.length - 1) {
            allInputs[currentIndex + 1].focus();
        }
    }
}

function handleInlineKeydown(event) {
    const input = event.target;
    console.log(`[gamePlayInterface.handleInlineKeydown] Key: ${event.key}, isProcessing: ${isProcessing}, waitingForContinue: ${waitingForContinue}`);

    if (event.key === 'Enter') {
        if (isProcessing) {
            console.log("[gamePlayInterface.handleInlineKeydown] Enter pressed, but blocked by isProcessing=true.");
            return;
        }

        if (waitingForContinue) {
            console.log("[gamePlayInterface.handleInlineKeydown] Enter to continue. Setting isProcessing=true, waitingForContinue=false.");
            isProcessing = true;
            waitingForContinue = false;
            if (requestNextWordFn) {
                requestNextWordFn();
            }
        } else {
            console.log("[gamePlayInterface.handleInlineKeydown] Enter to check answer.");
            checkAnswerInternal(); 
        }
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        if (repeatWordFn) {
            repeatWordFn(); 
        }
    } else if (event.key === 'Backspace' && !input.value && !waitingForContinue) {
        const allInputs = Array.from(wordDisplayDiv.querySelectorAll('.inline-input'));
        const currentIndex = allInputs.indexOf(input);
        if (currentIndex > 0) {
            allInputs[currentIndex - 1].focus();
        }
    }
}

// Moved from script.js
function createWordComparisonUI(userAnswers, expectedWord) {
    let userAttempt = '';
    const wordDisplayChildren = wordDisplayDiv.children; // Use cached wordDisplayDiv
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

// Moved from script.js (and renamed from checkAnswer)
function checkAnswerInternal() {
    if (waitingForContinue || isProcessing) {
        console.log(`[gamePlayInterface.checkAnswerInternal] Blocked. waitingForContinue: ${waitingForContinue}, isProcessing: ${isProcessing}`);
        return;
    }
    console.log("[gamePlayInterface.checkAnswerInternal] Starting. Setting isProcessing=true.");
    isProcessing = true; 

    const finalTimeElapsed = stopWordTimerFn ? stopWordTimerFn() : 0;
    const allInputs = Array.from(wordDisplayDiv.querySelectorAll('.inline-input'));
    const userAnswers = Array.from(allInputs).map(input => input.value.trim());
    // feedbackDiv is already cached

    if (userAnswers.some(answer => answer === '')) {
        if(feedbackDiv) feedbackDiv.innerHTML = '<span class="incorrect">Please fill in all the missing letters!</span>';
        console.log("[gamePlayInterface.checkAnswerInternal] Empty input. Resetting isProcessing=false.");
        isProcessing = false; 
        return;
    }

    if (!processAnswerFn) {
        console.error("[gamePlayInterface.checkAnswerInternal] processAnswerFn is not initialized!");
        isProcessing = false;
        return;
    }
    const answerProcessingResult = processAnswerFn(userAnswers, finalTimeElapsed);
    
    let feedbackHTML = '';
    const timerEvalContext = getTimerContextFn ? getTimerContextFn() : { currentWordTimeoutThreshold: 0 }; 

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
    } else { 
        const comparison = createWordComparisonUI(userAnswers, answerProcessingResult.correctWord);
        feedbackHTML = `
            <span class="incorrect" style="font-size: 1.5em;">❌ Incorrect!</span><br>`;
        if (answerProcessingResult.resultStatus === 'timeout_incorrect') {
            feedbackHTML += `<span style="color: #FFD700; font-size: 1.1em;">⚠️ And took too long</span><br>
                             <div style="margin-top: 10px; font-size: 1.1em; color: #FFB6C1;">
                                Time: ${answerProcessingResult.feedbackTime.toFixed(1)}s (limit: ${timerEvalContext.currentWordTimeoutThreshold}s)
                             </div>`;
        } else { 
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
    if(feedbackDiv) feedbackDiv.innerHTML = feedbackHTML;
    if(feedbackDiv) feedbackDiv.className = `feedback ${answerProcessingResult.isCorrect && (answerProcessingResult.resultStatus === 'success' || answerProcessingResult.resultStatus === 'timeout') ? 'correct' : 'incorrect'}`;

    console.log("[gamePlayInterface.checkAnswerInternal] Feedback displayed. Setting waitingForContinue=true.");
    waitingForContinue = true; 

    if (answerProcessingResult.showFinalResults) {
        console.log("[gamePlayInterface.checkAnswerInternal] Game will show final results.");
    } else if (answerProcessingResult.canContinue) {
        console.log("[gamePlayInterface.checkAnswerInternal] Game can continue.");
    } else {
        console.error("[gamePlayInterface.checkAnswerInternal] Game logic error: Cannot continue, but not showing final results.");
    }

    if (allInputs.length > 0 && !answerProcessingResult.showFinalResults) {
         const firstInput = wordDisplayDiv.querySelector('.inline-input'); // Re-query in case DOM changed
         if (firstInput) firstInput.focus(); 
    } 
    
    console.log("[gamePlayInterface.checkAnswerInternal] Ending. Resetting isProcessing=false.");
    isProcessing = false; 
}


export function initializeGamePlayInterface(callbacks) {
    console.log("[gamePlayInterface.initialize] Initializing with callbacks:", callbacks);
    processAnswerFn = callbacks.processAnswer;
    requestNextWordFn = callbacks.requestNextWordOrEndGameDisplay;
    getTimerContextFn = callbacks.getTimerEvaluationContext;
    stopWordTimerFn = callbacks.stopWordTimer;
    startWordTimerFn = callbacks.startWordTimer;
    getGameManagerCurrentWordFn = callbacks.getCurrentWord; // Store this callback
    
    if (typeof window.playWordAudio === 'function' && typeof getGameManagerCurrentWordFn === 'function') {
        repeatWordFn = () => {
            const currentWordObj = getGameManagerCurrentWordFn();
            if (currentWordObj && currentWordObj.word) {
                window.playWordAudio(currentWordObj.word);
            } else {
                console.warn("[gamePlayInterface] repeatWordFn: Could not get current word to play.");
            }
        };
    } else {
        console.warn("[gamePlayInterface.initialize] window.playWordAudio or getCurrentWord callback is not available. Repeat function not set up.");
        repeatWordFn = () => console.log("Repeat word function not properly set up.");
    }

    gameInterfaceDiv = document.getElementById('game-interface');
    wordDisplayDiv = document.getElementById('word-display');
    progressDiv = document.getElementById('progress');
    wordDescriptionDiv = document.getElementById('word-description');
    feedbackDiv = document.getElementById('feedback');
}

export { displayWordChallenge }; 