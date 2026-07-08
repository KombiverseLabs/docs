import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configuredPort = process.env.KOMBIFY_DOCS_LOCAL_E2E_PORT || "3000";
const maxWaitMs = Number.parseInt(process.env.KOMBIFY_DOCS_LOCAL_E2E_TIMEOUT_MS || "120000", 10);
const startedAt = Date.now();
const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmArgs = ["run", "dev", "--", "--no-open"];
const command = process.platform === "win32" ? "cmd.exe" : "npm";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "npm", ...npmArgs]
  : npmArgs;

let output = "";
let discoveredUrl = "";

const child = spawn(command, args, {
  cwd: repoDir,
  env: {
    ...process.env,
    CI: "1",
    PORT: configuredPort,
  },
  detached: process.platform !== "win32",
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => {
  output += chunk.toString();
  updateDiscoveredUrl();
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
  updateDiscoveredUrl();
});

function updateDiscoveredUrl() {
  const match = output.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/i);
  if (match) {
    discoveredUrl = match[0].replace("localhost", "127.0.0.1");
  }
}

function stop() {
  if (child.killed) {
    return;
  }

  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else if (child.pid) {
    process.kill(-child.pid);
  } else {
    child.kill();
  }
}

async function fetchCandidate(url) {
  const response = await fetch(url, { headers: { Accept: "text/html" } });
  const body = await response.text();
  if (response.status !== 200) {
    throw new Error(`${url} returned ${response.status}`);
  }
  if (!body.toLowerCase().includes("kombify")) {
    throw new Error(`${url} did not include expected docs content`);
  }
  console.log(JSON.stringify({ url, status_code: response.status, content: "kombify-docs" }));
}

async function waitForDocs() {
  let lastError = null;
  while (Date.now() - startedAt < maxWaitMs) {
    if (child.exitCode !== null) {
      throw new Error(`mintlify dev exited with code ${child.exitCode}\n${output}`);
    }

    const candidates = [
      discoveredUrl,
      `http://127.0.0.1:${configuredPort}`,
      "http://127.0.0.1:3000",
    ].filter(Boolean);

    for (const candidate of [...new Set(candidates)]) {
      try {
        await fetchCandidate(candidate);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`local docs check did not pass within ${maxWaitMs}ms: ${lastError?.message || "no response"}\n${output}`);
}

try {
  await waitForDocs();
} finally {
  stop();
}
