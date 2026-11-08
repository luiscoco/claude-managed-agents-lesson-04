import type {
  SessionCreateParams,
  BetaManagedAgentsSession,
} from "@anthropic-ai/sdk/resources/beta/sessions/sessions";
export const SDK_VERSION = "1.6.0",
  BETA = "managed-agents-2026-04-01";
export type Mode = "demo" | "live";
export type Action =
  | "create"
  | "retrieve"
  | "update"
  | "list"
  | "history"
  | "send"
  | "archive"
  | "delete";
export interface Draft {
  title: string;
  project: string;
  budgetCents: string;
  prompt: string;
}
export const CASE: Draft = {
  title: "Case 1042 · Session continuity",
  project: "udemy-support",
  budgetCents: "125",
  prompt:
    "I am Maya. My case number is 1042. Explain how a Claude Managed Agents session keeps conversation context. Include a short TypeScript example.",
};
export const FOLLOW_UP =
  "What are my name and case number? Explain why you can answer in this session and show how to retrieve its details.";
export type Session = Pick<
  BetaManagedAgentsSession,
  | "id"
  | "title"
  | "agent"
  | "environment_id"
  | "status"
  | "archived_at"
  | "metadata"
  | "budget"
  | "created_at"
  | "updated_at"
>;
export interface Event {
  id: string;
  type: string;
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: { type: string };
}
export interface Trace {
  action: Action;
  explanation: string;
  request: unknown;
  response: unknown;
  status: "success";
}
export interface LabState {
  mode: Mode;
  sessions: Session[];
  selectedId: string;
  events: Event[];
  traces: Trace[];
}
export function createPayload(
  d: Draft,
  agent: string,
  environment_id: string,
): SessionCreateParams {
  return {
    agent,
    environment_id,
    title: d.title,
    metadata: { project: d.project, lesson: "04" },
    budget: {
      type: "limit",
      max_list_cost: { amount: d.budgetCents, currency: "USD" },
    },
    ...(d.prompt
      ? {
          initial_events: [
            {
              type: "user.message" as const,
              content: [{ type: "text" as const, text: d.prompt }],
            },
          ],
        }
      : {}),
  };
}
export const METHODS = [
  {
    name: "Create",
    path: "client.beta.sessions.create",
    description:
      "Connect a reusable agent and environment. Optional initial_events starts work immediately. A bare agent ID pins its latest version at creation.",
    snippet:
      'const session = await client.beta.sessions.create({\n  agent: agentId, environment_id: environmentId,\n  title: "Case 1042",\n  initial_events: [{ type: "user.message",\n    content: [{ type: "text", text: prompt }] }],\n  budget: { type: "limit",\n    max_list_cost: { amount: "125", currency: "USD" } },\n  metadata: { project: "udemy-support" },\n});',
  },
  {
    name: "Retrieve",
    path: "client.beta.sessions.retrieve",
    description:
      "Read session details and status. This does not send input, resume work, or return the complete conversation.",
    snippet:
      "const details = await client.beta.sessions.retrieve(sessionId);\nconsole.log(details.status, details.agent, details.metadata);",
  },
  {
    name: "Update",
    path: "client.beta.sessions.update",
    description:
      "This editor updates title, project metadata, and the existing budget. It cannot replace environment_id or agent identity. Budget removal cannot be undone by re-adding it.",
    snippet:
      'await client.beta.sessions.update(sessionId, {\n  title: "Case 1042 · Follow-up",\n  metadata: { project: "udemy-support", obsolete: null },\n  budget: { type: "limit",\n    max_list_cost: { amount: "200", currency: "USD" } },\n});',
  },
  {
    name: "List",
    path: "client.beta.sessions.list",
    description:
      "Follow cursor pagination. Filter by agent or statuses. The casebook displays only IDs created by this app.",
    snippet:
      'for await (const session of client.beta.sessions.list({\n  agent_id: agentId, include_archived: true, order: "desc",\n})) {\n  console.log(session.id, session.status);\n}',
  },
  {
    name: "Read persisted history",
    path: "client.beta.sessions.events.list",
    description:
      "Recover existing events, including fast replies to initial_events. This app refreshes persisted history; it does not depend on attaching a future-only stream after creation.",
    snippet:
      'for await (const event of client.beta.sessions.events.list(\n  sessionId, { order: "asc" },\n)) {\n  console.log(event.type, event);\n}',
  },
  {
    name: "Continue the same case",
    path: "client.beta.sessions.events.send",
    description:
      "Send a new user.message to the same ID. Acceptance is not proof of completion; refresh history and inspect status and stop reason.",
    snippet:
      'await client.beta.sessions.events.send(sessionId, {\n  events: [{ type: "user.message",\n    content: [{ type: "text", text: followUp }] }],\n});',
  },
  {
    name: "Archive",
    path: "client.beta.sessions.archive",
    description:
      "Terminate the session while retaining its record and history. An archived session cannot be resumed. The walkthrough never archives.",
    snippet:
      "// Deliberate terminal lifecycle action:\nconst archived = await client.beta.sessions.archive(sessionId);\nconsole.log(archived.status, archived.archived_at);",
  },
  {
    name: "Delete",
    path: "client.beta.sessions.delete",
    description:
      "Permanently remove the session and its session-scoped data. Save needed output first. This app additionally requires archival before deletion.",
    snippet:
      "// Separate, permanent decision:\nawait client.beta.sessions.delete(sessionId);\n// Independent agent/environment resources are retained.",
  },
] as const;
export const FIELDS = [
  {
    name: "agent + environment_id",
    role: "Reusable definitions",
    description:
      "The agent defines behavior; the environment defines execution configuration. The session owns the interaction state. IDs in live mode come from your existing definitions.",
    snippet:
      '{ agent: agentId, environment_id: environmentId }\n// Explicit version pin, when needed:\n// agent: { type: "agent", id: agentId, version: 1 }',
  },
  {
    name: "initial_events",
    role: "Start with input",
    description:
      "Typed events are processed at creation. Leaving this empty creates an idle session. Reading persisted events avoids missing a reply that arrived before observation.",
    snippet:
      'initial_events: [{ type: "user.message",\n  content: [{ type: "text", text: "My case is 1042." }]\n}]',
  },
  {
    name: "resources",
    role: "Existing supported resources",
    description:
      "Attach a previously uploaded file or an existing memory store using valid IDs. This lesson app sends no resource IDs; resource management is taught later.",
    snippet:
      '// Optional additions to sessions.create (not executed here):\nresources: [\n  { type: "file", file_id: existingFileId },\n  { type: "memory_store", memory_store_id: existingStoreId, access: "read_only" },\n]',
  },
  {
    name: "budget",
    role: "Enforced list-cost ceiling",
    description:
      "USD amount is a whole-number string in cents: 125 means $1.25. This is not max_turns. Limits may reject updates below consumed cost; the cap is not a preflight estimate.",
    snippet:
      'budget: { type: "limit",\n  max_list_cost: { amount: "125", currency: "USD" }\n}\n// Create with a budget if you may need to adjust it later.',
  },
  {
    name: "metadata",
    role: "Searchable application labels",
    description:
      "Metadata is not a user message. Update patches keys; null removes a key. Keep labels separate from conversation content.",
    snippet:
      'metadata: { project: "udemy-support", lesson: "04" }\n// Patch: { project: "resolved-cases", obsolete: null }',
  },
  {
    name: "status + stop_reason",
    role: "Observe progress",
    description:
      "idle, running, rescheduling, and terminated describe lifecycle. Idle alone does not prove success; inspect persisted idle events and their stop reasons.",
    snippet:
      'if (event.type === "session.status_idle") {\n  console.log(event.stop_reason);\n  // end_turn differs from budget_reached / required_action.\n}',
  },
] as const;
export const QUESTIONS = [
  {
    question: "Which object keeps a case’s conversation history?",
    answers: ["The environment definition", "The session", "The API key"],
    correct: 1,
    explanation: "Reuse the session ID to continue that interaction.",
  },
  {
    question: "Does retrieve send another message?",
    answers: ["No, it reads details", "Yes, automatically", "Only when idle"],
    correct: 0,
    explanation: "Send user.message through events.send to continue.",
  },
  {
    question: "Where can you recover a response to initial_events?",
    answers: [
      "Only a future stream",
      "Agent metadata",
      "Persisted session events",
    ],
    correct: 2,
    explanation: "events.list reads existing history, including early replies.",
  },
  {
    question: 'What does USD amount "125" represent?',
    answers: ["125 turns", "$1.25 of list cost", "$125"],
    correct: 1,
    explanation: "The monetary amount uses whole-number cents, not turns.",
  },
  {
    question: "Can an archived session resume?",
    answers: [
      "Yes, after retrieve",
      "No; archival is terminal",
      "Yes, after a metadata update",
    ],
    correct: 1,
    explanation:
      "The retained record and history are available for inspection.",
  },
  {
    question: "What happens when you delete a session?",
    answers: [
      "It removes the session and its scoped data",
      "It deletes the reusable agent too",
      "It only hides the title",
    ],
    correct: 0,
    explanation:
      "Independent agent and environment definitions remain. Save required session output beforehand.",
  },
] as const;
