// Game state variables
let allWords = [];
let allDescriptions = [];
let gameWords = [];
let gameDescriptions = [];
let wordResults = []; // Track result for each word: true = correct, false = incorrect
let currentWordIndex = 0;
let currentWord = '';
let currentDescription = '';
let partialWord = '';
let missingLetters = '';
let correctAnswers = 0;
let totalWords = 0;
let isRetryMode = false;
let lastFocusedInput = null; // Track the last focused input field
let waitingForContinue = false; // Track if we're waiting for Enter to continue after incorrect answer
let selectedLevel = 3; // Default to Level 3 (70% missing)
let isProcessing = false; // Prevent rapid Enter key presses

// Text-to-speech function
function speakWord(word) {
    // Check if speech synthesis is supported
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();

        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance(word);

        // Configure speech settings
        utterance.rate = 0.1;  // Much slower for better clarity
        utterance.pitch = 1.0; // Normal pitch
        utterance.volume = 1.0; // Full volume (already at maximum)

        // Speak the word
        speechSynthesis.speak(utterance);
    }
}

// Function to repeat the current word
function repeatWord() {
    if (currentWord) {
        speakWord(currentWord);

        // Auto-focus after speaking
        setTimeout(() => {
            focusAppropriateInput();
        }, 100); // Small delay to ensure speech starts first
    }
}

// Function to focus the appropriate input field
function focusAppropriateInput() {
    const allInputs = document.querySelectorAll('.inline-input');

    if (allInputs.length === 0) return;

    // If we have a last focused input and it's still empty, focus it
    if (lastFocusedInput && document.contains(lastFocusedInput) && !lastFocusedInput.value) {
        lastFocusedInput.focus();
        return;
    }

    // Otherwise, find the first empty input field
    for (let input of allInputs) {
        if (!input.value) {
            input.focus();
            return;
        }
    }

    // If all fields are filled, focus the first one
    allInputs[0].focus();
}

async function loadAndCountWords() {
    const contentDiv = document.getElementById('content');

    try {
        // Fetch the words.csv file
        const response = await fetch('words.csv');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the text content
        const text = await response.text();

        // Parse CSV content
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const header = lines[0]; // Skip header row
        const dataLines = lines.slice(1);

        // Parse each line
        allWords = [];
        allDescriptions = [];

        dataLines.forEach(line => {
            const [word, description] = line.split(',');
            if (word && description) {
                allWords.push(word.toLowerCase().trim());
                allDescriptions.push(description.trim());
            }
        });

        // Count the words
        const wordCount = allWords.length;

        // Display the result and show level selection
        contentDiv.innerHTML = `
            <div>Total number of words:</div>
            <div class="word-count">${wordCount}</div>
        `;

        // Show level selection
        document.getElementById('level-selection').style.display = 'block';

    } catch (error) {
        console.error('Error loading words:', error);
        contentDiv.innerHTML = `
            <div class="error">
                Error loading words.txt: ${error.message}
            </div>
        `;
    }
}

