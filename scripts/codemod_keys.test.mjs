// Unit tests for scripts/codemod_keys.mjs. Run from the repository root:
//
//   node --test scripts/codemod_keys.test.mjs
//
// The tests rewrite small source strings in memory; nothing under frontend/ is touched.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Tables, analyze, collectFiles, selfCheck } from "./codemod_keys.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "frontend/src/modules/demo/demoConfig.js");
const REL = "frontend/src/modules/demo/demoConfig.js";
const IMPORT = "../../constants/generated/coreKeys";
const tables = new Tables();

function run(source, file = FILE, rel = REL) {
  const result = analyze(file, source, tables, rel);
  assert.equal(result.abort, null, result.abort ?? "");
  const out = result.newText ?? source;
  if (result.newText !== null) assert.equal(selfCheck(file, source, out, tables, rel), null);
  return { result, out };
}

test("object keys, computed members, values and array elements", () => {
  const { out, result } = run(
    'import a from "a";\nexport const x = { "Bolt.Diameter": 1, y: "Bolt.Grade", z: ["Bolt.Type"] };\nconst v = x["Load.Axial"];\n',
  );
  assert.equal(
    out,
    `import a from "a";\nimport { KEY_AXIAL, KEY_D, KEY_GRD, KEY_TYP } from "${IMPORT}";\nexport const x = { [KEY_D]: 1, y: KEY_GRD, z: [KEY_TYP] };\nconst v = x[KEY_AXIAL];\n`,
  );
  assert.equal(result.replacements, 4);
});

test("undotted identifier and literal keys become computed keys; shorthand is left alone", () => {
  const { out } = run("const Module = 1;\nexport const a = { End_1: 1, 'Material': 2, Module };\nconst b = a['End_2'];\nconst c = a.End_1;\n");
  assert.match(out, /\{ \[KEY_END1\]: 1, \[KEY_MATERIAL\]: 2, Module \}/);
  assert.match(out, /a\[KEY_END2\]/);
  assert.match(out, /a\.End_1;/);
});

test("undotted keys are not touched outside key positions or outside src/modules", () => {
  const source = 'const label = "Module";\nfoo("Material");\nexport const k = { Module: 1 };\n';
  const { out } = run(source, path.join(ROOT, "frontend/src/utils/u.js"), "frontend/src/utils/u.js");
  assert.equal(out, source);
  const inModules = run(source).out;
  assert.match(inModules, /const label = "Module";/);
  assert.match(inModules, /\[KEY_MODULE\]: 1/);
});

test("template literals without expressions and JSX attributes", () => {
  const { out } = run("export const t = `Bolt.Grade`;\nexport const u = `Bolt.Grade ${1}`;\nexport const el = <Field name=\"Bolt.Type\" />;\n");
  assert.match(out, /export const t = KEY_GRD;/);
  assert.match(out, /`Bolt.Grade \$\{1\}`/);
  assert.match(out, /name=\{KEY_TYP\}/);
});

test("import sources, directives and export names are skipped", () => {
  const source = '"use strict";\nimport x from "Foo.Bar";\nexport { x as "Bolt.Grade" };\n';
  const { out, result } = run(source);
  assert.equal(out, source);
  assert.ok(result.counts.skipped >= 1);
});

test("non-ASCII text before a key", () => {
  const { out } = run('const label = "µ→é"; const k = "Bolt.Grade";\n');
  assert.match(out, /const label = "µ→é"; const k = KEY_GRD;/);
});

test("BOM and CRLF are kept", () => {
  const source = '﻿import a from "a";\r\nexport const k = "Bolt.Grade";\r\n';
  const { out } = run(source);
  assert.ok(out.startsWith("﻿"));
  assert.ok(!/(?<!\r)\n/.test(out));
});

