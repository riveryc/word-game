// Word puzzle generation

import { GAME_CONFIG, CSS_CLASSES } from '../app/config.js';
import { getRandomInt } from '../utils/helpers.js';

/**
 * Word generator class for creating word puzzles
 */
export class WordGenerator {
    constructor() {
        this.currentPuzzle = null;
    }

    /**
     * Generate a word puzzle based on difficulty level
     * @param {string} word - The word to create puzzle for
     * @param {number} level - Difficulty level (1-3)
     * @returns {Object} - Puzzle object with display HTML and metadata
     */
    generatePuzzle(word, level) {
        if (!word || typeof word !== 'string') {
            throw new Error('Invalid word provided');
        }

        const cleanWord = word.trim().toLowerCase();
        const levelConfig = GAME_CONFIG.LEVELS[level];
        
        if (!levelConfig) {
            throw new Error(`Invalid level: ${level}`);
        }

        const missingPercentage = levelConfig.missingPercentage;
        const puzzle = this.createWordPuzzle(cleanWord, missingPercentage);
        
        this.currentPuzzle = {
            originalWord: cleanWord,
            level: level,
            missingPercentage: missingPercentage,
            ...puzzle
        };

        return this.currentPuzzle;
    }

    /**
     * Create word puzzle with missing letters
     * @param {string} word - The word to create puzzle for
     * @param {number} missingPercentage - Percentage of letters to hide
     * @returns {Object} - Puzzle data
     */
    createWordPuzzle(word, missingPercentage) {
        const letters = word.split('');
        const totalLetters = letters.length;
        const missingCount = Math.ceil((totalLetters * missingPercentage) / 100);
        
        // Determine which letters to hide
        const hiddenIndices = this.selectHiddenIndices(totalLetters, missingCount);
        
        // Create puzzle structure
        const puzzleLetters = letters.map((letter, index) => ({
            letter: letter,
            isHidden: hiddenIndices.includes(index),
            index: index,
            inputId: `input-${index}`,
            userInput: ''
        }));

        // Generate HTML
        const displayHTML = this.generateDisplayHTML(puzzleLetters);
        
        return {
            puzzleLetters: puzzleLetters,
            displayHTML: displayHTML,
            hiddenIndices: hiddenIndices,
            missingCount: missingCount,
            totalLetters: totalLetters,
            visibleLetters: totalLetters - missingCount
        };
    }

    /**
     * Select which letter indices to hide
     * @param {number} totalLetters - Total number of letters
     * @param {number} missingCount - Number of letters to hide
     * @returns {Array} - Array of indices to hide
     */
    selectHiddenIndices(totalLetters, missingCount) {
        if (missingCount >= totalLetters) {
            // Hide all letters
            return Array.from({ length: totalLetters }, (_, i) => i);
        }

        if (missingCount <= 0) {
            // Hide no letters
            return [];
        }

        // Randomly select indices to hide
        const availableIndices = Array.from({ length: totalLetters }, (_, i) => i);
        const hiddenIndices = [];

        for (let i = 0; i < missingCount; i++) {
            const randomIndex = getRandomInt(0, availableIndices.length - 1);
            const selectedIndex = availableIndices.splice(randomIndex, 1)[0];
            hiddenIndices.push(selectedIndex);
        }

        return hiddenIndices.sort((a, b) => a - b);
    }

    /**
     * Generate HTML for word display
     * @param {Array} puzzleLetters - Array of puzzle letter objects
     * @returns {string} - HTML string
     */
    generateDisplayHTML(puzzleLetters) {
        return puzzleLetters.map(letterData => {
            if (letterData.isHidden) {
                return `<input type="text" 
                               class="${CSS_CLASSES.INLINE_INPUT}" 
                               id="${letterData.inputId}" 
                               maxlength="1" 
                               data-index="${letterData.index}"
                               autocomplete="off"
                               spellcheck="false">`;
            } else {
                return `<span class="${CSS_CLASSES.VISIBLE_LETTER}">${letterData.letter}</span>`;
            }
        }).join('');
    }

    /**
     * Get user input from puzzle
     * @returns {string} - Complete user input
     */
    getUserInput() {
        if (!this.currentPuzzle) {
            return '';
        }

        return this.currentPuzzle.puzzleLetters.map(letterData => {
            if (letterData.isHidden) {
                const inputElement = document.getElementById(letterData.inputId);
                return inputElement ? inputElement.value.toLowerCase() : '';
            } else {
                return letterData.letter;
            }
        }).join('');
    }

    /**
     * Check if user input is correct
     * @returns {boolean} - True if input matches original word
     */
    isCorrect() {
        if (!this.currentPuzzle) {
            return false;
        }

        const userInput = this.getUserInput();
        return userInput === this.currentPuzzle.originalWord;
    }

