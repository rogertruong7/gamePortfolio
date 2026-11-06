// The two ways a tab can reach the others in the town. Both hand the room the same things: who is
// present, with what they've shared about themselves, and the messages they send: where they
// are, what they say, and the moves of any bench game they're playing.
//
// With Supabase set up, visitors on any device meet in a Realtime channel, one per lobby. Without
// it, tabs open on the same device still find each other through a BroadcastChannel.

// The anon key is meant to be public: it only lets a browser join Realtime channels, and this
// channel holds nothing but where each character is, what it's wearing and what it says.
const env = import.meta.env ?? {};
// The dashboard also shows the project's REST address, which ends in /rest/v1. The client wants
// the project's own address, so that ending is taken off if it was copied in by mistake.
const SUPABASE_URL = env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

export const HAS_SERVER = Boolean(SUPABASE_URL && SUPABASE_KEY);

// One connection, shared by every lobby the tab passes through
let clientReady = null;
function supabaseClient() {
  // Loaded here so the client only downloads once the game is running
  clientReady ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  );
  return clientReady;
}

export async function createSupabaseTransport(id, handlers, name) {
  const client = await supabaseClient();
  const channel = client.channel(name, {
    config: { presence: { key: id }, broadcast: { self: false } },
  });
  let joined = false;

  channel
    .on("presence", { event: "sync" }, () => {
      const members = [];
      Object.entries(channel.presenceState()).forEach(([key, entries]) => {
        // The same key can show up more than once while a connection is being replaced
        const latest = entries[entries.length - 1];
        if (latest) members.push({ id: key, meta: latest });
      });
      handlers.onMembers(members);
    })
    .on("broadcast", { event: "state" }, ({ payload }) => handlers.onMessage(payload))
    .on("broadcast", { event: "chat" }, ({ payload }) => handlers.onChat(payload))
    .on("broadcast", { event: "game" }, ({ payload }) => handlers.onGame(payload))
    .subscribe((status) => {
      joined = status === "SUBSCRIBED";
      // After a dropped connection the room works out again whether this tab has a place, and
      // sends its presence then if it does
      handlers.onStatus(joined ? "online" : status === "CLOSED" ? "offline" : "connecting");
    });

  return {
    setPresence(meta) {
      if (joined) channel.track(meta);
    },
    clearPresence() {
      if (joined) channel.untrack();
    },
    send(message) {
      if (joined) channel.send({ type: "broadcast", event: "state", payload: message });
    },
    sendChat(message) {
      if (joined) channel.send({ type: "broadcast", event: "chat", payload: message });
    },
    sendGame(message) {
      if (joined) channel.send({ type: "broadcast", event: "game", payload: message });
    },
    close() {
      client.removeChannel(channel);
    },
  };
}

// Tabs say hello every couple of seconds and are forgotten if they go quiet, which covers a tab
// that closes without getting to say goodbye
const HELLO_SECONDS = 2;
const FORGET_SECONDS = 7;

export function createLocalTransport(id, handlers, name) {
  if (typeof BroadcastChannel === "undefined") {
    handlers.onStatus("offline");
    return {
      setPresence() {},
      clearPresence() {},
      send() {},
      sendChat() {},
      sendGame() {},
      close() {},
    };
  }
  const channel = new BroadcastChannel(`portfolio-${name}`);
  const others = new Map();
  let presence = null;
  let closed = false;

  // Reported a moment later, like Supabase does, rather than in the middle of whatever changed them
  const publishMembers = () =>
    queueMicrotask(() => {
      if (closed) return;
      const members = [...others.entries()].map(([key, { meta }]) => ({ id: key, meta }));
      if (presence) members.push({ id, meta: presence });
      handlers.onMembers(members);
    });
  const hello = () => {
    if (presence) channel.postMessage({ kind: "hello", id, meta: presence });
  };

  channel.onmessage = ({ data }) => {
    if (!data || typeof data.id !== "string" || data.id === id) return;
    if (data.kind === "hello") {
      const isNew = !others.has(data.id);
      others.set(data.id, { meta: data.meta, heard: performance.now() });
      // Answers a newcomer straight away, so it doesn't wait for the next round of hellos
      if (isNew) hello();
      publishMembers();
    } else if (data.kind === "bye") {
      if (others.delete(data.id)) publishMembers();
    } else if (data.kind === "state") {
      const other = others.get(data.id);
      if (other) other.heard = performance.now();
      handlers.onMessage(data.message);
    } else if (data.kind === "chat") {
      handlers.onChat(data.message);
    } else if (data.kind === "game") {
      handlers.onGame(data.message);
    }
  };

  const timer = setInterval(() => {
    hello();
    const now = performance.now();
    let changed = false;
    others.forEach((other, key) => {
      if (now - other.heard > FORGET_SECONDS * 1000) {
        others.delete(key);
        changed = true;
      }
    });
    if (changed) publishMembers();
  }, HELLO_SECONDS * 1000);

  handlers.onStatus("online");

  return {
    setPresence(meta) {
      presence = meta;
      hello();
      publishMembers();
    },
    clearPresence() {
      presence = null;
      channel.postMessage({ kind: "bye", id });
      publishMembers();
    },
    send(message) {
      channel.postMessage({ kind: "state", id, message });
    },
    sendChat(message) {
      channel.postMessage({ kind: "chat", id, message });
    },
    sendGame(message) {
      channel.postMessage({ kind: "game", id, message });
    },
    close() {
      closed = true;
      clearInterval(timer);
      channel.postMessage({ kind: "bye", id });
      channel.close();
    },
  };
}
