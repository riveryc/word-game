let internalAllWordData = [];
let availableGrades = [];
let availableSources = [];
let selectedGrades = [];
let selectedSources = [];
let dateFrom = '';
let dateTo = '';

let onFiltersAppliedCallback = null;

// DOM Elements (cached for performance)
let dateFromInput = null;
let dateToInput = null;
let gradeFiltersContainer = null;
let sourceFiltersContainer = null;
let wordFiltersContainer = null;
let totalWordsCountSpan = null; // For "Total available: X words" in word-count-selection
let availableWordsDisplayDiv = null; // For the new top-level display

// Cache button and progress bar elements
let cacheFilteredWordsButton = null;
let cacheProgressContainer = null;
let cacheProgressText = null;
let cacheProgressBarInner = null;

let currentFilteredWordsForCaching = []; // Store currently filtered words for caching process

export function initializeFilterManager(callbacks) {
    onFiltersAppliedCallback = callbacks.onFiltersApplied;
    console.log("[FilterManager] Initialized. onFiltersAppliedCallback:", onFiltersAppliedCallback);

    // Cache DOM elements
    dateFromInput = document.getElementById('date-from');
    dateToInput = document.getElementById('date-to');
    gradeFiltersContainer = document.getElementById('grade-filters');
    sourceFiltersContainer = document.getElementById('source-filters');
    wordFiltersContainer = document.getElementById('word-filters');
    totalWordsCountSpan = document.getElementById('total-words-count');
    availableWordsDisplayDiv = document.getElementById('available-words-display');

    // Cache elements for the new feature
    cacheFilteredWordsButton = document.getElementById('cache-filtered-words-button');
    cacheProgressContainer = document.getElementById('cache-progress-container');
    cacheProgressText = document.getElementById('cache-progress-text');
    cacheProgressBarInner = document.getElementById('cache-progress-bar-inner');

    // Initial setup of listeners if elements exist
    setupFilterListeners();
    setupCacheButtonListener();
}

export function setBaseWordData(allWordDataFromScript) {
    internalAllWordData = [...allWordDataFromScript];
    console.log('[FilterManager] setBaseWordData called. internalAllWordData length:', internalAllWordData.length);
    extractFilterOptionsInternal();
    console.log('[FilterManager] Calling applyFiltersInternal from setBaseWordData.');
    applyFiltersInternal(); // Apply initial filters (e.g., all selected)
    updateFilterSectionVisibility();
}

function updateFilterSectionVisibility() {
    const hasFilterableData = availableGrades.length > 0 || availableSources.length > 0;
    if (wordFiltersContainer) {
        wordFiltersContainer.style.display = hasFilterableData ? 'block' : 'none';
    }
}

function extractFilterOptionsInternal() {
    availableGrades = [];
    availableSources = [];

    internalAllWordData.forEach(wordData => {
        if (wordData.grade && !availableGrades.includes(wordData.grade)) {
            availableGrades.push(wordData.grade);
        }
        if (wordData.source && !availableSources.includes(wordData.source)) {
            availableSources.push(wordData.source);
        }
    });

    availableGrades.sort();
    availableSources.sort();

    selectedGrades = [...availableGrades];
    selectedSources = [...availableSources];

    setupFilterDOMStructure();
}

function applyFiltersInternal() {
    console.log('[FilterManager] applyFiltersInternal called.');
    const filteredWordData = internalAllWordData.filter(wordData => {
        if (dateFrom && wordData.date && wordData.date < dateFrom) return false;
        if (dateTo && wordData.date && wordData.date > dateTo) return false;
        if (availableGrades.length > 0 && selectedGrades.length > 0 && wordData.grade && !selectedGrades.includes(wordData.grade)) return false;
        if (availableSources.length > 0 && selectedSources.length > 0 && wordData.source && !selectedSources.includes(wordData.source)) return false;
        return true;
    });

    currentFilteredWordsForCaching = [...filteredWordData]; // Update the list for caching

    const newAllWords = filteredWordData.map(data => data.word);
    const newAllDescriptions = filteredWordData.map(data => data.description);
    const newAllExampleSentences = filteredWordData.map(data => data.exampleSentence || '');

    console.log('[FilterManager] applyFiltersInternal - totalWordsCountSpan element:', totalWordsCountSpan);
    console.log('[FilterManager] applyFiltersInternal - availableWordsDisplayDiv element:', availableWordsDisplayDiv);
    console.log('[FilterManager] applyFiltersInternal - newAllWords length (for count displays):', newAllWords.length);
    
    if (totalWordsCountSpan) { // Update bottom count
        totalWordsCountSpan.textContent = newAllWords.length;
    }
    if (availableWordsDisplayDiv) { // Update new top count
        availableWordsDisplayDiv.textContent = `Words Ready for Practice: ${newAllWords.length}`;
    }

    if (onFiltersAppliedCallback) {
        console.log('[FilterManager] applyFiltersInternal - Calling onFiltersAppliedCallback with newAllWords length:', newAllWords.length, 'Callback:', onFiltersAppliedCallback);
        onFiltersAppliedCallback({
            filteredWordData: filteredWordData,
            allWords: newAllWords,
            allDescriptions: newAllDescriptions,
            allExampleSentences: newAllExampleSentences
        });
    }
}

