---
name: setup
description: Check Costacky's optional CodeGraph and Engram prerequisites and offer official OS-specific setup steps without changing configuration unless the user explicitly chooses them.
disable-model-invocation: true
---

# Costacky setup and preflight

This command is invoked manually as `/costacky:setup`. It is read-only until the user explicitly accepts a particular installation/configuration command. CodeGraph and Engram are independent options; the user may install either, skip either, skip both, or cancel.

## Run the read-only preflight

Run the bundled helper from the plugin directory:

```text
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup-check.mjs" --json
```

If `node` is unavailable or the helper fails, do not guess. Continue with a manual check using Claude Code's `/mcp` and `claude mcp list`, and state which checks could not be completed. The helper only checks executable versions, registered MCP names, and whether the current project has `.codegraph/codegraph.db`; it never installs, edits settings, upgrades, initializes, deletes, or reindexes anything.

Do not treat `claude mcp list` output as proof that tools are exposed to this running model session. Check whether `codegraph_explore` and Engram memory tools are actually available. If a new MCP registration was made, request a Claude Code restart/new session and verify again.

## Present independent choices

Summarize each tool's state (CLI, MCP registration/session visibility, project index where applicable). Then, only for missing components, present the official OS-appropriate command from the preflight report and ask whether the user wants to run it or skip. Do not bundle the two products into one consent.

### CodeGraph

- If a compatible CLI/MCP/index is already present, offer reuse. Never re-run `codegraph init` on an existing index.
- If CLI is missing, offer the official install command from the report or link to https://github.com/colbymchenry/codegraph.
- Once installed, offer `codegraph install` to connect Claude Code. This is a distinct config-changing action and needs its own explicit approval.
- If the project has no `.codegraph/` index, offer `codegraph init` for the current project with explicit approval. If the index exists, preserve it; report its presence and reuse it.
- Offer `codegraph upgrade` only as an optional separate choice. Never run `codegraph uninit`, delete `.codegraph/`, or force reindex as part of setup.
- After a config change, instruct the user to restart Claude Code if needed, then verify the MCP tool in the active session.

### Engram

- If binary/MCP are present, ask the model to verify that its memory tools are exposed in this session; do not install a duplicate server or hooks.
- If absent, show the official OS-specific install guidance and links from the report / https://github.com/Gentleman-Programming/engram.
- Once the binary exists, offer `engram setup claude-code` as a separate, explicit config-changing action. Explain that the official setup may add/update the Engram plugin and register its MCP integration, and that restart may be required.
- On Windows, explain the official full-hook prerequisites (Git Bash or WSL and `jq`/`curl` as documented) and show the documented MCP-only alternative if full hooks are not desired or prerequisites are absent.
- Do not run cloud enrollment, change Engram project identity, edit Claude settings manually, or overwrite conflicting MCP entries.
- Do not add persistent Bash allow rules to suppress setup prompts. If a permission warning appears, direct the user to inspect its source in `/permissions`; never edit that settings file as part of setup.

## Wrap up

Respect every skip. Report which optional components are ready, skipped, still need a restart, or need manual follow-up. Do not imply CodeGraph or Engram is active until verified in the current Claude Code session.
