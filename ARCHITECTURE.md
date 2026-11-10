# Architecture

This is a React portfolio website disguised as a 3D isometric game. A player character walks through a pixel-art Japanese town built with Three.js; entering buildings transitions to portfolio content pages (About Me, Projects, Experiences, Skills). Deployed on Vercel.

## Repository Layout

```
gamePortfolio/
  web/            the site: everything Vercel builds and serves (Vercel's Root Directory)
    src/          the React app (see Source Layout below)
    api/          Vercel serverless functions for analytics and /admin
    db/           schema.sql for the analytics database, applied by hand
    public/       models, audio, films, word lists and the Sans fight, served as they are
    tests/        node:test unit tests for the pure logic (run with node --test tests/*.test.js)
  videos/         the pipeline that films the project demos into web/public/videos
  scripts/        one-off tools: model optimising, the water sounds, code search
  ARCHITECTURE.md this file
  DEVELOPMENT.md  running it locally and deploying
```

## Source Layout (`web/src/`)

```
main.jsx, App.jsx    entry point and routes
MainPage.jsx         holds the scene, the room and the game invites, and lays out the HUD
Game/                the 3D town, inside one <Canvas>
  MainGame.jsx       the canvas and everything in it, plus the HUD that belongs to it
  MainCamera.jsx, Doorway.jsx, Static.jsx
  players/           the player's own character, everyone else's, shadows, chat bubbles, emotes
  movement/          walking, wall sliding, pathfinding, jumping, door walks
  benches/           sitting down and sharing a bench
  lake/              the pond: ground height, water, reflection, the jump and the filter
  scenery/           island, buildings, floor, trees, plantings, labels and lights
  look/              character customisation
BenchGames/          two-player games played in a Modal
  BenchGames.jsx     the picker, invite and game screens
  useBenchGame.js    the invite, accept, leave and rematch steps
  protocol.js        the list of games and the checks on every message
  shared/            parts the games share: buttons, seeded random, word lists, canvas helpers
  games/<game>/      one folder per game: its screen and its pure rules module
Multiplayer/         lobbies, presence, positions and chat (Supabase or BroadcastChannel)
UserInterface/       HTML over the canvas: buttons, popups, chat, the player list
Pages/, content/     the portfolio pages and the projects and experiences they're built from
Admin/, Analytics/   the /admin dashboard and the visit tracker
Audio/, Helpers/, assets/
```

Each feature keeps its maths and rules in plain `.js` modules with no React or Three.js, and those are what `web/tests/` covers. The `.jsx` files draw them and handle input.

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

Files below are in `src/Game/` and its sub-folders (`players/`, `movement/`, `benches/`, `lake/`, `scenery/`).

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
- **State:** `lake.js` holds one state object, read each frame by the character, camera, shadow, water and filter. Its `phase` is `none`, `lookingDown` then `reflecting`, or `hopping` then `sinking` then `surfacing`, followed by `fighting` when the jump led into the upside-down world.
- **Reflection:** `pondReflection.js` draws the scene from a camera mirrored under the water into a texture that the water's shader shows. This second pass only runs while `lake.reflection` is above 0. Trees dissolve out of the main view, because their branches would block the camera, but stay in the reflection. `PlayerShadow` draws on layer 1, which only the main camera sees.
- **Upside-down world:** this is the same town and the same walls with the camera rolled 180 degrees. Keyboard movement and camera dragging are reversed to cancel out the roll, so the controls still match the screen. Click-to-move needs no change. Labels are hidden and `Doorway` stays off, so no building can be entered.
- **Filter:** `UnderwaterFilter.jsx` only mounts during a jump or in the upside-down world. While mounted it takes over rendering, copies the finished frame and draws it back through the wave, tint and flood shader.
- **Sans fight:** jumping into the upside-down world mounts `SansFight.jsx`, which loads the game hidden and paused during the dive, then fades it in at the `fighting` phase, which holds the character still. That runs a third-party Construct 2 export from `public/sans-fight` in a same-origin iframe, with `?mode=normal` skipping its menu. Sans explains the controls through an added line in its `sans_intro.csv`, and his text box in `data.js` is narrowed from 256 to 184 so that line wraps inside his speech bubble. The export's ad and analytics calls are stubbed in its `index.html` and used as the signals for the battle starting and ending, which it posts to the site. If it isn't ready when the dive ends, a spinner, the line "Roger is making his way here..." and a loading bar show how much of its first download has arrived. The bar creeps on while the game gets ready after downloading, and fills up once the battle starts. It's only given up on once nothing new has arrived for 45 seconds. However it ends, even when it never loaded, the jump back out to the normal world's pond plays once the fight has faded. Return also leaves the GAME OVER screen. Winning mounts `SuperSaiyan.jsx`, which turns the hair gold and adds a flame around the character until the page reloads. The canvas stops drawing and the site's audio is muted while the fight is up.

