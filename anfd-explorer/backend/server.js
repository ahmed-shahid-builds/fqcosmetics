// ANFD Explorer — backend
// Small, fast Express API serving the machine's part catalogue,
// plus the static frontend. No Python anywhere in this stack.

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, "data", "parts.json");

let partsCache = null;

async function loadParts() {
  if (partsCache) return partsCache;
  const raw = await readFile(DATA_PATH, "utf-8");
  partsCache = JSON.parse(raw);
  return partsCache;
}

app.use(express.json());

// --- API ---------------------------------------------------------------

app.get("/api/parts", async (_req, res, next) => {
  try {
    const parts = await loadParts();
    res.json(parts);
  } catch (err) {
    next(err);
  }
});

app.get("/api/parts/:id", async (req, res, next) => {
  try {
    const parts = await loadParts();
    const part = parts.find((p) => p.id === req.params.id);
    if (!part) return res.status(404).json({ error: "Part not found" });
    res.json(part);
  } catch (err) {
    next(err);
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// --- Static frontend -----------------------------------------------------

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Single-page app: any non-API route falls back to index.html
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// --- Error handling --------------------------------------------------------

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`ANFD Explorer running at http://localhost:${PORT}`);
});
