import { statSync } from "node:fs";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CODEGRAPH_DOCS = "https://github.com/colbymchenry/codegraph";
const ENGRAM_DOCS = "https://github.com/Gentleman-Programming/engram";
const ENGRAM_INSTALL_DOCS = `${ENGRAM_DOCS}/blob/main/docs/INSTALLATION.md`;

export function getInstallGuidance(platform = process.platform) {
  const windows = platform === "win32";
  const codegraphInstall = windows
    ? "irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex"
    : "curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh";

  const engramInstall = windows
    ? `Download the matching engram_<version>_windows_{amd64|arm64}.zip from ${ENGRAM_DOCS}/releases, extract engram.exe to a folder on PATH. Technical users with Go may use: go install github.com/Gentleman-Programming/engram/v3/cmd/engram@latest`
    : "brew install gentleman-programming/tap/engram (or download the matching release binary)";

  return {
    codegraph: {
      install: codegraphInstall,
      connect: "codegraph install",
      initialize: "codegraph init (only when this project has no existing .codegraph index)",
      upgrade: "codegraph upgrade (optional; preserve and verify the existing project index)",
      docs: CODEGRAPH_DOCS,
    },
    engram: {
      install: engramInstall,
      setup: "engram setup claude-code",
      docs: ENGRAM_DOCS,
      installDocs: ENGRAM_INSTALL_DOCS,
      windowsNote: windows
        ? "The full Engram Claude Code integration may require Git Bash or WSL plus jq and curl for hooks. Engram documents a bare-MCP option without hooks."
        : "Review the official installation and Claude Code setup instructions before configuring the integration.",
    },
  };
}

export function buildSetupReport({
  platform = process.platform,
  codegraphCli = false,
  codegraphMcp = false,
  codegraphIndex = false,
  engramCli = false,
  engramMcp = false,
} = {}) {
  const codegraph = {
    cli: codegraphCli ? "available" : "missing",
    mcp: codegraphMcp === null ? "unknown" : codegraphMcp ? "configured-check-session" : "not-configured",
    index: codegraphIndex ? "present" : "missing",
    nextStep: !codegraphCli
      ? "offer-install-or-skip"
      : codegraphMcp === null
        ? "inspect-session-mcp"
      : !codegraphMcp
        ? "offer-connect-or-skip"
        : !codegraphIndex
          ? "offer-init-current-project-or-skip"
          : "reuse-existing-index",
    upgradeIsOptional: Boolean(codegraphCli),
  };
  const engram = {
    cli: engramCli ? "available" : "missing",
    mcp: engramMcp === null ? "unknown" : engramMcp ? "configured-check-session" : "not-configured",
    nextStep: !engramCli
      ? "offer-install-or-skip"
      : engramMcp === null
        ? "inspect-session-mcp"
      : !engramMcp
        ? "offer-setup-or-skip"
        : "verify-session-tools",
  };

  const choices = [];
  if (codegraph.nextStep !== "reuse-existing-index") {
    const action = !codegraphCli
      ? "install-codegraph"
      : codegraphMcp === null
        ? "inspect-codegraph-mcp"
      : !codegraphMcp
        ? "connect-codegraph"
        : "initialize-codegraph-index";
    choices.push(action, "skip-codegraph");
  }
  if (engram.nextStep !== "verify-session-tools") {
    const action = !engramCli
      ? "install-engram"
      : engramMcp === null
        ? "inspect-engram-mcp"
        : "setup-engram";
    choices.push(action, "skip-engram");
  }
  choices.push("done");

  return {
    platform,
    codegraph,
    engram,
    choices,
    guidance: getInstallGuidance(platform),
    sideEffects: "none",
    note: "MCP configuration is not proof that tools are exposed in this session. Verify in Claude Code after setup; restart the session if needed.",
  };
}

export function hasCodegraphIndex(cwd = process.cwd()) {
  const database = join(cwd, ".codegraph", "codegraph.db");
  try {
    return statSync(database).isFile();
  } catch {
    return false;
  }
}

