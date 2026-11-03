// Runs Shipdeck's real renderer in a browser. The Electron preload API is replaced by the fixtures
// below, so nothing scans a real disk, arms a real launchd timer or calls the Claude CLI.
// Every repo, branch, person and file here is made up.
function installFixtures() {
  const now = Date.now();
  const iso = (minsAgo) => new Date(now - minsAgo * 60000).toISOString();
  const home = "/Users/demo/coding";

  const worktree = (repo, dir, branch, files, opts = {}) => ({
    repoRoot: `${home}/${repo}`,
    repo,
    path: `${home}/${dir}`,
    branch,
    isPrimary: dir === repo,
    ahead: opts.commits?.length ?? 0,
    behind: opts.behind ?? 0,
    files,
    commitsAhead: opts.commits ?? [],
    lastActivity: iso(opts.mins ?? 30),
    defaultBranch: "main",
  });
  const file = (path, insertions, deletions, untracked = false) => ({ path, insertions, deletions, binary: false, untracked });

  const worktrees = [
    worktree("atlas-api", "atlas-api-saved-searches", "demo/eng-412-saved-searches",
      [file("src/routes/searches.ts", 42, 6), file("src/db/searches.sql", 18, 0, true), file("src/routes/searches.test.ts", 31, 2)],
      { commits: [{ hash: "a41c9e2", subject: "Add saved search table" }, { hash: "7be03d1", subject: "List saved searches per user" }], mins: 6 }),
    worktree("atlas-web", "atlas-web-saved-searches", "demo/eng-412-saved-searches",
      [file("src/pages/SearchBar.tsx", 27, 9), file("src/hooks/useSavedSearches.ts", 24, 0, true)], { mins: 9 }),
    worktree("atlas-api", "atlas-api-search-metrics", "demo/eng-412-search-metrics", [file("src/metrics/search.ts", 14, 3)], { mins: 44 }),
    worktree("harbor-cli", "harbor-cli-retries", "demo/eng-431-webhook-retries",
      [file("internal/webhook/retry.go", 38, 11), file("internal/webhook/retry_test.go", 52, 0)], { mins: 75 }),
    worktree("lantern-docs", "lantern-docs-onboarding", "demo/rewrite-onboarding-guide", [file("docs/getting-started.md", 64, 40)], { mins: 180 }),
    worktree("atlas-api", "atlas-api", "main", [], { mins: 1400 }),
    worktree("atlas-web", "atlas-web", "main", [], { mins: 1500 }),
    worktree("harbor-cli", "harbor-cli", "main", [], { mins: 2900 }),
    worktree("lantern-docs", "lantern-docs", "main", [], { mins: 5000 }),
    worktree("atlas-web", "atlas-web-dark-mode", "demo/eng-398-dark-mode", [], { mins: 9000, commits: [{ hash: "c11d0a7", subject: "Add colour tokens" }] }),
  ];

  // The scanner's own shape; App.tsx regroups these with the real grouping code.
  const groups = worktrees.map((w) => ({ key: w.path, worktrees: [w], dirty: w.files.length > 0, lastActivity: w.lastActivity }));

  const DIFF = `diff --git a/src/routes/searches.ts b/src/routes/searches.ts
index 4f2a1c9..be07d3e 100644
--- a/src/routes/searches.ts
+++ b/src/routes/searches.ts
@@ -12,14 +12,50 @@ import { requireUser } from "../auth";
 const router = Router();

-router.get("/searches", requireUser, async (req, res) => {
-  const rows = await db.query("select * from searches");
-  res.json(rows);
-});
+const SavedSearch = z.object({
+  name: z.string().min(1).max(80),
+  query: z.string().min(1),
+  notify: z.boolean().default(false),
+});
+
+// Only ever return the signed-in user's searches.
+router.get("/searches", requireUser, async (req, res) => {
+  const rows = await db.query(
+    "select id, name, query, notify from searches where user_id = $1 order by created_at desc",
+    [req.user.id],
+  );
+  res.json({ searches: rows });
+});
+
+router.post("/searches", requireUser, async (req, res) => {
+  const body = SavedSearch.safeParse(req.body);
+  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
+
+  const [row] = await db.query(
+    "insert into searches (user_id, name, query, notify) values ($1, $2, $3, $4) returning id",
+    [req.user.id, body.data.name, body.data.query, body.data.notify],
+  );
+  res.status(201).json({ id: row.id });
+});

 export default router;`;

  const runs = [
    { scheduleId: "r3", worktreePath: `${home}/harbor-cli-retries`, repo: "harbor-cli", branch: "demo/eng-427-config-loader", args: "", scheduledFor: iso(200), startedAt: iso(200), finishedAt: iso(196), exitCode: 1, status: "needs_attention", lateBySeconds: 0, sessionId: "s3" },
    { scheduleId: "r1", worktreePath: `${home}/atlas-web-filters`, repo: "atlas-web", branch: "demo/eng-405-search-filters", args: "maya-dev", scheduledFor: iso(1000), startedAt: iso(1000), finishedAt: iso(994), exitCode: 0, status: "done", lateBySeconds: 0, prUrl: "https://github.com/atlas-demo/atlas-web/pull/218", sessionId: "s1" },
    { scheduleId: "r2", worktreePath: `${home}/atlas-api-cursor`, repo: "atlas-api", branch: "demo/eng-401-cursor-pagination", args: "sam-ops", scheduledFor: iso(1440), startedAt: iso(1420), finishedAt: iso(1415), exitCode: 0, status: "done", lateBySeconds: 1200, prUrl: "https://github.com/atlas-demo/atlas-api/pull/364", sessionId: "s2" },
  ];

  const SUMMARY = `## Daily summary

**Shipped**
- atlas-web: search filters are up for review ([#218](https://github.com/atlas-demo/atlas-web/pull/218))
- atlas-api: cursor pagination is up for review ([#364](https://github.com/atlas-demo/atlas-api/pull/364))

**In progress**
- ENG-412 saved searches: API routes done, search bar next
- ENG-431 webhook retries: backoff and tests written

**Needs attention**
- harbor-cli: the config loader run stopped at the secret scan`;

  const LOGS = [
    "[tool] Bash: git log --since=midnight --author=demo --all --oneline",
    "[tool] Bash: gh pr list --author @me --state open",
    "[tool] Read: ~/.shipdeck/runs",
    "Grouping today's work by ticket",
  ];

  let schedules = [];
  const config = {
    scanRoots: ["~/coding"], excludeDirs: ["node_modules"], claudePath: "/usr/local/bin/claude", model: "default",
    summaryDir: "~/coding", reviewers: ["maya-dev", "sam-ops", "priya-k"], wakeArmingEnabled: true, shellPath: "",
    onboardingDone: true, hiddenRepos: [], hiddenWorktrees: [], slackTokenEncrypted: "", slackDefaultChannel: "", slackDefaultChannelName: "",
  };
  const listeners = { chunk: new Set(), log: new Set(), done: new Set() };
  const on = (set) => (cb) => { set.add(cb); return () => set.delete(cb); };

  const startSchedule = (input, status) => {
    schedules = [...schedules.filter((s) => s.worktreePath !== input.worktreePath), { id: `s${schedules.length + 1}`, createdAt: new Date().toISOString(), status, ...input }];
    return schedules;
  };

  window.shipdeck = {
    scan: async () => groups,
    getFileDiff: async () => DIFF,
    branchFiles: async () => [{ path: "src/routes/searches.ts", insertions: 96, deletions: 8, binary: false, untracked: false }, { path: "src/routes/searches.test.ts", insertions: 73, deletions: 2, binary: false, untracked: false }, { path: "src/auth/session.ts", insertions: 4, deletions: 1, binary: false, untracked: false }],
    listSchedules: async () => schedules,
    armSchedule: async (input) => startSchedule(input, "armed"),
    cancelSchedule: async (id) => (schedules = schedules.filter((s) => s.id !== id)),
    runNow: async (input) => startSchedule({ ...input, fireAt: new Date().toISOString() }, "running"),
    forceStopSchedule: async (id) => (schedules = schedules.filter((s) => s.id !== id)),
    resumeRun: async () => schedules,
    openRunTerminal: async () => {},
    listRuns: async () => runs,
    readRunLog: async () => "[tool] Bash: git status --porcelain\nSecret scan flagged config/dev.env, stopping before commit.\n",
    agentHealth: async () => "ok",
    repairAgent: async () => "ok",
    enableWakeArming: async () => true,
    getConfig: async () => config,
    setConfig: async (patch) => Object.assign(config, patch),
    pickFolder: async () => null,
    runDailySummary: async () => {
      LOGS.forEach((line, i) => setTimeout(() => listeners.log.forEach((cb) => cb(line)), 500 + i * 700));
      setTimeout(() => listeners.done.forEach((cb) => cb({ ok: true, text: SUMMARY })), 500 + LOGS.length * 700);
    },
    onSummaryChunk: on(listeners.chunk),
    onSummaryLog: on(listeners.log),
    onSummaryDone: on(listeners.done),
    copyForSlack: async () => {},
    copyPlain: async () => {},
    skillExists: async () => true,
    readSkill: async () => "",
    writeSkill: async () => {},
    slackSetToken: async () => ({ configured: false }),
    slackStatus: async () => ({ configured: false }),
    slackChannels: async () => ({ ok: true, channels: [] }),
    slackSchedule: async () => ({ ok: true }),
    slackPending: async () => ({ ok: true, messages: [] }),
    slackCancel: async () => ({ ok: true }),
  };
}

