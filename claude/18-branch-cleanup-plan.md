# Branch Cleanup — Plan

**Date:** 2026-10-25 | **Scope:** the 11 open PR branches on `sogalabhi/Osdag-web` and local clutter | **Status:** Proposed, waiting for approval to force-push

## Goal

Each PR branch is a straight line of its own commits on top of its parent, with no "Merge … into …" commits, and the local repo holds only `25april` plus the PR branches. Each branch's file contents stay exactly the same; only the history changes.

## Current state

| PR | Branch | Parent | Commits | Merge commits |
|---|---|---|---|---|
| #125 | `custom-rows-override` | `25april` | 5 | 1 (25april merged in) |
| #143 | `single-catalog` | `custom-rows-override` | 9 | 3 |
| #144 | `fix/135-module-routes` | `25april` | 1 | 0 |
| #145 | `fix/126-struts-end-condition-image` | `25april` | 2 | 0 |
| #146 | `fix/137-small-input-findings` | `25april` | 1 | 0 |
| #147 | `chore/138-repo-hygiene` | `25april` | 14 | 0 |
| #148 | `ci/139-deploy-by-sha` | `single-catalog` | 8 | 3 |
| #149 | `feat/129-error-format` | `single-catalog` | 7 | 3 |
| #150 | `tests/127-design-input-fixtures` | `single-catalog` | 3 | 3 |
| #151 | `feat/140-monitoring` | `single-catalog` | 4 | 3 |

#144–#147 are already linear and are not touched.

## Steps

### 1. Safety tags
Tag the current tip of every branch that will be rewritten (`pre-rebase/<branch>`, local only), so any step can be undone with `git reset --hard pre-rebase/<branch>`.

### 2. Rebase, bottom of the stack first
Each rebase uses only the branch's own non-merge commits:

1. `custom-rows-override` onto `origin/25april`. This drops the merge of `25april`.
2. `single-catalog` onto the new `custom-rows-override`, with `git rebase --onto`, so #125's commits aren't copied twice.
3. `ci/139-deploy-by-sha`, `feat/129-error-format`, `tests/127-design-input-fixtures` and `feat/140-monitoring`, each onto the new `single-catalog`, again with `--onto`.

Conflicts are expected only where a fix-up was merged in (e.g. `ci.yml`, the test that reads the error object). Resolve each one so the result matches the pre-rebase tree.

### 3. Verify before pushing
- `git diff pre-rebase/<branch> <branch>` must be empty for every branch, meaning identical files.
- `git log --merges <parent>..<branch>` must be empty.
- No commit gains a co-author trailer or any tracker reference.

### 4. Push
`git push --force-with-lease origin <branch>` for the 6 rewritten branches. The lease refuses to push if GitHub has anything newer than what was fetched.

### 5. CI
Wait for CI on #125, #143 and #148–#151 and confirm all checks pass, as they do today.

### 6. Local cleanup
- Remove the 9 agent worktrees and their `worktree-agent-*` branches. Their work is already in the PR branches.
- Remove the `integration` worktree.
- Delete `backup/single-catalog-before-pr` and `backup/single-catalog-premerge`.
- Delete `refs/original` (left by the earlier filter-branch).
- Reset every local PR branch to its `origin/` copy.
- Keep the `pre-rebase/*` tags for a week, then delete them.

## Rules from now on

- **Fix in a lower PR:** commit it on that branch, then rebase the branches above it and force-push with lease, never merge it up. Then check every branch whose fix went in the same way.
- **When a parent PR is squash-merged:**
  1. `git rebase --onto origin/25april <old parent tip> <child>` for each child.
  2. Force-push with lease.
  3. Change the PR's base to `25april` on GitHub.

  Order: #125 → #143 → #148–#151.
- **Merging into `25april`:** always "Squash and merge", so each PR is one commit. Optionally make squash the only merge method allowed on the fork.
- Force-pushes only to these PR branches, never to `25april`.

## Risks

| Risk | Mitigation |
|---|---|
| A conflict resolved wrongly changes code | Step 3's empty-diff check against the safety tag |
| A force-push overwrites someone else's push | `--force-with-lease`; nobody else pushes to these branches |
| Open review comments lose their place | No reviews exist yet |
