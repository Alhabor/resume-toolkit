import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = {};
for (let index = 2; index < process.argv.length; index += 1) {
  const token = process.argv[index];
  if (!token.startsWith("--")) continue;
  const key = token.slice(2);
  args[key] = process.argv[index + 1]?.startsWith("--") ? true : process.argv[++index];
}

const requestedDir = args.dir || "private";
const targetDir = path.resolve(repoRoot, requestedDir);
const relativeTarget = path.relative(repoRoot, targetDir);
if (!relativeTarget || relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
  throw new Error("--dir must point to a directory inside the repository");
}

await mkdir(path.join(targetDir, "source"), { recursive: true });
const files = [
  ["README.md", "templates/private-readme.md"],
  ["profile-intake.md", "templates/profile-intake.md"],
  ["evidence-ledger.md", "templates/evidence-ledger.md"],
  ["resume-en.json", "examples/resume.example.json"],
  ["resume-zh.json", "examples/resume.example.zh.json"],
];

for (const [destination, source] of files) {
  const output = path.join(targetDir, destination);
  try {
    await access(output);
    if (!args.force) {
      console.log("SKIP " + path.relative(repoRoot, output) + " (already exists; use --force to replace)");
      continue;
    }
  } catch {
    // The destination does not exist.
  }
  console.log("COPY " + source + " -> " + path.relative(repoRoot, output));
  await copyFile(path.join(repoRoot, source), output);
}

console.log("Initialized " + relativeTarget + "/");
console.log("Replace the synthetic example JSON with your own confirmed content before building.");

