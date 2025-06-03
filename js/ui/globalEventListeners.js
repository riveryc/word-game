import { showExitConfirmation, handleKeysWithinConfirmationDialog } from './confirmationDialog.js';

// Global keydown (ESC for confirmation)
export function handleGlobalKeydown(event) {
    const overlay = document.getElementById('confirmation-overlay');
    const isConfirmationVisible = overlay && overlay.style.display === 'flex';

    if (isConfirmationVisible) {
        // If dialog is visible, delegate to its specific handler
        handleKeysWithinConfirmationDialog(event);
        // The logic for removeRetryKeyboardShortcut on Enter/confirm is now inside confirmExitSelection in confirmationDialog.js
    } else {
        // Dialog is NOT visible
        if (event.key === 'Escape') {
            const gameInterface = document.getElementById('game-interface');
            const levelSelectionScreen = document.getElementById('level-selection'); 
            const finalResultsScreen = document.getElementById('final-results');

            const shouldShow = (gameInterface && gameInterface.style.display === 'block') ||
                               (levelSelectionScreen && levelSelectionScreen.style.display === 'block') ||
                               (finalResultsScreen && finalResultsScreen.style.display === 'block');
            if (shouldShow) {
                event.preventDefault();
                showExitConfirmation(); 
            }
        }
        // Add other global keydowns here if needed (e.g. F1 for help, etc.)
    }
}

export function initializeMainAppEventListeners() { 
    document.removeEventListener('keydown', handleGlobalKeydown);
    document.addEventListener('keydown', handleGlobalKeydown);
    // The call to updateBackButtonVisibility might be best placed in core.js after all UI initializations.
} 