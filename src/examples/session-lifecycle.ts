import Anthropic from "@anthropic-ai/sdk";
import { CASE, createPayload } from "../shared/lesson.js";
// Run explicitly with npm run example. This creates a real, budgeted session.
process.loadEnvFile();
const agentId = process.env.MANAGED_AGENT_ID;
const environmentId = process.env.MANAGED_ENVIRONMENT_ID;
if (!agentId || !environmentId || !process.env.ANTHROPIC_API_KEY)
  throw new Error("Configure the API key and existing agent/environment IDs.");
const client = new Anthropic();
const session = await client.beta.sessions.create(
  createPayload(CASE, agentId, environmentId),
);
console.log("Keep this ID:", session.id);
const details = await client.beta.sessions.retrieve(session.id);
console.log("Status:", details.status);
// Initial input can already have produced events; read persisted history.
for await (const event of client.beta.sessions.events.list(session.id, {
  order: "asc",
}))
  console.log(event.type, event);
// Repeat history reads later to observe further progress. This script does not
// infer successful completion from idle or automatically archive/delete.
await client.beta.sessions.update(session.id, {
  metadata: { project: "udemy-support-reviewed" },
});
for await (const row of client.beta.sessions.list({ agent_id: agentId }))
  console.log(row.id, row.title);
