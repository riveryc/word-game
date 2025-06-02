// Scoring and results tracking

import { RESULT_TYPES, GAME_CONFIG } from '../config.js';

/**
 * Scoring manager class
 */
export class ScoringManager {
    constructor() {
        this.scoreWeights = {
            correct: 100,
            incorrect: 0,
            timeout: 25,
            timeoutIncorrect: 0
        };
        
        this.timeBonus = {
            enabled: true,
            maxBonus: 50,
            fastThreshold: 0.5 // 50% of allowed time
        };
    }

    /**
     * Calculate score for a single word result
     * @param {Object} result - Word result object
     * @param {number} timeoutThreshold - Timeout threshold for the word
     * @returns {Object} - Score breakdown
     */
    calculateWordScore(result, timeoutThreshold = 0) {
        const scoreBreakdown = {
            baseScore: 0,
            timeBonus: 0,
            totalScore: 0,
            details: {}
        };

        // Base score based on result type
        switch (result.resultType) {
            case RESULT_TYPES.SUCCESS:
                scoreBreakdown.baseScore = this.scoreWeights.correct;
                break;
            case RESULT_TYPES.TIMEOUT:
                scoreBreakdown.baseScore = this.scoreWeights.timeout;
                break;
            case RESULT_TYPES.INCORRECT:
                scoreBreakdown.baseScore = this.scoreWeights.incorrect;
                break;
            case RESULT_TYPES.TIMEOUT_INCORRECT:
                scoreBreakdown.baseScore = this.scoreWeights.timeoutIncorrect;
                break;
            default:
                scoreBreakdown.baseScore = 0;
        }

        // Time bonus for correct answers
        if (result.resultType === RESULT_TYPES.SUCCESS && this.timeBonus.enabled && timeoutThreshold > 0) {
            scoreBreakdown.timeBonus = this.calculateTimeBonus(result.elapsedTime, timeoutThreshold);
        }

        scoreBreakdown.totalScore = scoreBreakdown.baseScore + scoreBreakdown.timeBonus;
        
        // Add details
        scoreBreakdown.details = {
            resultType: result.resultType,
            elapsedTime: result.elapsedTime,
            timeoutThreshold: timeoutThreshold,
            word: result.word.word
        };

        return scoreBreakdown;
    }

    /**
     * Calculate time bonus for fast responses
     * @param {number} elapsedTime - Time taken in seconds
     * @param {number} timeoutThreshold - Maximum allowed time
     * @returns {number} - Time bonus points
     */
    calculateTimeBonus(elapsedTime, timeoutThreshold) {
        if (timeoutThreshold <= 0 || elapsedTime >= timeoutThreshold) {
            return 0;
        }

        const fastThresholdTime = timeoutThreshold * this.timeBonus.fastThreshold;
        
        if (elapsedTime <= fastThresholdTime) {
            // Full bonus for very fast responses
            return this.timeBonus.maxBonus;
        } else {
            // Scaled bonus based on speed
            const remainingTime = timeoutThreshold - elapsedTime;
            const bonusTime = timeoutThreshold - fastThresholdTime;
            const bonusRatio = remainingTime / bonusTime;
            return Math.round(this.timeBonus.maxBonus * bonusRatio);
        }
    }

    /**
     * Calculate total game score
     * @param {Array} results - Array of word results
     * @param {Object} gameConfig - Game configuration
     * @returns {Object} - Complete score breakdown
     */
    calculateGameScore(results, gameConfig) {
        const scoreData = {
            totalScore: 0,
            maxPossibleScore: 0,
            wordScores: [],
            statistics: {
                correctCount: 0,
                incorrectCount: 0,
                timeoutCount: 0,
                averageTime: 0,
                fastestTime: Infinity,
                slowestTime: 0,
                totalTimeBonus: 0
            },
            performance: {
                accuracy: 0,
                speed: 0,
                efficiency: 0,
                grade: 'F'
            }
        };

        if (results.length === 0) {
            return scoreData;
        }

        // Calculate individual word scores
        results.forEach(result => {
            const timeoutThreshold = this.calculateWordTimeout(result.word.word, gameConfig);
            const wordScore = this.calculateWordScore(result, timeoutThreshold);
            
            scoreData.wordScores.push(wordScore);
            scoreData.totalScore += wordScore.totalScore;
            scoreData.maxPossibleScore += this.scoreWeights.correct + this.timeBonus.maxBonus;
            
            // Update statistics
            this.updateStatistics(scoreData.statistics, result, wordScore);
        });

        // Calculate performance metrics
        this.calculatePerformanceMetrics(scoreData, results.length);

        return scoreData;
    }

    /**
     * Calculate timeout threshold for a word
     * @param {string} word - The word
     * @param {Object} gameConfig - Game configuration
     * @returns {number} - Timeout threshold in seconds
     */
    calculateWordTimeout(word, gameConfig) {
        if (gameConfig.timeoutPerLetter <= 0) {
            return 0;
        }

        const levelConfig = GAME_CONFIG.LEVELS[gameConfig.level];
        const missingPercentage = levelConfig ? levelConfig.missingPercentage : 50;
        const missingLetters = Math.ceil((word.length * missingPercentage) / 100);
        
        return Math.max(1, missingLetters * gameConfig.timeoutPerLetter);
    }

