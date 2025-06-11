// General helper functions

import { REGEX } from '../app/config.js';

/**
 * Get element by ID with error checking
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} - Element or null if not found
 */
export function getElementById(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with ID '${id}' not found`);
    }
    return element;
}

/**
 * Show element by setting display style
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} display - Display style (default: 'block')
 */
export function showElement(element, display = 'block') {
    const el = typeof element === 'string' ? getElementById(element) : element;
    if (el) {
        el.style.display = display;
    }
}

/**
 * Hide element by setting display to none
 * @param {HTMLElement|string} element - Element or element ID
 */
export function hideElement(element) {
    const el = typeof element === 'string' ? getElementById(element) : element;
    if (el) {
        el.style.display = 'none';
    }
}

/**
 * Toggle element visibility
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} display - Display style when showing (default: 'block')
 */
export function toggleElement(element, display = 'block') {
    const el = typeof element === 'string' ? getElementById(element) : element;
    if (el) {
        if (el.style.display === 'none' || !el.style.display) {
            showElement(el, display);
        } else {
            hideElement(el);
        }
    }
}

/**
 * Add CSS class to element
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} className - CSS class name
 */
export function addClass(element, className) {
    const el = typeof element === 'string' ? getElementById(element) : element;
    if (el) {
        el.classList.add(className);
    }
}

/**
 * Remove CSS class from element
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} className - CSS class name
 */
export function removeClass(element, className) {
    const el = typeof element === 'string' ? getElementById(element) : element;
    if (el) {
        el.classList.remove(className);
    }
}

/**
 * Toggle CSS class on element
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} className - CSS class name
 */
export function toggleClass(element, className) {
    const el = typeof element === 'string' ? getElementById(element) : element;
    if (el) {
        el.classList.toggle(className);
    }
}

/**
 * Check if element has CSS class
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} className - CSS class name
 * @returns {boolean} - True if element has class
 */
export function hasClass(element, className) {
    const el = typeof element === 'string' ? getElementById(element) : element;
    return el ? el.classList.contains(className) : false;
}

/**
 * Set element text content
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} text - Text content
 */
export function setText(element, text) {
    const el = typeof element === 'string' ? getElementById(element) : element;
    if (el) {
        el.textContent = text;
    }
}

/**
 * Set element HTML content
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} html - HTML content
 */
export function setHTML(element, html) {
    const el = typeof element === 'string' ? getElementById(element) : element;
    if (el) {
        el.innerHTML = html;
    }
}

/**
 * Get element value (for input elements)
 * @param {HTMLElement|string} element - Element or element ID
 * @returns {string} - Element value
 */
export function getValue(element) {
    const el = typeof element === 'string' ? getElementById(element) : element;
    return el ? el.value : '';
}

/**
 * Set element value (for input elements)
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} value - Value to set
 */
export function setValue(element, value) {
    const el = typeof element === 'string' ? getElementById(element) : element;
    if (el) {
        el.value = value;
    }
}

/**
 * Extract Google Sheets ID from URL
 * @param {string} url - Google Sheets URL
 * @returns {string|null} - Sheets ID or null if not found
 */
export function extractGoogleSheetsId(url) {
    for (const regex of REGEX.GOOGLE_SHEETS_ID) {
        const match = url.match(regex);
        if (match) {
            return match[1];
        }
    }
    return null;
}

/**
 * Validate Google Sheets URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid Google Sheets URL
 */
export function isValidGoogleSheetsUrl(url) {
    return url.includes('docs.google.com/spreadsheets') && extractGoogleSheetsId(url) !== null;
}

/**
 * Shuffle array in place using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Get random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random integer
 */
export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format time in seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Sanitize text input by converting to lowercase and removing non-letters
 * @param {string} text - Input text
 * @returns {string} - Sanitized text
 */
export function sanitizeInput(text) {
    return text.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Create a delay/sleep function
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after delay
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if device is mobile based on screen width
 * @returns {boolean} - True if mobile device
 */
export function isMobile() {
    return window.innerWidth <= 768;
}

/**
 * Focus element with error handling
 * @param {HTMLElement|string} element - Element or element ID
 */
export function focusElement(element) {
    const el = typeof element === 'string' ? getElementById(element) : element;
    if (el && typeof el.focus === 'function') {
        try {
            el.focus();
        } catch (error) {
            console.warn('Failed to focus element:', error);
        }
    }
}

/**
 * Escape special HTML characters in a string
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for HTML insertion
 */
export function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
