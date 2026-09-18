import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import {
  generateTypst,
  parseArgs,
  readResume,
  resolveFromRepo,
} from "./resume-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const inputPath = resolveFromRepo(repoRoot, args.input ?? "examples/resume.example.json");
const outputBase = resolveFromRepo(repoRoot, args.output ?? "dist/example");
const typstPath = `${outputBase}.typ`;
const pdfPath = `${outputBase}.pdf`;
const pngPath = `${outputBase}.png`;
const relativeOutput = path.relative(repoRoot, outputBase);
if (relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) {
  throw new Error("Output must be inside the toolkit repository (for example, dist/resume-en)");
}

const resume = await readResume(inputPath);
await mkdir(path.dirname(outputBase), { recursive: true });
const qrAssetPrefix = path.relative(path.join(repoRoot, "templates"), outputBase).split(path.sep).join("/");
const qrCodes = resume.x_resumeSystem?.qrCodes ?? [];
for (const [index, qr] of qrCodes.entries()) {
  const svg = await QRCode.toString(qr.url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    color: { dark: "#20252B", light: "#FFFFFF" },
  });
  await writeFile(`${outputBase}-qr-${index + 1}.svg`, svg, "utf8");
}
await writeFile(typstPath, generateTypst(resume, qrAssetPrefix), "utf8");

const compile = spawnSync("typst", ["compile", "--root", repoRoot, "--diagnostic-format", "short", typstPath, pdfPath], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (compile.error) throw compile.error;
if (compile.status !== 0) process.exit(compile.status ?? 1);

const preview = spawnSync("pdftoppm", ["-png", "-singlefile", pdfPath, pngPath.replace(/\.png$/, "")], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (preview.error) throw preview.error;
if (preview.status !== 0) process.exit(preview.status ?? 1);

console.log(`Built ${pdfPath}`);
console.log(`Preview ${pngPath}`);
