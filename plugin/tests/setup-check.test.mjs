import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getInstallGuidance, buildSetupReport, formatSetupReport, hasCodegraphIndex } from "../scripts/setup-check.mjs";

test("returns platform-specific CodeGraph installation commands", () => {
  assert.match(getInstallGuidance("linux").codegraph.install, /install\.sh/);
  assert.match(getInstallGuidance("darwin").codegraph.install, /install\.sh/);
  assert.match(getInstallGuidance("win32").codegraph.install, /install\.ps1/);
});

test("provides Engram guidance without inventing an unsupported Windows installer", () => {
  const windows = getInstallGuidance("win32").engram;
  assert.match(windows.install, /github\.com\/Gentleman-Programming\/engram\/releases/i);
  assert.match(windows.installDocs, /INSTALLATION\.md/);
  assert.match(windows.setup, /engram setup claude-code/);
});

test("reports independent install, MCP, and index states with skip options", () => {
  const report = buildSetupReport({
    platform: "win32",
    codegraphCli: false,
    codegraphMcp: false,
    codegraphIndex: true,
    engramCli: false,
    engramMcp: false,
  });

  assert.equal(report.codegraph.index, "present");
  assert.equal(report.codegraph.cli, "missing");
  assert.equal(report.engram.cli, "missing");
  assert.deepEqual(report.choices, ["install-codegraph", "skip-codegraph", "install-engram", "skip-engram", "done"]);
  assert.match(report.guidance.codegraph.install, /install\.ps1/);
});

test("does not recommend reinitializing an existing CodeGraph index", () => {
  const report = buildSetupReport({
    platform: "linux",
    codegraphCli: true,
    codegraphMcp: true,
    codegraphIndex: true,
    engramCli: true,
    engramMcp: true,
  });

  assert.equal(report.codegraph.nextStep, "reuse-existing-index");
  assert.equal(report.codegraph.upgradeIsOptional, true);
  assert.equal(report.engram.nextStep, "verify-session-tools");
});

test("offers connect/setup actions rather than reinstalling available CLIs", () => {
  const report = buildSetupReport({
    platform: "darwin",
    codegraphCli: true,
    codegraphMcp: false,
    codegraphIndex: false,
    engramCli: true,
    engramMcp: false,
  });
  assert.ok(report.choices.includes("connect-codegraph"));
  assert.ok(report.choices.includes("setup-engram"));
  assert.ok(!report.choices.includes("install-codegraph"));
  assert.ok(!report.choices.includes("install-engram"));
});

test("preflight text reuses existing CLIs and indexes instead of suggesting reinstall or reinit", () => {
  const report = buildSetupReport({
    platform: "linux",
    codegraphCli: true,
    codegraphMcp: false,
    codegraphIndex: true,
    engramCli: true,
    engramMcp: false,
  });
  const text = formatSetupReport(report);
  assert.match(text, /CLI already available/);
  assert.match(text, /Connect CodeGraph MCP/);
  assert.match(text, /Configure Engram MCP/);
  assert.doesNotMatch(text, /codegraph init/);
  assert.doesNotMatch(text, /brew install gentleman-programming\/tap\/engram/);
});

test("does not treat an MCP inspection failure as proof that a server is unconfigured", () => {
  const report = buildSetupReport({
    platform: "linux",
    codegraphCli: true,
    codegraphMcp: null,
    codegraphIndex: true,
    engramCli: true,
    engramMcp: null,
  });
  assert.equal(report.codegraph.mcp, "unknown");
  assert.equal(report.codegraph.nextStep, "inspect-session-mcp");
  assert.equal(report.engram.mcp, "unknown");
  assert.equal(report.engram.nextStep, "inspect-session-mcp");
  assert.ok(!report.choices.includes("connect-codegraph"));
  assert.ok(!report.choices.includes("setup-engram"));
});

test("only treats a project graph database as an existing index", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "costacky-codegraph-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const graphDirectory = join(root, ".codegraph");
  await mkdir(graphDirectory);
  assert.equal(hasCodegraphIndex(root), false);

  await writeFile(join(graphDirectory, "codegraph.db"), "fixture");
  assert.equal(hasCodegraphIndex(root), true);
});
