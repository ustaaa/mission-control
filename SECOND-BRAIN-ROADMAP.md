# Second Brain — Roadmap & Future Plans

> This document captures the full architectural vision and implementation plan for the Second Brain project. It serves as a handoff guide for any Claude Code session continuing this work.

## Current State (as of 2026-02-14)

### What's Built

| Feature | Status | Key Files |
|---------|--------|-----------|
| Blinko fork + rebranding | Done | `second-brain/` directory |
| Linear dark theme | Done | CSS custom properties, Inter font |
| Hierarchical note folders | Done | `prisma/schema.prisma`, `note.ts`, `NoteFolderTree/index.tsx` |
| `[[Wikilink]]` backlinks | Done | `extractWikilinks()` in `note.ts`, `WikilinkAutocomplete.tsx`, `MarkdownRender` |
| Daily journal | Done | `/journal` page, `JournalCalendar.tsx`, `QuickCapture.tsx` |
| Sidebar reorganization | Done | `baseStore.ts` routerList reordered |
| `Ctrl+Shift+J` journal hotkey | Done | `useJournalHotkey.ts` |
| Backlink panel (in/out tabs) | Done | `BlinkoReference/index.tsx` |

### What's NOT Done Yet (Needs Migration)

**Critical before first run:**
```bash
cd second-brain
npx prisma migrate dev --name add-note-folders
```
This creates the `noteFolder` table and adds `folderId` column to `notes`.

---

## Phase 6: Deployment & Infrastructure

### 6.1 — systemd Service for Second Brain
Create a service alongside the existing Mission Control service.

```ini
# /etc/systemd/system/second-brain.service
[Unit]
Description=Second Brain (Blinko)
After=network.target postgresql.service

[Service]
Type=simple
User=<user>
WorkingDirectory=/path/to/mission-control/second-brain/server
ExecStart=/usr/local/bin/bun --env-file ../.env index.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable second-brain
sudo systemctl start second-brain
# Verify: curl http://localhost:1111
```

### 6.2 — Reverse Proxy (Optional)
If running both MC and Second Brain behind a single domain:

```nginx
# /etc/nginx/sites-available/home-apps
server {
    listen 443 ssl;
    server_name home.example.com;

    location / {
        proxy_pass http://127.0.0.1:18701;  # Mission Control
    }

    location /brain/ {
        rewrite ^/brain/(.*) /$1 break;
        proxy_pass http://127.0.0.1:1111;   # Second Brain
    }
}
```

### 6.3 — Remote Access
Options (pick one):
- **Tailscale:** Mesh VPN, zero config, just install on server + devices
- **Cloudflare Tunnel:** Free, no port forwarding needed, `cloudflared tunnel`
- **WireGuard:** Manual but lightweight

---

## Phase 7: Editor Improvements

### 7.1 — Deep Vditor Wikilink Integration
The current `WikilinkAutocomplete.tsx` uses DOM event listeners. A more robust approach:

1. **Vditor plugin API:** Use `vditor.options.input` callback to detect `[[` sequences
2. **Cursor position tracking:** Use `vditor.getCursorPosition()` for popup placement
3. **Content insertion:** Use `vditor.insertValue('[[Title]]')` for clean insertion
4. **Preview rendering:** Register custom Vditor renderer for `[[...]]` syntax

**Key file:** `second-brain/app/src/components/Common/Editor/hooks/useEditor.ts`
- The Vditor initialization happens in `useEditorInit` hook
- Extend the `options` object passed to `new Vditor()` with custom input handlers

### 7.2 — Backlink Context Snippets
Currently backlink panel shows full note cards. Improve by:
- Extracting the paragraph containing the `[[wikilink]]` reference
- Showing a ~100 character context snippet around each link
- Highlighting the linked text

**Key file:** `second-brain/app/src/components/BlinkoReference/index.tsx`

### 7.3 — Graph View (Knowledge Graph)
Visualize note connections as an interactive graph.

