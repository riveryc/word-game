import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { displayWordChallenge, resetUIStateForTesting } from '../../../js/ui/gamePlayInterface'; // Adjust path as necessary

describe('Game Play Interface - Input Handling (via handleInputChange)', () => {
    let mockInput;
    let mockRootElement; // A root element for the game interface

    beforeEach(() => {
        // Create a root element for the game UI components to attach to if needed
        mockRootElement = document.createElement('div');
        mockRootElement.id = 'game-interface'; 
        document.body.appendChild(mockRootElement);

        const mockWordDisplayContainer = document.createElement('div');
        mockWordDisplayContainer.id = 'word-display';
        mockRootElement.appendChild(mockWordDisplayContainer);
        
        const mockProgress = document.createElement('div');
        mockProgress.id = 'progress';
        mockRootElement.appendChild(mockProgress);
        const mockDescription = document.createElement('div');
        mockDescription.id = 'word-description';
        mockRootElement.appendChild(mockDescription);
        const mockFeedback = document.createElement('div');
        mockFeedback.id = 'feedback';
        mockRootElement.appendChild(mockFeedback);

        const currentWordData = {
            word: "a", 
            sentencePrefix: "Test ",
            sentenceSuffix: " sentence.",
            progressText: '', 
            hintText: '' 
        };
        
        displayWordChallenge(currentWordData);

        // Corrected selector: input is inside .word-guess-area which is inside #word-display
        mockInput = mockWordDisplayContainer.querySelector('.word-guess-area .inline-input'); 
        
        if (!mockInput) {
            console.error("CRITICAL TEST FAILURE: .inline-input not found after displayWordChallenge. Check displayWordChallenge logic and test setup.");
            // Create a dummy input to prevent tests from crashing, but they will likely fail or be inaccurate.
            mockInput = document.createElement('input'); 
            mockInput.type = 'text';
            mockInput.className = 'inline-input';
        }
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = ''; // Clean up DOM
        resetUIStateForTesting(); // Call the reset function here
    });

    it('should visually convert the input value to lowercase upon input', () => {
        mockInput.value = 'A';
        mockInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        expect(mockInput.value).toBe('a'); 
    });

    it('should not change an already lowercase input value', () => {
        mockInput.value = 'b';
        mockInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        expect(mockInput.value).toBe('b');
    });

    it('should handle empty input without error and keep it empty', () => {
        mockInput.value = '';
        mockInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        expect(mockInput.value).toBe('');
    });
}); 