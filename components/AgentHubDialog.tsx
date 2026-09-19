"use client";

// Agent Hub — the session's subagent roster + inspector (read-only phase).
//
// TUI parity target: `omp://agent-hub.md` (roster rows with status/activity/
// usage, aggregate header, flat ↔ tree toggle, inspector beside the roster).
// Control (chat / kill / revive) and the focus/attach mode are the next
// phases and ride on the bridge extension — see
// docs/specs/2026-09-19-agent-hub-scope-and-view-study.md. Everything this
// view shows comes from data the web already receives (lifecycle/progress
// frames, get_subagents snapshots, on-disk history), so it works with and
// without a live RPC child.

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Columns2, Eye, Network, Rows3 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { SubagentInfo } from "@/lib/subagent-types";
import { groupHubBatches, hubAggregate, hubAgeMs, isHubAdvisor, isHubRunning } from "@/lib/agent-hub";
import { countNestedSubagents, formatCost, formatDuration, formatTokens, shortModel } from "@/lib/subagent-format";
import { formatPercent } from "@/lib/format";
import { Dialog, DialogContent, DialogClose } from "./ui/primitives";
import { SubagentStatusIcon } from "./SubagentStatusIcon";

const TREE_VIEW_STORAGE_KEY = "omp-web:hub-tree-view";

