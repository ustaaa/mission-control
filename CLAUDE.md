# CLAUDE.md - Mission Control

## Project Overview
Mission Control is a Kanban-style task management dashboard. Single-page app with Python backend.

## Architecture
- **Frontend:** `index.html` (vanilla JS, single file)
- **Backend:** `server.py` (Python HTTP server, port 18701)
- **Data:** `data/tasks.json` (local JSON storage)
- **Deployment:** systemd service on clawd-env (192.168.1.51)

## Development Workflow

**You (Claude Code)** → Write code, create features
**Nomura (OpenClaw agent)** → Reviews, commits, deploys, maintains continuity

### After making changes:
1. Save your files
2. Tell Irtek you're done
3. Irtek will ping Nomura to commit & deploy
4. Nomura will update the "Last Deployment" section below

### Before starting work:
- Check "Last Deployment" below for current state
- Check `git log --oneline -5` for recent history
- Review any notes in "Handoff Notes"

---

## Last Deployment

**Commit:** `4158860`
**Date:** 2026-02-08 14:01 UTC
**Summary:** PWA support, design docs, Docker/Olares packaging
**Status:** ✅ Live on http://192.168.1.51:18701

### What was deployed:
- PWA manifest + service worker (offline support)
- DESIGN-Intelligent-Flow.md (unified WorkItem model spec)
- DESIGN-Notes-Digital-Pen.md (stylus input feature spec)
- Docker + Olares packaging files
- Updated index.html with PWA integration

---

## Handoff Notes

_None currently. Nomura will add notes here if there are deployment issues or things to be aware of._

---

## Design Docs (Reference)

- `DESIGN-Intelligent-Flow.md` — Unified WorkItem model, flow states, connections
- `DESIGN-Notes-Digital-Pen.md` — Digital pen/stylus notes feature
- `PWA-GUIDE.md` — Progressive Web App setup guide

## Quick Commands

```bash
# Local dev
python3 server.py

# Check service status
sudo systemctl status mission-control-kanban

# View logs
journalctl -u mission-control-kanban -f
```
