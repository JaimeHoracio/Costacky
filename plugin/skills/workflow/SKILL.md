---
name: workflow
description: Classify a coding request as Level 0, Level 1, or Level 1+, then follow Costacky's code research, memory, delegation, and context-management workflow.
---

# Costacky task workflow

Use this skill when the user invokes `/costacky:workflow` or explicitly asks to follow Costacky's workflow. State briefly that **Costacky** is active and identify the level and reason before starting substantial work.

## 1. Size the request

Classify the request using scope, uncertainty, number of steps/files/areas, dependencies, independent work, and verification effort. The classification is a reasoned recommendation, not a guaranteed deterministic model decision.

- **Level 0:** small, local, few steps. Work inline. Apply relevant rules/skills; do not add subagents by default. State the decision you took in one line; do not ask about routine, low-impact choices.
- **Level 1:** moderate, several actions or files but manageable in one session. **Recommend** inline or delegated/workflow execution with arguments — shared files, number of tasks, verification effort, risk of context loss — and let the user accept or change the recommendation. Do not dispatch before that answer.
- **Level 1+:** several phases/domains, substantial research, independent components, dependencies, or a long execution. Recommend subagents/Dynamic Workflow and explain why. The user can still choose inline.

Ask for explicit approval only when the change has significant impact: observable behaviour, compatibility, stored data, or security. Say what changes, what the risk is, and which alternatives you considered. Routine Level 0 decisions do not need approval — they need to be visible.

Respect an explicit user choice over the recommendation. Do not launch a workflow or subagent before the user has chosen the delegated path when the level calls for a choice. If a task needs approval between phases, stop and ask before launching the next workflow; Dynamic Workflows cannot pause for arbitrary mid-run user input.

Before execution, clarify material ambiguity and define a concise outcome/acceptance check. For delegated execution, make a phased plan with small, verifiable tasks and send each worker only relevant context. Parallelize only independent tasks; keep dependent work in sequence.

## 2. Code investigation protocol

For understanding repository architecture, call paths, dependencies, or change impact:

1. First call the available CodeGraph MCP tool `codegraph_explore` (Claude Code may show its namespaced MCP tool name). Use it as the navigation map; do not silently skip it when available.
2. Before concluding about behavior, read the pertinent implementation with `Read`, even if CodeGraph returned source snippets.
3. If CodeGraph marks a file pending synchronization, use `Read` to inspect current content.
4. Use `Grep` for text searches such as configuration, comments, literal strings, or references that may not be represented in the graph.
5. Use `Glob` to discover paths when their locations are unknown.
6. If CodeGraph is unavailable, its index is missing, it errors, or returns no useful result, say so and continue with `Glob`, `Grep`, and `Read`. Never invent graph output or claim the answer is CodeGraph-backed when it is not.
7. Do not repeat broad searches after the available evidence is sufficient.

CodeGraph helps map relationships; source files read with `Read` remain the evidence for behavioral conclusions. Keep evidence and inference distinct.

## 3. Engram memory protocol

Engram is an optional, separately installed local memory integration. Use its tools only when they are exposed in the current session; do not simulate memory operations.

- For potentially related previous decisions/work, confirm the project with `mem_current_project`, then search relevant history with `mem_context` and/or focused `mem_search`.
- Retrieve progressively; do not load the entire memory store or paste full transcripts into context.
- Treat memories as historical context, not proof of current code behavior. Verify current code with CodeGraph and `Read`.
- Save accepted durable decisions, useful discoveries, and completed outcomes with `mem_save`; do not save every conversational turn or raw tool output. Prefer stable topic keys for evolving topics.
- Before a meaningful session handoff, use `mem_session_summary` if exposed, with goal, decisions, discoveries, files, verification, and next steps.
- After compaction, follow Engram's installed Memory Protocol for recovery; ask for additional `mem_context` only when needed.
- If project detection is ambiguous, do not guess or write to a guessed project. Ask the user to select the intended project according to Engram's response.
- If Engram is unavailable, continue without persistent memory and mention the limitation when relevant.

## 4. Context and handoffs

The configured advisory target is `${user_config.context_target_tokens}` tokens per agent context. It is not a task-wide usage budget, does not promise a provider price boundary, and must never be used to cancel/truncate work. Each subagent has its own context; the sum of agents is useful for cost observation, not a compaction threshold.

