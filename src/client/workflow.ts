import { createCodeBlock } from "./formatting.js";
const steps = [
  {
    title: "Prepare the case",
    owner: "Student / browser",
    text: "Choose demo or live, add a title and project label, and set a list-cost ceiling. Initial input is optional.",
    code: 'const draft = { title: "Case 1042", budgetCents: "125", prompt };',
  },
  {
    title: "Validate and isolate",
    owner: "Node host",
    text: "Validate lengths, cents, mode, and registered session ownership. Only Node reads credentials and configured definition IDs.",
    code: 'if (!owned[mode].has(sessionId)) throw new Error("Unregistered case");',
  },
  {
    title: "Create the session",
    owner: "Managed Agents",
    text: "Reuse the agent and environment definitions. Initial events may start work immediately. Preserve the returned ID.",
    code: 'const session = await client.beta.sessions.create({\n  agent: agentId, environment_id: environmentId,\n  initial_events: [{ type: "user.message", content: [{ type: "text", text: prompt }] }],\n});',
  },
  {
    title: "Read details and history",
    owner: "Node → Managed Agents",
    text: "Retrieve reads status and metadata; events.list reads the conversation. Persisted events recover responses that arrived before observation.",
    code: 'const details = await client.beta.sessions.retrieve(sessionId);\nfor await (const event of client.beta.sessions.events.list(sessionId, { order: "asc" })) {\n  console.log(event);\n}',
  },
  {
    title: "Continue the same case",
    owner: "Managed Agents",
    text: "When idle and active, send a new user.message to the same ID. A new ID would mean a separate conversation. Acceptance is not completion.",
    code: 'await client.beta.sessions.events.send(sessionId, {\n  events: [{ type: "user.message", content: [{ type: "text", text: followUp }] }],\n});',
  },
  {
    title: "Inspect progress and stop reason",
    owner: "Student / browser",
    text: "Refresh history and details to observe later events. Idle can require action or reflect a budget stop; check stop_reason rather than assuming success.",
    code: 'if (event.type === "session.status_idle") {\n  console.log(event.stop_reason);\n}',
  },
  {
    title: "Update labels and budget",
    owner: "Node → Managed Agents",
    text: "Patch metadata, title, and the existing budget. The session ID and conversation remain. This editor does not change agent or environment identity.",
    code: 'await client.beta.sessions.update(sessionId, {\n  metadata: { project: "udemy-support-reviewed" },\n  budget: { type: "limit", max_list_cost: { amount: "200", currency: "USD" } },\n});',
  },
  {
    title: "Archive or delete deliberately",
    owner: "Student → Managed Agents",
    text: "Archive is terminal and retains history. Delete permanently removes session data. This application requires archival and separate title confirmations before deletion.",
    code: "await client.beta.sessions.archive(sessionId);\n// Separate irreversible decision, after saving required output:\nawait client.beta.sessions.delete(sessionId);",
  },
] as const;
const architecture = `<svg viewBox="0 0 1040 330" role="img" aria-labelledby="arch-title arch-desc"><title id="arch-title">UML component architecture</title><desc id="arch-desc">Browser calls a local Node host. The host selects a scripted demo provider or the official SDK. Live calls manage a persistent session referencing existing agent and environment definitions. Credentials stay in Node.</desc><defs><marker id="arch-arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0 L10 4 L0 8 Z"/></marker></defs>${[
  [
    "Browser casebook",
    "Forms · conversation · quiz",
    "Formatted responses · UML",
  ],
  [
    "Node session host",
    "Validation · registered IDs",
    "Demo provider / official SDK",
  ],
  [
    "Claude Managed Agents",
    "Persistent sessions + history",
    "Existing agent + environment",
  ],
]
  .map(
    ([title, a, b], i) =>
      `<g class="uml-box"><rect x="${20 + i * 365}" y="55" width="270" height="190" rx="8"/><text x="${155 + i * 365}" y="85" class="uml-stereotype">«${i === 2 ? "external service" : "component"}»</text><text x="${155 + i * 365}" y="120" class="uml-title">${title}</text><text x="${155 + i * 365}" y="160">${a}</text><text x="${155 + i * 365}" y="195">${b}</text><text x="${155 + i * 365}" y="225">${i === 0 ? "No credentials" : i === 1 ? "Server-side API key" : "Managed execution + context"}</text></g>`,
  )
  .join(
    "",
  )}<path class="uml-edge" d="M290 125 H385"/><path class="uml-edge" d="M385 195 H290"/><path class="uml-edge" d="M655 125 H750"/><path class="uml-edge" d="M750 195 H655"/><text class="uml-edge-label" x="338" y="105">HTTP action</text><text class="uml-edge-label" x="703" y="105">HTTPS API</text><text class="uml-caption" x="520" y="295">Demo stays local. Live initial input and follow-ups run real managed work.</text></svg>`;
