import type { CoChangeEdge, CommitRecord, DependencyEdge, FaultlineReport, FileRisk, FileSignals } from "./types.js";

const BUGFIX = /\b(fix|fixed|fixes|bug|bugfix|hotfix|regression|repair|defect|patch)\b/i;

export function analyzeRepository(repository: string, commits: CommitRecord[], codeFiles: string[], dependencies: DependencyEdge[]): FaultlineReport {
  const all = new Set<string>([...codeFiles, ...commits.flatMap(c => c.files)]);
  const signals = new Map<string, FileSignals>();
  for (const file of all) signals.set(file, blank(file));

  const co = new Map<string, number>();
  let bugfixCommits = 0;
  let mergeCommits = 0;

  for (const commit of commits) {
    const isBug = BUGFIX.test(commit.subject);
    const isMerge = commit.parents.length > 1;
    if (isBug) bugfixCommits++;
    if (isMerge) mergeCommits++;

    for (const file of commit.files) {
      const s = ensure(signals, file);
      s.changes++;
      if (isBug) s.bugfixChanges++;
      if (isMerge) s.mergeTouches++;
      s.lastChangedAt = Math.max(s.lastChangedAt ?? 0, commit.timestamp);
    }

    const files = commit.files.filter(f => all.has(f)).slice(0, 80);
    for (let i = 0; i < files.length; i++) for (let j = i + 1; j < files.length; j++) {
      const key = pair(files[i], files[j]);
      co.set(key, (co.get(key) ?? 0) + 1);
    }
  }

  const partners = new Map<string, Set<string>>();
  for (const [key, weight] of co) {
    const [a,b] = key.split("\0");
    ensure(signals, a).coChangeWeight += weight;
    ensure(signals, b).coChangeWeight += weight;
    if (!partners.has(a)) partners.set(a, new Set());
    if (!partners.has(b)) partners.set(b, new Set());
    partners.get(a)!.add(b); partners.get(b)!.add(a);
  }
  for (const [file,set] of partners) ensure(signals,file).coChangePartners = set.size;

  for (const edge of dependencies) {
    ensure(signals, edge.from).dependencyOut++;
    ensure(signals, edge.to).dependencyIn++;
  }

  const max = {
    changes: maxSignal(signals, s => s.changes),
    bug: maxSignal(signals, s => s.bugfixChanges),
    merge: maxSignal(signals, s => s.mergeTouches),
    deps: maxSignal(signals, s => s.dependencyIn + s.dependencyOut),
    co: maxSignal(signals, s => s.coChangeWeight)
  };

  const files = [...signals.values()].map(s => score(s, max)).sort((a,b) => b.risk - a.risk);
  const coChanges: CoChangeEdge[] = [...co.entries()].map(([key,weight]) => {
    const [source,target] = key.split("\0"); return { source, target, weight };
  }).filter(e => e.weight >= 2).sort((a,b) => b.weight - a.weight).slice(0,800);

  const avg = files.length ? files.reduce((n,f) => n + f.risk, 0) / files.length : 0;
  return {
    repository,
    generatedAt: new Date().toISOString(),
    commitsAnalyzed: commits.length,
    filesAnalyzed: files.length,
    bugfixCommits,
    mergeCommits,
    summary: {
      averageRisk: round(avg),
      criticalFiles: files.filter(f => f.level === "critical").length,
      highFiles: files.filter(f => f.level === "high").length,
      dependencyEdges: dependencies.length,
      coChangeEdges: coChanges.length
    },
    files, dependencies, coChanges
  };
}

function score(s: FileSignals, max: { changes:number; bug:number; merge:number; deps:number; co:number }): FileRisk {
  const ch = norm(s.changes,max.changes), bg = norm(s.bugfixChanges,max.bug), mg = norm(s.mergeTouches,max.merge);
  const dp = norm(s.dependencyIn+s.dependencyOut,max.deps), cc = norm(s.coChangeWeight,max.co);
  const risk = round(ch*25 + bg*25 + dp*20 + cc*20 + mg*10);
  const reasons: string[] = [];
  if (bg >= .55) reasons.push("frequent bugfix involvement");
  if (ch >= .60) reasons.push("high change frequency");
  if (dp >= .55) reasons.push("high dependency pressure");
  if (cc >= .55) reasons.push("strong co-change coupling");
  if (mg >= .50) reasons.push("frequent merge pressure");
  if (!reasons.length) reasons.push("no dominant fragility signal");
  return { ...s, risk, level: risk >= 72 ? "critical" : risk >= 52 ? "high" : risk >= 28 ? "medium" : "low", reasons };
}

function blank(file: string): FileSignals { return { file, changes:0, bugfixChanges:0, mergeTouches:0, dependencyIn:0, dependencyOut:0, coChangeWeight:0, coChangePartners:0, lastChangedAt:null }; }
function ensure(map: Map<string,FileSignals>, file:string): FileSignals { let v = map.get(file); if (!v) { v=blank(file); map.set(file,v); } return v; }
function pair(a:string,b:string): string { return a < b ? a+"\0"+b : b+"\0"+a; }
function norm(v:number,max:number): number { return v <= 0 || max <= 0 ? 0 : Math.log1p(v)/Math.log1p(max); }
function maxSignal(map: Map<string,FileSignals>, f:(s:FileSignals)=>number): number { return Math.max(1,...[...map.values()].map(f)); }
function round(v:number): number { return Math.round(v*10)/10; }