    /**
     * Update statistics with word result
     * @param {Object} statistics - Statistics object to update
     * @param {Object} result - Word result
     * @param {Object} wordScore - Word score breakdown
     */
    updateStatistics(statistics, result, wordScore) {
        // Count results by type
        switch (result.resultType) {
            case RESULT_TYPES.SUCCESS:
                statistics.correctCount++;
                break;
            case RESULT_TYPES.INCORRECT:
            case RESULT_TYPES.TIMEOUT_INCORRECT:
                statistics.incorrectCount++;
                break;
            case RESULT_TYPES.TIMEOUT:
                statistics.timeoutCount++;
                break;
        }

        // Update time statistics
        statistics.fastestTime = Math.min(statistics.fastestTime, result.elapsedTime);
        statistics.slowestTime = Math.max(statistics.slowestTime, result.elapsedTime);
        statistics.totalTimeBonus += wordScore.timeBonus;
    }

    /**
     * Calculate performance metrics
     * @param {Object} scoreData - Score data object to update
     * @param {number} totalWords - Total number of words
     */
    calculatePerformanceMetrics(scoreData, totalWords) {
        const stats = scoreData.statistics;
        
        // Calculate averages
        stats.averageTime = totalWords > 0 ? 
            Math.round(scoreData.wordScores.reduce((sum, ws) => sum + ws.details.elapsedTime, 0) / totalWords) : 0;
        
        if (stats.fastestTime === Infinity) {
            stats.fastestTime = 0;
        }

        // Calculate performance percentages
        const performance = scoreData.performance;
        
        // Accuracy: percentage of correct answers
        performance.accuracy = totalWords > 0 ? 
            Math.round((stats.correctCount / totalWords) * 100) : 0;
        
        // Speed: based on time bonus earned vs maximum possible
        const maxTimeBonus = totalWords * this.timeBonus.maxBonus;
        performance.speed = maxTimeBonus > 0 ? 
            Math.round((stats.totalTimeBonus / maxTimeBonus) * 100) : 0;
        
        // Efficiency: overall score vs maximum possible
        performance.efficiency = scoreData.maxPossibleScore > 0 ? 
            Math.round((scoreData.totalScore / scoreData.maxPossibleScore) * 100) : 0;
        
        // Grade: letter grade based on efficiency
        performance.grade = this.calculateGrade(performance.efficiency);
    }

    /**
     * Calculate letter grade based on efficiency percentage
     * @param {number} efficiency - Efficiency percentage (0-100)
     * @returns {string} - Letter grade
     */
    calculateGrade(efficiency) {
        if (efficiency >= 95) return 'A+';
        if (efficiency >= 90) return 'A';
        if (efficiency >= 85) return 'A-';
        if (efficiency >= 80) return 'B+';
        if (efficiency >= 75) return 'B';
        if (efficiency >= 70) return 'B-';
        if (efficiency >= 65) return 'C+';
        if (efficiency >= 60) return 'C';
        if (efficiency >= 55) return 'C-';
        if (efficiency >= 50) return 'D+';
        if (efficiency >= 45) return 'D';
        if (efficiency >= 40) return 'D-';
        return 'F';
    }

    /**
     * Generate performance summary text
     * @param {Object} scoreData - Complete score data
     * @returns {string} - Performance summary
     */
    generatePerformanceSummary(scoreData) {
        const perf = scoreData.performance;
        const stats = scoreData.statistics;
        
        let summary = `Grade: ${perf.grade} (${perf.efficiency}% efficiency)\n`;
        summary += `Accuracy: ${perf.accuracy}% (${stats.correctCount} correct out of ${stats.correctCount + stats.incorrectCount + stats.timeoutCount})\n`;
        
        if (stats.averageTime > 0) {
            summary += `Average time: ${stats.averageTime} seconds\n`;
        }
        
        if (stats.totalTimeBonus > 0) {
            summary += `Speed bonus: ${stats.totalTimeBonus} points\n`;
        }

        return summary;
    }

    /**
     * Get performance recommendations
     * @param {Object} scoreData - Complete score data
     * @returns {Array} - Array of recommendation strings
     */
    getPerformanceRecommendations(scoreData) {
        const recommendations = [];
        const perf = scoreData.performance;
        const stats = scoreData.statistics;

        if (perf.accuracy < 70) {
            recommendations.push("Focus on accuracy - take your time to think about each word");
        }

        if (perf.speed < 30 && perf.accuracy > 80) {
            recommendations.push("Try to respond faster to earn more speed bonuses");
        }

        if (stats.timeoutCount > stats.correctCount) {
            recommendations.push("Consider increasing the time limit or practicing with easier levels");
        }

        if (stats.incorrectCount > stats.correctCount) {
            recommendations.push("Review the word meanings and practice spelling");
        }

        if (perf.efficiency >= 90) {
            recommendations.push("Excellent performance! Try a harder difficulty level");
        }

        if (recommendations.length === 0) {
            recommendations.push("Keep practicing to improve your performance");
        }

        return recommendations;
    }

    /**
     * Export score data for analysis
     * @param {Object} scoreData - Complete score data
     * @returns {Object} - Exportable score data
     */
    exportScoreData(scoreData) {
        return {
            ...scoreData,
            exportTime: new Date().toISOString(),
            scoringConfig: {
                scoreWeights: { ...this.scoreWeights },
                timeBonus: { ...this.timeBonus }
            }
        };
    }

    /**
     * Configure scoring weights
     * @param {Object} weights - New scoring weights
     */
    configureScoring(weights) {
        this.scoreWeights = { ...this.scoreWeights, ...weights };
    }

    /**
     * Configure time bonus settings
     * @param {Object} bonusConfig - New time bonus configuration
     */
    configureTimeBonus(bonusConfig) {
        this.timeBonus = { ...this.timeBonus, ...bonusConfig };
    }
}

// Global scoring manager instance
export const scoringManager = new ScoringManager();
