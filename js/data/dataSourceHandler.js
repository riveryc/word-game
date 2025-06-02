import { parseCSVLine } from './csvParser.js';
import { loadGoogleSheets } from './googleSheets.js';

// Internal state for data source management
let currentDataSource = 'default'; // 'local' or 'google' or 'default'
let googleSheetsUrlInternal = '';

// Callbacks to be set by script.js for updating main state and UI
let onDataLoadedCallback = null;
let onDataErrorCallback = null; // For generic data source errors
let onUrlErrorCallback = null; // Specifically for URL errors
let onGoBackCallback = null; // When going back to data source selection

export function initializeDataSourceHandler(callbacks) {
    onDataLoadedCallback = callbacks.onDataLoaded;
    onDataErrorCallback = callbacks.onDataError;
    onUrlErrorCallback = callbacks.onUrlError; // if you want to handle URL error display in script.js
    onGoBackCallback = callbacks.onGoBack;

    // Call setupDataSourceSelection here if it needs to run on init
    // setupDataSourceSelection(); // Let script.js call this after DOMContentLoaded
}

export function setCurrentDataSource(source) {
    currentDataSource = source;
}

export function getCurrentDataSource() {
    return currentDataSource;
}

export function setGoogleSheetsUrl(url) {
    googleSheetsUrlInternal = url;
}

export function getGoogleSheetsUrl() {
    return googleSheetsUrlInternal;
}


export function setupDataSourceSelection() {
    const defaultRadio = document.getElementById('default-csv');
    const googleRadio = document.getElementById('google-sheets');
    const localRadio = document.getElementById('local-csv');

    const googleInputSection = document.getElementById('google-sheets-input');
    const localInputSection = document.getElementById('local-csv-input');

    const defaultOptionDiv = document.getElementById('default-csv-option');
    const googleOptionDiv = document.getElementById('google-sheets-option');
    const localOptionDiv = document.getElementById('local-csv-option');

    function updateSelectionUI() {
        if (googleInputSection) googleInputSection.style.display = 'none';
        if (localInputSection) localInputSection.style.display = 'none';

        if (defaultRadio) defaultRadio.checked = (currentDataSource === 'default');
        if (googleRadio) googleRadio.checked = (currentDataSource === 'google');
        if (localRadio) localRadio.checked = (currentDataSource === 'local');
        
        if (defaultOptionDiv) defaultOptionDiv.classList.toggle('selected', currentDataSource === 'default');
        if (googleOptionDiv) googleOptionDiv.classList.toggle('selected', currentDataSource === 'google');
        if (localOptionDiv) localOptionDiv.classList.toggle('selected', currentDataSource === 'local');

        if (currentDataSource === 'google' && googleInputSection) {
            googleInputSection.style.display = 'block';
            const sheetsUrlInput = document.getElementById('sheets-url');
            if (sheetsUrlInput) sheetsUrlInput.focus();
        } else if (currentDataSource === 'local' && localInputSection) {
            localInputSection.style.display = 'block';
        }
    }

    function selectSource(source) {
        currentDataSource = source; // Use internal state
        updateSelectionUI();
    }

    if (defaultRadio) defaultRadio.addEventListener('change', () => { if (defaultRadio.checked) selectSource('default'); });
    if (googleRadio) googleRadio.addEventListener('change', () => { if (googleRadio.checked) selectSource('google'); });
    if (localRadio) localRadio.addEventListener('change', () => { if (localRadio.checked) selectSource('local'); });

    if (defaultOptionDiv) defaultOptionDiv.addEventListener('click', () => selectSource('default'));
    if (googleOptionDiv) googleOptionDiv.addEventListener('click', () => selectSource('google'));
    if (localOptionDiv) localOptionDiv.addEventListener('click', () => selectSource('local'));
    
    // Initialize based on default value
    if (defaultRadio && defaultRadio.checked) currentDataSource = 'default';
    else if (googleRadio && googleRadio.checked) currentDataSource = 'google';
    else if (localRadio && localRadio.checked) currentDataSource = 'local';
    updateSelectionUI();
}

