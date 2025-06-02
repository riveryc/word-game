// Input validation utilities

import { GAME_CONFIG, ERROR_MESSAGES } from '../app/config.js';
import { isValidGoogleSheetsUrl } from './helpers.js';

/**
 * Validate word data structure
 * @param {Array} words - Array of word objects
 * @returns {Object} - Validation result with isValid and errors
 */
export function validateWordData(words) {
    const result = {
        isValid: true,
        errors: [],
        validWords: []
    };

    if (!Array.isArray(words)) {
        result.isValid = false;
        result.errors.push('Word data must be an array');
        return result;
    }

    if (words.length === 0) {
        result.isValid = false;
        result.errors.push('No words found in data');
        return result;
    }

    // Validate each word entry
    words.forEach((word, index) => {
        const wordErrors = validateWordEntry(word, index);
        if (wordErrors.length === 0) {
            result.validWords.push(word);
        } else {
            result.errors.push(...wordErrors);
        }
    });

    if (result.validWords.length === 0) {
        result.isValid = false;
        result.errors.push(ERROR_MESSAGES.NO_VALID_WORDS);
    }

    return result;
}

/**
 * Validate individual word entry
 * @param {Object} word - Word object
 * @param {number} index - Index in array for error reporting
 * @returns {Array} - Array of error messages
 */
export function validateWordEntry(word, index) {
    const errors = [];

    if (!word || typeof word !== 'object') {
        errors.push(`Entry ${index + 1}: Invalid word object`);
        return errors;
    }

    // Check required fields
    if (!word.word || typeof word.word !== 'string' || word.word.trim() === '') {
        errors.push(`Entry ${index + 1}: Missing or invalid word field`);
    }

    if (!word.description || typeof word.description !== 'string' || word.description.trim() === '') {
        errors.push(`Entry ${index + 1}: Missing or invalid description field`);
    }

    // Validate word format (only letters and spaces allowed)
    if (word.word && !/^[a-zA-Z\s]+$/.test(word.word.trim())) {
        errors.push(`Entry ${index + 1}: Word contains invalid characters (only letters and spaces allowed)`);
    }

    return errors;
}

/**
 * Validate CSV data structure
 * @param {string} csvText - Raw CSV text
 * @returns {Object} - Validation result
 */
export function validateCSVData(csvText) {
    const result = {
        isValid: true,
        errors: [],
        data: []
    };

    if (!csvText || typeof csvText !== 'string') {
        result.isValid = false;
        result.errors.push('Invalid CSV data');
        return result;
    }

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        result.isValid = false;
        result.errors.push('CSV must contain at least a header row and one data row');
        return result;
    }

    // Parse header
    const header = lines[0].split(',').map(col => col.trim().toLowerCase());
    const wordIndex = header.indexOf('word');
    const descriptionIndex = header.indexOf('description');

    if (wordIndex === -1 || descriptionIndex === -1) {
        result.isValid = false;
        result.errors.push(ERROR_MESSAGES.MISSING_REQUIRED_COLUMNS);
        return result;
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(col => col.trim());
        if (row.length >= Math.max(wordIndex + 1, descriptionIndex + 1)) {
            const wordData = {
                word: row[wordIndex],
                description: row[descriptionIndex],
                date: row[header.indexOf('date')] || '',
                grade: row[header.indexOf('grade')] || '',
                source: row[header.indexOf('source')] || ''
            };

            const wordErrors = validateWordEntry(wordData, i - 1);
            if (wordErrors.length === 0) {
                result.data.push(wordData);
            } else {
                result.errors.push(...wordErrors);
            }
        }
    }

    if (result.data.length === 0) {
        result.isValid = false;
        result.errors.push(ERROR_MESSAGES.NO_VALID_WORDS);
    }

    return result;
}

/**
 * Validate timeout input value
 * @param {string|number} value - Timeout value
 * @returns {Object} - Validation result
 */
export function validateTimeoutInput(value) {
    const result = {
        isValid: true,
        errors: [],
        value: 0
    };

    // Convert to number
    const numValue = Number(value);

    if (isNaN(numValue)) {
        result.isValid = false;
        result.errors.push('Timeout must be a valid number');
        return result;
    }

    if (numValue < GAME_CONFIG.MIN_TIMEOUT_PER_LETTER) {
        result.isValid = false;
        result.errors.push(`Timeout must be at least ${GAME_CONFIG.MIN_TIMEOUT_PER_LETTER} seconds`);
        return result;
    }

    if (numValue > GAME_CONFIG.MAX_TIMEOUT_PER_LETTER) {
        result.isValid = false;
        result.errors.push(`Timeout cannot exceed ${GAME_CONFIG.MAX_TIMEOUT_PER_LETTER} seconds`);
        return result;
    }

    result.value = numValue;
    return result;
}

/**
 * Validate word count input
 * @param {string|number} value - Word count value
 * @param {number} maxWords - Maximum available words
 * @returns {Object} - Validation result
 */
export function validateWordCountInput(value, maxWords) {
    const result = {
        isValid: true,
        errors: [],
        value: 0
    };

    const numValue = Number(value);

    if (isNaN(numValue)) {
        result.isValid = false;
        result.errors.push('Word count must be a valid number');
        return result;
    }

    if (numValue < 1) {
        result.isValid = false;
        result.errors.push('Word count must be at least 1');
        return result;
    }

    if (numValue > maxWords) {
        result.isValid = false;
        result.errors.push(`Word count cannot exceed ${maxWords} (total available words)`);
        return result;
    }

    result.value = Math.floor(numValue);
    return result;
}

/**
 * Validate Google Sheets URL
 * @param {string} url - URL to validate
 * @returns {Object} - Validation result
 */
export function validateGoogleSheetsUrl(url) {
    const result = {
        isValid: true,
        errors: []
    };

    if (!url || typeof url !== 'string' || url.trim() === '') {
        result.isValid = false;
        result.errors.push('Google Sheets URL is required');
        return result;
    }

    if (!isValidGoogleSheetsUrl(url)) {
        result.isValid = false;
        result.errors.push(ERROR_MESSAGES.INVALID_GOOGLE_SHEETS_URL);
        return result;
    }

    return result;
}

/**
 * Validate date range
 * @param {string} fromDate - Start date (YYYY-MM-DD format)
 * @param {string} toDate - End date (YYYY-MM-DD format)
 * @returns {Object} - Validation result
 */
export function validateDateRange(fromDate, toDate) {
    const result = {
        isValid: true,
        errors: []
    };

    if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);

        if (isNaN(from.getTime())) {
            result.isValid = false;
            result.errors.push('Invalid start date format');
        }

        if (isNaN(to.getTime())) {
            result.isValid = false;
            result.errors.push('Invalid end date format');
        }

        if (result.isValid && from > to) {
            result.isValid = false;
            result.errors.push('Start date must be before or equal to end date');
        }
    }

    return result;
}

/**
 * Validate file input
 * @param {File} file - File object
 * @returns {Object} - Validation result
 */
export function validateFileInput(file) {
    const result = {
        isValid: true,
        errors: []
    };

    if (!file) {
        result.isValid = false;
        result.errors.push('No file selected');
        return result;
    }

    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        result.isValid = false;
        result.errors.push('File must be a CSV file');
        return result;
    }

    if (file.size === 0) {
        result.isValid = false;
        result.errors.push('File is empty');
        return result;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        result.isValid = false;
        result.errors.push('File size must be less than 5MB');
        return result;
    }

    return result;
}
