---
title: "STATUS — live board"
date: 2026-09-18
tags:
  - omp-ui
  - status
---

# STATUS

Live status board. Refresh before significant commits (see `AGENTS.md` → Status Tracking).

## Capabilities

| Area | State |
|---|---|
| Fork governance (AGENTS.md mission, gates, work-items, commits) | done (2026-09-18) |
| Security baseline review | done (2026-09-18) — [[docs/security/2026-09-18-security-review]] |
| Security invariants register | done — [[docs/security/invariants]] |
| macOS test-suite green | done (2026-09-18) — tray `--status` platform fix |
| Roadmap wiki (MOC + 3 pillars) | active — [[docs/roadmap/index]] |
| Architecture diagrams | active — [[docs/architecture/overview]] |
| TUI ↔ web feature parity | active — [[docs/roadmap/02-feature-parity]] |
| M1: mask `models.yml` inline keys | planned — [[docs/roadmap/01-security-reliability]] |

## Quality baseline (2026-09-18, `330db7d` + bootstrap)

- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ on macOS
  (upstream CI covers ubuntu+windows only; macOS was previously red — fixed)
- `npm audit --omit=dev`: 1 direct moderate (`dbus-next`, Linux-tray-only)

## Recent batches

- 2026-09-18: fork bootstrap — governance, security review, roadmap wiki,
  architecture docs, macOS test fix. [[docs/work-items/2026-09-18-bootstrap]]

## Next work

1. S1 — mask inline `models.yml` keys in `/api/models-config` round-trip
2. P-series — first parity items from [[docs/roadmap/02-feature-parity]]
3. A-series — keep [[docs/architecture/api-surface]] current as routes change

## Known limitations

- LAN mode is HTTP-only (password protects the UI, not the transport) — see L1 in the security review.
- Feature parity vs the TUI is not yet fully inventoried; the parity matrix is the source of truth once complete.
- Upstream identity (npm name `@kahme247/ompweb`, badges, Discord) retained pending rebrand decision.
