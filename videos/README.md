# Project demo films

Silent click-through demos for the project pages. A script drives the real app in a browser, then HyperFrames composes the footage with title and end cards, click markers and popups. Finished films go to `frontend/public/videos/<slug>.{mp4,jpg}`.

```bash
npm install
node lib/record.mjs <slug>            # drives projects/<slug>/demo.mjs, writes footage/<slug>/
node lib/compose.mjs <slug> --draft   # quick render, for checking
node lib/compose.mjs <slug>           # final render and compress
```

To show a film on its page, add `"video": true` to `frontend/src/content/<slug>.json`.

## Writing a demo

`projects/<slug>/demo.mjs` exports `{ title, tagline, url, viewport, mobile, setup, before, run }`.

- `setup({ context })` runs once on the Playwright context: mock routes, init scripts.
- `before(d)` runs off camera: log in, warm up pages.
- `run(d)` is the film.

| Call | What it does |
| --- | --- |
| `d.goto(path)` | Loads a page off camera; the film jumps to the loaded page |
| `d.waitFor(selector)` | Waits off camera for something to appear |
| `d.click(selector, { popup, zoom, after })` | Glides the cursor over and clicks; an optional popup shows first |
| `d.clickThrough(selector, readySelector, opts)` | Clicks, then jumps to the moment `readySelector` is visible |
| `d.type(selector, text)` | Clicks a field and types like a person |
| `d.popup(text, { on, zoom, hold })` | Holds the film still with a popup, pointing at `on` if given |
| `d.hover(selector)`, `d.scroll(dy)`, `d.press(key)`, `d.wait(ms)` | What they say |
| `d.cut(async () => ...)` | Anything inside happens off camera |

Keep films to 30 to 75 seconds with 6 to 10 popups. Popup copy says what the person is doing and why it matters, in one plain sentence.

Recording and rendering take turns through `.turn-lock`, because a render running alongside a recording makes the footage stutter.

## One-command films

A project that needs its own app running can have a `projects/<slug>/film.sh`. It works from any directory and does the whole job: copies the app to a throwaway folder, starts its database and mocks, records and composes, then stops everything it started, even on failure. `projects/bigshop/film.sh` is the example; pass `--draft` for a quick render.

## Data rules

Films are public. Run apps from a throwaway copy with made-up data and mocked AI responses; never point one at a production database, a real account or a real API key.
