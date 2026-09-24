# ScamShield AI — Preview Run Doc

Static Node app (zero npm dependencies) + local dev server that also routes `/api/analyze` to the Vercel serverless handler. `npm install` is NOT required — `node_modules` does not exist and the server uses only Node built-ins.

## How to reproduce the artifacts (fresh checkout)

1. **Environment file** — the server reads `.env.local` first, then `.env`, and falls back to the local heuristic threat engine if `GROQ_API_KEY` is missing (app still fully works offline).
   - Copy `.env` from the main checkout (`C:\Users\Amit Jain\Downloads\scamshield\.env`) into this workspace root if it is missing.
   - Reference template: `.env.example` (keys: `GROQ_API_KEY`, `GROQ_MODEL`, `PORT`).
   - Never commit `.env` (it is gitignored) and never record its values here.
2. **Dependencies** — none. Skip install. (There is a `package-lock.json`, but no runtime deps.)

## How to run the server

- **Project default port:** 3000 (`PORT` env var in `.env`, or `process.env.PORT` fallback in `server.js`).
- If 3000 is busy, override it for this preview instance:
  - PowerShell: `$env:PORT='3001'` **before** launching (child process inherits it).
- **Start (Windows, detached):**
  ```powershell
  powershell -NoProfile -Command "$env:PORT='3001'; (Start-Process -FilePath 'node.exe' -ArgumentList 'server.js' -WorkingDirectory '<workspace root>' -RedirectStandardOutput '<log>.out' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
  ```
  - `node server.js` == `npm run dev` / `npm run start` (they just invoke node directly); launching `node.exe` keeps the PID meaningful.
  - stdout and stderr MUST go to different files (PowerShell requirement).
- **Verify:** `Get-Process -Id <pid>` alive, then `curl http://localhost:<port>/` returns 200 HTML.
- **Then register:** `register_preview` with `http://localhost:<port>` and the PID.

## Current preview instance

- Port: **3001** (3000 was occupied by another process at setup time)
- Log: `.freebuff/preview-82229a28.log.out` (stdout) and `.freebuff/preview-82229a28.log.err` (stderr)
- Older instance used `.freebuff/preview-82229a28-d58b-476b-904d-fc5a1983d976.log` (+ `.out` / `.err`) — safe to delete.
- **Note:** launch the detached Start-Process command from bash with SINGLE quotes around the whole `-Command '...'` payload — double quotes let bash expand `$env:PORT` to empty, making the server bind to port 0.

## PWA files (added 2026-09-23)

- `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `sw.js` — installable app + offline shell.
- `server.js` MIME map now includes `.webmanifest` and `.txt`; keep those entries when editing.
- Service worker precaches the static shell; `/api/*` is always network-only. Bump `CACHE` version string in `sw.js` when changing cached files.
