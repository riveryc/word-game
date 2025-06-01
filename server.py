#!/usr/bin/env python3
import http.server
import socketserver
import os
import socket
import urllib.request
import urllib.parse
import json
from urllib.parse import urlparse, parse_qs

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Handle Google Translate TTS proxy
        if self.path.startswith('/api/google-tts'):
            self.handle_google_tts()
        else:
            # Default file serving
            super().do_GET()

    def handle_google_tts(self):
        """Proxy Google Translate TTS requests with proper referer header"""
        try:
            # Parse the query parameters
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)

            # Get the word from query parameters
            if 'q' not in query_params:
                self.send_error(400, "Missing 'q' parameter")
                return

            word = query_params['q'][0]

            # Build the Google Translate TTS URL
            google_tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(word)}&tl=en&client=tw-ob"

            # Create request with proper referer header
            req = urllib.request.Request(google_tts_url)
            req.add_header('Referer', google_tts_url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')

            # Make the request
            with urllib.request.urlopen(req, timeout=10) as response:
                # Send response headers
                self.send_response(200)
                self.send_header('Content-Type', 'audio/mpeg')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()

                # Stream the audio data
                while True:
                    chunk = response.read(8192)
                    if not chunk:
                        break
                    self.wfile.write(chunk)

        except urllib.error.HTTPError as e:
            print(f"Google TTS HTTP Error: {e.code} - {e.reason}")
            self.send_error(500, f"Google TTS service error: {e.reason}")
        except urllib.error.URLError as e:
            print(f"Google TTS URL Error: {e.reason}")
            self.send_error(500, f"Network error: {e.reason}")
        except Exception as e:
            print(f"Google TTS Error: {str(e)}")
            self.send_error(500, f"Internal server error: {str(e)}")

def get_local_ip():
    """Get the local IP address of this machine"""
    try:
        # Connect to a remote address to determine local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        return local_ip
    except Exception:
        return "Unable to determine"

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    # Get local IP address
    local_ip = get_local_ip()

    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print("🎮 Word Game Server Started!")
        print("=" * 50)
        print(f"📱 Local access:    http://localhost:{PORT}/")
        print(f"🌐 Network access:  http://{local_ip}:{PORT}/")
        print("=" * 50)
        print("📋 Access from other devices on your network:")
        print(f"   • Computers: http://{local_ip}:{PORT}/")
        print(f"   • Phones/Tablets: http://{local_ip}:{PORT}/")
        print("=" * 50)
        print("Press Ctrl+C to stop the server")
        print()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped.")
            httpd.shutdown()
