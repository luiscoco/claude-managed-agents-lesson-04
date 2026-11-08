# Instructor guide

Start in demo mode. Open the focus panel and ask students to assign responsibilities to agent, environment, and session. Run the walkthrough and point out the unchanged session ID after Maya’s second message.

Expand the request timeline to connect create input, persisted events, follow-up, and metadata update. Retrieve details again: the event count stays unchanged because retrieve is a read. A fresh case with an empty initial message demonstrates idle without completed work and history isolation.

Use the API cards for the six core lifecycle methods, plus history/send. Discuss the optional creation parameters and the distinction between a budget ceiling and a turn count. Amounts are USD cents, represented as whole-number strings. Existing budgets can be adjusted subject to consumed cost; an omitted or removed budget cannot simply be added later.

In How it works, select the eight UML workflow steps. The local host protects credentials and registered IDs. Initial input can start work before observation, so persisted events recover earlier output. In live mode, wait for idle and inspect the stop reason before continuing; repeat history refreshes while running. The walkthrough can stop early if work is still running; the prepared follow-up remains available for manual continuation.

Show terminal lifecycle actions in demo: exact title for archive, then a separate DELETE-title phrase. Ask why retrieve cannot resume an archived session, and which independent resources survive deletion. The app’s archive-before-delete rule is not an API precondition.

Live mode prerequisites: a valid Managed Agents credential, an existing support-coach agent, an existing cloud environment, and model support for session budgets. No student secrets should appear in prompts or source code. Use the standalone example only deliberately; it starts real work.

Finish with the six-question quiz. Student success: explain why one case retains context, another has separate history, metadata changes do not become user messages, and archive differs from delete.
