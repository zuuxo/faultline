import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import type { DependencyEdge } from "./types.js";

const EXT = new Set([".ts",".tsx",".js",".jsx",".mts",".cts",".mjs",".cjs"]);
const IGNORE = new Set([".git","node_modules","dist","build","coverage",".next",".turbo"]);

export async function scanDependencies(repo: string): Promise<{ files: string[]; edges: DependencyEdge[] }> {
  const files = await listCodeFiles(repo);
  const fileSet = new Set(files);
  const edges: DependencyEdge[] = [];

  for (const file of files) {
    let source: string;
    try { source = await readFile(resolve(repo, file), "utf8"); } catch { continue; }
    for (const specifier of extractSpecifiers(source)) {
      if (!specifier.startsWith(".")) continue;
      const target = resolveLocalImport(repo, file, specifier, fileSet);
      if (target && target !== file) edges.push({ from: file, to: target });
    }
  }

  const seen = new Set<string>();
  return { files, edges: edges.filter(edge => {
    const key = edge.from + "\0" + edge.to;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }) };
}

export function extractSpecifiers(source: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /\bimport\s+(?:[^'\"]+\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[^'\"]*\s+from\s+["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) found.add(match[1]);
  }
  return [...found];
}

function resolveLocalImport(repo: string, fromFile: string, specifier: string, files: Set<string>): string | null {
  const base = resolve(repo, dirname(fromFile), specifier);
  const candidates = [
    base,
    ...[...EXT].map(e => base + e),
    ...[...EXT].map(e => resolve(base, "index" + e))
  ];
  for (const candidate of candidates) {
    const rel = normalize(relative(repo, candidate));
    if (files.has(rel)) return rel;
  }
  return null;
}

async function listCodeFiles(repo: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORE.has(entry.name)) continue;
      const absolute = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && EXT.has(extname(entry.name))) out.push(normalize(relative(repo, absolute)));
    }
  }
  await walk(repo);
  return out.sort();
}

function normalize(value: string): string { return value.split(sep).join("/"); }