function setupFilterListeners() {
    if (dateFromInput) {
        dateFromInput.addEventListener('change', function() {
            dateFrom = this.value;
            applyFiltersInternal();
        });
    }
    if (dateToInput) {
        dateToInput.addEventListener('change', function() {
            dateTo = this.value;
            applyFiltersInternal();
        });
    }
}

function setupFilterDOMStructure() {
    if (gradeFiltersContainer) {
        setupMultiSelectInternal('grade-filters', availableGrades, selectedGrades, (newSelection) => {
            selectedGrades = newSelection;
            applyFiltersInternal();
        });
    }
    if (sourceFiltersContainer) {
        setupMultiSelectInternal('source-filters', availableSources, selectedSources, (newSelection) => {
            selectedSources = newSelection;
            applyFiltersInternal();
        });
    }
}

function setupMultiSelectInternal(containerId, options, currentSelectedArray, onChangeCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (options.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
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
        checkbox.checked = currentSelectedArray.includes(option);

        checkbox.addEventListener('change', function() {
            const currentSelectedArray_copy = [...currentSelectedArray];
            if (this.checked) {
                if (!currentSelectedArray_copy.includes(option)) {
                    currentSelectedArray_copy.push(option);
                }
            } else {
                const index = currentSelectedArray_copy.indexOf(option);
                if (index > -1) {
                    currentSelectedArray_copy.splice(index, 1);
                }
            }
            onChangeCallback(currentSelectedArray_copy);
        });

        const span = document.createElement('span');
        span.textContent = option;

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
}

export function resetFilters() {
    dateFrom = '';
    dateTo = '';
    if(dateFromInput) dateFromInput.value = '';
    if(dateToInput) dateToInput.value = '';

    selectedGrades = [...availableGrades];
    selectedSources = [...availableSources];

    if (gradeFiltersContainer) {
        gradeFiltersContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = selectedGrades.includes(cb.value));
    }
    if (sourceFiltersContainer) {
        sourceFiltersContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = selectedSources.includes(cb.value));
    }
    
    applyFiltersInternal();
}

// Expose resetFilters to the global scope for HTML onclick
if (typeof window !== 'undefined') {
    window.resetFiltersFromManager = resetFilters;
}

function setupCacheButtonListener() {
    if (cacheFilteredWordsButton) {
        cacheFilteredWordsButton.addEventListener('click', handleCacheFilteredWords);
    }
}

async function handleCacheFilteredWords() {
    if (!window.ensureWordIsCached) {
        console.error("ensureWordIsCached function is not available on window.");
        alert("Caching feature is currently unavailable. Please try again later.");
        return;
    }

    if (currentFilteredWordsForCaching.length === 0) {
        alert("No words to cache. Please adjust your filters.");
        return;
    }

    cacheFilteredWordsButton.disabled = true;
    cacheProgressContainer.style.display = 'block';
    let successfullyCachedCount = 0;
    const totalWordsToCache = currentFilteredWordsForCaching.length;

    for (let i = 0; i < totalWordsToCache; i++) {
        const wordData = currentFilteredWordsForCaching[i];
        const progressPercentage = Math.round(((i + 1) / totalWordsToCache) * 100);
        cacheProgressText.textContent = `Caching words... ${i + 1}/${totalWordsToCache} (${progressPercentage}%) - Caching: ${wordData.word}`;
        cacheProgressBarInner.style.width = `${progressPercentage}%`;
        cacheProgressBarInner.textContent = `${progressPercentage}%`;

        try {
            // Stagger API calls slightly to avoid overwhelming the server/network or hitting rate limits.
            // A small delay, e.g., 100-200ms between calls.
            await new Promise(resolve => setTimeout(resolve, 150)); 
            const success = await window.ensureWordIsCached(wordData.word);
            if (success) {
                successfullyCachedCount++;
            }
        } catch (error) {
            console.error(`Error caching word '${wordData.word}':`, error);
            // Optionally, you could retry or mark as failed.
        }
    }

    cacheProgressText.textContent = `Caching complete. Successfully cached ${successfullyCachedCount} out of ${totalWordsToCache} words.`;
    // Keep the progress bar full or update text
    cacheProgressBarInner.style.width = `100%`;
    cacheProgressBarInner.textContent = `Done`;
    cacheFilteredWordsButton.disabled = false;

    // Optionally hide progress bar after a delay
    // setTimeout(() => {
    //    cacheProgressContainer.style.display = 'none';
    // }, 5000);
} 