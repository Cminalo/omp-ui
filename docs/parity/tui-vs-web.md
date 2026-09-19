---
title: "Feature parity — OMP TUI vs omp-ui web"
date: 2026-09-18
tags:
  - parity
  - matrix
  - tui
status: draft
relates-to: ["P0", "P1", "P2", "P3"]
---

# Feature parity — OMP TUI ↔ omp-ui web

The living gap map (roadmap item **A5**, pillar [[docs/roadmap/02-feature-parity]]).

**Legend** · ✅ parity · 🟡 partial · ❌ missing · 🚫 not applicable to a browser · ❓ needs verification

Sources: TUI = `omp://cli-reference.md`, `omp://slash-command-internals.md`,
`omp://tools/*`, `omp://tui.md`. Web = full route/component inventory taken
2026-09-18 at `330db7d`.

## 1. Chat, prompting, streaming

| TUI capability | Web | Notes |
|---|---|---|
| Prompt + image/file attach (`@path`) | ✅ | `chat-prompt`, `composer-attachments` |
| Steering / follow-up queues | ✅ | `chat-steer`, `chat-follow-up`, queue panel with edit/delete/promote |
| Interrupt (Esc) | ✅ | `chat-abort` |
| Interrupt-and-prompt | ✅ | `abort_and_prompt` |
| Slash-command palette | ✅ | from `get_available_commands` + web builtins |
| Prompt templates / file slash commands | ✅ | expanded server-side by omp |
| `!` bash mode | 🟡 | `!!` (exclude-from-context) unavailable — no RPC option |
| `@` file mentions | ✅ | fuzzy `file-index` |
| Thinking blocks | ✅ | lazy-loaded from disk |
| Tool-call rendering | 🟡 | web has its own formatters; **not** omp's `renderCall`/`renderResult` tool renderers |
| `/btw` side questions | ❌ | no web surface (P2 candidate) |
| `/pause` global gate | ❌ | TUI-only |
| Completion notification | ✅ | sound + browser Notification |
| Dictation / STT | ✅ | web-only extra (no TUI equivalent) |
| Draft recovery | ✅ | web-only extra |

## 2. Model, thinking, runtime control

| TUI | Web | Notes |
|---|---|---|
| `/model` switch + cycle | ✅ | `set_model`, `cycle_model` |
| Thinking level + cycle | ✅ | effort-map aware |
| Fast mode | ✅ | `set_fast_mode` |
| Auto-retry + abort | ✅ | |
| Auto-compaction + manual `/compact` | ✅ | + savings banner |
| Model roles (`smol`/`slow`/`plan`) | ✅ | `model-roles` editor |
| Service tier | ❓ | launch flag only; no web control found |
| Tool set at launch (`--tools`) | ✅ | preset none/default/full, **new sessions only** |
| Tool set at runtime (`get_tools`/`set_tools`) | ❌ | explicitly rejected — omp RPC has no equivalent |
| `--prewalk` / `--plan-yolo` | ❌ | launch-only flags |
| `--max-time` session bound | ❌ | |
| Profiles (`--profile`) | 🟡 | settable via project launch config; no switcher UI |

## 3. Session lifecycle

| TUI | Web | Notes |
|---|---|---|
| new / continue / resume picker | ✅ | `session-new`, project+session sidebar |
| `--fork` / `/fork` | ✅ | fork at a user entry → omp `branch` |
| In-session branch navigation | ✅ | `BranchNavigator`, leaf switching |
| Rename / auto-name | ✅ | |
| Delete (with artifacts) | ✅ | |
| Archive / restore | ✅ | OMP gc layout |
| Import `.jsonl` | ✅ | id rewrite + cwd authorization |
| Import foreign (`--from-claude` / `--from-codex`) | ❌ | no web surface |
| `/export` HTML | ✅ | shells `omp --export` |
| Export Markdown | ✅ | web-only extra |
| `/dump` (clipboard + LLM-request sidecar) | ❌ | |
| `/share` encrypted link | ❌ | no share/collab at all (P1 candidate) |
| `/collab` live hosting + browser guest | ❌ | biggest structural gap (P1) |
| `/join` | ❌ | |
| `/rewind`, `/checkpoint`, undo-edit | ❌ | grep-confirmed absent |
| `/restart` in place | 🟡 | `session-reload` restarts the child |
| `/fresh` (provider-stream reset) | ❌ | |
| `/clear` | ❓ | needs verification |
| `/move`, `/wt` worktree relocation | 🟡 | worktree CRUD exists; no session relocation |
| Session stats (`/stats`) | ✅ | `get_session_stats` |
| `omp gc` | ❌ | |

## 4. Modes, approvals, safety

| TUI | Web | Notes |
|---|---|---|
| Plan mode (`/plan`, `--plan-yolo`) | 🟡 | **emulated** via `/plan` web slash prompt + todo panel; no `propose`/approval gate |
| Approval mode (`always-ask`/`write`/`yolo`) | ✅ | Settings → Safety |
| Per-tool allow/prompt/deny | ✅ | bash + extension rules |
| Approval prompt UI in-session | ❓ | needs verification against `tool_approval_requested` |
| Steering / follow-up / interrupt modes | ✅ | |
| `--yolo` / `--auto-approve` launch flags | 🟡 | via settings, not per-launch |

## 5. Subagents, agents, advisor

