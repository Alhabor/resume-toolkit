import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  { name: "typst", command: "typst", args: ["--version"], required: true },
  { name: "pdftoppm", command: "pdftoppm", args: ["-v"], required: true },
  { name: "pdfinfo", command: "pdfinfo", args: ["-v"], required: true },
  { name: "pdftotext", command: "pdftotext", args: ["-v"], required: true },
  { name: "pdfunite", command: "pdfunite", args: ["-v"], required: false },
];

let failed = false;
const major = Number(process.versions.node.split(".")[0]);
if (major < 20) {
  console.log("FAIL node " + process.version + " (requires Node 20 or newer)");
  failed = true;
} else {
  console.log("PASS node " + process.version);
}

for (const item of checks) {
  const result = spawnSync(item.command, item.args, { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    const prefix = item.required ? "FAIL" : "WARN";
    console.log(prefix + " " + item.name + ": command not available");
    if (item.required) failed = true;
    continue;
  }
  const version = ((result.stdout || "") + (result.stderr || "")).trim().split("\n")[0];
  console.log("PASS " + item.name + ": " + version);
}

try {
  await access(path.join(repoRoot, "node_modules", "qrcode"));
  console.log("PASS npm dependencies: node_modules/qrcode");
} catch {
  console.log("WARN npm dependencies: run npm ci before building");
}

if (failed) process.exit(1);

