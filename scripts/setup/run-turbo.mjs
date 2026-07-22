import { spawnSync } from "node:child_process";
import path from "node:path";

const task = process.argv[2];

if (!task) {
  console.error("Usage: node scripts/setup/run-turbo.mjs <task>");
  process.exit(1);
}

const binary = path.resolve("node_modules", "turbo", "bin", "turbo");
const result = spawnSync(process.execPath, [binary, "run", task], {
  env: {
    ...process.env,
    TURBO_TELEMETRY_DISABLED: "1",
  },
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