// Level selection functions
function selectLevel(level) {
    selectedLevel = level;

    // Update visual selection
    document.querySelectorAll('.level-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector(`[data-level="${level}"]`).classList.add('selected');
}

function startGameWithLevel() {
    // Hide level selection and start the game
    document.getElementById('level-selection').style.display = 'none';
    startGame();
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function createPartialWord(word) {
    let wordStructure = [];
    let missingLetters = [];

    // Calculate how many letters to show based on selected level
    const missingPercentage = [50, 60, 70, 80, 90, 100][selectedLevel - 1];
    const totalLetters = word.length;
    const lettersToShow = Math.max(0, Math.ceil(totalLetters * (1 - missingPercentage / 100)));

    // Special case: for nightmare mode (level 6), show 0 letters always
    // For very short words at level 5, might show 0 letters
    const actualLettersToShow = selectedLevel === 6 ? 0 :
        (totalLetters <= 2 && selectedLevel === 5) ?
        Math.max(0, lettersToShow) : Math.max(1, lettersToShow);

    // Determine which positions to show - make it more random
    let visiblePositions = [];

    if (actualLettersToShow === 0) {
        // Show no letters (only for very short words at highest difficulty)
        visiblePositions = [];
    } else {
        // Create array of all possible positions
        const allPositions = [];
        for (let i = 0; i < totalLetters; i++) {
            allPositions.push(i);
        }

        // Randomly select positions to show
        const shuffledPositions = shuffleArray(allPositions);
        visiblePositions = shuffledPositions.slice(0, actualLettersToShow);
        visiblePositions.sort((a, b) => a - b);
    }

    // Build word structure
    for (let i = 0; i < word.length; i++) {
        if (visiblePositions.includes(i)) {
            wordStructure.push({ type: 'visible', letter: word[i] });
        } else {
            wordStructure.push({ type: 'input', letter: word[i], index: missingLetters.length });
            missingLetters.push(word[i]);
        }
    }

    return { wordStructure, missingLetters };
}

function startGame() {
    // Hide the main content and show game interface
    document.getElementById('content').style.display = 'none';
    document.getElementById('game-interface').style.display = 'block';
    document.getElementById('final-results').style.display = 'none';

    // Initialize game state - shuffle words and descriptions together
    const wordDescriptionPairs = allWords.map((word, index) => ({
        word: word,
        description: allDescriptions[index]
    }));

    const shuffledPairs = shuffleArray(wordDescriptionPairs);
    gameWords = shuffledPairs.map(pair => pair.word);
    gameDescriptions = shuffledPairs.map(pair => pair.description);

    currentWordIndex = 0;
    correctAnswers = 0;
    totalWords = gameWords.length;
    isRetryMode = false;

    // Initialize all words as incorrect by default
    wordResults = new Array(gameWords.length).fill(false);

    // Start the first word
    showNextWord();
}

function startRetryGame() {
    // Hide final results and show game interface
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('game-interface').style.display = 'block';

    // Create retry game with words that were marked as incorrect
    const retryPairs = [];
    for (let i = 0; i < wordResults.length; i++) {
        if (wordResults[i] === false) {
            // Find the original word index in the shuffled game
            const originalWordIndex = allWords.indexOf(gameWords[i]);
            if (originalWordIndex !== -1) {
                retryPairs.push({
                    word: allWords[originalWordIndex],
                    description: allDescriptions[originalWordIndex]
                });
            }
        }
    }

    // Shuffle the incorrect words
    const shuffledRetryPairs = shuffleArray(retryPairs);
    gameWords = shuffledRetryPairs.map(pair => pair.word);
    gameDescriptions = shuffledRetryPairs.map(pair => pair.description);

    currentWordIndex = 0;
    correctAnswers = 0;
    totalWords = gameWords.length;
    isRetryMode = true;

    // Initialize all retry words as incorrect by default
    wordResults = new Array(gameWords.length).fill(false);

    // Start the first word
    showNextWord();
}

function showNextWord() {
    if (currentWordIndex >= gameWords.length) {
        showFinalResults();
        return;
    }

    currentWord = gameWords[currentWordIndex];
    currentDescription = gameDescriptions[currentWordIndex];
    const wordData = createPartialWord(currentWord);
    missingLetters = wordData.missingLetters;

    // Create the word display with inline input fields
    const wordDisplayDiv = document.getElementById('word-display');
    wordDisplayDiv.innerHTML = '';

    wordData.wordStructure.forEach((item, index) => {
        if (item.type === 'visible') {
            const span = document.createElement('span');
            span.textContent = item.letter;
            span.className = 'visible-letter';
            wordDisplayDiv.appendChild(span);
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'inline-input';
            input.dataset.index = item.index;
            input.dataset.expectedLetter = item.letter;
            input.addEventListener('input', handleInlineInput);
            input.addEventListener('keydown', handleInlineKeydown);
            input.addEventListener('focus', handleInputFocus);
            wordDisplayDiv.appendChild(input);
        }
    });

    // Update progress and description
    const progressText = isRetryMode ?
        `Retry Word ${currentWordIndex + 1} of ${totalWords}` :
        `Word ${currentWordIndex + 1} of ${totalWords}`;
    document.getElementById('progress').textContent = progressText;
    document.getElementById('word-description').textContent = currentDescription;
    document.getElementById('feedback').textContent = '';

    // Reset focus tracking, waiting state, and processing flag for new word
    lastFocusedInput = null;
    waitingForContinue = false;
    isProcessing = false;

    // Speak the word
    speakWord(currentWord);

    // Focus on first input field
    const firstInput = wordDisplayDiv.querySelector('.inline-input');
    if (firstInput) {
        firstInput.focus();
        lastFocusedInput = firstInput;
    }
}

function handleInputFocus(event) {
    // Track which input field was last focused
    lastFocusedInput = event.target;
}

function handleInlineInput(event) {
    const input = event.target;
    const value = input.value.toLowerCase();

    // Move to next input field if this one is filled
    if (value) {
        const allInputs = document.querySelectorAll('.inline-input');
        const currentIndex = Array.from(allInputs).indexOf(input);

        if (currentIndex < allInputs.length - 1) {
            allInputs[currentIndex + 1].focus();
        }
        // Note: Removed auto-submit when all fields are filled
        // Users must now press Enter to confirm their answer
    }
}

function handleInlineKeydown(event) {
    const input = event.target;

    if (event.key === 'Enter') {
        // Prevent rapid Enter key presses
        if (isProcessing) {
            return;
        }

        if (waitingForContinue) {
            // Continue to next word after incorrect answer
            isProcessing = true;
            waitingForContinue = false;
            currentWordIndex++;
            showNextWord();
        } else {
            // Normal answer checking
            checkAnswer();
        }
    } else if (event.key === 'Backspace' && !input.value && !waitingForContinue) {
        // Move to previous input field if current is empty and backspace is pressed
        const allInputs = document.querySelectorAll('.inline-input');
        const currentIndex = Array.from(allInputs).indexOf(input);

        if (currentIndex > 0) {
            allInputs[currentIndex - 1].focus();
        }
    }
}

function checkAnswer() {
    // Don't process if we're already waiting for continue or processing
    if (waitingForContinue || isProcessing) {
        return;
    }

    const allInputs = document.querySelectorAll('.inline-input');
    const userAnswers = Array.from(allInputs).map(input => input.value.toLowerCase().trim());
    const feedbackDiv = document.getElementById('feedback');

    // Check if all inputs are filled
    if (userAnswers.some(answer => answer === '')) {
        feedbackDiv.innerHTML = '<span class="incorrect">Please fill in all the missing letters!</span>';
        return;
    }

    // Compare with expected answers
    const isCorrect = userAnswers.every((answer, index) => answer === missingLetters[index]);

    if (isCorrect) {
        // Correct answer - mark this word as correct and increment counter
        correctAnswers++;
        wordResults[currentWordIndex] = true; // Mark as correct

        feedbackDiv.innerHTML = '<span class="correct">✓ Correct!</span>';
        feedbackDiv.className = 'feedback correct';

        // Move to next word after a short delay for correct answers
        setTimeout(() => {
            currentWordIndex++;
            showNextWord();
        }, 1000);
    } else {
        // Incorrect answer - word stays marked as incorrect (false by default)
        const expectedWord = currentWord;
        feedbackDiv.innerHTML = `<span class="incorrect">✗ Incorrect. The word was: "${expectedWord}"<br><br>Press <strong>Enter</strong> to continue to the next word</span>`;
        feedbackDiv.className = 'feedback incorrect';

        // Set waiting state - this prevents auto-progression
        waitingForContinue = true;

        // Keep the wrong answers visible for comparison - don't clear them
        // Focus on first input to capture Enter
        if (allInputs.length > 0) {
            allInputs[0].focus();
        }
    }
}

function showFinalResults() {
    // Hide game interface and show results
    document.getElementById('game-interface').style.display = 'none';
    document.getElementById('final-results').style.display = 'block';

    // Count actual correct and incorrect words from the results array
    const actualCorrectCount = wordResults.filter(result => result === true).length;
    const actualIncorrectCount = wordResults.filter(result => result === false).length;

    const percentage = Math.round((actualCorrectCount / totalWords) * 100);

    let resultHTML = `
        You got ${actualCorrectCount} out of ${totalWords} words correct!<br>
        Score: ${percentage}%
    `;

    // Add retry button if there were incorrect words
    if (actualIncorrectCount > 0) {
        resultHTML += `<br><br>
            <button class="start-button" onclick="startRetryGame()">
                Retry Incorrect Words (${actualIncorrectCount})
            </button>`;
    } else {
        resultHTML += `<br><br>🎉 Perfect Score! Well done! 🎉`;
    }

    // Always show play again button
    resultHTML += `<br>
        <button class="start-button" onclick="restartGame()">Play Again</button>
    `;

    document.getElementById('final-score').innerHTML = resultHTML;
}

function restartGame() {
    // Reset and show main content and level selection
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    document.getElementById('level-selection').style.display = 'block';
}

// Load and count words when the page loads
document.addEventListener('DOMContentLoaded', loadAndCountWords);
