# FlowDesk (Todo / Tasks app)

A modern, Vite + React + TypeScript app for managing workspaces, tasks, and a lightweight “FlowDesk” landing experience. Data/auth are powered by Supabase.

## Tech stack

- **Frontend**: Vite, React, TypeScript, Tailwind
- **Backend**: Supabase (Auth + Postgres)
- **Charts**: Recharts
- **Routing**: React Router

## Local development

Install dependencies:

```bash
npm install
```

Set env vars (Supabase):

- **`VITE_SUPABASE_URL`**
- **`VITE_SUPABASE_ANON_KEY`**

This repo currently includes a `.env` file to make GitHub Pages builds work out-of-the-box.

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deployment (GitHub Pages)

This repo deploys automatically to **GitHub Pages** on every push to `main` via `.github/workflows/static.yml`.

Notes:

- The Vite `base` is set to `"/todo/"` in `vite.config.ts` to match the Pages project path.
- The workflow builds the app and deploys the `dist/` output.

## Project scripts

- **`npm run dev`**: start local dev server
- **`npm run build`**: build to `dist/`
- **`npm run preview`**: preview built site
- **`npm run lint`**: run ESLint
