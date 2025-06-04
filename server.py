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

@app.route('/<string:page_name>.html')
def serve_html_from_pages(page_name):
    filename = f"{page_name}.html"
    # Basic security: prevent directory traversal by ensuring page_name is simple
    if '/' in page_name or '..' in page_name:
        return "Invalid page name", 400
    try:
        return send_from_directory('html_pages', filename)
    except FileNotFoundError:
        return "Page not found", 404

def normalize_word(word_input):
    if not isinstance(word_input, str):
        return ""
    
    text_to_normalize = word_input.strip()
    
    # Remove trailing period if it exists
    if text_to_normalize.endswith('.'):
        text_to_normalize = text_to_normalize[:-1]
    
    # Replace all non-alphanumeric characters (and not underscore) with underscore
    # This will convert spaces, other punctuation, etc., to underscores.
    # Multiple consecutive symbols will become multiple underscores initially.
    normalized = re.sub(r'[^a-zA-Z0-9_]', '_', text_to_normalize)
    
    # Replace multiple consecutive underscores with a single underscore
    normalized = re.sub(r'_+', '_', normalized)
    
    # Remove leading or trailing underscores that might have resulted from symbols at the start/end
    normalized = normalized.strip('_')
    
    return normalized.lower()

@app.route("/api/audio-cache", methods=["POST"])
def cache_audio():
    data = request.get_json()
    if not data or 'word' not in data:
        return jsonify({"error": "Missing 'word' parameter"}), 400

    original_word = data['word']
    if not isinstance(original_word, str) or not original_word.strip():
        return jsonify({"error": "'word' must be a non-empty string"}), 400

    normalized_word = normalize_word(original_word)
    if not normalized_word:
        return jsonify({"error": "Normalized word is empty"}), 400

    google_filename = f"google_{normalized_word}.mp3"
    google_cache_path = os.path.join(AUDIO_CACHE_DIR, google_filename)

    # Check existing cache (Only for Google TTS files now)
    if os.path.exists(google_cache_path):
        return jsonify({
            "message": f"Audio for '{original_word}' is already cached (Google).",
            "file": google_filename,
            "method_used": "google"
        }), 200
    
    last_origin_http_code = None

    # Attempt Google Translate
    try:
        # Use original_word (the full sentence) for the Google TTS query for better audio quality.
        # Use normalized_word for the filename.
        google_tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(original_word)}&tl=en&client=tw-ob"

        headers = {'Referer': google_tts_url} 
        app.logger.debug(f"Attempting Google TTS for original: '{original_word}' (normalized for filename: '{normalized_word}'): {google_tts_url}")
        response_google = requests.get(google_tts_url, headers=headers, timeout=10)
        last_origin_http_code = str(response_google.status_code)
        response_google.raise_for_status()
        
        with open(google_cache_path, 'wb') as f:
            f.write(response_google.content)
        app.logger.info(f"Cached from Google: {google_filename} for original: '{original_word}'")
        return jsonify({
            "message": f"Audio for '{original_word}' cached successfully from Google.",
            "file": google_filename,
            "method_used": "google"
        }), 201
    except requests.exceptions.RequestException as e:
        app.logger.warning(f"Google TTS failed for '{normalized_word}' (original: '{original_word}'): {e}")
        if hasattr(e, 'response') and e.response is not None:
             last_origin_http_code = str(e.response.status_code)
    except IOError as e:
        app.logger.error(f"IOError writing Google cache for '{normalized_word}': {e}")
    
    app.logger.warning(f"Google TTS failed for '{normalized_word}' (original: '{original_word}'). Last origin HTTP code: {last_origin_http_code}")
    return jsonify({
        "error": f"Failed to cache audio for '{original_word}' from Google TTS.",
        "origin_http_code": last_origin_http_code if last_origin_http_code else "N/A"
    }), 500

@app.route("/audio_cache/<path:filename>", methods=["GET"])
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
    # Make sure to run on 0.0.0.0 to be accessible from the network
    # Use port 8000 as specified in README
    app.run(host='0.0.0.0', port=8000, debug=True)
