import "./style.css";
import {
  createCodeBlock,
  highlightCodeElements,
  renderResponse,
} from "./formatting.js";
import { createWorkflowGuide } from "./workflow.js";
import exampleCode from "../examples/session-lifecycle.ts?raw";
import {
  BETA,
  SDK_VERSION,
  CASE,
  FOLLOW_UP,
  METHODS,
  FIELDS,
  QUESTIONS,
  type Action,
  type Draft,
  type LabState,
  type Mode,
} from "../shared/lesson.js";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<a class="skip" href="#main">Skip to lesson</a><header class="top"><a class="brand" href="/" aria-label="Support Casebook home"><span class="brand-mark">&lt;/&gt;</span><span>Claude Managed Agents<small>Practical course · Lesson 04</small></span></a><div class="header-actions"><span class="badge">TypeScript SDK ${SDK_VERSION}</span><a class="source" href="https://github.com/luiscoco/claude-managed-agents-lesson-04" target="_blank" rel="noreferrer">Source ↗</a><div class="size" role="group" aria-label="Text size"><button id="comfortable" aria-pressed="true">Comfortable</button><button id="larger" aria-pressed="false">Larger</button></div></div></header>
<main id="main" class="container"><section class="hero"><div><p class="eyebrow">LESSON 04 / SESSIONS</p><h1>One case.<br><em>A continuing conversation.</em></h1><p class="intro">Create a support case. Keep its session ID, recover the conversation, and continue with context. Then make a deliberate lifecycle decision.</p><div class="chips"><span>① Create</span><span>② Inspect</span><span>③ Continue</span><span>④ Manage</span></div></div><figure class="mascot"><img src="/course-astronaut.png" width="220" height="287" alt="Course astronaut mascot"><figcaption>Reusable definitions.<br>Persistent interactions.</figcaption></figure></section>
<details class="focus"><summary>Lesson focus & author <span>What you will learn</span></summary><div><p>Create, retrieve, update, list, archive, and delete sessions. Understand initial events, resources, metadata, budgets, and multi-turn context.</p><p>Practical companion by <strong>Luis Coco Enríquez</strong>. All live AI work uses Claude Managed Agents through the official Anthropic SDK.</p></div></details>
<nav class="tabs" role="tablist" aria-label="Lesson activities"><button role="tab" id="tab-lab" aria-controls="panel-lab" aria-selected="true">01 · Session lab</button><button role="tab" id="tab-map" aria-controls="panel-map" aria-selected="false" tabindex="-1">02 · API & configuration</button><button role="tab" id="tab-how" aria-controls="panel-how" aria-selected="false" tabindex="-1">03 · How it works</button><button role="tab" id="tab-quiz" aria-controls="panel-quiz" aria-selected="false" tabindex="-1">04 · Check understanding</button></nav>
<section role="tabpanel" id="panel-lab" aria-labelledby="tab-lab"><div class="section-heading"><div><p class="eyebrow">THE PRACTICAL EXAMPLE</p><h2>Support Casebook</h2><p>Maya opens case 1042. A follow-up asks the assistant to recall her name and case number using the same conversation.</p></div><span class="lesson-number">04</span></div><div class="flow">${[
  ["create", "Create a case", "Reuse agent + environment"],
  ["history", "Recover history", "Read existing events"],
  ["send", "Continue", "Same ID · another message"],
  ["update", "Manage", "Labels + list-cost budget"],
]
  .map(
    ([id, title, desc], i) =>
      `<div id="stage-${id}" class="flow-card"><span>${i + 1}</span><strong>${title}</strong><small>${desc}</small></div>`,
  )
  .join("")}</div>
