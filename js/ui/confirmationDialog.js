// Back button confirmation dialog functionality

let confirmationSelection = 'no'; // Default to 'no'

// Show/hide back button based on current screen
function updateBackButtonVisibility() {
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
function showExitConfirmation() {
    const overlay = document.getElementById('confirmation-overlay');
    if (overlay) {
        confirmationSelection = 'no'; // Reset to default
        updateConfirmationSelection();
        overlay.style.display = 'flex';

        // Focus on the dialog for keyboard navigation
        const noButton = document.getElementById('no-button');
        if (noButton) {
            noButton.focus();
        }
    }
}

// Hide exit confirmation dialog
function hideExitConfirmation() {
    const overlay = document.getElementById('confirmation-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Select confirmation option (yes/no)
function selectConfirmationOption(option) {
    confirmationSelection = option;
    updateConfirmationSelection();
}

// Update visual selection of confirmation buttons
function updateConfirmationSelection() {
    const noButton = document.getElementById('no-button');
    const yesButton = document.getElementById('yes-button');

    if (noButton && yesButton) {
        noButton.classList.toggle('selected', confirmationSelection === 'no');
        yesButton.classList.toggle('selected', confirmationSelection === 'yes');
    }
}

// Confirm the selected option
function confirmExitSelection() {
    if (confirmationSelection === 'yes') {
        // Exit to main menu
        hideExitConfirmation();
        exitToMainMenu();
    } else {
        // Stay in game
        hideExitConfirmation();
    }
}

// Exit to main menu function
function exitToMainMenu() {
    // Remove any existing keyboard shortcuts
    if (typeof removeRetryKeyboardShortcut === 'function') {
        removeRetryKeyboardShortcut();
    }

    // Hide all game screens
    document.getElementById('game-interface').style.display = 'none';
    document.getElementById('level-selection').style.display = 'none';
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('content').style.display = 'none';
    document.getElementById('word-count-selection').style.display = 'none';

    // Show data source selection (main menu)
    document.getElementById('data-source-selection').style.display = 'block';

    // Update back button visibility
    updateBackButtonVisibility();

    // Reset game state (only reset variables that exist)
    if (typeof currentWordIndex !== 'undefined') currentWordIndex = 0;
    if (typeof correctAnswers !== 'undefined') correctAnswers = 0;
    if (typeof isRetryMode !== 'undefined') isRetryMode = false;
    if (typeof waitingForContinue !== 'undefined') waitingForContinue = false;
    if (typeof isProcessing !== 'undefined') isProcessing = false;
    if (typeof lastFocusedInput !== 'undefined') lastFocusedInput = null;
}

// Global keyboard event handler for confirmation dialog
function handleConfirmationKeydown(event) {
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

// Initialize back button and confirmation dialog
function initializeConfirmationDialog() {
    // Add global keyboard event listener
    document.addEventListener('keydown', handleConfirmationKeydown);

    // Update back button visibility initially
    updateBackButtonVisibility();
}

// Export functions for global access
window.updateBackButtonVisibility = updateBackButtonVisibility;
window.showExitConfirmation = showExitConfirmation;
window.hideExitConfirmation = hideExitConfirmation;
window.selectConfirmationOption = selectConfirmationOption;
window.confirmExitSelection = confirmExitSelection;
window.exitToMainMenu = exitToMainMenu;
window.initializeConfirmationDialog = initializeConfirmationDialog;
