import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const map = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
  const idx = trimmed.indexOf("=");
  map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
});

const host = map.FCC_INDEXER_DB_HOST || "34.38.42.208";
const port = map.FCC_INDEXER_DB_PORT || "3306";
const database = map.FCC_INDEXER_DB_NAME || "indexer";
const username = map.FCC_INDEXER_DB_USER || "hackathon_user_58";
const password = map.FCC_INDEXER_DB_PASSWORD || "";

const toml = `# Docker Coston2 proxy config
redis_port = "redis:6379"
private_key_variable = "PROXY_PRIVATE_KEY"
initial_signing_policy_offset = 2
signing_policy_fetch_interval = "20s"

chain_id = 114

[db]
host = "${host}"
port = ${port}
database = "${database}"
username = "${username}"
password = "${password}"
log_queries = false

[addresses]
flare_systems_manager = "0xA90Db6D10F856799b10ef2A77EBCbF460aC71e52"
relay = "0xa10B672D1c62e5457b17af63d4302add6A99d7dE"
voter_registry = "0x6a0AF07b7972177B176d3D422555cbc98DfDe914"

[ports]
internal = "6663"
external = "6664"

[info_timing]
cycle_internal = "10s"
cycle_queue_response_wait = "2s"

[voting]
proposal_expiration = "12s"
max_pending_request = 10000
`;

fs.writeFileSync("infra/fcc/extension_proxy.coston2.docker.toml", toml, "utf8");
console.log("Created infra/fcc/extension_proxy.coston2.docker.toml successfully (gitignored).");