    /**
     * Get missing letters that user needs to fill
     * @returns {Array} - Array of missing letter objects
     */
    getMissingLetters() {
        if (!this.currentPuzzle) {
            return [];
        }

        return this.currentPuzzle.puzzleLetters
            .filter(letterData => letterData.isHidden)
            .map(letterData => ({
                index: letterData.index,
                correctLetter: letterData.letter,
                inputId: letterData.inputId
            }));
    }

    /**
     * Highlight incorrect letters in user input
     * @returns {Array} - Array of incorrect letter indices
     */
    getIncorrectLetters() {
        if (!this.currentPuzzle) {
            return [];
        }

        const userInput = this.getUserInput();
        const incorrectIndices = [];

        this.currentPuzzle.puzzleLetters.forEach((letterData, index) => {
            if (letterData.isHidden) {
                const userLetter = userInput[index] || '';
                if (userLetter !== letterData.letter) {
                    incorrectIndices.push(index);
                }
            }
        });

        return incorrectIndices;
    }

    /**
     * Set up input field event listeners
     * @param {Function} onInputCallback - Callback for input events
     * @param {Function} onCompleteCallback - Callback when all fields filled
     */
    setupInputListeners(onInputCallback, onCompleteCallback) {
        if (!this.currentPuzzle) {
            return;
        }

        const missingLetters = this.getMissingLetters();
        
        missingLetters.forEach((letterData, index) => {
            const inputElement = document.getElementById(letterData.inputId);
            if (!inputElement) return;

            // Input event listener
            inputElement.addEventListener('input', (event) => {
                const value = event.target.value.toLowerCase();
                
                // Only allow letters
                if (value && !/^[a-z]$/.test(value)) {
                    event.target.value = '';
                    return;
                }

                event.target.value = value;

                if (onInputCallback) {
                    onInputCallback(letterData.index, value);
                }

                // Auto-advance to next field
                if (value && index < missingLetters.length - 1) {
                    const nextInput = document.getElementById(missingLetters[index + 1].inputId);
                    if (nextInput) {
                        nextInput.focus();
                    }
                }

                // Check if all fields are filled
                if (this.areAllFieldsFilled() && onCompleteCallback) {
                    onCompleteCallback();
                }
            });

            // Backspace handling
            inputElement.addEventListener('keydown', (event) => {
                if (event.key === 'Backspace' && !event.target.value && index > 0) {
                    const prevInput = document.getElementById(missingLetters[index - 1].inputId);
                    if (prevInput) {
                        prevInput.focus();
                    }
                }
            });

            // Focus handling
            inputElement.addEventListener('focus', () => {
                inputElement.select();
            });
        });
    }

    /**
     * Check if all input fields are filled
     * @returns {boolean} - True if all fields have values
     */
    areAllFieldsFilled() {
        if (!this.currentPuzzle) {
            return false;
        }

        const missingLetters = this.getMissingLetters();
        return missingLetters.every(letterData => {
            const inputElement = document.getElementById(letterData.inputId);
            return inputElement && inputElement.value.trim() !== '';
        });
    }

    /**
     * Clear all input fields
     */
    clearInputs() {
        if (!this.currentPuzzle) {
            return;
        }

        const missingLetters = this.getMissingLetters();
        missingLetters.forEach(letterData => {
            const inputElement = document.getElementById(letterData.inputId);
            if (inputElement) {
                inputElement.value = '';
            }
        });
    }

    /**
     * Focus first input field
     */
    focusFirstInput() {
        if (!this.currentPuzzle) {
            return;
        }

        const missingLetters = this.getMissingLetters();
        if (missingLetters.length > 0) {
            const firstInput = document.getElementById(missingLetters[0].inputId);
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    /**
     * Get puzzle statistics
     * @returns {Object} - Puzzle statistics
     */
    getPuzzleStats() {
        if (!this.currentPuzzle) {
            return null;
        }

        return {
            originalWord: this.currentPuzzle.originalWord,
            level: this.currentPuzzle.level,
            totalLetters: this.currentPuzzle.totalLetters,
            missingCount: this.currentPuzzle.missingCount,
            visibleLetters: this.currentPuzzle.visibleLetters,
            missingPercentage: this.currentPuzzle.missingPercentage,
            difficulty: GAME_CONFIG.LEVELS[this.currentPuzzle.level]?.name || 'Unknown'
        };
    }

    /**
     * Get current puzzle data
     * @returns {Object|null} - Current puzzle object or null
     */
    getCurrentPuzzle() {
        return this.currentPuzzle;
    }

    /**
     * Reset generator state
     */
    reset() {
        this.currentPuzzle = null;
    }
}

// Global word generator instance
export const wordGenerator = new WordGenerator();