export async function loadSelectedDataSource() {
    document.getElementById('data-source-selection').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    const contentDiv = document.getElementById('content');

    if (currentDataSource === 'default') {
        contentDiv.innerHTML = '<div class="loading">Loading default words...</div>';
        await loadLocalCSVData(); // Renamed to avoid conflict if script.js has one
    } else if (currentDataSource === 'google') {
        contentDiv.innerHTML = '<div class="loading">Loading from Google Sheets...</div>';
        const urlInput = document.getElementById('sheets-url');
        const url = urlInput ? urlInput.value.trim() : '';
        if (!url) {
            showUrlError('Please enter a Google Sheets URL'); // This function will call onUrlErrorCallback
            if (onGoBackCallback) onGoBackCallback(true); // Signal to go back, error state = true
            return;
        }
        if (!url.includes('docs.google.com/spreadsheets')) {
            showUrlError('Please enter a valid Google Sheets URL (must contain "docs.google.com/spreadsheets")');
            if (onGoBackCallback) onGoBackCallback(true); // Signal to go back, error state = true
            return;
        }
        googleSheetsUrlInternal = url;
        try {
            const csvText = await loadGoogleSheets(url);
            const parsedData = parseGoogleSheetsData(csvText);
            console.log('[DataSourceHandler] Google Sheets - Parsed data word count:', parsedData.allWords.length);
            if (onDataLoadedCallback) {
                console.log('[DataSourceHandler] Google Sheets - Calling onDataLoadedCallback.');
                onDataLoadedCallback(parsedData);
            } else {
                console.error('[DataSourceHandler] Google Sheets - onDataLoadedCallback is not defined!');
            }
        } catch (error) {
            console.error('Error loading or parsing Google Sheets data:', error);
            showDataSourceError(error.message || 'Failed to load Google Sheets.');
             if (onGoBackCallback) onGoBackCallback(true); // Signal to go back, error state = true
        }
    } else if (currentDataSource === 'local') {
        contentDiv.innerHTML = '<div class="loading">Loading from uploaded file...</div>';
        const fileInput = document.getElementById('csv-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            showUrlError('Please select a CSV file to upload.');
            if (onGoBackCallback) onGoBackCallback(true); // Signal to go back, error state = true
            return;
        }
        const file = fileInput.files[0];
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showUrlError('Please select a valid .csv file.');
            if (onGoBackCallback) onGoBackCallback(true); // Signal to go back, error state = true
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const csvText = event.target.result;
                const parsedData = parseGoogleSheetsData(csvText); // Re-use existing parser
                console.log('[DataSourceHandler] Local CSV Upload - Parsed data word count:', parsedData.allWords.length);
                if (onDataLoadedCallback) {
                    console.log('[DataSourceHandler] Local CSV Upload - Calling onDataLoadedCallback.');
                    onDataLoadedCallback(parsedData);
                } else {
                    console.error('[DataSourceHandler] Local CSV Upload - onDataLoadedCallback is not defined!');
                }
            } catch (error) {
                console.error('Error processing uploaded CSV:', error);
                showDataSourceError(`Error processing uploaded CSV: ${error.message}`);
                if (onGoBackCallback) onGoBackCallback(true); // Signal to go back, error state = true
            }
        };
        reader.onerror = function() {
            console.error('Error reading file:', reader.error);
            showDataSourceError(`Error reading file: ${reader.error.message}`);
            if (onGoBackCallback) onGoBackCallback(true); // Signal to go back, error state = true
        };
        reader.readAsText(file);
    } else {
        console.error('Unknown data source selected:', currentDataSource);
        showDataSourceError('Invalid data source selected. Please try again.');
        if (onGoBackCallback) onGoBackCallback(true); // Signal to go back, error state = true
    }
}

export function showUrlError(message) {
    const urlInput = document.getElementById('sheets-url');
    if (urlInput) { // Check if element exists
        urlInput.style.borderColor = '#FF4444';
        urlInput.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';

        let errorDiv = document.getElementById('url-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'url-error';
            errorDiv.style.color = '#FF6666';
            errorDiv.style.fontSize = '0.9em';
            errorDiv.style.marginTop = '5px';
            // Ensure parentNode exists before appending
            if (urlInput.parentNode) {
                 urlInput.parentNode.appendChild(errorDiv);
            }
        }
        errorDiv.textContent = message;

        urlInput.addEventListener('focus', function() {
            this.style.borderColor = 'white';
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            if (errorDiv) {
                errorDiv.remove();
            }
        }, { once: true });
    }
    // Call general error callback if it's intended to also handle this
    if (onUrlErrorCallback) onUrlErrorCallback(message);
}

