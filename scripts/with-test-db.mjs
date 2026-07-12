import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";

function loadEnvFile(file) {
  if (!existsSync(file)) return;

  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.test.local");
loadEnvFile(".env.test");
loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl) {
  console.error("DATABASE_URL_TEST is required. Copy .env.test.example to .env.test first.");
  process.exit(1);
}

if (!databaseUrl.includes("questora_test")) {
  console.error("Refusing to run integration command: DATABASE_URL_TEST must target questora_test.");
  process.exit(1);
}

const command = process.argv[2];
const args = process.argv.slice(3);
if (!command) {
  console.error("Usage: node scripts/with-test-db.mjs <command> [...args]");
  process.exit(1);
}

const child = spawn(command, args, {
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: "test"
  },
  shell: true,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 1);
});
