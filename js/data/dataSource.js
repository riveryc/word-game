// Data source selection and loading management

import { DATA_SOURCES, ELEMENTS, CSS_CLASSES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../app/config.js';
import { getElementById, showElement, hideElement, addClass, removeClass, setValue, getValue } from '../utils/helpers.js';
import { validateGoogleSheetsUrl, validateFileInput } from '../utils/validation.js';
import { parseCSV } from './csvParser.js';
import { loadGoogleSheets } from './googleSheets.js';

/**
 * Data source manager class
 */
export class DataSourceManager {
    constructor() {
        this.currentSource = DATA_SOURCES.DEFAULT;
        this.loadedData = null;
        this.onDataLoadedCallback = null;
        this.init();
    }

    /**
     * Initialize data source manager
     */
    init() {
        this.setupEventListeners();
        this.updateUIForSelectedSource();
    }

    /**
     * Set up event listeners for data source selection
     */
    setupEventListeners() {
        // Radio button change listeners
        const defaultRadio = getElementById(ELEMENTS.DEFAULT_CSV_RADIO);
        const googleRadio = getElementById(ELEMENTS.GOOGLE_SHEETS_RADIO);
        const localRadio = getElementById(ELEMENTS.LOCAL_CSV_RADIO);

        if (defaultRadio) {
            defaultRadio.addEventListener('change', () => {
                if (defaultRadio.checked) {
                    this.selectDataSource(DATA_SOURCES.DEFAULT);
                }
            });
        }

        if (googleRadio) {
            googleRadio.addEventListener('change', () => {
                if (googleRadio.checked) {
                    this.selectDataSource(DATA_SOURCES.GOOGLE);
                }
            });
        }

        if (localRadio) {
            localRadio.addEventListener('change', () => {
                if (localRadio.checked) {
                    this.selectDataSource(DATA_SOURCES.LOCAL);
                }
            });
        }

        // Option click listeners
        const defaultOption = getElementById(ELEMENTS.DEFAULT_CSV_OPTION);
        const googleOption = getElementById(ELEMENTS.GOOGLE_SHEETS_OPTION);
        const localOption = getElementById(ELEMENTS.LOCAL_CSV_OPTION);

        if (defaultOption) {
            defaultOption.addEventListener('click', () => {
                this.selectDataSource(DATA_SOURCES.DEFAULT);
            });
        }

        if (googleOption) {
            googleOption.addEventListener('click', () => {
                this.selectDataSource(DATA_SOURCES.GOOGLE);
            });
        }

        if (localOption) {
            localOption.addEventListener('click', () => {
                this.selectDataSource(DATA_SOURCES.LOCAL);
            });
        }

        // Load button listener
        const loadButton = getElementById(ELEMENTS.LOAD_DATA_BUTTON);
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                this.loadSelectedDataSource();
            });
        }
    }

    /**
     * Select a data source
     * @param {string} source - Data source type
     */
    selectDataSource(source) {
        this.currentSource = source;
        this.updateRadioSelection();
        this.updateOptionSelection();
        this.updateUIForSelectedSource();
    }

    /**
     * Update radio button selection
     */
    updateRadioSelection() {
        const radios = {
            [DATA_SOURCES.DEFAULT]: getElementById(ELEMENTS.DEFAULT_CSV_RADIO),
            [DATA_SOURCES.GOOGLE]: getElementById(ELEMENTS.GOOGLE_SHEETS_RADIO),
            [DATA_SOURCES.LOCAL]: getElementById(ELEMENTS.LOCAL_CSV_RADIO)
        };

        Object.entries(radios).forEach(([source, radio]) => {
            if (radio) {
                radio.checked = source === this.currentSource;
            }
        });
    }

    /**
     * Update option visual selection
     */
    updateOptionSelection() {
        const options = {
            [DATA_SOURCES.DEFAULT]: getElementById(ELEMENTS.DEFAULT_CSV_OPTION),
            [DATA_SOURCES.GOOGLE]: getElementById(ELEMENTS.GOOGLE_SHEETS_OPTION),
            [DATA_SOURCES.LOCAL]: getElementById(ELEMENTS.LOCAL_CSV_OPTION)
        };

        Object.entries(options).forEach(([source, option]) => {
            if (option) {
                if (source === this.currentSource) {
                    addClass(option, CSS_CLASSES.SELECTED);
                } else {
                    removeClass(option, CSS_CLASSES.SELECTED);
                }
            }
        });
    }

    /**
     * Update UI based on selected source
     */
    updateUIForSelectedSource() {
        const googleInput = getElementById(ELEMENTS.GOOGLE_SHEETS_INPUT);
        const localInput = getElementById(ELEMENTS.LOCAL_CSV_INPUT);

        // Hide all input sections first
        if (googleInput) hideElement(googleInput);
        if (localInput) hideElement(localInput);

        // Show relevant input section
        switch (this.currentSource) {
            case DATA_SOURCES.GOOGLE:
                if (googleInput) showElement(googleInput);
                break;
            case DATA_SOURCES.LOCAL:
                if (localInput) showElement(localInput);
                break;
            // DEFAULT doesn't need additional input
        }
    }

    /**
     * Load data from selected source
     */
    async loadSelectedDataSource() {
        const loadButton = getElementById(ELEMENTS.LOAD_DATA_BUTTON);
        if (loadButton) {
            loadButton.disabled = true;
            loadButton.textContent = 'Loading...';
        }

        try {
            let data = null;

            switch (this.currentSource) {
                case DATA_SOURCES.DEFAULT:
                    data = await this.loadDefaultCSV();
                    break;
                case DATA_SOURCES.GOOGLE:
                    data = await this.loadGoogleSheetsData();
                    break;
                case DATA_SOURCES.LOCAL:
                    data = await this.loadLocalCSVData();
                    break;
                default:
                    throw new Error('Invalid data source selected');
            }

            this.loadedData = data;
            this.showSuccessMessage();
            
            if (this.onDataLoadedCallback) {
                this.onDataLoadedCallback(data);
            }

        } catch (error) {
            this.showErrorMessage(error.message);
        } finally {
            if (loadButton) {
                loadButton.disabled = false;
                loadButton.textContent = 'Load Words';
            }
        }
    }

    /**
     * Load default CSV file
     * @returns {Promise<Array>} - Parsed word data
     */
    async loadDefaultCSV() {
        try {
            const response = await fetch('words.csv');
            if (!response.ok) {
                throw new Error(ERROR_MESSAGES.LOADING_ERROR);
            }
            const csvText = await response.text();
            return parseCSV(csvText);
        } catch (error) {
            throw new Error(`${ERROR_MESSAGES.LOADING_ERROR}: ${error.message}`);
        }
    }

    /**
     * Load Google Sheets data
     * @returns {Promise<Array>} - Parsed word data
     */
    async loadGoogleSheetsData() {
        const urlInput = getElementById(ELEMENTS.SHEETS_URL);
        const url = getValue(urlInput);

        const validation = validateGoogleSheetsUrl(url);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        return await loadGoogleSheets(url);
    }

    /**
     * Load local CSV file data
     * @returns {Promise<Array>} - Parsed word data
     */
    async loadLocalCSVData() {
        const fileInput = getElementById(ELEMENTS.CSV_FILE);
        const file = fileInput?.files?.[0];

        const validation = validateFileInput(file);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const csvText = event.target.result;
                    const data = parseCSV(csvText);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            reader.readAsText(file);
        });
    }

    /**
     * Show success message
     */
    showSuccessMessage() {
        // This could be enhanced with a proper notification system
        console.log(SUCCESS_MESSAGES.DATA_LOADED);
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showErrorMessage(message) {
        // This could be enhanced with a proper notification system
        console.error('Data loading error:', message);
        alert(`Error: ${message}`);
    }

    /**
     * Set callback for when data is loaded
     * @param {Function} callback - Callback function
     */
    setOnDataLoadedCallback(callback) {
        this.onDataLoadedCallback = callback;
    }

    /**
     * Get currently loaded data
     * @returns {Array|null} - Loaded data or null
     */
    getLoadedData() {
        return this.loadedData;
    }

    /**
     * Get current data source
     * @returns {string} - Current data source
     */
    getCurrentSource() {
        return this.currentSource;
    }
}

// Global data source manager instance
export const dataSourceManager = new DataSourceManager();
