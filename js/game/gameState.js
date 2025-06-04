// Game state management

import { GAME_CONFIG, RESULT_TYPES, TTS_METHODS } from '../app/config.js';
import { shuffleArray } from '../utils/helpers.js';

/**
 * Game state manager class
 */
export class GameState {
    constructor() {
        this.reset();
    }

    /**
     * Reset game state to initial values
     */
    reset() {
        // Game configuration
        this.level = GAME_CONFIG.DEFAULT_LEVEL;
        this.timeoutPerLetter = GAME_CONFIG.DEFAULT_TIMEOUT_PER_LETTER;
        this.showTimer = false;
        this.ttsMethod = TTS_METHODS.GOOGLE;
        this.wordCount = GAME_CONFIG.DEFAULT_WORD_COUNT;

        // Word data
        this.allWords = [];
        this.gameWords = [];
        this.currentWordIndex = 0;
        this.currentWord = null;

        // Game progress
        this.isGameActive = false;
        this.isWordActive = false;
        this.startTime = null;
        this.endTime = null;

        // Results tracking
        this.results = [];
        this.correctAnswers = [];
        this.incorrectAnswers = [];
        this.timeoutAnswers = [];
        this.retryWords = [];

        // Current word state
        this.currentWordStartTime = null;
        this.currentWordEndTime = null;
        this.currentUserInput = '';
        this.currentWordResult = RESULT_TYPES.PENDING;
    }

    /**
     * Initialize game with word data and settings
     * @param {Array} wordData - Array of word objects
     * @param {Object} settings - Game settings
     */
    initialize(wordData, settings = {}) {
        this.reset();
        
        // Apply settings
        this.level = settings.level || GAME_CONFIG.DEFAULT_LEVEL;
        this.timeoutPerLetter = settings.timeoutPerLetter || GAME_CONFIG.DEFAULT_TIMEOUT_PER_LETTER;
        this.showTimer = settings.showTimer || false;
        this.ttsMethod = settings.ttsMethod || TTS_METHODS.GOOGLE;
        this.wordCount = settings.wordCount || Math.min(GAME_CONFIG.DEFAULT_WORD_COUNT, wordData.length);

        // Set up word data
        this.allWords = [...wordData];
        this.prepareGameWords();
    }

    /**
     * Prepare words for the game (shuffle and limit)
     */
    prepareGameWords() {
        // Shuffle all words
        const shuffledWords = shuffleArray([...this.allWords]);
        
        // Take the requested number of words
        const selectedWords = shuffledWords.slice(0, this.wordCount);

        this.gameWords = selectedWords.map(wordObj => {
            // Ensure wordObj and its necessary properties exist
            if (wordObj && typeof wordObj['Example sentence'] === 'string' && typeof wordObj.word === 'string') {
                const sentence = wordObj['Example sentence'];
                const targetWord = wordObj.word;

                const lowerSentence = sentence.toLowerCase();
                const lowerTargetWord = targetWord.toLowerCase();
                const startIndex = lowerSentence.indexOf(lowerTargetWord);

                if (startIndex !== -1) {
                    // Successfully found the word (case-insensitively) for splitting
                    wordObj.sentencePrefix = sentence.substring(0, startIndex);
                    // The actual word to be guessed is targetWord (maintaining original case)
                    wordObj.sentenceSuffix = sentence.substring(startIndex + targetWord.length);
                } else {
                    // This case should ideally be prevented by the filtering in dataSource.js
                    // If it occurs, log an error and provide safe defaults.
                    console.error(
                        `GameState Error: Word "${targetWord}" not found (even case-insensitively) in its sentence "${sentence}". ` +
                        `This might indicate an issue with data filtering or the data itself. ` +
                        `Word object: ${JSON.stringify(wordObj)}`
                    );
                    // Make the word playable by showing the full sentence, but it won't have a blank.
                    wordObj.sentencePrefix = sentence; 
                    wordObj.sentenceSuffix = '';
                    // wordObj.word remains the target for checking, though UI will be odd.
                }
            } else {
                // Log if a wordObj is malformed, though filtering should prevent this.
                console.warn('GameState Warning: Malformed word object encountered in prepareGameWords:', wordObj);
            }
            return wordObj;
        });
        
        // Reset current word index
        this.currentWordIndex = 0;
        this.currentWord = this.gameWords.length > 0 ? this.gameWords[0] : null;
    }

