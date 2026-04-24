# Game Portfolio

A portfolio website styled as a 3D isometric pixel-art game. Navigate a character through a small town using keyboard or mouse controls - enter buildings to explore portfolio sections like About Me, Projects, Experiences, and Skills.

Built with React 18, react-three-fiber, and styled-components. Deployed on Vercel.

## Tech Stack

- **Framework:** React 18 (Vite, JSX)
- **3D Rendering:** react-three-fiber + drei (Three.js)
- **Styling:** styled-components
- **Content:** Markdown files rendered via react-markdown + remark-gfm
- **Routing:** react-router-dom v7
- **Fonts:** Pixelify Sans (game UI), Open Sans (body text)
- **Deployment:** Vercel with SPA rewrites

## Project Structure

```
scripts/               # Shell utilities (run from repo root)
├── optimise.sh        # Compress GLB models with gltf-transform
├── search.sh          # Grep wrapper for source code
└── dangerous-delete.sh # Delete lines matching a pattern (destructive)
frontend/
├── public/
│   ├── models/          # GLB 3D models (buildings, character, trees, floor)
│   ├── pageMarkdown/    # Markdown content for project pages
│   └── fonts/           # PixelifySans font JSON for three.js Text
├── src/
│   ├── Game/            # 3D game layer (character, buildings, camera, collisions)
│   ├── Pages/           # Content pages (About, Projects, Experiences, Skills)
│   │   ├── ProjectPages/  # Individual project page components
│   │   └── ShowcaseStatic.jsx  # Dialog scripts and project list data
│   ├── UserInterface/   # HUD overlays (loading screen, popups, buttons, menu)
│   ├── Helpers/         # Utilities (redirect component)
│   ├── assets/          # Pixel art images for page backgrounds
│   ├── App.jsx          # Route definitions
│   └── MainPage.jsx     # Scene manager (game view ↔ content pages)
└── vercel.json          # Vercel SPA rewrite config
```

## How It Works

The main game view is a Three.js canvas where the player controls a character with WASD/arrow keys or click-to-move. Invisible wall bounding boxes handle collision detection, and doorway trigger zones detect when the character walks into a building entrance.

Entering a building transitions to a content page (scene system managed by `MainPage.jsx`). The 3D canvas is hidden via `display:none` rather than unmounted, preserving state.

Each project has a shareable direct URL (e.g. `/projects/balatro`) and renders its content from a Markdown file in `public/pageMarkdown/`.

## Projects Showcased

Balatro Clone, Bridges, Countries Visited, DateSpot, Discord Bot, Forum Site, Game Portfolio, House Price Predictor, Presto, Quiz Website, RSheet, TikTok Speed Extension, Tributary API

## Adding a New Project

1. Create a Markdown file in `public/pageMarkdown/<slug>.md`
2. Create a page component in `src/Pages/ProjectPages/`
3. Add the project to the `pages` object in `src/Pages/Projects.jsx`
4. Add it to the `projects` array in `src/Pages/ShowcaseStatic.jsx`
5. Add a route in `src/App.jsx`
