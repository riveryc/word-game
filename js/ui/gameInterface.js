// Game playing interface

import { ELEMENTS, CSS_CLASSES, KEYS } from '../app/config.js';
import { getElementById, showElement, hideElement, setText, setHTML, addClass, removeClass, focusElement } from '../utils/helpers.js';
import { keyboardManager, KeyboardShortcuts } from '../utils/keyboard.js';

/**
 * Game interface manager class
 */
export class GameInterfaceManager {
    constructor() {
        console.log('[GameInterfaceManager] Constructor called.');
        this.isActive = false;
        this.currentPuzzle = null;
        this.onWordSubmitCallback = null;
        this.onRepeatWordCallback = null;
        this.lastSelectedInputIndex = -1;
        this._handleDocumentClickForFocusBound = null;
        this.init();
    }

    /**
     * Initialize game interface manager
     */
    init() {
        console.log('[GameInterfaceManager] init() called.');
        this._handleDocumentClickForFocusBound = this._handleDocumentClickForFocus.bind(this);
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for game interface
     */
    setupEventListeners() {
        console.log('[GameInterfaceManager] setupEventListeners() called.');
        // this.setupRepeatButton(); // Commented out to prevent conflict with gamePlayInterface.js
        this.setupKeyboardShortcuts();
    }

    /**
     * Set up repeat button event listener
     */
    setupRepeatButton() {
        const repeatButton = getElementById(ELEMENTS.REPEAT_BUTTON);
        if (repeatButton) {
            console.log('[GameInterfaceManager] Setting up repeat button listener for:', repeatButton);
            repeatButton.addEventListener('click', () => {
                console.log('[GameInterfaceManager] Repeat button clicked!');
                this.repeatWord();
            });
        } else {
            console.error('[GameInterfaceManager] Repeat button element not found!');
        }
    }

    /**
     * Set up keyboard shortcuts for game interface
     */
    setupKeyboardShortcuts() {
        // Enter key for word submission
        keyboardManager.registerKeyHandler(KEYS.ENTER, KeyboardShortcuts.enterKey(() => {
            if (this.isActive) {
                this.submitWord();
            }
        }));

        // Space key for audio repeat
        keyboardManager.registerKeyHandler(KEYS.SPACE, KeyboardShortcuts.spaceKey(() => {
            if (this.isActive) {
                this.repeatWord();
            }
        }));
    }

    /**
     * Activate game interface
     */
    activate() {
        this.isActive = true;
        this.setupInputFieldListeners();
        document.addEventListener('click', this._handleDocumentClickForFocusBound, true);
    }

    /**
     * Deactivate game interface
     */
    deactivate() {
        this.isActive = false;
        this.clearInputFieldListeners();
        document.removeEventListener('click', this._handleDocumentClickForFocusBound, true);
    }

    /**
     * Handles clicks on the document to maintain focus on input fields during active gameplay.
     * @param {MouseEvent} event - The click event.
     */
    _handleDocumentClickForFocus(event) {
        if (!this.isActive) {
            return;
        }

        const target = event.target;
        const gameInterfaceElement = getElementById(ELEMENTS.GAME_INTERFACE); // Get the main game interface container
        const repeatButtonElement = getElementById(ELEMENTS.REPEAT_BUTTON);

        // If the click is on an input field itself or the repeat button, do nothing.
        if (target.classList.contains(CSS_CLASSES.INLINE_INPUT) || 
            (repeatButtonElement && repeatButtonElement.contains(target))) {
            return;
        }

        // If the click is anywhere else (either inside the game interface but not on an interactive element,
        // or outside the game interface entirely), then refocus the last input.
        // We check if gameInterfaceElement exists to be safe.
        if (gameInterfaceElement) { 
            // No specific check for `gameInterfaceElement.contains(target)` is needed here based on the new logic.
            // If it's not an input and not the repeat button, we refocus.
            setTimeout(() => {
                this.focusLastSelectedInput();
            }, 0);
        }
    }

    /**
     * Display word puzzle
     * @param {Object} puzzle - Word puzzle object
     * @param {Object} wordData - Word data object
     */
    displayWord(puzzle, wordData) {
        this.currentPuzzle = puzzle;
        
        // Update word display
        const wordDisplayElement = getElementById(ELEMENTS.WORD_DISPLAY);
        if (wordDisplayElement) {
            setHTML(wordDisplayElement, puzzle.displayHTML);
        }

        // Update word description
        this.updateWordDescription(wordData);
        
        // Set up input field listeners
        this.setupInputFieldListeners();
        
        // Clear feedback
        this.clearFeedback();
        
        // Focus first input field
        this.focusFirstInput();
    }

    /**
     * Update word description display
     * @param {Object} wordData - Word data object
     */
    updateWordDescription(wordData) {
        const descriptionElement = getElementById(ELEMENTS.WORD_DESCRIPTION);
        if (!descriptionElement) return;

        if (wordData.description && wordData.description.trim() !== '') {
            setHTML(descriptionElement, `
                <strong>Description:</strong> ${wordData.description}
            `);
            showElement(descriptionElement);
        } else {
            hideElement(descriptionElement);
        }
    }

    /**
     * Set up input field event listeners
     */
    setupInputFieldListeners() {
        if (!this.currentPuzzle) return;

        const inputFields = document.querySelectorAll(`.${CSS_CLASSES.INLINE_INPUT}`);
        
        inputFields.forEach((input, index) => {
            // Remove existing listeners
            input.removeEventListener('input', this.handleInputChange);
            input.removeEventListener('keydown', this.handleKeyDown);
            input.removeEventListener('focus', this.handleInputFocus);
            input.removeEventListener('click', this.handleInputClick);

            // Add new listeners
            input.addEventListener('input', (event) => this.handleInputChange(event, index));
            input.addEventListener('keydown', (event) => this.handleKeyDown(event, index));
            input.addEventListener('focus', (event) => this.handleInputFocus(event, index));
            input.addEventListener('click', (event) => this.handleInputClick(event, index));
        });
    }

    /**
     * Clear input field event listeners
     */
    clearInputFieldListeners() {
        const inputFields = document.querySelectorAll(`.${CSS_CLASSES.INLINE_INPUT}`);
        
        inputFields.forEach(input => {
            input.removeEventListener('input', this.handleInputChange);
            input.removeEventListener('keydown', this.handleKeyDown);
            input.removeEventListener('focus', this.handleInputFocus);
            input.removeEventListener('click', this.handleInputClick);
        });
    }

    /**
     * Handle input field change
     * @param {Event} event - Input event
     * @param {number} index - Input field index
     */
    handleInputChange(event, index) {
        const input = event.target;
        let value = input.value.toLowerCase();

        // Only allow letters
        if (value && !/^[a-z]$/.test(value)) {
            input.value = '';
            return;
        }

        input.value = value;

        // Auto-advance to next field
        if (value) {
            this.focusNextInput(index);
        }

        // Check if all fields are filled
        if (this.areAllFieldsFilled()) {
            // Optional: Auto-submit when all fields are filled
            // this.submitWord();
        }
    }

    /**
     * Handle keydown events in input fields
     * @param {Event} event - Keydown event
     * @param {number} index - Input field index
     */
    handleKeyDown(event, index) {
        switch (event.key) {
            case KEYS.BACKSPACE:
                if (!event.target.value) {
                    this.focusPreviousInput(index);
                }
                break;
            case KEYS.ARROW_LEFT:
                event.preventDefault();
                this.focusPreviousInput(index);
                break;
            case KEYS.ARROW_RIGHT:
                event.preventDefault();
                this.focusNextInput(index);
                break;
            case KEYS.ENTER:
                event.preventDefault();
                this.submitWord();
                break;
            case KEYS.SPACE:
                if (event.target.tagName === 'INPUT') {
                    // Allow space in input fields, but prevent global space handler
                    event.stopPropagation();
                }
                break;
        }
    }

    /**
     * Handle input field focus
     * @param {Event} event - Focus event
     * @param {number} index - Input field index
     */
    handleInputFocus(event, index) {
        this.lastSelectedInputIndex = index;
        event.target.select();
    }

    /**
     * Handle input field click
     * @param {Event} event - Click event
     * @param {number} index - Input field index
     */
    handleInputClick(event, index) {
        this.lastSelectedInputIndex = index;
    }

    /**
     * Focus next input field
     * @param {number} currentIndex - Current input field index
     */
    focusNextInput(currentIndex) {
        const inputFields = document.querySelectorAll(`.${CSS_CLASSES.INLINE_INPUT}`);
        const nextIndex = currentIndex + 1;
        
        if (nextIndex < inputFields.length) {
            focusElement(inputFields[nextIndex]);
        }
    }

    /**
     * Focus previous input field
     * @param {number} currentIndex - Current input field index
     */
    focusPreviousInput(currentIndex) {
        const inputFields = document.querySelectorAll(`.${CSS_CLASSES.INLINE_INPUT}`);
        const prevIndex = currentIndex - 1;
        
        if (prevIndex >= 0) {
            focusElement(inputFields[prevIndex]);
        }
    }

    /**
     * Focus first input field
     */
    focusFirstInput() {
        const inputFields = document.querySelectorAll(`.${CSS_CLASSES.INLINE_INPUT}`);
        if (inputFields.length > 0) {
            focusElement(inputFields[0]);
            this.lastSelectedInputIndex = 0;
        }
    }

    /**
     * Focus last selected input field or first field
     */
    focusLastSelectedInput() {
        const inputFields = document.querySelectorAll(`.${CSS_CLASSES.INLINE_INPUT}`);
        
        if (this.lastSelectedInputIndex >= 0 && this.lastSelectedInputIndex < inputFields.length) {
            focusElement(inputFields[this.lastSelectedInputIndex]);
        } else if (inputFields.length > 0) {
            focusElement(inputFields[0]);
            this.lastSelectedInputIndex = 0;
        }
    }

    /**
     * Check if all input fields are filled
     * @returns {boolean} - True if all fields have values
     */
    areAllFieldsFilled() {
        const inputFields = document.querySelectorAll(`.${CSS_CLASSES.INLINE_INPUT}`);
        return Array.from(inputFields).every(input => input.value.trim() !== '');
    }

    /**
     * Get user input from all fields
     * @returns {string} - Complete user input
     */
    getUserInput() {
        if (!this.currentPuzzle) return '';

        return this.currentPuzzle.puzzleLetters.map(letterData => {
            if (letterData.isHidden) {
                const inputElement = getElementById(letterData.inputId);
                return inputElement ? inputElement.value.toLowerCase() : '';
            } else {
                return letterData.letter;
            }
        }).join('');
    }

    /**
     * Clear all input fields
     */
    clearInputs() {
        const inputFields = document.querySelectorAll(`.${CSS_CLASSES.INLINE_INPUT}`);
        inputFields.forEach(input => {
            input.value = '';
        });
        this.focusFirstInput();
    }

    /**
     * Submit current word
     */
    submitWord() {
        if (!this.isActive || !this.onWordSubmitCallback) return;

        const userInput = this.getUserInput();
        this.onWordSubmitCallback(userInput);
    }

    /**
     * Repeat current word audio
     */
    repeatWord() {
        console.log('[GameInterfaceManager] repeatWord() called. isActive:', this.isActive, 'onRepeatWordCallback defined:', !!this.onRepeatWordCallback);
        if (!this.isActive || !this.onRepeatWordCallback) {
            console.warn('[GameInterfaceManager] repeatWord() returning early. isActive:', this.isActive, 'Callback defined:', !!this.onRepeatWordCallback);
            return;
        }

        this.onRepeatWordCallback();
        
        console.log('[GameInterfaceManager] Refocusing after repeatWord call.');
        setTimeout(() => {
            this.focusLastSelectedInput();
        }, 100); // 100ms might be too short if audio is long, but okay for focus
    }

    /**
     * Update progress display
     * @param {Object} progress - Progress object
     */
    updateProgress(progress) {
        const progressElement = getElementById(ELEMENTS.PROGRESS);
        if (progressElement) {
            setText(progressElement, `Word ${progress.currentWordIndex + 1} of ${progress.totalWords}`);
        }
    }

    /**
     * Show feedback message
     * @param {string} message - Feedback message
     * @param {string} type - Feedback type (correct/incorrect)
     */
    showFeedback(message, type = 'neutral') {
        const feedbackElement = getElementById(ELEMENTS.FEEDBACK);
        if (feedbackElement) {
            setText(feedbackElement, message);
            
            // Remove existing classes
            removeClass(feedbackElement, CSS_CLASSES.CORRECT);
            removeClass(feedbackElement, CSS_CLASSES.INCORRECT);
            
            // Add appropriate class
            if (type === 'correct') {
                addClass(feedbackElement, CSS_CLASSES.CORRECT);
            } else if (type === 'incorrect') {
                addClass(feedbackElement, CSS_CLASSES.INCORRECT);
            }
        }
    }

    /**
     * Clear feedback display
     */
    clearFeedback() {
        const feedbackElement = getElementById(ELEMENTS.FEEDBACK);
        if (feedbackElement) {
            setText(feedbackElement, '');
            removeClass(feedbackElement, CSS_CLASSES.CORRECT);
            removeClass(feedbackElement, CSS_CLASSES.INCORRECT);
        }
    }

    /**
     * Set callback for word submission
     * @param {Function} callback - Callback function
     */
    setOnWordSubmitCallback(callback) {
        this.onWordSubmitCallback = callback;
    }

    /**
     * Set callback for word repeat
     * @param {Function} callback - Callback function
     */
    setOnRepeatWordCallback(callback) {
        console.log('[GameInterfaceManager] setOnRepeatWordCallback called with:', callback);
        this.onRepeatWordCallback = callback;
    }

    /**
     * Get current puzzle data
     * @returns {Object|null} - Current puzzle object or null
     */
    getCurrentPuzzle() {
        return this.currentPuzzle;
    }

    /**
     * Check if interface is active
     * @returns {boolean} - True if active
     */
    isInterfaceActive() {
        return this.isActive;
    }
}

// Global game interface manager instance
console.log('[GameInterfaceManager] Instantiating GameInterfaceManager...');
export const gameInterfaceManager = new GameInterfaceManager();
