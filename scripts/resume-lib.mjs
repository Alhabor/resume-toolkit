import { readFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@jsonresume/schema";

export async function readResume(inputPath) {
  const raw = await readFile(inputPath, "utf8");
  let resume;
  try {
    resume = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON: ${inputPath}\n${error.message}`);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(resume)) {
    const details = (validate.errors ?? [])
      .map((item) => `${item.instancePath || "/"} ${item.message}`)
      .join("; ");
    throw new Error(`Resume Schema validation failed: ${details}`);
  }
  const language = resume.x_resumeSystem?.language ?? "en";
  if (!["en", "zh"].includes(language)) {
    throw new Error('x_resumeSystem.language must be "en" or "zh"');
  }
  const qrCodes = resume.x_resumeSystem?.qrCodes ?? [];
  if (!Array.isArray(qrCodes) || qrCodes.length > 2) {
    throw new Error("x_resumeSystem.qrCodes must be an array with at most 2 entries");
  }
  for (const [index, item] of qrCodes.entries()) {
    if (typeof item?.label !== "string" || !item.label.trim()
      || typeof item?.url !== "string" || !item.url.trim()) {
      throw new Error(`QR code ${index + 1} requires a non-empty label and URL`);
    }
    let target;
    try {
      target = new URL(item.url);
    } catch {
      throw new Error(`QR code ${index + 1} has an invalid URL`);
    }
    if (!(["https:", "http:"].includes(target.protocol))) {
      throw new Error(`QR code ${index + 1} must use an http or https URL`);
    }
  }
  return resume;
}

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    args[key] = argv[index + 1]?.startsWith("--") ? true : argv[++index];
  }
  return args;
}

export function typstString(value = "") {
  return `"${String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r", "")
    .replaceAll("\n", " ")}"`;
}

export function typstTuple(values) {
  if (!values.length) return "()";
  return `(${values.map(typstString).join(", ")},)`;
}

function dateRange(item) {
  const start = item.startDate?.slice(0, 7) ?? "";
  const end = item.endDate?.slice(0, 7) ?? (start ? "Present" : "");
  return [start, end].filter(Boolean).join(" - ");
}

function locationText(location) {
  if (!location) return "";
  if (typeof location === "string") return location;
  return [location.city, location.region, location.countryCode].filter(Boolean).join(", ");
}

function profileLink(profile) {
  if (!profile) return null;
  const label = profile.network ?? profile.username ?? profile.url;
  if (!label) return null;
  return { label, url: profile.url ?? "" };
}

function highlightParts(value) {
  const text = String(value ?? "");
  const match = text.match(/^(.{1,48}?)([:：])\s*(.*)$/s);
  if (!match) return { label: "", separator: "", body: text };
  return { label: match[1], separator: match[2], body: match[3] };
}

export function toTypstData(resume, qrAssetPrefix = "resume") {
  const basics = resume.basics ?? {};
  const system = resume.x_resumeSystem ?? {};
  const language = system.language ?? "en";
  const isChinese = language === "zh";
  const sectionTitles = {
    education: isChinese ? "教育背景" : "Education",
    work: isChinese ? "工作经历" : "Experience",
    projects: isChinese ? "项目经历" : "Projects",
    skills: isChinese ? "技能" : "Skills",
    links: isChinese ? "作品与联系" : "Links",
    ...(system.sectionTitles ?? {}),
  };
  const courseworkLabel = system.labels?.coursework ?? (isChinese ? "相关课程" : "Relevant Coursework");
  const contactPrimary = [
    locationText(basics.location),
    basics.email,
    basics.phone,
  ].filter(Boolean);
  const contactLinks = (basics.profiles ?? []).map(profileLink).filter(Boolean);
  if (basics.url) {
    contactLinks.push({
      label: system.labels?.website ?? (isChinese ? "个人网站" : "Website"),
      url: basics.url,
    });
  }
  const qrCodes = system.qrCodes ?? [];

  return {
    basics: {
      name: basics.name ?? "",
      label: basics.label ?? "",
      contact_primary: contactPrimary.join("  ·  "),
      links: contactLinks,
    },
    language,
    section_titles: sectionTitles,
    summary: resume.summary ?? "",
    qr_codes: qrCodes.map((item, index) => ({
      label: item.label,
      path: `${qrAssetPrefix}-qr-${index + 1}.svg`,
    })),
    work: (resume.work ?? []).map((item) => ({
      title: item.name ?? "",
      subtitle: [item.position, locationText(item.location)].filter(Boolean).join(" · "),
      meta: item.x_resumeSystem?.meta
        ?? dateRange(item),
      highlights: (item.highlights ?? []).map(highlightParts),
    })),
    projects: (resume.projects ?? []).map((item) => ({
      title: item.name ?? "",
      subtitle: item.keywords?.length ? item.keywords.join(", ") : "",
      meta: item.x_resumeSystem?.meta ?? dateRange(item),
      description: item.description ?? "",
      highlights: (item.highlights ?? []).map(highlightParts),
      keywords: "",
    })),
    education: (resume.education ?? []).map((item) => ({
      title: item.institution ?? "",
      subtitle: [item.studyType, item.area].filter(Boolean).join(" · "),
      meta: item.x_resumeSystem?.meta ?? dateRange(item),
      location: locationText(item.location),
      details: [
        ...(item.x_resumeSystem?.detailLines ?? []),
        ...(item.courses?.length ? [`${courseworkLabel}: ${item.courses.join(", ")}`] : []),
      ].map(highlightParts),
    })),
    skills: (resume.skills ?? []).map((item) => ({
      title: item.name ?? "",
      keywords: (item.keywords ?? []).join(", "),
    })),
  };
}

export function typstRecord(record) {
  const entries = Object.entries(record).map(([key, value]) => {
    const rendered = typstValue(value);
    return `    ${key}: ${rendered}`;
  });
  return `(${entries.join(",\n")},)`;
}

function typstValue(value) {
  if (Array.isArray(value)) {
    return value.length ? `(${value.map(typstValue).join(", ")},)` : "()";
  }
  if (value && typeof value === "object") return typstRecord(value);
  return typstString(value ?? "");
}

export function generateTypst(resume, qrAssetPrefix = "resume") {
  const data = toTypstData(resume, qrAssetPrefix);
  const renderArray = (items) => items.length
    ? `(${items.map(typstRecord).join(",\n")},)`
    : "()";
  const source = [
    '#import "../templates/resume.typ": render-resume',
    "",
    "#let resume = (",
    "  basics: (",
    `    name: ${typstString(data.basics.name)},`,
    `    label: ${typstString(data.basics.label)},`,
    `    contact_primary: ${typstString(data.basics.contact_primary)},`,
    `    links: ${renderArray(data.basics.links)},`,
    "  ),",
    `  language: ${typstString(data.language)},`,
    `  section_titles: ${typstRecord(data.section_titles)},`,
    `  summary: ${typstString(data.summary)},`,
    `  qr_codes: ${renderArray(data.qr_codes)},`,
    `  work: ${renderArray(data.work)},`,
    `  projects: ${renderArray(data.projects)},`,
    `  education: ${renderArray(data.education)},`,
    `  skills: ${renderArray(data.skills)},`,
    ")",
    "",
    "#render-resume(resume)",
    "",
  ].join("\n");
  return source;
}

export function resolveFromRepo(repoRoot, filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(repoRoot, filePath);
}
