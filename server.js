const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Storage paths ────────────────────────────────────────────────────────────
// On free hosts (Render free tier) the filesystem is ephemeral.
// DATA_DIR can be overridden via env var to a persistent disk mount.
const DATA_DIR   = process.env.DATA_DIR   || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

[DATA_DIR, UPLOAD_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─── Database ─────────────────────────────────────────────────────────────────
const db = new Database(path.join(DATA_DIR, 'downloads.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS downloads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    image_hash  TEXT    NOT NULL,
    count       INTEGER NOT NULL DEFAULT 1,
    first_at    TEXT    NOT NULL,
    last_at     TEXT    NOT NULL,
    UNIQUE(email, name, image_hash)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT    PRIMARY KEY,
    email      TEXT    NOT NULL,
    name       TEXT    NOT NULL,
    created_at TEXT    NOT NULL
  );
`);

// Prepared statements
const upsertDownload = db.prepare(`
  INSERT INTO downloads (email, name, image_hash, count, first_at, last_at)
  VALUES (@email, @name, @image_hash, 1, @now, @now)
  ON CONFLICT(email, name, image_hash)
  DO UPDATE SET count = count + 1, last_at = @now
`);

const getStats = db.prepare(`
  SELECT email, name, image_hash, count, first_at, last_at
  FROM downloads
  WHERE email = ?
  ORDER BY last_at DESC
`);

const getAllStats = db.prepare(`
  SELECT email, name, image_hash, count, first_at, last_at
  FROM downloads
  ORDER BY last_at DESC
  LIMIT 500
`);

const getTotals = db.prepare(`
  SELECT email, SUM(count) as total_downloads, COUNT(DISTINCT name||image_hash) as unique_dps
  FROM downloads
  GROUP BY email
  ORDER BY total_downloads DESC
`);

// ─── Multer (file uploads) ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  }
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helper: simple hash of a filename (UUID) as "image identity" ─────────────
// We use the upload filename (UUID) as the image_hash.
// This means: same person uploading the same physical file twice gets a new UUID
// and is treated as a new entry — which is fine, since we can't hash client-side.
// To group by "same image" we rely on frontend sending a stable client-side hash.

// ─── Routes ──────────────────────────────────────────────────────────────────

// 1. Upload photo → returns a temporary file ID
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ fileId: req.file.filename });
});

// 2. Track a download event
app.post('/api/track', (req, res) => {
  const { email, name, imageHash } = req.body;
  if (!email || !name || !imageHash) {
    return res.status(400).json({ error: 'email, name, imageHash required' });
  }
  const now = new Date().toISOString();
  try {
    upsertDownload.run({ email, name, image_hash: imageHash, now });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Get stats for a specific email
app.get('/api/stats/:email', (req, res) => {
  const rows = getStats.all(req.params.email);
  res.json(rows);
});

// 4. Admin: all stats (protect with env-var token in production)
app.get('/api/admin/stats', (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (token && req.headers['x-admin-token'] !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const rows  = getAllStats.all();
  const totals = getTotals.all();
  res.json({ rows, totals });
});

// 5. Serve uploaded files (for canvas use)
app.use('/uploads', express.static(UPLOAD_DIR));

// 6. Serve template
app.get('/template.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'template.jpg'));
});

// 7. Catch-all → index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Vardhaman DP Generator running on http://localhost:${PORT}`);
});
