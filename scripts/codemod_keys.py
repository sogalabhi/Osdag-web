#!/usr/bin/env python
"""Replace inline design-input key strings with the constants from osdag_core/Common.py.

    python scripts/codemod_keys.py report [paths] [--json]
    python scripts/codemod_keys.py apply  paths [--dry-run]
    python scripts/codemod_keys.py verify paths --base <rev>

``report`` counts the key strings in each file: ``one`` (exactly one constant has that value),
``ambiguous`` (several do; scripts/codemod_key_choices.json picks one), ``unknown`` (no
constant has it), ``undotted`` (the curated undotted keys, in key positions only) and
``skipped`` (look like a key but are docstrings, f-string pieces, annotations or sentences).
``apply`` rewrites the files, checks the result and leaves a file untouched when any check
fails. ``verify`` runs the same checks on a working tree against ``git show <rev>:<path>``. It also fails for a file that
a second ``apply`` would still change, so run it on converted paths.

Values are always read from the imported ``osdag_core.Common`` module (and from
``apps/core/web_keys.py``), never by parsing their source. Purlin is refused by path; tests,
migrations, fixtures, snapshots and generated files are never touched. The frontend twin of
this script is scripts/codemod_keys.mjs.
"""
import argparse
import ast
import codecs
import contextlib
import difflib
import importlib.util
import io
import json
import os
import re
import subprocess
import sys
import tokenize
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
CHOICES_PATH = Path(__file__).resolve().parent / "codemod_key_choices.json"
WEB_KEYS_PATH = BACKEND / "apps" / "core" / "web_keys.py"
COMMON_MODULE = "osdag_core.Common"
WEB_KEYS_MODULE = "apps.core.web_keys"
CORE_PREFIXES = ("KEY_", "DISP_", "CONN_")
MAX_COLUMNS = 100

DOTTED = re.compile(r"^[A-Z][A-Za-z0-9_]*( [A-Z][A-Za-z0-9_]*)?(\.[A-Za-z0-9_]+)+$")
# Looser pattern used only to count strings that look like keys but are not eligible.
LOOSE = re.compile(r"^[A-Z][A-Za-z_0-9 ]*\.[A-Za-z_0-9 ]+(\.[A-Za-z_0-9 ]+)*$")
HINT_COMMENT = re.compile(r"^#\s*(?P<name>(?:KEY|DISP|CONN|WEB)_\w+)\s*$")
HINT_MENTION = re.compile(r"\b(?:KEY|DISP|CONN|WEB)_\w+")

UNDOTTED_PATH_PARTS = ("backend/apps/modules/",)
UNDOTTED_FILES = (
    "backend/apps/core/utils/osi_files.py",
    "backend/apps/core/api/design/sync_merge.py",
)
UNDOTTED_EXCLUDED_FILES = ("catalog.py", "osdag_overrides.py")
NEVER_DIRS = {"tests", "test", "migrations", "__pycache__", "fixtures", "__snapshots__", "generated"}
NEVER_FILES = {"web_keys.py", "conftest.py"}
VALIDATOR_ERRORS = {"InvalidInputTypeError", "MissingKeyError"}

TEMPLATE_STR = getattr(ast, "TemplateStr", None)
STRING_NODES = tuple(t for t in (ast.JoinedStr, TEMPLATE_STR) if t is not None)


class Abort(Exception):
    """The file cannot be converted safely; it is left untouched."""


# --------------------------------------------------------------------------- tables


