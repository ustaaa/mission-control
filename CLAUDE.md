# CLAUDE.md - Mission Control

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

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) deploys the entire repo to GitHub Pages on push to `main`. No build step is involved — it uploads the working directory as-is.

## Testing

There is no automated test suite. No test framework is configured. Testing is manual via the web UI.

## Linting & Formatting

No linting or formatting tools are configured (no ESLint, Prettier, Flake8, etc.).

## Webhook Transforms

`transforms/github-mission-control.mjs` processes GitHub push webhooks:
1. Validates HMAC signature
2. Diffs `tasks.json` before/after the push
3. Detects tasks moved to `in_progress`
4. Triggers Clawdbot agent via gateway with work instructions
5. Sends Slack notifications (optional)

Config is loaded from `~/.clawdbot/mission-control.json`.

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
The file is ~7,700 lines containing embedded CSS, HTML, and JS. When editing:
- CSS is at the top inside `<style>` tags
- HTML structure follows in `<body>`
- JS is at the bottom inside `<script>` tags
- Use the Gruvbox color palette defined in `:root` CSS variables

### UI Features & Patterns

#### Accessibility
- All icon buttons have `aria-label` attributes
- Modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and keyboard focus traps (`trapFocus`/`releaseFocus` helpers)
- Toast container has `aria-live="polite"` for screen reader announcements
- `*:focus-visible` outlines are styled globally for keyboard navigation
- Search container uses `role="search"`

#### Keyboard Task Movement
Task cards include a `↔` move button (`.task-move-btn`) that opens a dropdown (`toggleMoveDropdown`) with status options. This provides a keyboard-accessible alternative to drag-and-drop. The dropdown uses `role="menu"` with `role="menuitem"` buttons.

#### Undo System
`showToast(type, message, undoCallback)` accepts an optional third argument. When provided, the toast displays an "Undo" button and stays visible for 6 seconds (vs 3 seconds default). Used by `deleteTask`, `archiveTask`, and `archiveAllDone`.

#### Bulk Operations
- `toggleBulkMode()` enters multi-select mode (adds `.bulk-mode` to body)
- Task cards render checkboxes; clicking toggles selection via `toggleBulkSelect()`
- Bulk bar (`#bulk-bar`) provides move-to-status, archive, and delete actions
- All bulk actions support undo via the toast system
- Triggered via "Select" button in the filters bar

#### Advanced Filtering & Sorting
- Collapsible panel (`#advanced-filters`) toggled via "Filters" button in filter bar
- Filters: priority (`advancedPriority`), tag (`advancedTag`), sort order (`advancedSort`)
- Tag dropdown auto-populated from task data via `populateTagFilter()`
- Sort options: default, newest, oldest, priority, alphabetical
- Applied in `renderTasks()` after project filter

#### Delete Confirmations & Undo
- `deleteSubtask()` and `deleteComment()` both require `confirm()` before proceeding
- Both support undo via `showToast()` with undo callback — deleted items are restored in place

#### Activity Pagination
- `renderActivity()` shows `ACTIVITY_PAGE_SIZE` (15) items initially
- "Load more" button appends the next page via `loadMoreActivity()`
- Counter shows remaining items

#### Search Highlighting
- `highlightText(text, query)` wraps matches in `<mark>` tags
- `applySearchFilter()` highlights matched text in task titles and descriptions
- `<mark>` styled with Gruvbox yellow background (`rgba(215, 153, 33, 0.35)`)

#### Processing Indicator
- Tasks with `processingStartedAt` show animated border pulse (blue for active, red for 30+ min timeout)
- `startProcessingRefresh()` auto-refreshes every 60s to keep elapsed time current
- Timeout tasks (30+ min) show a "Cancel" button (`cancelProcessing()`) that clears processing state

---

## Coordination: Claude + Nomura

**Workflow:**
- **Claude** (Claude Code) makes changes, updates "Handoff Notes" below before ending a session
- **Nomura** (OpenClaw) reads handoff notes, commits, deploys, and updates "Last Deployment" below
- **Claude** checks "Last Deployment" at the start of each session to see what's live

### Last Deployment
_No deployment yet — Nomura will update this section after first deploy._

### Handoff Notes
**Session: 2026-02-08**

**What changed:**
- Created CLAUDE.md from scratch
- **Critical UI:** ARIA labels on all interactive elements, modal accessibility (role=dialog, focus trap), keyboard task movement (↔ move dropdown), focus-visible styles
- **High UI:** Undo system (toast with undo callback on delete/archive), modal overflow fix on mobile, bulk operations (multi-select + bulk move/archive/delete), advanced filtering & sorting (priority, tag, sort)
- **Medium UI:** Subtask/comment delete confirmations with undo, activity feed pagination (15/page), search result highlighting (`<mark>` tags), processing indicator auto-refresh + cancel button

**Issues / watch out for:**
- The `column-add` elements were changed from `<span>` to `<button>` for accessibility — verify no CSS regressions on column headers
- Bulk mode changes the task card `onclick` handler dynamically — test that clicking tasks still opens the detail modal in normal mode
- Search highlighting uses `innerHTML` replacement on `.task-title-text` and `.task-description` — if task titles contain HTML entities they may render unexpectedly

**What's next / TODO (Low priority items, pending user review):**
- Theme toggle (light/dark mode switch)
- Task duplication feature
- Keyboard shortcut overlay (? key)
- Export options (JSON, CSV, Markdown)
