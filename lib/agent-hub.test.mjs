import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { tsconfigPaths: true });

const { groupHubBatches, isHubRunning, isHubAdvisor, hubAggregate, hubAgeMs } = await jiti.import("./agent-hub.ts");

const live = (over) => ({ id: "x", agent: "a", status: "started", index: 0, source: "live", ...over });
const history = (over) => ({ id: "x", agent: "a", status: "completed", index: 0, source: "history", ...over });

test("batches group by the spawning task call, solos by id", () => {
  const batches = groupHubBatches([
    live({ id: "a1", parentToolCallId: "tc1", batchSeq: 0 }),
    live({ id: "a2", parentToolCallId: "tc1", batchSeq: 0, index: 1 }),
    live({ id: "b1", parentToolCallId: "tc2", batchSeq: 1 }),
    live({ id: "solo1" }),
    live({ id: "solo2" }),
  ]);
  assert.deepEqual(batches.map((b) => b.key), ["call:tc1", "call:tc2", "solo:solo1", "solo:solo2"]);
  assert.deepEqual(batches[0].entries.map((e) => e.id), ["a1", "a2"]);
  // Unknown-parent agents never merge into each other.
  assert.equal(batches[3].entries.length, 1);
});

test("batches order by the file's call ordinal, members by index", () => {
  // The roster arrives pre-sorted; a second call's first child can still land
  // before a slow first call's late child in a stale merge — grouping must
  // order by ordinal, not by arrival.
  const batches = groupHubBatches([
    live({ id: "b1", parentToolCallId: "tc2", batchSeq: 1 }),
    live({ id: "a2", parentToolCallId: "tc1", batchSeq: 0, index: 1 }),
    live({ id: "a1", parentToolCallId: "tc1", batchSeq: 0 }),
  ]);
  assert.deepEqual(batches.map((b) => b.key), ["call:tc1", "call:tc2"]);
  assert.deepEqual(batches[0].entries.map((e) => e.id), ["a1", "a2"]);
});

test("a history ordinal refines a batch that arrived without one", () => {
  const batches = groupHubBatches([
    live({ id: "a1", parentToolCallId: "tc1" }),
    live({ id: "z0", parentToolCallId: "tc0", batchSeq: 0 }),
    live({ id: "a2", parentToolCallId: "tc1", batchSeq: 1 }),
  ]);
  assert.deepEqual(batches.map((b) => [b.key, b.batchSeq]), [["call:tc0", 0], ["call:tc1", 1]]);
});

test("only live started agents count as running", () => {
  assert.equal(isHubRunning(live({})), true);
  // A "started" history entry is an interrupted run recovered from disk.
  assert.equal(isHubRunning(history({ status: "started" })), false);
  assert.equal(isHubRunning(history({ status: "completed" })), false);
  assert.equal(isHubAdvisor(live({ kind: "advisor" })), true);
  assert.equal(isHubAdvisor(live({})), false);
});

test("aggregate sums measured agents only and reports null when unmeasured", () => {
  const empty = hubAggregate([]);
  assert.deepEqual(empty, { running: 0, total: 0, cost: null, tokens: null, durationMs: null });

  const agg = hubAggregate([
    live({ id: "a", progress: { cost: 0.5, tokens: 1000, durationMs: 60_000 } }),
    live({ id: "b", progress: { cost: 0.25 } }),
    history({ id: "c", progress: { tokens: 500 } }),
    live({ id: "d", progress: {} }),
  ]);
  assert.equal(agg.running, 3);
  assert.equal(agg.total, 4);
  assert.equal(agg.cost, 0.75);
  assert.equal(agg.tokens, 1500);
  assert.equal(agg.durationMs, 60_000);

  // Nothing measured → null, never an estimate (the TUI shows "usage —").
  const unmeasured = hubAggregate([live({ id: "e" }), history({ id: "f" })]);
  assert.equal(unmeasured.cost, null);
  assert.equal(unmeasured.tokens, null);
});

test("age: live rows count since last activity, history rows freeze at the run span", () => {
  const now = 10_000_000;
  assert.equal(hubAgeMs(live({ lastUpdate: now - 4_200 }), now), 4_200);
  // A clock from the future (skew) clamps to zero instead of going negative.
  assert.equal(hubAgeMs(live({ lastUpdate: now + 5_000 }), now), 0);
  assert.equal(hubAgeMs(history({ progress: { durationMs: 90_000 } }), now), 90_000);
  assert.equal(hubAgeMs(live({}), now), null);
  assert.equal(hubAgeMs(history({}), now), null);
});
