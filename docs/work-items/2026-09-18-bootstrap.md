---
title: "Fork bootstrap — governance, security baseline, roadmap wiki"
date: 2026-09-18
tags:
  - work-item
  - bootstrap
status: done
relates-to: ["S1", "S2", "S3", "A1", "A2", "A3", "P0"]
---

# 2026-09-18 — Fork bootstrap

## Intent

Fork of `kahme247/ompweb` cloned as `Cminalo/omp-ui` (`upstream` remote set,
fork base `330db7d`). Establish project conventions adapted from the team's
`init-py-project` skill (quality gates, testing tiers, docs tree, work-log
discipline, conventional commits) to this TypeScript/Next.js repo, complete a
security baseline review, and stand up the roadmap wiki whose three pillars are
(1) security & reliability, (2) TUI feature parity, (3) architecture visibility.

## Changes

| File(s) | What changed |
|---|---|
| `AGENTS.md` | Governance header prepended (mission, gates, work-items, invariants, fork policy); upstream architecture notes preserved below |
| `STATUS.md` | New live status board |
| `CHANGELOG.md` | Fork-batch entry under Unreleased |
| `.gitignore` | Ignore `.obsidian/` (docs/ doubles as a wiki vault) |
| `docs/security/2026-09-18-security-review.md` | Full baseline review with file:line evidence |
| `docs/security/invariants.md` | Invariant register I-1…I-10 with test coverage gaps |
| `docs/architecture/{overview,api-surface,omp-connection}.md` | Mermaid diagrams + route map |
| `docs/roadmap/*` | MOC + three pillar files |
| `docs/parity/tui-vs-web.md` | Feature-parity matrix (first pass) |
| `docs/work-items/TEMPLATE.md` | Work-log template |
| `bin/omp-web-tray.test.mjs` | Platform-aware `--status` assertion (macOS was structurally red) |

## Gates

- [x] `npm run typecheck` — pass
- [x] `npm run lint` — pass
- [x] `npm test` — pass on macOS after the tray-test fix (before: 1 failure;
  upstream CI matrix is ubuntu+windows only, so macOS regressions like this
  are invisible upstream)
- `npm audit --omit=dev` — 1 direct moderate (`dbus-next`, Linux tray only)

## Decisions

- **Taken:** adapt the Python skill's *conventions*, not its tooling — gates
  are `typecheck/lint/test`, tests stay co-located `*.test.mjs` (`node:test` +
  jiti), docs tree gains `roadmap/ work-items/ architecture/ security/ parity/`
  alongside existing `specs/`.
- **Taken:** `docs/` is an Obsidian vault: YAML frontmatter on every new page,
  `[[wikilinks]]` inside `docs/`, relative links at top level, Mermaid for all
  diagrams.
- **Taken:** keep upstream identity (npm name, badges, Discord) until an
  explicit rebrand decision.
- **Rejected:** moving tests to a separate `tests/` tree — fights 100+
  existing co-located files and the `npm test` glob.
- **Rejected:** rewriting the upstream `AGENTS.md` — prepended governance
  instead; its architecture notes are the authoritative app map.

## Follow-ups

- [ ] **S1** mask inline `models.yml` keys in `/api/models-config` (M1)
- [ ] **S2** TLS/VPN guidance for LAN deployment (L1)
- [ ] **S3** tests for unguarded invariants (I-2, I-6, I-7, I-9, I-10)
- [ ] **P0** parity matrix review pass with the user; pick first parity sprint

## Commits

- recorded by the git-commit batches of this session (see `git log --since=2026-09-18`)