class Tables:
    """Constant names by value, read from the imported modules."""

    def __init__(self, choices_path=CHOICES_PATH):
        os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
        for entry in (str(ROOT), str(BACKEND)):
            if entry not in sys.path:
                sys.path.insert(0, entry)
        with contextlib.redirect_stdout(io.StringIO()):
            from osdag_core import Common
        self.values = {}  # name -> value, every constant that may be imported
        self.module_of = {}  # name -> module that defines it
        for name, value in vars(Common).items():
            if name.startswith(CORE_PREFIXES) and isinstance(value, str):
                self.values[name] = value
                self.module_of[name] = COMMON_MODULE
        spec = importlib.util.spec_from_file_location("_codemod_web_keys", WEB_KEYS_PATH)
        web = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(web)
        for name, value in vars(web).items():
            if name.startswith("WEB_") and isinstance(value, str):
                self.values[name] = value
                self.module_of[name] = WEB_KEYS_MODULE
        self.by_value = defaultdict(list)
        for name, value in self.values.items():
            self.by_value[value].append(name)
        self.choices = json.loads(Path(choices_path).read_text(encoding="utf-8"))
        self.undotted = list(self.choices["undotted"])
        self.ambiguous = self.choices["ambiguous"]
        self._validate_choices()

    def _validate_choices(self):
        for value in self.undotted:
            if value not in self.by_value:
                raise SystemExit(f"codemod_key_choices.json: undotted value {value!r} has no constant")
            self.resolve(value, "", None, strict=True)
        for value, entry in self.ambiguous.items():
            names = self.by_value.get(value, [])
            if len(names) < 2:
                raise SystemExit(f"codemod_key_choices.json: {value!r} is not ambiguous in the core")
            picks = [rule["name"] for rule in entry.get("rules", [])] + [entry["default"]]
            for pick in picks:
                if pick not in names:
                    raise SystemExit(f"codemod_key_choices.json: {pick} does not have the value {value!r}")

    def resolve(self, value, rel, func, strict=False):
        """The constant name for a value, or None when several qualify and no rule decides."""
        names = self.by_value.get(value, [])
        if len(names) == 1:
            return names[0]
        entry = self.ambiguous.get(value)
        if not names or entry is None:
            if strict:
                raise SystemExit(f"codemod_key_choices.json: no rule for the ambiguous value {value!r}")
            return None
        for rule in entry.get("rules", []):
            if "path" in rule and not glob_match(rule["path"], rel):
                continue
            if "function" in rule and not (func and re.search(rule["function"], func)):
                continue
            return rule["name"]
        return entry["default"]


def glob_match(pattern, rel):
    regex = ""
    i = 0
    while i < len(pattern):
        if pattern.startswith("**", i):
            regex += ".*"
            i += 2
        elif pattern[i] == "*":
            regex += "[^/]*"
            i += 1
        elif pattern[i] == "?":
            regex += "[^/]"
            i += 1
        else:
            regex += re.escape(pattern[i])
            i += 1
    return re.fullmatch(regex, rel) is not None


# --------------------------------------------------------------------------- paths


def rel_path(path):
    return Path(os.path.abspath(path)).relative_to(ROOT).as_posix()


def is_purlin(path):
    return any(part.lower() == "purlin" for part in Path(path).parts)


def never_touch(rel):
    parts = rel.split("/")
    name = parts[-1]
    if any(part in NEVER_DIRS for part in parts[:-1]):
        return True
    return name in NEVER_FILES or name.startswith("test_") or not name.endswith(".py")


def undotted_allowed(rel):
    if os.path.basename(rel) in UNDOTTED_EXCLUDED_FILES:
        return False
    return rel in UNDOTTED_FILES or any(rel.startswith(prefix) for prefix in UNDOTTED_PATH_PARTS)


def collect_files(paths):
    """Python files under the given paths. Purlin is refused; never-touch files are skipped."""
    files = []
    for raw in paths:
        if is_purlin(raw):
            raise SystemExit(f"refusing {raw}: purlin is not converted")
        path = Path(raw).resolve()
        if not path.exists():
            raise SystemExit(f"no such path: {raw}")
        if path.is_file():
            if never_touch(rel_path(path)):
                print(f"skipped {rel_path(path)} (never touched)", file=sys.stderr)
                continue
            files.append(path)
            continue
        for found in sorted(path.rglob("*.py")):
            rel = rel_path(found)
            if is_purlin(rel) or never_touch(rel):
                continue
            files.append(found)
    return files


# --------------------------------------------------------------------------- scanning


