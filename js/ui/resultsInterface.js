// Final results and retry interface functionality

// Show final results screen
function showFinalResults() {
    // Hide game interface and word count selection, show results
    document.getElementById('game-interface').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    document.getElementById('final-results').style.display = 'block';

    // Update back button visibility
    if (typeof updateBackButtonVisibility === 'function') {
        updateBackButtonVisibility();
    }

    // Calculate enhanced statistics
    const perfectCount = wordResults.filter(result => result.result === 'success').length;
    const timeoutCount = wordResults.filter(result => result.result === 'timeout').length;
    const incorrectCount = wordResults.filter(result => result.result === 'incorrect').length;
    const timeoutIncorrectCount = wordResults.filter(result => result.result === 'timeout_incorrect').length;

    // Calculate average times
    const perfectTimes = wordResults.filter(r => r.result === 'success').map(r => r.timeElapsed);
    const timeoutTimes = wordResults.filter(r => r.result === 'timeout').map(r => r.timeElapsed);
    const incorrectTimes = wordResults.filter(r => r.result === 'incorrect').map(r => r.timeElapsed);
    const timeoutIncorrectTimes = wordResults.filter(r => r.result === 'timeout_incorrect').map(r => r.timeElapsed);

    const avgPerfectTime = perfectTimes.length > 0 ? (perfectTimes.reduce((a, b) => a + b, 0) / perfectTimes.length) : 0;
    const avgTimeoutTime = timeoutTimes.length > 0 ? (timeoutTimes.reduce((a, b) => a + b, 0) / timeoutTimes.length) : 0;
    const avgIncorrectTime = incorrectTimes.length > 0 ? (incorrectTimes.reduce((a, b) => a + b, 0) / incorrectTimes.length) : 0;
    const avgTimeoutIncorrectTime = timeoutIncorrectTimes.length > 0 ? (timeoutIncorrectTimes.reduce((a, b) => a + b, 0) / timeoutIncorrectTimes.length) : 0;

    const percentage = Math.round((perfectCount / totalWords) * 100);

    let resultHTML = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 1.2em; margin-bottom: 10px;">Game Complete!</div>
            ${hasTimeLimit ? `<div style="font-size: 1em; color: #E6E6FA;">Settings: Level ${selectedLevel}, ${timeoutPerLetter}s per missing letter</div>` : `<div style="font-size: 1em; color: #E6E6FA;">Settings: Level ${selectedLevel}, No time limit</div>`}
        </div>

        <div style="font-size: 1.1em; margin-bottom: 20px;">
            Perfect Score: ${perfectCount}/${totalWords} (${percentage}%)
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

    // Add retry buttons based on what needs to be retried
    const retryWordsCount = wordRetryData.length;
    if (retryWordsCount > 0) {
        const timeoutRetryCount = wordRetryData.filter(w => w.reason === 'timeout').length;
        const incorrectRetryCount = wordRetryData.filter(w => w.reason === 'incorrect').length;

        resultHTML += `<div style="margin: 20px 0;">`;

        if (timeoutRetryCount > 0 && incorrectRetryCount > 0) {
            resultHTML += `
                <button class="start-button" onclick="startRetryGame()">
                    Retry All Words (${retryWordsCount})
                </button><br>
                <div style="font-size: 0.9em; opacity: 0.8; margin: 10px 0;">
                    ${timeoutRetryCount} slow words + ${incorrectRetryCount} incorrect words
                </div>
            `;
        } else if (timeoutRetryCount > 0) {
            resultHTML += `
                <button class="start-button" onclick="startRetryGame()">
                    Retry Slow Words (${timeoutRetryCount})
                </button><br>
                <div style="font-size: 0.9em; opacity: 0.8; margin: 10px 0;">
                    Practice for speed improvement
                </div>
            `;
        } else {
            resultHTML += `
                <button class="start-button" onclick="startRetryGame()">
                    Retry Incorrect Words (${incorrectRetryCount})
                </button><br>
                <div style="font-size: 0.9em; opacity: 0.8; margin: 10px 0;">
                    Practice for accuracy improvement
                </div>
            `;
        }

        resultHTML += `
            <div style="font-size: 0.9em; opacity: 0.8; margin-top: 10px;">
                💡 Tip: Press <strong>Enter</strong> to retry words
            </div>
        </div>`;
    } else {
        resultHTML += `<div style="margin: 20px 0; font-size: 1.2em; color: #90EE90;">🎉 Perfect Performance! 🎉</div>`;
    }

    // Always show play again button
    resultHTML += `
        <button class="start-button" onclick="restartGame()">Play Again</button>
    `;

    document.getElementById('final-score').innerHTML = resultHTML;

    // Add keyboard shortcut ONLY if there are words to retry
    if (retryWordsCount > 0) {
        // Use setTimeout to ensure the page is fully rendered first
        setTimeout(() => {
            addRetryKeyboardShortcut();
        }, 100);
    }
}

// Restart game function
function restartGame() {
    // Remove retry keyboard shortcut
    removeRetryKeyboardShortcut();

    // Reset and show data source selection
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('content').style.display = 'none';
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    document.getElementById('data-source-selection').style.display = 'block';

    // Update back button visibility
    if (typeof updateBackButtonVisibility === 'function') {
        updateBackButtonVisibility();
    }
}

// Add keyboard shortcut for retry functionality
function addRetryKeyboardShortcut() {
    document.addEventListener('keydown', handleRetryKeydown);
}

// Remove keyboard shortcut for retry functionality
function removeRetryKeyboardShortcut() {
    document.removeEventListener('keydown', handleRetryKeydown);
}

// Handle Enter key press on final results page
function handleRetryKeydown(event) {
    if (event.key === 'Enter') {
        // Only work if we're specifically on the final results page
        const finalResults = document.getElementById('final-results');
        const gameInterface = document.getElementById('game-interface');

        // Make sure we're on results page AND not in game
        if (finalResults.style.display === 'block' && gameInterface.style.display === 'none') {
            const retryWordsCount = wordRetryData.length;
            if (retryWordsCount > 0) {
                // Retry words that need retrying
                event.preventDefault(); // Prevent any other Enter key behavior
                startRetryGame();
            } else {
                // No words to retry, restart game instead
                event.preventDefault();
                restartGame();
            }
        }
    }
}

// Calculate performance grade based on percentage
function calculatePerformanceGrade(percentage) {
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
function getPerformanceRecommendations(perfectCount, timeoutCount, incorrectCount, timeoutIncorrectCount, totalWords) {
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

// Export functions for global access
window.showFinalResults = showFinalResults;
window.restartGame = restartGame;
window.addRetryKeyboardShortcut = addRetryKeyboardShortcut;
window.removeRetryKeyboardShortcut = removeRetryKeyboardShortcut;
window.handleRetryKeydown = handleRetryKeydown;
window.calculatePerformanceGrade = calculatePerformanceGrade;
window.getPerformanceRecommendations = getPerformanceRecommendations;
