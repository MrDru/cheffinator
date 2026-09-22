# Cheffinator – Claude Instructions

## Project Overview
Cheffinator is a recipe management web app. Users can create, edit, and share recipes with multiple variations and translations. It has a cooking mode (slideshow), a public discover page, a share-by-link feature, and a print/export feature that renders any recipe as a bilingual one-A4-page cookbook page.

**Merge project:** Cheffinator is being merged with the static Recipes site (`C:\work\personal\Recipes`) into one app. Cheffinator is the single recipe app; the Recipes site's bilingual A4 format lives on as the export format (`backend/export-template.js`). The 12 cookbook recipes were imported via `tools/import-cookbook.mjs` (user `mrdru3000`); `tools/export-cookbook.mjs` regenerates a static cookbook site from the DB.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, CSS-in-JS (inline styles) |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon serverless) in production; SQLite (Node's `node:sqlite`) locally via `backend/db.js` when `DATABASE_URL` is unset |
| Image Storage | Supabase Storage (`images` bucket) |
| Hosting | Render.com (backend serves frontend static build) |
| Domain | cheffinator.com (Cloudflare DNS) |

## Project Structure
```
Cheffinator webapp/
├── CLAUDE.md
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Entire frontend — single-file SPA (~4400 lines)
│   │   ├── api.js           # All API calls to backend
│   │   ├── ImageCapture.jsx # Mobile camera / GIF capture component
│   │   └── data/
│   │       └── mockRecipes.js  # Dev-only mock data
│   ├── index.html
│   └── vite.config.js       # Proxies /api → localhost:3001 in dev
├── backend/
│   ├── server.js            # All API routes + DB schema + migrations
│   ├── db.js                # DB connection (pg pool)
│   └── package.json
└── tools/
    └── admin.html           # Standalone admin panel (no build step)
```

## Database Schema
All migrations run automatically on server start via `initializeDatabase()` in `server.js`.

### Tables
- **recipes** — container: `id, name, user_code, share_id, is_published, created_at, updated_at`
- **recipe_variations** — one-to-many with recipes: `id, recipe_id, name, description, servings, tags (JSON), banner_image, sort_order, translation (JSON), created_at, updated_at`
- **ingredients** — `id, recipe_id, variation_id, name, amount, unit, image, sort_order`
- **cooking_steps** — `id, recipe_id, variation_id, step_text, image, sort_order`
- **custom_tags** — `id, name`
- **users** — `id, code` (access codes for alpha)

### Key Data Shape (frontend)
```js
// Variation object (in React state)
{
  id: string,
  name: string,           // e.g. "Original", "Vegan"
  description: string,
  servings: number,
  tags: string[],
  bannerImage: string | null,  // Supabase URL or null
  translation: {               // null if no translation added
    langName: string,          // e.g. "Hebrew"
    name: string,
    description: string,
    ingredients: [{ name: string }],  // parallel to ingredients array
    stages: [{ text: string }]        // parallel to stages array
  } | null,
  ingredients: [{ id, name, amount, unit, image }],
  stages: [{ id, text, image }]
}
```

## Key Files to Know
- **`frontend/src/App.jsx`** — entire frontend in one file. All views (login, home, dashboard, recipe view, edit, cooking mode, public profile) are rendered conditionally based on `currentView` state. ~4400 lines.
- **`backend/server.js`** — all Express routes and the DB init/migration logic. No separate route files.
- **`frontend/src/api.js`** — thin fetch wrappers. No axios.
- **`tools/admin.html`** — standalone HTML file for admin tasks (storage management, recipe transfers, user management). Uses vanilla JS, no build step.

## App Version
- Defined at the top of `App.jsx`: `APP_VERSION` and `APP_DATE`
- **Always bump the version and update the date when pushing to main.**
- Format: `v0.0.X` / `Mon DD, YYYY`

## Git Workflow
- `main` branch → Production (auto-deploys to Render.com)
- **Always ask the user before pushing to `main`.**
- Always bump the version before pushing to main.
- Remote: `https://gitlab.com/MrDru3000/cheffinator.git`

## Development
- Everything at once: `run-dev.bat` (pins backend to :3001, starts both)
- Backend dev: `cd backend && npm run dev` (port 3001, `--watch`, `--experimental-sqlite`)
- Frontend dev: `cd frontend && npm run dev` (port 5173, proxies `/api` to 3001)
- Frontend build: `cd frontend && npm run build` — outputs to `frontend/dist/`
- Local dev is REAL: no mock mode, no auto-login. It runs on SQLite (`backend/cheffinator_local.db`) with zero services; log in with a seeded code (e.g. `mrdru3000`). What the UI saves is actually saved.
- New queries must be portable (Postgres AND SQLite): no `LEFT JOIN LATERAL` (use scalar subqueries), `ANY($1)` is translated to `IN` by the shim, `UPDATE ... RETURNING` is emulated.
- Saves use optimistic concurrency: PUT sends `expectedUpdatedAt`, a stale save gets 409, and the response returns `updatedAt` + `variationIds` which the client syncs.

## Architecture Patterns

### State Management
All state lives in the single `App` component via `useState`. Key state groups:
- **Auth**: `userCode`, `loginInput`, `loginError`
- **View routing**: `currentView` (`'home'|'dashboard'|'view'|'edit'|'cooking'|'profile'`)
- **Recipe form**: `recipeName`, `description`, `servings`, `tags`, `ingredients`, `stages`, `bannerImage`
- **Variations**: `variations[]`, `currentVariationIndex`
- **Translation**: `editTranslation`, `viewTranslation`, `transLangName`, `transName`, `transDescription`, `transIngredients[]`, `transStages[]`

### Auto-save
Recipe edits auto-save 300ms after the last change (debounced). Implemented via `useEffect` watching all form state fields. Change detection uses `JSON.stringify` snapshot comparison stored in `lastSavedDataRef`.

### Images
Images are uploaded to Supabase Storage (`images` bucket). Base64 images captured on mobile are uploaded before saving to avoid large DB payloads. The `processVariationImages()` helper handles this.

### Translations (App UI)
The app UI supports English (`en`) and Hebrew (`he`) via the `TRANSLATIONS` object at the top of `App.jsx`. Language is toggled globally and persisted in `localStorage`. Use `t('key')` helper throughout.

### Per-Recipe Translation
Each variation can have one translation stored in the `translation` JSON column. The `🌐 Language` tab in edit mode lets users fill in translated content. In view mode, `Original | [Language]` toggle buttons appear when a translation exists.

### Supabase Storage Policies
The `images` bucket requires explicit RLS policies for each operation. If storage operations fail, check that the relevant policy exists in Supabase → SQL Editor:
```sql
-- SELECT (listing)
CREATE POLICY "Allow public select images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'images');
-- INSERT (upload)
CREATE POLICY "Allow public insert images" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'images');
-- DELETE
CREATE POLICY "Allow public delete images" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'images');
```

## Important Rules
1. **Ask before pushing to `main`.**
2. **Always bump `APP_VERSION` and `APP_DATE` in `App.jsx` before pushing to main.**
3. Do not create new files unless absolutely necessary — the project intentionally uses a single-file frontend.
4. When adding new DB columns, add a migration block inside `initializeDatabase()` in `server.js` following the existing pattern (check if column exists, then ALTER TABLE).
5. When modifying variation save/load, ensure changes are reflected in: `loadVariationData`, `switchVariation`, `getCurrentVariationData`, `saveRecipe`, and the auto-save snapshot.
