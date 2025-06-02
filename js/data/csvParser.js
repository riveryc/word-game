// CSV parsing functionality

import { validateCSVData, validateWordData } from '../utils/validation.js';
import { ERROR_MESSAGES } from '../config.js';

/**
 * Parse CSV text into word data array
 * @param {string} csvText - Raw CSV text
 * @returns {Array} - Array of word objects
 */
export function parseCSV(csvText) {
    const validation = validateCSVData(csvText);
    
    if (!validation.isValid) {
        throw new Error(`CSV parsing failed: ${validation.errors.join(', ')}`);
    }

    return validation.data;
}

/**
 * Parse CSV with advanced options
 * @param {string} csvText - Raw CSV text
 * @param {Object} options - Parsing options
 * @returns {Object} - Parsing result with data and metadata
 */
export function parseCSVAdvanced(csvText, options = {}) {
    const {
        delimiter = ',',
        skipEmptyLines = true,
        trimFields = true,
        requireAllColumns = false
    } = options;

    const result = {
        data: [],
        errors: [],
        warnings: [],
        metadata: {
            totalRows: 0,
            validRows: 0,
            skippedRows: 0,
            columns: []
        }
    };

    if (!csvText || typeof csvText !== 'string') {
        result.errors.push('Invalid CSV data provided');
        return result;
    }

    const lines = csvText.trim().split('\n');
    result.metadata.totalRows = lines.length;

    if (lines.length < 2) {
        result.errors.push('CSV must contain at least a header row and one data row');
        return result;
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine, delimiter, trimFields);
    result.metadata.columns = headers;

    // Find required column indices
    const columnIndices = {
        word: findColumnIndex(headers, ['word']),
        description: findColumnIndex(headers, ['description', 'desc']),
        date: findColumnIndex(headers, ['date']),
        grade: findColumnIndex(headers, ['grade', 'level']),
        source: findColumnIndex(headers, ['source', 'book', 'origin'])
    };

    // Check for required columns
    if (columnIndices.word === -1) {
        result.errors.push('Required column "word" not found');
    }
    if (columnIndices.description === -1) {
        result.errors.push('Required column "description" not found');
    }

    if (result.errors.length > 0) {
        return result;
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (skipEmptyLines && line === '') {
            result.metadata.skippedRows++;
            continue;
        }

        try {
            const fields = parseCSVLine(line, delimiter, trimFields);
            const wordData = extractWordData(fields, columnIndices, requireAllColumns);
            
            if (wordData) {
                // Validate the word entry
                const wordErrors = validateWordEntry(wordData, i);
                if (wordErrors.length === 0) {
                    result.data.push(wordData);
                    result.metadata.validRows++;
                } else {
                    result.warnings.push(`Row ${i + 1}: ${wordErrors.join(', ')}`);
                    result.metadata.skippedRows++;
                }
            } else {
                result.warnings.push(`Row ${i + 1}: Insufficient data`);
                result.metadata.skippedRows++;
            }
        } catch (error) {
            result.warnings.push(`Row ${i + 1}: ${error.message}`);
            result.metadata.skippedRows++;
        }
    }

    if (result.data.length === 0) {
        result.errors.push(ERROR_MESSAGES.NO_VALID_WORDS);
    }

    return result;
}

/**
 * Parse a single CSV line into fields
 * @param {string} line - CSV line
 * @param {string} delimiter - Field delimiter
 * @param {boolean} trimFields - Whether to trim field values
 * @returns {Array} - Array of field values
 */
function parseCSVLine(line, delimiter = ',', trimFields = true) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === delimiter && !inQuotes) {
            // Field separator
            fields.push(trimFields ? currentField.trim() : currentField);
            currentField = '';
            i++;
        } else {
            // Regular character
            currentField += char;
            i++;
        }
    }

    // Add the last field
    fields.push(trimFields ? currentField.trim() : currentField);

    return fields;
}

/**
 * Find column index by name (case-insensitive)
 * @param {Array} headers - Header array
 * @param {Array} possibleNames - Possible column names
 * @returns {number} - Column index or -1 if not found
 */
function findColumnIndex(headers, possibleNames) {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    
    for (const name of possibleNames) {
        const index = lowerHeaders.indexOf(name.toLowerCase());
        if (index !== -1) {
            return index;
        }
    }
    
    return -1;
}

/**
 * Extract word data from CSV fields
 * @param {Array} fields - CSV field values
 * @param {Object} columnIndices - Column index mapping
 * @param {boolean} requireAllColumns - Whether all columns are required
 * @returns {Object|null} - Word data object or null
 */
function extractWordData(fields, columnIndices, requireAllColumns = false) {
    const { word, description, date, grade, source } = columnIndices;

    // Check if we have minimum required fields
    if (word >= fields.length || description >= fields.length) {
        return null;
    }

    const wordData = {
        word: fields[word] || '',
        description: fields[description] || ''
    };

    // Add optional fields if available
    if (date !== -1 && date < fields.length) {
        wordData.date = fields[date] || '';
    } else {
        wordData.date = '';
    }

    if (grade !== -1 && grade < fields.length) {
        wordData.grade = fields[grade] || '';
    } else {
        wordData.grade = '';
    }

    if (source !== -1 && source < fields.length) {
        wordData.source = fields[source] || '';
    } else {
        wordData.source = '';
    }

    // Check if required fields are empty
    if (!wordData.word.trim() || !wordData.description.trim()) {
        return null;
    }

    // Check if all columns are required and any are missing
    if (requireAllColumns) {
        const requiredFields = ['word', 'description', 'date', 'grade', 'source'];
        for (const field of requiredFields) {
            if (!wordData[field] || !wordData[field].trim()) {
                return null;
            }
        }
    }

    return wordData;
}

/**
 * Validate individual word entry (simplified version for CSV parser)
 * @param {Object} word - Word object
 * @param {number} index - Row index for error reporting
 * @returns {Array} - Array of error messages
 */
function validateWordEntry(word, index) {
    const errors = [];

    if (!word.word || word.word.trim() === '') {
        errors.push('Missing word');
    }

    if (!word.description || word.description.trim() === '') {
        errors.push('Missing description');
    }

    // Validate word format (only letters and spaces allowed)
    if (word.word && !/^[a-zA-Z\s]+$/.test(word.word.trim())) {
        errors.push('Word contains invalid characters');
    }

    return errors;
}

/**
 * Convert word data array back to CSV format
 * @param {Array} wordData - Array of word objects
 * @param {Array} columns - Column order (optional)
 * @returns {string} - CSV text
 */
export function wordDataToCSV(wordData, columns = ['word', 'description', 'date', 'grade', 'source']) {
    if (!Array.isArray(wordData) || wordData.length === 0) {
        return '';
    }

    const lines = [];
    
    // Add header
    lines.push(columns.join(','));
    
    // Add data rows
    for (const word of wordData) {
        const row = columns.map(col => {
            const value = word[col] || '';
            // Escape quotes and wrap in quotes if contains comma or quote
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        lines.push(row.join(','));
    }
    
    return lines.join('\n');
}

/**
 * Get unique values from a specific column
 * @param {Array} wordData - Array of word objects
 * @param {string} column - Column name
 * @returns {Array} - Array of unique values
 */
export function getUniqueColumnValues(wordData, column) {
    if (!Array.isArray(wordData)) {
        return [];
    }

    const values = wordData
        .map(word => word[column])
        .filter(value => value && value.trim() !== '')
        .map(value => value.trim());

    return [...new Set(values)].sort();
}
