# Architecture

This is a React portfolio website disguised as a 3D isometric game. A player character walks through a pixel-art Japanese town built with Three.js; entering buildings transitions to portfolio content pages (About Me, Projects, Experiences, Skills). Deployed on Vercel.

## Tech Stack

- **React 18** with JSX (no TypeScript)
- **Vite** for dev server and bundling
- **react-three-fiber** + **drei** for the 3D scene
- **Three.js** for 3D primitives, collision, raycasting
- **styled-components** for CSS-in-JS
- **react-router-dom v7** for client-side routing
- **typewriter-effect** for RPG-style dialog text
- **MDX** + **remark-gfm** for project and experience pages

## Application Layers

```
┌─────────────────────────────────────────────────────┐
│  App.jsx (Router)                                   │
│  ├── MainPage (scene 0 = game, 1-4 = content)      │
│  └── /projects/<slug> (direct project page routes)  │
└─────────────────────────────────────────────────────┘
         │
         ├── 3D Game Layer (Game/)
         │     Rendered inside a <Canvas> in MainGame.jsx
         │
         ├── Content Pages (Pages/)
         │     Shown when currentScene != 0
         │
         └── UI Overlay (UserInterface/)
               Floating HTML elements on top of the canvas
```

### MainPage Scene Management

`MainPage.jsx` is the central orchestrator. It holds a `currentScene` integer that controls what the user sees:

| Value | View |
|-------|------|
| 0 | 3D game world (canvas visible) |
| 1 | About Me page |
| 2 | Projects page |
| 3 | Experiences page |
| 4 | Skills page |

When `currentScene !== 0`, the 3D canvas is hidden via `display: none` (not unmounted, so GLB models stay loaded). The content page components render on top. BackButton returns to scene 0.

## 3D Game Layer (`src/Game/`)

All game components live inside a single `<Canvas>` rendered by `MainGame.jsx`.

### Scene Graph

```
<Canvas>
  RendererSettings    — configures clear color, shadows, pixel ratio
  ResizeHandler       — updates renderer size on window resize
  MainCamera          — perspective camera that follows player
  Lights              — two directional lights + ambient light
  Floor               — clickable ground plane (GLB model, raycasted for click-to-move)
  Buildings           — two GLB building models, triggers loading completion
  Details             — animated cherry trees + floor decorations (GLB models)
  Character           — player avatar with WASD/click movement and collision
  Text[]              — 3D billboard labels ("projects", "about me", etc.)
  DarkSpot            — click-to-move target indicator (circle on floor)
  Doorway             — invisible trigger zone detector
</Canvas>
```

### Spatial Constants (`Static.jsx`)

This is the single source of truth for all spatial data:

- **`invisWalls`** — Array of `THREE.Box3` bounding boxes that define collision walls. The character cannot walk through these.
- **`labels`** — Text positions and sizes for the 3D billboard signs above buildings.
- **`showcases`** — Array of `THREE.Box3` trigger zones with a `showcaseName` property. When the character stands inside one, the Doorway component surfaces the enter popup.

### Character Movement (`Character.jsx`)

Two movement systems run simultaneously each frame via `useFrame`:

1. **Keyboard movement** — WASD/arrow keys. Direction is relative to camera orientation. Only active after `localStorage.visited === "true"` (after tutorial dismissal).
2. **Click-to-move** — Floor raycasting sets a target position; character walks toward it each frame.

Collision detection: the character is approximated as a `THREE.Sphere` (radius 5) tested against `invisWalls` and the angled bench boxes. `wallSliding.js` moves it in small steps, and when a step would enter a wall it runs along the wall instead, as long as that doesn't enter any wall, including the same one.

### The Lake (`lake.js`, `pondShape.js`, `pondWater.js`, `pondReflection.js`, `UnderwaterFilter.jsx`)

The pond has no hitbox, so the character walks straight through it.

