# Local Development

## Prerequisites

- **Node.js** >= 18 (tested with v24.5)
- **npm** >= 9

## Setup

```bash
cd frontend
npm install
```

## Running the Dev Server

```bash
npm run dev
```

Vite starts at `http://localhost:5173` with hot module replacement. The dev server has `historyApiFallback` enabled so client-side routes work on refresh. It also serves the `api/` functions through `devApi.js`, so `/admin` works locally.

## Environment Variables

Copy `frontend/.env.example` to `frontend/.env` to use `/admin` and tracking locally. The game runs fine without it.

| Variable         | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `ADMIN_PASSWORD` | The password for `/admin`                |
| `DATABASE_URL`   | Neon connection string for the analytics |

Never give these a `VITE_` prefix, because Vite would publish them in the site's public JavaScript.

Vercel doesn't read `.env`, so production and preview have their own copies. Local and preview use the Neon `dev` branch, so testing never touches real visitor data.

**To change the password**, update `.env`, then run this from `frontend/` and redeploy:

```bash
npx vercel env rm ADMIN_PASSWORD production --yes
npx vercel env add ADMIN_PASSWORD production --sensitive
```

## Available Scripts

All commands run from the `frontend/` directory:

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start Vite dev server with HMR           |
| `npm run build`   | Production build to `frontend/dist/`     |
| `npm run preview` | Serve the production build locally       |
| `npm run lint`    | Run ESLint (flat config, React 18 rules) |
| `npm test`        | Run the API unit tests                   |

## Building for Production

```bash
npm run build
```

Output goes to `frontend/dist/`. Preview it locally:

```bash
npm run preview
```

## Deployment

The site is deployed on **Vercel**. The `vercel.json` in `frontend/` configures SPA rewrites so all routes fall back to `index.html`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

When deploying to Vercel, set the **root directory** to `frontend` and the **build command** to `npm run build` with output directory `dist`.

## Shell Scripts

Utility scripts live in the `scripts/` directory. Run them from the **repo root**.

### `scripts/optimise.sh` — Optimize 3D Models

Compresses all GLB models in-place using [gltf-transform](https://gltf-transform.dev/), converting textures to WebP to reduce file size.

**Prerequisite:** Install gltf-transform globally:

```bash
npm install -g @gltf-transform/cli
```

**Usage:**

```bash
./scripts/optimise.sh
```

The script loops through every GLB in `frontend/public/models/` and runs `gltf-transform optimize` with `--texture-compress webp`. Models are overwritten in place — commit or back up before running if you want to keep the originals.

### `scripts/search.sh` — Search Source Code

Grep wrapper that searches `frontend/src/` by default.

```bash
./scripts/search.sh "searchTerm"
./scripts/search.sh "searchTerm" path/to/directory
```

### `scripts/dangerous-delete.sh` — Delete Lines by Pattern

Finds and deletes all lines containing a string across files. **Destructive — use with caution.**

```bash
./scripts/dangerous-delete.sh "stringToDelete"
./scripts/dangerous-delete.sh "stringToDelete" path/to/directory
```

## 3D Assets

GLB models live in `frontend/public/models/`. To optimize new or modified models, run `./scripts/optimise.sh` from the repo root (see above).

## Project Content

Projects and experiences are in `frontend/src/content/`: one `<slug>.json` for the metadata and one `<slug>.mdx` for the page body, rendered with GitHub Flavored Markdown support.
