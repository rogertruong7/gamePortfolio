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
- **react-markdown** + **remark-gfm** for rendering project descriptions

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

Collision detection: the character is approximated as a `THREE.Sphere` (radius 5) tested against `invisWalls` bounding boxes. On collision, the character slides along the wall surface using the collision normal projected onto the movement plane.

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

AboutMe, Experiences, and Skills pages use `typewriter-effect` to type out text character-by-character. The dialog scripts are defined in `ShowcaseStatic.jsx`.

- **Click/tap** on the text area instantly finishes the current typing animation
- **Click/Space/Enter** after typing completes advances to the next line
- An animated arrow-down gif indicates when text is ready to advance
- Font size is dynamically adjusted based on window width via resize listeners

### Projects Page (`Projects.jsx`)

After the typewriter intro, displays an `OptionSelector` — a paginated 2x2 grid (single column on mobile) of project options. Projects are organized in pages of 4, navigable with arrow keys or click. The project list is defined in `ShowcaseStatic.jsx` as nested arrays (one sub-array per page).

Selecting a project renders the corresponding component from the `pages` object. On narrow screens (< 1700px), the selector hides and only the project detail is shown with a back button.

**Adding a new project requires changes in 4 places:**
1. Create `Pages/ProjectPages/NewProject.jsx`
2. Add to `pages` object in `Projects.jsx` and import it
3. Add to `projects` array in `ShowcaseStatic.jsx`
4. Add a route in `App.jsx`

### Project Page Pattern (`Pages/ProjectPages/`)

Each project page follows the same pattern:
- Fetches markdown from `public/pageMarkdown/<slug>.md` in `useEffect`
- Renders via `MarkdownSection.jsx` (maps markdown elements to styled-components)
- Includes a "View Repo" link and "Open in new tab" button
- Uses shared styled-components from `PageComponents.jsx`

### MarkdownSection (`MarkdownSection.jsx`)

Wraps `react-markdown` with `remark-gfm` and custom component mappings that replace standard HTML elements with styled-components (Title, Subtitle, Paragraph, List, StyledTable, etc.). Shows a spinner while markdown is loading.

### Page Transitions

All content pages render a `<Door>` component — a full-screen black div that animates off-screen to the left over 1 second (`translateX(-100%)`), creating a slide-open transition effect.

## UI Overlay (`src/UserInterface/`)

HTML elements positioned absolutely over the 3D canvas.

| Component | z-index | Purpose |
|-----------|---------|---------|
| LoadingScreen | 100 | Shown while GLB models load. Progress bar segments from drei's `useProgress`. |
| TutorialPopup | 100 | First-visit modal explaining controls. Sets `localStorage.visited = true` on dismiss. Controls are locked until dismissed. |
| HelpPopup | 200 | Re-openable version of the tutorial with additional info. |
| EnterPopup | 102 | Doorway interaction prompt. Shows 1-2 buttons depending on which zones overlap. |
| BackButton | 103 | Returns to game view (scene 0). Only visible on content pages. |
| ResetButton | 103 | Resets character position and returns to game view. |
| HelpButton | 103 | Opens HelpPopup. |
| Menu | 106 | Top-right nav bar (GitHub, LinkedIn, Download CV). Collapses to hamburger menu below 1100px. |

## Routing (`App.jsx`)

Two types of routes:

1. **`/`** — MainPage with the game + all content pages managed by scene state
2. **`/projects/<slug>`** — Direct-access project pages. These render the project component standalone (no game), making project pages shareable as URLs.

Unknown routes redirect to `/` via `Helpers/Redirect.jsx` (uses `<Navigate to="/" />`). Vercel's `vercel.json` rewrites all paths to `index.html` for SPA support.

## Assets

```
public/
  models/          — GLB 3D models (buildings, character, floor, cherry trees)
  pageMarkdown/    — Markdown content files for each project
  fonts/           — PixelifySans JSON font for three.js Text geometry

src/assets/
  roomArt/         — Pixel art cat illustrations (one per section)
  RogerTruongResume.pdf
  arrowdown.gif    — "click to continue" indicator
  TriangleRight.svg
```

## Key Conventions

- **Styling**: styled-components for all component-level CSS. Global styles in `App.css` and `index.css` (minimal — just body/root reset and font-family).
- **Fonts**: Pixelify Sans (game UI, headings) loaded via Google Fonts with preload. Open Sans (markdown body text). Roboto imported via @fontsource for some page sections.
- **State management**: React useState/useEffect only, no external state library. All game state flows through MainPage props.
- **Responsive breakpoints**: 1700px (project detail sidebar), 1108px (page containers), 1100px (hamburger menu), 950px/800px/650px/600px/500px/400px (font size and layout adjustments).
