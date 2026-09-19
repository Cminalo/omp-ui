---
title: "Pillar 2 — TUI Feature Parity"
date: 2026-09-18
tags:
  - roadmap
  - parity
  - features
status: active
---

# Pillar 2 — TUI Feature Parity

**Objective:** the web UI strives to match the OMP TUI's features. The
authoritative gap map is [[docs/parity/tui-vs-web]] (11 domains, ~90
capabilities, legend ✅/🟡/❌/🚫/❓). This pillar sequences the closure work.

## How parity work is decided

1. **Security first** — no parity item may weaken
   [[docs/security/invariants|an invariant]] (e.g. a collab feature must not
   bypass `proxy.ts`).
2. **RPC-native preferred** — features reachable through existing omp RPC
   commands are cheap and stable; features needing CLI shelling or file
   scraping carry a maintenance note in the matrix.
3. **One cluster per sprint** — each cluster becomes a `docs/work-items/`
   entry with its own gates and commit series.

## Candidate clusters (from the matrix summary)

| ID | Cluster | Why it ranks | Precondition |
|----|---------|--------------|--------------|
| **P1** | Collaboration: `/share` + `/collab` (host) + join-link | OMP already ships E2E-encrypted relay + web guest client; the web UI is the natural host/join surface; users already run ompweb on LAN | none — RPC + config only |
| **P2** | Rewind / checkpoint / undo-edit | session-safety feature with zero web surface; grep-confirmed absent | verify RPC/command surface for rewind |
| **P3** | Native plan mode (read-only gate + propose/approve/edit/reject) | today's `/plan` is prompt-emulation; native gate changes what the agent can do — real parity | RPC `propose` surface investigation |
| **P4** | Agent Hub control (chat/kill/revive subagents) | roster/transcript exist; control completes the feature | none — RPC `agent-cmd` equivalents exist |
| **P5** | Memory browser (search/edit/recall) | settings exist, no content UI | memory backend RPC/CLI investigation |
| **P6** | Context-file editor (AGENTS.md/rules viewer) | low risk, high daily value | none |
| **P7** | Git staging/commit UI | read-only today; `omp git` TUI proves the UX | none |
| **P8** | Marketplace source management | plugin CRUD exists; sources don't | none — `omp plugin marketplace` CLI |
| **P9** | Foreign session import (`--from-claude`/`--from-codex`) | import path exists for `.jsonl` | CLI flag investigation |

Ordering above is a **proposal for review** — the user picks the first sprint
(P0 decision below). Quick wins independent of clusters: `set_todos` wiring
(already allowlisted, no client call site), `get_messages_page` for large
transcripts, service-tier control, `/clear` verification.

## Work items

- **P0** — Review [[docs/parity/tui-vs-web]] with the user; confirm ❓ rows;
  pick the first cluster. ← **current state**
- **P1…P9** — each becomes `docs/work-items/<date>-<cluster>.md` when scheduled.

## Definition of done (pillar)

- Every ❓ row resolved to ✅/🟡/❌/🚫 with evidence.
- First chosen cluster shipped end-to-end (route + UI + tests + docs + matrix
  row flipped to ✅).
- Matrix updated in the same commit as each parity change (A5 rule).