class Scan:
    """One pass over a syntax tree: strings, name uses and bound names."""

    def __init__(self, tree):
        self.constants = []  # (node, parent, field, skip, func, deferred)
        self.loads = []  # (Name, deferred)
        self.bound = []  # (name, owner node)
        self.parents = {}
        self._visit(tree, None, None, False)

    def _bind(self, name, owner):
        self.bound.append((name, owner))

    def _visit(self, node, skip, func, deferred):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            self._bind(node.name, node)
        elif isinstance(node, ast.arg):
            self._bind(node.arg, node)
        elif isinstance(node, ast.ExceptHandler) and node.name:
            self._bind(node.name, node)
        elif isinstance(node, (ast.MatchAs, ast.MatchStar)) and node.name:
            self._bind(node.name, node)
        elif isinstance(node, ast.MatchMapping) and node.rest:
            self._bind(node.rest, node)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                if alias.name == "*":
                    continue
                bound = alias.asname or (alias.name.split(".")[0] if isinstance(node, ast.Import) else alias.name)
                self._bind(bound, node)
        elif isinstance(node, ast.Name):
            if isinstance(node.ctx, ast.Load):
                self.loads.append((node, deferred))
            else:
                self._bind(node.id, node)
        for field, value in ast.iter_fields(node):
            children = value if isinstance(value, list) else [value]
            for child in children:
                if not isinstance(child, ast.AST):
                    continue
                child_skip, child_func, child_deferred = skip, func, deferred
                if skip is None:
                    if isinstance(node, STRING_NODES) and isinstance(child, ast.Constant):
                        child_skip = "fstring"
                    elif isinstance(node, ast.pattern):
                        child_skip = "pattern"
                    elif field in ("annotation", "returns"):
                        child_skip = "annotation"
                    elif isinstance(node, ast.Expr) and isinstance(child, ast.Constant):
                        child_skip = "docstring"
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and field == "body":
                    child_func, child_deferred = node.name, True
                if isinstance(node, ast.Lambda) and field == "body":
                    child_deferred = True
                self.parents[child] = (node, field)
                if isinstance(child, ast.Constant) and isinstance(child.value, str):
                    self.constants.append((child, node, field, child_skip, child_func, child_deferred))
                self._visit(child, child_skip, child_func, child_deferred)


def is_key_position(node, parent, field):
    if isinstance(parent, ast.Dict):
        return field == "keys"
    if isinstance(parent, ast.Subscript):
        return field == "slice"
    if isinstance(parent, ast.Call):
        func = parent.func
        first = bool(parent.args) and parent.args[0] is node
        if isinstance(func, ast.Attribute) and func.attr in ("get", "pop", "setdefault"):
            return first
        if isinstance(func, ast.Name) and func.id in VALIDATOR_ERRORS:
            return first
        return False
    if isinstance(parent, (ast.List, ast.Tuple)):
        return True
    return isinstance(parent, ast.Compare)


class Hit:
    def __init__(self, node, value, kind, func, deferred):
        self.node = node
        self.value = value
        self.kind = kind  # dotted | undotted
        self.func = func
        self.deferred = deferred
        self.names = []
        self.status = None  # one | amb | unknown
        self.chosen = None
        self.in_local_copy = False


class FileResult:
    def __init__(self, rel):
        self.rel = rel
        self.counts = dict(one=0, ambiguous=0, unknown=0, undotted=0, skipped=0)
        self.abort = None
        self.warnings = []
        self.unresolved = []
        self.new_bytes = None
        self.replacements = 0
        self.local_copies = 0
        self.unknown_values = []

    @property
    def total(self):
        c = self.counts
        return c["one"] + c["ambiguous"] + c["unknown"] + c["undotted"]


# --------------------------------------------------------------------------- planning


def line_starts_of(body):
    starts = [0]
    for line in body.split(b"\n")[:-1]:
        starts.append(starts[-1] + len(line) + 1)
    return starts


