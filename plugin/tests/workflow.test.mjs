import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflowUrl = new URL("../workflows/execute-work.js", import.meta.url);
const source = (await readFile(workflowUrl, "utf8")).replace(
  "export const meta =",
  "const meta =",
);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function runWorkflow(args, replies = []) {
  const calls = [];
  const phases = [];
  const parallelBatches = [];
  let replyIndex = 0;
  const agent = async (prompt, options = {}) => {
    calls.push({ prompt, options });
    return replies[replyIndex++];
  };
  const phase = (name) => phases.push(name);
  const pipeline = async (items, fn) => {
    const results = [];
    for (const item of items) results.push(await fn(item));
    return results;
  };
  const parallel = async (thunks) => {
    parallelBatches.push(thunks.length);
    return Promise.all(thunks.map((thunk) => thunk()));
  };
  const execute = new AsyncFunction("args", "agent", "phase", "pipeline", "parallel", source);
  return { result: await execute(args, agent, phase, pipeline, parallel), calls, phases, parallelBatches };
}

test("rejects malformed or unapproved plans without spawning agents", async () => {
  const { result, calls } = await runWorkflow({ goal: "change code", approved: false, phases: [] });
  assert.equal(result.status, "invalid_input");
  assert.equal(calls.length, 0);
});

test("runs approved tasks in declared phase order and performs final verification", async () => {
  const plan = {
    goal: "trace and fix a bug",
    approved: true,
    phases: [
      { title: "Investigate", tasks: [{ id: "research", prompt: "Use CodeGraph, then Read source." }] },
      { title: "Implement", tasks: [{ id: "fix", prompt: "Apply the approved fix." }] },
    ],
    verification: "Run relevant tests and report evidence.",
  };
  const { result, calls, phases } = await runWorkflow(plan, ["findings", "change made", "tests pass"]);

  assert.equal(result.status, "completed");
  assert.equal(calls.length, 3);
  assert.deepEqual(phases, ["Investigate", "Implement", "Verification"]);
  assert.match(calls[0].prompt, /CodeGraph/);
  assert.match(calls[2].prompt, /tests/);
});

test("runs tasks sequentially within phases and uses short labels", async () => {
  const plan = {
    goal: "research",
    approved: true,
    phases: [{ title: "Research", tasks: [
      { id: "A", prompt: "Task A" },
      { id: "B", prompt: "Task B" },
    ] }],
  };
  const { calls } = await runWorkflow(plan, ["A done", "B done", "verified"]);
  assert.deepEqual(calls.map((call) => call.options.label), ["A", "B", "Verification"]);
});

test("runs a phase in parallel only when the approved plan marks tasks independent", async () => {
  const plan = {
    goal: "audit two independent modules",
    approved: true,
    phases: [{ title: "Independent audits", execution: "parallel", tasks: [
      { id: "auth", prompt: "Audit auth module" },
      { id: "billing", prompt: "Audit billing module" },
    ] }],
  };
  const { calls, parallelBatches } = await runWorkflow(plan, ["auth findings", "billing findings", "verified"]);
  assert.deepEqual(parallelBatches, [2]);
  assert.equal(calls.length, 3);
});
