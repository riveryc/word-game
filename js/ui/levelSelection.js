// Level selection interface

import { GAME_CONFIG, ELEMENTS, CSS_CLASSES, TTS_METHODS } from '../app/config.js';
import { getElementById, addClass, removeClass, setValue, getValue } from '../utils/helpers.js';
import { validateTimeoutInput, validateWordCountInput } from '../utils/validation.js';

/**
 * Level selection manager class
 */
export class LevelSelectionManager {
    constructor() {
        this.selectedLevel = GAME_CONFIG.DEFAULT_LEVEL;
        this.timeoutPerLetter = GAME_CONFIG.DEFAULT_TIMEOUT_PER_LETTER;
        this.showTimer = false;
        this.selectedTTSMethod = TTS_METHODS.GOOGLE;
        this.wordCount = GAME_CONFIG.DEFAULT_WORD_COUNT;
        this.totalAvailableWords = 0;
        this.onSettingsChangeCallback = null;
        this.init();
    }

    /**
     * Initialize level selection manager
     */
    init() {
        this.setupEventListeners();
        this.updateTimeoutStatus();
    }

    /**
     * Set up event listeners for level selection controls
     */
    setupEventListeners() {
        this.setupLevelSelection();
        this.setupTimeoutInput();
        this.setupTimerCheckbox();
        this.setupTTSSelection();
        this.setupWordCountInput();
    }

    /**
     * Set up level selection event listeners
     */
    setupLevelSelection() {
        // Level options are handled by onclick attributes in HTML
        // This method can be used for additional setup if needed
    }

    /**
     * Set up timeout input event listeners
     */
    setupTimeoutInput() {
        const timeoutInput = getElementById(ELEMENTS.TIMEOUT_INPUT);
        if (timeoutInput) {
            timeoutInput.addEventListener('input', () => {
                this.handleTimeoutChange();
            });

            timeoutInput.addEventListener('blur', () => {
                this.validateAndUpdateTimeout();
            });
        }
    }

    /**
     * Set up timer checkbox event listener
     */
    setupTimerCheckbox() {
        const timerCheckbox = getElementById(ELEMENTS.SHOW_TIMER_CHECKBOX);
        if (timerCheckbox) {
            timerCheckbox.addEventListener('change', () => {
                this.showTimer = timerCheckbox.checked;
                this.notifySettingsChange();
            });
        }
    }

    /**
     * Set up TTS selection event listeners
     */
    setupTTSSelection() {
        // TTS options are handled by onclick attributes in HTML
        // This method can be used for additional setup if needed
    }

    /**
     * Set up word count input event listener
     */
    setupWordCountInput() {
        const wordCountInput = getElementById(ELEMENTS.WORD_COUNT_INPUT);
        if (wordCountInput) {
            wordCountInput.addEventListener('input', () => {
                this.handleWordCountChange();
            });

            wordCountInput.addEventListener('blur', () => {
                this.validateAndUpdateWordCount();
            });
        }
    }

    /**
     * Select a difficulty level
     * @param {number} level - Level number (1-3)
     */
    selectLevel(level) {
        if (!GAME_CONFIG.LEVELS[level]) {
            console.warn(`Invalid level: ${level}`);
            return;
        }

        this.selectedLevel = level;
        this.updateLevelSelection();
        this.notifySettingsChange();
    }

    /**
     * Update level selection UI
     */
    updateLevelSelection() {
        // Remove selected class from all level options
        const levelOptions = document.querySelectorAll('.level-option');
        levelOptions.forEach(option => {
            removeClass(option, CSS_CLASSES.SELECTED);
        });

        // Add selected class to current level
        const selectedOption = document.querySelector(`[data-level="${this.selectedLevel}"]`);
        if (selectedOption) {
            addClass(selectedOption, CSS_CLASSES.SELECTED);
        }
    }

    /**
     * Handle timeout input change
     */
    handleTimeoutChange() {
        const timeoutInput = getElementById(ELEMENTS.TIMEOUT_INPUT);
        if (timeoutInput) {
            const value = parseFloat(timeoutInput.value);
            if (!isNaN(value)) {
                this.timeoutPerLetter = value;
                this.updateTimeoutStatus();
                this.notifySettingsChange();
            }
        }
    }