def single_string_token(segment, value):
    try:
        tokens = [
            t
            for t in tokenize.generate_tokens(io.StringIO(segment).readline)
            if t.type not in (tokenize.NEWLINE, tokenize.NL, tokenize.ENDMARKER, tokenize.INDENT, tokenize.DEDENT, tokenize.COMMENT)
        ]
    except (tokenize.TokenError, IndentationError, SyntaxError):
        return False
    if len(tokens) != 1 or tokens[0].type != tokenize.STRING:
        return False
    text = tokens[0].string
    if text != segment or text[0] not in "'\"":
        return False
    try:
        return ast.literal_eval(text) == value
    except (ValueError, SyntaxError):
        return False


def render_from_import(module, names, newline):
    one_line = f"from {module} import " + ", ".join(names)
    if len(one_line) <= MAX_COLUMNS:
        return one_line
    body = "".join(f"    {name},{newline}" for name in names)
    return f"from {module} import ({newline}{body})"


def alias_text(alias):
    return alias.name if alias.asname is None else f"{alias.name} as {alias.asname}"


def analyze(rel, data, tables):
    """Plan the rewrite of one file. Returns a FileResult; ``new_bytes`` is set when edits apply."""
    result = FileResult(rel)
    try:
        _analyze(result, data, tables)
    except Abort as error:
        result.abort = str(error)
        result.new_bytes = None
    return result