<div class="workspace"><aside class="panel controls"><h3>Open or continue a case</h3><label for="mode">Execution mode</label><select id="mode"><option value="demo">Guided demo · simulated API</option><option value="live" disabled>Live · checking configuration</option></select><p id="mode-note" class="note">Demo replies are scripted illustrations. No cloud calls or charges.</p><button id="walkthrough" class="primary">Run guided walkthrough</button><p class="note">The walkthrough creates, reads history, sends one follow-up, and updates labels. Live responses may still be running; refresh to observe them.</p>
<label for="case-select">Registered case</label><select id="case-select"><option value="">No case yet</option></select><button id="list-cases">List registered sessions</button><label for="case-title">Case title</label><input id="case-title" maxlength="120"><label for="project">Project metadata</label><input id="project" maxlength="100"><label for="budget">List-cost budget · USD cents</label><input id="budget" type="number" min="1" max="10000" step="1"><p class="note">125 cents = $1.25. Live work consumes your account usage. Updates must exceed consumed cost.</p><label for="initial-prompt">Initial message · optional</label><textarea id="initial-prompt" rows="5" maxlength="4000"></textarea><button id="create-case" class="primary">Create a new session</button><div class="button-row"><button id="retrieve-case">Retrieve details</button><button id="read-history">Refresh history & status</button></div><button id="update-case">Update selected case</button><label for="follow-up">Follow-up message</label><textarea id="follow-up" rows="4" maxlength="4000"></textarea><button id="send-message">Send to the same session</button><p id="status" class="status" role="status" aria-live="polite">Ready to explore.</p></aside>
<div class="results"><section class="panel"><div class="panel-heading"><h3>Case identity & lifecycle</h3><span id="case-status" class="badge">No case</span></div><div id="identity" class="empty">Create a case to inspect its persistent ID.</div><div id="details"></div></section><section class="panel"><div class="panel-heading"><h3>Persisted conversation</h3><span id="event-count" class="badge">0 events</span></div><p id="history-note" class="note">History is read explicitly. A session detail response is not the conversation.</p><div id="conversation"></div><details><summary>Inspect persisted event JSON</summary><div id="events-json"></div></details></section><section class="panel"><div class="panel-heading"><h3>Request timeline</h3><span id="trace-count" class="badge">0 operations</span></div><ol id="timeline" class="timeline"></ol></section></div></div>
<details class="panel archive-panel"><summary>Archive or permanently remove a case</summary><p>Archive ends the session and retains its history. It cannot resume. Delete removes the session and its scoped data; save required output first. Independent agent and environment definitions remain.</p><label for="archive-name">Type the exact case title to archive</label><input id="archive-name" autocomplete="off"><button id="archive-case" class="danger">Archive selected session</button><label for="delete-name">Then type DELETE followed by its exact title</label><input id="delete-name" autocomplete="off"><button id="delete-case" class="danger">Permanently delete selected session</button><p class="note">Archive-before-delete is an application guard. Neither action runs in the walkthrough.</p></details><div class="teaching-callout"><strong>Try this next</strong><p>Create a second case with an empty initial message. Inspect its idle status and empty history. Compare its ID with Maya’s case; sending input to this new ID starts a separate conversation.</p></div></section>
<section role="tabpanel" id="panel-map" aria-labelledby="tab-map" hidden><div class="section-heading"><div><p class="eyebrow">METHODS & PARAMETERS</p><h2>Give each operation one clear purpose.</h2><p>Expand every card for a colored TypeScript example. These examples do not execute requests.</p></div></div><div id="method-grid" class="namespace-grid"></div><h2 class="fields-heading">Build a valid create request.</h2><div id="field-grid" class="namespace-grid"></div><div class="teaching-callout"><strong>Beta API, explicit contract</strong><p>This application pins SDK ${SDK_VERSION}, whose session methods add <code>${BETA}</code>. The current monetary field is a list-cost ceiling, not a turn limit. Recheck types when upgrading.</p></div></section>
<section role="tabpanel" id="panel-how" aria-labelledby="tab-how" hidden><div class="section-heading"><div><p class="eyebrow">UML / ARCHITECTURE & WORKFLOW</p><h2>Trace the case through the application.</h2><p>Separate the browser, local host, reusable definitions, and persistent managed session.</p></div></div><div id="workflow-guide"></div><div class="two-columns"><article class="panel"><h3>1. Set up locally</h3><pre><code id="setup-code"></code></pre><p>Open <code>http://127.0.0.1:4324</code>. Demo requires no key. For live mode, configure this repository’s <code>.env</code> with your key and existing <code>MANAGED_AGENT_ID</code> and <code>MANAGED_ENVIRONMENT_ID</code>, then restart Node.</p></article><article class="panel"><h3>2. Reuse the earlier definitions</h3><p>Use a tool-free course-support agent from Lesson 2 and a limited cloud environment from Lesson 3. The agent’s model must support session budgets. This casebook creates sessions, not new agent or environment definitions.</p><p>Live initial messages and follow-ups start real managed work. The key stays on the Node server.</p></article></div><div class="two-columns"><article class="panel"><h3>Observe without racing</h3><p>Creation with initial events can finish a fast reply before a stream is attached. We read persisted events instead. Refresh history and status as work progresses; there is no future-only streaming dependency.</p><p>Idle is not a universal success signal. Inspect the latest stop reason; budget exhaustion and required action differ from end of turn.</p></article><article class="panel"><h3>Persistence has a scope</h3><p>Managed history belongs to its session. Another session gets another conversation. Local live ID registration survives Node restarts in ignored <code>.data</code>; use List to restore the case list. Demo state resets on restart.</p><p>The local app is for one instructor on loopback. It has no multi-user login or production hosting layer.</p></article></div><article class="panel code-example"><h3>3. Read the complete TypeScript example</h3><p>The example starts real work only when explicitly run with <code>npm run example</code>. It never automatically archives or deletes.</p><pre><code id="example-code"></code></pre></article><p class="source-links">Official references: <a href="https://platform.claude.com/docs/en/managed-agents/sessions" target="_blank" rel="noreferrer">Start a session ↗</a> · <a href="https://platform.claude.com/docs/en/managed-agents/session-operations" target="_blank" rel="noreferrer">Session operations ↗</a></p></section>
<section role="tabpanel" id="panel-quiz" aria-labelledby="tab-quiz" hidden><div class="section-heading"><div><p class="eyebrow">RETRIEVE, THEN APPLY</p><h2>Can you explain the case lifecycle?</h2><p>Six questions connect persistent context with deliberate operations.</p></div><span id="score" class="badge">0 / 6 correct</span></div><div id="quiz"></div><div class="teaching-callout"><h3>Your practical challenge</h3><ol><li>Create Maya’s case and keep its ID.</li><li>Recover initial events, then send a follow-up to the same ID.</li><li>Update project metadata without replacing the conversation.</li><li>Create an empty second case and compare its history.</li><li>In demo, archive and delete using separate confirmations.</li></ol></div></section><footer><span>Claude Managed Agents · Lesson 04</span><span>Luis Coco Enríquez · Learn by inspecting.</span></footer></main>`;
function card(
  name: string,
  path: string,
  description: string,
  snippet: string,
) {
  const a = document.createElement("article");
  a.className = "panel namespace current";
  const h = document.createElement("h3"),
    c = document.createElement("code"),
    p = document.createElement("p"),
    d = document.createElement("details"),
    s = document.createElement("summary");
  h.textContent = name;
  c.textContent = path;
  p.textContent = description;
  s.textContent = "Inspect the code example";
  d.append(s, createCodeBlock(snippet, "typescript"));
  a.append(h, c, p, d);
  return a;
}
for (const m of METHODS)
  $("method-grid").append(card(m.name, m.path, m.description, m.snippet));
for (const f of FIELDS)
  $("field-grid").append(card(f.name, f.role, f.description, f.snippet));
$("workflow-guide").append(createWorkflowGuide());
$("setup-code").textContent =
  "npm ci\nCopy-Item .env.example .env\n# Set ANTHROPIC_API_KEY for live sessions\nnpm run dev";
$("setup-code").dataset.language = "powershell";
$("example-code").textContent = exampleCode;
$("example-code").dataset.language = "typescript";
highlightCodeElements(document);
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
function activate(tab: HTMLButtonElement) {
  tabs.forEach((t) => {
    const active = t === tab;
    t.setAttribute("aria-selected", String(active));
    t.tabIndex = active ? 0 : -1;
    $(t.getAttribute("aria-controls")!).hidden = !active;
  });
}
tabs.forEach((t, i) => {
  t.onclick = () => activate(t);
  t.onkeydown = (e) => {
    let n: number | undefined;
    if (e.key === "ArrowRight") n = (i + 1) % 4;
    if (e.key === "ArrowLeft") n = (i + 3) % 4;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = 3;
    if (n !== undefined) {
      e.preventDefault();
      activate(tabs[n]);
      tabs[n].focus();
    }
  };
});
function setSize(size: string) {
  document.documentElement.dataset.text = size;
  for (const id of ["comfortable", "larger"])
    $(id).setAttribute("aria-pressed", String(size === id));
  try {
    localStorage.setItem("lesson-text-size", size);
  } catch {}
}
try {
  setSize(
    localStorage.getItem("lesson-text-size") === "larger"
      ? "larger"
      : "comfortable",
  );
} catch {}
$("comfortable").onclick = () => setSize("comfortable");
$("larger").onclick = () => setSize("larger");
const answers = new Map<number, boolean>();
QUESTIONS.forEach((q, i) => {
  const field = document.createElement("fieldset"),
    legend = document.createElement("legend"),
    feedback = document.createElement("p");
  field.className = "panel question";
  legend.textContent = `${i + 1}. ${q.question}`;
  feedback.className = "feedback";
  feedback.setAttribute("aria-live", "polite");
  field.append(legend);
  q.answers.forEach((answer, j) => {
    const label = document.createElement("label"),
      radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `q-${i}`;
    label.append(radio, document.createTextNode(answer));
    radio.onchange = () => {
      const correct = j === q.correct;
      answers.set(i, correct);
      feedback.textContent = `${correct ? "Correct." : "Try again."} ${q.explanation}`;
      feedback.classList.toggle("correct", correct);
      $("score").textContent =
        `${[...answers.values()].filter(Boolean).length} / 6 correct`;
    };
    field.append(label);
  });
  field.append(feedback);
  $("quiz").append(field);
});

let mode: Mode = "demo",
  busy = false;
let state: LabState = {
  mode: "demo",
  sessions: [],
  selectedId: "",
  events: [],
  traces: [],
};
const val = (id: string) => $<HTMLInputElement>(id).value;
const current = () => state.sessions.find((s) => s.id === state.selectedId);
function draft(): Draft {
  return {
    title: val("case-title"),
    project: val("project"),
    budgetCents: val("budget"),
    prompt: val("initial-prompt"),
  };
}
function loadDraft(d: Draft) {
  for (const [id, v] of [
    ["case-title", d.title],
    ["project", d.project],
    ["budget", d.budgetCents],
    ["initial-prompt", d.prompt],
  ])
    $<HTMLInputElement>(id).value = v;
}
function status(t: string) {
  $("status").textContent = t;
}
function render() {
  const s = current();
  const select = $<HTMLSelectElement>("case-select");
  select.replaceChildren(new Option("Select a case", ""));
  for (const row of state.sessions)
    select.add(new Option(`${row.title ?? row.id} · ${row.status}`, row.id));
  select.value = state.selectedId;
  $("case-status").textContent = s
    ? `${s.status}${s.archived_at ? " · archived" : ""}`
    : "No case";
  $("identity").textContent = s
    ? `${s.id} · Agent ${s.agent.id} v${s.agent.version} · Environment ${s.environment_id}`
    : "Create or list a case to inspect its persistent ID.";
  $("details").replaceChildren(
    ...(s
      ? [
          createCodeBlock(
            JSON.stringify(
              {
                title: s.title,
                metadata: s.metadata,
                budget: s.budget,
                archived_at: s.archived_at,
              },
              null,
              2,
            ),
            "json",
          ),
        ]
      : []),
  );
  $("conversation").replaceChildren();
  for (const e of state.events) {
    if (e.type !== "user.message" && e.type !== "agent.message") continue;
    const article = document.createElement("article");
    article.className = "case-message";
    const h = document.createElement("h4");
    h.textContent = e.type === "user.message" ? "Student" : "Support agent";
    article.append(h);
    const text = (e.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    if (e.type === "agent.message") article.append(renderResponse(text));
    else {
      const p = document.createElement("p");
      p.textContent = text;
      article.append(p);
    }
    $("conversation").append(article);
  }
  $("event-count").textContent = `${state.events.length} events`;
  const stop = [...state.events]
    .reverse()
    .find((e) => e.type === "session.status_idle")?.stop_reason?.type;
  $("history-note").textContent = state.events.length
    ? `Last observed idle reason: ${stop ?? "not present"}. History is a snapshot; refresh for later events. ${mode === "demo" ? "Replies are scripted demonstrations." : ""}`
    : "No events loaded. Refresh history after creating or selecting a case.";
  $("events-json").replaceChildren(
    createCodeBlock(JSON.stringify(state.events, null, 2), "json"),
  );
  $("timeline").replaceChildren();
  for (const t of [...state.traces].reverse()) {
    const li = document.createElement("li"),
      h = document.createElement("strong"),
      p = document.createElement("p"),
      d = document.createElement("details"),
      summary = document.createElement("summary");
    h.textContent = `${t.action} · ${t.status}`;
    p.textContent = t.explanation;
    summary.textContent = "Inspect request and response";
    d.append(
      summary,
      createCodeBlock(
        JSON.stringify({ request: t.request, response: t.response }, null, 2),
        "json",
      ),
    );
    li.append(h, p, d);
    $("timeline").append(li);
  }
  $("trace-count").textContent = `${state.traces.length} operations`;
  for (const id of [
    "mode",
    "case-select",
    "create-case",
    "list-cases",
    "walkthrough",
  ])
    $<HTMLButtonElement>(id).disabled = busy;
  for (const id of ["retrieve-case", "read-history"])
    $<HTMLButtonElement>(id).disabled = busy || !s;
  for (const id of ["send-message", "update-case"])
    $<HTMLButtonElement>(id).disabled =
      busy || !s || s.status !== "idle" || Boolean(s.archived_at);
  $<HTMLButtonElement>("archive-case").disabled =
    busy ||
    !s ||
    Boolean(s.archived_at) ||
    s.status === "terminated" ||
    val("archive-name") !== s.title;
  $<HTMLButtonElement>("delete-case").disabled =
    busy || !s?.archived_at || val("delete-name") !== `DELETE ${s?.title}`;
  for (const action of ["create", "history", "send", "update"])
    $(`stage-${action}`).classList.toggle(
      "ready",
      state.traces.some((t) => t.action === action),
    );
}
async function api(action: Action, extra: Record<string, unknown> = {}) {
  const r = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, action, id: state.selectedId, ...extra }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Request failed");
  state = data;
  render();
}
async function run(work: () => Promise<void>) {
  if (busy) return;
  busy = true;
  render();
  try {
    await work();
  } catch (e) {
    status(e instanceof Error ? e.message : "Operation failed.");
  } finally {
    busy = false;
    render();
  }
}
async function refresh() {
  await api("retrieve");
  await api("history");
}
loadDraft(CASE);
$<HTMLTextAreaElement>("follow-up").value = FOLLOW_UP;
$("create-case").onclick = () =>
  void run(async () => {
    await api("create", { draft: draft() });
    status("New session created. Refresh history to observe initial work.");
  });
$("retrieve-case").onclick = () =>
  void run(async () => {
    await api("retrieve");
    status("Details retrieved. No message was sent.");
  });
$("read-history").onclick = () =>
  void run(async () => {
    await refresh();
    status("Persisted events and status refreshed. Inspect the stop reason.");
  });
$("list-cases").onclick = () =>
  void run(async () => {
    await api("list");
    status(
      "Registered sessions listed. Select a case and refresh its history.",
    );
  });
$("update-case").onclick = () =>
  void run(async () => {
    await api("update", { draft: draft() });
    status(
      "Title, metadata, and budget updated. Session ID and history retained.",
    );
  });
$("send-message").onclick = () =>
  void run(async () => {
    await api("send", { prompt: val("follow-up") });
    await refresh();
    status(
      "Follow-up submitted to the same session. Refresh again if still running.",
    );
  });
$("archive-case").onclick = () =>
  void run(async () => {
    await api("archive", { confirm: val("archive-name") });
    await api("history");
    status("Archived. History retained; this session cannot resume.");
  });
$("delete-case").onclick = () =>
  void run(async () => {
    await api("delete", { confirm: val("delete-name") });
    status(
      "Session permanently deleted. Agent and environment definitions retained.",
    );
  });
for (const id of ["archive-name", "delete-name"]) $(id).oninput = render;
$("case-select").onchange = () =>
  void run(async () => {
    state.selectedId = val("case-select");
    state.events = [];
    render();
    if (current()) {
      await refresh();
      const s = current()!;
      loadDraft({
        title: s.title ?? "",
        project: s.metadata.project ?? "",
        budgetCents: s.budget?.max_list_cost.amount ?? "125",
        prompt: "",
      });
    }
    status("Selected case loaded. Its history belongs to this session ID.");
  });
$("mode").onchange = () =>
  void run(async () => {
    mode = val("mode") as Mode;
    const r = await fetch(`/api/state?mode=${mode}`);
    if (!r.ok) throw new Error("Could not load state");
    state = await r.json();
    $("mode-note").textContent =
      mode === "demo"
        ? "Demo replies are scripted. No cloud calls or charges."
        : "Live mode starts real budgeted work using your configured definitions. Refresh to observe progress.";
    render();
    status("Mode changed. Demo and live have separate ID registries.");
  });
$("walkthrough").onclick = () =>
  void run(async () => {
    loadDraft(CASE);
    status("Opening Maya’s case…");
    await api("create", { draft: CASE });
    await refresh();
    if (current()?.status === "idle") {
      await api("send", { prompt: FOLLOW_UP });
      await refresh();
    } else {
      status(
        "Initial work is running. Refresh until idle, then send the prepared follow-up.",
      );
      return;
    }
    if (current()?.status !== "idle") {
      status(
        "Follow-up submitted. Refresh until idle, inspect the stop reason, then update the case labels when ready.",
      );
      return;
    }
    await api("update", {
      draft: {
        ...CASE,
        title: "Case 1042 · Follow-up",
        project: "udemy-support-reviewed",
        budgetCents: "200",
      },
    });
    const s = current()!;
    loadDraft({
      title: s.title!,
      project: s.metadata.project,
      budgetCents: "200",
      prompt: "",
    });
    status(
      "Walkthrough complete. Compare the initial message and follow-up: one session ID, retained context. In live mode refresh until work settles.",
    );
  });
render();
void fetch("/api/lesson")
  .then((r) => r.json())
  .then((d) => {
    const option = $<HTMLSelectElement>("mode").options[1];
    option.disabled = !d.liveReady;
    option.textContent = d.liveReady
      ? "Live · Claude Managed Agents"
      : "Live · configure server key + definition IDs";
  })
  .catch(() => status("Could not check server configuration."));