    /**
     * Validate and update timeout value
     */
    validateAndUpdateTimeout() {
        const timeoutInput = getElementById(ELEMENTS.TIMEOUT_INPUT);
        if (!timeoutInput) return;

        const validation = validateTimeoutInput(timeoutInput.value);
        
        if (validation.isValid) {
            this.timeoutPerLetter = validation.value;
            timeoutInput.value = validation.value.toString();
            removeClass(timeoutInput, CSS_CLASSES.INVALID);
        } else {
            addClass(timeoutInput, CSS_CLASSES.INVALID);
            // Reset to previous valid value
            timeoutInput.value = this.timeoutPerLetter.toString();
        }

        this.updateTimeoutStatus();
        this.notifySettingsChange();
    }

    /**
     * Update timeout status display
     */
    updateTimeoutStatus() {
        const statusElement = getElementById(ELEMENTS.TIMEOUT_STATUS);
        if (!statusElement) return;

        if (this.timeoutPerLetter <= 0) {
            statusElement.textContent = '♾️ No time limit';
            removeClass(statusElement, CSS_CLASSES.TIMEOUT_STATUS_WITH_LIMIT);
            addClass(statusElement, CSS_CLASSES.TIMEOUT_STATUS_NO_LIMIT);
        } else {
            statusElement.textContent = `✅ Time limit: ${this.timeoutPerLetter} seconds per missing letter`;
            removeClass(statusElement, CSS_CLASSES.TIMEOUT_STATUS_NO_LIMIT);
            addClass(statusElement, CSS_CLASSES.TIMEOUT_STATUS_WITH_LIMIT);
        }
    }

    /**
     * Select TTS method
     * @param {string} method - TTS method (dictionary, google, browser)
     */
    selectTTSMethod(method) {
        if (!Object.values(TTS_METHODS).includes(method)) {
            console.warn(`Invalid TTS method: ${method}`);
            return;
        }

        this.selectedTTSMethod = method;
        this.updateTTSSelection();
        this.notifySettingsChange();
    }

    /**
     * Update TTS selection UI
     */
    updateTTSSelection() {
        // Remove selected class from all TTS options
        const ttsOptions = document.querySelectorAll('.tts-option');
        ttsOptions.forEach(option => {
            removeClass(option, CSS_CLASSES.SELECTED);
        });

        // Add selected class to current TTS method
        const selectedOption = document.querySelector(`[data-tts="${this.selectedTTSMethod}"]`);
        if (selectedOption) {
            addClass(selectedOption, CSS_CLASSES.SELECTED);
        }
    }

    /**
     * Handle word count input change
     */
    handleWordCountChange() {
        const wordCountInput = getElementById(ELEMENTS.WORD_COUNT_INPUT);
        if (wordCountInput) {
            const value = parseInt(wordCountInput.value);
            if (!isNaN(value)) {
                this.wordCount = value;
                this.notifySettingsChange();
            }
        }
    }

    /**
     * Validate and update word count value
     */
    validateAndUpdateWordCount() {
        const wordCountInput = getElementById(ELEMENTS.WORD_COUNT_INPUT);
        if (!wordCountInput) return;

        const validation = validateWordCountInput(wordCountInput.value, this.totalAvailableWords);
        
        if (validation.isValid) {
            this.wordCount = validation.value;
            wordCountInput.value = validation.value.toString();
            removeClass(wordCountInput, CSS_CLASSES.INVALID);
        } else {
            addClass(wordCountInput, CSS_CLASSES.INVALID);
            // Reset to previous valid value
            wordCountInput.value = this.wordCount.toString();
        }

        this.notifySettingsChange();
    }

    /**
     * Set total available words for word count validation
     * @param {number} totalWords - Total available words
     */
    setTotalAvailableWords(totalWords) {
        this.totalAvailableWords = totalWords;
        
        // Update word count input max value
        const wordCountInput = getElementById(ELEMENTS.WORD_COUNT_INPUT);
        if (wordCountInput) {
            wordCountInput.max = totalWords.toString();
            
            // Adjust current value if it exceeds available words
            if (this.wordCount > totalWords) {
                this.wordCount = totalWords;
                wordCountInput.value = totalWords.toString();
                this.notifySettingsChange();
            }
        }
    }

    /**
     * Get current settings
     * @returns {Object} - Current settings object
     */
    getSettings() {
        return {
            level: this.selectedLevel,
            timeoutPerLetter: this.timeoutPerLetter,
            showTimer: this.showTimer,
            ttsMethod: this.selectedTTSMethod,
            wordCount: this.wordCount
        };
    }