def _analyze(result, data, tables):
    rel = result.rel
    bom = data.startswith(codecs.BOM_UTF8)
    body = data[len(codecs.BOM_UTF8):] if bom else data
    if re.search(rb"\r(?!\n)", body):
        raise Abort("lone carriage return line endings")
    try:
        text = body.decode("utf-8")
        tree = ast.parse(text, filename=rel)
    except (UnicodeDecodeError, SyntaxError) as error:
        raise Abort(f"cannot parse: {error}")
    newline = "\r\n" if body.count(b"\r\n") * 2 > body.count(b"\n") else "\n"
    starts = line_starts_of(body)
    lines = body.split(b"\n")

    def offset(lineno, col):
        return starts[lineno - 1] + col

    scan = Scan(tree)

    # Local copies of core constants.
    copies = []
    for stmt in tree.body:
        if not (isinstance(stmt, ast.Assign) and len(stmt.targets) == 1 and isinstance(stmt.targets[0], ast.Name)):
            continue
        name = stmt.targets[0].id
        if not (name.startswith(CORE_PREFIXES) and isinstance(stmt.value, ast.Constant) and isinstance(stmt.value.value, str)):
            continue
        core = tables.values.get(name)
        if core is None or tables.module_of[name] != COMMON_MODULE:
            continue
        if core != stmt.value.value:
            raise Abort(f"local {name} = {stmt.value.value!r} differs from the core value {core!r}")
        copies.append(stmt)
    copy_names = {stmt.targets[0].id for stmt in copies}
    copy_values = {id(stmt.value) for stmt in copies}

    # Strings.
    hits = []
    for node, parent, field, skip, func, deferred in scan.constants:
        value = node.value
        if skip is not None:
            if LOOSE.match(value):
                result.counts["skipped"] += 1
            continue
        if DOTTED.match(value):
            kind = "dotted"
        elif value in tables.undotted and undotted_allowed(rel) and is_key_position(node, parent, field):
            kind = "undotted"
        else:
            if LOOSE.match(value):
                result.counts["skipped"] += 1
            continue
        hit = Hit(node, value, kind, func, deferred)
        hit.in_local_copy = id(node) in copy_values
        hit.names = tables.by_value.get(value, [])
        if not hit.names:
            hit.status = "unknown"
            result.counts["unknown"] += 1
            result.unknown_values.append(value)
        else:
            hit.status = "one" if len(hit.names) == 1 else "amb"
            hit.chosen = tables.resolve(value, rel, func)
            if kind == "undotted":
                result.counts["undotted"] += 1
            else:
                result.counts["one" if hit.status == "one" else "ambiguous"] += 1
            if hit.chosen is None:
                result.unresolved.append(f"{rel}:{node.lineno}: {value!r} has several constants {hit.names} and no rule")
        hits.append(hit)
    if result.unresolved:
        raise Abort("; ".join(result.unresolved[:3]) + (" ..." if len(result.unresolved) > 3 else ""))

    replace = [h for h in hits if h.chosen and not h.in_local_copy]
    if not replace and not copies:
        return

    # Names to import.
    needed = {h.chosen for h in replace} | copy_names
    for hit in replace:
        if tables.values[hit.chosen] != hit.value:
            raise Abort(f"{hit.chosen} does not equal {hit.value!r}")

    # Shadowing.
    allowed_binders = set()
    for name, owner in scan.bound:
        if isinstance(owner, ast.ImportFrom) and owner.level == 0 and owner.module in (COMMON_MODULE, WEB_KEYS_MODULE):
            if any(a.name == name and a.asname is None for a in owner.names):
                allowed_binders.add((name, id(owner)))
    copy_targets = {id(stmt.targets[0]) for stmt in copies}
    for name, owner in scan.bound:
        if name not in needed:
            continue
        if (name, id(owner)) in allowed_binders or id(owner) in copy_targets:
            continue
        raise Abort(f"{name} is already bound at line {getattr(owner, 'lineno', '?')}")

    # Single-token check and span offsets.
    edits = []  # (start, end, bytes)
    for hit in replace:
        node = hit.node
        start = offset(node.lineno, node.col_offset)
        end = offset(node.end_lineno, node.end_col_offset)
        segment = body[start:end].decode("utf-8")
        if not single_string_token(segment, hit.value):
            raise Abort(f"line {node.lineno}: {segment[:40]!r} is not a single plain string token")
        hit.span = (start, end)
        edits.append((start, end, hit.chosen.encode()))

    # Hint comments.
    comments = trailing_comments(text)
    by_end_line = defaultdict(list)
    for hit in replace:
        by_end_line[hit.node.end_lineno].append(hit)
    for lineno, group in by_end_line.items():
        comment = comments.get(lineno)
        if comment is None:
            continue
        line_text, col, token = comment
        comment_start = starts[lineno - 1] + len(line_text[:col].encode("utf-8"))
        last_end = max(h.span[1] for h in group)
        between = body[last_end:comment_start].decode("utf-8")
        if between.strip(" \t,)]}") != "":
            continue
        match = HINT_COMMENT.match(token)
        if match and len(group) == 1 and match.group("name") == group[0].chosen:
            cut = comment_start
            while cut > starts[lineno - 1] and body[cut - 1:cut] in (b" ", b"\t"):
                cut -= 1
            edits.append((cut, comment_start + len(token.encode("utf-8")), b""))
        elif HINT_MENTION.search(token):
            names = ", ".join(sorted(h.chosen for h in group))
            result.warnings.append(f"{rel}:{lineno}: comment {token!r} does not match {names}")

    # Deleted local copies.
    drop = []
    for stmt in copies:
        first, last = stmt.lineno, stmt.end_lineno
        if stmt.col_offset != 0:
            raise Abort(f"line {first}: local constant is not at the start of its line")
        after = lines[last - 1][stmt.end_col_offset:].decode("utf-8").strip()
        if after and not after.startswith("#"):
            raise Abort(f"line {last}: code follows the local constant {stmt.targets[0].id}")
        drop.append([first, last])
    drop.sort()
    merged = []
    for first, last in drop:
        if merged and first <= merged[-1][1] + 1:
            merged[-1][1] = max(merged[-1][1], last)
        else:
            merged.append([first, last])
    for first, last in merged:
        previous_blank = first == 1 or not lines[first - 2].strip()
        while previous_blank and last < len(lines) and not lines[last].strip():
            last += 1
        edits.append((starts[first - 1], starts[last] if last < len(starts) else len(body), b""))
    result.local_copies = len(copies)

    # Imports.
    import_edits, bound = plan_imports(tree, tables, needed, body, starts, lines, newline)
    edits.extend(import_edits)
    used = defaultdict(list)
    for hit in replace:
        if not hit.deferred:
            used[hit.chosen].append(hit.node.lineno)
    for node, deferred in scan.loads:
        if node.id in copy_names and not deferred:
            used[node.id].append(node.lineno)
    for name, linenos in used.items():
        if min(linenos) <= bound[name]:
            raise Abort(f"{name} is used at line {min(linenos)}, before its import ends at line {bound[name]}")

    # Apply.
    edits.sort(key=lambda e: (e[0], e[1]))
    for previous, current in zip(edits, edits[1:]):
        if current[0] < previous[1]:
            raise Abort("overlapping edits")
    out = bytearray()
    cursor = 0
    for start, end, replacement in edits:
        out += body[cursor:start]
        out += replacement
        cursor = end
    out += body[cursor:]
    result.new_bytes = (codecs.BOM_UTF8 if bom else b"") + bytes(out)
    result.replacements = len(replace)