test("merges into an existing import, sorted, and wraps at 100 columns", () => {
  const first = run(`import { KEY_TYP, KEY_D } from "${IMPORT}";\nexport const k = ["Bolt.Grade", KEY_D, KEY_TYP];\n`).out;
  assert.equal(first.split("\n")[0], `import { KEY_D, KEY_GRD, KEY_TYP } from "${IMPORT}";`);
  const names = ["KEY_DP_DETAILING_GAP", "KEY_DP_DETAILING_EDGE_TYPE", "KEY_DP_DETAILING_CORROSIVE_INFLUENCES", "KEY_DP_DETAILING_PACKING_PLATE"];
  const wrapped = run(`import { ${names.join(", ")} } from "${IMPORT}";\nexport const k = ["Bolt.Grade", ${names.join(", ")}];\n`).out;
  assert.match(wrapped, /^import \{\n  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,\n/);
  assert.match(wrapped, /  KEY_GRD,\n\} from /);
});

test("an import with a comment gets a second statement", () => {
  const { out } = run(`import { KEY_D } from "${IMPORT}"; // diameter\nexport const k = ["Bolt.Grade", KEY_D];\n`);
  assert.match(out, /import \{ KEY_D \} from "[^"]+"; \/\/ diameter\nimport \{ KEY_GRD \} from /);
});

test("a file without imports gets the import at the top", () => {
  const { out } = run('export const k = "Bolt.Grade";\n');
  assert.equal(out, `import { KEY_GRD } from "${IMPORT}";\n\nexport const k = KEY_GRD;\n`);
});

test("shadowing aborts the file", () => {
  const local = analyze(FILE, 'const KEY_GRD = 3;\nexport const k = "Bolt.Grade";\n', tables, REL);
  assert.match(local.abort, /KEY_GRD is already bound/);
  const param = analyze(FILE, 'export function f(KEY_GRD) { return { "Bolt.Grade": 1 }; }\n', tables, REL);
  assert.match(param.abort, /KEY_GRD/);
  const elsewhere = analyze(FILE, 'import { KEY_GRD } from "./other";\nexport const k = "Bolt.Grade";\n', tables, REL);
  assert.match(elsewhere.abort, /KEY_GRD/);
});

test("an ambiguous value without a rule aborts, with a rule it is resolved", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "choices-"));
  const choices = path.join(dir, "choices.json");
  fs.writeFileSync(choices, JSON.stringify({ undotted: [], ambiguous: {} }));
  const bare = new Tables(choices);
  const result = analyze(FILE, 'export const k = "Bolt.Diameter";\n', bare, REL);
  assert.match(result.abort, /no rule/);
  fs.rmSync(dir, { recursive: true });
  assert.equal(tables.resolve("Bolt.Diameter", REL, null), "KEY_D");
  assert.equal(tables.resolve("Weld.Type", REL, null), "KEY_WELD_TYPE");
  assert.equal(tables.resolve("Weld.Size", REL, "map_tuple_list"), "KEY_OUT_WELD_SIZE");
  assert.equal(tables.resolve("Material", REL, null), "KEY_MATERIAL");
});

test("unknown keys are counted and left alone", () => {
  const { out, result } = run('export const k = "Nothing.Known";\n');
  assert.equal(out, 'export const k = "Nothing.Known";\n');
  assert.equal(result.counts.unknown, 1);
});

test("a second pass changes nothing", () => {
  const { out } = run('export const k = { "Bolt.Grade": 1 };\n');
  const again = analyze(FILE, out, tables, REL);
  assert.equal(again.abort, null);
  assert.equal(again.newText, null);
});

test("the tree comparison catches a wrong name", () => {
  const old = 'export const k = "Bolt.Grade";\n';
  assert.match(selfCheck(FILE, old, `import { KEY_TYP } from "${IMPORT}";\nexport const k = KEY_TYP;\n`, tables, REL), /tree comparison failed/);
  assert.equal(selfCheck(FILE, old, `import { KEY_GRD } from "${IMPORT}";\nexport const k = KEY_GRD;\n`, tables, REL), null);
});

test("purlin is refused and tests are skipped", () => {
  assert.throws(() => collectFiles(["frontend/src/modules/flexuralMember/purlin"]), /purlin/);
  const files = collectFiles(["frontend/src"]).map((f) => path.relative(ROOT, f));
  assert.ok(files.length > 50);
  assert.ok(!files.some((f) => /purlin|generated|__snapshots__|\.test\./.test(f)));
});
