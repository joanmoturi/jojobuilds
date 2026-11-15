import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDirectory = path.join(root, "apps", "api");
const webDirectory = path.join(root, "apps", "web");
const python = path.join(apiDirectory, ".venv", "Scripts", "python.exe");
const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const dev = process.argv.includes("--dev");
const env = {
  ...process.env,
  DATABASE_URL: "sqlite:///./data/jojobuilds.db",
  DATA_DIR: "./data",
  APP_ENV: "development",
  COOKIE_SECURE: "false",
  WEB_ORIGIN: "http://localhost:3100",
  API_INTERNAL_URL: "http://127.0.0.1:8001",
  NEXT_TELEMETRY_DISABLED: "1",
};

async function checkPort(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () =>
      reject(
        new Error(
          `Port ${port} is already occupied. Stop only the confirmed JOJOBUILDS process, or use its existing instance. No automatic port switching is allowed.`,
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error || result.status !== 0)
    throw (
      result.error ||
      new Error(
        `${command} failed (${result.status}). See docs\\RUN_ON_PC.md for dependency setup.`,
      )
    );
}

try {
  await Promise.all([checkPort(3100), checkPort(8001)]);
  run(python, ["-m", "alembic", "upgrade", "head"], apiDirectory);
  if (!dev) run(process.execPath, [next, "build"], webDirectory);
  const children = [];
  let stopping = false;
  const stop = (code = 0) => {
    if (stopping) return;
    stopping = true;
    if (process.platform === "win32") {
      const ids = children.map((child) => child.pid).filter(Number.isInteger);
      if (ids.length) {
        // The Windows virtualenv launcher can own a separate Python process.
        spawnSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-Command",
            `
          function Stop-LocalTree([int]$ownerId) {
            Get-CimInstance Win32_Process -Filter "ParentProcessId = $ownerId" -ErrorAction SilentlyContinue |
              ForEach-Object { Stop-LocalTree $_.ProcessId }
            Stop-Process -Id $ownerId -ErrorAction SilentlyContinue
          }
          @(${ids.join(",")}) | ForEach-Object { Stop-LocalTree $_ }
        `,
          ],
          { stdio: "ignore" },
        );
      }
    } else {
      for (const child of children) child.kill();
    }
    process.exitCode = code;
  };
  for (const [command, args, cwd] of [
    [
      python,
      ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
      apiDirectory,
    ],
    [
      process.execPath,
      [next, dev ? "dev" : "start", "--hostname", "127.0.0.1", "--port", "3100"],
      webDirectory,
    ],
  ]) {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" });
    children.push(child);
    child.on("error", (error) => {
      console.error(error.message);
      stop(1);
    });
    child.on("exit", (code) => {
      if (!stopping) stop(code || 0);
    });
  }
  process.on("SIGINT", () => stop());
  process.on("SIGTERM", () => stop());
  let ready = false;
  for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
    try {
      const [api, web] = await Promise.all([
        fetch("http://127.0.0.1:8001/ready", { signal: AbortSignal.timeout(2000) }),
        fetch("http://127.0.0.1:3100", { signal: AbortSignal.timeout(2000) }),
      ]);
      if (
        api.ok &&
        (await api.json()).status === "ready" &&
        web.ok &&
        (await web.text()).includes("JOJOBUILDS")
      ) {
        ready = true;
        console.log(
          "\nJOJOBUILDS is ready: http://localhost:3100\nKeep this terminal open. Ctrl+C stops these processes. Offline summaries are not full backups.\n",
        );
        break;
      }
    } catch {
      /* Wait for the two local processes to become ready. */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready && !stopping) {
    console.error("JOJOBUILDS did not become ready; inspect the startup errors above.");
    stop(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
