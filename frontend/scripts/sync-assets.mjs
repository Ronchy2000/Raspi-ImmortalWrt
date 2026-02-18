import { promises as fs } from "node:fs";
import path from "node:path";

const FRONTEND_ROOT = process.cwd();
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");
const PUBLIC_ROOT = path.join(FRONTEND_ROOT, "public");

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "out",
  "dist",
  "build",
  "frontend"
]);

function normalizeRelPath(relPath) {
  return relPath.split(path.sep).join("/");
}

async function walkMarkdownFiles(dirAbs) {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  const results = [];

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

    results.push(fullPath);
  }

  return results;
}

function splitTarget(rawTarget) {
  const noHash = rawTarget.split("#")[0];
  const noQuery = noHash.split("?")[0];
  return noQuery.trim();
}

function resolveTarget(mdAbsPath, rawTarget) {
  const trimmed = splitTarget(rawTarget);
  if (!trimmed) return null;
  if (/^(https?:\/\/|mailto:|tel:|javascript:|data:)/i.test(trimmed)) return null;
  if (trimmed.startsWith("#")) return null;

  const clean = trimmed.replace(/^<|>$/g, "");
  const resolved = clean.startsWith("/")
    ? path.normalize(path.join(REPO_ROOT, clean))
    : path.normalize(path.join(path.dirname(mdAbsPath), clean));

  if (!resolved.startsWith(REPO_ROOT)) return null;
  return resolved;
}

async function collectAssetFiles(markdownFiles) {
  const assets = new Set();
  const mdLinkPattern = /!?\[[^\]]*]\(([^)\r\n]+)\)/g;
  const htmlAttrPattern = /<(?:img|a)\b[^>]*\b(?:src|href)=["']([^"']+)["'][^>]*>/gi;

  for (const mdAbsPath of markdownFiles) {
    const content = await fs.readFile(mdAbsPath, "utf8");

    for (const pattern of [mdLinkPattern, htmlAttrPattern]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const rawTarget = match[1]?.trim();
        if (!rawTarget) continue;

        const firstPart = rawTarget.split(/\s+"/)[0].trim();
        const assetAbsPath = resolveTarget(mdAbsPath, firstPart);
        if (!assetAbsPath) continue;

        try {
          const stat = await fs.stat(assetAbsPath);
          if (!stat.isFile()) continue;
          if (assetAbsPath.toLowerCase().endsWith(".md")) continue;

          assets.add(normalizeRelPath(path.relative(REPO_ROOT, assetAbsPath)));
        } catch {
          // Ignore missing targets referenced by docs.
        }
      }
    }
  }

  return assets;
}

async function copyAssets(assetRelPaths) {
  await fs.rm(PUBLIC_ROOT, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_ROOT, { recursive: true });

  let copied = 0;
  for (const relPath of assetRelPaths) {
    const src = path.join(REPO_ROOT, relPath);
    const dest = path.join(PUBLIC_ROOT, relPath);

    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    copied += 1;
  }

  return copied;
}

async function main() {
  const markdownFiles = await walkMarkdownFiles(REPO_ROOT);
  const assets = await collectAssetFiles(markdownFiles);
  const copied = await copyAssets(assets);

  console.log(`synced ${copied} asset files to frontend/public`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
