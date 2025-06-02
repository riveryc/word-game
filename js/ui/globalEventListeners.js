import { confirmExitSelection as confirmExitSelectionDialog, exitToMainMenu as exitToMainMenuDialog, showExitConfirmation, updateBackButtonVisibility } from './confirmationDialog.js';
import { removeRetryKeyboardShortcut } from './resultsInterface.js'; // Path might need adjustment depending on final structure

// Global keydown (ESC for confirmation)
export function handleGlobalKeydown(event) {
    const overlay = document.getElementById('confirmation-overlay');
    const isConfirmationVisible = overlay && overlay.style.display === 'flex';

    if (isConfirmationVisible) {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmExitSelectionDialog();
            // Check if data source selection is visible to decide on removing shortcut
            const dataSourceScreen = document.getElementById('data-source-selection');
            if (dataSourceScreen && dataSourceScreen.style.display === 'block') { 
                removeRetryKeyboardShortcut(); 
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            exitToMainMenuDialog(false); 
            removeRetryKeyboardShortcut();
        }
    } else {
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
    }
}

export function initializeMainAppEventListeners() { 
    document.addEventListener('keydown', handleGlobalKeydown);
    updateBackButtonVisibility(); // This is from confirmationDialog.js
} 