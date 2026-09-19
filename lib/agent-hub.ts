// Pure view logic for the Agent Hub roster (TUI hub parity, read-only phase).
// Kept React-free so grouping, aggregation, and age rules are unit-testable
// outside the component tree (same convention as lib/subagent-types.ts).
//
// Scope reference: docs/specs/2026-09-19-agent-hub-scope-and-view-study.md —
// control (chat/kill/revive) and focus mode ride on the bridge extension; this
// module only ever describes what the read-only hub shows.

import { compareSubagents, type SubagentInfo } from "./subagent-types";

/** One `task` call's worth of agents — the tree view's group row. Agents whose
 * spawning call is not yet known (live frames before the session file records
 * the call) form solo batches keyed by id, so unknowns never merge into each
 * other or into a real batch. */
export interface HubBatch {
  /** Stable React key: the parent `task` toolCallId, or `solo:<id>`. */
  key: string;
  /** Ordinal of the spawning call in the session file (lowest among members). */
  batchSeq: number;
  entries: SubagentInfo[];
}

/**
 * Group the roster into spawn batches for the flat ↔ tree toggle.
 *
 * Batches order by the file's call ordinal, then by their first agent's
 * position; members order by the shared roster comparator (batchSeq, index,
 * id). The roster arrives already sorted, so this is a regrouping, never a
 * re-derivation of launch order.
 */
export function groupHubBatches(subagents: SubagentInfo[]): HubBatch[] {
  const byKey = new Map<string, HubBatch>();
  for (const entry of subagents) {
    const key = entry.parentToolCallId !== undefined ? `call:${entry.parentToolCallId}` : `solo:${entry.id}`;
    let batch = byKey.get(key);
    if (!batch) {
      batch = { key, batchSeq: entry.batchSeq ?? Number.MAX_SAFE_INTEGER, entries: [] };
      byKey.set(key, batch);
    }
    // The earliest known ordinal wins: a history merge can refine the ordinal
    // of a batch that first arrived as a live frame without one.
    if (entry.batchSeq !== undefined && entry.batchSeq < batch.batchSeq) batch.batchSeq = entry.batchSeq;
    batch.entries.push(entry);
  }
  const batches = [...byKey.values()];
  for (const batch of batches) batch.entries.sort(compareSubagents);
  return batches.sort((a, b) => a.batchSeq - b.batchSeq || compareSubagents(a.entries[0], b.entries[0]));
}

/** True while the agent is live and working. History rows are NEVER running:
 * a "started" history entry is an interrupted run recovered from disk, not a
 * live one (same rule the composer chips and the hook's activeSubagentCount
 * apply). */
export function isHubRunning(subagent: SubagentInfo): boolean {
  return subagent.source !== "history" && subagent.status === "started";
}

/** Advisor rows are observability records: transcript readable, never
 * messageable/revivable/killable. The hub renders them read-only and any
 * future control surface must refuse them. */
export function isHubAdvisor(subagent: SubagentInfo): boolean {
  return subagent.kind === "advisor";
}

export interface HubAggregate {
  running: number;
  total: number;
  /** Sums cover MEASURED agents only; `null` when nothing was measured — the
   * TUI header shows `usage —` rather than an estimate. */
  cost: number | null;
  tokens: number | null;
  durationMs: number | null;
}

function sumMeasured(values: Iterable<number | undefined>): number | null {
  let sum: number | null = null;
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) sum = (sum ?? 0) + value;
  }
  return sum;
}

/** Header aggregate across the roster (status counts + summed telemetry).
 * Live rows contribute their progress snapshot; history rows contribute the
 * settled telemetry the mapper already folded into `progress`. */
export function hubAggregate(subagents: SubagentInfo[]): HubAggregate {
  return {
    running: subagents.filter(isHubRunning).length,
    total: subagents.length,
    cost: sumMeasured(subagents.map((s) => s.progress?.cost)),
    tokens: sumMeasured(subagents.map((s) => s.progress?.tokens)),
    durationMs: sumMeasured(subagents.map((s) => s.progress?.durationMs)),
  };
}

/**
 * Row age, mirroring the TUI's two clocks:
 * - live row: time since the last activity frame (`lastUpdate`);
 * - history row: the frozen run span (`durationMs`);
 * - neither known → null, render nothing rather than fabricate a clock.
 */
export function hubAgeMs(subagent: SubagentInfo, nowMs: number): number | null {
  if (subagent.source !== "history" && subagent.lastUpdate !== undefined) {
    return Math.max(0, nowMs - subagent.lastUpdate);
  }
  const duration = subagent.progress?.durationMs;
  return typeof duration === "number" && Number.isFinite(duration) && duration > 0 ? duration : null;
}
