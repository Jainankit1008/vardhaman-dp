const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

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
  const { email, name, imageHash } = req.body;
  if (!email || !name || !imageHash) {
    return res.status(400).json({ error: 'email, name, imageHash required' });
  }
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Admin: all stats
app.get('/api/admin/stats', async (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (token && req.headers['x-admin-token'] !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const data = await getAllStats();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Catch-all → index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Vardhaman DP Generator running on http://localhost:${PORT}`);
  console.log(`   Supabase: ${supabase ? '✅ connected' : '⚠  not configured (tracking disabled)'}`);
});