function executableOnPath(name) {
  const suffixes = process.platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
    : [""];
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    for (const suffix of suffixes) {
      const candidate = join(directory, `${name}${suffix}`);
      try {
        if (statSync(candidate).isFile()) return true;
      } catch {
        // Continue searching PATH.
      }
    }
  }
  return false;
}

function mcpIsConfigured(serverName) {
  if (!executableOnPath("claude")) return null;
  const result = spawnSync("claude", ["mcp", "list"], {
    encoding: "utf8",
    timeout: 8_000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return null;
  return new RegExp(`(^|[^a-z0-9_-])${serverName}([^a-z0-9_-]|$)`, "im")
    .test(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
}

function runVersion(command, args) {
  if (!executableOnPath(command)) return false;
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 8_000,
    windowsHide: true,
  });
  return !result.error && result.status === 0;
}

export function collectSetupReport(cwd = process.cwd()) {
  return buildSetupReport({
    platform: process.platform,
    codegraphCli: runVersion("codegraph", ["version"]),
    codegraphMcp: mcpIsConfigured("codegraph"),
    codegraphIndex: hasCodegraphIndex(cwd),
    engramCli: runVersion("engram", ["version"]),
    engramMcp: mcpIsConfigured("engram"),
  });
}

export function formatSetupReport(report) {
  const lines = [
    `Costacky setup preflight (${report.platform}) — read-only; no changes made.`,
    `CodeGraph: CLI ${report.codegraph.cli}; MCP ${report.codegraph.mcp}; project index ${report.codegraph.index}; next: ${report.codegraph.nextStep}.`,
    `Engram: CLI ${report.engram.cli}; MCP ${report.engram.mcp}; next: ${report.engram.nextStep}.`,
  ];

  if (report.codegraph.nextStep !== "reuse-existing-index") {
    lines.push("");
    if (report.codegraph.cli === "missing") {
      lines.push(`CodeGraph CLI install: ${report.guidance.codegraph.install}`);
    } else {
      lines.push("CodeGraph CLI already available; reuse it (no reinstall needed).");
    }
    if (report.codegraph.nextStep === "offer-connect-or-skip") {
      lines.push(`Connect CodeGraph MCP (ask before running): ${report.guidance.codegraph.connect}`);
    }
    if (report.codegraph.nextStep === "inspect-session-mcp") {
      lines.push("MCP registration could not be determined. Inspect Claude Code /mcp and `claude mcp list` before adding or changing any configuration.");
    }
    if (report.codegraph.nextStep === "offer-init-current-project-or-skip") {
      lines.push(`No existing index detected. Offer project initialization only with approval: ${report.guidance.codegraph.initialize}`);
    }
    if (report.codegraph.upgradeIsOptional) {
      lines.push(`Optional CLI upgrade (separate choice): ${report.guidance.codegraph.upgrade}`);
    }
    lines.push(`Docs: ${report.guidance.codegraph.docs}`);
    lines.push("Choice: perform only the displayed action, or skip CodeGraph for now.");
  }
  if (report.engram.nextStep !== "verify-session-tools") {
    lines.push("");
    if (report.engram.cli === "missing") {
      lines.push(`Engram CLI install: ${report.guidance.engram.install}`);
    } else {
      lines.push("Engram CLI already available; reuse it (no reinstall needed).");
    }
    if (report.engram.nextStep === "offer-setup-or-skip") {
      lines.push(`Configure Engram MCP/plugin (ask before running): ${report.guidance.engram.setup}`);
    }
    if (report.engram.nextStep === "inspect-session-mcp") {
      lines.push("MCP registration could not be determined. Inspect Claude Code /mcp and `claude mcp list` before running setup or changing configuration.");
    }
    lines.push(report.guidance.engram.windowsNote);
    lines.push(`Docs: ${report.guidance.engram.installDocs}`);
    lines.push("Choice: perform only the displayed action, or skip Engram for now.");
  }
  lines.push("", report.note, "No installation, settings edits, index creation, upgrade, or deletion was performed.");
  return lines.join("\n");
}

function printReport(report, asJson = false) {
  console.log(asJson ? JSON.stringify(report, null, 2) : formatSetupReport(report));
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const report = collectSetupReport();
  printReport(report, process.argv.includes("--json"));
}
