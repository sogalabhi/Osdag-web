#!/usr/bin/env bash
# Local pre-push checks: the fast part of what .github/workflows/ci.yml runs.
#
#   scripts/pre-push.sh                run every check except the slow ones
#   scripts/pre-push.sh --build        also run the frontend production build
#   scripts/pre-push.sh --full         full backend suite, the build and npm audit (what CI runs)
#   scripts/pre-push.sh --skip-backend skip the checks that need the Python environment
#   scripts/pre-push.sh --skip-frontend
#   scripts/pre-push.sh --help
#
# Checks, in order (each mirrors a CI step, see .github/workflows/ci.yml):
#   1. ESLint                 npm run lint             (frontend-qa)
#   2. Vitest                 npm test                 (frontend-qa)
#   3. Frontend build         npm run build            (frontend-qa; only with --build or --full)
#      npm audit              npm audit --omit=dev --audit-level=high  (frontend-qa; only with --full, needs the network)
#   4. Ruff, blocking rules   ruff check backend --select E9,F63,F7,F82   (backend-lint)
#   5. Generated keys fresh   scripts/gen_core_keys.py leaves frontend/src/constants/generated/ unchanged (backend-qa)
#   6. Key guards             backend test_no_inline_keys.py (backend-qa)
#   7. Backend pytest         a quick subset that needs no database, or the whole suite with --full (backend-qa)
#
# Every check runs even when an earlier one fails, so one run shows everything that is wrong.
# The exit status is non-zero when any check failed. Checks that cannot run here (a missing tool)
# count as failures, so a green run always means everything ran; use --skip-* to leave a group out on purpose.
#
# Environment:
#   PYTHON       Python with the backend requirements installed (default: python3, then python).
#                With conda: PYTHON=$(conda run -n osdag-web which python) scripts/pre-push.sh
#   DATABASE_*   Used by --full only (host, port, name, user, password); the quick subset needs no database.
#                Use a database name that nothing else uses.
#
# Install as a git pre-push hook (optional, never done for you; see CONTRIBUTING.md):
#   ln -sf "$(git rev-parse --show-toplevel)/scripts/pre-push.sh" "$(git rev-parse --git-path hooks)/pre-push"
# Skip the hook once with `git push --no-verify`.

set -u
set -o pipefail

# Resolve the repository root through symlinks, so the script works when linked into .git/hooks.
SELF="$(readlink -f "${BASH_SOURCE[0]}")"
ROOT="$(cd "$(dirname "$SELF")/.." && pwd)"
cd "$ROOT" || exit 2

# The quick backend subset: tests that need neither the database nor Redis (a few seconds). They
# check the keys, the core's tables and the Additional Inputs sync against the core classes.
# Paths are relative to backend/. Add a file here when it is database-free and fast.
QUICK_TESTS=(
  apps/core/tests/test_design_dictionary.py
  apps/core/tests/test_design_pref_sync_overrides.py
  apps/core/tests/test_design_pref_sync_golden.py
  apps/core/tests/test_module_inputs_match_core.py
  apps/core/tests/test_required_keys_in_core.py
  apps/core/tests/test_weld_values.py
  apps/core/tests/test_design_method_values.py
  apps/core/tests/test_additional_inputs_sections.py
  apps/core/tests/test_module_api_routes.py
)

RUN_BUILD=0
FULL=0
SKIP_BACKEND=0
SKIP_FRONTEND=0

usage() {
  sed -n '2,/^$/p' "$SELF" | sed 's/^# \{0,1\}//'
}

for arg in "$@"; do
  case "$arg" in
    --build) RUN_BUILD=1 ;;
    --full) FULL=1; RUN_BUILD=1 ;;
    --skip-backend) SKIP_BACKEND=1 ;;
    --skip-frontend) SKIP_FRONTEND=1 ;;
    -h|--help) usage; exit 0 ;;
    *)
      # As a git hook the arguments are the remote name and URL; they are not for us.
      if [[ "$arg" == -* ]]; then
        echo "pre-push: unknown option $arg" >&2
        usage >&2
        exit 2
      fi
      ;;
  esac
done

if [ -t 1 ]; then
  BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  BOLD=""; RED=""; GREEN=""; DIM=""; RESET=""
fi

RESULTS=()
FAILED=0

# step <name> <command...>: run the command, show its output only when it fails.
step() {
  local name="$1"; shift
  local log start rc
  log="$(mktemp)"
  printf '%s>> %s%s\n' "$BOLD" "$name" "$RESET"
  start=$(date +%s)
  "$@" >"$log" 2>&1
  rc=$?
  local secs=$(( $(date +%s) - start ))
  if [ "$rc" -eq 0 ]; then
    printf '   %sok%s %s(%ss)%s\n' "$GREEN" "$RESET" "$DIM" "$secs" "$RESET"
    RESULTS+=("${GREEN}ok  ${RESET} $name (${secs}s)")
  else
    printf '   %sFAILED%s (exit %s, %ss). Output:\n' "$RED" "$RESET" "$rc" "$secs"
    tail -n 60 "$log" | sed 's/^/   | /'
    RESULTS+=("${RED}FAIL${RESET} $name (${secs}s)")
    FAILED=1
  fi
  rm -f "$log"
}

