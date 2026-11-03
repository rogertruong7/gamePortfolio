// Loaded into the app's server processes through NODE_OPTIONS by film.sh. It logs every outbound TCP
// connection to NET_GUARD_LOG, and refuses the real services the film must never reach.
const fs = require("node:fs");
const net = require("node:net");

const REFUSED = /(^|\.)(cuugo\.com|anthropic\.com|supadata\.ai|youtube\.com|youtu\.be|woolworths\.com\.au|coles\.com\.au|aldi\.com\.au|iga\.com\.au|igashop\.com\.au)$/i;
const seen = new Set();

function record(host, port, refused) {
  const key = `${host}:${port}:${refused}`;
  if (seen.has(key) || !process.env.NET_GUARD_LOG) return;
  seen.add(key);
  fs.appendFileSync(process.env.NET_GUARD_LOG, `${JSON.stringify({ at: new Date().toISOString(), host, port, refused })}\n`);
}

const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  // Node's own calls pass [options, callback] as one array; everyone else passes options or port, host.
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = typeof first === "object" && first !== null ? first : { port: first, host: args[1] };
  if (!options.path) {
    const host = options.host || options.servername || "localhost";
    const refused = REFUSED.test(String(host).replace(/\.$/, ""));
    record(host, options.port, refused);
    if (refused) throw new Error(`net-guard: the film must not connect to ${host}`);
  }
  return connect.apply(this, args);
};
