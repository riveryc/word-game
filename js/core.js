import { initializeDataSourceHandler, setupDataSourceSelection as setupDataSourceSelectionHandler, getCurrentDataSource, loadSelectedDataSource } from './data/dataSourceHandler.js';
import { initializeFilterManager, setBaseWordData as setBaseWordDataForFilters } from './ui/filterManager.js';
import { initializeTimerManager, updateTimeoutThreshold as updateTimerTimeoutThreshold, getTimerEvaluationContext, stopWordTimer, startWordTimer } from './game/timerManager.js';
import { initializeGameManager, setGameConfig as setGameManagerConfigImport, updateSelectedLevel as updateGameManagerSelectedLevel, startGame as startGameInManager, getCurrentSelectedLevel as getGameManagerCurrentLevel, processAnswer, requestNextWordOrEndGameDisplay, getCurrentWord as getGameManagerCurrentWordFromManager } from './game/gameManager.js';
import { updateBackButtonVisibility as updateConfirmationDialogBackButtonVisibility, initializeConfirmationDialogEventListeners } from './ui/confirmationDialog.js';
import { showFinalResults as showFinalResultsInterfaceFromResults } from './ui/resultsInterface.js';
import { initializeGamePlayInterface, displayWordChallenge as displayWordChallengeFromGamePlay } from './ui/gamePlayInterface.js';
import { initializeGameSetupInterface, displayGameSetupScreen as displayGameSetupScreenFromSetup } from './ui/gameSetupInterface.js';
import { initializeMainAppEventListeners } from './ui/globalEventListeners.js';
import { audioManager } from './audio/audioManager.js'; // Import AudioManager instance

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


// == State variables previously in script.js ==
let allWords = [];
let allDescriptions = [];
let allExampleSentences = [];
let allWordData = [];
let filteredWordData = [];
let scriptSelectedLevel = 1; 
let scriptSelectedWordCount = 20; 

// == Helper functions to manage state (previously in script.js) ==
function setScriptGlobals(updatedGlobals) {
    console.log("[core.js - setScriptGlobals] called with:", updatedGlobals);
    if (updatedGlobals.hasOwnProperty('allWordData')) allWordData = updatedGlobals.allWordData;
    if (updatedGlobals.hasOwnProperty('allWords')) allWords = updatedGlobals.allWords;
    if (updatedGlobals.hasOwnProperty('allDescriptions')) allDescriptions = updatedGlobals.allDescriptions;
    if (updatedGlobals.hasOwnProperty('allExampleSentences')) allExampleSentences = updatedGlobals.allExampleSentences;
    if (updatedGlobals.hasOwnProperty('filteredWordData')) filteredWordData = updatedGlobals.filteredWordData;
    if (updatedGlobals.hasOwnProperty('scriptSelectedLevel')) scriptSelectedLevel = updatedGlobals.scriptSelectedLevel;
    if (updatedGlobals.hasOwnProperty('scriptSelectedWordCount')) scriptSelectedWordCount = updatedGlobals.scriptSelectedWordCount;
}

function getScriptGlobals() {
    return {
        allWordData,
        allWords,
        allDescriptions,
        allExampleSentences,
        filteredWordData,
        scriptSelectedLevel,
        scriptSelectedWordCount,
    };
}
// == End of moved state and helper functions ==

