---
title: Security review — fork baseline
date: 2026-09-18
tags:
  - security
  - review
  - audit
status: done
upstream-commit: 330db7d
---

# Security review — fork baseline (2026-09-18)

Full read-only audit of the fork base (`kahme247/ompweb` @ `330db7d`) before any
feature work. Threat model: the app **drives an agent with arbitrary code
execution by design** and is commonly bound to the LAN (`0.0.0.0`), so the
primary risks are unauthenticated network exposure, credential leakage through
HTTP routes, path traversal beyond project roots, XSS via agent-produced
transcript content, injection into `omp` spawns/installers, and supply chain.

**Verdict: no glaring issues.** The auth/CSRF/traversal/XSS primitives are
present, correct, and unit-tested. Findings below are hardening items.

## Good practices (the baseline — see [[docs/security/invariants|invariants register]])

| Control | Evidence |
|---|---|
| LAN bind refuses to start without a password | `bin/omp-web.js:555-559` |
| Session cookie `httpOnly` + `secure` under TLS + `sameSite=lax` | `app/api/web-auth/session/route.ts:30-39` |
| Constant-time password compare | `lib/web-auth.ts:19` |
| CSRF / DNS-rebinding: origin + `sec-fetch-site` gate on all `/api/` | `proxy.ts:5-7`, `lib/request-security.ts` (+ tests) |
| Password gate covers all pages + APIs when enabled | `proxy.ts` matcher |
| Path traversal: realpath allowlist both sides, Windows `\\?\` handling | `lib/file-access.ts:77-79`; `app/api/files/[...path]/route.ts:107-116` |
| `cwd` on git routes validated against allowed roots | `app/api/git/status/route.ts:13-27` |
| XSS: `rehype-raw` → `rehype-sanitize` custom schema; math pipeline shares schema (can't drift) | `lib/markdown.ts:31` |
| Mermaid `securityLevel: "strict"` | `components/MermaidBlock.tsx:43` |
| API-key route never returns keys, refuses to write `agent.db` | `app/api/auth/api-key/[provider]/route.ts` |
| MCP servers serialized as sanitized DTOs (env/headers never sent) | `components/McpConfig.tsx:10-13` |
| Spawns use execFile/arg arrays, sanitized child env | `lib/omp/rpc-process.ts:110` |
| Self-update: same-origin + two-phase prepare/commit + attemptId | `app/api/app-update/route.ts:61-87` |
| Bounded request bodies on mutating routes (413) | `lib/bounded-form-data.ts` (+ tests) |

## Findings

### Medium

- **M1 — inline `models.yml` API keys served to the browser.**
  `GET /api/models-config` returns `file.config` verbatim
  (`app/api/models-config/route.ts:27`) and `sanitizeModelsConfig` keeps
  `apiKey` (`lib/omp/models-config.ts:40,168`). Custom-provider inline keys
  reach the client and sit in JS state; on LAN mode that is plaintext HTTP.
  Exploit: LAN sniffing or any XSS reads them. OAuth/env keys unaffected
  (`agent.db`/env).
  **Remediation:** return masked values + `hasKey`; echo-back sentinel on PUT
  when unchanged. Tracked in [[docs/roadmap/01-security-reliability]].

### Low

- **L1 — LAN transport is HTTP-only.** Password + session cookie cross the LAN
  in cleartext. Already warned at startup (`bin/omp-web.js:560`). Mitigation:
  Tailscale/VPN or a TLS reverse proxy; document a first-class TLS option.
- **L2 — `dbus-next` transitive moderate advisories** (usocket, xml2js) — Linux
  tray only; irrelevant on macOS. Only prod-audit hit (`npm audit --omit=dev`).
- **L3 — self-update worker uses `shell:true` on Windows**
  (`bin/omp-web-update-worker.js:139`) — normal for npm shims but a wider
  surface; macOS path avoids shell. Gated by same-origin + two-phase.

### Info — outbound endpoints (all check-only; no transcript/session data)

| Endpoint | Purpose | Source |
|---|---|---|
| `registry.npmjs.org` | app update check | `lib/npm-update.ts:45` |
| `api.github.com` | release notes; skill-update tree hashes | `lib/github-release-notes.ts:1`; `lib/skill-updates.ts:158` |
| `github.com` (git) | skill folder hash | `lib/skill-updates.ts:121` |
| `skills.sh` | skill search/install (`SKILLS_API_URL` overridable) | `lib/skill-updates.ts:13` |
| `OMP_WEB_STT_ENDPOINT` | user-configured speech-to-text | `app/api/stt/route.ts` |

## Reliability baseline (same date)

- `npm ci` clean; install-script warnings surfaced by npm (review with
  `npm install-scripts ls`).
- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` — see
  [[docs/work-items/2026-09-18-bootstrap]] for the exact result captured at
  bootstrap.

## Follow-ups

- [ ] M1 fix (mask `apiKey` round-trip) → roadmap S1
- [ ] TLS/HTTPS guidance doc for LAN use → roadmap S2
- [ ] Add security-invariant regression tests where missing (see invariants)
- [ ] Re-run this audit checklist on each upstream sync
