# Sentence Feature Design Document

## 1. Overview

This document outlines the design for a new "sentence" feature in the word game. The goal is to enhance the learning experience by providing context for the words being spelled, helping children understand their usage in sentences.

## 2. Core Changes

### 2.1. Replacing Word with Sentence

-   The central element of the game will shift from a single word to a sentence with a missing word.
-   The user will be tasked with spelling the missing word within the context of the sentence.

### 2.2. Sentence Structure

The game will support three types of sentence structures:

1.  `Known words <missing_word> known words`
    -   Example: "The quick brown <fox> jumps over the lazy dog."
2.  `<missing_word> known words`
    -   Example: "<Answering> the phone is important."
3.  `Known words <missing_word>`
    -   Example: "The cat sat on the <mat>."

### 2.3. Visual Design - Highlighting the Missing Word

-   To maintain focus on the spelling task, the `_missing_word_` will be visually distinct.
-   It will be displayed on a dedicated row.
-   The font size for the `_missing_word_` will be larger than the rest of the sentence.

## 3. Audio Integration

### 3.1. Sentence-Based Audio

-   Instead of fetching audio for the individual missing word, the entire sentence (with the missing word filled in) will be used to generate audio.
-   The primary source for audio generation will be the Google TTS API.

### 3.2. Fallback Audio Mechanism

-   If the Google TTS API call fails (e.g., due to network issues or API errors), the game will fall back to using the local browser's built-in TTS capabilities.

### 3.3. Server-Side Audio Caching & Filename Normalization (for Google TTS via Backend)

-   **Backend Endpoint:** The frontend will interact with a backend endpoint (e.g., `/api/audio-cache` on the local server) to request sentence audio via Google TTS.
-   **Caching Trigger:** The frontend sends the full sentence to this backend endpoint. The backend is responsible for fetching the audio from Google Translate TTS if not already cached locally on the server.
-   **Text to Google TTS:** The backend sends the *original, unaltered sentence* (with punctuation and casing) to the Google Translate TTS service to ensure the best audio quality.
-   **Filename Normalization for Cache:**
    -   The audio file returned by Google Translate TTS will be cached on the server.
    -   The filename for the cached MP3 file will be a normalized version of the sentence:
        1.  The original sentence is stripped of leading/trailing whitespace.
        2.  If the sentence ends with a period (`.` ), this final period is removed.
        3.  All other non-alphanumeric characters (e.g., spaces, commas, question marks, exclamation points, etc., but not underscores themselves) are replaced with a single underscore (`_`).
        4.  Multiple consecutive underscores are collapsed into a single underscore.
        5.  Any leading or trailing underscores that might result from symbols at the start/end of the (period-trimmed) sentence are removed.
        6.  The resulting string is converted to lowercase.
        7.  The filename is prepended with `google_` and appended with `.mp3`.
        -   *Example:* "Be careful not to lose your hat." becomes `google_be_careful_not_to_lose_your_hat.mp3`.
        -   *Example:* "Is it fun? Yes!" becomes `google_is_it_fun_yes.mp3`.
-   **Frontend Playback:** The backend endpoint, after ensuring the audio is cached, returns a JSON response to the frontend containing the generated filename. The frontend then constructs a URL to this static audio file (e.g., `/audio_cache/google_be_careful_not_to_lose_your_hat.mp3`) and plays it using an HTML `<audio>` element.

### 3.4. Audio Playback Control

-   **Interaction Lock:** During audio playback (the sentence being read), user interactions like pressing the spacebar or clicking buttons that would typically replay the audio will be disabled. No new audio playback can be initiated until the current one finishes.
-   **Timer Start:** The timer for the round (counting seconds) will begin only after the initial audio playback of the sentence is fully completed.

## 4. UI/UX Adjustments

-   **Removal of "Your Answer:":** The label "Your Answer:" currently displayed will be removed, as the input area will directly correspond to the highlighted missing word in the sentence.

## 5. Future Considerations (Post-MVP)

-   Investigate options for more dynamic sentence generation.
-   Explore different highlighting styles for the missing word.

## 6. Development Plan

**Phase 1: Core Logic and Data Structure**

