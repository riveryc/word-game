import { validateTimeoutInput } from '../utils/validation.js';

// Timer system management

// Internal state for the timer manager
let timeoutPerLetter = 5; // Default 5 seconds per missing letter
let hasTimeLimit = true;
let showTimerDisplay = false;
let currentWordStartTime = null;
let currentWordTimer = null;
let timeElapsed = 0; // Current elapsed time in seconds
let currentWordTimeoutThreshold = 0; // Calculated timeout for current word

// DOM Elements (cache them if they are frequently accessed)
let timeoutInputElement = null;
let timeoutStatusDiv = null;
let showTimerCheckboxElement = null;
let simpleTimerDiv = null;

// Function to initialize the timer manager and cache DOM elements
export function initializeTimerManager() {
    timeoutInputElement = document.getElementById('timeout-input');
    timeoutStatusDiv = document.getElementById('timeout-status');
    showTimerCheckboxElement = document.getElementById('show-timer-checkbox');
    simpleTimerDiv = document.getElementById('simple-timer');

    if (timeoutInputElement) {
        // Add event listeners for real-time validation
        timeoutInputElement.addEventListener('input', updateTimeoutThreshold);
        timeoutInputElement.addEventListener('blur', updateTimeoutThreshold);
        timeoutInputElement.addEventListener('change', updateTimeoutThreshold);
    }

    if (showTimerCheckboxElement) {
        showTimerCheckboxElement.addEventListener('change', function() {
            showTimerDisplay = this.checked;
            if (simpleTimerDiv) {
                simpleTimerDiv.style.display = showTimerDisplay && currentWordTimer ? 'block' : 'none';
            }
        });
        // Initialize showTimerDisplay state from checkbox
        showTimerDisplay = showTimerCheckboxElement.checked;
    }

    // Initialize with default/current value
    updateTimeoutThreshold();
}


export function updateTimeoutThreshold() {
    if (!timeoutInputElement) {
        console.warn("TimerManager: Timeout input element not found. Using defaults.");
        timeoutPerLetter = 5; // Default timeout per letter
        hasTimeLimit = timeoutPerLetter > 0;
        updateTimeoutStatusDisplay();
        return { value: timeoutPerLetter, isValid: true }; // Return validated state
    }

    const currentInputValue = timeoutInputElement.value;
    // Assuming validateTimeoutInput is globally available or imported if needed.
    // For now, let's assume it's a utility that doesn't need to be part of this manager.
    // If it's defined in script.js and not imported, this will be an issue.
    // We will need to import it from js/utils/validation.js
    // For now, let's replicate a simple validation or expect it to be available globally.
    // const validationResult = validateTimeoutInput(currentInputValue);
    
    let numericValue = parseInt(currentInputValue, 10);
    let isValid = !isNaN(numericValue) && numericValue >= 0;

    if (!isValid) {
        numericValue = 0; // Default to 0 if invalid (no time limit)
        timeoutInputElement.value = numericValue.toString();
    } else {
        // Ensure the input field reflects the potentially clamped value if rules existed
        // For now, just ensure it's the parsed number.
        timeoutInputElement.value = numericValue.toString();
    }
    
    timeoutPerLetter = numericValue;
    hasTimeLimit = isValid && numericValue > 0;

    updateTimeoutStatusDisplay();
    return { value: timeoutPerLetter, isValid: hasTimeLimit };
}

export function updateTimeoutStatusDisplay() {
    if (!timeoutStatusDiv) return;

    if (hasTimeLimit) {
        timeoutStatusDiv.className = 'timeout-status with-limit';
        timeoutStatusDiv.innerHTML = `✅ Time limit: ${timeoutPerLetter} seconds per missing letter`;
    } else {
        timeoutStatusDiv.className = 'timeout-status no-limit';
        timeoutStatusDiv.innerHTML = `⚡ No time limit - Practice mode`;
    }
}

// Renamed from setupTimeoutInput to reflect its initialization role for the manager
// The actual setup is now part of initializeTimerManager
// export function setupTimeoutInput() { // Original name
//    initializeTimerManager(); // Call the new initializer
// }


export function startWordTimer(missingLetterCount) {
    stopWordTimer(); // Clear any existing timer

    currentWordStartTime = Date.now();
    timeElapsed = 0;

    // Calculate timeout threshold for this word
    currentWordTimeoutThreshold = hasTimeLimit ? (missingLetterCount * timeoutPerLetter) : 0;

    if (simpleTimerDiv) {
        simpleTimerDiv.style.display = showTimerDisplay ? 'block' : 'none';
    }

    currentWordTimer = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay(); // Initial display
}

export function stopWordTimer() {
    if (currentWordTimer) {
        clearInterval(currentWordTimer);
        currentWordTimer = null;
    }

    if (simpleTimerDiv) {
        simpleTimerDiv.style.display = 'none';
    }

    if (currentWordStartTime) {
        timeElapsed = (Date.now() - currentWordStartTime) / 1000;
    }
    return timeElapsed;
}

export function updateTimerDisplay() {
    if (currentWordStartTime) {
        timeElapsed = (Date.now() - currentWordStartTime) / 1000;
    }

    if (showTimerDisplay && simpleTimerDiv) {
        const elapsedSeconds = Math.floor(timeElapsed);
        simpleTimerDiv.textContent = `⏱️ ${elapsedSeconds}s`;
    }
}

// This function is called by checkAnswer in script.js
// It needs access to hasTimeLimit and currentWordTimeoutThreshold from this module
export function getTimerEvaluationContext() {
    return {
        hasTimeLimit: hasTimeLimit,
        currentWordTimeoutThreshold: currentWordTimeoutThreshold,
        timeoutPerLetter: timeoutPerLetter
    };
}

// Getter for hasTimeLimit, potentially useful for other modules
export function getHasTimeLimit() {
    return hasTimeLimit;
}

// Getter for timeoutPerLetter, potentially useful
export function getTimeoutPerLetter() {
    return timeoutPerLetter;
}

// Getter for currentWordTimeoutThreshold, needed by game logic
export function getCurrentWordTimeoutThreshold() {
    return currentWordTimeoutThreshold;
} 