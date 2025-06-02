// Main UI coordination

import { ELEMENTS, CSS_CLASSES, SUCCESS_MESSAGES } from '../app/config.js';
import { getElementById, showElement, hideElement, setText, setHTML, addClass, removeClass } from '../utils/helpers.js';

/**
 * UI controller class for managing user interface
 */
export class UIController {
    constructor() {
        this.currentView = 'data-source';
        this.isInitialized = false;
    }

    /**
     * Initialize UI controller
     */
    initialize() {
        this.setupInitialView();
        this.isInitialized = true;
    }

    /**
     * Set up initial view state
     */
    setupInitialView() {
        this.showDataSourceSelection();
        this.hideAllGameViews();
    }

    /**
     * Show data source selection view
     */
    showDataSourceSelection() {
        const dataSourceElement = getElementById(ELEMENTS.DATA_SOURCE_SELECTION);
        const contentElement = getElementById(ELEMENTS.CONTENT);
        
        if (dataSourceElement) showElement(dataSourceElement);
        if (contentElement) hideElement(contentElement);
        
        this.hideAllGameViews();
        this.currentView = 'data-source';
    }

    /**
     * Show level selection view
     */
    showLevelSelection() {
        const dataSourceElement = getElementById(ELEMENTS.DATA_SOURCE_SELECTION);
        const levelSelectionElement = getElementById(ELEMENTS.LEVEL_SELECTION);
        const contentElement = getElementById(ELEMENTS.CONTENT);
        
        if (dataSourceElement) hideElement(dataSourceElement);
        if (contentElement) showElement(contentElement);
        if (levelSelectionElement) showElement(levelSelectionElement);
        
        this.hideGameInterface();
        this.hideFinalResults();
        this.currentView = 'level-selection';
    }

    /**
     * Show word count selection
     * @param {number} totalWords - Total available words
     * @param {number} defaultCount - Default word count
     */
    showWordCountSelection(totalWords, defaultCount) {
        const wordCountElement = getElementById(ELEMENTS.WORD_COUNT_SELECTION);
        const totalWordsElement = getElementById(ELEMENTS.TOTAL_WORDS_COUNT);
        const wordCountInput = getElementById(ELEMENTS.WORD_COUNT_INPUT);
        
        if (wordCountElement) {
            showElement(wordCountElement);
        }
        
        if (totalWordsElement) {
            setText(totalWordsElement, totalWords.toString());
        }
        
        if (wordCountInput) {
            wordCountInput.value = Math.min(defaultCount, totalWords).toString();
            wordCountInput.max = totalWords.toString();
        }
    }

    /**
     * Hide word count selection
     */
    hideWordCountSelection() {
        const wordCountElement = getElementById(ELEMENTS.WORD_COUNT_SELECTION);
        if (wordCountElement) {
            hideElement(wordCountElement);
        }
    }

    /**
     * Show game interface
     */
    showGameInterface() {
        const gameInterfaceElement = getElementById(ELEMENTS.GAME_INTERFACE);
        const levelSelectionElement = getElementById(ELEMENTS.LEVEL_SELECTION);
        
        if (levelSelectionElement) hideElement(levelSelectionElement);
        if (gameInterfaceElement) showElement(gameInterfaceElement);
        
        this.hideWordCountSelection();
        this.hideFinalResults();
        this.showBackButton();
        this.currentView = 'game';
    }

    /**
     * Hide game interface
     */
    hideGameInterface() {
        const gameInterfaceElement = getElementById(ELEMENTS.GAME_INTERFACE);
        if (gameInterfaceElement) {
            hideElement(gameInterfaceElement);
        }
        this.hideBackButton();
    }

    /**
     * Show final results
     */
    showFinalResults() {
        const finalResultsElement = getElementById(ELEMENTS.FINAL_RESULTS);
        const gameInterfaceElement = getElementById(ELEMENTS.GAME_INTERFACE);
        
        if (gameInterfaceElement) hideElement(gameInterfaceElement);
        if (finalResultsElement) showElement(finalResultsElement);
        
        this.currentView = 'results';
    }

    /**
     * Hide final results
     */
    hideFinalResults() {
        const finalResultsElement = getElementById(ELEMENTS.FINAL_RESULTS);
        if (finalResultsElement) {
            hideElement(finalResultsElement);
        }
    }

    /**
     * Hide all game views
     */
    hideAllGameViews() {
        this.hideGameInterface();
        this.hideFinalResults();
        this.hideWordCountSelection();
        
        const levelSelectionElement = getElementById(ELEMENTS.LEVEL_SELECTION);
        if (levelSelectionElement) {
            hideElement(levelSelectionElement);
        }
    }

