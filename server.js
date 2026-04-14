const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cors = require('cors');
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

/**
 * ── DOWNLOAD TRACKING ──────────────────────────────────────────────
 * Every hit creates a NEW row. 
 * The 'count' column in Supabase should be set to 'identity' or 'serial'
 * to auto-increment (1, 2, 3...).
 */
app.post('/api/track', async (req, res) => {
  const { name, imageHash } = req.body; // imageHash is stored in 'picture' column
  
  if (!supabase) return res.json({ ok: true, skipped: true });

  try {
    const { data, error } = await supabase
      .from('downloads')
      .insert([
        { 
          name: name || 'Anonymous', 
          picture: imageHash || 'no-hash'
        }
      ])
      .select('count')
      .single();

    if (error) throw error;

    res.json({ ok: true, downloadNumber: data.count });
  } catch (e) {
    console.error('Tracking error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * ── ADMIN STATS ────────────────────────────────────────────────────
 */
app.get('/api/admin/stats', async (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (token && req.headers['x-admin-token'] !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: rows, error } = await supabase
      .from('downloads')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// IMPORTANT: Export for Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}