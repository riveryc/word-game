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
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("[resultsInterface.showFinalResults] CALLED (Restoring ALL listeners). cA:", correctAnswers, "tW:", totalWordsInGame, "canRetry:", canRetry);
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

    const gameInterface = document.getElementById('game-interface');
    if (gameInterface) {
        gameInterface.style.display = 'none';
    } else {
        console.error("[resultsInterface.showFinalResults] #game-interface not found!");
    }

    const wordCountSelection = document.getElementById('word-count-selection');
    if (wordCountSelection) {
        wordCountSelection.style.display = 'none';
    }

    const finalResultsDiv = document.getElementById('final-results');
    if (!finalResultsDiv) {
        console.error("[resultsInterface.showFinalResults] CRITICAL: #final-results div not found! Cannot show results.");
        return;
    }
    finalResultsDiv.style.display = 'block';

    if (typeof updateBackButtonVisibility === 'function') {
        updateBackButtonVisibility();
    }

    const perfectCount = resultsData.filter(result => result.status === 'success').length;
    const timeoutCount = resultsData.filter(result => result.status === 'timeout').length;
    const incorrectCount = resultsData.filter(result => result.status === 'incorrect').length;
    const timeoutIncorrectCount = resultsData.filter(result => result.status === 'timeout_incorrect').length;
    const parseTime = (timeStr) => {
        if (typeof timeStr === 'string') return parseFloat(timeStr.replace('s', ''));
        if (typeof timeStr === 'number') return timeStr;
        return 0;
    };
    const perfectTimes = resultsData.filter(r => r.status === 'success').map(r => parseTime(r.time));
    const timeoutTimes = resultsData.filter(r => r.status === 'timeout').map(r => parseTime(r.time));
    const incorrectTimes = resultsData.filter(r => r.status === 'incorrect').map(r => parseTime(r.time));
    const timeoutIncorrectTimes = resultsData.filter(r => r.status === 'timeout_incorrect').map(r => parseTime(r.time));
    const avgPerfectTime = perfectTimes.length > 0 ? (perfectTimes.reduce((a, b) => a + b, 0) / perfectTimes.length) : 0;
    const avgTimeoutTime = timeoutTimes.length > 0 ? (timeoutTimes.reduce((a, b) => a + b, 0) / timeoutTimes.length) : 0;
    const avgIncorrectTime = incorrectTimes.length > 0 ? (incorrectTimes.reduce((a, b) => a + b, 0) / incorrectTimes.length) : 0;
    const avgTimeoutIncorrectTime = timeoutIncorrectTimes.length > 0 ? (timeoutIncorrectTimes.reduce((a, b) => a + b, 0) / timeoutIncorrectTimes.length) : 0;
    const percentage = totalWordsInGame > 0 ? Math.round((perfectCount / totalWordsInGame) * 100) : 0;
    const currentLevel = getCurrentSelectedLevel(); 
    const gameHasTimeLimit = getHasTimeLimit(); 
    const gameTimeoutPerLetter = getTimeoutPerLetter(); 
    let resultHTML = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 1.2em; margin-bottom: 10px;">Game Complete!</div>
            ${gameHasTimeLimit ? `<div style="font-size: 1em; color: #E6E6FA;">Settings: Level ${currentLevel}, ${gameTimeoutPerLetter}s per missing letter</div>` : `<div style="font-size: 1em; color: #E6E6FA;">Settings: Level ${currentLevel}, No time limit</div>`}
        </div>
        <div style="font-size: 1.1em; margin-bottom: 20px;">Perfect Score: ${perfectCount}/${totalWordsInGame} (${percentage}%)
        </div>
        <div style="background-color: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 10px; margin: 20px 0;">
            <div style="font-size: 1.1em; font-weight: bold; margin-bottom: 10px;">📊 Performance Summary:</div>
    `;
    if (perfectCount > 0) resultHTML += `<div style="color: #90EE90; margin: 5px 0;">✅ Perfect: ${perfectCount} words (avg: ${avgPerfectTime.toFixed(1)}s)</div>`;
    if (timeoutCount > 0) resultHTML += `<div style="color: #FFD700; margin: 5px 0;">⚠️ Correct but slow: ${timeoutCount} words (avg: ${avgTimeoutTime.toFixed(1)}s)</div>`;
    if (incorrectCount > 0) resultHTML += `<div style="color: #FFB6C1; margin: 5px 0;">❌ Incorrect: ${incorrectCount} words (avg: ${avgIncorrectTime.toFixed(1)}s)</div>`;
    if (timeoutIncorrectCount > 0) resultHTML += `<div style="color: #FF6B6B; margin: 5px 0;">❌⚠️ Wrong & slow: ${timeoutIncorrectCount} words (avg: ${avgTimeoutIncorrectTime.toFixed(1)}s)</div>`;
    resultHTML += `</div>`;
    if (canRetry) {
        resultHTML += `
        <div style="margin: 20px 0;">
            <button class="start-button" id="results-retry-button"> Retry Challenging Words</button><br>
            <div style="font-size: 0.9em; opacity: 0.8; margin: 10px 0;">Practice words that were incorrect or too slow.</div>
            <div style="font-size: 0.9em; opacity: 0.8; margin-top: 10px;">💡 Tip: Press <strong>Enter</strong> to retry words</div>
        </div>`;
    } else {
        resultHTML += `<div style="margin: 20px 0; font-size: 1.2em; color: #90EE90;">🎉 Perfect Performance! 🎉</div>`;
    }
    resultHTML += `
        <button class="start-button" id="results-play-again-button">Play Again</button>
    `;

    const finalScoreDiv = document.getElementById('final-score');
    if (finalScoreDiv) {
        finalScoreDiv.innerHTML = resultHTML;
    } else {
        console.error("[resultsInterface.showFinalResults] CRITICAL: #final-score div for generated HTML not found!");
    }

    const playAgainButton = document.getElementById('results-play-again-button');
    if (playAgainButton) {
        playAgainButton.addEventListener('click', restartGame);
        console.log("[resultsInterface.showFinalResults] Event listener for 'Play Again' button ADDED.");
    } else {
        console.error("[resultsInterface.showFinalResults] 'Play Again' button not found for event listener.");
    }

    // Restore Retry button listener and keyboard shortcut setup
    if (canRetry) {
        const retryButton = document.getElementById('results-retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', initiateRetryFlow);
            console.log("[resultsInterface.showFinalResults] Event listener for 'Retry' button ADDED.");
        } else {
            console.error("[resultsInterface.showFinalResults] 'Retry' button not found for event listener (when canRetry is true).");
        }
        
        setTimeout(() => addRetryKeyboardShortcut(), 100);
        console.log("[resultsInterface.showFinalResults] Keyboard shortcut for retry will be ADDED via setTimeout.");
    }
}

// New function to handle UI changes and start retry
function initiateRetryFlow() {
    const finalResultsDiv = document.getElementById('final-results');
    const gameInterfaceDiv = document.getElementById('game-interface');

    if (finalResultsDiv) finalResultsDiv.style.display = 'none';
    if (gameInterfaceDiv) gameInterfaceDiv.style.display = 'block';
    
    removeRetryKeyboardShortcut(); // Remove listener to prevent multiple triggers if user hits Enter quickly
    startRetryGameInManager(); // from gameManager
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
                initiateRetryFlow(); // Changed to initiateRetryFlow
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