const FILE = 'button.file-row:has-text("src/routes/searches.ts")';

export default {
  title: "Shipdeck",
  tagline: "A Mac dashboard for every git worktree, with timers that open the pull request for you.",
  url: "http://127.0.0.1:4124",
  addressBar: "shipdeck",
  viewport: { width: 1440, height: 810 },
  contextOptions: { bypassCSP: true },
  async setup({ context }) {
    await context.addInitScript(installFixtures);
    // The app leaves links at the browser's dark blue, which can't be read on its dark panels.
    await context.addInitScript(() => {
      addEventListener("DOMContentLoaded", () => {
        const st = document.createElement("style");
        st.textContent = "a{color:#7cb7ff}";
        document.head.appendChild(st);
      });
    });
  },
  async before(d) {
    await d.goto("/");
    await d.waitFor(".group-title");
  },
  async run(d) {
    await d.goto("/");
    await d.waitFor(".group-title");
    await d.popup("Shipdeck scans your folders and groups every worktree by branch name, so one ticket's work across repos sits together.", { on: 'section.group:has(h2:has-text("saved-searches")) .branch >> nth=1', zoom: 1.4 });

    await d.click(FILE, { after: 700, popup: "Any changed file opens as a diff right there, with syntax highlighting.", zoom: 1.25 });
    await d.wait(700);
    await d.click('.diff-toolbar button:has-text("Split")', { after: 800 });
    await d.click('.diff-mode button:has-text("vs main")', { after: 1200, popup: "This compares the whole branch with main, including commits and uncommitted work.", zoom: 1.4 });

    await d.click(FILE, { after: 300 });
    await d.click('.card-foot button:has-text("Schedule…")', { after: 500 });
    await d.click('.reviewer-chips button:has-text("maya-dev")', { after: 400 });
    await d.popup("Pick reviewers and a time, and Shipdeck arms a one-shot timer for this worktree.", { on: ".sched" });
    await d.click('.time-card:has-text("In 1 hour")', { after: 700, popup: "When it fires, the Claude CLI runs a skill headlessly that commits the work and opens the pull request." });
    await d.popup("The timer lives in a launchd agent, so it still fires with the app closed.", { on: ".sched-chip.armed", zoom: 1.5 });

    await d.click('.topbar-actions button:has-text("Runs")', { after: 1000 });
    await d.popup("Every run is logged with its PR link, and a commit blocked by the secret scan shows as needing attention.", { on: ".drawer .run >> nth=-1" });
    await d.click(".drawer header button", { after: 600 });

    await d.click('button:has-text("Get daily summary")', { after: 300, popup: "The daily summary runs in the background, so the rest of the app stays usable." });
    await d.waitFor(".summary-dock");
    await d.click(".dock-head", { after: 1500 });
    await d.cut(async () => {
      await d.page.locator('.dock-title:has-text("ready")').waitFor({ timeout: 15000 });
    });
    await d.wait(500);
    await d.popup("It turns the day's commits and PRs into a summary you can paste straight into Slack.", { on: ".summary-dock", zoom: 1.5 });
  },
};