| TUI | Web | Notes |
|---|---|---|
| `task` subagent spawning | ✅ | rendered in transcript |
| Live subagent roster + progress | ✅ | composer panel, chips, telemetry |
| Subagent transcripts | ✅ | RPC paging + disk fallback |
| Agent Hub — roster, inspector, tree (read) | 🟡 | hub view shipped 2026-09-19 — [[docs/work-items/2026-09-19-agent-hub-phase1]]; registry-only fields (`parked`/`idle`, parent lineage, unread IRC) are not on the RPC wire and arrive with the bridge |
| Agent Hub control (chat/kill/revive) | ❌ | no RPC command in omp 18.2.5 (binary-verified); bridge-extension path spike-verified — [[docs/specs/2026-09-19-agent-hub-scope-and-view-study]] |
| Agent definitions CRUD | ✅ | Agents settings tab, `.md` frontmatter editor |
| Advisor (`--advisor`) | ✅ | spawn flag + settings |
| `omp ps` supervised processes | ❌ | |

## 6. Extensions: skills, plugins, MCP, hooks

| TUI | Web | Notes |
|---|---|---|
| Skills list / toggle | ✅ | |
| Skills search / install / update | ✅ | skills.sh + `npx skills add` |
| `/marketplace` add/remove/update | ❌ | plugins only, no marketplace source mgmt |
| Plugin install/enable/disable/upgrade | ✅ | shells `omp plugin` |
| MCP project config CRUD | ✅ | secrets redacted |
| MCP live status | ✅ | captured via `/mcp list` prompt |
| Hooks / extensions loading (`-e`, `--hook`) | ❌ | no per-session extension picker |
| Extension UI dialogs | ✅ | `extension_ui_request` answered in browser |
| Host tools / host URI schemes | ✅ | browser-side bridges |

## 7. Memory, intelligence, context

| TUI | Web | Notes |
|---|---|---|
| Memory backend settings | ✅ | off/local/mnemopi/hindsight |
| Memory browse / search / edit | ❌ | no browser UI |
| Autolearn settings | ✅ | |
| Compaction strategy settings | ✅ | snapcompact/handoff/context-full/shake/off |
| Context gauge + detail | ✅ | |
| TTSR (Time-Traveling Stream Rules) | ❌ | no surface |
| Handoff | ✅ | `handoff` RPC |
| Context files (`AGENTS.md`, rules) | ❌ | no viewer/editor |

## 8. Tools (agent-side)

| TUI tool | Web visibility |
|---|---|
| read / grep / glob / write / edit / bash / task / todo / web_search | ✅ rendered in transcript |
| `lsp` | 🟡 rendered; no LSP UI (diagnostics, symbols) |
| `debug` (DAP) | ❌ no debugger UI |
| `browser` / computer use | ❌ |
| `eval` (Python/JS kernel) | 🟡 rendered only |
| `generate_image`, `tts`, `github`, `memory_edit`, `recall`/`retain`/`reflect`/`learn` | 🟡/❌ rendered where they appear; no dedicated UI |
| Tool renderer gallery (`omp gallery`) | ❌ |

## 9. Usage, stats, providers

| TUI | Web | Notes |
|---|---|---|
| `/usage` provider limits | ✅ | `omp usage --json --redact` |
| `omp stats` / `/stats-all` | ✅ | own SQLite usage dashboard, ranges, per-project |
| `omp usage clients` | ❌ | |
| `omp bench` / `if-bench` | ❌ | |
| Provider login (OAuth) | ✅ | interactive over RPC |
| API-key add/remove | 🟡 | refused by design (omp credential store) |
| `omp token` / auth-broker / auth-gateway | ❌ | |
| Model catalog browse + test | ✅ | |

## 10. Workspace, files, git

| TUI | Web | Notes |
|---|---|---|
| File browse / preview | ✅ | code, md, mermaid, images, audio, PDF, DOCX, diffs |
| File upload | ✅ | web-only extra |
| `omp git` fullscreen UI | 🟡 | status + diff read-only; **no stage/commit UI** |
| `omp worktree` / `/wt` | ✅ | |
| SSH hosts (`omp ssh`) | ❌ | |
| `--add-dir` multi-root | ❓ | needs verification |

## 11. Presentation & platform

| TUI | Web | Notes |
|---|---|---|
| Themes | ✅ | 15 web themes |
| Keybindings editor | ❌ | fixed web shortcuts |
| i18n | ✅ | en/zh-CN/ja (web-only) |
| Command palette | ✅ | |
| PWA / mobile | ✅ | web-only |
| Tray / launchd / systemd service | ✅ | web-only |
| `omp say` (TTS out) | ❌ | |
| `omp shell` console | ❌ | |
| `omp render` / `gallery` | ❌ | |

## Summary — the gap clusters

1. **Collaboration** (`/collab`, `/share`, `/join`) — entirely absent. Highest-leverage gap; OMP already ships an encrypted relay + `collab-web` client. → **P1**
2. **Rewind / checkpoint / undo-edit** — no recovery surface in the web UI. → **P2**
3. **Plan mode is emulated, not native** — no read-only gate, no approval/edit/reject flow. → **P3**
4. **Agent Hub control** (chat/kill/revive subagents) — read-only hub view
   shipped 2026-09-19; control awaits the bridge extension (P4 phase 2).
5. **Memory browser**, **context-file editor**, **TTSR**, **LSP/DAP UIs** — no surface.
6. **Marketplace source management**, **extension/hook picker**, **foreign session import**.
7. **Git staging/commit UI** — read-only diff/status today.
