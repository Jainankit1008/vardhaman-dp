# Vardhaman Varshitapotsav — DP Generator

Personalised event DP generator for **श्री वर्धमान जैन मंडल, चेन्नई**.  
Users sign in with name + email, upload their photo, crop/adjust it on the event
template, and download a personalised PNG. Every download is tracked in Supabase
(free, persistent PostgreSQL).

---

## Project structure

```
vardhaman-dp/
├── public/
│   ├── index.html      ← Main app (frontend)
│   ├── admin.html      ← Admin dashboard  →  /admin.html
│   └── template.jpg    ← Event template   ← REPLACE THIS to update the template
├── server.js           ← Express + Supabase backend
├── package.json
├── render.yaml         ← Render.com deployment config
└── README.md
```

---

## Step 1 — Create a free Supabase project

1. Go to **https://supabase.com** → Sign up (free)
2. Click **New project** → fill in name, password, region → **Create project**
3. Wait ~1 minute for it to provision
4. Go to **SQL Editor** (left sidebar) and run this once:

```sql
CREATE TABLE IF NOT EXISTS downloads (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  image_hash  TEXT        NOT NULL,
  count       INTEGER     NOT NULL DEFAULT 1,
  first_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT downloads_unique UNIQUE (email, name, image_hash)
);
CREATE INDEX IF NOT EXISTS idx_downloads_email   ON downloads(email);
CREATE INDEX IF NOT EXISTS idx_downloads_last_at ON downloads(last_at DESC);
```

5. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon / public key** → `SUPABASE_KEY`

---

## Step 2 — Run locally

```bash
# Create a .env file
echo "SUPABASE_URL=https://xxxx.supabase.co"  >> .env
echo "SUPABASE_KEY=your_anon_key"             >> .env
echo "ADMIN_TOKEN=localtest"                  >> .env

npm install
npm start
# → http://localhost:3000
```

For auto-restart during development:
```bash
npm run dev
```

---

## Step 3 — Deploy free on Render.com

### 3a. Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/vardhaman-dp.git
git push -u origin main
```

### 3b. Create the Render web service
1. Go to **https://render.com** → Sign up free
2. **New → Web Service** → connect your GitHub repo
3. Render auto-detects settings from `render.yaml`. Confirm:
   - Build command: `npm install`
   - Start command: `npm start`
4. Set environment variables (Dashboard → Environment):

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_KEY` | your Supabase anon key |
| `ADMIN_TOKEN` | a secret password you choose |

5. Click **Deploy** — your app will be live at  
   `https://vardhaman-dp-generator.onrender.com`

> **Free tier note**: Render free services spin down after 15 min of inactivity
> and take ~30 seconds to wake up on the next visit. Upgrade to a paid instance
> ($7/mo) to keep it always-on. The database (Supabase) is always free & always on.

---

## Step 4 — Move to a custom domain later

No code changes needed — the app uses `window.location.origin` for all API calls.

1. Buy a domain (e.g. `vjmdp.com`)
2. In Render → your service → **Settings → Custom Domains → Add**
3. Add a CNAME record at your DNS provider pointing to your Render URL
4. SSL is auto-provisioned

---

## Admin dashboard

Visit **/admin.html** on your deployed URL.  
Enter the `ADMIN_TOKEN` you set to see:
- Total downloads · unique users · unique DPs
- Top users ranked by downloads
- Full download log, searchable by name or email

---

## Tracking logic

Each download creates or updates a record keyed by `(email, name, image_hash)`.

| Scenario | Result |
|---|---|
| Same person, same name, same photo | count += 1 |
| Same person, different name | new row |
| Same person, different photo | new row |

`image_hash` is `filename + filesize` — computed client-side before upload, so
re-uploading the exact same file is detected as the same image.

---

## Updating the template image

Replace `public/template.jpg` and redeploy.  
The photo circle position is one line in `public/index.html`:

```js
const CIRCLE = { fx: 0.485, fy: 0.395, fr: 0.175 };
//                   ^cx        ^cy        ^radius
// All values are fractions of the image dimensions (0.0 – 1.0)
```

Adjust `fx`/`fy` to move the circle, `fr` to resize it.

---

## Environment variables reference

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3000` | No | Server port |
| `SUPABASE_URL` | — | **Yes** | Your Supabase project URL |
| `SUPABASE_KEY` | — | **Yes** | Supabase anon or service_role key |
| `ADMIN_TOKEN` | *(open)* | Recommended | Protects `/api/admin/stats` and `/admin.html` |
