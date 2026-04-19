# FlowDesk (Todo / Tasks app)

A modern, Vite + React + TypeScript app for managing workspaces, tasks, and a lightweight “FlowDesk” landing experience. Data/auth are powered by Supabase.

## Live site

- **GitHub Pages**: `https://jingtai05.github.io/todo/`

## Tech stack

- **Frontend**: Vite, React, TypeScript, Tailwind
- **Backend**: Supabase (Auth + Postgres)
- **Charts**: Recharts
- **Routing**: React Router

## Local development

### 1) Install dependencies

In the project folder:

```bash
npm install
```

### 2) Configure Supabase env vars

Create a `.env` file in the project root with:

- **`VITE_SUPABASE_URL`**
- **`VITE_SUPABASE_ANON_KEY`**

This repo currently includes a `.env` file to make GitHub Pages builds work out-of-the-box.

### 2.1) Configure Supabase Auth redirect URLs (required for magic links)

In the Supabase dashboard:

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your primary app URL (recommended):
   - `https://jingtai05.github.io/todo/`
3. Add these to **Redirect URLs** (allow-list):
   - `http://localhost:5173/`
   - `https://jingtai05.github.io/todo/`

If a redirect URL isn’t allow-listed, Supabase may fall back to the Site URL (often `http://localhost:3000/`), which causes the “This site can’t be reached” issue you’re seeing.

### 3) Run locally

```bash
npm run dev
```

Then open the URL shown in your terminal (usually `http://localhost:5173`).

### 4) Build & preview (optional)

```bash
npm run build
```

```bash
npm run preview
```

## Deployment (GitHub Pages)

This repo deploys automatically to **GitHub Pages** on every push to `main` via `.github/workflows/static.yml`.

Notes:

- The Vite `base` is set to `"/todo/"` in `vite.config.ts` to match the Pages project path.
- The workflow builds the app and deploys the `dist/` output.

### How to deploy your own fork to GitHub Pages (beginner friendly)

1. **Fork this repo** on GitHub.
2. In your fork, go to **Settings → Pages**.
3. Under **Build and deployment**, set:
   - **Source**: GitHub Actions
4. Push to your fork’s `main` branch.
5. Wait for the workflow **“Deploy static content to Pages”** to finish in the **Actions** tab.
6. Your site will be available at:
   - `https://<your-username>.github.io/todo/`

## Project scripts

- **`npm run dev`**: start local dev server
- **`npm run build`**: build to `dist/`
- **`npm run preview`**: preview built site
- **`npm run lint`**: run ESLint
