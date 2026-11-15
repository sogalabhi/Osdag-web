#!/usr/bin/env node
// Replace inline design-input key strings with the constants from
// frontend/src/constants/generated/coreKeys.js (and webKeys.js).
//
//   node scripts/codemod_keys.mjs report [paths] [--json]
//   node scripts/codemod_keys.mjs apply  paths [--dry-run]
//   node scripts/codemod_keys.mjs verify paths --base <rev>
//
// The counts, the ambiguity rules and the self-checks match scripts/codemod_keys.py. espree and
// eslint-scope come from frontend/node_modules. Purlin is refused by path; tests, snapshots,
// fixtures and generated files are never touched.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND = path.join(ROOT, "frontend");
const SRC = path.join(FRONTEND, "src");
const GENERATED = path.join(SRC, "constants", "generated");
const CHOICES_PATH = path.join(ROOT, "scripts", "codemod_key_choices.json");
const KEY_FILES = { core: path.join(GENERATED, "coreKeys.js"), web: path.join(GENERATED, "webKeys.js") };
const MAX_COLUMNS = 100;

const requireFromFrontend = createRequire(path.join(FRONTEND, "package.json"));
const espree = requireFromFrontend("espree");
const eslintScope = requireFromFrontend("eslint-scope");
const visitorKeys = requireFromFrontend("eslint-visitor-keys");

const DOTTED = /^[A-Z][A-Za-z0-9_]*( [A-Z][A-Za-z0-9_]*)?(\.[A-Za-z0-9_]+)+$/;
const LOOSE = /^[A-Z][A-Za-z_0-9 ]*\.[A-Za-z_0-9 ]+(\.[A-Za-z_0-9 ]+)*$/;
const NEVER_DIRS = new Set(["test", "tests", "__tests__", "__snapshots__", "fixtures", "generated"]);
const SKIP_KEYS = new Set(["parent", "range", "loc", "start", "end", "raw", "comments", "tokens"]);

class Abort extends Error {}

// --------------------------------------------------------------------------- tables

function parseModule(source) {
  return espree.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
    range: true,
    loc: true,
    comment: true,
  });
}

function readKeyFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const ast = parseModule(fs.readFileSync(file, "utf8"));
  for (const stmt of ast.body) {
    if (stmt.type !== "ExportNamedDeclaration" || stmt.declaration?.type !== "VariableDeclaration") continue;
    for (const decl of stmt.declaration.declarations) {
      if (decl.init?.type === "Literal" && typeof decl.init.value === "string") out[decl.id.name] = decl.init.value;
    }
  }
  return out;
}

export class Tables {
  constructor(choicesPath = CHOICES_PATH, keyFiles = KEY_FILES) {
    this.values = new Map(); // name -> value
    this.moduleOf = new Map(); // name -> "core" | "web"
    this.keyFiles = keyFiles;
    for (const kind of ["core", "web"]) {
      for (const [name, value] of Object.entries(readKeyFile(keyFiles[kind]))) {
        this.values.set(name, value);
        this.moduleOf.set(name, kind);
      }
    }
    this.byValue = new Map();
    for (const [name, value] of this.values) {
      if (!this.byValue.has(value)) this.byValue.set(value, []);
      this.byValue.get(value).push(name);
    }
    const choices = JSON.parse(fs.readFileSync(choicesPath, "utf8"));
    this.undotted = new Set(choices.undotted);
    this.ambiguous = choices.ambiguous;
    this.validateChoices();
  }

  validateChoices() {
    for (const value of this.undotted) {
      if (!this.byValue.has(value)) throw new Error(`codemod_key_choices.json: undotted value ${JSON.stringify(value)} has no constant`);
      this.resolve(value, "", null, true);
    }
    for (const [value, entry] of Object.entries(this.ambiguous)) {
      const names = this.byValue.get(value) ?? [];
      if (names.length < 2) throw new Error(`codemod_key_choices.json: ${JSON.stringify(value)} is not ambiguous in the core`);
      for (const pick of [...(entry.rules ?? []).map((r) => r.name), entry.default]) {
        if (!names.includes(pick)) throw new Error(`codemod_key_choices.json: ${pick} does not have the value ${JSON.stringify(value)}`);
      }
    }
  }