- Use `d3-force` or `react-force-graph` (already lightweight)
- Nodes = notes, Edges = `noteReference` records
- Click node → navigate to note
- Color by folder, size by reference count
- New route: `/graph`

**tRPC procedure needed:** `note.graphData` — returns all notes with their reference edges

---

## Phase 8: Note Folder Enhancements

### 8.1 — Drag-and-Drop in Folder Tree
Allow dragging notes/folders to reorder or reparent:
- Use `react-beautiful-dnd-next` (already in dependencies from resources page)
- Update `sortOrder` and `parentId` on drop
- Animate folder tree transitions with Framer Motion

### 8.2 — Folder Breadcrumbs on Note List
When viewing a folder, show breadcrumb path above notes:
```
All Notes > Projects > Work > [Current Folder]
```
Each segment clickable to navigate up the tree.

**Key file:** `second-brain/app/src/pages/index.tsx` — the main notes list page

### 8.3 — Folder Icons & Colors
Allow users to set custom icons (emoji) and colors per folder:
- Add `icon` and `color` fields to `noteFolder` Prisma model
- Render in the `NoteFolderTree` component
- Color picker popover in folder context menu

---

## Phase 9: Journal Enhancements

### 9.1 — Journal Editor Integration
Currently journal page shows rendered markdown. Enhance to:
- Inline editing with Vditor (same editor as note creation)
- Auto-save on blur / debounced interval
- Support attachments (images, files) via drag-drop

**Key pattern:** See `second-brain/app/src/pages/review.tsx` for inline editor pattern

### 9.2 — Weekly/Monthly Summaries
- Weekly view: aggregate 7 days of journal entries
- Monthly view: calendar heatmap (contribution graph style)
- AI-generated weekly summary (using existing AI integration)

### 9.3 — Quick Capture Modal
Currently `Ctrl+Shift+J` navigates to journal page. Enhance to:
- Open a floating modal overlay (like the Tauri quick note popup)
- Type → Enter → append to today's journal
- Close modal, stay on current page
- Use `DialogStore` for modal management

### 9.4 — Journal Templates
Allow custom daily templates (not just the default):
- Store templates in config (`config` table)
- Template variables: `{{date}}`, `{{dayName}}`, `{{weather}}`, etc.
- Settings page section for template editor

---

## Phase 10: AI Integration

### 10.1 — AI-Powered Daily Review
Leverage Blinko's existing AI stack:
- End-of-day prompt: "Summarize today's quick captures and notes"
- Auto-generate `## End of Day` section
- Suggest connections to existing notes via vector search

### 10.2 — Smart Note Linking
When saving a note, use AI to suggest `[[wikilinks]]`:
- Compute embeddings for new content
- Query pgvector for similar notes
- Suggest top 3-5 related notes as potential links
- Show in a "Suggested links" panel below editor

**Existing infrastructure:** `AiService`, `AiModelFactory.queryVector()` in `server/aiServer/`

### 10.3 — Auto-Tagging Enhancement
Blinko already has auto-tagging. Enhance to:
- Suggest folder placement based on content analysis
- Auto-create tags for recurring topics
- Tag suggestions while typing (in editor toolbar)

---

## Phase 11: Theme & UX Polish

