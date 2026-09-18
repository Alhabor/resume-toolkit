import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs, readResume, resolveFromRepo } from "./resume-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const inputPath = resolveFromRepo(repoRoot, args.input ?? "examples/resume.example.json");
const pdfPath = resolveFromRepo(repoRoot, args.pdf ?? "dist/example.pdf");
const resume = await readResume(inputPath);

try {
  await access(pdfPath);
} catch {
  throw new Error(`PDF not found: ${pdfPath}`);
}

const info = spawnSync("pdfinfo", [pdfPath], { encoding: "utf8" });
if (info.error) throw info.error;
if (info.status !== 0) throw new Error(info.stderr || "pdfinfo failed");
const pages = Number(info.stdout.match(/^Pages:\s+(\d+)/m)?.[1] ?? NaN);
const width = Number(info.stdout.match(/^Page size:\s+([\d.]+)/m)?.[1] ?? NaN);
const height = Number(info.stdout.match(/^Page size:\s+[\d.]+\s+x\s+([\d.]+)/m)?.[1] ?? NaN);
if (Math.abs(width - 595.28) > 1 || Math.abs(height - 841.89) > 1) {
  throw new Error("Expected A4 page size, got " + width + " x " + height + " pt");
}
if (pages !== 1) throw new Error(`Expected 1 page, got ${pages}`);

const textResult = spawnSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8" });
if (textResult.error) throw textResult.error;
if (textResult.status !== 0) throw new Error(textResult.stderr || "pdftotext failed");
const extracted = textResult.stdout;
const required = [
  resume.basics?.name,
  resume.basics?.email,
  ...(resume.x_resumeSystem?.qrCodes ?? []).map((item) => item.label),
].filter(Boolean);
const missing = required.filter((value) => !extracted.includes(value));
if (missing.length) throw new Error(`Required text missing from PDF: ${missing.join(", ")}`);

const qrCodes = resume.x_resumeSystem?.qrCodes ?? [];
const pdfBase = path.basename(pdfPath, ".pdf");
for (const index of qrCodes.keys()) {
  const qrSvgPath = path.join(path.dirname(pdfPath), `${pdfBase}-qr-${index + 1}.svg`);
  try {
    await access(qrSvgPath);
  } catch {
    throw new Error(`QR SVG missing: ${qrSvgPath}`);
  }
}

for (const forbidden of ["undefined", "[object Object]", "TODO", "PLACEHOLDER"]) {
  if (extracted.toLowerCase().includes(forbidden.toLowerCase())) {
    throw new Error(`Forbidden placeholder found in extracted PDF text: ${forbidden}`);
  }
}

console.log(`PASS schema: ${inputPath}`);
console.log(`PASS PDF pages: ${pages}`);
console.log(`PASS extracted text: ${extracted.trim().split(/\s+/).length} words approximately`);
console.log(`PASS required fields: ${required.join(", ")}`);
