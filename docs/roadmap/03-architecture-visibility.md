---
title: "Pillar 3 — Architecture Visibility"
date: 2026-09-18
tags:
  - roadmap
  - architecture
  - diagram
status: active
---

# Pillar 3 — Architecture Visibility

**Objective:** the entire web UI and its API/connection surface to the omp TUI
are diagrammed, so development, maintenance, and decisions have a shared map.
Diagrams are Mermaid (Obsidian-native), colocated with the code they describe.

## Diagram set

| ID | Diagram | File | Covers |
|----|---------|------|--------|

| **A1** | System overview | [[docs/architecture/overview]] | browser ↔ Next ↔ omp child ↔ `~/.omp/agent`; read vs live paths; security chokepoints |
| **A2** | API surface map | [[docs/architecture/api-surface]] | every `/api/*` route, methods, data source, invariant refs; live-prompt sequence |
| **A3** | omp connection | [[docs/architecture/omp-connection]] | RpcProcess lifecycle, NDJSON protocol, on-disk session contract, reconciliation |
| **A4** | Security model | [[docs/security/2026-09-18-security-review]] | auth/CSRF gate, file allowlist, XSS pipeline, credential boundaries |
| **A5** | Feature-parity map | [[docs/parity/tui-vs-web]] | TUI capability → web surface → RPC command (the living gap map) |

> **A5 status (2026-09-18):** the parity matrix exists as an 11-domain table,
> not yet a diagram. A capability-flow diagram (TUI capability → route → RPC
> command → on-disk artifact) is a follow-up once the ❓ rows are resolved.

## Maintenance rules

- **A2 is a living contract:** the route table is updated in the same commit
  that adds/removes a route (enforced by the AGENTS.md doc rule).
- New invariant → new row in [[docs/security/invariants]] + link from A4.
- New parity decision → row in [[docs/parity/tui-vs-web]] + a `docs/work-items/` note.
- Diagrams describe **current** state; forward-looking notes go in the roadmap,
  not the diagram.

## Decisions this enables

- Where a new feature belongs (route vs component vs RPC command).
- Blast radius of a change (which invariants a diff touches).
- Upstream-merge conflict triage (map both sides before resolving).

## Definition of done (pillar)

- A1–A5 exist, render in Obsidian, and match the code at `HEAD`.
- A2/A5 are updated-by-policy with each relevant commit.
- A fresh agent can orient from [[docs/architecture/overview]] + `AGENTS.md`
  without reading source first.
