import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

async function main() {
  // Start Vite dev server for renderer
  const vite = await createServer({
    configFile: resolve(root, "apps/desktop/vite.config.ts"),
  });
  await vite.listen();
  const addr = vite.resolvedUrls?.local[0] ?? "http://localhost:5173";
  console.log(`[vite] renderer ready at ${addr}`);

  // Start Electron main process with tsx
  const mainEntry = resolve(root, "apps/desktop/src/main/index.ts");
  const electron = spawn("npx", ["tsx", "--esm", mainEntry], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      VITE_DEV_SERVER_URL: addr,
    },
  });

  electron.on("close", (code) => {
    console.log(`[electron] exited with code ${code}`);
    vite.close();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