const centers = [180, 520, 860, 520, 860, 180, 860, 860];
const labels = [
  ["1 · Prepare case", "Optional initial message"],
  ["2 · Validate + check ownership", "Credentials stay in Node"],
  ["3 · Create persistent session", "Reuse agent + environment"],
  ["4 · Read details + history", "Recover existing events"],
  ["5 · Send follow-up", "Same session ID"],
  ["6 · Inspect stop reason", "Refresh while work progresses"],
  ["7 · Update labels + budget", "Conversation retained"],
  ["8 · Archive / delete", "Deliberate terminal action"],
];
const workflow = `<svg viewBox="0 0 1040 1190" role="img" aria-labelledby="flow-title flow-desc"><title id="flow-title">UML session lifecycle workflow</title><desc id="flow-desc">Swimlanes separate student, host, and managed API. Prepare, validate, create, read history, send follow-up, inspect progress, update labels, then deliberately archive or delete. A decision separates continued work from retirement.</desc><defs><marker id="flow-arrow" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0 L9 4 L0 8 Z"/></marker></defs><rect class="uml-lane" x="15" y="15" width="1010" height="1160" rx="10"/><path class="uml-lane-line" d="M345 15 V1175 M690 15 V1175 M15 65 H1025"/><text class="uml-title" x="180" y="47">Student / browser</text><text class="uml-title" x="520" y="47">Node host</text><text class="uml-title" x="860" y="47">Managed Agents API</text><circle class="uml-start" cx="180" cy="90" r="10"/>${labels
  .map(([a, b], i) => {
    const y = 120 + i * 105 + (i === 7 ? 75 : 0),
      x = centers[i];
    return `<g class="uml-action" data-workflow-step="${i}"><rect x="${x - 135}" y="${y}" width="270" height="65" rx="14"/><text x="${x}" y="${y + 26}">${a}</text><text x="${x}" y="${y + 49}">${b}</text></g>`;
  })
  .join("")}<g class="uml-flow-edges"><path d="M180 100 V120"/>${centers
  .slice(0, 6)
  .map(
    (x, i) =>
      `<path d="M${x} ${185 + i * 105} V${200 + i * 105} H${centers[i + 1]} V${225 + i * 105}"/>`,
  )
  .join(
    "",
  )}<path d="M860 815 V835"/><path d="M860 925 V930"/><path d="M770 880 H710 V435 H655"/><path d="M860 995 V1050 H520 V1100"/></g><path class="uml-decision" d="M860 835 L950 880 L860 925 L770 880 Z"/><text class="uml-small" x="860" y="875">Continue</text><text class="uml-small" x="860" y="895">or retire?</text><text class="uml-edge-label" x="710" y="850">Continue → refresh</text><text class="uml-edge-label" x="950" y="922">Retire</text><circle class="uml-final-outer" cx="520" cy="1115" r="15"/><circle class="uml-start" cx="520" cy="1115" r="9"/><text class="uml-caption" x="260" y="1150">Validation failures return to the editor; cloud errors remain visible.</text></svg>`;
export function createWorkflowGuide() {
  const section = document.createElement("section");
  section.className = "panel workflow-guide";
  section.innerHTML = `<h3>Follow the support case from input to lifecycle decision.</h3><p>The component diagram shows boundaries; the activity diagram assigns each step to its owner.</p><div class="uml-scroll" tabindex="0" role="region" aria-label="Scrollable component architecture">${architecture}</div><details class="uml-activity"><summary>Explore the full UML session lifecycle</summary><p class="note">Rounded boxes are actions; the diamond is a lifecycle decision. Scroll horizontally on smaller screens.</p><div class="uml-scroll" tabindex="0" role="region" aria-label="Scrollable session lifecycle workflow">${workflow}</div></details><div class="workflow-step-buttons" role="group" aria-label="Inspect a workflow step"></div><article class="workflow-step-detail" aria-live="polite" aria-atomic="true"></article>`;
  const group = section.querySelector(".workflow-step-buttons")!,
    detail = section.querySelector(".workflow-step-detail")!;
  function select(index: number) {
    const step = steps[index];
    group
      .querySelectorAll("button")
      .forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
    section
      .querySelectorAll<SVGElement>("[data-workflow-step]")
      .forEach((node) =>
        node.classList.toggle(
          "selected",
          node.dataset.workflowStep === String(index),
        ),
      );
    const h = document.createElement("h4");
    h.textContent = `${index + 1}. ${step.title}`;
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = step.owner;
    const p = document.createElement("p");
    p.textContent = step.text;
    detail.replaceChildren(
      h,
      badge,
      p,
      createCodeBlock(step.code, "typescript"),
    );
  }
  steps.forEach((step, index) => {
    const b = document.createElement("button");
    b.textContent = `${index + 1} · ${step.title}`;
    b.onclick = () => select(index);
    group.append(b);
  });
  select(0);
  return section;
}
