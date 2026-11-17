---
name: workflow
description: Classify a coding request as Level 0, Level 1, or Level 1+, then follow Costacky's code research, memory, delegation, and context-management workflow.
---

# Costacky task workflow

Use this skill when the user invokes `/costacky:workflow` or explicitly asks to follow Costacky's workflow. State briefly that **Costacky** is active and identify the level and reason before starting substantial work.

## 1. Size the request

Classify the request using scope, uncertainty, number of steps/files/areas, dependencies, independent work, and verification effort. The classification is a reasoned recommendation, not a guaranteed deterministic model decision.

- **Level 0:** small, local, few steps. Work inline. Apply relevant rules/skills; do not add subagents by default.
- **Level 1:** moderate, several actions or files but manageable in one session. Ask whether the user prefers inline or delegated/workflow execution before dispatching.
- **Level 1+:** several phases/domains, substantial research, independent components, dependencies, or a long execution. Recommend subagents/Dynamic Workflow and explain why. The user can still choose inline.

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

- Prefer concise, task-relevant prompts and evidence. Keep verbose exploration in its own agent when delegation is chosen; return a short summary with file paths and evidence.
- Use `/usage` to observe usage and `/context` to inspect context. When needed, use Claude Code's `/autocompact <tokens>` or `/compact <focus>` controls if supported in the user's session. Do not claim the plugin can dynamically force main-session compaction.
- Compact to continue the same unit of work; do not start a new session only because compaction occurred.
- Around a phase boundary, if the next unit does not need the preceding transcript, create a concise handoff and start fresh. A handoff contains objective/acceptance criteria, decisions, work/results, files, checks, risks, and next action—not the full transcript.
- Let a genuinely non-partitionable unit finish even if its context exceeds the advisory target. Mention the exception when useful; never stop a worker merely because aggregate task usage crossed a number.

## 5. Delegated workflow

When the user chooses a Dynamic Workflow, prepare and present its phases and task prompts for approval first. Then invoke `/costacky:execute-work` with a structured argument containing:

```json
{
  "approved": true,
  "goal": "the agreed outcome",
  "phases": [
    { "title": "Research", "execution": "sequential", "tasks": [{ "id": "research", "prompt": "Focused task with acceptance check" }] },
    { "title": "Independent checks", "execution": "parallel", "tasks": [{ "id": "check-a", "prompt": "Independent task A" }, { "id": "check-b", "prompt": "Independent task B" }] },
    { "title": "Implementation", "execution": "sequential", "tasks": [{ "id": "implement", "prompt": "Approved changes and checks" }] }
  ],
  "verification": "Evidence required to consider the outcome complete"
}
```

The workflow advances through phases in order. A phase defaults to sequential; mark it `parallel` only after confirming its tasks are independent and have no conflicting file edits or dependencies. Each worker must follow the CodeGraph and Engram instructions above. The final verification agent reports evidence, failures, and remaining risks. Do not convert a failed task into a success claim.

## 6. Finish

Report the achieved result, files changed, verification evidence, and unresolved risks. Save durable project decisions to Engram if available. If the task continues later, leave a short handoff; do not keep unrelated work in the same long context.

## Permission-rule safety

- Do not create or edit Claude Code `permissions.allow` settings, and do not recommend permanently allowing arbitrary Bash commands as a shortcut.
- Bash permission rules interpret `*` as a wildcard even when it appears inside a quoted regular expression or another command argument. For example, `\s*` in a `grep` pattern or `.*` in a `sed` expression can broaden an allow rule unexpectedly.
- Prefer the one-time permission prompt for a specific command. If a persistent rule is genuinely needed, explain its exact matching scope and ask the user to review it in `/permissions` before saving it.
- If Claude Code reports a broad Bash allow-rule warning, do not assume Costacky created it. Inspect the source shown by `/permissions`; do not edit unrelated user, project, or local settings on Costacky's behalf.
