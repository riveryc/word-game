import pytest
import os
import json
from unittest import mock
import requests # Import for requests.exceptions
import urllib.parse # Make sure this is imported
from server import app, AUDIO_CACHE_DIR as SERVER_DEFAULT_AUDIO_CACHE_DIR, normalize_word
import server # To allow monkeypatching server.AUDIO_CACHE_DIR

# Helper for word normalization (mirroring design doc expectation)
def normalize_word(word):
    return word.lower().replace(" ", "_")

@pytest.fixture
def client(tmp_path_factory):
    app.config['TESTING'] = True
    
    # Create a temporary directory for AUDIO_CACHE_DIR for this test session
    # tmp_path_factory is a session-scoped fixture provided by pytest
    # We create a sub-directory that will be used as AUDIO_CACHE_DIR
    temp_audio_cache_dir = tmp_path_factory.mktemp("audio_cache_for_test")

    with app.test_client() as flask_test_client:
        with pytest.MonkeyPatch.context() as mp:
            # Patch the global AUDIO_CACHE_DIR in the server module
            mp.setattr(server, 'AUDIO_CACHE_DIR', str(temp_audio_cache_dir))
            
            # The server module at import time might try to create the default AUDIO_CACHE_DIR.
            # The monkeypatched one (temp_audio_cache_dir) is guaranteed to exist because mktemp creates it.
            # If server.py's os.makedirs(AUDIO_CACHE_DIR) were to run *after* the patch *and* if the dir didn't exist,
            # it would use the patched path. This is fine.
            # We can also mock os.makedirs if we want to prevent it from running for the patched dir,
            # but mktemp already creates it, so os.makedirs(..., exist_ok=True) would be fine.
            # mp.setattr('server.os.makedirs', lambda path, exist_ok=True: None) # Optional: further control
            
            yield flask_test_client
            # Monkeypatch automatically undoes changes to server.AUDIO_CACHE_DIR after the yield

# Test Case 1: New word - Google Success
@mock.patch('server.requests.get')
@mock.patch('server.os.path.exists')
@mock.patch('builtins.open', new_callable=mock.mock_open)
def test_cache_audio_new_word_google_success(mock_open_file, mock_os_exists, mock_requests_get, client):
    word = "testword"
    normalized = normalize_word(word)
    google_filename = f"google_{normalized}.mp3"
    mock_os_exists.return_value = False
    mock_google_response = mock.Mock()
    mock_google_response.status_code = 200
    mock_google_response.content = b'mp3_data_google'
    mock_requests_get.return_value = mock_google_response
    response = client.post('/api/audio-cache', json={'word': word})
    data = json.loads(response.data)
    assert response.status_code in [200, 201]
    assert data['message'] == f"Audio for '{word}' cached successfully from Google."
    assert data['file'] == google_filename
    assert data['method_used'] == 'google'
    expected_google_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(word)}&tl=en&client=tw-ob"
    mock_requests_get.assert_called_once_with(
        expected_google_url,
        headers={'Referer': expected_google_url},
        timeout=10
    )
    mock_open_file.assert_called_once_with(os.path.join(server.AUDIO_CACHE_DIR, google_filename), 'wb')
    mock_open_file().write.assert_called_once_with(b'mp3_data_google')

# Test Case 2: New word - Google Fails
@mock.patch('server.requests.get')
@mock.patch('server.os.path.exists')
@mock.patch('builtins.open', new_callable=mock.mock_open)
def test_cache_audio_google_fails(mock_open_file, mock_os_exists, mock_requests_get, client):
    word = "failword"
    mock_os_exists.return_value = False

    mock_google_failure = mock.Mock()
    mock_google_failure.status_code = 503
    mock_google_failure.raise_for_status.side_effect = requests.exceptions.HTTPError("Mocked Google HTTP Error")
    mock_requests_get.return_value = mock_google_failure

    response = client.post('/api/audio-cache', json={'word': word})
    data = json.loads(response.data)

    assert response.status_code == 500
    assert data['error'] == f"Failed to cache audio for '{word}' from Google TTS."
    assert data['origin_http_code'] == "503"
    
    mock_open_file.assert_not_called()
    expected_google_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(word)}&tl=en&client=tw-ob"
    mock_requests_get.assert_called_once_with(expected_google_url, headers={'Referer': expected_google_url}, timeout=10)

# Test Case 4: Word already cached (Google)
@mock.patch('server.requests.get')
@mock.patch('server.os.path.exists')
def test_cache_audio_already_cached_google(mock_os_exists, mock_requests_get, client):
    word = "cachehit_google"
    normalized = normalize_word(word)
    google_filename = f"google_{normalized}.mp3"
    # Simulate google_word.mp3 exists in the (mocked) temp_cache_dir
    mock_os_exists.side_effect = lambda path: True if os.path.basename(path) == google_filename else False

    response = client.post('/api/audio-cache', json={'word': word})
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data['file'] == google_filename
    assert data['method_used'] == 'google'
    assert "already cached" in data['message']
    mock_requests_get.assert_not_called()

# Test Case 6: Invalid Request (no 'word' provided)
def test_cache_audio_invalid_request_no_word(client):
    response = client.post('/api/audio-cache', json={}) # Missing 'word'
    assert response.status_code == 400 # Expecting Bad Request
    data = json.loads(response.data)
    assert 'error' in data
    # The exact error message might depend on Flask's default or your specific error handling
    # For now, just check that 'error' key exists. This will fail until implemented.
    # A more specific check could be: assert "'word' is a required property" in data['error'] 

