# CLAUDE.md - Mission Control

## Development Workflow

**Claude Code** → Write code, create features  
**Nomura (OpenClaw agent)** → Reviews, commits, deploys, maintains continuity

### After making changes:
1. Save your files (don't commit directly)
2. Tell Irtek you're done
3. Irtek will ping Nomura to commit & deploy
4. Nomura will update the "Last Deployment" section below

### Before starting work:
- Check "Last Deployment" below for current state
- Check `git log --oneline -5` for recent history
- Review any notes in "Handoff Notes"

---

## Last Deployment

**Commit:** `2bd4da3`  
**Date:** 2026-02-08 14:23 UTC  
**Summary:** Merged Claude Code UI improvements + PWA support  
**Status:** ✅ Live on http://192.168.1.51:18701

### What was deployed:
- Accessibility improvements (aria labels, focus traps, keyboard nav)
- Undo system for delete/archive operations
- Bulk selection mode
- Advanced filtering & sorting
- Processing timeout indicators
- Search highlighting
- PWA support restored

---

## Handoff Notes

_None currently. Nomura will add notes here if there are deployment issues or things to be aware of._

---

## Project Overview

Mission Control is a self-hosted, single-file Kanban task management dashboard. It combines a vanilla JavaScript frontend (`index.html`) with a lightweight Python HTTP server (`server.py`) and optional cloud sync to GitHub and Supabase.

## Architecture

```
index.html          – Complete frontend (HTML + CSS + JS, ~7300 lines, Gruvbox dark theme)
server.py           – Python HTTP server and API proxy (~210 lines, stdlib only)
data/tasks.json     – Primary task datastore (JSON)
data/crons.json     – Scheduled task definitions
data/skills.json    – Available Clawdbot skill list
data/version.json   – App version metadata
transforms/         – Webhook transform modules (Node.js ES modules)
examples/           – Config reference docs and templates
```

### Key Design Decisions
- **No build step.** The frontend is vanilla JS served directly — no bundler, transpiler, or framework.
- **No package manager.** No `package.json`, no `requirements.txt`. Python server uses only stdlib. Node.js transforms use only built-in modules + `fetch()`.
- **Single-file UI.** All frontend code (HTML, CSS, JS) lives in `index.html`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Backend | Python 3 `http.server` (stdlib) |
| Data | Local JSON files (`data/tasks.json`) |
| Auth | HTTP Basic Auth (`MC_USER` / `MC_PASS`) |
| Cloud sync | GitHub API + Supabase PostgREST (both optional) |
| Webhooks | Node.js ES modules (`transforms/`) |
| CI/CD | GitHub Actions → GitHub Pages |
| Theme | Gruvbox dark (CSS custom properties) |

## Running Locally

```bash
export MC_USER=<username>
export MC_PASS=<password>
python3 server.py
# Serves on http://localhost:18701
```

No install step required. The server has zero external dependencies.

## Environment Variables

### Required
| Variable | Purpose |
|----------|---------|
| `MC_USER` | HTTP Basic Auth username |
| `MC_PASS` | HTTP Basic Auth password |

### Optional — GitHub Sync
| Variable | Purpose |
|----------|---------|
| `MC_GITHUB_OWNER` | GitHub username (default: `ustaaa`) |
| `MC_GITHUB_REPO` | Repository name (default: `mission-control`) |
| `GITHUB_TOKEN` | Personal access token with `repo` scope |

### Optional — Supabase Sync
| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role key |
| `SUPABASE_TABLE` | Table name (default: `mission_control`) |
| `SUPABASE_ID` | Row ID (default: `default`) |

See `.env.example` for a template.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/tasks` | Basic | Fetch tasks (prefers Supabase if configured, else local file) |
| `PUT` | `/api/tasks` | Basic | Save tasks → local file, then optionally sync to GitHub + Supabase |
| `OPTIONS` | `/api/tasks` | None | CORS preflight |
| `GET` | `/*` | Basic | Static file serving |

## Data Schema (tasks.json)

```json
{
  "tasks": [{
    "id": "task_<timestamp>",
    "title": "string",
    "description": "markdown string",
    "status": "permanent | backlog | in_progress | review | done",
    "project": "project_id",
    "tags": ["string"],
    "subtasks": [{ "id": "sub_*", "title": "string", "done": false }],
    "priority": "high | medium | low",
    "comments": [{ "author": "string", "text": "string", "timestamp": "ISO8601" }],
    "createdAt": "ISO8601"
  }],
  "projects": [{ "id": "string", "name": "string", "color": "#hex", "icon": "emoji" }],
  "activities": [{ "type": "created | updated", "actor": "string", "task": "string", "time": "ISO8601" }],
  "todos": [{ "id": "todo_*", "title": "string", "done": false, "createdAt": "ISO8601" }],
  "lastUpdated": "ISO8601"
}
```

### Task Status Flow
`permanent` → `backlog` → `in_progress` → `review` → `done`

- `permanent` tasks are recurring/persistent and stay on the board.

## Design Docs (Reference)

- `DESIGN-Intelligent-Flow.md` — Unified WorkItem model, flow states, connections
- `DESIGN-Notes-Digital-Pen.md` — Digital pen/stylus notes feature
- `PWA-GUIDE.md` — Progressive Web App setup guide

## Deployment

**Production:** systemd service on clawd-env (192.168.1.51:18701)

```bash
# Check service status
sudo systemctl status mission-control-kanban

# View logs
journalctl -u mission-control-kanban -f

# Restart after changes
sudo systemctl restart mission-control-kanban
```

GitHub Actions (`.github/workflows/deploy.yml`) also deploys to GitHub Pages on push to `main`.

## Testing

No automated test suite. Testing is manual via the web UI.

## Conventions for AI Assistants

### Files to never modify without explicit request
- `data/tasks.json` — live user data
- `data/crons.json`, `data/skills.json` — runtime config
- `.env` files — secrets

### Security considerations
- Never hardcode secrets or tokens in source files
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only
- Auth fails closed: if `MC_USER`/`MC_PASS` are unset, all requests are rejected
- Webhook HMAC signatures must be validated with timing-safe comparison

### Code style
- **Frontend:** Vanilla JS, camelCase, CSS custom properties (`--var-name`), no external dependencies
- **Backend:** Python 3 stdlib only, class-based handler extending `SimpleHTTPRequestHandler`
- **Transforms:** Node.js ES modules, native `fetch()`, no npm dependencies
- Keep the project dependency-free — do not introduce package managers or build tools

### Working with index.html
The file is ~7,700+ lines containing embedded CSS, HTML, and JS. When editing:
- CSS is at the top inside `<style>` tags
- HTML structure follows in `<body>`
- JS is at the bottom inside `<script>` tags
- Use the Gruvbox color palette defined in `:root` CSS variables

### UI Features & Patterns

#### Accessibility
- All icon buttons have `aria-label` attributes
- Modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and keyboard focus traps
- Toast container has `aria-live="polite"` for screen reader announcements
- `*:focus-visible` outlines are styled globally for keyboard navigation
- Search container uses `role="search"`

#### Keyboard Task Movement
Task cards include a `↔` move button that opens a dropdown with status options. Provides keyboard-accessible alternative to drag-and-drop.

#### Undo System
`showToast(type, message, undoCallback)` accepts an optional third argument. When provided, the toast displays an "Undo" button and stays visible for 6 seconds. Used by delete, archive, and bulk operations.

#### Bulk Operations
- `toggleBulkMode()` enters multi-select mode
- Bulk bar provides move-to-status, archive, and delete actions
- All bulk actions support undo via the toast system

#### Advanced Filtering & Sorting
- Collapsible panel with priority, tag, and sort filters
- Sort options: default, newest, oldest, priority, alphabetical

#### Processing Indicator
- Tasks with `processingStartedAt` show animated border pulse
- Blue for active, red for 30+ min timeout
- Auto-refreshes every 60s to keep elapsed time current