function loadTreeView(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TREE_VIEW_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveTreeView(tree: boolean): void {
  try {
    window.localStorage.setItem(TREE_VIEW_STORAGE_KEY, tree ? "1" : "0");
  } catch {
    // Storage disabled — the toggle still works for the session.
  }
}

const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/** Right-hand telemetry column of a roster row: cost · tokens · age. Missing
 * measurements render nothing — the hub never estimates. */
function RowTelemetry({ subagent, ageLabel }: { subagent: SubagentInfo; ageLabel: string | null }) {
  const parts = [
    formatCost(subagent.progress?.cost),
    formatTokens(subagent.progress?.tokens),
    ageLabel,
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return null;
  return (
    <span style={{ ...monoStyle, fontSize: 10.5, color: "var(--text-dim)", flexShrink: 0, whiteSpace: "nowrap" }}>
      {parts.join(" · ")}
    </span>
  );
}

/** One-line activity under the task: current tool (live), retry state, or the
 * settled outcome. Mirrors the composer chip line, hub-dense variant. */
function RowActivity({ subagent }: { subagent: SubagentInfo }) {
  const { t } = useI18n();
  const progress = subagent.progress;
  const live = isHubRunning(subagent);
  if (live && progress?.retryState) {
    return (
      <span style={{ fontSize: 10.5, color: "var(--status-warn, var(--accent-strong))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        ⟳ {t("chatWindow.subagentRetrying", { attempt: progress.retryState.attempt, max: progress.retryState.maxAttempts })}
      </span>
    );
  }
  if (live && progress?.currentTool) {
    return (
      <span style={{ ...monoStyle, fontSize: 10.5, color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {progress.currentTool}
        {progress.currentToolArgs ? ` ${progress.currentToolArgs}` : ""}
      </span>
    );
  }
  if (subagent.status === "failed") {
    const reason = subagent.result?.error ?? progress?.retryFailure?.errorMessage;
    if (reason) {
      return <span style={{ fontSize: 10.5, color: "var(--status-error)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{reason}</span>;
    }
  }
  if (live && progress?.lastIntent) {
    return <span style={{ fontSize: 10.5, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{progress.lastIntent}</span>;
  }
  return null;
}

/** Exported for SSR tests (the Dialog portal itself renders nothing static). */
export function HubRow({ subagent, ageLabel, selected, onSelect }: {
  subagent: SubagentInfo;
  ageLabel: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const advisor = isHubAdvisor(subagent);
  const running = isHubRunning(subagent);
  const label = `${subagent.agent} · ${t(`chatWindow.subagentState.${subagent.status}`)} · ${subagent.task ?? subagent.description ?? ""}`.replace(/\s+$/, "");
  return (
    // listbox/option pattern: the container is role="listbox", so the row is
    // an option (aria-selected is invalid on the implicit button role); the
    // native button element keeps focus and click behavior.
    <button
      type="button"
      onClick={onSelect}
      role="option"
      aria-selected={selected}
      aria-label={label}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "6px 10px",
        border: "none",
        borderLeft: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
        background: selected ? "var(--bg-selected)" : "transparent",
        color: "var(--text)",
        cursor: "pointer",
        textAlign: "left",
        fontSize: 12,
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <SubagentStatusIcon status={subagent.status} live={running ? true : subagent.source === "history" ? false : undefined} />
          <span style={{ ...monoStyle, fontWeight: 600, fontSize: 11, color: "var(--accent)", flexShrink: 0 }}>{subagent.agent}</span>
          {advisor && (
            <span
              title={t("agentHub.advisorNote")}
              style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9.5, color: "var(--text-dim)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", padding: "0 4px", flexShrink: 0 }}
            >
              <Eye size={10} strokeWidth={2} aria-hidden />
              {t("agentHub.advisor")}
            </span>
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, color: "var(--text)" }}>
            {subagent.task ?? subagent.description ?? t(`chatWindow.subagentState.${subagent.status}`)}
          </span>
          {subagent.detached && <span aria-hidden title={t("agentHub.detached")} style={{ ...monoStyle, fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>⤴</span>}
        </span>
        <RowActivity subagent={subagent} />
      </span>
      <RowTelemetry subagent={subagent} ageLabel={ageLabel} />
    </button>
  );
}

/** Inspector: everything the wire reports about the selected agent — current
 * tool + args, last intent, retry, context gauge, model, telemetry, artifacts.
 * Missing data renders nothing (the TUI's `usage —` rule).
 * Exported for SSR tests. */
export function HubInspector({ subagent, ageLabel, onOpenTranscript }: {
  subagent: SubagentInfo;
  ageLabel: string | null;
  onOpenTranscript: (subagent: SubagentInfo) => void;
}) {
  const { t } = useI18n();
  const progress = subagent.progress;
  const running = isHubRunning(subagent);
  const advisor = isHubAdvisor(subagent);
  const nested = countNestedSubagents(progress);
  const contextPercent = progress?.contextWindow && progress.contextTokens !== undefined
    ? progress.contextTokens / progress.contextWindow
    : null;
  const model = shortModel(progress?.resolvedModel);
  const telemetry: Array<[string, string | null]> = [
    [t("agentHub.cost"), formatCost(progress?.cost)],
    [t("agentHub.tokens"), formatTokens(progress?.tokens)],
    [t("agentHub.requests"), progress?.requests !== undefined ? String(progress.requests) : null],
    [t("agentHub.tools"), progress?.toolCount !== undefined ? String(progress.toolCount) : null],
    [t("agentHub.duration"), formatDuration(progress?.durationMs) ?? (running ? ageLabel : null)],
  ];
  const artifacts: Array<[string, string | undefined]> = [
    [t("agentHub.output"), subagent.result?.outputPath],
    [t("agentHub.patch"), subagent.result?.patchPath],
    [t("agentHub.branch"), subagent.result?.branchName],
  ];
  const labelStyle: React.CSSProperties = { fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, minWidth: 0, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <SubagentStatusIcon status={subagent.status} live={running ? true : subagent.source === "history" ? false : undefined} />
        <span style={{ ...monoStyle, fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>{subagent.agent}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{t(`chatWindow.subagentState.${subagent.status}`)}</span>
        {subagent.agentSource && subagent.agentSource !== "bundled" && (
          <span style={{ ...monoStyle, fontSize: 10, color: "var(--text-dim)" }}>{subagent.agentSource}</span>
        )}
        {subagent.detached && (
          <span title={t("agentHub.detached")} style={{ ...monoStyle, fontSize: 10.5, color: "var(--text-dim)" }}>⤴ {t("agentHub.detached")}</span>
        )}
        {nested > 0 && <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{t("chatWindow.subagentNestedCount", { count: nested })}</span>}
      </div>

      {advisor && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11.5, color: "var(--text-muted)", padding: "6px 9px", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--bg-panel)" }}>
          <Eye size={13} strokeWidth={1.8} aria-hidden />
          {t("agentHub.advisorNote")}
        </div>
      )}

      {(subagent.task || subagent.assignment) && (
        <div style={{ minWidth: 0 }}>
          <div style={labelStyle}>{t("subagentTranscript.taskLabel")}</div>
          <div style={{ fontSize: 12.5, color: "var(--text)", marginTop: 3, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "8.5em", overflowY: "auto" }}>
            {subagent.task ?? subagent.assignment}
          </div>
        </div>
      )}
      {progress?.lastIntent && (
        <div style={{ minWidth: 0 }}>
          <div style={labelStyle}>{t("agentHub.lastIntent")}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{progress.lastIntent}</div>
        </div>
      )}

      {running && progress?.currentTool && (
        <div style={{ minWidth: 0 }}>
          <div style={labelStyle}>{t("agentHub.currentTool")}</div>
          <div style={{ ...monoStyle, fontSize: 11.5, color: "var(--accent)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {progress.currentTool}{progress.currentToolArgs ? ` ${progress.currentToolArgs}` : ""}
          </div>
        </div>
      )}

      {running && progress?.retryState && (
        <div style={{ fontSize: 11.5, color: "var(--accent-strong)" }}>
          ⟳ {t("chatWindow.subagentRetrying", { attempt: progress.retryState.attempt, max: progress.retryState.maxAttempts })}
          {progress.retryState.errorMessage ? ` — ${progress.retryState.errorMessage}` : ""}
        </div>
      )}

      {progress?.lastIntent && !(running && progress.currentTool) && (
        <div style={{ minWidth: 0 }}>
          <div style={labelStyle}>{t("agentHub.lastIntent")}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{progress.lastIntent}</div>
        </div>
      )}

      {contextPercent !== null && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)" }}>
            <span style={labelStyle}>{t("agentHub.contextUsage")}</span>
            <span style={monoStyle}>{formatPercent(contextPercent)}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--border)", marginTop: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, contextPercent * 100)}%`, background: "var(--accent)" }} />
          </div>
        </div>
      )}

      {(model || progress?.modelRole) && (
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", minWidth: 0 }}>
          <span style={labelStyle}>{t("agentHub.model")}</span>
          <span style={{ ...monoStyle, fontSize: 11.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{model ?? "—"}</span>
          {progress?.modelRole && <span style={{ ...monoStyle, fontSize: 10.5, color: "var(--text-dim)" }}>@{progress.modelRole}</span>}
          {progress?.resolvedModelIsFallback && <span style={{ fontSize: 10.5, color: "var(--accent-strong)" }}>{t("agentHub.fallback")}</span>}
        </div>
      )}

      {telemetry.some(([, value]) => value !== null) && (
        <div>
          <div style={labelStyle}>{t("agentHub.telemetry")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 5 }}>
            {telemetry.filter(([, value]) => value !== null).map(([label, value]) => (
              <span key={label} style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                <span style={{ color: "var(--text-dim)" }}>{label} </span>
                <span style={monoStyle}>{value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {artifacts.some(([, value]) => value) && (
        <div>
          <div style={labelStyle}>{t("agentHub.artifacts")}</div>
          <div style={{ display: "grid", gap: 2, marginTop: 4 }}>
            {artifacts.filter(([, value]) => value).map(([label, value]) => (
              <div key={label} style={{ ...monoStyle, fontSize: 10.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={value}>
                <span style={{ color: "var(--text-dim)" }}>{label}: </span>{value}
              </div>
            ))}
          </div>
        </div>
      )}

      {subagent.sessionFile && (
        <div style={{ ...monoStyle, fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={subagent.sessionFile}>
          {subagent.sessionFile}
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpenTranscript(subagent)}
        className="ui-focus-ring"
        style={{
          alignSelf: "flex-start",
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 11px", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
          border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))",
          borderRadius: "var(--radius-control)",
          background: "var(--bg)", color: "var(--text)",
        }}
      >
        {t("agentHub.openTranscript")}
      </button>
    </div>
  );
}

export function AgentHubDialog({ open, subagents, onClose, onOpenTranscript }: {
  open: boolean;
  subagents: SubagentInfo[];
  onClose: () => void;
  onOpenTranscript: (subagent: SubagentInfo) => void;
}) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [treeView, setTreeView] = useState(loadTreeView);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Age clock: re-render every 10 s while open so "since last activity"
  // stays honest without a per-second churn.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, [open]);

  const batches = useMemo(() => groupHubBatches(subagents), [subagents]);
  const aggregate = useMemo(() => hubAggregate(subagents), [subagents]);
  const selected = subagents.find((subagent) => subagent.id === selectedId) ?? null;
  const usageLine = [
    formatCost(aggregate.cost ?? undefined),
    aggregate.tokens !== null ? formatTokens(aggregate.tokens) : null,
    formatDuration(aggregate.durationMs ?? undefined),
  ].filter((part): part is string => Boolean(part)).join(" · ");

  const ageLabelOf = (subagent: SubagentInfo): string | null => {
    const ms = hubAgeMs(subagent, nowMs);
    return ms !== null ? formatDuration(ms) : null;
  };

  const renderRow = (subagent: SubagentInfo, indent: boolean) => (
    <div key={subagent.id} style={{ paddingLeft: indent ? 14 : 0 }}>
      <HubRow
        subagent={subagent}
        ageLabel={ageLabelOf(subagent)}
        selected={subagent.id === selectedId}
        onSelect={() => setSelectedId(subagent.id)}
      />
    </div>
  );

  const showInspectorOnMobile = isMobile && selected !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        ariaLabel={t("agentHub.title")}
        style={{ width: "min(96vw, 1040px)", maxWidth: "min(96vw, 1040px)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Network size={16} strokeWidth={1.8} aria-hidden style={{ color: "var(--accent)", flexShrink: 0 }} />
          <strong style={{ fontSize: 15 }}>{t("agentHub.title")}</strong>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {t("agentHub.summary", { running: aggregate.running, total: aggregate.total })}
            {usageLine && <span style={monoStyle}> · {usageLine}</span>}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => { const next = !treeView; setTreeView(next); saveTreeView(next); }}
              title={treeView ? t("agentHub.flatView") : t("agentHub.treeView")}
              aria-label={treeView ? t("agentHub.flatView") : t("agentHub.treeView")}
              className="ui-focus-ring"
              style={{ display: "inline-flex", alignItems: "center", padding: 5, border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: treeView ? "var(--bg-selected)" : "transparent", color: "var(--text-muted)", cursor: "pointer" }}
            >
              {treeView ? <Rows3 size={14} strokeWidth={1.8} aria-hidden /> : <Columns2 size={14} strokeWidth={1.8} aria-hidden />}
            </button>
            <DialogClose
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}
              aria-label={t("agentHub.close")}
            >
              ×
            </DialogClose>
          </div>
        </div>

        {subagents.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center", fontSize: 12.5, color: "var(--text-dim)" }}>{t("agentHub.empty")}</div>
        ) : (
          <div
            style={{
              display: isMobile ? "block" : "grid",
              gridTemplateColumns: "minmax(300px, 400px) minmax(0, 1fr)",
              gap: isMobile ? 0 : 12,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              background: "var(--bg-panel)",
              overflow: "hidden",
              minHeight: 260,
              maxHeight: "min(62vh, 560px)",
            }}
          >
            {!showInspectorOnMobile && (
              <div role="listbox" aria-label={t("agentHub.title")} aria-orientation="vertical" style={{ overflowY: "auto", borderRight: isMobile ? "none" : "1px solid var(--border)", padding: "4px 0" }}>
                {treeView
                  ? batches.map((batch) => (
                    <div key={batch.key}>
                      {batches.length > 1 && (
                        <div style={{ ...monoStyle, fontSize: 9.5, color: "var(--text-dim)", padding: "6px 12px 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {batch.key.startsWith("call:")
                            ? t("agentHub.batchLabel", { seq: batch.batchSeq + 1 })
                            : t("agentHub.soloLabel")}
                        </div>
                      )}
                      {batch.entries.map((entry) => renderRow(entry, true))}
                    </div>
                  ))
                  : batches.flatMap((batch) => batch.entries.map((entry) => renderRow(entry, false)))}
              </div>
            )}
            {!isMobile || showInspectorOnMobile ? (
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="ui-focus-ring"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "8px 12px 0", padding: "4px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", alignSelf: "flex-start", fontFamily: "inherit" }}
                  >
                    <ArrowLeft size={13} strokeWidth={1.8} aria-hidden />
                    {t("agentHub.back")}
                  </button>
                )}
                {selected ? (
                  <HubInspector subagent={selected} ageLabel={ageLabelOf(selected)} onOpenTranscript={onOpenTranscript} />
                ) : (
                  <div style={{ padding: "28px 16px", textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>{t("agentHub.selectHint")}</div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