### Plantings (`plantings.js`, `fallenLeaves.js`)

The front corner's bushes are extra copies of the bush model in `floorDetails.glb`. The pink shrubs are generated from leaf cards sampled from the cherry tree's mesh, using a copy of its leaf material, so they match the trees. Neither has a hitbox. `fallenLeaves.js` picks where the fallen blossom lands from a fixed seed, keeping it off the pond, rocks, kerb and buildings. `plantings.js` draws all the leaves as one instanced mesh.

### Camera (`MainCamera.jsx`)

Isometric-style perspective camera with:
- Fixed offset from player position (`[140, 90, 140]`), lerped smoothly
- Mouse drag to orbit (rotates the offset vector via quaternion)
- Subtle drift when not dragging (very slow mouse-follow)
- After 8 seconds with no input, it drifts back to the centred angle looking in from the front corner, then sways from side to side around that
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
| SansFight | 149-150 | The Sans fight, faded in over the upside-down world. |
| EmoteButton | 103 | Opens EmoteWheel. Add an emote to `EMOTES` in `Game/emotes.js` with a function that poses its bones, and a figure in `EmoteWheel.jsx`. |
| EmoteWheel | 104 | Full-screen wheel of emotes. The mouse's direction from the middle selects a slot, and a click plays it. |
| BackButton | 103 | Returns to game view (scene 0). Only visible on content pages. |
| ResetButton | 103 | Resets character position and returns to game view. |
| HelpButton | 103 | Opens HelpPopup. |
| WardrobeButton | 103 | The shirt button above the help button. Opens Wardrobe. |
| Wardrobe | top layer | Character customiser on `Modal`, with a live 3D preview (`WardrobePreview.jsx`) and tabs for body, hair, outfit and extras. Saving stores the look in localStorage. |
| BenchGames | 102 / top layer | "Play games" over "Stand up" while sharing a bench, then the game picker, invite and game on `Modal`. |
| PlayerCount | 103 | How many people are in this lobby, and which lobby past the first, in the top left. Clicking it lists who's here, with a Play button by each of the others. Below 820px it moves into the hamburger menu. |
| Menu | 106 | Top-right nav bar (GitHub, LinkedIn, Download CV). Collapses to hamburger menu below 1100px. |

## Character Looks (`src/Game/look/`)

Every character on screen, including the player's own and the wardrobe preview, is its own copy of `cloudme.glb` made by `useCharacterModel`. `dressCharacter` gives each copy its own materials and adds the pieces its look needs.

- **Looks:** `lookOptions.js` lists every choice. A look is a small object of ids and hex colours, and `sanitizeLook` keeps only listed values, so anything from storage or the network is safe to use.
- **Base model:** the spiky hair is shrink-wrapped onto an ellipsoid inside the head as a morph target. Every hairstyle but "spiky" turns the morph on, which leaves a close head of hair to build on.
- **Recolouring:** `lookMaterial.js` keeps the model's texture and repaints parts of it in the shader. The hair is the right half of the texture, the irises are the only blue, and skin is matched by colour. Outfits are painted on the body from where each vertex sits in the rest pose and whether it belongs to an arm or a leg.
- **Pieces:** `pieces.js` builds the extra hair, skirts, hats and so on from simple shapes, attached to the head or hips bone. `PlayerShadow` copies them into the shadow.
- **Shared uniforms:** the look material also carries the left arm's draw-in-front trick for emotes, and `uGold`, which `SuperSaiyan.jsx` turns up after beating Sans.

## Multiplayer (`src/Multiplayer/`)

Up to 12 visitors (`ROOM_SIZE` in `room.js`) share a town and see each other walking around. Anyone past that goes into another copy of the town, called a lobby.

