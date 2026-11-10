# Game Portfolio

A portfolio website styled as a 3D isometric pixel-art game. Navigate a character through a small town using keyboard or mouse controls - enter buildings to explore portfolio sections like About Me, Projects, Experiences, and Skills. Dress your character up in the wardrobe and walk around with up to 9 other visitors. When a town is full, the next visitors get a town of their own.

Built with React 18, react-three-fiber, and styled-components. Deployed on Vercel.

## Tech Stack

- **Framework:** React 18 (Vite, JSX)
- **3D Rendering:** react-three-fiber + drei (Three.js)
- **Styling:** styled-components
- **Content:** MDX pages plus JSON metadata in `web/src/content`
- **Demo films:** HyperFrames click-through videos, see `videos/README.md`
- **Routing:** react-router-dom v7
- **Multiplayer:** Supabase Realtime (presence and broadcast), 10 visitors per town, with more towns opening as each fills
- **Fonts:** Pixelify Sans (game UI), Zen Kaku Gothic New (body text)
- **Deployment:** Vercel with SPA rewrites

## Project Structure

```
scripts/               # Shell utilities (run from repo root)
├── optimise.sh        # Compress GLB models with gltf-transform
├── search.sh          # Grep wrapper for source code
└── dangerous-delete.sh # Delete lines matching a pattern (destructive)
web/
├── public/
│   ├── models/          # GLB 3D models (buildings, character, trees, floor)
│   ├── videos/          # Click-through demo films and posters
│   └── fonts/           # PixelifySans font JSON for three.js Text
├── src/
│   ├── Game/            # 3D game layer (character, buildings, camera, collisions)
│   ├── Pages/           # Content pages (About, Projects, Experiences, Skills)
│   │   ├── catalog.js     # Builds menus and routes from src/content
│   │   ├── DocumentPage.jsx  # The one template for every project and experience
│   │   └── ShowcaseStatic.json  # Dialog scripts
│   ├── content/         # One <slug>.json and <slug>.mdx per project or experience
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

Each project has a shareable direct URL (e.g. `/projects/balatro`) and renders its content from `src/content/`.

## Adding a New Project

Add `<slug>.json` and `<slug>.mdx` to `web/src/content/`. That creates the menu option, the page and the route; copy an existing entry for the JSON shape. To film a demo, see `videos/README.md`.
