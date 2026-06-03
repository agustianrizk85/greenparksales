import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createServer } from "node:net";

// Ask the OS for a free ephemeral port.
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const addr = srv.address();
      srv.close(() => resolve(typeof addr === "object" && addr ? addr.port : 0));
    });
  });
}

// Port resolution priority:
//   1. shell env  $PORT / $VITE_PORT
//   2. .env file  PORT / VITE_PORT   (loaded below)
//   3. fallback   a free port chosen at startup (dynamic)
async function resolvePort(env: Record<string, string>): Promise<number> {
  const raw = process.env.PORT ?? process.env.VITE_PORT ?? env.PORT ?? env.VITE_PORT;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : findFreePort();
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // Load .env / .env.[mode] / .env.local (all keys, no prefix filter).
  const env = loadEnv(mode, process.cwd(), "");
  const port = await resolvePort(env);
  return {
    plugins: [react()],
    // strictPort: the port is already known-free (or explicitly requested),
    // so fail loudly instead of silently falling back to 5173.
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
  };
});
