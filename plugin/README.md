# Costacky Claude Code plugin

Costacky adds task sizing, a code research subagent, an executed-evidence verifier, a read-only setup preflight, and an approved phased Dynamic Workflow to Claude Code. Use `/costacky:workflow` for the task-leveling and execution guidance, `/costacky:setup` to check optional CodeGraph and Engram integrations, and `/costacky:execute-work` only after you have approved the phases. The setup preflight never installs packages or edits settings; each dependency can be installed or skipped independently. CodeGraph and Engram remain external tools. See the repository README for installation, operating-system-specific setup steps, privacy/configuration safety, context guidance, and limitations.

Tasks can declare `role`, `criteria`, `verify`, `files`, `dependsOn`, and `retryHypothesis`. A task with criteria only reaches `complete` when `costacky:test-verifier` reports `pass` for every original criterion, and the final status is aggregated honestly as `completed`, `partial`, `failed`, or `blocked`. Parallel phases are refused when declared files overlap. The workflow does not measure token usage per agent and does not enforce a hard budget.

After publishing the repository marketplace, install this plugin with `claude plugin marketplace add <owner>/costacky` followed by `claude plugin install costacky@costacky --scope user`.
