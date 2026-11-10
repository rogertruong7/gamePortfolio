import { existsSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { loadEnv } from "vite";

// Vite does not serve Vercel functions, so this runs api/*.js under `npm run dev`.
// Only used by the dev server; production is served by Vercel directly.
export default function devApi() {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, "");
      for (const key of ["ADMIN_PASSWORD", "DATABASE_URL"]) {
        if (env[key]) process.env[key] = env[key];
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (!url.pathname.startsWith("/api/")) return next();

        const file = path.join(server.config.root, `${url.pathname}.js`);
        const isRoute = /^\/api\/[a-z/-]+$/.test(url.pathname);
        if (!isRoute || !existsSync(file)) {
          res.statusCode = 404;
          return res.end();
        }

        try {
          const route = await server.ssrLoadModule(file);
          const handler = route[req.method];
          if (!handler) {
            res.statusCode = 405;
            return res.end();
          }
          const hasBody = req.method !== "GET" && req.method !== "HEAD";
          const response = await handler(
            new Request(url, {
              method: req.method,
              headers: req.headers,
              body: hasBody ? Readable.toWeb(req) : undefined,
              duplex: hasBody ? "half" : undefined,
            })
          );
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          server.config.logger.error(`API error: ${error.message}`);
          res.statusCode = 500;
          res.end();
        }
      });
    },
  };
}
