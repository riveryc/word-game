// Configuration and constants for the word game

// Game configuration
export const GAME_CONFIG = {
    // Default settings
    DEFAULT_LEVEL: 3,
    DEFAULT_WORD_COUNT: 20,
    DEFAULT_TIMEOUT_PER_LETTER: 5,
    MAX_TIMEOUT_PER_LETTER: 99,
    MIN_TIMEOUT_PER_LETTER: 0,
    
    // Level settings
    LEVELS: {
        1: { name: 'Easy', missingPercentage: 50, description: '50% missing letters' },
        2: { name: 'Medium', missingPercentage: 75, description: '75% missing letters' },
        3: { name: 'Nightmare', missingPercentage: 100, description: '100% missing letters - INSANE!' }
    },
    
    // Word count thresholds
    LARGE_WORD_LIST_THRESHOLD: 30,
    
    // Audio settings
    AUDIO: {
        DICTIONARY_API_TIMEOUT: 3000,
        VOLUME: 1.0,
        SPEECH_RATE: 0.6,
        SPEECH_PITCH: 1.0
    },
    
    // Timer settings
    TIMER_UPDATE_INTERVAL: 1000, // 1 second
    
    // Retry settings
    RETRY_ATTEMPTS: {
        TIMEOUT: 1,
        INCORRECT: 2,
        TIMEOUT_INCORRECT: 2
    }
};

// UI element IDs
export const ELEMENTS = {
    // Main containers
    DATA_SOURCE_SELECTION: 'data-source-selection',
    CONTENT: 'content',
    LEVEL_SELECTION: 'level-selection',
    WORD_COUNT_SELECTION: 'word-count-selection',
    GAME_INTERFACE: 'game-interface',
    FINAL_RESULTS: 'final-results',
    
    // Data source elements
    DEFAULT_CSV_RADIO: 'default-csv',
    GOOGLE_SHEETS_RADIO: 'google-sheets',
    LOCAL_CSV_RADIO: 'local-csv',
    DEFAULT_CSV_OPTION: 'default-csv-option',
    GOOGLE_SHEETS_OPTION: 'google-sheets-option',
    LOCAL_CSV_OPTION: 'local-csv-option',
    GOOGLE_SHEETS_INPUT: 'google-sheets-input',
    LOCAL_CSV_INPUT: 'local-csv-input',
    SHEETS_URL: 'sheets-url',
    CSV_FILE: 'csv-file',
    LOAD_DATA_BUTTON: 'load-data-button',
    
    // Level selection elements
    TIMEOUT_INPUT: 'timeout-input',
    TIMEOUT_STATUS: 'timeout-status',
    SHOW_TIMER_CHECKBOX: 'show-timer-checkbox',
    
    // Word count elements
    WORD_COUNT_INPUT: 'word-count-input',
    TOTAL_WORDS_COUNT: 'total-words-count',
    WORD_COUNT_INFO: 'word-count-info',
    
    // Game elements
    PROGRESS: 'progress',
    WORD_DISPLAY: 'word-display',
    WORD_DESCRIPTION: 'word-description',
    FEEDBACK: 'feedback',
    REPEAT_BUTTON: 'repeat-button',
    
    // Results elements
    FINAL_SCORE: 'final-score',
    
    // Filter elements
    WORD_FILTERS: 'word-filters',
    DATE_FROM: 'date-from',
    DATE_TO: 'date-to',
    GRADE_FILTERS: 'grade-filters',
    SOURCE_FILTERS: 'source-filters',
    
    // Back button and confirmation
    BACK_BUTTON: 'back-button',
    CONFIRMATION_OVERLAY: 'confirmation-overlay',
    NO_BUTTON: 'no-button',
    YES_BUTTON: 'yes-button',
    
    // Timer
    SIMPLE_TIMER: 'simple-timer'
};

// CSS class names
export const CSS_CLASSES = {
    // State classes
    SELECTED: 'selected',
    INVALID: 'invalid',
    CORRECT: 'correct',
    INCORRECT: 'incorrect',
    
    // Component classes
    INLINE_INPUT: 'inline-input',
    VISIBLE_LETTER: 'visible-letter',
    LEVEL_OPTION: 'level-option',
    LEVEL_NIGHTMARE: 'level-nightmare',
    SOURCE_OPTION: 'source-option',
    FILTER_CHECKBOX: 'filter-checkbox',
    TTS_OPTION: 'tts-option',
    
    // Timer classes
    TIMER_NORMAL: 'timer-normal',
    TIMER_WARNING: 'timer-warning',
    TIMER_CRITICAL: 'timer-critical',
    
    // Status classes
    TIMEOUT_STATUS_NO_LIMIT: 'no-limit',
    TIMEOUT_STATUS_WITH_LIMIT: 'with-limit'
};

// API endpoints and URLs
export const API = {
    DICTIONARY_API: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
    GOOGLE_TTS_BASE: 'https://translate.google.com/translate_tts',
    GOOGLE_SHEETS_EXPORT_BASE: 'https://docs.google.com/spreadsheets/d/',
    LOCAL_CSV_FILE: 'words.csv'
};

// Default Google Sheets URL
export const DEFAULT_GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1D7-Ny0FuD4w3inEi_lt-kpv7M0f7d0shnmS5TpiWdl0/edit?gid=0#gid=0';

// Data source types
export const DATA_SOURCES = {
    DEFAULT: 'default',
    GOOGLE: 'google',
    LOCAL: 'local'
};

// TTS methods
export const TTS_METHODS = {
    GOOGLE: 'google',    // For Google TTS (via backend proxy)
    BROWSER: 'browser'   // For native browser speech synthesis
};

// Game result types
export const RESULT_TYPES = {
    SUCCESS: 'success',
    TIMEOUT: 'timeout',
    INCORRECT: 'incorrect',
    TIMEOUT_INCORRECT: 'timeout_incorrect',
    PENDING: 'pending'
};

// Keyboard keys
export const KEYS = {
    ENTER: 'Enter',
    ESCAPE: 'Escape',
    SPACE: ' ',
    SPACEBAR: 'Spacebar',
    BACKSPACE: 'Backspace',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight'
};

// Regular expressions
export const REGEX = {
    GOOGLE_SHEETS_ID: [
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,  // Standard format
        /\/d\/([a-zA-Z0-9-_]+)/,               // Short format
        /id=([a-zA-Z0-9-_]+)/                  // Query parameter format
    ]
};

// Error messages
export const ERROR_MESSAGES = {
    INVALID_GOOGLE_SHEETS_URL: 'Please enter a valid Google Sheets URL (must contain "docs.google.com/spreadsheets")',
    GOOGLE_SHEET_PRIVATE: 'This Google Sheet is private. Please make it public or check sharing settings.',
    GOOGLE_SHEET_NOT_FOUND: 'Google Sheet not found. Please check the URL.',
    GOOGLE_SHEET_EMPTY: 'Google Sheet appears to be empty or has no data rows.',
    MISSING_REQUIRED_COLUMNS: 'Google Sheet must contain at least "word" and "description" columns.',
    NO_VALID_WORDS: 'No valid word entries found in the Google Sheet.',
    NETWORK_ERROR: 'Network error occurred while loading data.',
    LOADING_ERROR: 'Error loading words.csv'
};

// Success messages
export const SUCCESS_MESSAGES = {
    DATA_LOADED: 'Words loaded successfully!',
    GAME_COMPLETE: 'Game Complete!',
    PERFECT_PERFORMANCE: '🎉 Perfect Performance! 🎉'
};