- Prefer concise, task-relevant prompts and evidence. Keep verbose exploration in its own agent when delegation is chosen; return a short summary with file paths and evidence, never transcript dumps.
- Workers answer in the shortest shape the task allows: findings plus paths plus evidence. Asking a worker for a JSON payload costs a few tokens and buys verifiable evidence; ask for it whenever criteria exist.
- Parallel execution does **not** mean fewer tokens: concurrent workers each pay their own prompt, and the aggregate is usually higher than one sequential worker. Parallel buys wall-clock time and isolation, not economy.
- Usage controls are advisory only: `context_target_tokens` is the single configured control. There is no exact per-agent token accounting and no hard cap. Compaction continues the same unit of work; it does not refund tokens already spent, and each handoff adds tokens of its own.
- Use `/usage` to observe usage and `/context` to inspect context. When needed, use Claude Code's `/autocompact <tokens>` or `/compact <focus>` controls if supported in the user's session. Do not claim the plugin can dynamically force main-session compaction.
- Compact to continue the same unit of work; do not start a new session only because compaction occurred.
- Around a phase boundary, if the next unit does not need the preceding transcript, create a concise handoff and start fresh. A handoff contains the objective and acceptance criteria, decisions taken (with rulings), evidence collected, task states, blockers, files, and the next action — not the full transcript.
- Let a genuinely non-partitionable unit finish even if its context exceeds the advisory target. Mention the exception when useful; never stop a worker merely because aggregate task usage crossed a number.

## 5. Delegated workflow

When the user chooses a Dynamic Workflow, prepare and present its phases and task prompts for approval first. Then invoke `/costacky:execute-work` with a structured argument containing:

```json
{
  "approved": true,
  "goal": "the agreed outcome",
  "phases": [
    { "title": "Research", "execution": "sequential", "tasks": [{ "id": "research", "role": "research", "prompt": "Focused task with acceptance check" }] },
    { "title": "Independent checks", "execution": "parallel", "tasks": [{ "id": "check-a", "prompt": "Independent task A", "files": ["src/a.js"] }, { "id": "check-b", "prompt": "Independent task B", "files": ["src/b.js"] }] },
    { "title": "Implementation", "execution": "sequential", "tasks": [{ "id": "implement", "prompt": "Approved changes and checks", "criteria": ["the invoice import rejects a missing customer id"], "verify": "npm test -- invoice", "files": ["src/invoice.js"] }] }
  ],
  "verification": "Evidence required to consider the outcome complete"
}
```

Extended task fields (all optional; `{id, prompt}` keeps working):

| Field | Meaning |
|---|---|
| `role` | `research` goes to `costacky:code-researcher` and may not declare `files`; `verify` runs the task itself on `costacky:test-verifier` and needs at least one passing executed check; `implement` is the default. |
| `criteria[]` | Acceptance criteria, verbatim. Sent unchanged to `costacky:test-verifier`. |
| `verify` | Command, or list of commands, the verifier is allowed to run. |
| `files[]` | Paths/globs the task will touch. Used to refuse parallel phases with overlapping edits. |
| `dependsOn[]` | Task ids. A task whose prerequisite ended `failed` or `blocked` becomes `blocked` with the cause. |
| `retryHypothesis` | A different hypothesis. It enables at most one retry; without it a failure stays failed with a diagnostic checkpoint. |

**Task states:** `pending`, `in_progress`, `blocked`, `failed`, `needs_verification`, `complete`. A task with criteria reaches `complete` only when `costacky:test-verifier` reports `pass` for every original criterion. For tasks that declare `criteria` or `verify`, unparsable worker reports and missing evidence become `needs_verification`, never success; legacy `{id, prompt}` tasks keep accepting a prose summary and are reported complete with empty evidence. Task ids must be unique and `dependsOn` may only reference earlier tasks, so the dependency graph is trustworthy.

**Final status** is aggregated and honest: `completed`, `partial`, `failed`, or `blocked`; blockers and risks are preserved, and the final verification agent receives the criteria from the approved plan, not a rewritten summary.

The workflow advances through phases in order. A phase defaults to sequential; mark it `parallel` only after confirming its tasks are independent. The workflow refuses a parallel phase when declared `files` overlap or a task declares `dependsOn`, and degrades that phase to sequential reporting why. This is a declaration, not proof: the verifier compares `git diff --name-only` with the declared files and reports the divergence.

Each worker must follow the CodeGraph and Engram instructions above. Do not convert a failed task into a success claim, and do not describe a `partial` run as completed.

## 6. Finish

Report the achieved result, files changed, verification evidence, and unresolved risks. Save durable project decisions to Engram if available. If the task continues later, leave a short handoff; do not keep unrelated work in the same long context.

## Permission-rule safety

- Do not create or edit Claude Code `permissions.allow` settings, and do not recommend permanently allowing arbitrary Bash commands as a shortcut.
- Bash permission rules interpret `*` as a wildcard even when it appears inside a quoted regular expression or another command argument. For example, `\s*` in a `grep` pattern or `.*` in a `sed` expression can broaden an allow rule unexpectedly.
- Prefer the one-time permission prompt for a specific command. If a persistent rule is genuinely needed, explain its exact matching scope and ask the user to review it in `/permissions` before saving it.
- If Claude Code reports a broad Bash allow-rule warning, do not assume Costacky created it. Inspect the source shown by `/permissions`; do not edit unrelated user, project, or local settings on Costacky's behalf.