- **Transport:** with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set, each lobby is a Supabase Realtime channel: `town`, then `town-2`, `town-3` and so on. Presence holds each player's look and arrival time, and broadcast messages carry positions. Without them, tabs on the same device find each other through a `BroadcastChannel` instead (`transports.js`).
- **Lobbies:** `room.js` joins `town` first. Everyone present is sorted by when they arrived in that lobby, and the first twelve get a place. Every client works out the same twelve. Anyone else moves on to the next lobby and tries again. The arrival time restarts in each lobby, so nobody already in one loses their place to someone moving in. Players stay in their lobby even if an earlier one frees up, and only after `MAX_LOBBIES` does a visitor wait for a place instead.
- **Jumps:** a hop is over too quickly to send smoothly, so the character sends its height without the hop plus a count of its jumps. Everyone else plays the hop themselves when the count goes up.
- **Benches:** two people can share a bench. Each sitter sends which bench they're on and when they claimed it, and `benchSeats.js` sorts each bench's sitters the same way on every client. Someone on their own sits in the middle. With two, the first scoots to one end and the second takes the other. A bench with two on it doesn't offer "Sit down", and if three claim one at once, the last stands back up. Everyone draws seated players where that rule puts them, rather than where their own tab last reported, so a player whose tab is in the background still scoots over on everyone else's screen.
- **Games:** see Bench Games below. Game messages are a third broadcast event, `game`, addressed to one player.
- **Sending:** `Character.jsx` writes its position, facing, walking, emote, sitting and whether it's off in the upside-down world into a ref each frame. The room sends it every 150ms while it changes, and every 3 seconds otherwise.
- **Drawing:** `RemotePlayers.jsx` draws each other player 220ms in the past, moving between the snapshots either side of that moment. It plays their walk, emotes and sitting pose with the same code as the player's own character.

## Bench Games (`src/BenchGames/`)

Any two people in the same lobby can play a game. It starts from the player list (the Play button by someone's name) or, while two people share a bench, from "Play games" (or G) above "Stand up". One picks a game, the other gets an invite to accept, and it opens for both in a `Modal`.

- **Session:** `useBenchGame.js` runs in `MainPage` and listens the whole time this tab has a place in the lobby, so an invite always gets an answer. One arriving while this player is busy or inside a building is turned down automatically. Going inside ends a game, and so does the other player being missing from the lobby for six seconds. Their moves still count during a shorter blip.
- **Messages:** `protocol.js` checks every message. The first three games have their own message kinds. Every other game sends `play` with a small flat `data` object that `readPlayData` checks for shape and size, and the game's rules module checks the rest.
- **Agreement:** both screens must reach the same result.
  - Turn-based games send each move with a move number, and both apply it with the same rules module.
  - Games where both play at once (Type Race, Word Hunt, Anagrams) time or score each player on their own screen and compare the numbers both have.
  - Aim-and-throw and physics games (Pool, Cup Toss, Mini Golf, Darts, Hoops, Archery) work out each shot on the shooter's screen. They send its inputs, to replay for the animation, and its result, which the other screen takes as final.
  - Shared randomness, like a letter grid or the wind, comes from a seed the inviter sends (`shared/random.js`).
- **Word lists:** Word Hunt and Anagrams load `public/words/` the first time one is played (`shared/dictionary.js`). `valid.txt` is the 3 to 8 letter words from ENABLE, a public domain list. `six.txt` is the everyday six letter words that Anagrams rounds are built on, with offensive ones removed.
- **Adding a game:**
  1. Make `games/<name>/` with a screen taking `host, partnerName, match, again, sendMove, listenMoves, onAgain` and a pure rules module.
  2. Add it to `GAMES` in `protocol.js` and `SCREENS` in `BenchGames.jsx`.
  3. Show `AgainBar` when it's over.
  4. Keep to one message per move: each sender gets 30 messages per 10 seconds.

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
  RogerTruongResume.pdf — at a fixed address, so it keeps its name when downloaded

src/assets/
  roomArt/         — Pixel art cat illustrations (one per section)
  arrowdown.gif    — "click to continue" indicator
  TriangleRight.svg
```

## Key Conventions

- **Styling**: styled-components for all component-level CSS. Global styles in `App.css` and `index.css` (minimal — just body/root reset and font-family).
- **Fonts**: Pixelify Sans (game UI, headings) loaded via Google Fonts with preload. Zen Kaku Gothic New (document body text) via @fontsource.
- **State management**: React useState/useEffect only, no external state library. All game state flows through MainPage props.
- **Responsive breakpoints**: 1700px (project detail sidebar), 1108px (page containers), 1100px (hamburger menu), 950px/800px/650px/600px/500px/400px (font size and layout adjustments).
