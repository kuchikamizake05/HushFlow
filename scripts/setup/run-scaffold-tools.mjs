import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const loadEnv = () => {
  const content = fs.readFileSync(".env.local", "utf8");
  const map = {};
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const idx = trimmed.indexOf("=");
    map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  });
  return map;
};

const env = loadEnv();
const deployerKey = env.HUSHFLOW_DEPLOYER_PRIVATE_KEY || env.HUSHFLOW_SELLER_PRIVATE_KEY;
const cleanKey = deployerKey.startsWith("0x") ? deployerKey.slice(2) : deployerKey;

const command = process.argv[2] || "allow-tee-version";
const rootDir = process.cwd();
const scaffoldPath = path.join(rootDir, "infra", "fcc", "scaffold-repo").replace(/\\/g, "/");

console.log(`=== RUNNING SCAFFOLD TOOL: ${command} ===`);

let cmd = "";
if (command === "allow-tee-version") {
  cmd = `docker run --rm -v "${scaffoldPath}:/app" -w /app/tools -e CHAIN_URL=https://coston2-api.flare.network/ext/C/rpc -e ADDRESSES_FILE=/app/config/coston2/deployed-addresses.json -e EXT_PROXY_URL=https://fcc.hushflow.dev -e NORMAL_PROXY_URL=https://fcc.hushflow.dev -e SIMULATED_TEE=true -e LOCAL_MODE=true -e DEPLOYMENT_PRIVATE_KEY=${cleanKey} golang:1.25.1-alpine go run ./cmd/allow-tee-version -a /app/config/coston2/deployed-addresses.json -c https://coston2-api.flare.network/ext/C/rpc -p https://fcc.hushflow.dev -version v0.1.0`;
} else if (command === "set-governance") {
  cmd = `docker run --rm -v "${scaffoldPath}:/app" -w /app/tools -e CHAIN_URL=https://coston2-api.flare.network/ext/C/rpc -e ADDRESSES_FILE=/app/config/coston2/deployed-addresses.json -e EXT_PROXY_URL=https://fcc.hushflow.dev -e NORMAL_PROXY_URL=https://fcc.hushflow.dev -e SIMULATED_TEE=true -e LOCAL_MODE=true -e DEPLOYMENT_PRIVATE_KEY=${cleanKey} golang:1.25.1-alpine go run ./cmd/set-governance -a /app/config/coston2/deployed-addresses.json -c https://coston2-api.flare.network/ext/C/rpc -p https://fcc.hushflow.dev`;
} else if (command === "register-tee") {
  cmd = `docker run --rm -v "${scaffoldPath}:/app" -w /app/tools -e CHAIN_URL=https://coston2-api.flare.network/ext/C/rpc -e ADDRESSES_FILE=/app/config/coston2/deployed-addresses.json -e EXT_PROXY_URL=https://fcc.hushflow.dev -e NORMAL_PROXY_URL=https://fcc.hushflow.dev -e SIMULATED_TEE=true -e LOCAL_MODE=true -e DEPLOYMENT_PRIVATE_KEY=${cleanKey} golang:1.25.1-alpine go run ./cmd/register-tee -a /app/config/coston2/deployed-addresses.json -c https://coston2-api.flare.network/ext/C/rpc -p https://fcc.hushflow.dev -h https://fcc.hushflow.dev -ep https://fcc.hushflow.dev -command rRap`;
}

try {
  const output = execSync(cmd, { encoding: "utf8", stdio: "inherit" });
} catch (error) {
  console.error("Execution failed.");
  process.exit(1);
}
