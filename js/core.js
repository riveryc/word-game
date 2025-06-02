import { initializeDataSourceHandler, setupDataSourceSelection as setupDataSourceSelectionHandler, getCurrentDataSource, loadSelectedDataSource } from './data/dataSourceHandler.js';
import { initializeFilterManager, setBaseWordData as setBaseWordDataForFilters } from './ui/filterManager.js';
import { initializeTimerManager, updateTimeoutThreshold as updateTimerTimeoutThreshold } from './game/timerManager.js';
import { initializeGameManager, setGameConfig, updateSelectedLevel as updateGameManagerSelectedLevel, startGame as startGameInManager } from './game/gameManager.js';
import { updateBackButtonVisibility, initializeConfirmationDialogEventListeners } from './ui/confirmationDialog.js';
import { showFinalResults as showFinalResultsInterface } from './ui/resultsInterface.js';
import audioManager from './audio/audioManager.js';
import { initializeGamePlayInterface, displayWordChallenge } from './ui/gamePlayInterface.js';

// These might be needed by functions called within initializeApp, ensure they are defined or imported if necessary.
// For now, assuming they are globals or will be passed/managed differently.
// let allWords = []; // Defined in script.js
// let allDescriptions = []; // Defined in script.js
// let allExampleSentences = []; // Defined in script.js
// let filteredWordData = []; // Defined in script.js
// let scriptSelectedLevel = 1; // Defined in script.js
// let scriptSelectedWordCount = 20; // Defined in script.js


// Functions previously in script.js that are called by the DOMContentLoaded logic
// We need to decide if these should also move to core.js or be passed as callbacks, or imported if they become modules.

// For now, let's assume allWords, allDescriptions, allExampleSentences, filteredWordData, scriptSelectedLevel, scriptSelectedWordCount
// are still managed by script.js and will be accessed or passed as needed.
// Similarly, functions like showWordCountAndLevelSelectionScreen, speakWord, handleGlobalKeydown will be handled.


// Placeholder for functions that were in script.js and are called by initializeApp
// These would ideally be imported from their respective modules or script.js itself.
// For now, to make core.js runnable, we'll define them as stubs or expect script.js to make them available.

// Function stubs or forward declarations if these are to remain in script.js and be globally accessible (not ideal)
// Or, better, they should be imported if they are in other modules, or passed as callbacks.

// Let's assume these functions are still available globally from script.js for now,
// or will be refactored to be passed as callbacks to the initialization functions.

// From script.js (global for now, or needs to be refactored)
// function showWordCountAndLevelSelectionScreen() { /* ... */ }
// function speakWord(word) { /* ... */ }
// function handleGlobalKeydown(event) { /* ... */ }
// function initializeMainAppEventListeners() { /* ... */ } // This one calls handleGlobalKeydown


