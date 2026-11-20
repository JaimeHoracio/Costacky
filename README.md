# Costacky

**Costacky** is a shareable Claude Code plugin that gives coding tasks a repeatable workflow: classify scope, decide whether to work inline or delegate, investigate code with CodeGraph when available, use Engram for durable project memory, and keep context focused with phase handoffs.

Costacky runs in Claude Code's TUI. It is not a replacement agent host: it does not manage credentials/models, run an API proxy, install an SDK, or configure optional tools silently.

## What it provides

- `/costacky:workflow`: classify a task as Level 0, Level 1, or Level 1+ and follow the agreed workflow.
- `/costacky:setup`: read-only preflight for CodeGraph and Engram, followed by separate install/skip choices.
- `/costacky:execute-work`: Dynamic Workflow command for a phased plan the user has already approved.
- `costacky:code-researcher`: read-only subagent with CodeGraph-first investigation instructions and Engram-aware memory guidance.
- `costacky:test-verifier`: read-only verifier that runs only the commands a task authorizes and reports `pass|fail|inconclusive` per original criterion.
- Task contracts: `role`, `criteria`, `verify`, `files`, `dependsOn`, and `retryHypothesis`, with honest task states (`pending`, `in_progress`, `blocked`, `failed`, `needs_verification`, `complete`).
- A configurable advisory context target (default 150k, range 120k–180k). It is not a hard token budget and never cancels work.

The main Claude Code session remains under the user's normal identity and model choice. Installing the plugin does not switch every conversation to Costacky: invoke `/costacky:workflow` when you want this behavior.

## Install in Claude Code

### From this repository's marketplace

After this repository is published to GitHub, replace `<owner>/costacky` with its GitHub owner/repository:

```bash
claude plugin marketplace add <owner>/costacky
claude plugin install costacky@costacky --scope user
```

Alternatively, use the equivalent Claude CLI commands shown by `/plugin`. Choose `--scope project` only when you want the plugin enabled for collaborators in this repository; choose `user` for your own Claude Code sessions across projects. Claude Code manages plugin registration; Costacky does not edit `settings.json` itself.

### Try the local plugin before publishing

From this directory:

```powershell
claude --plugin-dir .\plugin
```

In that Claude Code session, run `/costacky:setup`, then `/costacky:workflow <your request>`. Local plugin loading is for development; it does not publish a marketplace or permanently install the plugin.

## Setup: CodeGraph and Engram

Run `/costacky:setup`. Its bundled preflight is read-only: it checks whether the CLI commands are available, whether Claude Code lists the MCP servers, and whether the current project has a `.codegraph/codegraph.db` index. It never installs, edits settings, upgrades, initializes, deletes, or reindexes data.

For each missing dependency, Costacky shows OS-appropriate official instructions. Choose independently to install/configure CodeGraph, install/configure Engram, skip either one, skip both, or cancel. **No command that changes your machine runs without your explicit choice.** The setup asks you to verify actual tools in the active Claude Code session; a CLI or MCP registration alone does not prove that a tool is currently exposed.

### CodeGraph

