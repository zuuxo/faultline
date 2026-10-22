import test from "node:test";
import assert from "node:assert/strict";
import { extractSpecifiers } from "../src/core/dependencies.js";
test("extracts import forms",()=>{const src=`import {a} from "./a.js"; import "./side.js"; export {b} from "./b.js"; const c=require("./c"); const d=import("./d.js");`;assert.deepEqual(new Set(extractSpecifiers(src)),new Set(["./a.js","./side.js","./b.js","./c","./d.js"]))});
