#!/usr/bin/env python3
"""
Network connectivity checker for the Word Game server
Helps diagnose network access issues
"""

import socket
import subprocess
import platform
import sys

def get_all_ip_addresses():
    """Get all IP addresses of this machine"""
    hostname = socket.gethostname()
    try:
        # Get all IP addresses
        ip_addresses = socket.gethostbyname_ex(hostname)[2]
        # Filter out loopback addresses
        ip_addresses = [ip for ip in ip_addresses if not ip.startswith("127.")]
        return ip_addresses
    except Exception as e:
        print(f"Error getting IP addresses: {e}")
        return []

def check_port_availability(port=8000):
    """Check if the port is available"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', port))
            return True
    except OSError:
        return False

def get_network_info():
    """Get detailed network information"""
    print("🔍 Network Diagnostic Information")
    print("=" * 50)
    
    # Hostname
    hostname = socket.gethostname()
    print(f"🖥️  Hostname: {hostname}")
    
    # Operating System
    os_info = platform.system() + " " + platform.release()
    print(f"💻 OS: {os_info}")
    
    # All IP addresses
    ip_addresses = get_all_ip_addresses()
    print(f"🌐 IP Addresses:")
    for ip in ip_addresses:
        print(f"   • {ip}")
    
    # Port availability
    port_available = check_port_availability(8000)
    print(f"🔌 Port 8000 available: {'✅ Yes' if port_available else '❌ No (already in use)'}")
    
    print("\n📱 Access URLs:")
    print(f"   • Local: http://localhost:8000/")
    for ip in ip_addresses:
        print(f"   • Network: http://{ip}:8000/")
    
    print("\n🛠️ Troubleshooting Tips:")
    print("   1. Make sure the server is running (python3 server.py)")
    print("   2. Check firewall settings on this computer")
    print("   3. Ensure devices are on the same network")
    print("   4. Try accessing from another device's browser")
    
    # Firewall check for macOS
    if platform.system() == "Darwin":
        print("\n🔥 macOS Firewall Check:")
        try:
            result = subprocess.run(['sudo', 'pfctl', '-s', 'rules'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print("   • Firewall rules checked (may require password)")
            else:
                print("   • Could not check firewall (this is usually fine)")
        except:
            print("   • Firewall check skipped")
        
        print("   💡 If blocked, go to System Preferences > Security & Privacy > Firewall")
        print("      and allow Python or disable firewall temporarily for testing")

if __name__ == "__main__":
    get_network_info()
