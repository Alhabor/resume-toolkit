import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveFromRepo } from "./resume-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = {};
for (let index = 2; index < process.argv.length; index += 1) {
  const token = process.argv[index];
  if (!token.startsWith("--")) continue;
  const key = token.slice(2);
  args[key] = process.argv[index + 1]?.startsWith("--") ? true : process.argv[++index];
}

const zhInput = resolveFromRepo(repoRoot, args["zh-input"] || "private/resume-zh.json");
const enInput = resolveFromRepo(repoRoot, args["en-input"] || "private/resume-en.json");
const outputBase = resolveFromRepo(repoRoot, args.output || "dist/resume-duplex");
const relativeOutput = path.relative(repoRoot, outputBase);
if (relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) {
  throw new Error("--output must point inside the toolkit repository");
}

const run = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, { cwd: repoRoot, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
};

const zhOutput = outputBase + "-zh";
const enOutput = outputBase + "-en";
run(process.execPath, ["scripts/build.mjs", "--input", zhInput, "--output", zhOutput]);
run(process.execPath, ["scripts/check.mjs", "--input", zhInput, "--pdf", zhOutput + ".pdf"]);
run(process.execPath, ["scripts/build.mjs", "--input", enInput, "--output", enOutput]);
run(process.execPath, ["scripts/check.mjs", "--input", enInput, "--pdf", enOutput + ".pdf"]);

const duplexPdf = outputBase + ".pdf";
run("pdfunite", [zhOutput + ".pdf", enOutput + ".pdf", duplexPdf]);
run("pdftoppm", ["-png", "-singlefile", "-f", "1", "-l", "1", "-r", "150", duplexPdf, outputBase + "-1"]);
run("pdftoppm", ["-png", "-singlefile", "-f", "2", "-l", "2", "-r", "150", duplexPdf, outputBase + "-2"]);

const info = spawnSync("pdfinfo", [duplexPdf], { cwd: repoRoot, encoding: "utf8" });
if (info.status !== 0) throw new Error(info.stderr || "pdfinfo failed");
const pages = Number((info.stdout || "").match(/^Pages:\s+(\d+)/m)?.[1] || NaN);
if (pages !== 2) throw new Error("Expected 2 pages in duplex PDF, got " + pages);

const readPageText = (page) => spawnSync(
  "pdftotext",
  ["-f", String(page), "-l", String(page), "-layout", duplexPdf, "-"],
  { cwd: repoRoot, encoding: "utf8" },
);
const zhText = readPageText(1);
const enText = readPageText(2);
if (zhText.status !== 0 || enText.status !== 0) throw new Error("pdftotext failed for duplex PDF");
const zhResume = JSON.parse(await readFile(zhInput, "utf8"));
const enResume = JSON.parse(await readFile(enInput, "utf8"));
if (!zhText.stdout.includes(zhResume.basics?.name || "")) {
  throw new Error("Chinese page does not contain the Chinese resume name");
}
if (!enText.stdout.includes(enResume.basics?.name || "")) {
  throw new Error("English page does not contain the English resume name");
}

console.log("PASS duplex PDF: " + duplexPdf);
console.log("PASS page order: Chinese page 1, English page 2");
console.log("PREVIEW " + outputBase + "-1.png");
console.log("PREVIEW " + outputBase + "-2.png");
