# Camp Attendance Log — Local version (VS Code)

## Requirements
- Node.js installed on your computer (download the LTS version from nodejs.org if you don't have it)

## How to run
1. Open this folder in VS Code
2. Open a terminal inside VS Code (Terminal → New Terminal, or Ctrl+` / Cmd+`)
3. Run:
   ```
   npm install
   ```
4. Once install finishes, run:
   ```
   npm run dev
   ```
5. You'll get a local link like `http://localhost:5173` — open it in your browser

## About the data
This version uses `localStorage` (storage inside your browser, on your computer only)
instead of the shared storage service used inside Claude. That means:
- Data stays on this one device/browser only
- If you open the site on a different computer or browser, you won't see the same data
- This is meant for local testing. When you're ready to connect a real shared
  database (like Supabase), you only need to replace `src/storage.js` — the rest
  of the app stays the same since it calls the same function names
  (`storage.get`, `storage.set`, ...)

## Demo accounts
- `admin1` / `admin2` / `admin3` — password: `1234`
- `bus1` (bus coach) — password: `1234`
- `coach1`, `coach2` (group coaches) — password: `1234`
