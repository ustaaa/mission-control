# Mission Control Dashboard (Self-hosted)

A single-file Kanban dashboard (`index.html`) served by a tiny Python proxy (`server.py`).

## What’s in here
- `index.html` – UI (Kanban + **Todo** view)
- `server.py` – serves static files + `/api/tasks` read/write
- `data/tasks.json` – persisted data

## Run locally
```bash
export MC_USER=irtek
export MC_PASS='***'
python3 server.py
# open http://localhost:18701
```

## GitHub sync (optional)
If `GITHUB_TOKEN` is set, the server will also push `data/tasks.json` to GitHub.

```bash
export MC_GITHUB_OWNER='YOUR_GH_USER'
export MC_GITHUB_REPO='YOUR_REPO'
export GITHUB_TOKEN='ghp_...'
```

## Supabase sync (optional)
If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the server will also sync the full JSON payload to Supabase.

Expected table schema (Postgres):
```sql
create table if not exists mission_control (
  id text primary key,
  data jsonb not null
);
```

Env:
```bash
export SUPABASE_URL='https://xxxx.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='...'
export SUPABASE_TABLE='mission_control'
export SUPABASE_ID='default'
```

Notes:
- Service role key is **server-only**. Never put it in the browser.
