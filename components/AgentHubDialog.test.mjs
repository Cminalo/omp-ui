import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  jsx: { runtime: "automatic" },
  tsconfigPaths: true,
});
const { HubRow, HubInspector } = await jiti.import("./AgentHubDialog.tsx");

const noop = () => {};

test("roster row shows identity, task, telemetry, and async marker", () => {
  const html = renderToStaticMarkup(React.createElement(HubRow, {
    subagent: {
      id: "s1", agent: "scout", status: "started", index: 0, source: "live",
      task: "Map the surface", detached: true, lastUpdate: Date.now(),
      progress: { cost: 0.12, tokens: 3400, currentTool: "grep", currentToolArgs: "pattern" },
    },
    ageLabel: "2m", selected: false, onSelect: noop,
  }));
  assert.match(html, /scout/);
  assert.match(html, /Map the surface/);
  assert.match(html, /\$0\.12/);
  assert.match(html, /3\.4k/);
  assert.match(html, /2m/);
  assert.match(html, /⤴/); // async marker
  // The live activity line shows the current tool, not the raw intent.
  assert.match(html, /grep pattern/);
  assert.match(html, /aria-selected="false"/);
});

test("roster row marks advisor rows read-only", () => {
  const html = renderToStaticMarkup(React.createElement(HubRow, {
    subagent: { id: "__advisor", agent: "advisor", kind: "advisor", status: "completed", index: 0, source: "history" },
    ageLabel: null, selected: true, onSelect: noop,
  }));
  assert.match(html, /advisor/);
  assert.match(html, /Observability record/);
  assert.match(html, /aria-selected="true"/);
});

test("roster row surfaces the failure reason for failed agents", () => {
  const html = renderToStaticMarkup(React.createElement(HubRow, {
    subagent: {
      id: "s2", agent: "worker", status: "failed", index: 0, source: "history",
      task: "Write the code", result: { error: "Test failed" },
    },
    ageLabel: "4m", selected: false, onSelect: noop,
  }));
  assert.match(html, /Test failed/);
});

test("inspector renders current tool, context gauge, model, and telemetry", () => {
  const html = renderToStaticMarkup(React.createElement(HubInspector, {
    subagent: {
      id: "s1", agent: "scout", status: "started", index: 0, source: "live",
      task: "Map the surface",
      progress: {
        currentTool: "read", currentToolArgs: "src/app.ts",
        lastIntent: "Inspect the entry point",
        contextTokens: 40_000, contextWindow: 200_000,
        cost: 0.5, tokens: 12_000, requests: 7, toolCount: 14, durationMs: 90_000,
        resolvedModel: "anthropic/claude-x:high", modelRole: "smol", resolvedModelIsFallback: true,
      },
    },
    ageLabel: "1m", onOpenTranscript: noop,
  }));
  assert.match(html, /Map the surface/);
  assert.match(html, /read src\/app\.ts/);
  assert.match(html, /Inspect the entry point/);
  assert.match(html, /20%/); // context gauge
  assert.match(html, /claude-x/);
  assert.match(html, /@smol/);
  assert.match(html, /fallback/);
  assert.match(html, /\$0\.50/);
  assert.match(html, /12k/);
  assert.match(html, />7</);
  assert.match(html, />14</);
  assert.match(html, /Open transcript/);
});

test("inspector shows settled artifacts and the advisor read-only note", () => {
  const html = renderToStaticMarkup(React.createElement(HubInspector, {
    subagent: {
      id: "s3", agent: "worker", status: "completed", index: 0, source: "history",
      progress: { cost: 0.2 },
      result: { outputPath: "/tmp/out.md", patchPath: "/tmp/out.patch", branchName: "wt/fix" },
    },
    ageLabel: null, onOpenTranscript: noop,
  }));
  assert.match(html, /Artifacts/);
  assert.match(html, /\/tmp\/out\.md/);
  assert.match(html, /\/tmp\/out\.patch/);
  assert.match(html, /wt\/fix/);

  const advisorHtml = renderToStaticMarkup(React.createElement(HubInspector, {
    subagent: { id: "__advisor", agent: "advisor", kind: "advisor", status: "completed", index: 0, source: "history" },
    ageLabel: null, onOpenTranscript: noop,
  }));
  assert.match(advisorHtml, /Observability record — read-only/);
  // An advisor has no telemetry to sum — the section must not render empty.
  assert.doesNotMatch(advisorHtml, /Telemetry/);
});
