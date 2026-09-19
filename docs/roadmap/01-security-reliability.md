---
title: "Pillar 1 — Security & Reliability"
date: 2026-09-18
tags:
  - roadmap
  - security
  - reliability
status: active
---

# Pillar 1 — Security & Reliability

**Objective:** the web UI is safe to run (including on a LAN) and reliable
enough to trust with real sessions. Security is a precondition, not a feature —
nothing in [[docs/roadmap/02-feature-parity]] ships at the cost of an invariant.

Anchor docs: [[docs/security/2026-09-18-security-review]] · [[docs/security/invariants]]

## Verdict at fork base

No glaring issues. Auth/CSRF/traversal/XSS primitives present, correct, tested.
The work is **closing hardening gaps** and **locking invariants with tests**.

## Work items

| ID | Sev | Item | Status | Evidence |
|----|-----|------|--------|----------|
| **S1** | Med | Mask inline `models.yml` `apiKey` in `/api/models-config` GET; sentinel echo-back on PUT so editing other fields never round-trips a real key to the client | planned | [[docs/security/2026-09-18-security-review#Medium]] |
| **S2** | Low | LAN transport: document TLS-reverse-proxy + Tailscale recipes; evaluate first-class `--tls` | planned | review L1 |
| **S3** | — | Test the unguarded invariants: I-2 (LAN needs password), I-6 (no key serialization), I-7 (no shell spawn), I-9 (self-update gating), I-10 (MCP DTO) | planned | [[docs/security/invariants]] |
| **S4** | Low | Re-run audit checklist on every upstream sync (add to sync work-item template) | standing | review Follow-ups |
| **S5** | Low | `dbus-next` advisory (Linux tray only): track upstream, no macOS impact | watch | review L2 |

## Reliability work items

| ID | Item | Status |
|----|------|--------|
| **R1** | Keep `npm test` green on **macOS** (CI is ubuntu+windows only, so macOS regressions are invisible upstream). First fix done: tray `--status` platform assertions | ongoing |
| **R2** | Add a macOS leg to CI (or a local `release:check` gate doc) so platform-specific tests run | proposed |
| **R3** | SSE reconciliation stays robust (run-id guards, visibility/online reconcile) — extend the rpc test fixtures when touching streaming | ongoing |
| **R4** | Session-list cache invalidation: never add a mutation path that skips `invalidateSessionFileListCache()` (AGENTS.md trap) — add a guard test | proposed |

## Definition of done (pillar)

- S1–S3 closed; every invariant row has a ✅ test in [[docs/security/invariants]].
- `typecheck`+`lint`+`test` green on macOS and in CI for every merged batch.
- A recorded upstream-sync checklist run exists in `docs/work-items/`.
