# Audio Feature Design: Google Translate & Dictionary API Integration (Revised)

## 1. Overview

This document outlines the design for integrating audio pronunciations into the word game application, featuring server-side caching from multiple online sources (Google Translate, Dictionary API) and a browser-based offline fallback. Users will choose between "Online" and "Offline" audio modes.

## 2. Backend Design (`server.py`)

### 2.1. Audio Caching
-   **Cache Directory:** `audio_cache/`
-   **File Naming Convention:** `<method>_<word>.mp3`
    -   `method`: `google` or `dictionary` (Indicates the source of the cached file)
    -   `word`: The word, sanitized and normalized (e.g., lowercase, URL-encoded for requests).
    -   Example: `google_hello.mp3`, `dictionary_example.mp3`

### 2.2. API Endpoints

#### 2.2.1. `POST /api/cache_audio`
-   **Purpose:** To request the server to download and cache an audio file for a given word. The server will attempt sources in a predefined order (Google, then Dictionary). If already cached from any source, it may return the existing file info.
-   **Method:** `POST`
-   **Request Body (JSON):**
    ```json
    {
        "word": "string"
    }
    ```
-   **Behavior:**
    1.  Extract and sanitize/normalize `word` from the request body.
    2.  **Check existing cache:**
        a.  Generate `google_filename = "google_" + normalized_word + ".mp3"`. Check if `audio_cache/google_filename` exists.
        b.  If yes, return success: `{"message": "Audio for 'word' is already cached.", "file": google_filename, "method_used": "google"}`.
        c.  Else, generate `dictionary_filename = "dictionary_" + normalized_word + ".mp3"`. Check if `audio_cache/dictionary_filename` exists.
        d.  If yes, return success: `{"message": "Audio for 'word' is already cached.", "file": dictionary_filename, "method_used": "dictionary"}`.
    3.  **Attempt Google Translate:**
        a.  Construct Google TTS URL: `https://translate.google.com/translate_tts?ie=UTF-8&q=<URL_encoded_word>&tl=en&client=tw-ob`.
        b.  Make request with `Referer` header matching the TTS URL.
        c.  If successful (e.g., HTTP 200 from Google):
            i.  Save MP3 to `audio_cache/google_filename`.
            ii. Return success: `{"message": "Audio for 'word' cached successfully from Google.", "file": google_filename, "method_used": "google"}` (HTTP 201 or 200).
        d.  If Google fails (e.g., HTTP error 4xx/5xx), store the `origin_http_code` from Google's response. Proceed to Dictionary API.
    4.  **Attempt Dictionary API (if Google failed):**
        a.  Fetch audio from the specified dictionary API endpoint (TBD).
        b.  If successful (e.g., HTTP 200 from Dictionary API):
            i.  Save MP3 to `audio_cache/dictionary_filename`.
            ii. Return success: `{"message": "Audio for 'word' cached successfully from Dictionary.", "file": dictionary_filename, "method_used": "dictionary"}` (HTTP 201 or 200).
        c.  If Dictionary API also fails, store its `origin_http_code`.
    5.  **All Online Sources Failed:**
        -   Return an error response (e.g., HTTP 500 from our server):
          `{"error": "Failed to cache audio for 'word' from any online source.", "origin_http_code": "<code_from_last_attempted_source>"}`. The `origin_http_code` should be from the Dictionary API if it was attempted, otherwise from Google.
-   **Success Response Example (200 OK / 201 Created):**
    ```json
    {
        "message": "Audio for 'word' cached successfully from Google.",
        "file": "google_example.mp3",
        "method_used": "google"
    }
    ```
    or
    ```json
    {
        "message": "Audio for 'word' is already cached.",
        "file": "dictionary_example.mp3",
        "method_used": "dictionary"
    }
    ```
-   **Error Response Example (500 Internal Server Error from our API):**
    ```json
    {
        "error": "Failed to cache audio for 'word' from any online source.",
        "origin_http_code": "404" // Example: if Google returned 404, and Dictionary API also failed or was not configured
    }
    ```

#### 2.2.2. `GET /api/audio/<filename>`
-   **Purpose:** To retrieve and stream a specifically named cached audio file. The `filename` would be like `google_hello.mp3` or `dictionary_example.mp3`.
-   **Method:** `GET`
-   **URL Parameters:**
    -   `filename`: The exact name of the audio file in the cache (e.g., `google_hello.mp3`). This name is provided by the `POST /api/cache_audio` endpoint.
-   **Behavior:**
    1.  The `filename` parameter directly maps to a file in `audio_cache/`.
    2.  Construct the file path: `audio_cache/<filename>`.
    3.  Validate `filename` to prevent path traversal and ensure it matches the expected pattern (e.g., `(google|dictionary)_<sanitized_word>.mp3`).
    4.  Check if the file exists.
        -   If yes, stream the file with `Content-Type: audio/mpeg`.
        -   If no, return HTTP 404 Not Found.
-   **Success Response:** Raw audio data with `Content-Type: audio/mpeg`.
-   **Error Response (404 Not Found):**
    ```json
    {
        "error": "Audio file not found in cache."
    }
    ```