    /**
     * Apply settings to UI
     * @param {Object} settings - Settings object
     */
    applySettings(settings) {
        if (settings.level !== undefined) {
            this.selectLevel(settings.level);
        }

        if (settings.timeoutPerLetter !== undefined) {
            this.timeoutPerLetter = settings.timeoutPerLetter;
            const timeoutInput = getElementById(ELEMENTS.TIMEOUT_INPUT);
            if (timeoutInput) {
                timeoutInput.value = settings.timeoutPerLetter.toString();
            }
            this.updateTimeoutStatus();
        }

        if (settings.showTimer !== undefined) {
            this.showTimer = settings.showTimer;
            const timerCheckbox = getElementById(ELEMENTS.SHOW_TIMER_CHECKBOX);
            if (timerCheckbox) {
                timerCheckbox.checked = settings.showTimer;
            }
        }

        if (settings.ttsMethod !== undefined) {
            this.selectTTSMethod(settings.ttsMethod);
        }

        if (settings.wordCount !== undefined) {
            this.wordCount = settings.wordCount;
            const wordCountInput = getElementById(ELEMENTS.WORD_COUNT_INPUT);
            if (wordCountInput) {
                wordCountInput.value = settings.wordCount.toString();
            }
        }

        this.notifySettingsChange();
    }

    /**
     * Reset settings to defaults
     */
    resetToDefaults() {
        this.applySettings({
            level: GAME_CONFIG.DEFAULT_LEVEL,
            timeoutPerLetter: GAME_CONFIG.DEFAULT_TIMEOUT_PER_LETTER,
            showTimer: false,
            ttsMethod: TTS_METHODS.GOOGLE,
            wordCount: Math.min(GAME_CONFIG.DEFAULT_WORD_COUNT, this.totalAvailableWords)
        });
    }

    /**
     * Validate all current settings
     * @returns {Object} - Validation result
     */
    validateSettings() {
        const result = {
            isValid: true,
            errors: []
        };

        // Validate level
        if (!GAME_CONFIG.LEVELS[this.selectedLevel]) {
            result.isValid = false;
            result.errors.push('Invalid difficulty level selected');
        }

        // Validate timeout
        const timeoutValidation = validateTimeoutInput(this.timeoutPerLetter);
        if (!timeoutValidation.isValid) {
            result.isValid = false;
            result.errors.push(...timeoutValidation.errors);
        }

        // Validate TTS method
        if (!Object.values(TTS_METHODS).includes(this.selectedTTSMethod)) {
            result.isValid = false;
            result.errors.push('Invalid TTS method selected');
        }

        // Validate word count
        const wordCountValidation = validateWordCountInput(this.wordCount, this.totalAvailableWords);
        if (!wordCountValidation.isValid) {
            result.isValid = false;
            result.errors.push(...wordCountValidation.errors);
        }

        return result;
    }

    /**
     * Set callback for settings changes
     * @param {Function} callback - Callback function
     */
    setOnSettingsChangeCallback(callback) {
        this.onSettingsChangeCallback = callback;
    }

    /**
     * Notify about settings change
     */
    notifySettingsChange() {
        if (this.onSettingsChangeCallback) {
            this.onSettingsChangeCallback(this.getSettings());
        }
    }

    /**
     * Get level configuration
     * @param {number} level - Level number
     * @returns {Object|null} - Level configuration or null
     */
    getLevelConfig(level = this.selectedLevel) {
        return GAME_CONFIG.LEVELS[level] || null;
    }

    /**
     * Get settings summary for display
     * @returns {string} - Settings summary text
     */
    getSettingsSummary() {
        const levelConfig = this.getLevelConfig();
        const levelName = levelConfig ? levelConfig.name : 'Unknown';
        
        let summary = `Level: ${levelName} (${this.selectedLevel})\n`;
        summary += `Timeout: ${this.timeoutPerLetter > 0 ? this.timeoutPerLetter + 's per letter' : 'No limit'}\n`;
        summary += `Timer: ${this.showTimer ? 'Enabled' : 'Disabled'}\n`;
        summary += `Audio: ${this.selectedTTSMethod}\n`;
        summary += `Words: ${this.wordCount}`;
        
        return summary;
    }
}

// Global level selection manager instance
export const levelSelectionManager = new LevelSelectionManager();
