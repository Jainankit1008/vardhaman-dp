# Vardhaman Varshitapotsav — DP Generator

<<<<<<< HEAD
Personalised event DP generator for **श्री वर्धमान जैन मंडल, चेन्नई**.  
Users sign in with name + email, upload their photo, crop/adjust it on the event
template, and download a personalised PNG. Every download is tracked in Supabase
(free, persistent PostgreSQL).

---

## Project structure
=======
A personalised event DP generator for **श्री वर्धमान जैन मंडल, चेन्नई**.

Users sign in with name + email, upload their photo, crop/adjust it, and download
a personalised DP with the event template. Every download is tracked in SQLite.

---

## Project Structure
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089

```
vardhaman-dp/
├── public/
│   ├── index.html      ← Main app (frontend)
<<<<<<< HEAD
│   ├── admin.html      ← Admin dashboard  →  /admin.html
│   └── template.jpg    ← Event template   ← REPLACE THIS to update the template
├── server.js           ← Express + Supabase backend
=======
│   ├── admin.html      ← Admin dashboard (/admin.html)
│   └── template.jpg    ← Event template image ← REPLACE THIS TO UPDATE THE TEMPLATE
├── data/               ← SQLite DB lives here (auto-created)
├── uploads/            ← Temp user photo uploads (auto-created)
├── server.js           ← Express backend
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
├── package.json
├── render.yaml         ← Render.com deployment config
└── README.md
```

---

<<<<<<< HEAD
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
=======
## Run Locally

```bash
npm install
npm start
# Open http://localhost:3000
```

For development with auto-restart:
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
```bash
npm run dev
```

---

<<<<<<< HEAD
## Step 3 — Deploy free on Render.com

### 3a. Push to GitHub
=======
## Deploy Free on Render.com

### Step 1 — Push to GitHub
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
```bash
git init
git add .
git commit -m "initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/vardhaman-dp.git
git push -u origin main
```

<<<<<<< HEAD
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
=======
### Step 2 — Deploy on Render
1. Go to https://render.com → Sign up free
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` — confirm settings:
   - Build: `npm install`
   - Start: `npm start`
   - Environment: Node
5. Add environment variables:
   - `ADMIN_TOKEN` → set a secret password for the admin page
6. Click **Deploy**

Your app will be live at: `https://vardhaman-dp-generator.onrender.com`

> ⚠️ **Free tier note**: Render free tier has an ephemeral filesystem.
> The SQLite data is lost on each deploy/restart.
> To persist data: upgrade to a paid plan, add a **Persistent Disk** (mount at `/data`),
> then set env vars `DATA_DIR=/data` and `UPLOAD_DIR=/data/uploads`.

---

## Move to a Custom Domain Later

1. Buy a domain (e.g. `vjmdp.com`)
2. In Render → your service → **Settings → Custom Domains**
3. Add your domain and follow the DNS instructions (CNAME record)
4. SSL is automatically provisioned

No code changes needed — the app uses `window.location.origin` for all API calls.

---

## Admin Dashboard

Visit `/admin.html` on your deployed URL.

Enter the `ADMIN_TOKEN` you set in env vars to see:
- Total downloads, unique users, unique DPs
- Per-user breakdown
- Full download log with timestamps

---

## Updating the Template

Just replace `public/template.jpg` with your new image.
The circle position is set in `public/index.html`:

```js
const CIRCLE = { fx: 0.485, fy: 0.395, fr: 0.175 };
//                  ^cx       ^cy        ^radius
// All values are fractions of the image dimensions (0.0 – 1.0)
```

Adjust `fx`, `fy`, `fr` to move/resize the photo circle.

---

## Tracking Logic

Each download creates or updates a record keyed by `(email, name, image_hash)`.

- Same person, same name, same photo → **count increments**
- Same person, different name or different photo → **new record**
- This lets you see exactly how many unique DPs were generated per user

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `ADMIN_TOKEN` | *(none)* | Secret for admin dashboard. If not set, admin is open. |
| `DATA_DIR` | `./data` | Where SQLite DB is stored |
| `UPLOAD_DIR` | `./uploads` | Where uploaded photos are saved |
>>>>>>> 6b5c6237b4f9c11545d0ce5d94864605c0e71089