def trailing_comments(text):
    """Line number -> (line text, column of the comment, comment text) for comments after code."""
    found = {}
    try:
        for token in tokenize.generate_tokens(io.StringIO(text).readline):
            if token.type == tokenize.COMMENT and token.line[: token.start[1]].strip():
                found[token.start[0]] = (token.line, token.start[1], token.string)
    except (tokenize.TokenError, IndentationError, SyntaxError) as error:
        raise Abort(f"cannot tokenize: {error}")
    return found


def all_comment_lines(text):
    lines = set()
    for token in tokenize.generate_tokens(io.StringIO(text).readline):
        if token.type == tokenize.COMMENT:
            lines.add(token.start[0])
    return lines


def plan_imports(tree, tables, needed, body, starts, lines, newline):
    """Edits that add the needed names to the file's imports.

    Returns (edits, bound) where ``bound`` maps each needed name to the last line of the
    statement that imports it.
    """
    by_module = defaultdict(set)
    for name in needed:
        by_module[tables.module_of[name]].add(name)
    edits = []
    bound = {}
    comment_lines = all_comment_lines(body.decode("utf-8"))
    top_imports = [s for s in tree.body if isinstance(s, (ast.Import, ast.ImportFrom))]
    grouped = defaultdict(list)  # anchor line -> [(module, names)] for new statements
    for module in (COMMON_MODULE, WEB_KEYS_MODULE):
        wanted = by_module.get(module)
        if not wanted:
            continue
        existing = [s for s in tree.body if isinstance(s, ast.ImportFrom) and s.level == 0 and s.module == module]
        for stmt in existing:
            for alias in stmt.names:
                if alias.asname is None and alias.name in wanted:
                    bound.setdefault(alias.name, stmt.end_lineno)
        missing = sorted(wanted - set(bound))
        if not missing:
            continue
        target = next((s for s in existing if all(a.name != "*" for a in s.names)), None)
        if target is not None:
            check_statement_alone(target, lines)
            if not any(n in comment_lines for n in range(target.lineno, target.end_lineno + 1)):
                texts = [alias_text(a) for a in target.names] + missing
                texts.sort(key=lambda t: t.split(" as ")[0])
                text = render_from_import(module, texts, newline)
                start = starts[target.lineno - 1]
                end = starts[target.end_lineno - 1] + len(lines[target.end_lineno - 1].rstrip(b"\r"))
                edits.append((start, end, text.encode()))
                anchor = target.end_lineno
            else:
                anchor = target.end_lineno
                grouped[anchor].append((module, missing))
        elif top_imports:
            check_statement_alone(top_imports[-1], lines)
            anchor = top_imports[-1].end_lineno
            grouped[anchor].append((module, missing))
        else:
            anchor = docstring_end(tree)
            grouped[anchor].append((module, missing))
        for name in missing:
            bound[name] = anchor
    for anchor, items in grouped.items():
        block = newline.join(render_from_import(m, names, newline) for m, names in items) + newline
        if anchor == 0:
            position, text = 0, block + newline
        elif anchor >= len(starts):
            position, text = len(body), newline + block
        else:
            position, text = starts[anchor], block
            if not top_imports:
                text = newline + block + newline
        edits.append((position, position, text.encode()))
    return edits, bound


def docstring_end(tree):
    first = tree.body[0] if tree.body else None
    if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant) and isinstance(first.value.value, str):
        return first.end_lineno
    return 0


