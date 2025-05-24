#!/usr/bin/env python3
import http.server
import socketserver
import os
import socket

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

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