# fail_step <name> <message>: record a check that could not run.
fail_step() {
  printf '%s>> %s%s\n   %sFAILED%s %s\n' "$BOLD" "$1" "$RESET" "$RED" "$RESET" "$2"
  RESULTS+=("${RED}FAIL${RESET} $1 ($2)")
  FAILED=1
}

# ---------------------------------------------------------------- frontend
if [ "$SKIP_FRONTEND" -eq 0 ]; then
  if [ ! -d frontend/node_modules ]; then
    for n in "ESLint" "Vitest"; do fail_step "$n" "frontend/node_modules is missing; run: cd frontend && npm ci"; done
    [ "$RUN_BUILD" -eq 1 ] && fail_step "Frontend build" "frontend/node_modules is missing; run: cd frontend && npm ci"
  else
    if [ "$FULL" -eq 1 ]; then
      step "npm audit (runtime dependencies)" npm --prefix frontend audit --omit=dev --audit-level=high
    fi
    step "ESLint (npm run lint)" npm --prefix frontend run lint
    step "Vitest (npm test)" npm --prefix frontend test
    if [ "$RUN_BUILD" -eq 1 ]; then
      step "Frontend build (npm run build)" npm --prefix frontend run build
    fi
  fi
fi

# ---------------------------------------------------------------- backend
if [ "$SKIP_BACKEND" -eq 0 ]; then
  PY="${PYTHON:-}"
  if [ -z "$PY" ]; then
    if command -v python3 >/dev/null 2>&1; then PY=python3; else PY=python; fi
  fi

  if command -v ruff >/dev/null 2>&1; then
    RUFF=(ruff)
  elif "$PY" -m ruff --version >/dev/null 2>&1; then
    RUFF=("$PY" -m ruff)
  else
    RUFF=()
  fi
  if [ "${#RUFF[@]}" -eq 0 ]; then
    fail_step "Ruff (blocking rules)" "ruff is not installed; run: python -m pip install ruff==0.17.2"
  else
    step "Ruff, blocking rules (ruff check backend --select E9,F63,F7,F82)" \
      "${RUFF[@]}" check backend --select E9,F63,F7,F82
  fi

  if ! "$PY" -c "import django, pytest, pytest_django, osdag_core" >/dev/null 2>&1; then
    # osdag_core is imported from the repository root, which is the working directory here.
    for n in "Generated keys are up to date" "Key guards (test_no_inline_keys.py)" "Backend pytest"; do
      fail_step "$n" "$PY cannot import django, pytest, pytest-django or osdag_core; set PYTHON to the project's environment"
    done
  else
    export QT_QPA_PLATFORM="${QT_QPA_PLATFORM:-offscreen}"
    # CI runs without DEBUG. DEBUG=True in a local .env switches on the silk middleware, which
    # writes to the database and fails the tests that are not allowed to use it.
    export DEBUG=False

    # Same check as CI's `git diff --exit-code frontend/src/constants/generated/`, but it compares
    # against the files as they are now, so uncommitted generated files do not count as stale.
    GEN=frontend/src/constants/generated
    keys_fresh() {
      local before after
      before="$(cat "$GEN"/* | sha256sum)"
      "$PY" scripts/gen_core_keys.py || return 1
      after="$(cat "$GEN"/* | sha256sum)"
      if [ "$before" != "$after" ]; then
        echo "scripts/gen_core_keys.py changed files in $GEN (they were stale); they are now regenerated:"
        git status --short -- "$GEN"
        echo "Commit the regenerated files."
        return 1
      fi
    }
    step "Generated keys are up to date (scripts/gen_core_keys.py)" keys_fresh

    PYTEST=("$PY" -m pytest --ds=config.settings -q -p no:cacheprovider)
    step "Key guards (test_no_inline_keys.py)" \
      bash -c 'cd backend && exec "$@"' _ "${PYTEST[@]}" apps/core/tests/test_no_inline_keys.py

    if [ "$FULL" -eq 1 ]; then
      WRAP=()
      if command -v xvfb-run >/dev/null 2>&1; then WRAP=(xvfb-run); fi
      step "Backend pytest, full suite (needs the database)" \
        bash -c 'cd backend && exec "$@"' _ "${WRAP[@]}" "${PYTEST[@]}"
    else
      step "Backend pytest, quick subset (--full for everything)" \
        bash -c 'cd backend && exec "$@"' _ "${PYTEST[@]}" "${QUICK_TESTS[@]}"
    fi
  fi
fi

# ---------------------------------------------------------------- summary
echo
printf '%sSummary%s\n' "$BOLD" "$RESET"
for r in "${RESULTS[@]}"; do printf '  %s\n' "$r"; done
if [ "$FAILED" -ne 0 ]; then
  printf '\n%sPre-push checks failed.%s Fix the items above, or skip the hook once with: git push --no-verify\n' "$RED" "$RESET"
  exit 1
fi
printf '\n%sAll checks passed.%s\n' "$GREEN" "$RESET"