def check_statement_alone(stmt, lines):
    if stmt.col_offset != 0:
        raise Abort(f"line {stmt.lineno}: import does not start its line")
    after = lines[stmt.end_lineno - 1][stmt.end_col_offset:].decode("utf-8").strip()
    if after and not after.startswith("#"):
        raise Abort(f"line {stmt.end_lineno}: code follows the import")


# --------------------------------------------------------------------------- self-check


class Normalizer(ast.NodeTransformer):
    """Replace key-name references with their values and drop the key imports and copies."""

    def __init__(self, tables, shadowed):
        self.tables = tables
        self.shadowed = shadowed

    def visit_Name(self, node):
        value = self.tables.values.get(node.id)
        if value is not None and isinstance(node.ctx, ast.Load) and node.id not in self.shadowed:
            return ast.Constant(value=value)
        return node

    def visit_ImportFrom(self, node):
        if node.level == 0 and node.module in (COMMON_MODULE, WEB_KEYS_MODULE):
            node.names = [a for a in node.names if a.asname is not None or a.name not in self.tables.values]
            if not node.names:
                return None
        return node

    def visit_Module(self, node):
        body = []
        for stmt in node.body:
            if self._is_copy(stmt):
                continue
            result = self.visit(stmt)
            if result is not None:
                body.append(result)
        node.body = body
        return node

    def _is_copy(self, stmt):
        return (
            isinstance(stmt, ast.Assign)
            and len(stmt.targets) == 1
            and isinstance(stmt.targets[0], ast.Name)
            and self.tables.values.get(stmt.targets[0].id) is not None
            and isinstance(stmt.value, ast.Constant)
            and stmt.value.value == self.tables.values[stmt.targets[0].id]
        )


def normalized(source, tables, filename):
    tree = ast.parse(source, filename=filename)
    normalizer = Normalizer(tables, set())
    copy_targets = {id(s.targets[0]) for s in tree.body if normalizer._is_copy(s)}
    shadowed = set()
    for name, owner in Scan(tree).bound:
        if name not in tables.values or id(owner) in copy_targets:
            continue
        if isinstance(owner, ast.ImportFrom) and owner.level == 0 and owner.module in (COMMON_MODULE, WEB_KEYS_MODULE):
            continue
        shadowed.add(name)
    normalizer.shadowed = shadowed
    return normalizer.visit(tree)


def first_difference(a, b, path="Module"):
    if type(a) is not type(b):
        return f"{path}: {ast.dump(a)[:80]} != {ast.dump(b)[:80]}"
    if isinstance(a, ast.AST):
        for field in a._fields:
            found = first_difference(getattr(a, field, None), getattr(b, field, None), f"{path}.{field}")
            if found:
                return found
        return None
    if isinstance(a, list):
        for index, (x, y) in enumerate(zip(a, b)):
            found = first_difference(x, y, f"{path}[{index}]")
            if found:
                return found
        if len(a) != len(b):
            return f"{path}: {len(a)} items != {len(b)} items"
        return None
    return None if a == b else f"{path}: {a!r} != {b!r}"


def self_check(rel, old_bytes, new_bytes, tables):
    """None when the rewrite is safe, else a message."""

    def decode(data):
        return (data[3:] if data.startswith(codecs.BOM_UTF8) else data).decode("utf-8")

    try:
        old_tree = normalized(decode(old_bytes), tables, rel)
        new_tree = normalized(decode(new_bytes), tables, rel)
    except SyntaxError as error:
        return f"the new file does not parse: {error}"
    if ast.dump(old_tree) != ast.dump(new_tree):
        return "tree comparison failed at " + (first_difference(old_tree, new_tree) or "?")
    again = analyze(rel, new_bytes, tables)
    if again.abort:
        return f"second pass aborts: {again.abort}"
    if again.new_bytes not in (None, new_bytes):
        return "a second apply would still change this file (it is not fully converted)"
    return None


# --------------------------------------------------------------------------- commands


def read_base(rev, rel):
    proc = subprocess.run(["git", "-C", str(ROOT), "show", f"{rev}:{rel}"], capture_output=True)
    if proc.returncode != 0:
        return None
    return proc.stdout


