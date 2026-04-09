# Vardhaman Varshitapotsav — DP Generator

A personalised event DP generator for **श्री वर्धमान जैन मंडल, चेन्नई**.

Users sign in with name + email, upload their photo, crop/adjust it, and download
a personalised DP with the event template. Every download is tracked in SQLite.

---

## Project Structure

```
vardhaman-dp/
├── public/
│   ├── index.html      ← Main app (frontend)
│   ├── admin.html      ← Admin dashboard (/admin.html)
│   └── template.jpg    ← Event template image ← REPLACE THIS TO UPDATE THE TEMPLATE
├── data/               ← SQLite DB lives here (auto-created)
├── uploads/            ← Temp user photo uploads (auto-created)
├── server.js           ← Express backend
├── package.json
├── render.yaml         ← Render.com deployment config
└── README.md
```

---

## Run Locally

```bash
npm install
npm start
# Open http://localhost:3000
```

For development with auto-restart:
```bash
npm run dev
```

---

## Deploy Free on Render.com

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/vardhaman-dp.git
git push -u origin main
```

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