1.  **Utilize Existing `Example sentence` Column in `words.csv`:**
    *   The game will use the existing column named `Example sentence` in the `words.csv` file.
    *   This `Example sentence` column is expected to store the complete sentence, with the corresponding `word` (from the `word` column in the same row) already embedded within it.
        *   Example: If `word` is "fox", the `Example sentence` column might contain "The quick brown fox jumps over the lazy dog."
    *   **Data Integrity & Filtering:**
        *   During data loading, entries from `words.csv` will be filtered. An entry will only be considered valid for the sentence feature if:
            *   The `Example sentence` column is not empty and has meaningful content.
            *   The text in the `Example sentence` column actually contains the exact text from the `word` column (a case-insensitive check is recommended for robustness during the check, but the original casing from the `word` column should be preserved and used for later replacement/highlighting).
        *   Entries not meeting these criteria will be ignored for sentence-based challenges and will not count towards game progress or be displayed.
    *   **Capitalization Rule:**
        *   The application should ensure that the first letter of any sentence displayed to the user is capitalized. This will be handled by the UI rendering logic when displaying the sentence.
    *   Update data loading and parsing logic (likely in `js/data/`) to:
        *   Specifically read and process the `word` and `Example sentence` columns.
        *   Apply the data integrity and filtering rules during or after parsing.
        *   Pass the validated word and its corresponding sentence to the game logic.
2.  **Update Game State Management:**
    *   Modify the core game logic (likely in `js/game/`) to handle sentences.
    *   The game will need to dynamically identify the position of the target `word` within the full `sentence` string. This information will be used to:
        *   Determine the parts of the sentence to display before and after the missing word.
        *   Know what the user is expected to type.
    *   Store the current problem as the full sentence and the target word.
    *   Input validation will compare the user's input against the target `word`.

**Phase 2: UI Implementation**

1.  **Sentence Display & Dynamic Structure Handling:**
    *   Adapt UI components (in `js/ui/components/` and potentially `index.html`) to render the sentence.
    *   The UI will need to dynamically create the display by:
        *   Taking the full sentence and the target word.
        *   Replacing the target word in the sentence with a placeholder (e.g., "____" or an input field).
        *   Displaying the parts of the sentence before and after the placeholder.
    *   This approach means the UI doesn't need to know about fixed types like "word at start/middle/end" beforehand, as it will be derived from the data.
2.  **Highlight Missing Word Placeholder:**
    *   Implement CSS rules (in `styles/`) for the visual distinction of the placeholder/input area for the `_missing_word_` (dedicated row, larger font, as per original design).
    *   Update relevant UI components to apply these styles to the placeholder area.
3.  **Remove "Your Answer:" Label:**
    *   Modify the UI to remove the "Your Answer:" text, ensuring the input field (which is now the placeholder for the missing word) is intuitively understood.

**Phase 3: Audio Integration**

1.  **Google TTS API for Sentences:**
    *   Update audio generation logic (likely in `js/audio/`) to send the complete sentence (with the missing word temporarily filled for pronunciation) to the Google TTS API.
    *   Manage API responses and audio playback.
2.  **Fallback to Browser TTS:**
    *   Implement a robust fallback to `window.speechSynthesis` if the Google TTS API fails.
    *   Ensure smooth transitions and consistent audio handling between primary and fallback TTS.
3.  **Audio Playback Controls:**
    *   Implement the "interaction lock" feature: Prevent re-triggering audio (via spacebar or button clicks) while a sentence is being read. This will likely involve state management in `js/game/` or UI event handling logic.
4.  **Timer Logic Modification:**
    *   Adjust the game timer (in `js/game/`) to commence counting only *after* the initial sentence audio playback has fully completed.

**Phase 4: Refinement and Testing**

1.  **Update Input Validation:**
    *   Ensure the user's typed input is accurately compared against the actual `_missing_word_`.
2.  **Comprehensive Testing:**
    *   Develop/update unit tests (in `tests/js/game/` and `tests/js/ui/`) for:
        *   All sentence structures.
        *   Correct highlighting and display of the missing word.
        *   Audio playback logic (potentially mocking TTS API calls and `window.speechSynthesis`).
        *   Interaction lock during audio playback.
        *   Accurate timer start conditions.
        *   Functionality of the fallback TTS mechanism.
    *   Conduct thorough manual end-to-end testing.

**Assumptions for Planning:**

*   The current Google TTS integration can be adapted to handle full sentences.
*   `window.speechSynthesis` is a viable and acceptable fallback for TTS. 