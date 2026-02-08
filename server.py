import http.server
import socketserver
import json
import os
import urllib.request
import base64
from http import HTTPStatus

# Configuration
PORT = int(os.environ.get("PORT", "8080"))

# GitHub sync target (optional)
GITHUB_OWNER = os.environ.get("MC_GITHUB_OWNER", "ustaaa")
GITHUB_REPO = os.environ.get("MC_GITHUB_REPO", "mission-control")
TASKS_FILE = "data/tasks.json"

# Token MUST come from env (do not hardcode secrets in repo/files)
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# Optional Supabase cloud sync (service role key required for server-side writes)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_TABLE = os.environ.get("SUPABASE_TABLE", "mission_control")
SUPABASE_ID = os.environ.get("SUPABASE_ID", "default")

class MissionControlHandler(http.server.SimpleHTTPRequestHandler):
    def _unauthorized(self):
        self.send_response(HTTPStatus.UNAUTHORIZED)
        self.send_header('WWW-Authenticate', 'Basic realm="Mission Control"')
        self.end_headers()
        self.wfile.write(b'Unauthorized')

    def _check_auth(self):
        user = os.environ.get('MC_USER', '')
        pwd = os.environ.get('MC_PASS', '')
        # Fail closed if not configured
        if not user or not pwd:
            return False

        header = self.headers.get('Authorization', '')
        if not header.startswith('Basic '):
            return False

        try:
            decoded = base64.b64decode(header.split(' ', 1)[1]).decode('utf-8')
            u, p = decoded.split(':', 1)
            return u == user and p == pwd
        except Exception:
            return False
    # Disable directory listings for security
    def list_directory(self, path):
        self.send_error(404, "Directory listing is forbidden")
        return None

    def do_GET(self):
        if not self._check_auth():
            return self._unauthorized()

        # Serve tasks data (optionally from Supabase, else local file)
        if self.path == '/api/tasks':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            try:
                # Prefer Supabase if configured
                if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
                    cloud = self.load_from_supabase()
                    if cloud is not None:
                        self.wfile.write(json.dumps(cloud).encode())
                        return

                with open('data/tasks.json', 'r') as f:
                    self.wfile.write(f.read().encode())
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        # Serve static files
        super().do_GET()

    def do_PUT(self):
        if not self._check_auth():
            return self._unauthorized()

        # Save tasks to local file AND push to GitHub
        if self.path == '/api/tasks':
            length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(length)
            
            try:
                # 1. Save locally
                data = json.loads(post_data)
                # If the client sends the whole wrapper with "content", unwrap it. 
                # But our new client code will just send the JSON object.
                
                with open('data/tasks.json', 'w') as f:
                    json.dump(data, f, indent=2)
                
                # 2. Optional GitHub sync (disabled when no token is provided)
                if GITHUB_TOKEN:
                    self.sync_to_github(data)

                # 3. Optional Supabase sync (disabled when not configured)
                if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
                    self.sync_to_supabase(data)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "saved"}).encode())
                
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

    def do_OPTIONS(self):
        # Allow preflight without auth, but don't leak anything.
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def sync_to_github(self, data):
        # Use GitHub API to update file
        url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/contents/{TASKS_FILE}"

        # First get current SHA
        req = urllib.request.Request(url, headers={
            'Authorization': f'token {GITHUB_TOKEN}',
            'Accept': 'application/vnd.github.v3+json'
        })
        try:
            with urllib.request.urlopen(req) as response:
                file_info = json.loads(response.read().decode())
                sha = file_info['sha']
        except Exception:
            sha = None  # File might not exist

        # Prepare update
        content_str = json.dumps(data, indent=2)
        content_b64 = base64.b64encode(content_str.encode()).decode()

        payload = {
            "message": "Update tasks via Mission Control (Proxy)",
            "content": content_b64,
            "branch": "main"
        }
        if sha:
            payload["sha"] = sha

        req_update = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={
                'Authorization': f'token {GITHUB_TOKEN}',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            method='PUT'
        )

        with urllib.request.urlopen(req_update) as response:
            _ = response.read()
            print("Synced to GitHub successfully")

    def load_from_supabase(self):
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{SUPABASE_TABLE}?id=eq.{SUPABASE_ID}&select=data"
        req = urllib.request.Request(url, headers={
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
            'Accept': 'application/json'
        })
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                rows = json.loads(response.read().decode())
                if not rows:
                    return None
                return rows[0].get('data')
        except Exception as e:
            print(f"Supabase load failed: {e}")
            return None

    def sync_to_supabase(self, data):
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{SUPABASE_TABLE}?id=eq.{SUPABASE_ID}"
        payload = {"id": SUPABASE_ID, "data": data}
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=minimal'
            },
            method='PATCH'
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                _ = response.read()
                print("Synced to Supabase successfully")
        except Exception as e:
            print(f"Supabase sync failed: {e}")

print(f"Serving Mission Control on port {PORT}")
http.server.HTTPServer(("", PORT), MissionControlHandler).serve_forever()
