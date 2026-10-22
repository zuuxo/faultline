import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRepository } from "../src/core/analyzer.js";
import type { CommitRecord, DependencyEdge } from "../src/core/types.js";
const commits: CommitRecord[]=[
 {hash:"a",timestamp:1000,subject:"initial feature",parents:["x"],files:["src/a.ts","src/b.ts"]},
 {hash:"b",timestamp:2000,subject:"fix auth regression",parents:["a"],files:["src/a.ts","src/b.ts"]},
 {hash:"c",timestamp:3000,subject:"bugfix another issue",parents:["b"],files:["src/a.ts"]},
 {hash:"d",timestamp:4000,subject:"merge feature",parents:["b","c"],files:["src/a.ts","src/b.ts"]}
];
const deps:DependencyEdge[]=[{from:"src/b.ts",to:"src/a.ts"}];
test("fragile file ranks above quiet file",()=>{const r=analyzeRepository("demo",commits,["src/a.ts","src/b.ts","src/c.ts"],deps);const a=r.files.find(f=>f.file==="src/a.ts")!,c=r.files.find(f=>f.file==="src/c.ts")!;assert.ok(a.risk>c.risk);assert.ok(a.reasons.includes("frequent bugfix involvement"))});
test("co-change edges aggregate",()=>{const r=analyzeRepository("demo",commits,["src/a.ts","src/b.ts"],deps);const e=r.coChanges.find(x=>x.source==="src/a.ts"&&x.target==="src/b.ts");assert.equal(e?.weight,3)});
