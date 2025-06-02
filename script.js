import { parseCSVLine } from './js/data/csvParser.js';
import { shuffleArray } from './js/utils/helpers.js';
import { validateTimeoutInput } from './js/utils/validation.js';
import { loadGoogleSheets } from './js/data/googleSheets.js';

// Game state variables
let allWords = [];
let allDescriptions = [];
let allExampleSentences = []; // New: example sentences for each word
let allWordData = []; // Complete word data with all columns
let filteredWordData = []; // Filtered word data based on user selection
let gameWords = [];
let gameDescriptions = [];
let gameExampleSentences = []; // New: example sentences for game words
let wordResults = []; // Track result for each word: enhanced with timing data
let currentWordIndex = 0;
let currentWord = '';
let currentDescription = '';
let currentExampleSentence = ''; // New: current example sentence
let partialWord = '';
let missingLetters = '';
let correctAnswers = 0;
let totalWords = 0;
let isRetryMode = false;
let lastFocusedInput = null; // Track the last focused input field
let waitingForContinue = false; // Track if we're waiting for Enter to continue after incorrect answer
let selectedLevel = 3; // Default to Level 3 (70% missing)
let isProcessing = false; // Prevent rapid Enter key presses
let selectedWordCount = 20; // Default number of words to practice


// Timer system variables
let timeoutPerLetter = 5; // Default 5 seconds per missing letter
let currentWordTimeoutThreshold = 0; // Calculated timeout for current word (letters × timeoutPerLetter)
let hasTimeLimit = true; // false when timeoutPerLetter = 0
let showTimerDisplay = false; // Whether to show elapsed timer to user
let currentWordStartTime = null; // When the current word started
let currentWordTimer = null; // Timer interval for updating display
let timeElapsed = 0; // Current elapsed time in seconds
let wordRetryData = []; // Enhanced retry tracking: {word, reason, attempts, maxAttempts, originalIndex}

// Data source variables
let currentDataSource = 'local'; // 'local' or 'google'
let googleSheetsUrl = '';

// Filter variables
let availableGrades = [];
let availableSources = [];
let selectedGrades = [];
let selectedSources = [];
let dateFrom = '';
let dateTo = '';

// Data source selection functions
function setupDataSourceSelection() {
    const defaultRadio = document.getElementById('default-csv');
    const googleRadio = document.getElementById('google-sheets');
    const localRadio = document.getElementById('local-csv'); // Added for Upload Local CSV

    const googleInputSection = document.getElementById('google-sheets-input');
    const localInputSection = document.getElementById('local-csv-input'); // Added for Upload Local CSV input section

    const defaultOptionDiv = document.getElementById('default-csv-option');
    const googleOptionDiv = document.getElementById('google-sheets-option');
    const localOptionDiv = document.getElementById('local-csv-option'); // Added for Upload Local CSV option div

    function updateSelectionUI() {
        // Hide all input sections first
        if (googleInputSection) googleInputSection.style.display = 'none';
        if (localInputSection) localInputSection.style.display = 'none';

        // Update radio checked state and div class based on currentDataSource
        if (defaultRadio) defaultRadio.checked = (currentDataSource === 'default');
        if (googleRadio) googleRadio.checked = (currentDataSource === 'google');
        if (localRadio) localRadio.checked = (currentDataSource === 'local');
        
        if (defaultOptionDiv) defaultOptionDiv.classList.toggle('selected', currentDataSource === 'default');
        if (googleOptionDiv) googleOptionDiv.classList.toggle('selected', currentDataSource === 'google');
        if (localOptionDiv) localOptionDiv.classList.toggle('selected', currentDataSource === 'local');

        // Show relevant input section
        if (currentDataSource === 'google' && googleInputSection) {
            googleInputSection.style.display = 'block';
            const sheetsUrlInput = document.getElementById('sheets-url');
            if (sheetsUrlInput) sheetsUrlInput.focus();
        } else if (currentDataSource === 'local' && localInputSection) {
            localInputSection.style.display = 'block';
            const csvFileInput = document.getElementById('csv-file');
            // if (csvFileInput) csvFileInput.focus(); // Focusing file input can be disruptive
        }
    }

    function selectSource(source) {
        currentDataSource = source;
        updateSelectionUI();
    }

    // Event listeners for radio buttons
    if (defaultRadio) defaultRadio.addEventListener('change', () => { if (defaultRadio.checked) selectSource('default'); });
    if (googleRadio) googleRadio.addEventListener('change', () => { if (googleRadio.checked) selectSource('google'); });
    if (localRadio) localRadio.addEventListener('change', () => { if (localRadio.checked) selectSource('local'); });

    // Event listeners for clicking on option divs
    if (defaultOptionDiv) defaultOptionDiv.addEventListener('click', () => selectSource('default'));
    if (googleOptionDiv) googleOptionDiv.addEventListener('click', () => selectSource('google'));
    if (localOptionDiv) localOptionDiv.addEventListener('click', () => selectSource('local'));

    // Initialize based on default checked radio
    if (defaultRadio && defaultRadio.checked) {
        currentDataSource = 'default';
    } else if (googleRadio && googleRadio.checked) {
        currentDataSource = 'google';
    } else if (localRadio && localRadio.checked) {
        currentDataSource = 'local';
    }
    updateSelectionUI(); // Initial UI setup
}