### 2.3. Python Implementation Notes (`server.py`)
-   Use `Flask` or `FastAPI`.
-   Use `requests` for external HTTP calls.
-   Implement robust error handling for network requests, file I/O.
-   Carefully sanitize and normalize `word` for filenames and API URLs.
-   Ensure `audio_cache/` directory exists with write permissions.

## 3. Frontend Design

### 3.1. HTML Changes (`index.html`)
-   Update audio selection UI to "Online" and "Offline" modes.
    ```html
    <fieldset id="audioSourceSelection">
        <legend>Audio Source:</legend>
        <div>
            <input type="radio" id="audioOnline" name="audioSource" value="online" checked>
            <label for="audioOnline">Online (Google/Dictionary, caches on server)</label>
        </div>
        <div>
            <input type="radio" id="audioOffline" name="audioSource" value="offline">
            <label for="audioOffline">Offline (Browser audio)</label>
        </div>
    </fieldset>
    ```
-   Optional "Cache All Words" button (`cacheAllWordsButton`) logic would need to be adapted to POST to `/api/cache_audio` for each word without specifying a method.

### 3.2. JavaScript Design (`js/audio/onlineAudioManager.js` or similar)

#### 3.2.1. Core Logic
-   **State:**
    -   `currentAudioSource`: Stores `'online'` or `'offline'`. Initialize to `'online'`.
-   **`initAudioControls()`:**
    -   Listeners on radio buttons to update `currentAudioSource`.
-   **`playWordAudio(word)` function (main function called by game):**
    -   Normalize `word`.
    -   If `currentAudioSource === 'offline'`:
        -   `playBrowserTTS(word);`
    -   Else (`currentAudioSource === 'online'`):
        -   `playOnlineAudioUnified(word);`

-   **`playOnlineAudioUnified(word)` function:**
    1.  **Request Caching & Get Filename:**
        -   Make `fetch` POST to `/api/cache_audio` with `body: JSON.stringify({ word })`, `headers: { 'Content-Type': 'application/json' }`.
        -   If `fetch` itself fails (network error) or server returns an error status (e.g., 500):
            -   `console.error("Failed to cache/retrieve audio metadata for:", word, errorResponse);`
            -   If `errorResponse.json()` is available and contains `origin_http_code`, log it.
            -   `playBrowserTTS(word);` (Fallback)
            -   Return.
        -   If successful (server returns 200/201 with `file` property):
            -   Let `cachedFilename = responseData.file;`
            -   Proceed to play this file.
    2.  **Play Audio from Server Cache:**
        -   Construct audio URL: `/api/audio/${cachedFilename}`.
        -   `const audio = new Audio(audioUrl);`
        -   Implement 3-second timeout for playback:
            ```javascript
            let fallbackTimeoutId = setTimeout(() => {
                console.warn(`Timeout playing online audio for '${word}' from ${audioUrl}. Falling back to browser audio.`);
                audio.pause(); audio.src = '';
                playBrowserTTS(word);
            }, 3000);

            audio.oncanplaythrough = () => { clearTimeout(fallbackTimeoutId); audio.play(); };
            audio.onerror = (e) => {
                clearTimeout(fallbackTimeoutId);
                console.error(`Error playing audio from ${audioUrl} for '${word}':`, e);
                playBrowserTTS(word);
            };
            audio.load();
            ```

-   **`playBrowserTTS(word)`:** (Existing or to be created helper for browser `SpeechSynthesis`)

#### 3.2.2. Integration
-   Include script in `index.html`.
-   Call `initAudioControls()` on DOM load.
-   Update game logic to call `playWordAudio(word)`.

### 3.3. User Interaction Flow (Revised)
1.  User selects "Online" or "Offline" audio. "Online" is default.
2.  When game needs to pronounce `word`:
    a.  If "Offline": Browser TTS directly.
    b.  If "Online":
        i.  JS sends `POST /api/cache_audio` with `{"word": word}`.
        ii. Backend tries Google, then Dictionary API to cache `word`. Returns `{"file": "actual_cached_file.mp3", ...}`.
        iii. If backend fails to cache from any online source, it returns an error (e.g., 500 with `origin_http_code`). JS logs this and falls back to Browser TTS.
        iv. If backend call is successful, JS constructs URL `/api/audio/actual_cached_file.mp3` and attempts to play it.
        v.  If this playback attempt fails or times out (3s), JS falls back to Browser TTS.

## 4. Open Questions/TBD
-   **Dictionary API Details:** Still need specific endpoint, request/response format for the dictionary audio source.
-   **Word Normalization Details:** Define precise rules (e.g., lowercase, trim, handling special characters for filenames vs. URL encoding for API calls).
-   **Error Handling & User Feedback:** Consider if more specific user-facing messages are needed beyond console logs when online audio fails and fallback occurs.
-   **Security (Backend):** Reinforce validation of `word` and `filename` parameters.

## 5. File Structure Changes Summary
-   **New Directory:** `design/`
-   **New File (this document):** `design/audio_feature_design.md` (Updated)
-   **Existing Directory (used by backend):** `audio_cache/`
-   **Modified File (backend):** `server.py`
-   **Modified File (frontend):** `index.html`
-   **New/Modified File (frontend JS):** `js/audio/onlineAudioManager.js` (or similar)
-   **Potentially Modified JS (frontend):** Game logic files. 