### 11.1 — Home Dashboard
Replace the default Blinko home page with a dashboard showing:
- Today's journal quick capture bar
- Recent notes (last 5, compact cards)
- Upcoming scheduled AI tasks
- Folder tree summary (top-level folders with note counts)
- Quick stats (total notes, this week's entries, etc.)

**Key file:** `second-brain/app/src/pages/index.tsx`

### 11.2 — Keyboard Shortcuts Overlay
Press `?` to show shortcuts overlay:
- `Ctrl+Shift+J` — Journal
- `Ctrl+K` — Global search (already exists in Blinko)
- `Ctrl+N` — New note
- `/` — Focus search
- `Esc` — Close modal/dialog

### 11.3 — Three.js Background Removal
The `GradientBackground.tsx` component uses `@shadergradient/react` + Three.js. Consider:
- Making it opt-in only (currently used on signin/signup/hub pages)
- Removing `@react-three/fiber`, `three`, `@shadergradient/react` from dependencies to reduce bundle size
- Replacing with CSS gradient fallbacks

### 11.4 — Mobile-Responsive Journal
Ensure journal page works well on mobile:
- Calendar collapses to week view
- Quick capture as bottom sheet
- Swipe between days

---

## Phase 12: Data & Sync

### 12.1 — Docker Compose
Single command to run everything:
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: secondbrain
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  second-brain:
    build: ./second-brain
    ports:
      - "1111:1111"
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/secondbrain

  mission-control:
    build: .
    ports:
      - "18701:18701"
    environment:
      MC_USER: ${MC_USER}
      MC_PASS: ${MC_PASS}

volumes:
  pgdata:
```

### 12.2 — Backup Strategy
- Daily PostgreSQL dumps via cron
- Sync `data/tasks.json` to GitHub (already implemented for MC)
- Optional: S3 backup for attachments

### 12.3 — Import Tools
- Import from Obsidian vault (markdown files → notes with folder hierarchy)
- Import from Notion (via Notion API export)
- Blinko already supports import from Memos

---

## Architecture Decisions Record

### Why Blinko Fork (not build from scratch)?
- Blinko provides ~70% of needed functionality out of the box
- PWA, AI integration, file management, auth — all production-ready
- Active open source project (GPL-3.0, 9.3k stars)
- We only needed to add: folders, wikilinks, journal, theme customization

### Why not use Blinko's existing tag system for folders?
- Tags are flat with parent IDs (tree via convention, not enforced)
- Folders need proper path hierarchy, depth tracking, and cascading operations
- Separate `noteFolder` model gives clean CRUD without interfering with tag functionality
- Notes can have both folders (location) and tags (classification) — orthogonal concepts

### Why `#journal/YYYY-MM-DD` tag approach for journal?
- Leverages existing `extractHashtags()` + hierarchical tag tree
- No schema changes needed — journal entries are just notes with a specific tag
- Easy to query by date range via tag lookup
- Journal entries show up in tag-filtered views naturally

### Why `[[Title]]` matched via `content startsWith "# Title"`?
- No separate "title" field in Blinko's note model — content is the whole note
- First line as markdown heading is the de facto title convention
- Simple regex + startsWith query is performant enough
- Can be enhanced later with a dedicated title index

---

## Existing Patterns Reference (for new Claude sessions)

### Adding a new tRPC procedure:
1. Add to `second-brain/server/routerTrpc/note.ts` inside `noteRouter = router({ ... })`
2. Use `authProcedure` for authenticated routes
3. Define input with `z.object({ ... })`
4. Access user ID via `Number(ctx.id)`
5. Use `prisma.modelName.findMany/create/update/delete()`

### Adding a new page:
1. Create `second-brain/app/src/pages/pagename.tsx` (default export, wrapped in `observer()`)
2. Add lazy import in `App.tsx`: `const PageName = lazy(() => import('./pages/pagename'))`
3. Add route: `<Route path="/pagename" element={<ProtectedRoute><PageName /></ProtectedRoute>} />`
4. Add to sidebar in `baseStore.ts` `routerList` array
5. Add title handling in `useInitApp` effect
6. Add i18n key in `app/public/locales/en/translation.json`

### Adding a new component:
1. Create directory: `app/src/components/ComponentName/index.tsx`
2. Wrap with `observer()` for MobX reactivity
3. Use `RootStore.Get(StoreName)` for global state
4. Use `RootStore.Local(() => ({ ... }))` for component-scoped state
5. Use `useTranslation()` for i18n
6. Use HeroUI components for consistent UI

### Modifying the Prisma schema:
1. Edit `second-brain/prisma/schema.prisma`
2. Add Zod schema in `second-brain/shared/lib/prismaZodType.ts`
3. Run `npx prisma migrate dev --name descriptive-name`
4. Prisma client auto-regenerates — types are immediately available