function loadSelectedDataSource() {
    if (currentDataSource === 'default') {
        loadLocalCSV(); // This loads words.csv by default
    } else if (currentDataSource === 'google') {
        const url = document.getElementById('sheets-url').value.trim();
        if (!url) {
            showUrlError('Please enter a Google Sheets URL');
            return;
        }
        if (!url.includes('docs.google.com/spreadsheets')) {
            showUrlError('Please enter a valid Google Sheets URL (must contain "docs.google.com/spreadsheets")');
            return;
        }
        googleSheetsUrl = url;
        loadGoogleSheets(url); // Now correctly calls imported function
    } else if (currentDataSource === 'local') {
        const fileInput = document.getElementById('csv-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            showUrlError('Please select a CSV file to upload.'); // Reusing showUrlError for simplicity, might need a dedicated error display
            return;
        }
        const file = fileInput.files[0];
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showUrlError('Please select a valid .csv file.');
            return;
        }

        document.getElementById('data-source-selection').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = '<div class="loading">Loading from uploaded file...</div>';

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const csvText = event.target.result;
                parseGoogleSheetsData(csvText); // Re-use existing parser for CSV structure
            } catch (error) {
                console.error('Error processing uploaded CSV:', error);
                showDataSourceError(`Error processing uploaded CSV: ${error.message}`);
            }
        };
        reader.onerror = function() {
            console.error('Error reading file:', reader.error);
            showDataSourceError(`Error reading file: ${reader.error.message}`);
        };
        reader.readAsText(file);
    } else {
        console.error('Unknown data source selected:', currentDataSource);
        showDataSourceError('Invalid data source selected. Please try again.');
    }
}

