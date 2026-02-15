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

**Commit:** `78640fd`  
**Date:** 2026-02-09 07:09 UTC  
**Summary:** Linear-inspired dark theme redesign  
**Status:** ✅ Live on http://192.168.1.51:18701

### What was deployed:
- New Linear-style dark theme as default (#0F0F10 background)
- Inter font family with refined typography
- Updated color accents (blue: #5E6AD2, green: #4CB782, etc.)
- Better shadows and border radii
- Improved visual hierarchy

---

## Handoff Notes (Claude Code → Nomura)

### Session: 2026-02-14 (Feature Build)
**Changed:**
- Built complete Second Brain feature set on top of Blinko fork (`second-brain/`)
- **Phase 1** (prior session): Forked Blinko, rebranded to "Second Brain", applied Linear dark theme
- **Phase 2**: Hierarchical note folders — `noteFolder` Prisma model, 6 tRPC CRUD procedures, `NoteFolderTree` sidebar component
- **Phase 3**: `[[Wikilink]]` backlinks — `extractWikilinks()` auto-parses on save, `WikilinkAutocomplete` editor component, clickable links in MarkdownRender, enhanced BlinkoReference with incoming/outgoing tabs
- **Phase 4**: Daily journal — `/journal` page with calendar navigation, `QuickCapture` component, auto-created daily templates, `Ctrl+Shift+J` global hotkey
- **Phase 5**: Sidebar polish — Journal added to nav, analytics/archived hidden from sidebar, i18n keys added

**Files created (new):**
- `second-brain/app/src/components/NoteFolderTree/index.tsx` — folder tree sidebar
- `second-brain/app/src/components/Journal/JournalCalendar.tsx` — month calendar with entry dots
- `second-brain/app/src/components/Journal/QuickCapture.tsx` — timestamped quick capture input
- `second-brain/app/src/components/Common/Editor/WikilinkAutocomplete.tsx` — `[[` autocomplete popup
- `second-brain/app/src/pages/journal.tsx` — journal page
- `second-brain/app/src/hooks/useJournalHotkey.ts` — Ctrl+Shift+J shortcut
- `SECOND-BRAIN-ROADMAP.md` — future plans and architecture decisions

**Files modified:**
- `second-brain/prisma/schema.prisma` — added `noteFolder` model + `folderId` on `notes`
- `second-brain/server/routerTrpc/note.ts` — added folder CRUD, journal, wikilink procedures (~470 new lines)
- `second-brain/shared/lib/prismaZodType.ts` — added `noteFolderSchema` + `folderId` to `notesSchema`
- `second-brain/app/src/App.tsx` — added `/journal` route + journal hotkey
- `second-brain/app/src/store/baseStore.ts` — reordered sidebar, added journal nav item + title
- `second-brain/app/src/components/Layout/Sidebar.tsx` — integrated `NoteFolderTree`
- `second-brain/app/src/components/Common/MarkdownRender/index.tsx` — wikilink rendering
- `second-brain/app/src/components/BlinkoReference/index.tsx` — incoming/outgoing tabs
- `second-brain/app/public/locales/en/translation.json` — new i18n keys

**Watch out for:**
- **Prisma migration required:** Run `npx prisma migrate dev --name add-note-folders` before starting the server. The `noteFolder` model and `notes.folderId` column are new.
- Second Brain runs on **port 1111** (separate from MC on 18701)
- The `extractWikilinks()` in `note.ts` looks up notes by `content startsWith "# Title"` — this means note titles must be the first line as a markdown heading
- Journal entries are tagged with `#journal/YYYY-MM-DD` — the tag hierarchy is auto-created
- `WikilinkAutocomplete` hooks into DOM events on the Vditor editor; may need testing across browsers

**Next up / TODO:**
- Deploy Second Brain as systemd service alongside MC
- Configure Tailscale/Cloudflare Tunnel for remote access
- See `SECOND-BRAIN-ROADMAP.md` for full future plans

**Pending TODO (Low priority — Mission Control Kanban):**
- Task duplication feature
- Keyboard shortcut overlay (? key)
- Export options (JSON, CSV, Markdown)

---

**Template for Claude Code — copy/paste before ending session:**
```
### Session: [DATE]
**Changed:** 
- 

**Watch out for:**
- 

**Next up / TODO:**
- 
```

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

---

## Second Brain (Blinko Fork)

A personal knowledge hub forked from [Blinko](https://github.com/blinkospace/blinko) (GPL-3.0), living in the `second-brain/` directory. Provides notes, document vault, wikilink backlinks, daily journal, and AI-powered search.

### Second Brain Architecture

```
second-brain/
├── app/                    – Vite + React 18 frontend
│   ├── src/components/     – UI components (Editor, Layout, Journal, NoteFolderTree, etc.)
│   ├── src/pages/          – Route pages (index, journal, resources, review, etc.)
│   ├── src/store/          – MobX stores (baseStore, noteStore, etc.)
│   └── src/styles/         – CSS (globals.css, vditor.css)
├── server/                 – Express 5 + tRPC backend
│   ├── routerTrpc/         – tRPC routers (note.ts, attachment.ts, etc.)
│   └── index.ts            – Server entry point
├── prisma/
│   └── schema.prisma       – PostgreSQL schema (notes, noteReference, noteFolder, etc.)
└── .env                    – Database URL, secrets (DO NOT COMMIT)
```

### Second Brain Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript |
| UI Library | HeroUI + Tailwind CSS 4 |
| State | MobX |
| Editor | Vditor (WYSIWYG Markdown) |
| Backend | Express 5 + tRPC |
| Database | PostgreSQL + Prisma |
| AI | Vercel AI SDK + pgvector |
| Desktop | Tauri 2 (Rust) |

### Running Second Brain

```bash
# Ensure PostgreSQL is running and DATABASE_URL is set in second-brain/.env
cd second-brain/server
bun --env-file ../.env --watch index.ts
# Serves on http://localhost:1111
```

### Key Features Added (on top of Blinko)
- **Hierarchical note folders** — `noteFolder` Prisma model with tree UI in sidebar
- **`[[Wikilink]]` syntax** — autocomplete in editor, auto-parsed on save, backlink panel
- **Daily journal** — `/journal` route with calendar, quick capture (`Ctrl+Shift+J`)
- **Linear dark theme** — matching Mission Control's design language

### Second Brain Key Files

| Purpose | Path |
|---------|------|
| Prisma schema | `second-brain/prisma/schema.prisma` |
| Note tRPC router | `second-brain/server/routerTrpc/note.ts` |
| Attachment router (folder pattern) | `second-brain/server/routerTrpc/attachment.ts` |
| tRPC app router (where routers are merged) | `second-brain/server/routerTrpc/_app.ts` |
| Auth middleware | `second-brain/server/middleware/index.ts` |
| Shared Zod types | `second-brain/shared/lib/prismaZodType.ts` |
| Editor component | `second-brain/app/src/components/Common/Editor/index.tsx` |
| Wikilink autocomplete | `second-brain/app/src/components/Common/Editor/WikilinkAutocomplete.tsx` |
| Markdown renderer | `second-brain/app/src/components/Common/MarkdownRender/index.tsx` |
| Note folder tree | `second-brain/app/src/components/NoteFolderTree/index.tsx` |
| Journal calendar | `second-brain/app/src/components/Journal/JournalCalendar.tsx` |
| Quick capture | `second-brain/app/src/components/Journal/QuickCapture.tsx` |
| Backlink panel | `second-brain/app/src/components/BlinkoReference/index.tsx` |
| Journal page | `second-brain/app/src/pages/journal.tsx` |
| App routes | `second-brain/app/src/App.tsx` |
| Sidebar nav & router list | `second-brain/app/src/store/baseStore.ts` |
| i18n (English) | `second-brain/app/public/locales/en/translation.json` |
| Future roadmap | `SECOND-BRAIN-ROADMAP.md` |

### Second Brain Conventions
- **Prisma migrations:** After schema changes, run `npx prisma migrate dev --name <name>`
- **Follow existing patterns:** Folder CRUD mirrors `attachment.ts`, wikilinks mirror `extractHashtags()`
- **i18n:** Add new keys to `app/public/locales/*/translation.json`
- **Never modify** `second-brain/.env` — contains database credentials
- **State management:** MobX with `makeAutoObservable()` — use `RootStore.Get(StoreName)` for global, `RootStore.Local()` for component-scoped
- **Async data:** Use `PromiseState` wrapper from `@/store/standard/PromiseState`
- **API calls:** Use `api.notes.procedureName.mutate()` or `.query()` from `@/lib/trpc`
- **Components:** Always wrap with `observer()` from `mobx-react-lite` for reactivity
- **UI library:** HeroUI (Button, Card, Input, Popover, etc.) + Tailwind CSS 4
- **Animations:** Framer Motion for transitions
- **tRPC procedures:** Define with `authProcedure` for authenticated routes, use `z.object()` for input validation
- **New pages:** Lazy import in `App.tsx`, wrap with `<ProtectedRoute>`, add to `routerList` in `baseStore.ts`

---

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