- **Ground height:** `pondShape.js` builds a height map from the rock mesh once it loads. `followGround` in `lake.js` eases the character towards that height, so it climbs over the rocks and wades a little below the surface in the water. The map also decides what counts as open water.
- **Prompts and sound:** standing in open water shows `LakePrompt`, and walking there swaps the footsteps for the wading loop. The sounds come from `scripts/make-water-sounds.mjs`.
- **State:** `lake.js` holds one state object, read each frame by the character, camera, shadow, water and filter. Its `phase` is `none`, `lookingDown` then `reflecting`, or `hopping` then `sinking` then `surfacing`.
- **Reflection:** `pondReflection.js` draws the scene from a camera mirrored under the water into a texture that the water's shader shows. This second pass only runs while `lake.reflection` is above 0. Trees dissolve out of the main view, because their branches would block the camera, but stay in the reflection. `PlayerShadow` draws on layer 1, which only the main camera sees.
- **Upside-down world:** this is the same town and the same walls with the camera rolled 180 degrees. Keyboard movement and camera dragging are reversed to cancel out the roll, so the controls still match the screen. Click-to-move needs no change. Labels are hidden and `Doorway` stays off, so no building can be entered.
- **Filter:** `UnderwaterFilter.jsx` only mounts during a jump or in the upside-down world. While mounted it takes over rendering, copies the finished frame and draws it back through the wave, tint and flood shader.

### Plantings (`plantings.js`, `fallenLeaves.js`)

The front corner's bushes are extra copies of the bush model in `floorDetails.glb`. The pink shrubs are generated from leaf cards sampled from the cherry tree's mesh, using a copy of its leaf material, so they match the trees. Neither has a hitbox. `fallenLeaves.js` picks where the fallen blossom lands from a fixed seed, keeping it off the pond, rocks, kerb and buildings. `plantings.js` draws all the leaves as one instanced mesh.

### Camera (`MainCamera.jsx`)

Isometric-style perspective camera with:
- Fixed offset from player position (`[140, 90, 140]`), lerped smoothly
- Mouse drag to orbit (rotates the offset vector via quaternion)
- Subtle drift when not dragging (very slow mouse-follow)
- Vertical rotation clamped to prevent flipping; minimum height of 10 units

### Floor Click Detection (`Floor.jsx`)

Uses a short-click threshold (150ms) to distinguish clicks from camera drags. On short click, raycasts from mouse position against the floor mesh and sets the click-to-move target.

### Doorway Triggers (`Doorway.jsx`)

Runs every frame via `useFrame`. Checks if the character position is inside any `showcase` bounding box from `Static.jsx`. When inside a zone, it determines which buttons to show in the enter popup (some zones overlap, allowing two options). When outside all zones, the popup hides.

### Model Loading

GLB models loaded via drei's `useGLTF`. All models are in `public/models/`. When both building models finish loading, `Buildings.jsx` calls `setLoading(false)` to dismiss the loading screen. The loading screen uses drei's `useProgress` hook for a progress bar.

## Content Pages (`src/Pages/`)

All content pages share an RPG dialog box aesthetic: pixel art image on top, white-bordered text box below.

### Dialog System

AboutMe, Experiences, and Skills pages use `typewriter-effect` to type out text character-by-character. The dialog scripts are defined in `ShowcaseStatic.json`.

- **Click/tap** on the text area instantly finishes the current typing animation
- **Click/Space/Enter** after typing completes advances to the next line
- An animated arrow-down gif indicates when text is ready to advance
- Font size is dynamically adjusted based on window width via resize listeners

### Projects and Experiences menus

After the typewriter intro, `Projects.jsx` and `Experiences.jsx` display an `OptionSelector`: a paginated 2x2 grid (single column on mobile) navigable with arrow keys or click. Selecting an option renders its `DocumentPage`. The document slides in from the right (`documentSlide.js`) and slides back out when closed. On wide screens the game panel moves aside to make room. On narrow screens (< 1700px) the document slides over the selector, which hides once it's covered.

### Content catalog (`catalog.js`)

Each project or experience is two files in `src/content/`:

- `<slug>.json`: `kind`, `order`, `title`, menu `option`, `tagline`, `category`, `period`, `role`, `stack`, `links`, and `video: true` when a film exists
- `<slug>.mdx`: the page body, starting at an `##` heading

Adding those two files adds the menu option, the page and the route (`/projects/<slug>` or `/experiences/<slug>`). Nothing else needs changing.

### Document page (`DocumentPage.jsx`, `MdxComponents.jsx`)

One template renders every entry: a sky-coloured header with the title, links and demo film, then the facts column and the MDX body. It uses container queries because it sits beside the menu on wide screens and alone on narrow ones. Colours come from the 3D town; headings use Pixelify Sans and body text uses Zen Kaku Gothic New.

### Demo films

Films live in `public/videos/<slug>.{mp4,jpg}` and are produced by the pipeline in `/videos` (see `videos/README.md`).

### Page Transitions

All content pages render a `<Door>` component — a full-screen black div that animates off-screen to the left over 1 second (`translateX(-100%)`), creating a slide-open transition effect.

