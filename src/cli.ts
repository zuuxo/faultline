#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { analyzeRepository } from "./core/analyzer.js";
import { assertGitRepository, readCommits } from "./core/git.js";
import { scanDependencies } from "./core/dependencies.js";
import { renderHtml } from "./report/html.js";

interface Options { repo:string; maxCommits:number; outDir:string; json:boolean; html:boolean; }

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options) { printHelp(); return; }
    const repo = resolve(options.repo);
    await assertGitRepository(repo);
    console.log("faultline\n");
    console.log(`repository: ${repo}`);
    console.log(`commits:    up to ${options.maxCommits}\n`);
    const [commits, dep] = await Promise.all([readCommits(repo, options.maxCommits), scanDependencies(repo)]);
    const report = analyzeRepository(basename(repo), commits, dep.files, dep.edges);
    const output = resolve(options.outDir);
    await mkdir(output, { recursive: true });
    if (options.json) await writeFile(resolve(output,"faultline.json"), JSON.stringify(report,null,2)+"\n", "utf8");
    if (options.html) await writeFile(resolve(output,"index.html"), renderHtml(report), "utf8");
    console.log(`files:      ${report.filesAnalyzed}`);
    console.log(`bugfixes:   ${report.bugfixCommits}`);
    console.log(`merges:     ${report.mergeCommits}`);
    console.log(`critical:   ${report.summary.criticalFiles}`);
    console.log(`high:       ${report.summary.highFiles}\n`);
    console.log("Top fault lines:");
    for (const file of report.files.slice(0,8)) console.log(`${String(file.risk).padStart(5)}  ${file.level.padEnd(8)}  ${file.file}`);
    console.log(`\nreport: ${output}`);
  } catch (error) {
    console.error(`faultline: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  }
}

function parseArgs(args:string[]): Options|null {
  if (!args.length || args.includes("--help") || args.includes("-h")) return null;
  if (args[0] !== "scan") throw new Error("Expected: faultline scan <repo>");
  if (!args[1]) throw new Error("Repository path is required.");
  const out: Options = { repo:args[1], maxCommits:500, outDir:"faultline-report", json:true, html:true };
  for (let i=2;i<args.length;i++) {
    const raw=args[i], eq=raw.indexOf("="), key=eq>0?raw.slice(0,eq):raw, inline=eq>0?raw.slice(eq+1):null;
    const value=()=>inline ?? args[++i];
    if (key==="--max-commits") { const n=Number.parseInt(value(),10); if(!Number.isInteger(n)||n<=0) throw new Error("--max-commits must be positive"); out.maxCommits=n; continue; }
    if (key==="--out") { out.outDir=value(); continue; }
    if (key==="--json-only") { out.html=false; continue; }
    if (key==="--html-only") { out.json=false; continue; }
    throw new Error(`Unknown option: ${raw}`);
  }
  return out;
}

function printHelp(): void {
  console.log(`faultline\n\nMap fragile areas in a Git repository.\n\nUsage:\n  faultline scan <repo> [options]\n\nOptions:\n  --max-commits <n>   Git commits to inspect (default 500)\n  --out <dir>         Output directory (default faultline-report)\n  --json-only         Generate only faultline.json\n  --html-only         Generate only index.html\n  -h, --help          Show this help\n\nExamples:\n  faultline scan .\n  faultline scan ../my-api --max-commits 1000\n  faultline scan . --out reports/faultline`);
}

await main();