CodeGraph supplies code structure navigation. Official instructions: [CodeGraph repository](https://github.com/colbymchenry/codegraph).

CLI installation options shown by setup:

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh
```

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex
```

Then connect Claude Code with `codegraph install`. Initialize a project's graph with `codegraph init` **only if it has no existing `.codegraph/` index**. Costacky reuses an existing index; it never runs `uninit`, deletes the index, or forces a rebuild. An optional CLI upgrade is offered separately and should be followed by an index status check.

If CodeGraph is available, Costacky uses `codegraph_explore` first for architecture, call paths, dependencies, and impact; it then reads the relevant implementation before concluding. If CodeGraph is missing, fails, or has no useful index, Costacky says so and continues with targeted `Glob`, `Grep`, and `Read` rather than inventing results or pretending the fallback used CodeGraph.

### Engram

Engram provides local persistent memory. It is installed independently, not bundled or duplicated by Costacky. See the [Engram repository](https://github.com/Gentleman-Programming/engram) and its [installation guide](https://github.com/Gentleman-Programming/engram/blob/main/docs/INSTALLATION.md).

```bash
# macOS / Linux with Homebrew
brew install gentleman-programming/tap/engram

# After installing the binary, configure Claude Code
engram setup claude-code
```

On Windows, use the matching binary from [Engram Releases](https://github.com/Gentleman-Programming/engram/releases) or the documented `go install` route for technical users, then run `engram setup claude-code`. The full Windows hook integration may need Git Bash or WSL and `jq`/`curl`; Engram documents a bare-MCP option if you do not want or cannot use the hooks.

When available, Costacky searches relevant memories before repeating prior decisions, verifies current code separately, saves durable decisions/outcomes, and leaves a concise session handoff. If Engram is skipped or unavailable, Costacky continues without persistent memory and does not claim it remembered anything.

## Use Costacky

Invoke the workflow explicitly:

```text
/costacky:workflow Add validation to the invoice import and cover the error cases with tests.
```

Costacky reports a level and rationale:

| Level | Typical handling |
|---|---|
| **0** | Small/local: work inline. |
| **1** | Moderate: ask whether to work inline or delegate. |
| **1+** | Large/multi-phase: recommend subagents/Dynamic Workflow, but honor a choice to work inline. |

For delegated work, Costacky first presents a phased plan and gets agreement. The approved plan can then be run with `/costacky:execute-work`. Phases run in order; tasks are sequential by default and run in parallel only when the approved plan marks them independent.

Tasks can declare `role` (`research|implement|verify`), `criteria`, `verify`, `files`, `dependsOn`, and `retryHypothesis`. A task with criteria becomes `complete` only when `costacky:test-verifier` reports `pass` for every criterion, using executed output rather than self-reported success. For tasks that declare `criteria` or `verify`, an unparsable worker report, missing evidence, or an `inconclusive` result leaves the task in `needs_verification`; a `fail` leaves it `failed`. Legacy `{id, prompt}` tasks still accept a prose summary and are reported as complete with empty evidence, which is the compatibility compromise. `role: verify` runs the task itself on `costacky:test-verifier` and needs at least one passing executed check. The workflow refuses a parallel phase whose declared `files` overlap, contains `dependsOn`, or includes an implement task without declared files; it degrades to sequential and reports why. Task ids must be unique and `dependsOn` may only reference earlier tasks. The final status aggregates to `completed`, `partial`, `failed`, or `blocked`, preserving blockers and risks. It is not a substitute for user approval and cannot ask arbitrary questions in the middle of a run.

Retries are capped at one per task and only run when the plan supplies a different `retryHypothesis`; otherwise the task stays failed with a diagnostic checkpoint.

For focused repository investigation, Costacky uses CodeGraph before text searches when the tool is available, reads source before behavioral conclusions, uses `Grep` for textual evidence, and `Glob` for unknown paths. `costacky:code-researcher` is available for read-only discovery.

## Context, compaction, and usage

The context target is an advisory **per-agent context** preference, initially 150k tokens and configurable between 120k and 180k through Claude Code's plugin configuration. The skill uses that value as guidance; the bundled read-only researcher has Claude Code's native `autoCompactWindow` set to 150k, a fixed plugin default that is not dynamically rewritten from the user preference. It is not a limit on the sum of tokens used by the entire task. Subagents each have their own context; crossing an aggregate usage figure does not cancel or truncate a worker.

- Use `/context` to inspect context and `/usage` to inspect usage.
- Claude Code's automatic compaction and `/autocompact` are managed by Claude Code. Costacky gives guidance but does not dynamically force compaction of the main session.
- Compact to continue the same unit of work. Create a short handoff when a subsequent unit no longer needs the full prior conversation. A handoff adds tokens; compaction does not refund tokens already spent.
- Parallel execution does not reduce token use: each concurrent worker pays its own prompt, so the aggregate is usually higher than a single sequential worker. Parallel buys time and isolation, not economy.
- There is no exact per-agent token accounting and no hard cap; `context_target_tokens` remains the only (advisory) control.
- If an indivisible task needs to exceed the advisory target, let it finish and report that as an exception; there is no hard task-wide cap.

## Configuration preservation

Costacky does not directly edit Claude Code settings or `.mcp.json`. It delegates plugin registration to Claude Code's plugin manager. Optional CodeGraph/Engram setup is shown as separate upstream commands and runs only after the user chooses it. Inspect those upstream prompts and target scopes; if an existing integration conflicts, stop and resolve it rather than replacing entries. Existing CodeGraph indexes are preserved.

Costacky does not add persistent Bash permissions. If Claude Code shows a warning about rules containing `grep`, `sed`, or `*`, the rule comes from a settings source outside the plugin. Review `/permissions` to find its source and remove or narrow only that specific rule if appropriate. Bash permission patterns interpret `*` as a wildcard even inside quoted command arguments, so a regex such as `.*` may make an apparently exact rule broader than intended.

## Development and validation

Requirements: a Claude Code version that supports plugin `userConfig`, Dynamic Workflows, and the `autoCompactWindow` subagent field (the implementation targets v2.1.296 or later), and Node.js for the local tests/preflight helper.

```bash
node --test plugin/tests/*.test.mjs
claude plugin validate ./plugin
```

The tests do not call Claude, CodeGraph, or Engram. To test the TUI integration, launch Claude Code with `--plugin-dir ./plugin`, test `/costacky:setup`, check MCP tools in `/mcp`, and only then try a small approved workflow.

## Limitations

- Task classification and instruction-following are model decisions, not hard security enforcement.
- Verified means executed: the verifier runs the declared commands and reports results, but it cannot prove coverage beyond the commands it ran. `files` is a declaration; undeclared edits are detected afterwards by `git diff --name-only`, not prevented.
- Token usage is not measured per agent and no hard budget is enforced. Claude Code's workflow and hook payloads do not expose per-agent token usage today (open upstream requests); third-party tools that parse session transcripts rely on an unofficial format, so Costacky does not compute spend.
- The preflight can inspect local executable/configuration signals, but only the active Claude Code session can establish that MCP tools are actually usable.
- `/usage` is for observation; the plugin does not aggregate billing across concurrent sessions or enforce a global spend cap.
- Optional tools can be skipped; the workflow degrades transparently when they are unavailable.
