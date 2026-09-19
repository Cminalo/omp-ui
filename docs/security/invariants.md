---
title: "Security invariants register"
date: 2026-09-18
tags:
  - security
  - invariants
status: active
relates-to: ["S1", "S3"]
---

# Security invariants register

The controls verified in [[docs/security/2026-09-18-security-review]] restated as
**invariants**: properties every future change must preserve. Each has a
verification pointer; where no test exists yet, the invariant is guarded only by
review — closing those gaps is roadmap item **S3**.

| # | Invariant | Guard | Test? |
|---|---|---|---|
| I-1 | `proxy.ts` is the only auth/CSRF chokepoint; every `/api/` route is gated (origin + `sec-fetch-site`; session when password enabled). No route may implement its own bypass or a second auth path. | `proxy.ts`, `lib/request-security.ts` | ✅ `request-security.test.mjs`, `web-auth.test.mjs` |
| I-2 | Non-loopback bind refuses to start without `OMP_WEB_PASSWORD`. | `bin/omp-web.js:555-559` | ❌ (S3) |
| I-3 | Session cookie: `httpOnly`, `secure` under TLS, `sameSite=lax`; password compare constant-time; session token signed + expiring. | `app/api/web-auth/session/route.ts:30-39`, `lib/web-auth.ts` | partial ✅ |
| I-4 | Every network-supplied filesystem path passes `getAllowedFileRoots()` + `isFilePathAllowed()` with realpath on both sides — file reads/writes, `cwd` params, worktrees, MCP config, subagent ids. | `lib/file-access.ts:77-79`, `app/api/files/[...path]/route.ts:107-116`, `app/api/git/status/route.ts:13-27` | ✅ traversal tests |
| I-5 | Markdown pipeline order `rehype-raw` → `rehype-sanitize` (custom schema); math variant shares the same schema arrays; mermaid `securityLevel:"strict"`. | `lib/markdown.ts:31`, `components/MermaidBlock.tsx:43` | ✅ `MarkdownBody.test.mjs` |
| I-6 | Raw API keys are never serialized to clients; `agent.db` is never opened/written from Node. Known gap: inline `models.yml` keys (M1) — until fixed, `/api/models-config` is the only exception and must not gain new consumers. | `app/api/auth/api-key/[provider]/route.ts` | ❌ (S1, S3) |
| I-7 | `omp` is spawned via execFile/arg-arrays with a sanitized env; no shell-string interpolation anywhere in server code. | `lib/omp/rpc-process.ts:110`, `lib/project-command-env.ts` | ❌ (S3) |
| I-8 | Mutating routes bound request bodies (`parseJsonWithinLimit`/`parseFormDataWithinLimit` → 413). | `lib/bounded-form-data.ts` | ✅ |
| I-9 | Self-update stays same-origin-gated and two-phase (prepare → commit with attemptId); no automatic in-app updating. | `app/api/app-update/route.ts:61-87` | ❌ (S3) |
| I-10 | MCP server configs serialize to clients as sanitized DTOs (env/headers never leave the server). | `components/McpConfig.tsx:10-13` (server DTO) | ❌ (S3) |

**Rule** (from `AGENTS.md`): touching a guard file requires adding/extending a
test for the invariant. The ❌ rows are the priority list for **S3**.