export function extractSheetId(url) {
    const patterns = [
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        /\/d\/([a-zA-Z0-9-_]+)/,
        /id=([a-zA-Z0-9-_]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

export function generateCSVExportUrl(sheetId) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

// This function now returns the data instead of setting globals
export function parseGoogleSheetsData(text) {
    const localAllWords = [];
    const localAllDescriptions = [];
    const localAllExampleSentences = [];
    const localAllWordData = [];

    try {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error('CSV data appears to be empty or has no data rows.');

        const header = lines[0].toLowerCase();
        const dataLines = lines.slice(1);

        const requiredColumns = ['word', 'description'];
        if (!requiredColumns.every(col => header.includes(col))) {
            throw new Error('CSV data must contain at least "word" and "description" columns.');
        }

        dataLines.forEach((line, index) => {
            try {
                const parsed = parseCSVLine(line); // Imported function
                if (parsed.length >= 6) {
                    const [word, date, grade, source, exampleSentence, description] = parsed.map(s => s.trim());
                    if (word && exampleSentence) { // Require word and example sentence
                        localAllWords.push(word.toLowerCase());
                        localAllExampleSentences.push(exampleSentence);
                        localAllDescriptions.push(description);
                        localAllWordData.push({ word: word.toLowerCase(), date, grade, source, exampleSentence, description });
                    }
                } else if (parsed.length >= 5) { // Legacy 5-column
                    const [word, date, grade, source, description] = parsed.map(s => s.trim());
                    if (word && description) {
                        localAllWords.push(word.toLowerCase());
                        localAllExampleSentences.push('');
                        localAllDescriptions.push(description);
                        localAllWordData.push({ word: word.toLowerCase(), date, grade, source, exampleSentence: '', description });
                    }
                } else if (parsed.length >= 2) { // Fallback 2-column
                    const [word, description] = parsed.map(s => s.trim());
                    if (word && description) {
                        localAllWords.push(word.toLowerCase());
                        localAllExampleSentences.push('');
                        localAllDescriptions.push(description);
                        localAllWordData.push({ word: word.toLowerCase(), date: '', grade: '', source: '', exampleSentence: '', description });
                    }
                }
            } catch (lineError) {
                console.warn(`Error parsing line ${index + 2}:`, lineError);
            }
        });

        if (localAllWords.length === 0) throw new Error('No valid word entries found in the CSV data.');
        
        return {
            allWords: localAllWords,
            allDescriptions: localAllDescriptions,
            allExampleSentences: localAllExampleSentences,
            allWordData: localAllWordData
        };

    } catch (error) {
        // Re-throw to be caught by calling function (loadSelectedDataSource or loadLocalCSVData)
        throw new Error(`Error parsing CSV data: ${error.message}`);
    }
}

export function showDataSourceError(message) {
    const contentDiv = document.getElementById('content');
    if (contentDiv) { // Check if element exists
        contentDiv.innerHTML = `
            <div class="error">
                <h2>❌ Loading Failed</h2>
                <p>${message}</p>
                <button class="start-button" onclick="window.goBackToDataSourceHandler()" style="margin-top: 20px;">
                    Try Again
                </button>
            </div>
        `;
    }
    // Expose goBackToDataSource to window for the button, or use event listener
    window.goBackToDataSourceHandler = goBackToDataSource;

    if (onDataErrorCallback) onDataErrorCallback(message);
}

export function goBackToDataSource() {
    if (onGoBackCallback) onGoBackCallback(false); // false = not an error state, just going back
}

// Renamed to avoid conflict, now part of this module
export async function loadLocalCSVData() {
    const contentDiv = document.getElementById('content');
    if (contentDiv) contentDiv.innerHTML = '<div class="loading">Loading default words...</div>';
    
    try {
        const response = await fetch('words.csv');
        if (!response.ok) {
            throw new Error(`Failed to fetch default words.csv: ${response.statusText}`);
        }
        const csvText = await response.text();
        const parsedData = parseGoogleSheetsData(csvText); // Re-use existing parser for consistency
        console.log('[DataSourceHandler] Default CSV - Parsed data word count:', parsedData.allWords.length);

        if (onDataLoadedCallback) {
            console.log('[DataSourceHandler] Default CSV - Calling onDataLoadedCallback.');
            onDataLoadedCallback(parsedData);
        } else {
            console.error('[DataSourceHandler] Default CSV - onDataLoadedCallback is not defined!');
        }
    } catch (error) {
        console.error('Error loading or parsing default words.csv:', error);
        showDataSourceError(error.message || 'Failed to load default words.csv.');
        if (onGoBackCallback) onGoBackCallback(true); // Signal to go back, error state = true
    }
} 