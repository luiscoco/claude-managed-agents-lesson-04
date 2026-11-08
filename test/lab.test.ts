import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  Lab,
  DemoProvider,
  LiveProvider,
  validateDraft,
} from "../src/server/lab.js";
import { CASE, FOLLOW_UP, createPayload } from "../src/shared/lesson.js";
async function setup() {
  return new Lab(
    { demo: new DemoProvider() },
    await mkdtemp(join(tmpdir(), "sessions-lab-")),
  );
}
test("create, recover initial history, continue same ID with context, update without losing history", async () => {
  const lab = await setup();
  let s = await lab.perform("demo", "create", { draft: CASE });
  const id = s.selectedId;
  assert.equal(s.events.length, 0);
  s = await lab.perform("demo", "history", { id });
  assert.equal(s.events.length, 4);
  await lab.perform("demo", "send", { id, prompt: FOLLOW_UP });
  s = await lab.perform("demo", "history", { id });
  assert.match(JSON.stringify(s.events), /Maya/);
  assert.match(JSON.stringify(s.events), /1042/);
  assert.equal(s.events.length, 8);
  s = await lab.perform("demo", "update", {
    id,
    draft: { ...CASE, project: "reviewed", budgetCents: "200" },
  });
  assert.equal(s.selectedId, id);
  assert.equal(s.sessions[0].metadata.project, "reviewed");
  assert.equal(s.events.length, 8);
});
test("retrieve does not send input; a second empty case has independent history", async () => {
  const lab = await setup();
  let s = await lab.perform("demo", "create", { draft: CASE });
  const id = s.selectedId;
  await lab.perform("demo", "retrieve", { id });
  s = await lab.perform("demo", "history", { id });
  assert.equal(s.events.length, 4);
  s = await lab.perform("demo", "create", { draft: { ...CASE, prompt: "" } });
  assert.notEqual(s.selectedId, id);
  s = await lab.perform("demo", "history", { id: s.selectedId });
  assert.equal(s.events.length, 0);
});
test("archive retains history, blocks send/update; delete requires separate confirmation", async () => {
  const lab = await setup();
  let s = await lab.perform("demo", "create", { draft: CASE });
  const id = s.selectedId;
  await assert.rejects(
    lab.perform("demo", "archive", { id, confirm: "wrong" }),
  );
  await assert.rejects(
    lab.perform("demo", "delete", { id, confirm: `DELETE ${CASE.title}` }),
  );
  await lab.perform("demo", "archive", { id, confirm: CASE.title });
  s = await lab.perform("demo", "history", { id });
  assert.equal(s.events.length, 4);
  assert.equal(s.sessions[0].status, "terminated");
  await assert.rejects(lab.perform("demo", "send", { id, prompt: "Continue" }));
  await assert.rejects(lab.perform("demo", "update", { id, draft: CASE }));
  s = await lab.perform("demo", "delete", {
    id,
    confirm: `DELETE ${CASE.title}`,
  });
  assert.equal(s.sessions.length, 0);
  assert.equal(s.events.length, 0);
  await assert.rejects(lab.perform("demo", "retrieve", { id }));
});
test("server validation and cross-mode ID isolation", async () => {
  for (const budgetCents of ["0", "1.25", "NaN", "10001", "-1"])
    assert.throws(() => validateDraft({ ...CASE, budgetCents }));
  const lab = await setup();
  await assert.rejects(
    lab.perform("demo", "retrieve", { id: "ses_someone_else" }),
    /created by this casebook/,
  );
  await assert.rejects(
    lab.perform("live", "create", { draft: CASE }),
    /Live mode needs/,
  );
  assert.equal(
    createPayload(CASE, "agent", "env").budget!.max_list_cost.amount,
    "125",
  );
});
test("official SDK sends current beta and exact create/update fields; paginates sessions and history", async () => {
  const calls: {
    path: string;
    method: string;
    body: any;
    beta: string | null;
  }[] = [];
  const provider = new DemoProvider();
  const row = await provider.create(CASE);
  let pages = 0,
    events = 0;
  const client = new Anthropic({
    apiKey: "test-only",
    maxRetries: 0,
    fetch: async (input, init) => {
      const req = new Request(input, init),
        u = new URL(req.url);
      const raw = await req.text();
      calls.push({
        path: u.pathname + u.search,
        method: req.method,
        body: JSON.parse(raw || "{}"),
        beta: req.headers.get("anthropic-beta"),
      });
      let value: unknown = row;
      if (u.pathname.endsWith("/events") && req.method === "GET") {
        events++;
        value = {
          data: [{ id: `event_${events}`, type: "session.status_running" }],
          next_page: events === 1 ? "events-page-2" : null,
        };
      } else if (u.pathname === "/v1/sessions" && req.method === "GET") {
        pages++;
        value = {
          data: pages === 1 ? [{ ...row, id: "unowned" }] : [row],
          next_page: pages === 1 ? "sessions-page-2" : null,
        };
      } else if (u.pathname.endsWith("/events")) value = { events: [] };
      else if (req.method === "DELETE")
        value = { id: row.id, type: "session_deleted" };
      return new Response(JSON.stringify(value), {
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  const live = new LiveProvider(client, "agent_existing", "env_existing");
  await live.create(CASE);
  await live.update(row.id, { ...CASE, budgetCents: "200" });
  assert.deepEqual(
    (await live.list(new Set([row.id]))).map((s) => s.id),
    [row.id],
  );
  assert.equal((await live.history(row.id)).length, 2);
  await live.send(row.id, FOLLOW_UP);
  await live.archive(row.id);
  await live.delete(row.id);
  assert.equal(pages, 2);
  assert.equal(events, 2);
  assert.ok(calls.every((c) => c.beta?.includes("managed-agents-2026-04-01")));
  const create = calls[0].body;
  assert.equal(create.agent, "agent_existing");
  assert.equal(create.environment_id, "env_existing");
  assert.equal(create.initial_events[0].type, "user.message");
  assert.equal(create.budget.max_list_cost.amount, "125");
  assert.equal(calls[1].body.metadata.project, CASE.project);
  assert.equal(calls[1].body.agent, undefined);
  assert.ok(calls.some((c) => c.path.includes("page=sessions-page-2")));
});
test("live ID registry survives restart and still rejects unrelated IDs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sessions-registry-"));
  const provider = new DemoProvider();
  const first = new Lab({ live: provider }, dir);
  const s = await first.perform("live", "create", { draft: CASE });
  const second = new Lab({ live: provider }, dir);
  await second.load();
  const listed = await second.perform("live", "list", {});
  assert.equal(listed.sessions[0].id, s.selectedId);
  await assert.rejects(second.perform("live", "retrieve", { id: "not-owned" }));
});
