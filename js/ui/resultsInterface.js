// Final results and retry interface functionality

import { 
    startRetryGame as startRetryGameInManager, 
    getGameStatusForRetry,
    getCurrentSelectedLevel 
} from '../game/gameManager.js';
import { getHasTimeLimit, getTimeoutPerLetter } from '../game/timerManager.js';
import { updateBackButtonVisibility } from './confirmationDialog.js'; // Assuming this is exported from confirmationDialog.js

// Show final results screen
// Parameters expected:
// - correctAnswers: number
// - totalWordsInGame: number
// - resultsData: Array of { word: string, status: string, time: string, description: string, exampleSentence: string }
// - canRetry: boolean (is wordRetryData.length > 0 from gameManager)
// - isRetryModeFlag: boolean
export function showFinalResults(correctAnswers, totalWordsInGame, resultsData, canRetry, isRetryModeFlag) {
    // Hide game interface and word count selection, show results
    document.getElementById('game-interface').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    document.getElementById('final-results').style.display = 'block';

    // Update back button visibility
    if (typeof updateBackButtonVisibility === 'function') {
        updateBackButtonVisibility();
    }

    // Calculate enhanced statistics from resultsData (which now contains word details)
    // resultsData items have: { word, status ('success', 'timeout', 'incorrect', 'timeout_incorrect'), time (string 'X.Xs') }
    const perfectCount = resultsData.filter(result => result.status === 'success').length;
    const timeoutCount = resultsData.filter(result => result.status === 'timeout').length;
    const incorrectCount = resultsData.filter(result => result.status === 'incorrect').length;
    const timeoutIncorrectCount = resultsData.filter(result => result.status === 'timeout_incorrect').length;

    // Helper to parse time string 'X.Xs' to float
    const parseTime = (timeStr) => parseFloat(timeStr.replace('s', ''));

    const perfectTimes = resultsData.filter(r => r.status === 'success').map(r => parseTime(r.time));
    const timeoutTimes = resultsData.filter(r => r.status === 'timeout').map(r => parseTime(r.time));
    const incorrectTimes = resultsData.filter(r => r.status === 'incorrect').map(r => parseTime(r.time));
    const timeoutIncorrectTimes = resultsData.filter(r => r.status === 'timeout_incorrect').map(r => parseTime(r.time));

    const avgPerfectTime = perfectTimes.length > 0 ? (perfectTimes.reduce((a, b) => a + b, 0) / perfectTimes.length) : 0;
    const avgTimeoutTime = timeoutTimes.length > 0 ? (timeoutTimes.reduce((a, b) => a + b, 0) / timeoutTimes.length) : 0;
    const avgIncorrectTime = incorrectTimes.length > 0 ? (incorrectTimes.reduce((a, b) => a + b, 0) / incorrectTimes.length) : 0;
    const avgTimeoutIncorrectTime = timeoutIncorrectTimes.length > 0 ? (timeoutIncorrectTimes.reduce((a, b) => a + b, 0) / timeoutIncorrectTimes.length) : 0;

    const percentage = totalWordsInGame > 0 ? Math.round((perfectCount / totalWordsInGame) * 100) : 0;
    
    const currentLevel = getCurrentSelectedLevel(); // from gameManager
    const gameHasTimeLimit = getHasTimeLimit(); // from timerManager
    const gameTimeoutPerLetter = getTimeoutPerLetter(); // from timerManager

    let resultHTML = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 1.2em; margin-bottom: 10px;">Game Complete!</div>
            ${gameHasTimeLimit ? `<div style="font-size: 1em; color: #E6E6FA;">Settings: Level ${currentLevel}, ${gameTimeoutPerLetter}s per missing letter</div>` : `<div style="font-size: 1em; color: #E6E6FA;">Settings: Level ${currentLevel}, No time limit</div>`}
        </div>

        <div style="font-size: 1.1em; margin-bottom: 20px;">
            Perfect Score: ${perfectCount}/${totalWordsInGame} (${percentage}%)
        </div>

        <div style="background-color: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 10px; margin: 20px 0;">
            <div style="font-size: 1.1em; font-weight: bold; margin-bottom: 10px;">📊 Performance Summary:</div>
    `;

    if (perfectCount > 0) {
        resultHTML += `<div style="color: #90EE90; margin: 5px 0;">✅ Perfect: ${perfectCount} words (avg: ${avgPerfectTime.toFixed(1)}s)</div>`;
    }

    if (timeoutCount > 0) {
        resultHTML += `<div style="color: #FFD700; margin: 5px 0;">⚠️ Correct but slow: ${timeoutCount} words (avg: ${avgTimeoutTime.toFixed(1)}s)</div>`;
    }

    if (incorrectCount > 0) {
        resultHTML += `<div style="color: #FFB6C1; margin: 5px 0;">❌ Incorrect: ${incorrectCount} words (avg: ${avgIncorrectTime.toFixed(1)}s)</div>`;
    }

    if (timeoutIncorrectCount > 0) {
        resultHTML += `<div style="color: #FF6B6B; margin: 5px 0;">❌⚠️ Wrong & slow: ${timeoutIncorrectCount} words (avg: ${avgTimeoutIncorrectTime.toFixed(1)}s)</div>`;
    }

    resultHTML += `</div>`;

    if (canRetry) {
        // Determine counts for button text (wordRetryData itself is not directly accessed here anymore)
        // This info would ideally come from gameManager if more detailed text is needed, 
        // or script.js can prepare it. For now, generic text based on `canRetry`.
        resultHTML += `
        <div style="margin: 20px 0;">
            <button class="start-button" id="results-retry-button">
                Retry Challenging Words
            </button><br>
            <div style="font-size: 0.9em; opacity: 0.8; margin: 10px 0;">
                Practice words that were incorrect or too slow.
            </div>
            <div style="font-size: 0.9em; opacity: 0.8; margin-top: 10px;">
                💡 Tip: Press <strong>Enter</strong> to retry words
            </div>
        </div>`;
    } else {
        resultHTML += `<div style="margin: 20px 0; font-size: 1.2em; color: #90EE90;">🎉 Perfect Performance! 🎉</div>`;
    }

    resultHTML += `
        <button class="start-button" id="results-play-again-button">Play Again</button>
    `;

    document.getElementById('final-score').innerHTML = resultHTML;

    // Add event listeners programmatically
    if (canRetry) {
        const retryButton = document.getElementById('results-retry-button');
        if (retryButton) retryButton.addEventListener('click', startRetryGameInManager);
    }
    const playAgainButton = document.getElementById('results-play-again-button');
    if (playAgainButton) playAgainButton.addEventListener('click', restartGame);
    
    if (canRetry) {
        setTimeout(() => addRetryKeyboardShortcut(), 100);
    }
}

// Restart game function (goes back to data source selection)
export function restartGame() {
    removeRetryKeyboardShortcut();
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('content').style.display = 'none';
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    document.getElementById('data-source-selection').style.display = 'block';
    if (typeof updateBackButtonVisibility === 'function') {
        updateBackButtonVisibility();
    }
}

// Add keyboard shortcut for retry functionality
export function addRetryKeyboardShortcut() {
    document.addEventListener('keydown', handleRetryKeydown);
}

// Remove keyboard shortcut for retry functionality
export function removeRetryKeyboardShortcut() {
    document.removeEventListener('keydown', handleRetryKeydown);
}

// Handle Enter key press on final results page
export function handleRetryKeydown(event) {
    if (event.key === 'Enter') {
        const finalResultsDiv = document.getElementById('final-results');
        const gameInterfaceDiv = document.getElementById('game-interface');

        if (finalResultsDiv.style.display === 'block' && gameInterfaceDiv.style.display === 'none') {
            const status = getGameStatusForRetry(); // from gameManager
            if (status.canRetry) {
                event.preventDefault();
                startRetryGameInManager(); // from gameManager
            } else {
                event.preventDefault();
                restartGame(); // local restartGame function
            }
        }
    }
}

// Calculate performance grade based on percentage
export function calculatePerformanceGrade(percentage) {
    if (percentage >= 95) return { grade: 'A+', message: 'Outstanding!' };
    if (percentage >= 90) return { grade: 'A', message: 'Excellent!' };
    if (percentage >= 85) return { grade: 'A-', message: 'Very Good!' };
    if (percentage >= 80) return { grade: 'B+', message: 'Good!' };
    if (percentage >= 75) return { grade: 'B', message: 'Well Done!' };
    if (percentage >= 70) return { grade: 'B-', message: 'Nice Work!' };
    if (percentage >= 65) return { grade: 'C+', message: 'Keep Practicing!' };
    if (percentage >= 60) return { grade: 'C', message: 'Getting Better!' };
    if (percentage >= 50) return { grade: 'C-', message: 'Keep Trying!' };
    return { grade: 'D', message: 'Practice More!' };
}

// Get performance recommendations based on results
export function getPerformanceRecommendations(perfectCount, timeoutCount, incorrectCount, timeoutIncorrectCount, totalWords) {
    const recommendations = [];
    const percentage = totalWords > 0 ? Math.round((perfectCount / totalWords) * 100) : 0;

    if (percentage >= 90) {
        recommendations.push("🎯 Try a harder difficulty level for more challenge");
        recommendations.push("⚡ Consider reducing the time limit to improve speed");
    } else if (incorrectCount + timeoutIncorrectCount > totalWords * 0.3) {
        recommendations.push("📚 Focus on accuracy - take your time to think");
        recommendations.push("🔤 Practice spelling patterns and word families");
        recommendations.push("📖 Read the descriptions carefully for context clues");
    } else if (timeoutCount > totalWords * 0.2) {
        recommendations.push("⏰ Work on speed - try to respond faster");
        recommendations.push("🧠 Practice recognizing common letter patterns");
        recommendations.push("💪 Build confidence with easier words first");
    }

    if (totalWords < 20) {
        recommendations.push("📈 Try practicing with more words for better improvement");
    }

    return recommendations;
}
