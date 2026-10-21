import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = fileURLToPath(new URL("..", import.meta.url));
const api = path.join(root, "apps", "api");
const python =
  process.platform === "win32"
    ? path.join(api, ".venv", "Scripts", "python.exe")
    : path.join(api, ".venv", "bin", "python");
const schema = path.join(root, "packages", "api-client", "openapi.json");
execFileSync(python, ["-m", "app.cli", "export-openapi", "--output", schema], {
  cwd: api,
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "sqlite:///:memory:" },
  stdio: "inherit",
});
const { default: openapiTS, astToString } = await import("openapi-typescript");
const generated = astToString(await openapiTS(new URL("file:///" + schema.replaceAll("\\", "/"))));
fs.writeFileSync(path.join(root, "packages", "api-client", "src", "schema.d.ts"), generated);
console.log("Generated JOJOBUILDS API contract.");
