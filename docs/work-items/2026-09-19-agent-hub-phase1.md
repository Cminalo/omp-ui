---
title: "Agent Hub Phase 1 — read-only roster + inspector"
date: 2026-09-19
tags:
  - work-item
  - agent-hub
status: done
relates-to: ["P4"]
---

# 2026-09-19 — Agent Hub Phase 1: read-only roster + inspector

## Intent

First slice of roadmap cluster **P4** (Agent Hub), following the approved plan
in [[docs/specs/2026-09-19-agent-hub-scope-and-view-study|the hub study]]:
ship the TUI hub's read surface on the web — a dense roster with an
aggregate header, a flat ↔ spawn-tree toggle, and a per-agent inspector —
before control (chat/kill/revive) lands via the bridge extension (Phase 2).
View shape **Roster + Peek + Focus** was decided by the user; this is the
Roster + Inspector part of it.

## Changes

| File(s) | What changed |
|---|---|
| `lib/agent-hub.ts` | NEW pure view module: `groupHubBatches` (spawn-batch grouping by `parentToolCallId`, solo batches keyed by id, ordinal refinement on history merge), `hubAggregate` (measured-only sums, `null` never estimated — the TUI's `usage —` rule), `hubAgeMs` (live: since-last-activity; history: frozen run span), `isHubRunning` / `isHubAdvisor` |
| `lib/subagent-types.ts` | `SubagentKind` (`subagent`/`advisor`) on `SubagentInfo` + `SubagentHistoryEntry`, `asSubagentKind` guard |
| `lib/subagent-history.ts` | advisor artifact scan: `__advisor*.jsonl` in the sibling artifacts dir become read-only `advisor` rows, sorted after task-spawned agents |
| `hooks/useAgentSession-stream.ts` | `historyEntryToSubagentInfo` carries `kind` (only when present — never erases a merged kind) |
| `components/AgentHubDialog.tsx` | NEW hub view: roster rows (status, agent, task, live activity line, cost·tokens·age), inspector (task, current tool + args, last intent, retry, context gauge, model + role + fallback, telemetry, output/patch/branch artifacts, transcript button), aggregate header, flat ↔ tree toggle (persisted), advisor read-only badge, mobile single-pane with back |
| `components/ComposerPanels.tsx` | Subagents header restructured (div + two buttons — no nested buttons) with the open-hub affordance; `onOpenHub` prop threaded |
| `components/ChatWindow.tsx` | hub dialog state + mount; `onOpenTranscript` reuses the existing transcript dialog (stacks over the hub) |
| `lib/i18n/locales/{en,zh-CN,ja}.json` | 30 `agentHub.*` keys in all three locales |
| `lib/agent-hub.test.mjs` | NEW: 6 unit tests (grouping, ordering, ordinal refinement, running rule, measured-only aggregate, age clocks) |
| `lib/subagent-history.test.mjs` | +1 test: advisor rows (kind, sort position, non-advisor files ignored) |
| `components/AgentHubDialog.test.mjs` | NEW: 5 SSR tests (row telemetry/activity/advisor/failure line; inspector tool/gauge/model/telemetry/artifacts/advisor note) |
| `components/ComposerPanels.test.mjs` | existing calls carry `onOpenHub`; +1 test: hub affordance visible while collapsed |

## Gates

- [x] `npm run typecheck` — clean
- [x] `npm run lint` — clean, zero warnings
- [x] `npm test` — 825 tests, 823 pass, 0 fail (2 skipped). Note:
  `session-reader.test.mjs` "watcher coalesces continuous writes" failed
  5/5 runs earlier in the session AND on a clean `git stash` tree — a
  pre-existing macOS timing flake (CI covers ubuntu+windows); it passed in
  the final full run.

## Verification beyond tests

Browser smoke on the live dev app (chronos session with on-disk subagent
history): hub opens from the composer header; roster row + aggregate
("0 running · 1 total"); select → inspector (task, telemetry, session file,
Open transcript); tree ↔ flat toggle both directions with selection kept;
transcript dialog opens stacked from the inspector.

## Decisions

- **Taken:** Phase 1 consumes only data the web already receives (lifecycle/
  progress frames, `get_subagents` snapshots, on-disk history) — verified
  against the omp 18.2.5 binary that `get_subagents` is the RPC-side
  `RpcSubagentRegistry` mirror (statuses `running|completed|failed|aborted`,
  terminal rows pruned), NOT the process `AgentRegistry`. Registry-only
  fields (`parked`/`idle`, parent id, unread IRC) therefore arrive with the
  Phase 2 bridge, not now.
- **Taken:** advisor rows are read-only by kind on the roster row — the
  restriction the TUI enforces for advisors and collab guests — so any
  future control surface gates on data, not UI.
- **Taken:** spawn-tree grouping is by `task` toolCallId (batches), not full
  parent/child lineage — lineage beyond depth 1 is not on the wire; the
  bridge's registry `list` will upgrade it.
- **Rejected:** ⌘K palette entry for the hub — the palette lives in AppShell
  while the roster state lives in ChatWindow; cross-component plumbing for a
  second entry point deferred (follow-up).
- **Rejected:** per-second age ticking — a 10 s interval keeps "since last
  activity" honest without churn.

## Operational incident (recorded 2026-09-19)

The `ds4-serve` proxy (127.0.0.1:8000) rejects `image/webp` content blocks
with a misleading `400 invalid JSON request` (minimal repro: webp block →
400; PNG block → proper `invalid or unsupported PNG image`). Harness
screenshots are webp and persist in session history, so every later request
400s until omp's retry strips the image — this killed a session at 12:46 and
was reproduced against the proxy with the dumped request bodies
(`~/.omp/logs/http-400-requests/`). **Working rule adopted:** verify browser
UI with text (`evaluate`/`ariaSnapshot`), not `screenshot()`, until the proxy
accepts webp. Not an omp-web defect.

## Follow-ups

- [ ] Phase 2 (P4): bridge extension (`/ompweb-hubctl chat|kill|revive` +
      `list`) + `POST …/subagents/[id]/actions` — design + spike evidence in
      [[docs/specs/2026-09-19-agent-hub-scope-and-view-study#3.1]].
- [ ] Phase 3: focus/attach mode (swap the chat surface to a subagent).
- [ ] ⌘K palette entry for the hub (needs AppShell→ChatWindow plumbing).
- [ ] Correct the P4 precondition text in [[docs/roadmap/02-feature-parity]].
- [ ] Optional: report webp handling upstream to the proxy; report screenshot
      format expectations to the harness.

## Commit(s)

- recorded by the git-commit batches of this session (spec doc, then the
  feature batch; see `git log --since=2026-09-19`)
