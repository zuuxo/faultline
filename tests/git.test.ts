import test from "node:test";
import assert from "node:assert/strict";
import { parseGitLog } from "../src/core/git.js";
test("parses git log blocks",()=>{const raw=`__FAULTLINE_COMMIT__\nabc\n1700000000\nparent1\nfix parser bug\nsrc/a.ts\nsrc/b.ts\n__FAULTLINE_COMMIT__\ndef\n1700000100\nparent1 parent2\nmerge branch\nsrc/a.ts`;const c=parseGitLog(raw);assert.equal(c.length,2);assert.equal(c[0].subject,"fix parser bug");assert.deepEqual(c[0].files,["src/a.ts","src/b.ts"]);assert.equal(c[1].parents.length,2)});