    /**
     * Start the game
     */
    startGame() {
        this.isGameActive = true;
        this.startTime = Date.now();
        this.currentWordIndex = 0;
        this.currentWord = this.gameWords[0] || null;
        this.startCurrentWord();
    }

    /**
     * End the game
     */
    endGame() {
        this.isGameActive = false;
        this.isWordActive = false;
        this.endTime = Date.now();
        this.endCurrentWord();
    }

    /**
     * Start timing for current word
     */
    startCurrentWord() {
        if (!this.currentWord) return;
        
        this.isWordActive = true;
        this.currentWordStartTime = Date.now();
        this.currentWordEndTime = null;
        this.currentUserInput = '';
        this.currentWordResult = RESULT_TYPES.PENDING;
    }

    /**
     * End timing for current word
     */
    endCurrentWord() {
        if (!this.isWordActive) return;
        
        this.isWordActive = false;
        this.currentWordEndTime = Date.now();
    }

    /**
     * Move to next word
     * @returns {boolean} - True if there is a next word, false if game is complete
     */
    nextWord() {
        this.endCurrentWord();
        
        this.currentWordIndex++;
        
        if (this.currentWordIndex >= this.gameWords.length) {
            this.endGame();
            return false;
        }
        
        this.currentWord = this.gameWords[this.currentWordIndex];
        this.startCurrentWord();
        return true;
    }

    /**
     * Record result for current word
     * @param {string} userInput - User's input
     * @param {string} resultType - Type of result (success, timeout, incorrect, etc.)
     * @param {number} elapsedTime - Time taken in seconds
     */
    recordResult(userInput, resultType, elapsedTime) {
        if (!this.currentWord) return;

        const result = {
            word: this.currentWord,
            userInput: userInput,
            correctAnswer: this.currentWord.word,
            resultType: resultType,
            elapsedTime: elapsedTime,
            timestamp: Date.now(),
            wordIndex: this.currentWordIndex
        };

        this.results.push(result);
        this.currentUserInput = userInput;
        this.currentWordResult = resultType;

        // Categorize result
        this.categorizeResult(result);
    }

    /**
     * Categorize result into appropriate arrays
     * @param {Object} result - Result object
     */
    categorizeResult(result) {
        switch (result.resultType) {
            case RESULT_TYPES.SUCCESS:
                this.correctAnswers.push(result);
                break;
            case RESULT_TYPES.INCORRECT:
                this.incorrectAnswers.push(result);
                this.addToRetryList(result, GAME_CONFIG.RETRY_ATTEMPTS.INCORRECT);
                break;
            case RESULT_TYPES.TIMEOUT:
                this.timeoutAnswers.push(result);
                this.addToRetryList(result, GAME_CONFIG.RETRY_ATTEMPTS.TIMEOUT);
                break;
            case RESULT_TYPES.TIMEOUT_INCORRECT:
                this.timeoutAnswers.push(result);
                this.incorrectAnswers.push(result);
                this.addToRetryList(result, GAME_CONFIG.RETRY_ATTEMPTS.TIMEOUT_INCORRECT);
                break;
        }
    }

    /**
     * Add word to retry list
     * @param {Object} result - Result object
     * @param {number} retryCount - Number of times to add to retry list
     */
    addToRetryList(result, retryCount) {
        for (let i = 0; i < retryCount; i++) {
            this.retryWords.push({
                ...result.word,
                originalResult: result,
                retryReason: result.resultType
            });
        }
    }

    /**
     * Get current game progress
     * @returns {Object} - Progress information
     */
    getProgress() {
        return {
            currentWordIndex: this.currentWordIndex,
            totalWords: this.gameWords.length,
            wordsCompleted: this.currentWordIndex,
            wordsRemaining: this.gameWords.length - this.currentWordIndex,
            percentComplete: this.gameWords.length > 0 ? Math.round((this.currentWordIndex / this.gameWords.length) * 100) : 0
        };
    }

