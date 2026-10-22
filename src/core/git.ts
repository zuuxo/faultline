import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommitRecord } from "./types.js";

const execFileAsync = promisify(execFile);

export async function assertGitRepository(repo: string): Promise<void> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repo, "rev-parse", "--is-inside-work-tree"], { maxBuffer: 10 * 1024 * 1024 });
    if (stdout.trim() !== "true") throw new Error("not a work tree");
  } catch {
    throw new Error(`Not a Git repository or Git is unavailable: ${repo}`);
  }
}

export async function readCommits(repo: string, maxCommits: number): Promise<CommitRecord[]> {
  const marker = "__FAULTLINE_COMMIT__";
  const { stdout } = await execFileAsync("git", [
    "-C", repo, "log", `-${maxCommits}`, "--date=unix",
    `--pretty=format:${marker}%n%H%n%ct%n%P%n%s`, "--name-only"
  ], { maxBuffer: 50 * 1024 * 1024, encoding: "utf8" });
  return parseGitLog(stdout, marker);
}

export function parseGitLog(raw: string, marker = "__FAULTLINE_COMMIT__"): CommitRecord[] {
  return raw.split(marker).map(b => b.trim()).filter(Boolean).flatMap(block => {
    const lines = block.split(/\r?\n/);
    if (lines.length < 4) return [];
    return [{
      hash: lines[0].trim(),
      timestamp: Number(lines[1].trim()) * 1000,
      parents: lines[2].trim() ? lines[2].trim().split(/\s+/) : [],
      subject: lines[3].trim(),
      files: [...new Set(lines.slice(4).map(x => x.trim()).filter(Boolean))]
    }];
  });
}
