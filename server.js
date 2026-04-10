const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Track a download event
app.post('/api/track', async (req, res) => {
  const { email, name, imageHash } = req.body;
  if (!supabase) return res.json({ ok: true, skipped: true });

  try {
    const { data: existing } = await supabase
      .from('downloads')
      .select('id, count')
      .eq('email', email)
      .eq('name', name)
      .eq('image_hash', imageHash)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existing) {
      await supabase
        .from('downloads')
        .update({ count: existing.count + 1, last_at: now })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('downloads')
        .insert({ email, name, image_hash: imageHash, count: 1, first_at: now, last_at: now });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin stats
app.get('/api/admin/stats', async (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (token && req.headers['x-admin-token'] !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { data: rows } = await supabase
      .from('downloads')
      .select('*')
      .order('last_at', { ascending: false });

    const map = {};
    rows.forEach(r => {
      if (!map[r.email]) map[r.email] = { email: r.email, total_downloads: 0, unique_dps: 0 };
      map[r.email].total_downloads += r.count;
      map[r.email].unique_dps += 1;
    });
    
    res.json({ rows, totals: Object.values(map).sort((a,b) => b.total_downloads - a.total_downloads) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
module.exports = app;