    /**
     * Get current word information
     * @returns {Object|null} - Current word object or null
     */
    getCurrentWord() {
        return this.currentWord;
    }

    /**
     * Get current word timing information
     * @returns {Object} - Timing information
     */
    getCurrentWordTiming() {
        return {
            startTime: this.currentWordStartTime,
            endTime: this.currentWordEndTime,
            elapsedTime: this.getCurrentWordElapsedTime(),
            isActive: this.isWordActive
        };
    }

    /**
     * Get elapsed time for current word in seconds
     * @returns {number} - Elapsed time in seconds
     */
    getCurrentWordElapsedTime() {
        if (!this.currentWordStartTime) return 0;
        
        const endTime = this.currentWordEndTime || Date.now();
        return Math.floor((endTime - this.currentWordStartTime) / 1000);
    }

    /**
     * Get game statistics
     * @returns {Object} - Game statistics
     */
    getStatistics() {
        const totalWords = this.results.length;
        const correctCount = this.correctAnswers.length;
        const incorrectCount = this.incorrectAnswers.length;
        const timeoutCount = this.timeoutAnswers.length;

        return {
            totalWords: totalWords,
            correctCount: correctCount,
            incorrectCount: incorrectCount,
            timeoutCount: timeoutCount,
            accuracy: totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0,
            averageTime: this.getAverageResponseTime(),
            totalGameTime: this.getTotalGameTime(),
            retryWordsCount: this.retryWords.length
        };
    }

    /**
     * Get average response time
     * @returns {number} - Average time in seconds
     */
    getAverageResponseTime() {
        if (this.results.length === 0) return 0;
        
        const totalTime = this.results.reduce((sum, result) => sum + result.elapsedTime, 0);
        return Math.round(totalTime / this.results.length);
    }

    /**
     * Get total game time
     * @returns {number} - Total time in seconds
     */
    getTotalGameTime() {
        if (!this.startTime) return 0;
        
        const endTime = this.endTime || Date.now();
        return Math.floor((endTime - this.startTime) / 1000);
    }

    /**
     * Check if game is complete
     * @returns {boolean} - True if game is complete
     */
    isGameComplete() {
        return !this.isGameActive && this.currentWordIndex >= this.gameWords.length;
    }

    /**
     * Check if there are words to retry
     * @returns {boolean} - True if there are retry words
     */
    hasRetryWords() {
        return this.retryWords.length > 0;
    }

    /**
     * Get retry words
     * @returns {Array} - Array of words to retry
     */
    getRetryWords() {
        return [...this.retryWords];
    }

    /**
     * Start retry session with failed words
     */
    startRetrySession() {
        if (this.retryWords.length === 0) return false;
        
        // Use retry words as the new game words
        this.gameWords = shuffleArray([...this.retryWords]);
        this.retryWords = []; // Clear retry list
        
        // Reset game state for retry
        this.currentWordIndex = 0;
        this.currentWord = this.gameWords[0] || null;
        this.results = [];
        this.correctAnswers = [];
        this.incorrectAnswers = [];
        this.timeoutAnswers = [];
        
        this.startGame();
        return true;
    }

    /**
     * Get game configuration
     * @returns {Object} - Current game configuration
     */
    getConfiguration() {
        return {
            level: this.level,
            timeoutPerLetter: this.timeoutPerLetter,
            showTimer: this.showTimer,
            ttsMethod: this.ttsMethod,
            wordCount: this.wordCount,
            missingPercentage: GAME_CONFIG.LEVELS[this.level]?.missingPercentage || 50
        };
    }

    /**
     * Export game data for analysis
     * @returns {Object} - Complete game data
     */
    exportGameData() {
        return {
            configuration: this.getConfiguration(),
            statistics: this.getStatistics(),
            results: [...this.results],
            retryWords: [...this.retryWords],
            gameTime: {
                startTime: this.startTime,
                endTime: this.endTime,
                totalTime: this.getTotalGameTime()
            }
        };
    }
}

// Global game state instance
export const gameState = new GameState();
