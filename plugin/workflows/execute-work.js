export const meta = {
  name: "execute-work",
  description: "Execute a user-approved, phased implementation plan with concise handoffs and a final verification agent.",
};

function validPlan(plan) {
  return Boolean(
    plan &&
    plan.approved === true &&
    typeof plan.goal === "string" &&
    plan.goal.trim() &&
    Array.isArray(plan.phases) &&
    plan.phases.length > 0 &&
    plan.phases.every((item) =>
      item &&
      typeof item.title === "string" &&
      item.title.trim() &&
      (item.execution === undefined || ["sequential", "parallel"].includes(item.execution)) &&
      Array.isArray(item.tasks) &&
      item.tasks.length > 0 &&
      item.tasks.every((task) =>
        task && typeof task.id === "string" && task.id.trim() &&
        typeof task.prompt === "string" && task.prompt.trim()
      )
    )
  );
}

const plan = typeof args === "string" ? { goal: args } : (args ?? {});
if (!validPlan(plan)) {
  return {
    status: "invalid_input",
    message: "Provide a user-approved plan: approved=true, a goal, and non-empty phases with tasks {id, prompt}.",
  };
}

const phaseResults = [];
for (const phasePlan of plan.phases) {
  phase(phasePlan.title);
  const runTask = async (task) => {
    const result = await agent(
      `Goal: ${plan.goal}\nPhase: ${phasePlan.title}\nTask ${task.id}: ${task.prompt}\n\nFollow Costacky's code investigation and Engram memory instructions available in this session. Keep the report concise: findings/evidence, files changed, checks run, and remaining risks. Do not claim a tool was used unless it was actually available and called.`,
      { label: task.id },
    );
    return { task: task.id, result };
  };
  const results = phasePlan.execution === "parallel"
    ? await parallel(phasePlan.tasks.map((task) => () => runTask(task)))
    : await pipeline(phasePlan.tasks, runTask);
  phaseResults.push({ title: phasePlan.title, execution: phasePlan.execution ?? "sequential", results });
}

phase("Verification");
const verificationPrompt = typeof plan.verification === "string" && plan.verification.trim()
  ? plan.verification
  : "Independently verify the completed work against the goal and task reports. Run relevant checks if appropriate. Report evidence, failures, and unresolved risks; do not edit files unless the plan explicitly includes a verification fix task.";
const verification = await agent(
  `Goal: ${plan.goal}\nVerification request: ${verificationPrompt}\nTask reports: ${JSON.stringify(phaseResults)}\n\nReturn a concise evidence-based verification summary.`,
  { label: "Verification" },
);

return { status: "completed", goal: plan.goal, phases: phaseResults, verification };