# Test Case 7: Word Sanitization/Normalization for Filename (Example with space)
@mock.patch('server.requests.get')
@mock.patch('server.os.path.exists')
@mock.patch('builtins.open', new_callable=mock.mock_open)
def test_cache_audio_word_normalization(mock_open_file, mock_os_exists, mock_requests_get, client):
    word = "Hello World"
    normalized = normalize_word(word) # "hello_world"
    expected_filename = f"google_{normalized}.mp3"

    mock_os_exists.return_value = False
    mock_google_response = mock.Mock()
    mock_google_response.status_code = 200
    mock_google_response.content = b'mp3_data_normalized'
    mock_requests_get.return_value = mock_google_response

    response = client.post('/api/audio-cache', json={'word': word})
    data = json.loads(response.data)

    assert response.status_code in [200, 201]
    assert data['file'] == expected_filename
    assert data['method_used'] == 'google'

    expected_google_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(word)}&tl=en&client=tw-ob"
    mock_requests_get.assert_called_once_with(expected_google_url, headers={'Referer': expected_google_url}, timeout=10)
    mock_open_file.assert_called_once_with(os.path.join(server.AUDIO_CACHE_DIR, expected_filename), 'wb')
    mock_open_file().write.assert_called_once_with(b'mp3_data_normalized')

# Test Case 8: Referer Header for Google (already covered in test_cache_audio_new_word_google_success)
# This is implicitly tested by ensuring the headers argument in mock_requests_get.assert_called_once_with
# is correct in test_cache_audio_new_word_google_success and test_cache_audio_word_normalization.

# Placeholder for initial run - most tests should fail as endpoint is not implemented
# Add a simple failing test to ensure pytest runs
def test_placeholder_to_ensure_server_logic_is_implemented():
    # This test will be removed once the actual endpoint logic is in server.py
    # For now, it acts as a reminder that the tests are expecting server-side code.
    try:
        from server import cache_audio # Try to import the function
        if not callable(cache_audio):
             assert False, "cache_audio function not defined or not callable in server.py"
        # A more robust check would be to see if it's actually implemented, 
        # but the other tests failing will indicate that.
    except ImportError:
        assert False, "server.py or cache_audio function not found"
    # assert False, "Remove this test once server.py cache_audio is implemented and other tests start passing." 


# --- Tests for GET /audio_cache/<filename> (Section 2.2.2) ---

def test_get_audio_success_google_file(client):
    """Test successful retrieval of a Google-cached audio file."""
    filename = "google_testword.mp3"
    file_content = b"google audio data"
    file_path = os.path.join(server.AUDIO_CACHE_DIR, filename)
    with open(file_path, 'wb') as f:
        f.write(file_content)

    response = client.get(f'/audio_cache/{filename}')

    assert response.status_code == 200
    assert response.content_type == 'audio/mpeg'
    assert response.data == file_content
    os.remove(file_path)

def test_get_audio_file_not_found(client):
    """Test response when requested audio file does not exist."""
    filename = "google_nonexistent.mp3"
    response = client.get(f'/audio_cache/{filename}')

    assert response.status_code == 404
    data = json.loads(response.data)
    assert data == {"error": "Audio file not found in cache."}

def test_get_audio_invalid_filename_path_traversal_dots(client):
    """Test path traversal attempt with '..'. Expect a 400 due to pattern mismatch."""
    response = client.get('/audio_cache/../importantservice.txt')
    assert response.status_code == 400 # Pattern validation should reject this
    data = json.loads(response.data)
    assert data == {"error": "Invalid filename pattern."}

def test_get_audio_invalid_filename_path_traversal_slash(client):
    """Test path traversal attempt with slashes. Expect a 400 due to pattern mismatch."""
    response = client.get('/audio_cache//etc/hosts', follow_redirects=True)
    # Werkzeug/Flask will redirect /a//b to /a/b. The filename becomes 'etc/hosts'.
    # Our pattern validation will then reject it.
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data == {"error": "Invalid filename pattern."}

def test_get_audio_invalid_filename_pattern_bad_prefix(client):
    """Test filename with an incorrect prefix (not google_)."""
    response = client.get('/audio_cache/dictionary_test.mp3')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data == {"error": "Invalid filename pattern."}

def test_get_audio_invalid_filename_pattern_bad_suffix(client):
    """Test filename with an incorrect suffix (not .mp3)."""
    response = client.get('/audio_cache/google_test.txt')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data == {"error": "Invalid filename pattern."}

def test_get_audio_invalid_filename_pattern_bad_chars_in_word(client):
    """Test filename with disallowed characters in the word part."""
    response = client.get('/audio_cache/google_test!word$.mp3') # server normalizer allows _, alphanum
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data == {"error": "Invalid filename pattern."}

def test_get_audio_invalid_filename_empty(client):
    """Test with an empty filename string."""
    response = client.get('/audio_cache/') # Werkzeug routing might turn this into a 404 for the endpoint itself
                                        # or if it matches the rule but filename is empty, our check should catch it.
    # Depending on Flask/Werkzeug routing for trailing slashes and how it extracts <filename>
    # this might be a 404 not for the file, but for the route /audio_cache/ not being defined without a filename.
    # If filename can be empty string, our pattern r"^google_[a-zA-Z0-9_]+\.mp3$" will reject it.
    if response.status_code == 404: # Route itself not found if filename is truly empty and not matched
        pass # This is acceptable as Flask/Werkzeug handles it.
    else:
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data == {"error": "Invalid filename pattern."}

def test_get_audio_invalid_filename_just_prefix_suffix(client):
    """Test filename that is just prefix and suffix e.g. google_.mp3"""
    response = client.get('/audio_cache/google_.mp3')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data == {"error": "Invalid filename pattern."} 