import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleInlineInput, displayWordChallenge } from '../../../js/ui/gamePlayInterface'; // Adjust path as necessary

describe('Game Play Interface - handleInlineInput', () => {
    let mockInput;
    let mockEvent;
    let mockRootElement; // A root element for the game interface

    beforeEach(() => {
        // Create a root element for the game UI components to attach to if needed
        mockRootElement = document.createElement('div');
        mockRootElement.id = 'game-interface'; // As used in displayWordChallenge
        document.body.appendChild(mockRootElement);

        // Mock the specific element that will become wordDisplayDiv
        const mockWordDisplayContainer = document.createElement('div');
        mockWordDisplayContainer.id = 'word-display';
        mockRootElement.appendChild(mockWordDisplayContainer);
        // Spy on its querySelectorAll, used by handleInlineInput
        vi.spyOn(mockWordDisplayContainer, 'querySelectorAll').mockReturnValue([]);

        // Other elements displayWordChallenge might try to find
        const mockProgress = document.createElement('div');
        mockProgress.id = 'progress';
        mockRootElement.appendChild(mockProgress);
        const mockDescription = document.createElement('div');
        mockDescription.id = 'word-description';
        mockRootElement.appendChild(mockDescription);
        const mockFeedback = document.createElement('div');
        mockFeedback.id = 'feedback';
        mockRootElement.appendChild(mockFeedback);

        // Call displayWordChallenge to initialize module-scoped variables like wordDisplayDiv
        // Pass minimal data required for it to run without error and set up the input.
        mockInput = document.createElement('input'); // This will be our event target
        mockInput.type = 'text';
        mockInput.className = 'inline-input';
        
        // displayWordChallenge will create its own inputs. We want to test the handler 
        // associated with an input created by displayWordChallenge.
        // So, let displayWordChallenge create the input, then we find it.
        const wordStructure = [
            { type: 'input', letter: 'A', index: 0 } // Minimal structure with one input
        ];
        displayWordChallenge({ 
            wordStructure: wordStructure, 
            progressText: '', 
            hintText: '' 
        });

        // Find the input created by displayWordChallenge to be our mockInput for the event
        mockInput = mockWordDisplayContainer.querySelector('.inline-input');
        if (!mockInput) {
            // Fallback if querySelector fails, though it shouldn't with the setup above
            mockInput = document.createElement('input'); 
        }
        
        mockEvent = { target: mockInput };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = ''; // Clean up DOM
    });

    it('should visually convert the input value to lowercase upon input', () => {
        mockInput.value = 'A';
        mockInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); // Dispatch actual event
        // The event handler `handleInlineInput` should be called by the browser engine.
        // For this test, we are checking the side effect of the handler.
        // If dispatchEvent doesn't trigger it in JSDOM as expected or if direct call is preferred:
        // handleInlineInput(mockEvent); // This was the old way
        
        expect(mockInput.value).toBe('a'); 
    });

    it('should not change an already lowercase input value', () => {
        mockInput.value = 'b';
        mockInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        // handleInlineInput(mockEvent); // Old way
        expect(mockInput.value).toBe('b');
    });

    it('should handle empty input without error and keep it empty', () => {
        mockInput.value = '';
        mockInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        // handleInlineInput(mockEvent); // Old way
        expect(mockInput.value).toBe('');
    });
}); 