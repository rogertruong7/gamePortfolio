// The fight's biggest files, which make up most of what it downloads. The rest are small images
// and sound effects that come in quickly once these are in the browser's cache. Its page is left
// out, since the frame asks for it with a query string and the browser caches that separately.
const FILES = [
  "/sans-fight/jquery-3.4.1.min.js",
  "/sans-fight/c2runtime.js",
  "/sans-fight/data.js",
  "/sans-fight/media/gameover.ogg",
  "/sans-fight/media/mus_zz_megalovania.ogg",
];
// Gives the town's own late requests a head start before the fight starts downloading too
const START_DELAY_MS = 3000;
const IDLE_TIMEOUT_MS = 5000;

let started = false;

function whenIdle(callback) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
  } else {
    setTimeout(callback, 0);
  }
}

// Fetched one at a time and at low priority, so they never compete with the town for bandwidth.
// fetch is used over <link rel="prefetch"> because Safari ignores prefetch links.
async function download() {
  for (const file of FILES) {
    try {
      const response = await fetch(file, { priority: "low" });
      // The body has to be read for the browser to keep the whole file
      await response.arrayBuffer();
    } catch (error) {
      // Not worth more than a warning: the fight downloads its own files when it opens anyway
      console.warn("Couldn't prefetch the Sans fight", error);
      return;
    }
  }
}

// Downloads the fight in the background after the town has loaded, so the first jump into the
// lake doesn't have to wait for it. Skipped when the visitor has asked to save data.
export function prefetchSansFight() {
  if (started || navigator.connection?.saveData) return;
  started = true;
  setTimeout(() => whenIdle(download), START_DELAY_MS);
}
