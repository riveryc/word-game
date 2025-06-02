// Google Sheets integration

import { API, ERROR_MESSAGES } from '../config.js';
import { extractGoogleSheetsId } from '../utils/helpers.js';
import { parseCSV } from './csvParser.js';

/**
 * Load data from Google Sheets
 * @param {string} url - Google Sheets URL
 * @returns {Promise<Array>} - Array of word objects
 */
export async function loadGoogleSheets(url) {
    const sheetsId = extractGoogleSheetsId(url);
    
    if (!sheetsId) {
        throw new Error(ERROR_MESSAGES.INVALID_GOOGLE_SHEETS_URL);
    }

    const csvUrl = buildGoogleSheetsCSVUrl(sheetsId);
    
    try {
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(ERROR_MESSAGES.GOOGLE_SHEET_NOT_FOUND);
            } else if (response.status === 403) {
                throw new Error(ERROR_MESSAGES.GOOGLE_SHEET_PRIVATE);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }

        const csvText = await response.text();
        
        if (!csvText || csvText.trim() === '') {
            throw new Error(ERROR_MESSAGES.GOOGLE_SHEET_EMPTY);
        }

        return parseCSV(csvText);
        
    } catch (error) {
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        }
        throw error;
    }
}

/**
 * Build Google Sheets CSV export URL
 * @param {string} sheetsId - Google Sheets ID
 * @param {string} gid - Sheet GID (default: 0)
 * @returns {string} - CSV export URL
 */
function buildGoogleSheetsCSVUrl(sheetsId, gid = '0') {
    return `${API.GOOGLE_SHEETS_EXPORT_BASE}${sheetsId}/export?format=csv&gid=${gid}`;
}

/**
 * Extract sheet GID from URL if present
 * @param {string} url - Google Sheets URL
 * @returns {string} - Sheet GID or '0' as default
 */
function extractSheetGid(url) {
    const gidMatch = url.match(/[#&]gid=([0-9]+)/);
    return gidMatch ? gidMatch[1] : '0';
}

/**
 * Load data from Google Sheets with advanced options
 * @param {string} url - Google Sheets URL
 * @param {Object} options - Loading options
 * @returns {Promise<Object>} - Loading result with data and metadata
 */
export async function loadGoogleSheetsAdvanced(url, options = {}) {
    const {
        timeout = 10000,
        retryAttempts = 2,
        validateData = true
    } = options;

    const sheetsId = extractGoogleSheetsId(url);
    const gid = extractSheetGid(url);
    
    if (!sheetsId) {
        throw new Error(ERROR_MESSAGES.INVALID_GOOGLE_SHEETS_URL);
    }

    const csvUrl = buildGoogleSheetsCSVUrl(sheetsId, gid);
    
    let lastError = null;
    
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        try {
            const response = await fetchWithTimeout(csvUrl, timeout);
            
            if (!response.ok) {
                throw new Error(getHttpErrorMessage(response.status));
            }

            const csvText = await response.text();
            
            if (!csvText || csvText.trim() === '') {
                throw new Error(ERROR_MESSAGES.GOOGLE_SHEET_EMPTY);
            }

            const data = parseCSV(csvText);
            
            return {
                success: true,
                data: data,
                metadata: {
                    sheetsId: sheetsId,
                    gid: gid,
                    url: url,
                    csvUrl: csvUrl,
                    loadTime: new Date().toISOString(),
                    wordCount: data.length
                }
            };
            
        } catch (error) {
            lastError = error;
            
            // Don't retry for certain errors
            if (isNonRetryableError(error)) {
                break;
            }
            
            // Wait before retry (exponential backoff)
            if (attempt < retryAttempts) {
                await sleep(Math.pow(2, attempt) * 1000);
            }
        }
    }
    
    throw lastError;
}

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} - Fetch response
 */
