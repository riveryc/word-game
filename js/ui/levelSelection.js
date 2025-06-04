// Level selection interface

import { GAME_CONFIG, ELEMENTS, CSS_CLASSES, TTS_METHODS } from '../app/config.js';
import { getElementById, addClass, removeClass, setValue, getValue } from '../utils/helpers.js';
import { validateTimeoutInput, validateWordCountInput } from '../utils/validation.js';
import { audioManager } from '../audio/audioManager.js'; // Import AudioManager

/**
 * Level selection manager class
 */
export class LevelSelectionManager {
    constructor() {
        this.selectedLevel = GAME_CONFIG.DEFAULT_LEVEL;
        this.timeoutPerLetter = GAME_CONFIG.DEFAULT_TIMEOUT_PER_LETTER;
        this.showTimer = false;
        this.selectedTTSMethod = TTS_METHODS.GOOGLE; // Default to Google TTS
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
        this.updateTTSSelection(); // Ensure initial UI matches the default
        audioManager.setMethod(this.selectedTTSMethod); // Set initial method in AudioManager
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
        const ttsOptionElements = document.querySelectorAll('.tts-option');
        if (ttsOptionElements && ttsOptionElements.length > 0) {
            ttsOptionElements.forEach(option => {
                option.addEventListener('click', () => {
                    const method = option.dataset.method;
                    if (method) {
                        this.selectTTSMethod(method);
                    }
                });
            });
        } else {
            console.warn('[LevelSelectionManager] TTS option elements not found for event listener setup.');
        }
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
     * @param {string} method - TTS method ('google' or 'browser')
     */
    selectTTSMethod(method) {
        // TTS_METHODS should now only contain 'google' and 'browser' as values
        if (!Object.values(TTS_METHODS).includes(method)) {
            console.warn(`[LevelSelectionManager] Invalid TTS method: ${method}. Allowed: ${Object.values(TTS_METHODS).join(', ')}`);
            return;
        }

        this.selectedTTSMethod = method;
        audioManager.setMethod(method); // Update AudioManager
        this.updateTTSSelection();
        this.notifySettingsChange();
        console.log(`[LevelSelectionManager] TTS Method set to: ${method}`);
    }

    /**
     * Update TTS selection UI
     */
    updateTTSSelection() {
        const ttsOptions = document.querySelectorAll('.tts-option');
        ttsOptions.forEach(option => {
            removeClass(option, CSS_CLASSES.SELECTED);
        });

        // data-method attribute in HTML is now 'google' or 'browser'
        const selectedOption = document.querySelector(`[data-method="${this.selectedTTSMethod}"]`);
        if (selectedOption) {
            addClass(selectedOption, CSS_CLASSES.SELECTED);
        } else {
            console.warn(`[LevelSelectionManager] Could not find TTS option UI element for method: ${this.selectedTTSMethod}`);
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

        this.updateWordCountDisplay(); // Ensure this is called
        this.notifySettingsChange();
    }

    /**
     * Update word count display information
     */
    updateWordCountDisplay() {
        const wordCountInfo = getElementById(ELEMENTS.WORD_COUNT_INFO);
        if (wordCountInfo) {
            const totalWordsSpan = getElementById(ELEMENTS.TOTAL_WORDS_COUNT);
            if (totalWordsSpan) {
                totalWordsSpan.textContent = this.totalAvailableWords.toString();
            }
            // Additional logic for displaying word count info if needed
        }
    }

    /**
     * Set total available words (called after data loading)
     * @param {number} totalWords - Total number of words available for selection
     */
    setTotalAvailableWords(totalWords) {
        this.totalAvailableWords = totalWords;
        const wordCountInput = getElementById(ELEMENTS.WORD_COUNT_INPUT);
        if (wordCountInput) {
            wordCountInput.max = totalWords > 0 ? totalWords.toString() : '1'; // Prevent 0 or negative max
            if (this.wordCount > totalWords && totalWords > 0) {
                this.wordCount = totalWords;
                setValue(wordCountInput, this.wordCount.toString());
            } else if (totalWords === 0 && this.wordCount > 0) {
                this.wordCount = 0;
                setValue(wordCountInput, '0');
            }
        }
        this.updateWordCountDisplay();
        this.validateAndUpdateWordCount(); // Re-validate after total changes
    }

    /**
     * Get current level selection settings
     * @returns {object} Current settings
     */
    getSettings() {
        return {
            level: this.selectedLevel,
            timeout: this.timeoutPerLetter,
            showTimer: this.showTimer,
            ttsMethod: this.selectedTTSMethod,
            wordCount: this.wordCount
        };
    }

    /**
     * Apply settings to the level selection manager
     * @param {object} settings - Settings object to apply
     */
    applySettings(settings) {
        if (!settings) return;

        if (settings.level !== undefined) {
            this.selectLevel(settings.level);
        }
        if (settings.timeout !== undefined) {
            this.timeoutPerLetter = settings.timeout;
            const timeoutInput = getElementById(ELEMENTS.TIMEOUT_INPUT);
            if (timeoutInput) setValue(timeoutInput, this.timeoutPerLetter.toString());
            this.updateTimeoutStatus();
        }
        if (settings.showTimer !== undefined) {
            this.showTimer = settings.showTimer;
            const timerCheckbox = getElementById(ELEMENTS.SHOW_TIMER_CHECKBOX);
            if (timerCheckbox) timerCheckbox.checked = this.showTimer;
        }
        if (settings.ttsMethod !== undefined) {
            this.selectTTSMethod(settings.ttsMethod);
        }
        if (settings.wordCount !== undefined) {
            this.wordCount = settings.wordCount;
            const wordCountInput = getElementById(ELEMENTS.WORD_COUNT_INPUT);
            if (wordCountInput) setValue(wordCountInput, this.wordCount.toString());
            this.validateAndUpdateWordCount();
        }
        this.notifySettingsChange();
    }

    /**
     * Reset all settings to default values
     */
    resetToDefaults() {
        this.applySettings({
            level: GAME_CONFIG.DEFAULT_LEVEL,
            timeout: GAME_CONFIG.DEFAULT_TIMEOUT_PER_LETTER,
            showTimer: false, // Assuming default is false for showing timer
            ttsMethod: TTS_METHODS.GOOGLE, // Default TTS method
            wordCount: GAME_CONFIG.DEFAULT_WORD_COUNT
        });
        // Ensure UI for word count input is also reset if it has a different default
        const wordCountInput = getElementById(ELEMENTS.WORD_COUNT_INPUT);
        if (wordCountInput) setValue(wordCountInput, GAME_CONFIG.DEFAULT_WORD_COUNT.toString());
        this.validateAndUpdateWordCount();
    }

    /**
     * Validate current settings
     * @returns {boolean} True if settings are valid, false otherwise
     */
    validateSettings() {
        const timeoutValidation = validateTimeoutInput(this.timeoutPerLetter.toString());
        const wordCountValidation = validateWordCountInput(this.wordCount.toString(), this.totalAvailableWords);
        
        const isValid = timeoutValidation.isValid && 
                        wordCountValidation.isValid &&
                        GAME_CONFIG.LEVELS[this.selectedLevel] &&
                        Object.values(TTS_METHODS).includes(this.selectedTTSMethod);

        if (!isValid) {
            console.warn("[LevelSelectionManager] Settings validation failed:", {
                timeout: timeoutValidation,
                wordCount: wordCountValidation,
                level: this.selectedLevel,
                tts: this.selectedTTSMethod
            });
        }
        return isValid;
    }

    /**
     * Set callback function for settings change
     * @param {function} callback - Callback function
     */
    setOnSettingsChangeCallback(callback) {
        this.onSettingsChangeCallback = callback;
    }

    /**
     * Notify subscribers about settings change
     */
    notifySettingsChange() {
        if (this.onSettingsChangeCallback) {
            this.onSettingsChangeCallback(this.getSettings());
        }
    }

    /**
     * Get level configuration based on selected level
     * @param {number} [level=this.selectedLevel] - Level number
     * @returns {object|null} Level configuration object or null if invalid
     */
    getLevelConfig(level = this.selectedLevel) {
        return GAME_CONFIG.LEVELS[level] || null;
    }

    /**
     * Get a summary of current settings for display or logging
     * @returns {string}
     */
    getSettingsSummary() {
        const levelName = this.getLevelConfig() ? this.getLevelConfig().name : 'Unknown';
        return `Level: ${levelName}, Words: ${this.wordCount}, Timeout: ${this.timeoutPerLetter > 0 ? this.timeoutPerLetter + 's/letter' : 'None'}, TTS: ${this.selectedTTSMethod}, Show Timer: ${this.showTimer}`;
    }
}

// Global level selection manager instance
export const levelSelectionManager = new LevelSelectionManager();