  resolve(value, rel, func, strict = false) {
    const names = this.byValue.get(value) ?? [];
    if (names.length === 1) return names[0];
    const entry = this.ambiguous[value];
    if (!names.length || !entry) {
      if (strict) throw new Error(`codemod_key_choices.json: no rule for the ambiguous value ${JSON.stringify(value)}`);
      return null;
    }
    for (const rule of entry.rules ?? []) {
      if (rule.path && !globMatch(rule.path, rel)) continue;
      if (rule.function && !(func && new RegExp(rule.function).test(func))) continue;
      return rule.name;
    }
    return entry.default;
  }
}

export function globMatch(pattern, rel) {
  let regex = "";
  for (let i = 0; i < pattern.length; i++) {
    if (pattern.startsWith("**", i)) {
      regex += ".*";
      i += 1;
    } else if (pattern[i] === "*") regex += "[^/]*";
    else if (pattern[i] === "?") regex += "[^/]";
    else regex += pattern[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${regex}$`).test(rel);
}

// --------------------------------------------------------------------------- paths

const relPath = (file) => path.relative(ROOT, path.resolve(file)).split(path.sep).join("/");
const isPurlin = (file) => file.split(/[\\/]/).some((part) => part.toLowerCase() === "purlin");

function neverTouch(rel) {
  const parts = rel.split("/");
  const name = parts[parts.length - 1];
  if (parts.slice(0, -1).some((part) => NEVER_DIRS.has(part))) return true;
  if (/\.(test|spec)\.[jt]sx?$/.test(name) || name === "webKeys.js") return true;
  return !/\.(js|jsx)$/.test(name);
}

const undottedAllowed = (rel) => rel.startsWith("frontend/src/modules/");

export function collectFiles(paths) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      const rel = relPath(full);
      if (isPurlin(rel) || entry.name === "node_modules") continue;
      if (entry.isDirectory()) walk(full);
      else if (!neverTouch(rel)) files.push(full);
    }
  };
  for (const raw of paths) {
    if (isPurlin(raw)) throw new Error(`refusing ${raw}: purlin is not converted`);
    const full = path.resolve(raw);
    if (!fs.existsSync(full)) throw new Error(`no such path: ${raw}`);
    if (!relPath(full).startsWith("frontend/src")) throw new Error(`${raw} is outside frontend/src`);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (neverTouch(relPath(full))) console.error(`skipped ${relPath(full)} (never touched)`);
    else files.push(full);
  }
  return files;
}

// --------------------------------------------------------------------------- scanning

function* children(node) {
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) if (item && typeof item.type === "string") yield [key, item];
    } else if (value && typeof value.type === "string") yield [key, value];
  }
}

function functionName(node, parents) {
  for (let current = node; current; current = parents.get(current)?.node) {
    if (current.type === "FunctionDeclaration" && current.id) return current.id.name;
    if (current.type === "FunctionExpression" || current.type === "ArrowFunctionExpression") {
      const parent = parents.get(current)?.node;
      if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") return parent.id.name;
      if (parent?.type === "Property" && parent.key.type === "Identifier") return parent.key.name;
      if (current.id) return current.id.name;
    }
  }
  return null;
}

/** Strings that may be replaced: [{node, kind, shape, value, func}], plus skipped looking-like-key strings. */
function scan(ast, rel, tables) {
  const parents = new Map();
  const found = [];
  let skipped = 0;
  const visit = (node, parent, field) => {
    if (parent) parents.set(node, { node: parent, field });
    const isString = node.type === "Literal" && typeof node.value === "string";
    const isTemplate = node.type === "TemplateLiteral" && node.expressions.length === 0 && node.quasis.length === 1 && node.quasis[0].value.cooked != null;
    const isKeyIdentifier = node.type === "Identifier" && parent?.type === "Property" && field === "key" && !parent.computed && !parent.shorthand;
    if (isString || isTemplate || isKeyIdentifier) {
      const value = isString ? node.value : isTemplate ? node.quasis[0].value.cooked : node.name;
      classify(node, parent, field, value, isKeyIdentifier);
    }
    for (const [key, child] of children(node)) visit(child, node, key);
  };
  const classify = (node, parent, field, value, isKeyIdentifier) => {
    const looseHit = LOOSE.test(value);
    const skipContext =
      (parent?.type === "ExpressionStatement" && parent.directive !== undefined && field === "expression") ||
      (["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(parent?.type) && field === "source") ||
      ["ImportSpecifier", "ExportSpecifier", "ImportAttribute"].includes(parent?.type) ||
      parent?.type === "TaggedTemplateExpression";
    if (skipContext) {
      if (looseHit) skipped++;
      return;
    }
    const keyPosition =
      (parent?.type === "Property" && field === "key") ||
      (["MethodDefinition", "PropertyDefinition"].includes(parent?.type) && field === "key") ||
      (parent?.type === "MemberExpression" && parent.computed && field === "property");
    let kind = null;
    if (!isKeyIdentifier && DOTTED.test(value)) kind = "dotted";
    else if (tables.undotted.has(value) && undottedAllowed(rel) && keyPosition) kind = "undotted";
    if (!kind) {
      if (!isKeyIdentifier && looseHit) skipped++;
      return;
    }
    let shape = "plain";
    if (["Property", "MethodDefinition", "PropertyDefinition"].includes(parent.type) && field === "key" && !parent.computed) shape = "key";
    else if (parent.type === "JSXAttribute" && field === "value") shape = "jsx";
    found.push({ node, kind, shape, value, parent, field });
  };
  visit(ast, null, null);
  return { found, parents, skipped };
}

// --------------------------------------------------------------------------- imports and scopes

function analyzeScopes(ast) {
  return eslintScope.analyze(ast, {
    ecmaVersion: 2025,
    sourceType: "module",
    childVisitorKeys: visitorKeys.KEYS,
    fallback: "iteration",
  });
}

const resolvesToKeyFile = (file, source, tables) => {
  const base = path.resolve(path.dirname(file), source);
  return [tables.keyFiles.core, tables.keyFiles.web].some((target) => base === target || `${base}.js` === target);
};

function keyImports(ast, file, tables) {
  return ast.body.filter((s) => s.type === "ImportDeclaration" && typeof s.source.value === "string" && resolvesToKeyFile(file, s.source.value, tables));
}

function specifierText(spec) {
  if (spec.type !== "ImportSpecifier") return null;
  const imported = spec.imported.type === "Identifier" ? spec.imported.name : JSON.stringify(spec.imported.value);
  return spec.local.name === imported ? imported : `${imported} as ${spec.local.name}`;
}

function renderImport(names, source, newline) {
  const one = `import { ${names.join(", ")} } from ${source};`;
  if (one.length <= MAX_COLUMNS) return one;
  return `import {${newline}${names.map((n) => `  ${n},${newline}`).join("")}} from ${source};`;
}

function relativeSource(file, target) {
  let rel = path.relative(path.dirname(file), target).split(path.sep).join("/").replace(/\.js$/, "");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return JSON.stringify(rel);
}

// --------------------------------------------------------------------------- planning

function newResult(rel) {
  return { rel, counts: { one: 0, ambiguous: 0, unknown: 0, undotted: 0, skipped: 0 }, abort: null, warnings: [], unresolved: [], unknownValues: [], newText: null, replacements: 0 };
}

const total = (r) => r.counts.one + r.counts.ambiguous + r.counts.unknown + r.counts.undotted;

export function analyze(file, data, tables, rel = relPath(file)) {
  const result = newResult(rel);
  try {
    plan(result, file, data, tables);
  } catch (error) {
    if (!(error instanceof Abort)) throw error;
    result.abort = error.message;
    result.newText = null;
  }
  return result;
}

function plan(result, file, data, tables) {
  const rel = result.rel;
  const bom = data.startsWith("﻿");
  const text = bom ? data.slice(1) : data;
  let ast;
  try {
    ast = parseModule(text);
  } catch (error) {
    throw new Abort(`cannot parse: ${error.message}`);
  }
  const crlf = (text.match(/\r\n/g) ?? []).length * 2 > (text.match(/\n/g) ?? []).length;
  const newline = crlf ? "\r\n" : "\n";
  const { found, parents, skipped } = scan(ast, rel, tables);
  result.counts.skipped = skipped;

  const hits = [];
  for (const hit of found) {
    const names = tables.byValue.get(hit.value) ?? [];
    if (!names.length) {
      result.counts.unknown++;
      result.unknownValues.push(hit.value);
      continue;
    }
    hit.chosen = tables.resolve(hit.value, rel, functionName(hit.node, parents));
    if (hit.kind === "undotted") result.counts.undotted++;
    else result.counts[names.length === 1 ? "one" : "ambiguous"]++;
    if (!hit.chosen) result.unresolved.push(`${rel}:${hit.node.loc.start.line}: ${JSON.stringify(hit.value)} has several constants ${names.join(", ")} and no rule`);
    else hits.push(hit);
  }
  if (result.unresolved.length) throw new Abort(result.unresolved.slice(0, 3).join("; "));
  if (!hits.length) return;

  for (const hit of hits) {
    if (tables.values.get(hit.chosen) !== hit.value) throw new Abort(`${hit.chosen} does not equal ${JSON.stringify(hit.value)}`);
  }
  const needed = new Set(hits.map((h) => h.chosen));

  // Shadowing.
  const manager = analyzeScopes(ast);
  const imports = keyImports(ast, file, tables);
  const importedHere = new Set();
  for (const decl of imports) for (const spec of decl.specifiers) if (spec.type === "ImportSpecifier") importedHere.add(spec);
  for (const scope of manager.scopes) {
    for (const variable of scope.variables) {
      if (!needed.has(variable.name)) continue;
      const allowed = variable.defs.every((def) => def.type === "ImportBinding" && importedHere.has(def.node) && specifierText(def.node) === variable.name);
      if (!allowed) throw new Abort(`${variable.name} is already bound at line ${variable.defs[0]?.name.loc.start.line ?? "?"}`);
    }
  }

  // Edits.
  const edits = [];
  for (const hit of hits) {
    const { node } = hit;
    const [start, end] = node.range;
    if (node.type === "Literal") {
      const reparsed = (() => {
        try {
          return espree.parse(`(${node.raw})`, { ecmaVersion: "latest" }).body[0].expression.value;
        } catch {
          return undefined;
        }
      })();
      if (text.slice(start, end) !== node.raw || reparsed !== hit.value) throw new Abort(`line ${node.loc.start.line}: not a single plain string token`);
    }
    const body = hit.shape === "key" ? `[${hit.chosen}]` : hit.shape === "jsx" ? `{${hit.chosen}}` : hit.chosen;
    edits.push([start, end, body]);
  }

  // Imports.
  const groups = { core: new Set(), web: new Set() };
  for (const name of needed) groups[tables.moduleOf.get(name)].add(name);
  const commentLines = ast.comments.flatMap((c) => [c.loc.start.line, c.loc.end.line]);
  const lastImport = ast.body.filter((s) => s.type === "ImportDeclaration").at(-1);
  const insertions = [];
  for (const kind of ["core", "web"]) {
    const wanted = groups[kind];
    if (!wanted.size) continue;
    const target = tables.keyFiles[kind];
    const existing = ast.body.filter(
      (s) => s.type === "ImportDeclaration" && typeof s.source.value === "string" && s.specifiers.length && s.specifiers.every((x) => x.type === "ImportSpecifier") && resolvesToKeyFileKind(file, s.source.value, target),
    );
    const present = new Set(existing.flatMap((s) => s.specifiers.filter((x) => x.local.name === (x.imported.name ?? x.imported.value)).map((x) => x.local.name)));
    const missing = [...wanted].filter((n) => !present.has(n)).sort();
    if (!missing.length) continue;
    const merge = existing.find((s) => !commentLines.some((line) => line >= s.loc.start.line && line <= s.loc.end.line));
    if (merge) {
      const names = [...merge.specifiers.map(specifierText), ...missing].sort((a, b) => {
        const [x, y] = [a.split(" as ")[0], b.split(" as ")[0]];
        return x < y ? -1 : x > y ? 1 : 0;
      });
      edits.push([merge.range[0], merge.range[1], renderImport(names, text.slice(merge.source.range[0], merge.source.range[1]), newline)]);
    } else {
      insertions.push(renderImport(missing, relativeSource(file, target), newline));
    }
  }
  if (insertions.length) {
    const block = insertions.join(newline) + newline;
    if (lastImport) {
      const lineEnd = text.indexOf("\n", lastImport.range[1]);
      const rest = text.slice(lastImport.range[1], lineEnd === -1 ? text.length : lineEnd).trim();
      if (rest && !rest.startsWith("//") && !rest.startsWith("/*")) throw new Abort(`line ${lastImport.loc.end.line}: code follows the import`);
      if (lineEnd === -1) edits.push([text.length, text.length, newline + block]);
      else edits.push([lineEnd + 1, lineEnd + 1, block]);
    } else {
      const directives = ast.body.filter((s) => s.type === "ExpressionStatement" && s.directive !== undefined);
      const after = directives.at(-1);
      if (after) {
        const lineEnd = text.indexOf("\n", after.range[1]);
        edits.push([lineEnd + 1, lineEnd + 1, newline + block]);
      } else edits.push([0, 0, block + newline]);
    }
  }

  edits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (let i = 1; i < edits.length; i++) if (edits[i][0] < edits[i - 1][1]) throw new Abort("overlapping edits");
  let out = "";
  let cursor = 0;
  for (const [start, end, replacement] of edits) {
    out += text.slice(cursor, start) + replacement;
    cursor = end;
  }
  out += text.slice(cursor);
  result.newText = (bom ? "﻿" : "") + out;
  result.replacements = hits.length;
}

function resolvesToKeyFileKind(file, source, target) {
  const base = path.resolve(path.dirname(file), source);
  return base === target || `${base}.js` === target;
}

// --------------------------------------------------------------------------- self-check

function literal(value) {
  return { type: "Literal", value };
}

/** A plain-object copy of the tree with key references replaced by their values. */
function normalize(source, file, tables) {
  const ast = parseModule(source.startsWith("﻿") ? source.slice(1) : source);
  const manager = analyzeScopes(ast);
  const replaced = new Map(); // Identifier node -> value
  for (const scope of manager.scopes) {
    for (const ref of scope.references) {
      const def = ref.resolved?.defs[0];
      if (def?.type !== "ImportBinding" || def.node.type !== "ImportSpecifier") continue;
      if (!resolvesToKeyFile(file, def.parent.source.value, tables)) continue;
      const imported = def.node.imported.type === "Identifier" ? def.node.imported.name : def.node.imported.value;
      if (tables.values.has(imported)) replaced.set(ref.identifier, tables.values.get(imported));
    }
  }
  const dropped = new Set(keyImports(ast, file, tables));
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    if (node.type === "Identifier" && replaced.has(node)) return literal(replaced.get(node));
    if (node.type === "Literal") {
      if (node.regex) return { type: "Literal", regex: node.regex };
      if (node.bigint) return { type: "Literal", bigint: node.bigint };
      return literal(node.value);
    }
    if (node.type === "TemplateLiteral" && node.expressions.length === 0 && node.quasis.length === 1 && node.quasis[0].value.cooked != null) {
      return literal(node.quasis[0].value.cooked);
    }
    if (node.type === "JSXExpressionContainer" && node.expression.type !== "JSXEmptyExpression") {
      const inner = walk(node.expression);
      if (inner.type === "Literal") return inner;
      return { type: node.type, expression: inner };
    }
    const out = {};
    for (const key of Object.keys(node)) {
      if (SKIP_KEYS.has(key) || key === "shorthand") continue;
      if (key === "body" && node.type === "Program") out.body = node.body.filter((s) => !dropped.has(s)).map(walk);
      else out[key] = walk(node[key]);
    }
    if (["Property", "MethodDefinition", "PropertyDefinition"].includes(node.type)) {
      if (!node.computed && node.key.type === "Identifier") out.key = literal(node.key.name);
      out.computed = false;
      if (node.computed && out.key.type !== "Literal") out.computed = true;
    }
    return out;
  };
  return walk(ast);
}

function firstDifference(a, b, where = "Program") {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) return `${where}: ${JSON.stringify(a)?.slice(0, 80)} != ${JSON.stringify(b)?.slice(0, 80)}`;
  if (a && typeof a === "object") {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const found = firstDifference(a[key], b[key], `${where}.${key}`);
      if (found) return found;
    }
    return null;
  }
  return a === b ? null : `${where}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
}

export function selfCheck(file, oldText, newText, tables, rel = relPath(file)) {
  let before, after;
  try {
    after = normalize(newText, file, tables);
    before = normalize(oldText, file, tables);
  } catch (error) {
    return `the new file does not parse: ${error.message}`;
  }
  if (JSON.stringify(before) !== JSON.stringify(after)) return `tree comparison failed at ${firstDifference(before, after)}`;
  const again = analyze(file, newText, tables, rel);
  if (again.abort) return `second pass aborts: ${again.abort}`;
  if (again.newText !== null && again.newText !== newText) return "a second apply would still change this file (it is not fully converted)";
  return null;
}

// --------------------------------------------------------------------------- commands

function readBase(rev, rel) {
  try {
    return execFileSync("git", ["-C", ROOT, "show", `${rev}:${rel}`], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function lineDiff(a, b, rel) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codemod-"));
  try {
    fs.writeFileSync(path.join(dir, "old"), a);
    fs.writeFileSync(path.join(dir, "new"), b);
    execFileSync("diff", ["-u", "--label", `a/${rel}`, "--label", `b/${rel}`, path.join(dir, "old"), path.join(dir, "new")], { encoding: "utf8" });
    return "";
  } catch (error) {
    return String(error.stdout ?? "").trimEnd();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function cmdReport(args, tables) {
  const files = collectFiles(args.paths.length ? args.paths : [SRC]);
  const rows = files.map((file) => analyze(file, fs.readFileSync(file, "utf8"), tables));
  const interesting = rows.filter((r) => total(r) || r.counts.skipped || r.abort);
  if (args.json) {
    console.log(JSON.stringify(interesting.map((r) => ({ file: r.rel, ...r.counts, total: total(r), abort: r.abort, unknownValues: [...new Set(r.unknownValues)].sort() })), null, 2));
    return 0;
  }
  const totals = { one: 0, ambiguous: 0, unknown: 0, undotted: 0, skipped: 0 };
  console.log(`${"file".padEnd(90)} ${"one".padStart(5)} ${"amb".padStart(5)} ${"unk".padStart(5)} ${"undot".padStart(5)} ${"skip".padStart(5)}`);
  for (const r of interesting) {
    const c = r.counts;
    console.log(`${r.rel.padEnd(90)} ${String(c.one).padStart(5)} ${String(c.ambiguous).padStart(5)} ${String(c.unknown).padStart(5)} ${String(c.undotted).padStart(5)} ${String(c.skipped).padStart(5)}${r.abort ? `  ABORT: ${r.abort}` : ""}`);
    for (const key of Object.keys(totals)) totals[key] += c[key];
  }
  console.log(`${"total".padEnd(90)} ${String(totals.one).padStart(5)} ${String(totals.ambiguous).padStart(5)} ${String(totals.unknown).padStart(5)} ${String(totals.undotted).padStart(5)} ${String(totals.skipped).padStart(5)}`);
  console.log(`dotted keys: ${totals.one + totals.ambiguous + totals.unknown}`);
  return 0;
}

function cmdApply(args, tables) {
  const files = collectFiles(args.paths);
  let changed = 0;
  let aborted = 0;
  let replaced = 0;
  for (const file of files) {
    const old = fs.readFileSync(file, "utf8");
    const result = analyze(file, old, tables);
    if (result.abort) {
      aborted++;
      console.log(`ABORT ${result.rel}: ${result.abort}`);
      continue;
    }
    if (result.newText === null || result.newText === old) continue;
    const failure = selfCheck(file, old, result.newText, tables);
    if (failure) {
      aborted++;
      console.log(`FAILED ${result.rel}: ${failure}`);
      continue;
    }
    changed++;
    replaced += result.replacements;
    if (args.dryRun) console.log(lineDiff(old, result.newText, result.rel));
    else fs.writeFileSync(file, result.newText);
  }
  console.log(`${args.dryRun ? "would change" : "changed"} ${changed} files: ${replaced} replacements, ${aborted} files aborted`);
  return aborted ? 1 : 0;
}

function cmdVerify(args, tables) {
  const files = collectFiles(args.paths);
  let failures = 0;
  let checked = 0;
  for (const file of files) {
    const rel = relPath(file);
    const base = readBase(args.base, rel);
    if (base === null) {
      console.log(`skipped ${rel}: not in ${args.base}`);
      continue;
    }
    checked++;
    const failure = selfCheck(file, base, fs.readFileSync(file, "utf8"), tables);
    if (failure) {
      failures++;
      console.log(`FAILED ${rel}: ${failure}`);
    }
  }
  if (failures) {
    console.log(`${failures} of ${checked} files failed`);
    return 1;
  }
  console.log(`OK: ${checked} files verified against ${args.base}`);
  return 0;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, paths: [], json: false, dryRun: false, base: null };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--json") args.json = true;
    else if (rest[i] === "--dry-run") args.dryRun = true;
    else if (rest[i] === "--base") args.base = rest[++i];
    else args.paths.push(rest[i]);
  }
  if (!["report", "apply", "verify"].includes(command)) throw new Error("usage: codemod_keys.mjs report|apply|verify [paths] [--json] [--dry-run] [--base <rev>]");
  if (command !== "report" && !args.paths.length) throw new Error(`${command} needs paths`);
  if (command === "verify" && !args.base) throw new Error("verify needs --base <rev>");
  return args;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const tables = new Tables();
    process.exitCode = { report: cmdReport, apply: cmdApply, verify: cmdVerify }[args.command](args, tables);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