function fetchWithTimeout(url, timeout) {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

/**
 * Get appropriate error message for HTTP status
 * @param {number} status - HTTP status code
 * @returns {string} - Error message
 */
function getHttpErrorMessage(status) {
    switch (status) {
        case 404:
            return ERROR_MESSAGES.GOOGLE_SHEET_NOT_FOUND;
        case 403:
            return ERROR_MESSAGES.GOOGLE_SHEET_PRIVATE;
        case 429:
            return 'Too many requests. Please try again later.';
        case 500:
        case 502:
        case 503:
        case 504:
            return 'Google Sheets service temporarily unavailable. Please try again later.';
        default:
            return `HTTP ${status}: Unable to load Google Sheet`;
    }
}

/**
 * Check if error should not be retried
 * @param {Error} error - Error object
 * @returns {boolean} - True if error should not be retried
 */
function isNonRetryableError(error) {
    const message = error.message.toLowerCase();
    return (
        message.includes('404') ||
        message.includes('not found') ||
        message.includes('private') ||
        message.includes('403') ||
        message.includes('invalid') ||
        message.includes('parsing failed')
    );
}

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate Google Sheets URL format
 * @param {string} url - URL to validate
 * @returns {Object} - Validation result
 */
export function validateGoogleSheetsUrl(url) {
    const result = {
        isValid: false,
        sheetsId: null,
        gid: null,
        errors: []
    };

    if (!url || typeof url !== 'string') {
        result.errors.push('URL is required');
        return result;
    }

    if (!url.includes('docs.google.com/spreadsheets')) {
        result.errors.push('URL must be a Google Sheets URL');
        return result;
    }

    const sheetsId = extractGoogleSheetsId(url);
    if (!sheetsId) {
        result.errors.push('Could not extract sheet ID from URL');
        return result;
    }

    result.isValid = true;
    result.sheetsId = sheetsId;
    result.gid = extractSheetGid(url);

    return result;
}

/**
 * Build a shareable Google Sheets URL
 * @param {string} sheetsId - Google Sheets ID
 * @param {string} gid - Sheet GID (optional)
 * @returns {string} - Shareable URL
 */
export function buildGoogleSheetsUrl(sheetsId, gid = null) {
    let url = `https://docs.google.com/spreadsheets/d/${sheetsId}/edit`;
    if (gid && gid !== '0') {
        url += `#gid=${gid}`;
    }
    return url;
}

/**
 * Get sheet information from Google Sheets URL
 * @param {string} url - Google Sheets URL
 * @returns {Object} - Sheet information
 */
export function getSheetInfo(url) {
    const validation = validateGoogleSheetsUrl(url);
    
    if (!validation.isValid) {
        return {
            isValid: false,
            errors: validation.errors
        };
    }

    return {
        isValid: true,
        sheetsId: validation.sheetsId,
        gid: validation.gid,
        csvUrl: buildGoogleSheetsCSVUrl(validation.sheetsId, validation.gid),
        shareableUrl: buildGoogleSheetsUrl(validation.sheetsId, validation.gid)
    };
}

/**
 * Test Google Sheets connectivity
 * @param {string} url - Google Sheets URL
 * @returns {Promise<Object>} - Test result
 */
export async function testGoogleSheetsConnection(url) {
    const result = {
        success: false,
        accessible: false,
        hasData: false,
        error: null,
        metadata: null
    };

    try {
        const validation = validateGoogleSheetsUrl(url);
        if (!validation.isValid) {
            result.error = validation.errors.join(', ');
            return result;
        }

        const csvUrl = buildGoogleSheetsCSVUrl(validation.sheetsId, validation.gid);
        const response = await fetchWithTimeout(csvUrl, 5000);

        result.accessible = response.ok;

        if (response.ok) {
            const csvText = await response.text();
            result.hasData = csvText && csvText.trim() !== '';
            
            if (result.hasData) {
                const lines = csvText.trim().split('\n');
                result.metadata = {
                    rowCount: lines.length,
                    hasHeader: lines.length > 0,
                    estimatedWords: Math.max(0, lines.length - 1)
                };
                result.success = true;
            } else {
                result.error = ERROR_MESSAGES.GOOGLE_SHEET_EMPTY;
            }
        } else {
            result.error = getHttpErrorMessage(response.status);
        }

    } catch (error) {
        result.error = error.message;
    }

    return result;
}