export function initializeApp(dependencies) {
    console.log('[core.js] initializeApp called. Received dependencies:', dependencies);

    const {
        setScriptGlobals, 
        getScriptGlobals, 
        showNextWordUICallback, 
        showFinalResultsUI_scriptCallback, 
        speakWord_scriptCallback, 
        updateBackButtonVisibilityCallback, 
        processAnswerInManagerCallback,
        requestNextWordOrEndGameDisplayCallback,
        getTimerEvaluationContextCallback,
        stopWordTimerCallback,
        startWordTimerCallback,
        getGameManagerCurrentWordCallback,
        initializeMainAppEventListeners_scriptCallback, 
        showWordCountAndLevelSelectionScreen_scriptCallback // Expecting this from script.js
    } = dependencies;

    console.log('[core.js] After destructuring - typeof showWordCountAndLevelSelectionScreen_scriptCallback:', typeof showWordCountAndLevelSelectionScreen_scriptCallback);
    console.log('[core.js] After destructuring - typeof showFinalResultsUI_scriptCallback:', typeof showFinalResultsUI_scriptCallback);
    console.log('[core.js] After destructuring - typeof speakWord_scriptCallback:', typeof speakWord_scriptCallback);
    console.log('[core.js] After destructuring - typeof initializeMainAppEventListeners_scriptCallback:', typeof initializeMainAppEventListeners_scriptCallback);

    const showFinalResultsUICallback = showFinalResultsUI_scriptCallback;
    const speakWordCallback = speakWord_scriptCallback;
    const initializeMainAppEventListenersCallback = initializeMainAppEventListeners_scriptCallback;

    console.log('[core.js] After assignment - typeof showWordCountAndLevelSelectionScreen_scriptCallback (original):', typeof showWordCountAndLevelSelectionScreen_scriptCallback);
    console.log('[core.js] After assignment - typeof showFinalResultsUICallback:', typeof showFinalResultsUICallback);
    console.log('[core.js] After assignment - typeof speakWordCallback:', typeof speakWordCallback);
    console.log('[core.js] After assignment - typeof initializeMainAppEventListenersCallback:', typeof initializeMainAppEventListenersCallback);

    // Moved listener setup logic into functions to be called at the right time
    function coreSelectLevelUI(level) {
        console.log('[core.js] coreSelectLevelUI called with level:', level);
        updateGameManagerSelectedLevel(level);
        document.querySelectorAll('.level-option').forEach(option => {
            option.classList.remove('selected');
        });
        const selectedOption = document.querySelector(`.level-option[data-level="${level}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        } else {
            console.warn(`[core.js] Selected level ${level} UI option not found, defaulting to level 1.`);
            document.querySelector('.level-option[data-level="1"]').classList.add('selected');
            updateGameManagerSelectedLevel(1);
        }
    }

    function setupLevelSelectListeners() {
        console.log('[core.js] setupLevelSelectListeners called.');
        document.querySelectorAll('.level-option').forEach(option => {
            // Remove old listener if any, though not strictly necessary if HTML is clean
            const newOption = option.cloneNode(true);
            option.parentNode.replaceChild(newOption, option);
            newOption.addEventListener('click', function() {
                coreSelectLevelUI(parseInt(this.dataset.level));
            });
        });
        const initialGlobalsForLevel = getScriptGlobals();
        coreSelectLevelUI(initialGlobalsForLevel.scriptSelectedLevel);
    }

    function setupStartGameButtonListener() {
        console.log('[core.js] setupStartGameButtonListener called.');
        const startGameButton = document.querySelector('#level-selection .start-button');
        if (startGameButton) {
            // Remove old listener if any
            const newButton = startGameButton.cloneNode(true);
            startGameButton.parentNode.replaceChild(newButton, startGameButton);
            newButton.addEventListener('click', () => {
                console.log('[core.js] Start Game button clicked via new listener.');
                if (typeof updateTimerTimeoutThreshold === 'function') {
                    updateTimerTimeoutThreshold();
                }
                document.getElementById('level-selection').style.display = 'none';
                document.getElementById('word-count-selection').style.display = 'none';
                document.getElementById('game-interface').style.display = 'block';
                const currentGlobals = getScriptGlobals();
                startGameInManager(currentGlobals.allWords, currentGlobals.allDescriptions, currentGlobals.allExampleSentences);
            });
        } else {
            console.warn('[core.js] Start Game button not found in setupStartGameButtonListener.');
        }
    }

    initializeDataSourceHandler({
        onDataLoaded: (parsedData) => {
            console.log('[core.js] onDataLoaded triggered. Parsed data length:', parsedData.allWordData.length);
            setScriptGlobals({ allWordData: parsedData.allWordData });
            console.log('[core.js] Calling setBaseWordDataForFilters from onDataLoaded.');
            setBaseWordDataForFilters(parsedData.allWordData);
        },
        onDataError: (errorMessage) => console.error("Data loading error (from core.js via dataSourceHandler):", errorMessage),
        onUrlError: (errorMessage) => console.error("URL error (from core.js via dataSourceHandler):", errorMessage),
        onGoBack: (isErrorState) => {
            document.getElementById('content').style.display = 'none';
            document.getElementById('data-source-selection').style.display = 'block';
            if (isErrorState && getCurrentDataSource() === 'google') {
                const sheetsUrlInput = document.getElementById('sheets-url');
                if (sheetsUrlInput) sheetsUrlInput.focus();
            }
            updateBackButtonVisibilityCallback();
        }
    });

    initializeFilterManager({
        onFiltersApplied: (filteredResults) => {
            console.log('[core.js] onFiltersApplied triggered. Filtered results length:', filteredResults.allWords.length);
            setScriptGlobals({
                allWords: filteredResults.allWords,
                allDescriptions: filteredResults.allDescriptions,
                allExampleSentences: filteredResults.allExampleSentences,
                filteredWordData: filteredResults.filteredWordData
            });
            console.log('[core.js] Calling showWordCountAndLevelSelectionScreen_scriptCallback from onFiltersApplied.');
            if (typeof showWordCountAndLevelSelectionScreen_scriptCallback === 'function') {
                // Pass the setup functions as arguments
                showWordCountAndLevelSelectionScreen_scriptCallback(setupLevelSelectListeners, setupStartGameButtonListener);
            } else {
                console.error('[core.js] showWordCountAndLevelSelectionScreen_scriptCallback is not a function!');
            }
        }
    });
    
    initializeTimerManager();

    const scriptGlobals = getScriptGlobals();
    initializeGameManager({ 
        showNextWordUI: showNextWordUICallback, 
        showFinalResultsUI: showFinalResultsUICallback, 
        updateBackButtonVisibility: updateBackButtonVisibilityCallback, 
        speakWord: speakWordCallback 
    }, { 
        selectedLevel: scriptGlobals.scriptSelectedLevel,
        selectedWordCount: scriptGlobals.scriptSelectedWordCount
    });

    initializeGamePlayInterface({
        processAnswerFn: processAnswerInManagerCallback, 
        requestNextWordFn: requestNextWordOrEndGameDisplayCallback,
        getTimerContextFn: getTimerEvaluationContextCallback,
        stopWordTimerFn: stopWordTimerCallback,
        startWordTimerFn: startWordTimerCallback,
        repeatWordFn: () => audioManager.repeatCurrentWord(),
        getGameManagerCurrentWordFn: getGameManagerCurrentWordCallback 
    });

    setupDataSourceSelectionHandler();
    
    const loadDataButton = document.getElementById('load-data-button');
    if (loadDataButton) {
        console.log('[core.js] Found load-data-button, attaching event listener.');
        // Ensure listener is fresh by cloning node, standard practice for re-attaching if unsure.
        const newLoadButton = loadDataButton.cloneNode(true);
        loadDataButton.parentNode.replaceChild(newLoadButton, loadDataButton);
        newLoadButton.addEventListener('click', () => {
            console.log('[core.js] load-data-button clicked, calling loadSelectedDataSource.');
            loadSelectedDataSource();
        });
    } else {
        console.warn('[core.js] load-data-button not found!');
    }
    
    if (typeof initializeMainAppEventListenersCallback === 'function') {
        initializeMainAppEventListenersCallback();
    }
    
    if (typeof initializeConfirmationDialogEventListeners === 'function') {
        initializeConfirmationDialogEventListeners();
    }

    document.getElementById('data-source-selection').style.display = 'block';
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('game-interface').style.display = 'none';
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    updateBackButtonVisibilityCallback();

    console.log("Application initialized by core.js. Listener setup for level/start game will be triggered by script.js.");
} 