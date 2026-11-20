# Changelog

## 0.2.0

- Task contracts: optional `role`, `criteria`, `verify`, `files`, `dependsOn`, and `retryHypothesis` on tasks; legacy `{id, prompt}` plans keep working.
- Honest task states (`pending`, `in_progress`, `blocked`, `failed`, `needs_verification`, `complete`) and aggregated final status (`completed`, `partial`, `failed`, `blocked`).
- New read-only `costacky:test-verifier` agent turns evidence into executed output: a task with criteria only completes on `pass` for every original criterion.
- Parallel phases are refused and degraded to sequential when declared `files` overlap or a task declares `dependsOn`.
- One retry maximum, only with a different `retryHypothesis`; otherwise a failure keeps its diagnostic checkpoint.
- Documented limits: no exact per-agent token accounting, no hard budget, parallel does not reduce token use.

## 0.1.0

- Initial Costacky Claude Code plugin with task-leveling skill, setup preflight, CodeGraph/Engram-aware research agent, and approved phased Dynamic Workflow.
- Documented permission-rule safety: Costacky does not add persistent Bash allow rules and warns about wildcard interpretation in command arguments.
