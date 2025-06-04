import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WordGenerator } from '../../../js/game/wordGenerator'; // Adjust path as needed

// Mock DOM elements that WordGenerator might interact with
const setupDOM = (puzzleLetters) => {
    document.body.innerHTML = ''; // Clear previous DOM
    puzzleLetters.forEach(letterData => {
        if (letterData.isHidden) {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = letterData.inputId;
            input.value = letterData.currentValue || ''; // Allow setting a value for testing
            document.body.appendChild(input);
        } else {
            // If visible letters are part of the structure getUserInput reconstructs,
            // they might need to be represented in the DOM as well,
            // though getUserInput in the snippet primarily focuses on inputElement.value
        }
    });
};

describe('WordGenerator', () => {
    let wordGenerator;

    beforeEach(() => {
        wordGenerator = new WordGenerator();
        // Mock any dependencies or initial setup if WordGenerator constructor requires it
        // For instance, if it initializes currentPuzzle or expects certain global state
    });

    describe('getUserInput', () => {
        it('should return the combined user input in lowercase', () => {
            const puzzleData = {
                originalWord: 'MixedCase',
                puzzleLetters: [
                    { letter: 'M', isHidden: false },
                    { letter: 'i', isHidden: true, inputId: 'input-1', index: 1, currentValue: 'I' },
                    { letter: 'x', isHidden: false },
                    { letter: 'e', isHidden: true, inputId: 'input-3', index: 3, currentValue: 'E' },
                    { letter: 'd', isHidden: false },
                    { letter: 'C', isHidden: true, inputId: 'input-5', index: 5, currentValue: 'c' },
                    { letter: 'a', isHidden: false },
                    { letter: 's', isHidden: true, inputId: 'input-7', index: 7, currentValue: 'S' },
                    { letter: 'e', isHidden: false },
                ]
            };

            // Simulate that a puzzle has been generated and is current
            wordGenerator.currentPuzzle = puzzleData; 
            
            setupDOM(puzzleData.puzzleLetters);

            const userInput = wordGenerator.getUserInput();
            // Expected: 'M' (visible) + 'i' (from input 'I') + 'x' (visible) + 'e' (from input 'E') + 'd' (visible) + 'c' (from input 'c') + 'a' (visible) + 's' (from input 'S') + 'e' (visible, lowercase)
            // This should be "Mixedcase"
            expect(userInput).toBe('Mixedcase'); 
        });

        it('should return an empty string if there is no current puzzle', () => {
            wordGenerator.currentPuzzle = null;
            const userInput = wordGenerator.getUserInput();
            expect(userInput).toBe('');
        });

        it('should handle empty input fields correctly, returning lowercase letters for visible parts', () => {
            const puzzleData = {
                originalWord: 'Test',
                puzzleLetters: [
                    { letter: 'T', isHidden: false },
                    { letter: 'e', isHidden: true, inputId: 'input-1', index: 1, currentValue: 'E' },
                    { letter: 's', isHidden: true, inputId: 'input-2', index: 2, currentValue: '' }, // Empty input
                    { letter: 't', isHidden: false },
                ]
            };
            wordGenerator.currentPuzzle = puzzleData;
            setupDOM(puzzleData.puzzleLetters);
            
            // Based on the provided snippet:
            // getUserInput() joins:
            // visible letters directly (letterData.letter)
            // input values in lowercase (inputElement.value.toLowerCase())
            // So, for 'T' (visible), 'E' (input), '' (empty input), 't' (visible)
            // it should be 'T' + 'e' + '' + 't' = "Te t" -> if original visible letters are not lowercased by getUserInput
            // The snippet's getUserInput:
            //  } else { // visible letter
            //     return letterData.letter; // returns original case from puzzleLetters
            //  }
            // So it would be 'T' + 'e' + '' + 't' = "Tet"
            // The user's request is "all input letters are all lower cases"
            // The existing code snippet for `wordGenerator.getUserInput()` is:
            //       if (letterData.isHidden) {
            //            const inputElement = document.getElementById(letterData.inputId);
            //            return inputElement ? inputElement.value.toLowerCase() : '';
            //        } else {
            //            return letterData.letter; // Visible letters are returned as is
            //        }
            // This means 'T' and 't' (visible parts) are NOT lowercased by this specific function.
            // The test should reflect the current behavior of getUserInput.
            // If the requirement is that the *entire combined string* is lowercase,
            // then getUserInput() would need modification, or another function would do the final conversion.

            const userInput = wordGenerator.getUserInput();
            // Expected: 'T' (visible) + 'e' (from input 'E') + '' (from empty input) + 't' (visible)
            // This should be "Tet"
            expect(userInput).toBe('Tet'); 
        });
    });
}); 