def cmd_report(args, tables):
    files = collect_files(args.paths or [str(BACKEND / "apps" / "modules"), str(BACKEND / "apps" / "core")])
    rows = []
    for path in files:
        rel = rel_path(path)
        result = analyze(rel, path.read_bytes(), tables)
        rows.append(result)
    if args.json:
        payload = [
            dict(file=r.rel, **r.counts, total=r.total, abort=r.abort, unknown_values=sorted(set(r.unknown_values)), warnings=r.warnings)
            for r in rows
            if r.total or r.counts["skipped"] or r.abort
        ]
        print(json.dumps(payload, indent=2))
        return 0
    totals = defaultdict(int)
    print(f"{'file':<90} {'one':>5} {'amb':>5} {'unk':>5} {'undot':>5} {'skip':>5}")
    for r in rows:
        if not (r.total or r.counts["skipped"] or r.abort):
            continue
        c = r.counts
        print(f"{r.rel:<90} {c['one']:>5} {c['ambiguous']:>5} {c['unknown']:>5} {c['undotted']:>5} {c['skipped']:>5}" + (f"  ABORT: {r.abort}" if r.abort else ""))
        for key, value in c.items():
            totals[key] += value
    print(f"{'total':<90} {totals['one']:>5} {totals['ambiguous']:>5} {totals['unknown']:>5} {totals['undotted']:>5} {totals['skipped']:>5}")
    print(f"dotted keys: {totals['one'] + totals['ambiguous'] + totals['unknown']}")
    for r in rows:
        for warning in r.warnings:
            print(f"warning: {warning}")
    return 0


def cmd_apply(args, tables):
    files = collect_files(args.paths)
    changed = aborted = replaced = deleted = 0
    for path in files:
        rel = rel_path(path)
        old = path.read_bytes()
        result = analyze(rel, old, tables)
        if result.abort:
            aborted += 1
            print(f"ABORT {rel}: {result.abort}")
            continue
        if result.new_bytes is None or result.new_bytes == old:
            continue
        failure = self_check(rel, old, result.new_bytes, tables)
        if failure:
            aborted += 1
            print(f"FAILED {rel}: {failure}")
            continue
        changed += 1
        replaced += result.replacements
        deleted += result.local_copies
        for warning in result.warnings:
            print(f"warning: {warning}")
        if args.dry_run:
            diff = difflib.unified_diff(
                old.decode("utf-8-sig").splitlines(keepends=True),
                result.new_bytes.decode("utf-8-sig").splitlines(keepends=True),
                f"a/{rel}",
                f"b/{rel}",
            )
            sys.stdout.writelines(diff)
        else:
            path.write_bytes(result.new_bytes)
    verb = "would change" if args.dry_run else "changed"
    print(f"{verb} {changed} files: {replaced} replacements, {deleted} local copies deleted, {aborted} files aborted")
    return 1 if aborted else 0


def cmd_verify(args, tables):
    files = collect_files(args.paths)
    failures = checked = 0
    for path in files:
        rel = rel_path(path)
        base = read_base(args.base, rel)
        if base is None:
            print(f"skipped {rel}: not in {args.base}")
            continue
        checked += 1
        failure = self_check(rel, base, path.read_bytes(), tables)
        if failure:
            failures += 1
            print(f"FAILED {rel}: {failure}")
    if failures:
        print(f"{failures} of {checked} files failed")
        return 1
    print(f"OK: {checked} files verified against {args.base}")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    report = sub.add_parser("report")
    report.add_argument("paths", nargs="*")
    report.add_argument("--json", action="store_true")
    apply = sub.add_parser("apply")
    apply.add_argument("paths", nargs="+")
    apply.add_argument("--dry-run", action="store_true")
    verify = sub.add_parser("verify")
    verify.add_argument("paths", nargs="+")
    verify.add_argument("--base", required=True)
    args = parser.parse_args(argv)
    tables = Tables()
    return {"report": cmd_report, "apply": cmd_apply, "verify": cmd_verify}[args.command](args, tables)


if __name__ == "__main__":
    sys.exit(main())