## UI Overlay (`src/UserInterface/`)

HTML elements positioned absolutely over the 3D canvas.

| Component | z-index | Purpose |
|-----------|---------|---------|
| LoadingScreen | 100 | Shown while GLB models load. Progress bar segments from drei's `useProgress`. |
| TutorialPopup | top layer | First-visit modal explaining controls, built on `Modal` (a native `<dialog>`) and `ControlsList`. Sets `localStorage.visited = true` on dismiss. Controls are locked until dismissed. |
| HelpPopup | top layer | Re-openable version of the tutorial with additional info, on the same `Modal` and `ControlsList`. |
| EnterPopup | 102 | Doorway interaction prompt. Shows 1-2 buttons depending on which zones overlap. |
| LakePrompt | 102 | Lake prompt, shown in open water. Built on `ChoicePopup`, like EnterPopup. |
| ReflectionDialog | 102 | The typed "Despite everything, it's still you." box. |
| BackButton | 103 | Returns to game view (scene 0). Only visible on content pages. |
| ResetButton | 103 | Resets character position and returns to game view. |
| HelpButton | 103 | Opens HelpPopup. |
| Menu | 106 | Top-right nav bar (GitHub, LinkedIn, Download CV). Collapses to hamburger menu below 1100px. |

## Routing (`App.jsx`)

Four types of routes:

1. **`/`** — MainPage with the game + all content pages managed by scene state
2. **`/projects/<slug>`** and **`/experiences/<slug>`** — Direct-access document pages generated from the catalog. These render standalone (no game), making them shareable as URLs.
3. **`/admin`** — The password-protected analytics page. It is not linked from anywhere and is lazy-loaded, so its code doesn't ship to normal visitors.
4. **`/privacy`** — Explains what the site records.

Unknown routes redirect to `/` via `Helpers/Redirect.jsx` (uses `<Navigate to="/" />`). Vercel's `vercel.json` rewrites all paths except `/api/*` to `index.html` for SPA support.

## Analytics

The site records visits in a Neon Postgres database, and `/admin` displays them.

1. `src/Analytics/tracker.js` starts before React renders. It reads any `?ref=` tag, removes it from the URL, and sends batches of events with `sendBeacon`.
2. `api/game-events.js` validates each batch (`api/_lib/payload.js`) and adds what only the server knows: IP address, Vercel's location headers, the parsed user agent, the traffic source (`api/_lib/classify.js`) and the network owner from ipwho.is (`api/_lib/ipLookup.js`). `api/_lib/limits.js` caps how many new sessions one IP address can start in an hour and how many events one session can store.
3. `src/Admin/` reads the data back through `api/admin/overview.js` and `api/admin/sessions.js`, which both require the login cookie.

To track something new, call `track(type, name)` from `tracker.js` and add the type to `EVENT_TYPES` in `api/_lib/payload.js`. The server drops any type that isn't listed there. Add wording for it in `describeEvent` in `src/Admin/format.js`.

**Login:** `api/admin/login.js` compares the password against `ADMIN_PASSWORD` on the server and sets a signed, HttpOnly cookie that lasts 7 days. Ten wrong attempts from one IP address block it for 15 minutes. If `ADMIN_PASSWORD` is missing, nobody can log in. Logging in also marks that browser so its visits aren't counted.

**Schema:** `db/schema.sql`. Run it against the database by hand when it changes, as nothing applies it automatically.

## Assets

```
public/
  models/          — GLB 3D models (buildings, character, floor, cherry trees)
  videos/          — Click-through demo films and posters
  fonts/           — PixelifySans JSON font for three.js Text geometry

src/assets/
  roomArt/         — Pixel art cat illustrations (one per section)
  RogerTruongResume.pdf
  arrowdown.gif    — "click to continue" indicator
  TriangleRight.svg
```

## Key Conventions

- **Styling**: styled-components for all component-level CSS. Global styles in `App.css` and `index.css` (minimal — just body/root reset and font-family).
- **Fonts**: Pixelify Sans (game UI, headings) loaded via Google Fonts with preload. Zen Kaku Gothic New (document body text) via @fontsource.
- **State management**: React useState/useEffect only, no external state library. All game state flows through MainPage props.
- **Responsive breakpoints**: 1700px (project detail sidebar), 1108px (page containers), 1100px (hamburger menu), 950px/800px/650px/600px/500px/400px (font size and layout adjustments).
