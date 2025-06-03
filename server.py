from flask import Flask, request, jsonify, send_from_directory
import os
import requests
import urllib.parse
import re # For filename pattern validation
import json # For json.JSONDecodeError

app = Flask(__name__)

# Placeholder for a real dictionary API URL
DICTIONARY_API_URL_TEMPLATE = "https://api.dictionaryapi.dev/api/v2/entries/en/{word}" # This is an example, actual audio URL might be different

AUDIO_CACHE_DIR = "audio_cache"

if not os.path.exists(AUDIO_CACHE_DIR):
    os.makedirs(AUDIO_CACHE_DIR)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/words.csv')
def serve_words_csv():
    return send_from_directory('.', 'words.csv', mimetype='text/csv')

# Route to serve files from the 'js' directory
@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('js', path)

# Route to serve files from the 'styles' directory
@app.route('/styles/<path:path>')
def serve_styles(path):
    return send_from_directory('styles', path)

def normalize_word(word_input):
    if not isinstance(word_input, str):
        return ""
    return word_input.lower().replace(" ", "_").strip()

@app.route("/api/cache_audio", methods=["POST"])
def cache_audio():
    data = request.get_json()
    if not data or 'word' not in data:
        return jsonify({"error": "Missing 'word' parameter"}), 400

    original_word = data['word']
    if not isinstance(original_word, str) or not original_word.strip():
        return jsonify({"error": "'word' must be a non-empty string"}), 400

    normalized_word = normalize_word(original_word)
    if not normalized_word:
        # This case might be redundant if the above check catches empty strings after strip
        return jsonify({"error": "Normalized word is empty"}), 400

    google_filename = f"google_{normalized_word}.mp3"
    google_cache_path = os.path.join(AUDIO_CACHE_DIR, google_filename)

    dictionary_filename = f"dictionary_{normalized_word}.mp3"
    dictionary_cache_path = os.path.join(AUDIO_CACHE_DIR, dictionary_filename)

    # 2. Check existing cache
    if os.path.exists(google_cache_path):
        return jsonify({
            "message": f"Audio for '{original_word}' is already cached.",
            "file": google_filename,
            "method_used": "google"
        }), 200
    
    if os.path.exists(dictionary_cache_path):
        return jsonify({
            "message": f"Audio for '{original_word}' is already cached.",
            "file": dictionary_filename,
            "method_used": "dictionary"
        }), 200

    last_origin_http_code = None

    # 3. Attempt Google Translate
    try:
        google_tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(normalized_word)}&tl=en&client=tw-ob"
        headers = {'Referer': google_tts_url}
        app.logger.debug(f"Attempting Google TTS: {google_tts_url}")
        response_google = requests.get(google_tts_url, headers=headers, timeout=10)
        last_origin_http_code = str(response_google.status_code)
        response_google.raise_for_status()
        with open(google_cache_path, 'wb') as f:
            f.write(response_google.content)
        app.logger.info(f"Cached from Google: {google_filename}")
        return jsonify({
            "message": f"Audio for '{original_word}' cached successfully from Google.",
            "file": google_filename,
            "method_used": "google"
        }), 201
    except requests.exceptions.RequestException as e:
        app.logger.warning(f"Google TTS failed for {normalized_word}: {e}")
        if hasattr(e, 'response') and e.response is not None:
             last_origin_http_code = str(e.response.status_code)
    except IOError as e:
        app.logger.error(f"IOError writing Google cache for {normalized_word}: {e}")
        return jsonify({"error": f"Failed to write cache file for Google: {str(e)}"}), 500
    
    # 4. Attempt Dictionary API (if Google failed)
    app.logger.debug(f"Attempting Dictionary API for {normalized_word}")
    dictionary_audio_url_to_fetch = None
    try:
        dictionary_metadata_url = DICTIONARY_API_URL_TEMPLATE.format(word=urllib.parse.quote(normalized_word))
        app.logger.debug(f"Fetching metadata from Dictionary API: {dictionary_metadata_url}")
        response_dict_metadata = requests.get(dictionary_metadata_url, timeout=10)
        last_origin_http_code = str(response_dict_metadata.status_code) # From metadata request
        response_dict_metadata.raise_for_status() # Check if metadata fetch was successful

        metadata = response_dict_metadata.json()
        if isinstance(metadata, list) and len(metadata) > 0:
            phonetics_list = metadata[0].get('phonetics', [])
            if isinstance(phonetics_list, list):
                for phonetic_entry in phonetics_list:
                    if isinstance(phonetic_entry, dict):
                        audio_url = phonetic_entry.get('audio')
                        if isinstance(audio_url, str) and audio_url.endswith('.mp3') and audio_url.strip() and audio_url.startswith('http'):
                            dictionary_audio_url_to_fetch = audio_url
                            break # Found a usable audio URL
        
        if dictionary_audio_url_to_fetch:
            app.logger.debug(f"Found audio URL in Dictionary API: {dictionary_audio_url_to_fetch}")
            response_dict_audio = requests.get(dictionary_audio_url_to_fetch, timeout=10)
            last_origin_http_code = str(response_dict_audio.status_code) # Now from audio data request
            response_dict_audio.raise_for_status() # Check if audio download was successful
            
            with open(dictionary_cache_path, 'wb') as f:
                f.write(response_dict_audio.content)
            app.logger.info(f"Cached from Dictionary: {dictionary_filename}")
            return jsonify({
                "message": f"Audio for '{original_word}' cached successfully from Dictionary.",
                "file": dictionary_filename,
                "method_used": "dictionary"
            }), 201
        else:
            app.logger.warning(f"No suitable audio URL found in Dictionary API response for {normalized_word}")
            # If no audio URL, last_origin_http_code is already set from metadata response (e.g. 200 if metadata was found but no audio)
            # This path will lead to the final "All Online Sources Failed" if Google also failed.

    except requests.exceptions.RequestException as e: # Covers issues with metadata or audio GET requests
        app.logger.warning(f"Dictionary API request failed for {normalized_word}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            last_origin_http_code = str(e.response.status_code)
    except json.JSONDecodeError as e: # Specific error for parsing metadata
        app.logger.warning(f"Dictionary API JSON decode error for {normalized_word}: {e}. Metadata status: {last_origin_http_code}")
        # last_origin_http_code should reflect the metadata request status that led to unparsable JSON
    except IOError as e: # For file writing issues
        app.logger.error(f"IOError writing Dictionary cache for {normalized_word}: {e}")
        return jsonify({"error": f"Failed to write cache file for Dictionary: {str(e)}"}), 500

    app.logger.warning(f"All online sources failed for {normalized_word}. Last code: {last_origin_http_code}")
    return jsonify({
        "error": f"Failed to cache audio for '{original_word}' from any online source.",
        "origin_http_code": last_origin_http_code if last_origin_http_code else "N/A"
    }), 500

@app.route("/api/audio/<filename>", methods=["GET"])
def get_audio_file(filename):
    # Basic type check
    if not isinstance(filename, str):
        # This case might be hit if routing allows non-string path variable somehow, though unlikely with default converters.
        return jsonify({"error": "Invalid filename format"}), 400

    # Filename pattern validation is the primary structural check.
    # It ensures prefix, allowed characters for word part, and suffix.
    # This implicitly handles many malformed paths including those with '..' or unexpected '/'
    # because those characters are not allowed by [a-zA-Z0-9_]+ for the word part.
    pattern = r"^(google|dictionary)_[a-zA-Z0-9_]+\.mp3$"
    if not re.match(pattern, filename):
        return jsonify({"error": "Invalid filename pattern."}), 400

    # At this point, filename structurally matches our expected safe pattern.
    # os.path.join is safe, and send_from_directory is sandboxed to AUDIO_CACHE_DIR.

    file_path = os.path.join(AUDIO_CACHE_DIR, filename)
    
    if not os.path.exists(file_path):
        # This occurs if a structurally valid filename doesn't point to an actual file.
        return jsonify({"error": "Audio file not found in cache."}), 404
    
    try:
        return send_from_directory(AUDIO_CACHE_DIR, filename, as_attachment=False, mimetype='audio/mpeg')
    except Exception as e: 
        app.logger.error(f"Error sending file {filename}: {e}")
        return jsonify({"error": "Server error while trying to send file."}), 500

if __name__ == '__main__':
    app.run(debug=True)