    /**
     * Display word puzzle in game interface
     * @param {Object} puzzle - Word puzzle object
     * @param {Object} wordData - Word data object
     */
    displayWord(puzzle, wordData) {
        const wordDisplayElement = getElementById(ELEMENTS.WORD_DISPLAY);
        const wordDescriptionElement = getElementById(ELEMENTS.WORD_DESCRIPTION);
        
        if (wordDisplayElement) {
            setHTML(wordDisplayElement, puzzle.displayHTML);
        }
        
        if (wordDescriptionElement && wordData.description) {
            setHTML(wordDescriptionElement, `
                <strong>Description:</strong> ${wordData.description}
            `);
            showElement(wordDescriptionElement);
        } else if (wordDescriptionElement) {
            hideElement(wordDescriptionElement);
        }
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
     * Show correct answer feedback
     * @param {string} correctAnswer - The correct answer
     */
    showCorrectFeedback(correctAnswer) {
        const feedbackElement = getElementById(ELEMENTS.FEEDBACK);
        if (feedbackElement) {
            addClass(feedbackElement, CSS_CLASSES.CORRECT);
            removeClass(feedbackElement, CSS_CLASSES.INCORRECT);
            
            setHTML(feedbackElement, `
                <div class="correct-feedback">
                    <div class="correct-word-display">${correctAnswer}</div>
                    <div style="font-size: 1.2em; margin-top: 10px;">✅ Correct! Well done!</div>
                </div>
            `);
        }
    }

    /**
     * Show incorrect answer feedback
     * @param {string} correctAnswer - The correct answer
     * @param {string} userAnswer - User's answer
     */
    showIncorrectFeedback(correctAnswer, userAnswer) {
        const feedbackElement = getElementById(ELEMENTS.FEEDBACK);
        if (feedbackElement) {
            removeClass(feedbackElement, CSS_CLASSES.CORRECT);
            addClass(feedbackElement, CSS_CLASSES.INCORRECT);
            
            const highlightedAnswer = this.highlightDifferences(correctAnswer, userAnswer);
            
            setHTML(feedbackElement, `
                <div class="comparison-section">
                    <div class="correct-word-display">${highlightedAnswer}</div>
                    <div style="font-size: 1.1em; margin-top: 15px; color: #FFB6C1;">
                        ❌ Not quite right. The correct spelling is shown above.
                    </div>
                </div>
            `);
        }
    }

    /**
     * Highlight differences between correct and user answers
     * @param {string} correct - Correct answer
     * @param {string} user - User answer
     * @returns {string} - HTML with highlighted differences
     */
    highlightDifferences(correct, user) {
        const correctLetters = correct.split('');
        const userLetters = user.split('');
        
        return correctLetters.map((letter, index) => {
            const userLetter = userLetters[index] || '';
            const isDifferent = letter.toLowerCase() !== userLetter.toLowerCase();
            
            if (isDifferent) {
                return `<span style="background-color: rgba(255, 255, 0, 0.3); font-weight: bold;">${letter}</span>`;
            } else {
                return letter;
            }
        }).join('');
    }

    /**
     * Clear feedback display
     */
    clearFeedback() {
        const feedbackElement = getElementById(ELEMENTS.FEEDBACK);
        if (feedbackElement) {
            removeClass(feedbackElement, CSS_CLASSES.CORRECT);
            removeClass(feedbackElement, CSS_CLASSES.INCORRECT);
            setText(feedbackElement, '');
        }
    }

    /**
     * Display final score
     * @param {Object} scoreData - Complete score data
     */
    displayFinalScore(scoreData) {
        const finalScoreElement = getElementById(ELEMENTS.FINAL_SCORE);
        if (finalScoreElement) {
            const stats = scoreData.statistics;
            const perf = scoreData.performance;
            
            setHTML(finalScoreElement, `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 2em; color: #90EE90; margin-bottom: 10px;">
                        Score: ${scoreData.totalScore} / ${scoreData.maxPossibleScore}
                    </div>
                    <div style="font-size: 1.5em; margin-bottom: 15px;">
                        Grade: ${perf.grade} (${perf.efficiency}% efficiency)
                    </div>
                </div>
                
                <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                    <div style="margin-bottom: 10px;">
                        ✅ Correct: ${stats.correctCount}
                    </div>
                    <div style="margin-bottom: 10px;">
                        ❌ Incorrect: ${stats.incorrectCount}
                    </div>
                    <div style="margin-bottom: 10px;">
                        ⏰ Timeouts: ${stats.timeoutCount}
                    </div>
                    <div style="margin-bottom: 10px;">
                        📊 Accuracy: ${perf.accuracy}%
                    </div>
                    ${stats.averageTime > 0 ? `
                    <div style="margin-bottom: 10px;">
                        ⏱️ Average time: ${stats.averageTime}s
                    </div>
                    ` : ''}
                    ${stats.totalTimeBonus > 0 ? `
                    <div style="margin-bottom: 10px;">
                        🚀 Speed bonus: ${stats.totalTimeBonus} points
                    </div>
                    ` : ''}
                </div>
            `);
        }
    }

    /**
     * Show back button
     */
    showBackButton() {
        const backButton = getElementById(ELEMENTS.BACK_BUTTON);
        if (backButton) {
            showElement(backButton, 'flex');
        }
    }

    /**
     * Hide back button
     */
    hideBackButton() {
        const backButton = getElementById(ELEMENTS.BACK_BUTTON);
        if (backButton) {
            hideElement(backButton);
        }
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        const contentElement = getElementById(ELEMENTS.CONTENT);
        if (contentElement) {
            setHTML(contentElement, `<div class="loading">${message}</div>`);
            showElement(contentElement);
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const contentElement = getElementById(ELEMENTS.CONTENT);
        if (contentElement) {
            setHTML(contentElement, `<div class="error">Error: ${message}</div>`);
            showElement(contentElement);
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message = SUCCESS_MESSAGES.DATA_LOADED) {
        const contentElement = getElementById(ELEMENTS.CONTENT);
        if (contentElement) {
            setHTML(contentElement, `<div style="color: #90EE90; font-size: 1.2em;">${message}</div>`);
            showElement(contentElement);
        }
    }

    /**
     * Get current view
     * @returns {string} - Current view name
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Check if UI is initialized
     * @returns {boolean} - True if initialized
     */
    isUIInitialized() {
        return this.isInitialized;
    }
}

// Global UI controller instance
export const uiController = new UIController();
