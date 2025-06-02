// Keyboard event handling utilities

import { KEYS } from '../app/config.js';

/**
 * Keyboard manager class for handling keyboard events
 */
export class KeyboardManager {
    constructor() {
        this.keyHandlers = new Map();
        this.globalHandlers = new Map();
        this.isEnabled = true;
        this.init();
    }

    /**
     * Initialize keyboard event listeners
     */
    init() {
        document.addEventListener('keydown', (event) => {
            if (!this.isEnabled) {
                return;
            }

            this.handleKeyDown(event);
        });

        document.addEventListener('keyup', (event) => {
            if (!this.isEnabled) {
                return;
            }

            this.handleKeyUp(event);
        });
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        const key = event.key;
        
        // Handle global key handlers first
        if (this.globalHandlers.has(key)) {
            const handler = this.globalHandlers.get(key);
            if (handler.keydown) {
                const result = handler.keydown(event);
                if (result === false) {
                    event.preventDefault();
                    return;
                }
            }
        }

        // Handle specific key handlers
        if (this.keyHandlers.has(key)) {
            const handler = this.keyHandlers.get(key);
            if (handler.keydown) {
                const result = handler.keydown(event);
                if (result === false) {
                    event.preventDefault();
                }
            }
        }
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyUp(event) {
        const key = event.key;
        
        // Handle global key handlers first
        if (this.globalHandlers.has(key)) {
            const handler = this.globalHandlers.get(key);
            if (handler.keyup) {
                const result = handler.keyup(event);
                if (result === false) {
                    event.preventDefault();
                    return;
                }
            }
        }

        // Handle specific key handlers
        if (this.keyHandlers.has(key)) {
            const handler = this.keyHandlers.get(key);
            if (handler.keyup) {
                const result = handler.keyup(event);
                if (result === false) {
                    event.preventDefault();
                }
            }
        }
    }

    /**
     * Register a key handler
     * @param {string} key - Key to handle
     * @param {Object} handler - Handler object with keydown/keyup functions
     * @param {boolean} global - Whether this is a global handler
     */
    registerKeyHandler(key, handler, global = false) {
        const targetMap = global ? this.globalHandlers : this.keyHandlers;
        targetMap.set(key, handler);
    }

    /**
     * Unregister a key handler
     * @param {string} key - Key to unregister
     * @param {boolean} global - Whether this is a global handler
     */
    unregisterKeyHandler(key, global = false) {
        const targetMap = global ? this.globalHandlers : this.keyHandlers;
        targetMap.delete(key);
    }

    /**
     * Clear all key handlers
     * @param {boolean} includeGlobal - Whether to clear global handlers too
     */
    clearHandlers(includeGlobal = false) {
        this.keyHandlers.clear();
        if (includeGlobal) {
            this.globalHandlers.clear();
        }
    }

    /**
     * Enable keyboard handling
     */
    enable() {
        this.isEnabled = true;
    }

    /**
     * Disable keyboard handling
     */
    disable() {
        this.isEnabled = false;
    }

    /**
     * Check if keyboard handling is enabled
     * @returns {boolean} - True if enabled
     */
    isKeyboardEnabled() {
        return this.isEnabled;
    }
}

/**
 * Common keyboard shortcuts and handlers
 */
export const KeyboardShortcuts = {
    /**
     * Enter key handler for form submission
     * @param {Function} callback - Function to call on Enter
     * @returns {Object} - Handler object
     */
    enterKey(callback) {
        return {
            keydown: (event) => {
                if (event.key === KEYS.ENTER) {
                    event.preventDefault();
                    callback(event);
                    return false;
                }
            }
        };
    },

    /**
     * Escape key handler for cancellation
     * @param {Function} callback - Function to call on Escape
     * @returns {Object} - Handler object
     */
    escapeKey(callback) {
        return {
            keydown: (event) => {
                if (event.key === KEYS.ESCAPE) {
                    event.preventDefault();
                    callback(event);
                    return false;
                }
            }
        };
    },

    /**
     * Space key handler for audio repeat
     * @param {Function} callback - Function to call on Space
     * @returns {Object} - Handler object
     */
    spaceKey(callback) {
        return {
            keydown: (event) => {
                if (event.key === KEYS.SPACE || event.key === KEYS.SPACEBAR) {
                    // Only handle if not in an input field
                    if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                        event.preventDefault();
                        callback(event);
                        return false;
                    }
                }
            }
        };
    },

    /**
     * Arrow key navigation handler
     * @param {Function} leftCallback - Function to call on left arrow
     * @param {Function} rightCallback - Function to call on right arrow
     * @returns {Object} - Handler object
     */
    arrowKeys(leftCallback, rightCallback) {
        return {
            keydown: (event) => {
                if (event.key === KEYS.ARROW_LEFT && leftCallback) {
                    event.preventDefault();
                    leftCallback(event);
                    return false;
                } else if (event.key === KEYS.ARROW_RIGHT && rightCallback) {
                    event.preventDefault();
                    rightCallback(event);
                    return false;
                }
            }
        };
    },

    /**
     * Letter key handler for input fields
     * @param {Function} callback - Function to call on letter input
     * @returns {Object} - Handler object
     */
    letterKeys(callback) {
        return {
            keydown: (event) => {
                // Only handle letter keys
                if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
                    callback(event);
                }
            }
        };
    },

    /**
     * Backspace key handler
     * @param {Function} callback - Function to call on Backspace
     * @returns {Object} - Handler object
     */
    backspaceKey(callback) {
        return {
            keydown: (event) => {
                if (event.key === KEYS.BACKSPACE) {
                    callback(event);
                }
            }
        };
    }
};

/**
 * Global keyboard manager instance
 */
export const keyboardManager = new KeyboardManager();

/**
 * Utility functions for keyboard handling
 */
export const KeyboardUtils = {
    /**
     * Check if key is a letter
     * @param {string} key - Key to check
     * @returns {boolean} - True if letter
     */
    isLetter(key) {
        return key.length === 1 && /[a-zA-Z]/.test(key);
    },

    /**
     * Check if key is a number
     * @param {string} key - Key to check
     * @returns {boolean} - True if number
     */
    isNumber(key) {
        return key.length === 1 && /[0-9]/.test(key);
    },

    /**
     * Check if key is alphanumeric
     * @param {string} key - Key to check
     * @returns {boolean} - True if alphanumeric
     */
    isAlphanumeric(key) {
        return this.isLetter(key) || this.isNumber(key);
    },

    /**
     * Check if event target is an input field
     * @param {Event} event - Event object
     * @returns {boolean} - True if input field
     */
    isInputField(event) {
        const tagName = event.target.tagName.toLowerCase();
        return tagName === 'input' || tagName === 'textarea' || event.target.contentEditable === 'true';
    },

    /**
     * Prevent default behavior for event
     * @param {Event} event - Event object
     */
    preventDefault(event) {
        event.preventDefault();
        event.stopPropagation();
    }
};
