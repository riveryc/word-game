// Main game flow control

import { RESULT_TYPES, KEYS } from '../app/config.js';
import { gameState } from './gameState.js';
import { wordGenerator } from './wordGenerator.js';
import { gameTimer } from '../utils/timer.js';
import { keyboardManager, KeyboardShortcuts } from '../utils/keyboard.js';
import { sanitizeInput } from '../utils/helpers.js';

/**
 * Game controller class for managing game flow
 */
export class GameController {
    constructor() {
        this.isInitialized = false;
        this.onWordCompleteCallback = null;
        this.onGameCompleteCallback = null;
        this.onProgressUpdateCallback = null;
        this.audioManager = null;
        this.uiController = null;
    }

    /**
     * Initialize game controller
     * @param {Object} dependencies - Required dependencies
     */
    initialize(dependencies = {}) {
        this.audioManager = dependencies.audioManager;
        this.uiController = dependencies.uiController;
        this.setupKeyboardHandlers();
        this.isInitialized = true;
    }

    /**
     * Set up keyboard event handlers
     */
    setupKeyboardHandlers() {
        // Enter key for word submission
        keyboardManager.registerKeyHandler(KEYS.ENTER, KeyboardShortcuts.enterKey(() => {
            if (gameState.isWordActive) {
                this.submitCurrentWord();
            }
        }));

        // Space key for audio repeat
        keyboardManager.registerKeyHandler(KEYS.SPACE, KeyboardShortcuts.spaceKey(() => {
            if (gameState.isWordActive && this.audioManager) {
                this.audioManager.playCurrentWord();
            }
        }));
    }

    /**
     * Start a new game
     * @param {Array} wordData - Array of word objects
     * @param {Object} settings - Game settings
     */
    async startGame(wordData, settings = {}) {
        if (!this.isInitialized) {
            throw new Error('GameController not initialized');
        }

        // Initialize game state
        gameState.initialize(wordData, settings);
        
        // Start the game
        gameState.startGame();
        
        // Start first word
        await this.startCurrentWord();
        
        // Update UI
        this.updateProgress();
    }

    /**
     * Start the current word
     */
    async startCurrentWord() {
        const currentWord = gameState.getCurrentWord();
        if (!currentWord) {
            this.endGame();
            return;
        }

        // Generate word puzzle
        const config = gameState.getConfiguration();
        const puzzle = wordGenerator.generatePuzzle(currentWord.word, config.level);
        
        // Update UI with new word
        if (this.uiController) {
            this.uiController.displayWord(puzzle, currentWord);
        }

        // Set up input listeners
        wordGenerator.setupInputListeners(
            (index, value) => this.onLetterInput(index, value),
            () => this.onAllLettersFilled()
        );

        // Start timer
        const timeoutThreshold = this.calculateTimeoutThreshold(currentWord.word, config);
        gameTimer.start(
            timeoutThreshold,
            config.showTimer,
            () => this.onWordTimeout(),
            (elapsed) => this.onTimerUpdate(elapsed)
        );

        // Play audio
        if (this.audioManager) {
            await this.audioManager.playWord(currentWord.word);
        }

        // Focus first input
        wordGenerator.focusFirstInput();
    }

    /**
     * Calculate timeout threshold for current word
     * @param {string} word - The word
     * @param {Object} config - Game configuration
     * @returns {number} - Timeout in seconds (0 for no timeout)
     */
    calculateTimeoutThreshold(word, config) {
        if (config.timeoutPerLetter <= 0) {
            return 0; // No timeout
        }

        const puzzle = wordGenerator.getCurrentPuzzle();
        const missingLetterCount = puzzle ? puzzle.missingCount : word.length;
        
        return Math.max(1, missingLetterCount * config.timeoutPerLetter);
    }

    /**
     * Handle letter input
     * @param {number} index - Letter index
     * @param {string} value - Input value
     */
    onLetterInput(index, value) {
        // Sanitize input
        const sanitized = sanitizeInput(value);
        
        // Update input field if sanitization changed the value
        const inputElement = document.getElementById(`input-${index}`);
        if (inputElement && inputElement.value !== sanitized) {
            inputElement.value = sanitized;
        }
    }

    /**
     * Handle when all letters are filled
     */
    onAllLettersFilled() {
        // Auto-submit if all fields are filled (optional behavior)
        // For now, we'll wait for Enter key
    }

