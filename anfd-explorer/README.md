# ANFD Explorer

An interactive, single-page exploded-view diagram of an Agitated Nutsche
Filter Dryer (ANFD). Click any of the 16 labelled components and it pulls
free of the assembly with a leader line, while a spec panel explains what
it does and how it's built — all on one page, no reloads, no popups.

## Stack

- **Backend:** Node.js + Express (`backend/server.js`). Serves a small
  REST API (`/api/parts`, `/api/parts/:id`) plus the static frontend.
  No Python anywhere in the stack.
- **Frontend:** Plain HTML/CSS/JS (`backend/public/`) — a hand-built SVG
  diagram, no framework or build step required. `app.js` fetches part
  data from the API and drives all the explode/select interactions.
- **Data:** `backend/data/parts.json` — the single source of truth for
  every part's name, function, construction notes, and its "explode
  vector" (how far and in what direction it moves when selected).

## Run it

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:3000**.

For auto-restart on file changes during development:

```bash
npm run dev
```

## Project layout

```
backend/
  server.js          Express app: API routes + static file serving
  package.json
  data/
    parts.json        All 16 parts: name, tagline, function, construction, explode vector
  public/
    index.html         Page shell + the SVG machine diagram (16 <g data-part="..."> groups)
    styles.css          Design system: blueprint/nameplate visual language
    app.js               Click handling, explode animation, leader lines, spec panel, parts list
```

## Editing or extending

- **Add/edit a part's write-up:** edit `backend/data/parts.json`. No
  frontend code changes needed — the page renders whatever the API
  returns.
- **Change how far a part flies out when clicked:** adjust that part's
  `explode.dx` / `explode.dy` in `parts.json` (pixels, in the SVG's own
  640×1000 coordinate space).
- **Add a new part to the drawing:** draw its shapes inside a
  `<g class="part" data-part="your-id" tabindex="0" role="button">` in
  `index.html`, then add a matching entry (same `id`) to `parts.json`.
- **Restyle:** all colors/fonts are CSS custom properties at the top of
  `styles.css` (`--ink`, `--panel`, `--steel`, `--amber`, `--cyan`, …).

## Notes

- The API is intentionally simple (file-backed JSON, in-memory cache) —
  easy to swap for a real database later without touching the frontend,
  since the frontend only ever talks to `/api/parts`.
- Everything happens in place on one page: selecting a part never
  navigates away or opens a new page/tab.