// Renamed from initializeApp, no longer takes (dependencies) as scriptGlobals are local
function setupApplication() { 
    console.log("%%%%%%%%%%%%%%%% CORE setupApplication STARTS %%%%%%%%%%%%%%%%"); 

    // Define core-internal callbacks that use the module-scoped getScriptGlobals/setScriptGlobals
    function coreShowNextWordUI(data) {
        console.log("[core.js coreShowNextWordUI] Called.");
        displayWordChallengeFromGamePlay(data); 
    }

    function coreShowFinalResultsUI(wordResults, wordRetryDataFromManager, correctAnswers, totalWordsInGame, isRetryModeFlag, gameWordObjectsForResults) {
        console.log("[core.js coreShowFinalResultsUI] Called.");
        const resultsDataForInterface = wordResults.map((res, index) => {
            const gameWordObject = gameWordObjectsForResults && gameWordObjectsForResults[index] ? gameWordObjectsForResults[index] :
                                   { word: res.word, description: '', exampleSentence: '' }; 
            return {
                word: gameWordObject.word,
                status: res.result, 
                time: res.timeElapsed.toFixed(1) + 's',
                description: gameWordObject.description,
                exampleSentence: gameWordObject.exampleSentence
            };
        });
        const canRetry = wordRetryDataFromManager.length > 0;
        showFinalResultsInterfaceFromResults(correctAnswers, totalWordsInGame, resultsDataForInterface, canRetry, isRetryModeFlag);
    }

    // This function will be called by GameManager to play the new sentence
    function corePlayNewSentence(sentence) {
        console.log("[core.js corePlayNewSentence] Called for sentence:", sentence.substring(0, 50) + "...");
        audioManager.playSentence(sentence);
    }

    // This function will be called by GamePlayInterface for the repeat button
    function coreRepeatLastSentence() {
        console.log("[core.js coreRepeatLastSentence] Called.");
        audioManager.repeatCurrentSentence();
    }

    let coreSetupLevelSelectListeners; 
    let coreSetupStartGameButtonListener;

    function coreShowGameSetupScreen() {
        console.log('[core.js] coreShowGameSetupScreen called. Will call displayGameSetupScreenFromSetup.'); 
        displayGameSetupScreenFromSetup({
            coreSetupLevelSelectListenersCallback: coreSetupLevelSelectListeners,
            coreSetupStartGameButtonListenerCallback: coreSetupStartGameButtonListener
        });
    }
    // End of core-internal callback definitions

    initializeGameSetupInterface({
        onWordCountChange: setGameManagerConfigImport, 
        getGlobalState: getScriptGlobals, // Use module-scoped getScriptGlobals
        updateBackButtonVisibility: updateConfirmationDialogBackButtonVisibility,
        // Pass audioManager to gameSetupInterface if it handles audio method selection directly
        // audioManagerInstance: audioManager 
    });

    initializeDataSourceHandler({
        onDataLoaded: (parsedData) => {
            console.log('[core.js] onDataLoaded triggered. Parsed data length:', parsedData.allWordData.length);
            setScriptGlobals({ allWordData: parsedData.allWordData }); // Use module-scoped setScriptGlobals
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
            updateConfirmationDialogBackButtonVisibility();
        }
    });

    initializeFilterManager({
        onFiltersApplied: (filteredResults) => {
            console.log('[core.js] onFiltersApplied triggered. Filtered results length:', filteredResults.allWords.length);
            setScriptGlobals({ // Use module-scoped setScriptGlobals
                allWords: filteredResults.allWords,
                allDescriptions: filteredResults.allDescriptions,
                allExampleSentences: filteredResults.allExampleSentences,
                filteredWordData: filteredResults.filteredWordData
            });

            const dataSourceSelectionDiv = document.getElementById('data-source-selection');
            if (dataSourceSelectionDiv) dataSourceSelectionDiv.style.display = 'none';
            
            const contentDiv = document.getElementById('content');
            if (contentDiv) contentDiv.style.display = 'block';

            const loadingMessageDiv = document.querySelector('#content .loading');
            if (loadingMessageDiv) loadingMessageDiv.style.display = 'none';

            console.log('[core.js] Filtered words updated. About to call coreShowGameSetupScreen.');
            coreShowGameSetupScreen();
        },
        getGlobalState: getScriptGlobals, // Use module-scoped getScriptGlobals
        onWordCountChange: setGameManagerConfigImport
    });

    initializeGameManager({ 
        showNextWordUI: coreShowNextWordUI,
        showFinalResultsUI: coreShowFinalResultsUI,
        speakWord: corePlayNewSentence, // GameManager calls this for new sentences
        getGlobalState: getScriptGlobals // Use module-scoped getScriptGlobals
    });

    initializeGamePlayInterface({
        processAnswer: processAnswer,
        requestNextWordOrEndGameDisplay: requestNextWordOrEndGameDisplay,
        getTimerEvaluationContext: getTimerEvaluationContext,
        stopWordTimer: stopWordTimer,
        startWordTimer: startWordTimer,
        getCurrentWord: getGameManagerCurrentWordFromManager, 
        repeatWord: coreRepeatLastSentence // GamePlayInterface calls this for its repeat button
    });

    setupDataSourceSelectionHandler();
    
    const loadDataButton = document.getElementById('load-data-button');
    if (loadDataButton) {
        loadDataButton.addEventListener('click', () => {
            loadSelectedDataSource();
        });
    }
    
    if (typeof initializeMainAppEventListeners === 'function') {
        console.log("[core.js] Calling directly imported initializeMainAppEventListeners.");
        initializeMainAppEventListeners();
    }
    
    if (typeof initializeConfirmationDialogEventListeners === 'function') {
        initializeConfirmationDialogEventListeners();
    }

    document.getElementById('data-source-selection').style.display = 'block';
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('game-interface').style.display = 'none';
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    updateConfirmationDialogBackButtonVisibility();

    console.log("Application UIs initialized by core.js.");

    coreSetupLevelSelectListeners = () => {
        console.log("[core.js] coreSetupLevelSelectListeners called.");
        const levelOptions = document.querySelectorAll('.level-option');
        levelOptions.forEach(option => {
            option.addEventListener('click', function() {
                const level = parseInt(this.dataset.level);
                coreSelectLevelUI(level); 
            });
        });
        const currentGlobals = getScriptGlobals(); // Use module-scoped getScriptGlobals
        coreSelectLevelUI(currentGlobals.scriptSelectedLevel || 1); 
    };

    coreSetupStartGameButtonListener = () => {
        console.log("[core.js] coreSetupStartGameButtonListener called.");
        const startGameButton = document.querySelector('#level-selection .start-button');
        if (startGameButton) {
            const newStartGameButton = startGameButton.cloneNode(true);
            startGameButton.parentNode.replaceChild(newStartGameButton, startGameButton);
            newStartGameButton.addEventListener('click', () => {
                coreStartGame();
            });
        } else {
            console.warn("[core.js] Start game button not found for listener setup.");
        }
    };

    function coreSelectLevelUI(level) {
        console.log(`[core.js] coreSelectLevelUI called with level: ${level}`);
        setScriptGlobals({ scriptSelectedLevel: level }); // Use module-scoped setScriptGlobals
        updateGameManagerSelectedLevel(level);

        document.querySelectorAll('.level-option').forEach(option => {
            option.classList.remove('selected');
        });
        const selectedOption = document.querySelector(`.level-option[data-level="${level}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        } else {
            console.warn(`[core.js] Selected level ${level} DOM element not found, defaulting to level 1.`);
            const defaultOption = document.querySelector('.level-option[data-level="1"]');
            if (defaultOption) defaultOption.classList.add('selected');
            setScriptGlobals({ scriptSelectedLevel: 1 }); // Use module-scoped setScriptGlobals
            updateGameManagerSelectedLevel(1);
        }
    }

    function coreStartGame() {
        console.log("[core.js] coreStartGame called.");
        updateTimerTimeoutThreshold(); 
        
        const levelSelectionDiv = document.getElementById('level-selection');
        const wordCountSelectionDiv = document.getElementById('word-count-selection');
        const gameInterfaceDiv = document.getElementById('game-interface');

        if (levelSelectionDiv) levelSelectionDiv.style.display = 'none';
        if (wordCountSelectionDiv) wordCountSelectionDiv.style.display = 'none';
        if (gameInterfaceDiv) gameInterfaceDiv.style.display = 'block';

        const currentGlobals = getScriptGlobals(); // Use module-scoped getScriptGlobals
        console.log("[core.js] Starting game with words from scriptGlobals:", currentGlobals.allWords.length);
        startGameInManager(currentGlobals.allWords, currentGlobals.allDescriptions, currentGlobals.allExampleSentences);
    }

    console.log("[core.js] setupApplication completed.");
}

// == DOMContentLoaded listener to start the application ==
document.addEventListener('DOMContentLoaded', function() {
    console.log("%%%%%%%%%%%%%%%% CORE.JS DOMCONTENTLOADED FIRED %%%%%%%%%%%%%%%%");
    initializeTimerManager(); // Initialize timer manager first as it depends on DOM elements
    setupApplication(); // Call the main application setup logic
}); 