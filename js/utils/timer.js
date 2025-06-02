// Timer utility for game timing functionality

import { GAME_CONFIG, CSS_CLASSES, ELEMENTS } from '../app/config.js';
import { getElementById, setText, addClass, removeClass, formatTime } from './helpers.js';

/**
 * Timer class for managing game timing
 */
export class Timer {
    constructor() {
        this.startTime = null;
        this.endTime = null;
        this.isRunning = false;
        this.intervalId = null;
        this.timeoutThreshold = 0;
        this.showTimer = false;
        this.onTimeoutCallback = null;
        this.onUpdateCallback = null;
    }

    /**
     * Start the timer
     * @param {number} timeoutThreshold - Timeout threshold in seconds (0 = no timeout)
     * @param {boolean} showTimer - Whether to show timer display
     * @param {Function} onTimeoutCallback - Callback when timeout occurs
     * @param {Function} onUpdateCallback - Callback on timer update
     */
    start(timeoutThreshold = 0, showTimer = false, onTimeoutCallback = null, onUpdateCallback = null) {
        this.reset();
        this.startTime = Date.now();
        this.isRunning = true;
        this.timeoutThreshold = timeoutThreshold;
        this.showTimer = showTimer;
        this.onTimeoutCallback = onTimeoutCallback;
        this.onUpdateCallback = onUpdateCallback;

        if (this.showTimer) {
            this.showTimerDisplay();
            this.startUpdateInterval();
        }
    }

    /**
     * Stop the timer
     * @returns {number} - Elapsed time in seconds
     */
    stop() {
        if (!this.isRunning) {
            return 0;
        }

        this.endTime = Date.now();
        this.isRunning = false;
        this.clearUpdateInterval();
        this.hideTimerDisplay();

        return this.getElapsedTime();
    }

    /**
     * Reset the timer
     */
    reset() {
        this.startTime = null;
        this.endTime = null;
        this.isRunning = false;
        this.clearUpdateInterval();
        this.hideTimerDisplay();
    }

    /**
     * Get elapsed time in seconds
     * @returns {number} - Elapsed time in seconds
     */
    getElapsedTime() {
        if (!this.startTime) {
            return 0;
        }

        const endTime = this.endTime || Date.now();
        return Math.floor((endTime - this.startTime) / 1000);
    }

    /**
     * Check if timer has exceeded timeout threshold
     * @returns {boolean} - True if timeout exceeded
     */
    isTimeout() {
        if (this.timeoutThreshold <= 0) {
            return false;
        }

        return this.getElapsedTime() >= this.timeoutThreshold;
    }

    /**
     * Get remaining time until timeout
     * @returns {number} - Remaining time in seconds (0 if no timeout or exceeded)
     */
    getRemainingTime() {
        if (this.timeoutThreshold <= 0) {
            return Infinity;
        }

        const remaining = this.timeoutThreshold - this.getElapsedTime();
        return Math.max(0, remaining);
    }

    /**
     * Start the update interval for timer display
     */
    startUpdateInterval() {
        this.clearUpdateInterval();
        this.intervalId = setInterval(() => {
            this.updateTimerDisplay();
            
            // Check for timeout
            if (this.isTimeout() && this.onTimeoutCallback) {
                this.onTimeoutCallback();
            }

            // Call update callback
            if (this.onUpdateCallback) {
                this.onUpdateCallback(this.getElapsedTime());
            }
        }, GAME_CONFIG.TIMER_UPDATE_INTERVAL);
    }

    /**
     * Clear the update interval
     */
    clearUpdateInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Show timer display element
     */
    showTimerDisplay() {
        const timerElement = getElementById(ELEMENTS.SIMPLE_TIMER);
        if (timerElement) {
            timerElement.style.display = 'block';
            this.updateTimerDisplay();
        }
    }

    /**
     * Hide timer display element
     */
    hideTimerDisplay() {
        const timerElement = getElementById(ELEMENTS.SIMPLE_TIMER);
        if (timerElement) {
            timerElement.style.display = 'none';
        }
    }

    /**
     * Update timer display with current time
     */
    updateTimerDisplay() {
        const timerElement = getElementById(ELEMENTS.SIMPLE_TIMER);
        if (!timerElement) {
            return;
        }

        const elapsed = this.getElapsedTime();
        const remaining = this.getRemainingTime();

        // Update timer class based on remaining time
        this.updateTimerClass(timerElement, remaining);

        // Update timer text
        if (this.timeoutThreshold > 0) {
            setText(timerElement, `Time: ${formatTime(elapsed)} / ${formatTime(this.timeoutThreshold)}`);
        } else {
            setText(timerElement, `Time: ${formatTime(elapsed)}`);
        }
    }

    /**
     * Update timer CSS class based on remaining time
     * @param {HTMLElement} timerElement - Timer display element
     * @param {number} remaining - Remaining time in seconds
     */
    updateTimerClass(timerElement, remaining) {
        // Remove all timer classes
        removeClass(timerElement, CSS_CLASSES.TIMER_NORMAL);
        removeClass(timerElement, CSS_CLASSES.TIMER_WARNING);
        removeClass(timerElement, CSS_CLASSES.TIMER_CRITICAL);

        if (this.timeoutThreshold <= 0) {
            addClass(timerElement, CSS_CLASSES.TIMER_NORMAL);
            return;
        }

        // Add appropriate class based on remaining time
        const percentage = remaining / this.timeoutThreshold;
        
        if (percentage > 0.5) {
            addClass(timerElement, CSS_CLASSES.TIMER_NORMAL);
        } else if (percentage > 0.2) {
            addClass(timerElement, CSS_CLASSES.TIMER_WARNING);
        } else {
            addClass(timerElement, CSS_CLASSES.TIMER_CRITICAL);
        }
    }

    /**
     * Calculate timeout threshold based on word length and timeout per letter
     * @param {string} word - Word to calculate timeout for
     * @param {number} timeoutPerLetter - Timeout per letter in seconds
     * @param {number} missingLetterCount - Number of missing letters
     * @returns {number} - Timeout threshold in seconds
     */
    static calculateTimeout(word, timeoutPerLetter, missingLetterCount) {
        if (timeoutPerLetter <= 0) {
            return 0; // No timeout
        }

        // Use missing letter count if provided, otherwise use word length
        const letterCount = missingLetterCount > 0 ? missingLetterCount : word.length;
        return Math.max(1, letterCount * timeoutPerLetter);
    }

    /**
     * Format elapsed time for display
     * @param {number} seconds - Time in seconds
     * @returns {string} - Formatted time string
     */
    static formatElapsedTime(seconds) {
        return formatTime(seconds);
    }
}

/**
 * Global timer instance for the game
 */
export const gameTimer = new Timer();
