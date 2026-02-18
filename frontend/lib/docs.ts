import "server-only";

import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

export type DocLocale = "zh" | "en";

export type DocMeta = {
  key: string;
  repoPath: string;
  title: string;
  summary: string;
  mtimeMs: number;
  locale: DocLocale;
};

type DocRecord = DocMeta & {
  content: string;
  aliases: string[];
  priority: number;
};

type CacheState = {
  byLocale: Record<DocLocale, { records: DocRecord[]; byKey: Map<string, DocRecord> }>;
  localesByKey: Map<string, Set<DocLocale>>;
};

const REPO_ROOT = path.resolve(process.cwd(), "..");
const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  "frontend",
  ".next",
  "out",
  "dist",
  "build"
]);

let cache: CacheState | null = null;

function normalizeRelPath(relPath: string): string {
  return relPath.split(path.sep).join("/");
}

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function scoreDoc(repoPath: string): number {
  if (repoPath === "README.md") return 0;
  if (repoPath === "README_EN.md") return 1;
  if (repoPath.startsWith("docs/")) return 2;
  if (repoPath.startsWith("scripts/")) return 3;
  if (repoPath.startsWith("changelogs/")) return 4;
  return 5;
}

function toPlainText(input: string): string {
  let text = input;
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/`+/g, "");
  text = text.replace(/[*_~>#]/g, " ");
  text = text.replace(/^\s*[-+*]\s+/, "");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function extractTitle(content: string, fallback: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!heading) return fallback;
  const title = toPlainText(heading);
  return title || fallback;
}

function isLangNavLine(line: string): boolean {
  if (/中文文档/.test(line) && /English/i.test(line)) return true;
  if (/[#(]chinese[#)]|[#(]english[#)]/i.test(line)) return true;
  return false;
}

function cleanLocalizedContent(locale: DocLocale, rawContent: string): string {
  const lines = rawContent.split(/\r?\n/);
  const cleaned = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (isLangNavLine(trimmed)) return false;
    if (/^<a id="?chinese"?><\/a>$/i.test(trimmed)) return false;
    if (/^<a id="?english"?><\/a>$/i.test(trimmed)) return false;
    if (locale === "en" && hasCjk(trimmed) && /^(\[🇨🇳|\[中文)/.test(trimmed)) return false;
    return true;
  });
  return cleaned.join("\n").trim();
}

function extractSummary(content: string, locale: DocLocale): string {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("[![")) continue;
    if (line.startsWith("![")) continue;
    if (line.startsWith("<")) continue;
    if (line.startsWith("---")) continue;
    if (line.startsWith("|")) continue;
    if (line.includes("shields.io")) continue;
    if (line.includes("visitor-badge")) continue;

    const summary = toPlainText(line);
    if (!summary) continue;
    if (isLangNavLine(summary)) continue;
    if (/license\s+status/i.test(summary)) continue;
    if (locale === "en" && hasCjk(summary)) continue;

    return summary;
  }
  return locale === "en" ? "Project documentation" : "项目文档";
}

function splitBilingualContent(content: string): { zh: string; en: string } | null {
  const marker = content.match(/<a id="?english"?><\/a>/i);
  if (!marker || marker.index === undefined) return null;
  const markerIndex = marker.index;
  const zhContent = content.slice(0, markerIndex);
  const enContent = content.slice(markerIndex + marker[0].length);
  if (!zhContent.trim() || !enContent.trim()) return null;
  return { zh: zhContent, en: enContent };
}

function parseEnDirectoryPath(normalizedPath: string): { baseMdPath: string; baseKey: string } | null {
  const match = normalizedPath.match(/^([^/]+)\/en\/(.+)\.md$/i);
  if (!match) return null;
  const baseDir = match[1];
  const rest = match[2];
  return {
    baseMdPath: `${baseDir}/${rest}.md`,
    baseKey: `${baseDir}/${rest}`
  };
}

function canonicalKeyFromRepoPath(repoPath: string): string {
  const normalized = normalizeRelPath(repoPath);
  const enDirPath = parseEnDirectoryPath(normalized);
  if (enDirPath) {
    return enDirPath.baseKey;
  }
  if (/_EN\.md$/i.test(normalized)) {
    return normalized.replace(/_EN\.md$/i, "");
  }
  return normalized.replace(/\.md$/i, "");
}

function aliasesFromRepoPath(repoPath: string): string[] {
  const normalized = normalizeRelPath(repoPath);
  const aliases = new Set<string>([normalized]);
  const enDirPath = parseEnDirectoryPath(normalized);
  if (enDirPath) {
    aliases.add(enDirPath.baseMdPath);
  }
  if (/_EN\.md$/i.test(normalized)) {
    aliases.add(normalized.replace(/_EN\.md$/i, ".md"));
  }
  return [...aliases];
}

async function walkMarkdownFiles(dirAbs: string): Promise<string[]> {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
    if (EXCLUDED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      const child = await walkMarkdownFiles(fullPath);
      results.push(...child);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".md")) continue;

    const relative = normalizeRelPath(path.relative(REPO_ROOT, fullPath));
    results.push(relative);
  }

  return results;
}

function makeRecord(params: {
  locale: DocLocale;
  repoPath: string;
  content: string;
  mtimeMs: number;
  priority: number;
}): DocRecord {
  const key = canonicalKeyFromRepoPath(params.repoPath);
  const fallbackName = path.basename(key);
  return {
    key,
    repoPath: params.repoPath,
    title: extractTitle(params.content, fallbackName),
    summary: extractSummary(params.content, params.locale),
    mtimeMs: params.mtimeMs,
    locale: params.locale,
    content: params.content,
    aliases: aliasesFromRepoPath(params.repoPath),
    priority: params.priority
  };
}

function addRecordIfBetter(
  map: Map<string, DocRecord>,
  localesByKey: Map<string, Set<DocLocale>>,
  record: DocRecord
) {
  const existing = map.get(record.key);
  if (!existing || existing.priority < record.priority) {
    map.set(record.key, record);
  }

  const set = localesByKey.get(record.key) ?? new Set<DocLocale>();
  set.add(record.locale);
  localesByKey.set(record.key, set);
}

async function buildCache(): Promise<CacheState> {
  const mdPaths = await walkMarkdownFiles(REPO_ROOT);
  mdPaths.sort((a, b) => {
    const scoreDiff = scoreDoc(a) - scoreDoc(b);
    return scoreDiff !== 0 ? scoreDiff : a.localeCompare(b);
  });

  const zhMap = new Map<string, DocRecord>();
  const enMap = new Map<string, DocRecord>();
  const localesByKey = new Map<string, Set<DocLocale>>();

  for (const repoPath of mdPaths) {
    const absPath = path.join(REPO_ROOT, repoPath);
    const [rawContent, stat] = await Promise.all([fs.readFile(absPath, "utf8"), fs.stat(absPath)]);

    if (parseEnDirectoryPath(repoPath)) {
      const enContent = cleanLocalizedContent("en", rawContent);
      addRecordIfBetter(
        enMap,
        localesByKey,
        makeRecord({
          locale: "en",
          repoPath,
          content: enContent,
          mtimeMs: stat.mtimeMs,
          priority: 7
        })
      );
      continue;
    }

    const bilingual = splitBilingualContent(rawContent);
    if (bilingual) {
      const zhContent = cleanLocalizedContent("zh", bilingual.zh);
      const enContent = cleanLocalizedContent("en", bilingual.en);

      addRecordIfBetter(
        zhMap,
        localesByKey,
        makeRecord({ locale: "zh", repoPath, content: zhContent, mtimeMs: stat.mtimeMs, priority: 3 })
      );
      addRecordIfBetter(
        enMap,
        localesByKey,
        makeRecord({ locale: "en", repoPath, content: enContent, mtimeMs: stat.mtimeMs, priority: 3 })
      );
      continue;
    }

    const content = cleanLocalizedContent(/_EN\.md$/i.test(repoPath) ? "en" : "zh", rawContent);
    if (/_EN\.md$/i.test(repoPath)) {
      addRecordIfBetter(
        enMap,
        localesByKey,
        makeRecord({ locale: "en", repoPath, content, mtimeMs: stat.mtimeMs, priority: 4 })
      );
      continue;
    }

    if (hasCjk(content)) {
      addRecordIfBetter(
        zhMap,
        localesByKey,
        makeRecord({ locale: "zh", repoPath, content, mtimeMs: stat.mtimeMs, priority: 2 })
      );
    } else {
      addRecordIfBetter(
        enMap,
        localesByKey,
        makeRecord({ locale: "en", repoPath, content, mtimeMs: stat.mtimeMs, priority: 2 })
      );
    }
  }

  const finalize = (map: Map<string, DocRecord>) => {
    const records = [...map.values()].sort((a, b) => {
      const scoreDiff = scoreDoc(a.repoPath) - scoreDoc(b.repoPath);
      return scoreDiff !== 0 ? scoreDiff : a.repoPath.localeCompare(b.repoPath);
    });
    return {
      records,
      byKey: new Map(records.map((record) => [record.key, record]))
    };
  };

  return {
    byLocale: {
      zh: finalize(zhMap),
      en: finalize(enMap)
    },
    localesByKey
  };
}

async function getCache(): Promise<CacheState> {
  if (process.env.NODE_ENV !== "production") {
    return buildCache();
  }
  if (cache) return cache;
  cache = await buildCache();
  return cache;
}

export async function getAllDocs(locale: DocLocale): Promise<DocMeta[]> {
  const state = await getCache();
  return state.byLocale[locale].records.map(({ content: _content, aliases: _aliases, priority: _priority, ...meta }) => meta);
}

export async function getDocByKey(key: string, locale: DocLocale): Promise<(DocMeta & { content: string }) | null> {
  const state = await getCache();
  const record = state.byLocale[locale].byKey.get(key);
  if (!record) return null;
  const { aliases: _aliases, priority: _priority, ...doc } = record;
  return doc;
}

export async function hasDocInLocale(key: string, locale: DocLocale): Promise<boolean> {
  const state = await getCache();
  return state.byLocale[locale].byKey.has(key);
}

export async function getAvailableLocalesForKey(key: string): Promise<DocLocale[]> {
  const state = await getCache();
  const locales = state.localesByKey.get(key);
  if (!locales) return [];
  return [...locales].sort();
}

export function docHrefFromKey(key: string, locale: DocLocale): string {
  const encoded = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return locale === "en" ? `/en/m/${encoded}/` : `/m/${encoded}/`;
}

export function homeHref(locale: DocLocale): string {
  return locale === "en" ? "/en/" : "/";
}

function resolveRepoRelativePath(currentRepoPath: string, targetPath: string): string | null {
  const fromDir = path.posix.dirname(currentRepoPath);
  const normalized = targetPath.startsWith("/")
    ? path.posix.normalize(targetPath.slice(1))
    : path.posix.normalize(path.posix.join(fromDir, targetPath));

  if (!normalized || normalized.startsWith("../")) return null;
  return normalized;
}

function splitHref(href: string): { pathPart: string; hashPart: string } {
  const hashIndex = href.indexOf("#");
  if (hashIndex < 0) return { pathPart: href, hashPart: "" };
  return {
    pathPart: href.slice(0, hashIndex),
    hashPart: href.slice(hashIndex)
  };
}

function isExternal(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:|javascript:|data:)/i.test(href);
}

export function createMarkdownResolvers(
  currentRepoPath: string,
  allDocs: DocMeta[],
  locale: DocLocale
) {
  const aliasToKey = new Map<string, string>();
  for (const doc of allDocs) {
    const normalizedPath = normalizeRelPath(doc.repoPath);
    aliasToKey.set(normalizedPath, doc.key);
    const enDirPath = parseEnDirectoryPath(normalizedPath);
    if (enDirPath) {
      aliasToKey.set(enDirPath.baseMdPath, doc.key);
    }
    if (/_EN\.md$/i.test(normalizedPath)) {
      aliasToKey.set(normalizedPath.replace(/_EN\.md$/i, ".md"), doc.key);
    }
  }

  function resolveHref(rawHref: string | undefined): string {
    if (!rawHref) return "#";
    if (isExternal(rawHref) || rawHref.startsWith("#")) return rawHref;

    const { pathPart, hashPart } = splitHref(rawHref);
    const resolved = resolveRepoRelativePath(currentRepoPath, pathPart);
    if (!resolved) return rawHref;

    if (resolved.toLowerCase().endsWith(".md")) {
      const key = aliasToKey.get(resolved);
      if (key) {
        return `${docHrefFromKey(key, locale)}${hashPart}`;
      }

      const absMdPath = path.join(REPO_ROOT, resolved);
      if (existsSync(absMdPath)) {
        const inferredLocale: DocLocale =
          parseEnDirectoryPath(resolved) || /_EN\.md$/i.test(resolved) ? "en" : locale;
        const fallbackKey = canonicalKeyFromRepoPath(resolved);
        return `${docHrefFromKey(fallbackKey, inferredLocale)}${hashPart}`;
      }

      return rawHref;
    }

    const abs = path.join(REPO_ROOT, resolved);
    if (existsSync(abs)) {
      return `/${resolved}`;
    }

    return rawHref;
  }

  function resolveSrc(rawSrc: string | undefined): string {
    if (!rawSrc) return "";
    if (isExternal(rawSrc)) return rawSrc;

    const resolved = resolveRepoRelativePath(currentRepoPath, rawSrc);
    if (!resolved) return rawSrc;

    const abs = path.join(REPO_ROOT, resolved);
    if (existsSync(abs)) {
      return `/${resolved}`;
    }

    return rawSrc;
  }

  return { resolveHref, resolveSrc };
}
