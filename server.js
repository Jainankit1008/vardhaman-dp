const express = require('express');
<<<<<<< HEAD
const { createClient } = require('@supabase/supabase-js');
=======
const Database = require('better-sqlite3');
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

<<<<<<< HEAD
// ─── Supabase client ──────────────────────────────────────────────────────────
// Set these two env vars in Render (or .env locally):
//   SUPABASE_URL  = https://xxxxxxxxxxxx.supabase.co
//   SUPABASE_KEY  = your anon/service_role key
//
// The required table is created automatically on first run via the
// /api/setup route (call it once after deploying).
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠  SUPABASE_URL or SUPABASE_KEY not set — tracking will be disabled.');
}

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ─── DB helpers ───────────────────────────────────────────────────────────────

// Upsert a download: increment count if (email+name+image_hash) already exists,
// otherwise insert a new row.
async function trackDownload(email, name, imageHash) {
  if (!supabase) return { ok: true, skipped: true };

  // Try to find existing row
  const { data: existing } = await supabase
    .from('downloads')
    .select('id, count')
    .eq('email', email)
    .eq('name', name)
    .eq('image_hash', imageHash)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const { error } = await supabase
      .from('downloads')
      .update({ count: existing.count + 1, last_at: now })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('downloads')
      .insert({ email, name, image_hash: imageHash, count: 1, first_at: now, last_at: now });
    if (error) throw error;
  }

  return { ok: true };
}

async function getStatsByEmail(email) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('downloads')
    .select('email, name, image_hash, count, first_at, last_at')
    .eq('email', email)
    .order('last_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function getAllStats() {
  if (!supabase) return { rows: [], totals: [] };

  const { data: rows, error } = await supabase
    .from('downloads')
    .select('email, name, image_hash, count, first_at, last_at')
    .order('last_at', { ascending: false })
    .limit(500);
  if (error) throw error;

  // Aggregate totals per email in JS (simpler than raw SQL via anon key)
  const map = {};
  for (const r of rows) {
    if (!map[r.email]) map[r.email] = { email: r.email, total_downloads: 0, unique_dps: 0 };
    map[r.email].total_downloads += r.count;
    map[r.email].unique_dps += 1;
  }
  const totals = Object.values(map).sort((a, b) => b.total_downloads - a.total_downloads);

  return { rows, totals };
}

// ─── Multer — store uploads in memory (ephemeral is fine, we only need the
//     image client-side for canvas rendering; the server never stores them long-term)
const upload = multer({
  storage: multer.memoryStorage(),
=======
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
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
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

<<<<<<< HEAD
// ─── Routes ───────────────────────────────────────────────────────────────────

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, supabase: !!supabase });
});

// 2. One-time setup — creates the downloads table in Supabase via RPC.
//    Visit GET /api/setup once after first deploy, then you can ignore it.
//    (Alternatively just run the SQL in the Supabase dashboard — see README)
app.get('/api/setup', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  // We use the REST API to run raw SQL only if you have service_role key.
  // Simpler: just tell the user to run the SQL manually.
  res.json({
    message: 'Run this SQL in your Supabase dashboard → SQL Editor:',
    sql: `
CREATE TABLE IF NOT EXISTS downloads (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT      NOT NULL,
  name        TEXT      NOT NULL,
  image_hash  TEXT      NOT NULL,
  count       INTEGER   NOT NULL DEFAULT 1,
  first_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT downloads_unique UNIQUE (email, name, image_hash)
);
CREATE INDEX IF NOT EXISTS idx_downloads_email ON downloads(email);
CREATE INDEX IF NOT EXISTS idx_downloads_last_at ON downloads(last_at DESC);
    `.trim()
  });
});

// 3. Track a download event
app.post('/api/track', async (req, res) => {
=======
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
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
  const { email, name, imageHash } = req.body;
  if (!email || !name || !imageHash) {
    return res.status(400).json({ error: 'email, name, imageHash required' });
  }
<<<<<<< HEAD
  try {
    const result = await trackDownload(email, name, imageHash);
    res.json(result);
  } catch (e) {
    console.error('track error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// 4. Stats for a specific email (used on the frontend "my downloads" view)
app.get('/api/stats/:email', async (req, res) => {
  try {
    const rows = await getStatsByEmail(decodeURIComponent(req.params.email));
    res.json(rows);
=======
  const now = new Date().toISOString();
  try {
    upsertDownload.run({ email, name, image_hash: imageHash, now });
    res.json({ ok: true });
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

<<<<<<< HEAD
// 5. Admin: all stats
app.get('/api/admin/stats', async (req, res) => {
=======
// 3. Get stats for a specific email
app.get('/api/stats/:email', (req, res) => {
  const rows = getStats.all(req.params.email);
  res.json(rows);
});

// 4. Admin: all stats (protect with env-var token in production)
app.get('/api/admin/stats', (req, res) => {
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
  const token = process.env.ADMIN_TOKEN;
  if (token && req.headers['x-admin-token'] !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
<<<<<<< HEAD
  try {
    const data = await getAllStats();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Catch-all → index.html (SPA)
=======
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
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Vardhaman DP Generator running on http://localhost:${PORT}`);
<<<<<<< HEAD
  console.log(`   Supabase: ${supabase ? '✅ connected' : '⚠  not configured (tracking disabled)'}`);
=======
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
});
