import Anthropic from "@anthropic-ai/sdk";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  createPayload,
  type Action,
  type Draft,
  type Event,
  type LabState,
  type Mode,
  type Session,
} from "../shared/lesson.js";
export class LabError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function safeError(e: unknown) {
  return e instanceof LabError
    ? e.message
    : e instanceof Anthropic.AuthenticationError
      ? "Live authentication failed. Check the server credential."
      : "The operation failed. Check your IDs, permissions, session state, and API availability; then refresh.";
}
function text(v: unknown, label: string, max: number) {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    throw new LabError(`${label} must contain 1–${max} characters.`);
  return v.trim();
}
export function validateDraft(v: unknown): Draft {
  if (!v || typeof v !== "object") throw new LabError("Provide case fields.");
  const d = v as Record<string, unknown>;
  if (
    typeof d.budgetCents !== "string" ||
    !/^\d{1,5}$/.test(d.budgetCents) ||
    +d.budgetCents < 1 ||
    +d.budgetCents > 10000
  )
    throw new LabError("Budget must be 1–10000 whole USD cents.");
  if (typeof d.prompt !== "string" || d.prompt.length > 4000)
    throw new LabError("Initial message must be at most 4000 characters.");
  return {
    title: text(d.title, "Title", 120),
    project: text(d.project, "Project", 100),
    budgetCents: String(+d.budgetCents),
    prompt: d.prompt.trim(),
  };
}
export interface Provider {
  create(d: Draft): Promise<Session>;
  retrieve(id: string): Promise<Session>;
  update(id: string, d: Draft): Promise<Session>;
  list(ids: Set<string>): Promise<Session[]>;
  history(id: string): Promise<Event[]>;
  send(id: string, prompt: string): Promise<unknown>;
  archive(id: string): Promise<Session>;
  delete(id: string): Promise<unknown>;
}
export class LiveProvider implements Provider {
  constructor(
    private client: Anthropic,
    private agentId: string,
    private environmentId: string,
  ) {}
  create(d: Draft) {
    return this.client.beta.sessions.create(
      createPayload(d, this.agentId, this.environmentId),
    );
  }
  retrieve(id: string) {
    return this.client.beta.sessions.retrieve(id);
  }
  update(id: string, d: Draft) {
    return this.client.beta.sessions.update(id, {
      title: d.title,
      metadata: { project: d.project },
      budget: {
        type: "limit",
        max_list_cost: { amount: d.budgetCents, currency: "USD" },
      },
    });
  }
  async list(ids: Set<string>) {
    const result: Session[] = [];
    for await (const s of this.client.beta.sessions.list({
      agent_id: this.agentId,
      include_archived: true,
      order: "desc",
    }))
      if (ids.has(s.id)) result.push(s);
    return result;
  }
  async history(id: string) {
    const result: Event[] = [];
    for await (const event of this.client.beta.sessions.events.list(id, {
      order: "asc",
    })) {
      result.push(event);
      if (result.length > 10000)
        throw new LabError(
          "History exceeds this teaching app’s 10000-event limit. Use the SDK for a larger export.",
          413,
        );
    }
    return result;
  }
  send(id: string, prompt: string) {
    return this.client.beta.sessions.events.send(id, {
      events: [
        { type: "user.message", content: [{ type: "text", text: prompt }] },
      ],
    });
  }
  archive(id: string) {
    return this.client.beta.sessions.archive(id);
  }
  delete(id: string) {
    return this.client.beta.sessions.delete(id);
  }
}
export class DemoProvider implements Provider {
  private rows = new Map<string, Session>();
  private logs = new Map<string, Event[]>();
  private count = 0;
  async create(d: Draft) {
    const now = new Date().toISOString();
    const s: Session = {
      id: `demo_session_${++this.count}`,
      title: d.title,
      agent: {
        id: "demo_agent_support",
        version: 1,
        type: "agent",
        model: { id: "demo-model" },
        name: "Demo support coach",
        description: null,
        execution_identity: { type: "service_account" },
        multiagent: null,
        system: "Support coach",
        tools: [],
        mcp_servers: [],
        skills: [],
      },
      environment_id: "demo_environment_support",
      status: "idle",
      archived_at: null,
      metadata: { project: d.project, lesson: "04" },
      budget: createPayload(d, "a", "e").budget!,
      created_at: now,
      updated_at: now,
    };
    this.rows.set(s.id, s);
    this.logs.set(s.id, []);
    if (d.prompt) await this.send(s.id, d.prompt);
    return this.retrieve(s.id);
  }
  async retrieve(id: string) {
    const s = this.rows.get(id);
    if (!s) throw new LabError("Session not found.", 404);
    return structuredClone(s);
  }
  async update(id: string, d: Draft) {
    const s = await this.retrieve(id);
    Object.assign(s, {
      title: d.title,
      metadata: { ...s.metadata, project: d.project },
      budget: createPayload(d, "a", "e").budget,
      updated_at: new Date().toISOString(),
    });
    this.rows.set(id, s);
    return this.retrieve(id);
  }
  async list(ids: Set<string>) {
    return [...this.rows.values()]
      .filter((s) => ids.has(s.id))
      .map((s) => structuredClone(s))
      .reverse();
  }
  async history(id: string) {
    await this.retrieve(id);
    return structuredClone(this.logs.get(id)!);
  }
  async send(id: string, prompt: string) {
    const s = await this.retrieve(id);
    if (s.archived_at || s.status === "terminated")
      throw new LabError("Archived or terminated cases cannot continue.", 409);
    const log = this.logs.get(id)!;
    const first =
      log.find((e) => e.type === "user.message")?.content?.[0]?.text ?? prompt;
    const name = /I am ([\w-]+)/i.exec(first)?.[1];
    const caseNo = /case (?:number is |is )?(\d+)/i.exec(first)?.[1];
    const follow = log.some((e) => e.type === "user.message");
    const response = follow
      ? `### Continuing this case\n\n${name && caseNo ? `Your name is **${name}** and your case number is **${caseNo}**.` : "This case retains its earlier messages."}\n\nThe same session ID keeps this history. Retrieving it reads details; sending an event continues the interaction.\n\n\`\`\`typescript\nconst details = await client.beta.sessions.retrieve(sessionId);\nconsole.log(details.status);\n\`\`\``
      : "### A session is your ongoing case\n\n- **Agent:** reusable behavior.\n- **Environment:** execution configuration.\n- **Session:** conversation history and progress.\n\nKeep the session ID for a follow-up.\n\n```typescript\nconst session = await client.beta.sessions.create({\n  agent: agentId, environment_id: environmentId,\n});\n```";
    for (const e of [
      { type: "user.message", content: [{ type: "text", text: prompt }] },
      { type: "session.status_running" },
      { type: "agent.message", content: [{ type: "text", text: response }] },
      { type: "session.status_idle", stop_reason: { type: "end_turn" } },
    ])
      log.push({ id: `${id}_event_${log.length + 1}`, ...e });
    return { accepted: true, simulation: true };
  }
  async archive(id: string) {
    const s = await this.retrieve(id);
    s.status = "terminated";
    s.archived_at = new Date().toISOString();
    this.rows.set(id, s);
    return this.retrieve(id);
  }
  async delete(id: string) {
    await this.retrieve(id);
    this.rows.delete(id);
    this.logs.delete(id);
    return { id, type: "session_deleted" };
  }
}
const explanations: Record<Action, string> = {
  create:
    "Created a new case ID using the existing agent and environment. Initial input may start work immediately.",
  retrieve: "Read details only. No input was sent and no work was resumed.",
  update:
    "Patched the title, project metadata, and existing list-cost budget. Conversation history is unchanged.",
  list: "Followed pagination and retained only IDs registered by this casebook.",
  history:
    "Read persisted events, including replies that may have arrived before observation. Inspect stop reason separately from status.",
  send: "Submitted a follow-up to the same session. Refresh history to observe the outcome; acceptance does not mean completion.",
  archive:
    "Archived the case: terminal status, retained history, no resumption.",
  delete:
    "Permanently removed the session. Independent agent and environment definitions remain.",
};
export class Lab {
  readonly states: Record<Mode, LabState> = {
    demo: {
      mode: "demo",
      sessions: [],
      selectedId: "",
      events: [],
      traces: [],
    },
    live: {
      mode: "live",
      sessions: [],
      selectedId: "",
      events: [],
      traces: [],
    },
  };
  private owned: Record<Mode, Set<string>> = {
    demo: new Set(),
    live: new Set(),
  };
  private busy = new Set<Mode>();
  constructor(
    private providers: Partial<Record<Mode, Provider>>,
    private dir: string,
  ) {}
  async load() {
    try {
      const ids: unknown = JSON.parse(
        await readFile(`${this.dir}/sessions.json`, "utf8"),
      );
      if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string"))
        throw new Error("Invalid session registry");
      this.owned.live = new Set(ids);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  private async save() {
    await mkdir(this.dir, { recursive: true });
    await writeFile(
      `${this.dir}/sessions.json`,
      JSON.stringify([...this.owned.live]),
      { mode: 0o600 },
    );
  }
  async perform(mode: Mode, action: Action, data: Record<string, unknown>) {
    if (this.busy.has(mode))
      throw new LabError("Another operation is in progress.", 409);
    const p = this.providers[mode];
    if (!p)
      throw new LabError(
        "Live mode needs ANTHROPIC_API_KEY, MANAGED_AGENT_ID, and MANAGED_ENVIRONMENT_ID in the server .env.",
        503,
      );
    this.busy.add(mode);
    try {
      const state = this.states[mode];
      let response: unknown,
        request: unknown = { id: data.id };
      let s: Session | undefined;
      const id = String(data.id ?? "");
      if (action !== "create" && action !== "list") {
        if (!this.owned[mode].has(id))
          throw new LabError("Select an ID created by this casebook.", 403);
        s = await p.retrieve(id);
        state.selectedId = id;
        if (
          ["send", "update", "archive"].includes(action) &&
          (s.archived_at || s.status === "terminated")
        )
          throw new LabError(
            "Archived or terminated cases are read-only.",
            409,
          );
      }
      if (action === "create") {
        const d = validateDraft(data.draft);
        response = s = await p.create(d);
        this.owned[mode].add(s.id);
        state.selectedId = s.id;
        state.events = [];
        if (mode === "live") await this.save();
        request = { draft: d };
      } else if (action === "retrieve") response = s;
      else if (action === "list") {
        response = await p.list(this.owned[mode]);
        state.sessions = response as Session[];
        if (!state.sessions.some((s) => s.id === state.selectedId)) {
          state.selectedId = state.sessions[0]?.id ?? "";
          state.events = [];
        }
      } else if (action === "history") {
        response = state.events = await p.history(id);
      } else if (action === "update") {
        if (s!.status !== "idle")
          throw new LabError(
            "Refresh and wait for idle before editing this case.",
            409,
          );
        const d = validateDraft(data.draft);
        request = {
          id,
          title: d.title,
          metadata: { project: d.project },
          budgetCents: d.budgetCents,
        };
        response = s = await p.update(id, d);
      } else if (action === "send") {
        if (s!.status !== "idle")
          throw new LabError(
            "Refresh and wait for idle before sending a follow-up.",
            409,
          );
        const prompt = text(data.prompt, "Follow-up", 4000);
        request = { id, prompt };
        response = await p.send(id, prompt);
        s = await p.retrieve(id);
      } else if (action === "archive") {
        if (data.confirm !== s!.title)
          throw new LabError("Type the exact case title to archive.");
        response = s = await p.archive(id);
      } else if (action === "delete") {
        if (!s!.archived_at || data.confirm !== `DELETE ${s!.title}`)
          throw new LabError(
            "Archive first, then type DELETE followed by the exact title.",
          );
        response = await p.delete(id);
        this.owned[mode].delete(id);
        state.sessions = state.sessions.filter((s) => s.id !== id);
        state.selectedId = "";
        state.events = [];
        s = undefined;
        if (mode === "live") await this.save();
      } else throw new LabError("Unsupported operation.");
      if (s) {
        state.sessions = state.sessions.filter((row) => row.id !== s!.id);
        state.sessions.unshift(s);
      }
      // Delete removes this case from in-memory teaching traces as well.
      if (action === "delete")
        state.traces = state.traces.filter(
          (t) => !JSON.stringify(t).includes(id),
        );
      state.traces.push({
        action,
        explanation: explanations[action],
        request,
        response,
        status: "success",
      });
      state.traces = state.traces.slice(-30);
      return structuredClone(state);
    } finally {
      this.busy.delete(mode);
    }
  }
}
