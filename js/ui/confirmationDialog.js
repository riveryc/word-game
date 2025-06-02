// Back button confirmation dialog functionality

// import { removeRetryKeyboardShortcut } from './resultsInterface.js'; // Removed to break circular dependency

let dialogConfirmationSelection = 'no'; // Default to 'no'

// Show/hide back button based on current screen
export function updateBackButtonVisibility() {
    const backButton = document.getElementById('back-button');
    const gameInterface = document.getElementById('game-interface');
    const levelSelection = document.getElementById('level-selection');
    const finalResults = document.getElementById('final-results');

    // Show back button when in game interface, level selection, or final results
    const shouldShow = (gameInterface && gameInterface.style.display === 'block') ||
                      (levelSelection && levelSelection.style.display === 'block') ||
                      (finalResults && finalResults.style.display === 'block');

    if (backButton) {
        backButton.style.display = shouldShow ? 'flex' : 'none';
    }
}

// Show exit confirmation dialog
export function showExitConfirmation() {
    const overlay = document.getElementById('confirmation-overlay');
    if (overlay) {
        dialogConfirmationSelection = 'no'; // Reset to default
        updateConfirmationSelectionVisuals(); // Renamed for clarity
        overlay.style.display = 'flex';

        // Focus on the dialog for keyboard navigation
        const noButton = document.getElementById('no-button');
        if (noButton) {
            noButton.focus();
        }
    }
}

// Hide exit confirmation dialog
export function hideExitConfirmation() {
    const overlay = document.getElementById('confirmation-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Select confirmation option (yes/no)
export function selectConfirmationOption(option) {
    dialogConfirmationSelection = option;
    updateConfirmationSelectionVisuals();
}

// Update visual selection of confirmation buttons
function updateConfirmationSelectionVisuals() {
    const noButton = document.getElementById('no-button');
    const yesButton = document.getElementById('yes-button');

    if (noButton && yesButton) {
        noButton.classList.toggle('selected', dialogConfirmationSelection === 'no');
        yesButton.classList.toggle('selected', dialogConfirmationSelection === 'yes');
    }
}

// Confirm the selected option
export function confirmExitSelection() {
    if (dialogConfirmationSelection === 'yes') {
        // Exit to main menu
        hideExitConfirmation();
        exitToMainMenu(true);
    } else {
        // Stay in game
        hideExitConfirmation();
    }
}

// Exit to main menu function
// The parameter `isConfirmedExit` is true if user explicitly chose to exit (e.g. via dialog)
// and false if it's a programmatic exit (e.g. Escape from dialog simply hides it).
export function exitToMainMenu(isConfirmedExit) {
    if (isConfirmedExit) {
        // Perform actions for a confirmed exit, like resetting game state if needed.
        // The global game state reset is complex; gameManager should handle its own state reset.
        // script.js might need to coordinate resets of other modules if necessary.
        console.log("Exiting to main menu - confirmed.");
    }

    // Always perform these UI actions:
    // removeRetryKeyboardShortcut(); // REMOVED - script.js will handle this

    document.getElementById('game-interface').style.display = 'none';
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('content').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';
    document.getElementById('confirmation-overlay').style.display = 'none'; // Ensure dialog is hidden
    document.getElementById('data-source-selection').style.display = 'block';

    updateBackButtonVisibility();

    // Explicitly do not reset global variables like currentWordIndex here.
    // Each module should manage its own state or be reset by a coordinator (e.g. script.js on game start).
}

// Global keyboard event handler for confirmation dialog
function handleConfirmationKeydown(event) {
    const overlay = document.getElementById('confirmation-overlay');
    const isConfirmationVisible = overlay && overlay.style.display === 'flex';

    if (isConfirmationVisible) {
        // Handle keyboard navigation in confirmation dialog
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            dialogConfirmationSelection = dialogConfirmationSelection === 'no' ? 'yes' : 'no';
            updateConfirmationSelectionVisuals();
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

// Initialize back button and confirmation dialog
export function initializeConfirmationDialogEventListeners() {
    // Add global keyboard event listener
    document.addEventListener('keydown', handleConfirmationKeydown);

    // Update back button visibility initially
    updateBackButtonVisibility();

    const backButton = document.getElementById('back-button');
    if (backButton) backButton.addEventListener('click', showExitConfirmation);

    const noButton = document.getElementById('no-button');
    if (noButton) noButton.addEventListener('click', () => selectConfirmationOption('no'));

    const yesButton = document.getElementById('yes-button');
    if (yesButton) yesButton.addEventListener('click', confirmExitSelection); 
    
    // Initial call to set up button appearance based on default selection
    updateConfirmationSelectionVisuals(); 
}