function showUrlError(message) {
    const urlInput = document.getElementById('sheets-url');
    urlInput.style.borderColor = '#FF4444';
    urlInput.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';

    // Show error message
    let errorDiv = document.getElementById('url-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'url-error';
        errorDiv.style.color = '#FF6666';
        errorDiv.style.fontSize = '0.9em';
        errorDiv.style.marginTop = '5px';
        urlInput.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = message;

    // Clear error on focus
    urlInput.addEventListener('focus', function() {
        this.style.borderColor = 'white';
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        if (errorDiv) {
            errorDiv.remove();
        }
    }, { once: true });
}

// Google Sheets integration functions
function extractSheetId(url) {
    // Handle various Google Sheets URL formats
    const patterns = [
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,  // Standard format
        /\/d\/([a-zA-Z0-9-_]+)/,               // Short format
        /id=([a-zA-Z0-9-_]+)/                  // Query parameter format
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

function generateCSVExportUrl(sheetId) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

function parseGoogleSheetsData(text) {
    try {
        // Parse CSV content
        const lines = text.split('\n').filter(line => line.trim() !== '');

        if (lines.length < 2) {
            throw new Error('Google Sheet appears to be empty or has no data rows.');
        }

        const header = lines[0].toLowerCase();
        const dataLines = lines.slice(1);

        // Check for required columns
        const requiredColumns = ['word', 'description'];
        const hasRequiredColumns = requiredColumns.every(col => header.includes(col));

        if (!hasRequiredColumns) {
            throw new Error('Google Sheet must contain at least "word" and "description" columns.');
        }

        // Parse each line
        allWords = [];
        allDescriptions = [];
        allExampleSentences = [];
        allWordData = [];

        dataLines.forEach((line, index) => {
            try {
                const parsed = parseCSVLine(line);
                if (parsed.length >= 6) {
                    // 6-column format: word, date, grade, source, example sentence, description
                    const word = parsed[0].trim();
                    const date = parsed[1].trim();
                    const grade = parsed[2].trim();
                    const source = parsed[3].trim();
                    const exampleSentence = parsed[4].trim();
                    const description = parsed[5].trim();

                    if (word && exampleSentence) {
                        allWords.push(word.toLowerCase());
                        allExampleSentences.push(exampleSentence);
                        allDescriptions.push(description); // Keep for future use
                        allWordData.push({
                            word: word.toLowerCase(),
                            date: date,
                            grade: grade,
                            source: source,
                            exampleSentence: exampleSentence,
                            description: description
                        });
                    }
                } else if (parsed.length >= 5) {
                    // 5-column format: word, date, grade, source, description (legacy)
                    const word = parsed[0].trim();
                    const date = parsed[1].trim();
                    const grade = parsed[2].trim();
                    const source = parsed[3].trim();
                    const description = parsed[4].trim();

                    if (word && description) {
                        allWords.push(word.toLowerCase());
                        allExampleSentences.push(''); // No example sentence
                        allDescriptions.push(description);
                        allWordData.push({
                            word: word.toLowerCase(),
                            date: date,
                            grade: grade,
                            source: source,
                            exampleSentence: '',
                            description: description
                        });
                    }
                } else if (parsed.length >= 2) {
                    // Fallback to 2-column format: word, description
                    const word = parsed[0].trim();
                    const description = parsed[1].trim();

                    if (word && description) {
                        allWords.push(word.toLowerCase());
                        allExampleSentences.push(''); // No example sentence
                        allDescriptions.push(description);
                        allWordData.push({
                            word: word.toLowerCase(),
                            date: '',
                            grade: '',
                            source: '',
                            exampleSentence: '',
                            description: description
                        });
                    }
                }
            } catch (lineError) {
                console.warn(`Error parsing line ${index + 2}:`, lineError);
            }
        });

        if (allWords.length === 0) {
            throw new Error('No valid word entries found in the Google Sheet.');
        }

        // Extract available grades and sources for filtering
        extractFilterOptions();

        // Show success and proceed to level selection
        showWordCountAndLevelSelection();

    } catch (error) {
        throw new Error(`Error parsing Google Sheets data: ${error.message}`);
    }
}

function showDataSourceError(message) {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="error">
            <h2>❌ Loading Failed</h2>
            <p>${message}</p>
            <button class="start-button" onclick="goBackToDataSource()" style="margin-top: 20px;">
                Try Again
            </button>
        </div>
    `;
}

function goBackToDataSource() {
    document.getElementById('content').style.display = 'none';
    document.getElementById('data-source-selection').style.display = 'block';

    // Update back button visibility
    updateBackButtonVisibility();
}

// Filter functions
function extractFilterOptions() {
    availableGrades = [];
    availableSources = [];

    allWordData.forEach(wordData => {
        if (wordData.grade && !availableGrades.includes(wordData.grade)) {
            availableGrades.push(wordData.grade);
        }
        if (wordData.source && !availableSources.includes(wordData.source)) {
            availableSources.push(wordData.source);
        }
    });

    // Sort for better UX
    availableGrades.sort();
    availableSources.sort();

    // Initialize selections (all selected by default)
    selectedGrades = [...availableGrades];
    selectedSources = [...availableSources];

    // Initialize filtered data with all words
    applyFilters();
}

function applyFilters() {
    filteredWordData = allWordData.filter(wordData => {
        // Date filter
        if (dateFrom && wordData.date && wordData.date < dateFrom) return false;
        if (dateTo && wordData.date && wordData.date > dateTo) return false;

        // Grade filter (only apply if grades exist and some are selected)
        if (availableGrades.length > 0 && selectedGrades.length > 0) {
            if (wordData.grade && !selectedGrades.includes(wordData.grade)) return false;
        }

        // Source filter (only apply if sources exist and some are selected)
        if (availableSources.length > 0 && selectedSources.length > 0) {
            if (wordData.source && !selectedSources.includes(wordData.source)) return false;
        }

        return true;
    });

    // Update the arrays used by the game
    allWords = filteredWordData.map(data => data.word);
    allDescriptions = filteredWordData.map(data => data.description);
    allExampleSentences = filteredWordData.map(data => data.exampleSentence || '');

    // Update word count display
    updateWordCountDisplay();
}

function updateWordCountDisplay() {
    const wordCount = allWords.length;
    const contentDiv = document.getElementById('content');

    if (contentDiv) {
        contentDiv.innerHTML = `
            <div>Filtered words:</div>
            <div class="word-count">${wordCount}</div>
        `;
    }

    // Update word count selection if needed
    if (wordCount > 30) {
        const wordCountSelection = document.getElementById('word-count-selection');
        if (wordCountSelection) {
            wordCountSelection.style.display = 'block';
            document.getElementById('total-words-count').textContent = wordCount;

            const wordCountInput = document.getElementById('word-count-input');
            wordCountInput.value = Math.min(20, wordCount);
            wordCountInput.max = wordCount;
            selectedWordCount = parseInt(wordCountInput.value);
        }
    } else {
        selectedWordCount = wordCount;
        const wordCountSelection = document.getElementById('word-count-selection');
        if (wordCountSelection) {
            wordCountSelection.style.display = 'none';
        }
    }
}

function setupFilters() {
    // Only show filters if we have data that can be filtered
    const hasFilterableData = availableGrades.length > 0 || availableSources.length > 0;

    if (!hasFilterableData) {
        document.getElementById('word-filters').style.display = 'none';
        return;
    }

    document.getElementById('word-filters').style.display = 'block';

    // Setup date filters
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');

    if (dateFromInput) {
        dateFromInput.addEventListener('change', function() {
            dateFrom = this.value;
            applyFilters();
        });
    }

    if (dateToInput) {
        dateToInput.addEventListener('change', function() {
            dateTo = this.value;
            applyFilters();
        });
    }

    // Setup grade filters
    setupMultiSelect('grade-filters', availableGrades, selectedGrades, function(newSelection) {
        selectedGrades = newSelection;
        applyFilters();
    });

    // Setup source filters
    setupMultiSelect('source-filters', availableSources, selectedSources, function(newSelection) {
        selectedSources = newSelection;
        applyFilters();
    });
}

function setupMultiSelect(containerId, options, selected, onChangeCallback) {
    const container = document.getElementById(containerId);
    if (!container || options.length === 0) {
        if (container) container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = '';

    options.forEach(option => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = option;
        checkbox.checked = selected.includes(option);

        checkbox.addEventListener('change', function() {
            if (this.checked) {
                if (!selected.includes(option)) {
                    selected.push(option);
                }
            } else {
                const index = selected.indexOf(option);
                if (index > -1) {
                    selected.splice(index, 1);
                }
            }
            onChangeCallback([...selected]);
        });

        const span = document.createElement('span');
        span.textContent = option;

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
}

function resetFilters() {
    // Reset date filters
    dateFrom = '';
    dateTo = '';
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';

    // Reset grade and source selections
    selectedGrades = [...availableGrades];
    selectedSources = [...availableSources];

    // Update checkboxes
    document.querySelectorAll('#grade-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    document.querySelectorAll('#source-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });

    // Apply filters
    applyFilters();
}

// Function to hide the target word in the example sentence
function hideWordInSentence(sentence, targetWord) {
    if (!sentence || !targetWord) {
        return sentence || '';
    }

    // Create a regex to find the word (case insensitive, whole word)
    const regex = new RegExp(`\\b${targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');

    // Replace the word with underscores of the same length
    return sentence.replace(regex, (match) => {
        return '_'.repeat(match.length);
    });
}

// Function to focus the appropriate input field
function focusAppropriateInput() {
    const allInputs = document.querySelectorAll('.inline-input');

    if (allInputs.length === 0) return;

    // If we have a last focused input and it's still empty, focus it
    if (lastFocusedInput && document.contains(lastFocusedInput) && !lastFocusedInput.value) {
        lastFocusedInput.focus();
        return;
    }

    // Otherwise, find the first empty input field
    for (let input of allInputs) {
        if (!input.value) {
            input.focus();
            return;
        }
    }

    // If all fields are filled, focus the first one
    allInputs[0].focus();
}

// Load words from local CSV file
async function loadLocalCSV() {
    // Show loading state
    document.getElementById('data-source-selection').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = '<div class="loading">Loading from local file...</div>';

    try {
        // Fetch the words.csv file
        const response = await fetch('words.csv');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the text content
        const text = await response.text();

        // Reuse the same parsing logic as Google Sheets
        parseGoogleSheetsData(text);

    } catch (error) {
        console.error('Error loading words:', error);
        showDataSourceError(`Error loading words.csv: ${error.message}`);
    }
}

// Common function to show word count and level selection
function showWordCountAndLevelSelection() {
    updateWordCountDisplay();

    // Show level selection
    document.getElementById('level-selection').style.display = 'block';

    // Update back button visibility
    updateBackButtonVisibility();

    // Setup filters
    setupFilters();

    // Setup word count selection event listeners
    const wordCount = allWords.length;
    if (wordCount > 30) {
        const wordCountInput = document.getElementById('word-count-input');
        if (wordCountInput) {
            // Remove existing event listeners to avoid duplicates
            const newInput = wordCountInput.cloneNode(true);
            wordCountInput.parentNode.replaceChild(newInput, wordCountInput);

            // Add event listener for word count changes
            newInput.addEventListener('input', function() {
                selectedWordCount = parseInt(this.value) || 1;
                selectedWordCount = Math.max(1, Math.min(selectedWordCount, allWords.length));
                this.value = selectedWordCount;
            });
        }
    }
}

// Level selection functions
function selectLevel(level) {
    selectedLevel = level;

    // Update visual selection
    document.querySelectorAll('.level-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector(`[data-level="${level}"]`).classList.add('selected');
}

function startGameWithLevel() {
    // Ensure timeout settings are properly initialized before starting game
    updateTimeoutThreshold();

    // Hide level selection and start the game
    document.getElementById('level-selection').style.display = 'none';
    startGame();
}

function createPartialWord(word) {
    if (!word || word.length === 0) {
        return { wordStructure: [], missingLetters: '' };
    }

    let wordStructure = [];
    let missingLetters = [];

    // Calculate how many letters to show based on selected level
    const missingPercentage = [50, 60, 70, 80, 90, 100][selectedLevel - 1];
    const totalLetters = word.length;
    const lettersToShow = Math.max(0, Math.ceil(totalLetters * (1 - missingPercentage / 100)));

    // Special case: for nightmare mode (level 6), show 0 letters always
    // For very short words at level 5, might show 0 letters
    const actualLettersToShow = selectedLevel === 6 ? 0 :
        (totalLetters <= 2 && selectedLevel === 5) ?
        Math.max(0, lettersToShow) : Math.max(1, lettersToShow);

    // Determine which positions to show - make it more random
    let visiblePositions = [];

    if (actualLettersToShow === 0) {
        // Show no letters (only for very short words at highest difficulty)
        visiblePositions = [];
    } else {
        // Create array of all possible positions
        const allPositions = [];
        for (let i = 0; i < totalLetters; i++) {
            allPositions.push(i);
        }

        // Randomly select positions to show
        const shuffledPositions = shuffleArray(allPositions);
        visiblePositions = shuffledPositions.slice(0, actualLettersToShow);
        visiblePositions.sort((a, b) => a - b);
    }

    // Build word structure
    for (let i = 0; i < word.length; i++) {
        if (visiblePositions.includes(i)) {
            wordStructure.push({ type: 'visible', letter: word[i] });
        } else {
            wordStructure.push({ type: 'input', letter: word[i], index: missingLetters.length });
            missingLetters.push(word[i]);
        }
    }

    return { wordStructure, missingLetters };
}

function addWordToRetryList(wordIndex, reason, maxAttempts) {
    // Check if word is already in retry list
    const existingEntry = wordRetryData.find(entry => entry.originalIndex === wordIndex);

    if (existingEntry) {
        // Update existing entry if this is a worse result
        if (reason === 'incorrect' && existingEntry.reason === 'timeout') {
            existingEntry.reason = 'incorrect';
            existingEntry.maxAttempts = 2;
        }
    } else {
        // Add new entry
        wordRetryData.push({
            word: gameWords[wordIndex],
            description: gameDescriptions[wordIndex],
            exampleSentence: gameExampleSentences[wordIndex],
            reason: reason,
            attempts: 0,
            maxAttempts: maxAttempts,
            originalIndex: wordIndex
        });
    }
}

function startGame() {
    // Hide the main content, level selection, word count selection and show game interface
    document.getElementById('content').style.display = 'none';
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    document.getElementById('game-interface').style.display = 'block';
    document.getElementById('final-results').style.display = 'none';

    // Update back button visibility
    updateBackButtonVisibility();

    // Initialize game state - shuffle words, descriptions, and example sentences together
    const wordDataPairs = allWords.map((word, index) => ({
        word: word,
        description: allDescriptions[index],
        exampleSentence: allExampleSentences[index]
    }));

    const shuffledPairs = shuffleArray(wordDataPairs);

    // Use only the selected number of words
    const selectedPairs = shuffledPairs.slice(0, selectedWordCount);
    gameWords = selectedPairs.map(pair => pair.word);
    gameDescriptions = selectedPairs.map(pair => pair.description);
    gameExampleSentences = selectedPairs.map(pair => pair.exampleSentence);

    currentWordIndex = 0;
    correctAnswers = 0;
    totalWords = gameWords.length;
    isRetryMode = false;

    // Initialize enhanced word results tracking
    wordResults = new Array(gameWords.length).fill(null).map(() => ({
        correct: false,
        timeElapsed: 0,
        result: 'pending'
    }));

    // Clear retry data
    wordRetryData = [];

    // Start the first word
    showNextWord();
}

function startRetryGame() {
    // Remove retry keyboard shortcut
    removeRetryKeyboardShortcut();

    // Hide final results, level selection, word count selection and show game interface
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    document.getElementById('game-interface').style.display = 'block';

    // Update back button visibility
    updateBackButtonVisibility();

    // Create retry game from wordRetryData
    const retryWords = [];

    // Process each word in retry list based on attempts vs maxAttempts
    for (const retryEntry of wordRetryData) {
        const attemptsNeeded = retryEntry.maxAttempts - retryEntry.attempts;

        // Add the word multiple times based on how many attempts are needed
        for (let i = 0; i < attemptsNeeded; i++) {
            retryWords.push({
                word: retryEntry.word,
                description: retryEntry.description,
                exampleSentence: retryEntry.exampleSentence,
                retryReason: retryEntry.reason,
                originalIndex: retryEntry.originalIndex
            });
        }
    }

    // Shuffle the retry words
    const shuffledRetryWords = shuffleArray(retryWords);
    gameWords = shuffledRetryWords.map(item => item.word);
    gameDescriptions = shuffledRetryWords.map(item => item.description);
    gameExampleSentences = shuffledRetryWords.map(item => item.exampleSentence);

    currentWordIndex = 0;
    correctAnswers = 0;
    totalWords = gameWords.length;
    isRetryMode = true;

    // Initialize enhanced word results tracking for retry
    wordResults = new Array(gameWords.length).fill(null).map(() => ({
        correct: false,
        timeElapsed: 0,
        result: 'pending'
    }));

    // Clear retry data for this retry session
    wordRetryData = [];

    // Start the first word
    showNextWord();
}

function showNextWord() {
    if (currentWordIndex >= gameWords.length) {
        showFinalResults();
        return;
    }

    currentWord = gameWords[currentWordIndex];
    currentDescription = gameDescriptions[currentWordIndex];
    currentExampleSentence = gameExampleSentences[currentWordIndex];
    const wordData = createPartialWord(currentWord);
    missingLetters = wordData.missingLetters;

    // Create the word display with inline input fields
    const wordDisplayDiv = document.getElementById('word-display');
    wordDisplayDiv.innerHTML = '';

    wordData.wordStructure.forEach((item, index) => {
        if (item.type === 'visible') {
            const span = document.createElement('span');
            span.textContent = item.letter;
            span.className = 'visible-letter';
            wordDisplayDiv.appendChild(span);
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'inline-input';
            input.dataset.index = item.index;
            input.dataset.expectedLetter = item.letter;
            input.addEventListener('input', handleInlineInput);
            input.addEventListener('keydown', handleInlineKeydown);
            input.addEventListener('focus', handleInputFocus);
            wordDisplayDiv.appendChild(input);
        }
    });

    // Update progress and description
    const progressText = isRetryMode ?
        `Retry Word ${currentWordIndex + 1} of ${totalWords}` :
        `Word ${currentWordIndex + 1} of ${totalWords}`;
    document.getElementById('progress').textContent = progressText;

    // Show example sentence with hidden word, or description if no example sentence
    if (currentExampleSentence && currentExampleSentence.trim() !== '') {
        const hiddenSentence = hideWordInSentence(currentExampleSentence, currentWord);
        document.getElementById('word-description').innerHTML = `
            <div class="example-sentence">
                <strong>📝 Example:</strong> ${hiddenSentence}
            </div>
        `;
    } else if (currentDescription && currentDescription.trim() !== '') {
        document.getElementById('word-description').innerHTML = `
            <div class="word-description">
                <strong>💡 Hint:</strong> ${currentDescription}
            </div>
        `;
    } else {
        document.getElementById('word-description').textContent = '';
    }

    document.getElementById('feedback').textContent = '';

    // Reset focus tracking, waiting state, and processing flag for new word
    lastFocusedInput = null;
    waitingForContinue = false;
    isProcessing = false;

    // Calculate timeout threshold for this word based on missing letters
    const missingLetterCount = wordData.wordStructure.filter(item => item.type === 'input').length;
    currentWordTimeoutThreshold = hasTimeLimit ? (missingLetterCount * timeoutPerLetter) : 0;



    // Speak the word
    if (typeof speakWord === 'function') {
        speakWord(currentWord);
    }

    // Start the timer for this word
    startWordTimer();

    // Focus on first input field
    const firstInput = wordDisplayDiv.querySelector('.inline-input');
    if (firstInput) {
        firstInput.focus();
        lastFocusedInput = firstInput;
    }
}

function handleInputFocus(event) {
    // Track which input field was last focused
    lastFocusedInput = event.target;
}

function handleInlineInput(event) {
    const input = event.target;
    const value = input.value.toLowerCase();

    // Move to next input field if this one is filled
    if (value) {
        const allInputs = document.querySelectorAll('.inline-input');
        const currentIndex = Array.from(allInputs).indexOf(input);

        if (currentIndex < allInputs.length - 1) {
            allInputs[currentIndex + 1].focus();
        }
        // Note: Removed auto-submit when all fields are filled
        // Users must now press Enter to confirm their answer
    }
}

function handleInlineKeydown(event) {
    const input = event.target;

    if (event.key === 'Enter') {
        // Prevent rapid Enter key presses
        if (isProcessing) {
            return;
        }

        if (waitingForContinue) {
            // Continue to next word (works for both correct and incorrect answers now)
            isProcessing = true;
            waitingForContinue = false;
            currentWordIndex++;
            showNextWord();
        } else {
            // Normal answer checking
            checkAnswer();
        }
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        // Space bar to repeat the word
        event.preventDefault(); // Prevent space from being typed in input
        repeatWord();
    } else if (event.key === 'Backspace' && !input.value && !waitingForContinue) {
        // Move to previous input field if current is empty and backspace is pressed
        const allInputs = document.querySelectorAll('.inline-input');
        const currentIndex = Array.from(allInputs).indexOf(input);

        if (currentIndex > 0) {
            allInputs[currentIndex - 1].focus();
        }
    }
}

// Function to create a visual comparison between user input and correct answer
function createWordComparison(userAnswers, expectedWord) {
    const allInputs = document.querySelectorAll('.inline-input');
    const wordDisplayDiv = document.getElementById('word-display');

    // Reconstruct the user's full attempted word
    let userAttempt = '';
    let inputIndex = 0;

    // Go through each character in the word display to reconstruct user's attempt
    for (let child of wordDisplayDiv.children) {
        if (child.classList.contains('visible-letter')) {
            // This was a visible letter, add it as-is
            userAttempt += child.textContent.toLowerCase();
        } else if (child.classList.contains('inline-input')) {
            // This was an input field, add what the user typed (or empty if nothing)
            userAttempt += (userAnswers[inputIndex] || '_').toLowerCase();
            inputIndex++;
        }
    }

    // Create highlighted comparison of the correct word
    let correctWordHighlighted = '';
    for (let i = 0; i < expectedWord.length; i++) {
        const correctLetter = expectedWord[i].toLowerCase();
        const userLetter = i < userAttempt.length ? userAttempt[i] : '_';

        if (correctLetter === userLetter) {
            // Correct letter - show in normal green
            correctWordHighlighted += `<span style="color: #90EE90;">${expectedWord[i]}</span>`;
        } else {
            // Incorrect letter - show in bold red with larger size
            correctWordHighlighted += `<span style="color: #FF6B6B; font-weight: bold; font-size: 1.2em; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);">${expectedWord[i]}</span>`;
        }
    }

    return {
        userAttempt: userAttempt.replace(/_/g, '?'), // Replace underscores with question marks for display
        correctWordHighlighted: correctWordHighlighted
    };
}

function checkAnswer() {
    // Don't process if we're already waiting for continue or processing
    if (waitingForContinue || isProcessing) {
        return;
    }

    // Stop the timer and get final elapsed time
    const finalTimeElapsed = stopWordTimer();

    const allInputs = document.querySelectorAll('.inline-input');
    const userAnswers = Array.from(allInputs).map(input => input.value.toLowerCase().trim());
    const feedbackDiv = document.getElementById('feedback');

    // Check if all inputs are filled
    if (userAnswers.some(answer => answer === '')) {
        feedbackDiv.innerHTML = '<span class="incorrect">Please fill in all the missing letters!</span>';
        // DON'T restart timer - let it continue running so time accumulates properly
        return;
    }

    // Compare with expected answers
    const isCorrect = userAnswers.every((answer, index) => answer === missingLetters[index]);

    // Evaluate answer with timing
    const result = evaluateAnswerWithTiming(isCorrect, finalTimeElapsed);

    // Store enhanced result data
    wordResults[currentWordIndex] = {
        correct: isCorrect,
        timeElapsed: finalTimeElapsed,
        result: result
    };

    if (result === 'success') {
        // Perfect answer - correct and within time limit
        correctAnswers++;

        feedbackDiv.innerHTML = `
            <div class="correct-feedback">
                <span class="correct" style="font-size: 1.5em;">✅ Perfect!</span><br>
                <div style="margin-top: 10px; font-size: 1.1em; color: #90EE90;">
                    Completed in ${finalTimeElapsed.toFixed(1)}s
                </div>
                <div style="margin-top: 15px; font-size: 1.2em;">
                    Press <strong>Enter</strong> to continue to the next word
                </div>
            </div>
        `;
        feedbackDiv.className = 'feedback correct';

    } else if (result === 'timeout') {
        // Correct but too slow - add to retry list
        addWordToRetryList(currentWordIndex, 'timeout', 1);

        feedbackDiv.innerHTML = `
            <div class="correct-feedback">
                <span class="correct" style="font-size: 1.5em;">✅ Correct!</span><br>
                <span style="color: #FFD700; font-size: 1.2em;">⚠️ But took too long</span><br>
                <div style="margin-top: 10px; font-size: 1.1em; color: #FFD700;">
                    Time: ${finalTimeElapsed.toFixed(1)}s (limit: ${currentWordTimeoutThreshold}s for ${missingLetters.length} letters)
                </div>
                <div style="margin-top: 10px; font-size: 1em; color: #E6E6FA;">
                    This word will be retried once for speed practice
                </div>
                <div style="margin-top: 15px; font-size: 1.2em;">
                    Press <strong>Enter</strong> to continue to the next word
                </div>
            </div>
        `;
        feedbackDiv.className = 'feedback correct';

    } else if (result === 'timeout_incorrect') {
        // Wrong AND slow - add to retry list with 2 attempts (worst case)
        addWordToRetryList(currentWordIndex, 'incorrect', 2);

        const expectedWord = currentWord;
        const comparison = createWordComparison(userAnswers, expectedWord);

        feedbackDiv.innerHTML = `
            <span class="incorrect" style="font-size: 1.5em;">❌ Incorrect!</span><br>
            <span style="color: #FFD700; font-size: 1.1em;">⚠️ And took too long</span><br>
            <div style="margin-top: 10px; font-size: 1.1em; color: #FFB6C1;">
                Time: ${finalTimeElapsed.toFixed(1)}s (limit: ${currentWordTimeoutThreshold}s for ${missingLetters.length} letters)
            </div>
            <div class="comparison-section">
                <div style="margin-bottom: 15px;">
                    <strong>Your answer:</strong>
                    <div class="user-answer-display">${comparison.userAttempt}</div>
                </div>
                <div>
                    <strong>Correct answer:</strong>
                    <div class="correct-word-display" style="letter-spacing: 3px;">${comparison.correctWordHighlighted}</div>
                </div>
            </div>
            <div style="margin-top: 10px; font-size: 1em; color: #E6E6FA;">
                This word will be retried twice (accuracy + speed practice)
            </div>
            <div style="margin-top: 15px; font-size: 1.2em;">
                <strong>💡 Red letters</strong> show where you made mistakes<br>
                Press <strong>Enter</strong> to continue to the next word
            </div>
        `;
        feedbackDiv.className = 'feedback incorrect';

    } else {
        // Incorrect answer (within time limit) - add to retry list
        addWordToRetryList(currentWordIndex, 'incorrect', 2);

        const expectedWord = currentWord;
        const comparison = createWordComparison(userAnswers, expectedWord);

        feedbackDiv.innerHTML = `
            <span class="incorrect" style="font-size: 1.5em;">❌ Incorrect!</span><br>
            <div style="margin-top: 10px; font-size: 1.1em; color: #FFB6C1;">
                Time: ${finalTimeElapsed.toFixed(1)}s
            </div>
            <div class="comparison-section">
                <div style="margin-bottom: 15px;">
                    <strong>Your answer:</strong>
                    <div class="user-answer-display">${comparison.userAttempt}</div>
                </div>
                <div>
                    <strong>Correct answer:</strong>
                    <div class="correct-word-display" style="letter-spacing: 3px;">${comparison.correctWordHighlighted}</div>
                </div>
            </div>
            <div style="margin-top: 10px; font-size: 1em; color: #E6E6FA;">
                This word will be retried twice for accuracy practice
            </div>
            <div style="margin-top: 15px; font-size: 1.2em;">
                <strong>💡 Red letters</strong> show where you made mistakes<br>
                Press <strong>Enter</strong> to continue to the next word
            </div>
        `;
        feedbackDiv.className = 'feedback incorrect';
    }

    // Set waiting state for all results
    waitingForContinue = true;

    // Focus on first input to capture Enter
    if (allInputs.length > 0) {
        allInputs[0].focus();
    }
}

// Global keyboard event handler
function handleGlobalKeydown(event) {
    const overlay = document.getElementById('confirmation-overlay');
    const isConfirmationVisible = overlay && overlay.style.display === 'flex';

    if (isConfirmationVisible) {
        // Handle keyboard navigation in confirmation dialog
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            confirmationSelection = confirmationSelection === 'no' ? 'yes' : 'no';
            updateConfirmationSelection();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            confirmExitSelection();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            hideExitConfirmation();
        }
    } else {
        // Handle ESC key to show confirmation dialog
        if (event.key === 'Escape') {
            const gameInterface = document.getElementById('game-interface');
            const levelSelection = document.getElementById('level-selection');
            const finalResults = document.getElementById('final-results');

            // Only show confirmation if we're in a screen that has the back button
            const shouldShowConfirmation = (gameInterface && gameInterface.style.display === 'block') ||
                                         (levelSelection && levelSelection.style.display === 'block') ||
                                         (finalResults && finalResults.style.display === 'block');

            if (shouldShowConfirmation) {
                event.preventDefault();
                showExitConfirmation();
            }
        }
    }
}

// Initialize back button and confirmation dialog when the page loads
function initializeBackButton() {
    // Add global keyboard event listener
    document.addEventListener('keydown', handleGlobalKeydown);

    // Update back button visibility initially
    updateBackButtonVisibility();
}

// Timer system functions
function updateTimeoutThreshold() {
    const timeoutInputElement = document.getElementById('timeout-input');

    if (!timeoutInputElement) {
        console.warn("Timeout input element ('timeout-input') not found during updateTimeoutThreshold. Using defaults.");
        timeoutPerLetter = 5; // Default timeout per letter
        hasTimeLimit = timeoutPerLetter > 0;
        updateTimeoutStatusDisplay();
        return;
    }

    const currentInputValue = timeoutInputElement.value;
    // validateTimeoutInput is imported from js/utils/validation.js
    const validationResult = validateTimeoutInput(currentInputValue);

    // Update the input field to reflect the validated (potentially corrected) value
    timeoutInputElement.value = validationResult.value.toString();

    timeoutPerLetter = validationResult.value;
    // hasTimeLimit is true only if the input was valid AND the (numeric) value is greater than 0.
    hasTimeLimit = validationResult.isValid && validationResult.value > 0;

    updateTimeoutStatusDisplay();
}

function updateTimeoutStatusDisplay() {
    const statusDiv = document.getElementById('timeout-status');
    if (!statusDiv) return;

    if (hasTimeLimit) {
        statusDiv.className = 'timeout-status with-limit';
        statusDiv.innerHTML = `✅ Time limit: ${timeoutPerLetter} seconds per missing letter`;
    } else {
        statusDiv.className = 'timeout-status no-limit';
        statusDiv.innerHTML = `⚡ No time limit - Practice mode`;
    }
}

function setupTimeoutInput() {
    const input = document.getElementById('timeout-input');
    const checkbox = document.getElementById('show-timer-checkbox');

    if (!input) return;

    // Add event listeners for real-time validation
    input.addEventListener('input', updateTimeoutThreshold);
    input.addEventListener('blur', updateTimeoutThreshold);
    input.addEventListener('change', updateTimeoutThreshold);

    // Add event listener for timer display checkbox
    if (checkbox) {
        checkbox.addEventListener('change', function() {
            showTimerDisplay = this.checked;
        });

        // Initialize checkbox state
        showTimerDisplay = checkbox.checked; // Default is false (unchecked)
    }

    // Initialize with default value
    updateTimeoutThreshold();
}

function startWordTimer() {
    // Clear any existing timer
    stopWordTimer();

    // Record start time
    currentWordStartTime = Date.now();
    timeElapsed = 0;

    // Show/hide timer based on user preference
    const simpleTimer = document.getElementById('simple-timer');
    if (simpleTimer) {
        simpleTimer.style.display = showTimerDisplay ? 'block' : 'none';
    }

    // Start timer interval for display updates and timeout checking
    currentWordTimer = setInterval(updateTimerDisplay, 1000); // Update every 1 second for whole seconds

    // Initial display update
    updateTimerDisplay();
}

function stopWordTimer() {
    if (currentWordTimer) {
        clearInterval(currentWordTimer);
        currentWordTimer = null;
    }

    // Hide the timer
    const simpleTimer = document.getElementById('simple-timer');
    if (simpleTimer) {
        simpleTimer.style.display = 'none';
    }

    // Calculate final elapsed time
    if (currentWordStartTime) {
        timeElapsed = (Date.now() - currentWordStartTime) / 1000; // Convert to seconds
    }

    return timeElapsed;
}

function updateTimerDisplay() {
    // Calculate current elapsed time
    if (currentWordStartTime) {
        timeElapsed = (Date.now() - currentWordStartTime) / 1000;
    }

    // Update simple timer display if enabled
    if (showTimerDisplay) {
        const simpleTimer = document.getElementById('simple-timer');
        if (simpleTimer) {
            const elapsedSeconds = Math.floor(timeElapsed);
            simpleTimer.textContent = `⏱️ ${elapsedSeconds}s`;
        }
    }

    // NO AUTO-SUBMIT: Let kids take as long as they need
    // Timeout evaluation happens only when they press Enter in checkAnswer()
}

function evaluateAnswerWithTiming(isCorrect, timeElapsed) {
    if (!hasTimeLimit || currentWordTimeoutThreshold === 0) {
        // No time limit - only check correctness
        return isCorrect ? 'success' : 'incorrect';
    }

    const isWithinTimeLimit = timeElapsed <= currentWordTimeoutThreshold;

    if (isCorrect && isWithinTimeLimit) {
        return 'success'; // ✅ Perfect! Correct and fast
    } else if (isCorrect && !isWithinTimeLimit) {
        return 'timeout'; // ⚠️ Correct but slow (took longer than timeout)
    } else if (!isCorrect && !isWithinTimeLimit) {
        return 'timeout_incorrect'; // ❌ Wrong AND slow (worst case - retry twice)
    } else {
        return 'incorrect'; // ❌ Wrong but within time limit
    }
}

window.loadSelectedDataSource = loadSelectedDataSource;
window.startGameWithLevel = startGameWithLevel;
window.selectLevel = selectLevel;
window.resetFilters = resetFilters;

// Initialize data source selection when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setupDataSourceSelection();
    initializeBackButton();
    setupTimeoutInput();
});