    /**
     * Submit current word for checking
     */
    submitCurrentWord() {
        if (!gameState.isWordActive) {
            return;
        }

        const userInput = wordGenerator.getUserInput();
        const elapsedTime = gameTimer.getElapsedTime();
        const isTimeout = gameTimer.isTimeout();
        const isCorrect = wordGenerator.isCorrect();

        // Stop timer
        gameTimer.stop();

        // Determine result type
        let resultType;
        if (isTimeout && !isCorrect) {
            resultType = RESULT_TYPES.TIMEOUT_INCORRECT;
        } else if (isTimeout) {
            resultType = RESULT_TYPES.TIMEOUT;
        } else if (isCorrect) {
            resultType = RESULT_TYPES.SUCCESS;
        } else {
            resultType = RESULT_TYPES.INCORRECT;
        }

        // Record result
        gameState.recordResult(userInput, resultType, elapsedTime);

        // Show feedback
        this.showWordResult(resultType, userInput);

        // Call word complete callback
        if (this.onWordCompleteCallback) {
            this.onWordCompleteCallback(resultType, userInput, elapsedTime);
        }
    }

    /**
     * Show result for current word
     * @param {string} resultType - Type of result
     * @param {string} userInput - User's input
     */
    showWordResult(resultType, userInput) {
        if (!this.uiController) {
            return;
        }

        const currentWord = gameState.getCurrentWord();
        const correctAnswer = currentWord.word;

        switch (resultType) {
            case RESULT_TYPES.SUCCESS:
                this.uiController.showCorrectFeedback(correctAnswer);
                break;
            case RESULT_TYPES.INCORRECT:
            case RESULT_TYPES.TIMEOUT:
            case RESULT_TYPES.TIMEOUT_INCORRECT:
                this.uiController.showIncorrectFeedback(correctAnswer, userInput);
                break;
        }
    }

    /**
     * Handle word timeout
     */
    onWordTimeout() {
        // Don't auto-submit on timeout, let user continue
        // The timeout will be recorded when they submit
    }

    /**
     * Handle timer updates
     * @param {number} elapsed - Elapsed time in seconds
     */
    onTimerUpdate(elapsed) {
        // Timer updates are handled by the timer display itself
        // This can be used for additional logic if needed
    }

    /**
     * Move to next word
     */
    async nextWord() {
        const hasNext = gameState.nextWord();
        
        if (hasNext) {
            await this.startCurrentWord();
            this.updateProgress();
        } else {
            this.endGame();
        }
    }

    /**
     * End the current game
     */
    endGame() {
        gameState.endGame();
        gameTimer.stop();
        
        // Clear keyboard handlers for game
        keyboardManager.clearHandlers();
        
        // Call game complete callback
        if (this.onGameCompleteCallback) {
            this.onGameCompleteCallback(gameState.getStatistics());
        }
    }

    /**
     * Update progress display
     */
    updateProgress() {
        if (this.onProgressUpdateCallback) {
            this.onProgressUpdateCallback(gameState.getProgress());
        }
    }

    /**
     * Repeat current word audio
     */
    async repeatWord() {
        const currentWord = gameState.getCurrentWord();
        if (currentWord && this.audioManager) {
            await this.audioManager.playWord(currentWord.word);
        }
    }

    /**
     * Pause the game
     */
    pauseGame() {
        if (gameState.isWordActive) {
            gameTimer.stop();
            keyboardManager.disable();
        }
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (gameState.isWordActive) {
            const config = gameState.getConfiguration();
            const currentWord = gameState.getCurrentWord();
            const timeoutThreshold = this.calculateTimeoutThreshold(currentWord.word, config);
            
            gameTimer.start(
                timeoutThreshold,
                config.showTimer,
                () => this.onWordTimeout(),
                (elapsed) => this.onTimerUpdate(elapsed)
            );
            
            keyboardManager.enable();
        }
    }

    /**
     * Get current game status
     * @returns {Object} - Game status information
     */
    getGameStatus() {
        return {
            isActive: gameState.isGameActive,
            isWordActive: gameState.isWordActive,
            currentWord: gameState.getCurrentWord(),
            progress: gameState.getProgress(),
            statistics: gameState.getStatistics(),
            configuration: gameState.getConfiguration()
        };
    }

    /**
     * Start retry session with failed words
     * @returns {boolean} - True if retry session started
     */
    async startRetrySession() {
        if (!gameState.hasRetryWords()) {
            return false;
        }

        const success = gameState.startRetrySession();
        if (success) {
            await this.startCurrentWord();
            this.updateProgress();
        }
        
        return success;
    }

    /**
     * Set callback for word completion
     * @param {Function} callback - Callback function
     */
    setOnWordCompleteCallback(callback) {
        this.onWordCompleteCallback = callback;
    }

    /**
     * Set callback for game completion
     * @param {Function} callback - Callback function
     */
    setOnGameCompleteCallback(callback) {
        this.onGameCompleteCallback = callback;
    }

    /**
     * Set callback for progress updates
     * @param {Function} callback - Callback function
     */
    setOnProgressUpdateCallback(callback) {
        this.onProgressUpdateCallback = callback;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        gameTimer.reset();
        keyboardManager.clearHandlers();
        wordGenerator.reset();
        gameState.reset();
    }
}

// Global game controller instance
export const gameController = new GameController();
