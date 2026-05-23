"use client";

import { ClaimsManager } from "@pcn-js/core";
import { useClaimsManager } from "@pcn-js/ui";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  compareCountriesExtractor,
  rankCountriesExtractor,
  summarizeDataExtractor,
  getDataExtractor,
} from "./extractors";
import type { MessageWithParts } from "./types";

// ---------------------------------------------------------------------------
// Module-level singleton — extractors are registered synchronously at import
// time, before any React render, so IngestToolOutput can always find them.
// ---------------------------------------------------------------------------
export const claimsManager = new ClaimsManager();
claimsManager.registerExtractor("data360_rank_countries", rankCountriesExtractor);
claimsManager.registerExtractor("data360_compare_countries", compareCountriesExtractor);
claimsManager.registerExtractor("data360_summarize_data", summarizeDataExtractor);
claimsManager.registerExtractor("data360_get_data", getDataExtractor);

// Tool types we want to pre-ingest synchronously on load.
const AGG_TOOL_TYPES = new Set([
  "tool-data360_rank_countries",
  "tool-data360_compare_countries",
  "tool-data360_summarize_data",
  "tool-data360_get_data",
]);

const AGG_TOOL_NAMES: Record<string, string> = {
  "tool-data360_rank_countries": "data360_rank_countries",
  "tool-data360_compare_countries": "data360_compare_countries",
  "tool-data360_summarize_data": "data360_summarize_data",
  "tool-data360_get_data": "data360_get_data",
};

const DATA360_GET_DATA_TOOL = "data360_get_data";
const DATA360_TOOL_TYPE = "tool-data360_get_data" as const;

function isData360ToolPart(p: Record<string, unknown>): boolean {
  const type = p.type;
  const isData360Type =
    type === DATA360_TOOL_TYPE ||
    (typeof type === "string" && type.includes("data360_get_data"));
  const output = p.output;
  const hasOutput =
    output != null &&
    typeof output === "object" &&
    Array.isArray((output as Record<string, unknown>).data);
  const state = p.state;
  const stateOk =
    state === undefined ||
    state === "output-available" ||
    state === "output-error";
  return Boolean(isData360Type && hasOutput && stateOk);
}

/**
 * Extract data360 get_data outputs from messages. Handles:
 * - Top-level tool parts: { type: "tool-data360_get_data", state, output }
 * - Data-thinking wrapped: { type: "data-thinking", data: { type: "tool-data360_get_data", ... output } }
 */
export function extractData360Outputs(
  messages: MessageWithParts[],
): unknown[] {
  const outputs: unknown[] = [];
  for (const message of messages) {
    const parts = message.parts ?? [];
    for (const part of parts) {
      if (typeof part !== "object" || part === null) continue;
      const p = part as Record<string, unknown>;
      if (isData360ToolPart(p) && p.output != null) {
        outputs.push(p.output);
        continue;
      }
      if (
        p.type === "data-thinking" &&
        p.data != null &&
        typeof p.data === "object"
      ) {
        const inner = p.data as Record<string, unknown>;
        if (isData360ToolPart(inner) && inner.output != null) {
          outputs.push(inner.output);
        }
      }
    }
  }
  return outputs;
}

export type IngestSessionData360Props = {
  /** Current messages (e.g. from useChat). */
  messages: MessageWithParts[];
  /** Initial messages from server (used when messages is empty on first paint). */
  initialMessages?: MessageWithParts[];
};

/**
 * Ingest all data360_get_data tool outputs from the session into the PCN
 * claims manager so ClaimMark can resolve claims from any message. Use both
 * messages (from useChat) and initialMessages (from server) so the manager
 * is populated on first paint when history is loaded.
 *
 * Expects message shape: { parts?: array }. Each part can be a top-level
 * tool part or { type: "data-thinking", data: toolPart }.
 */
export function IngestSessionData360({
  messages,
  initialMessages = [],
}: IngestSessionData360Props) {
  const manager = useClaimsManager();

  useEffect(() => {
    if (!manager) return;
    const toIngest = messages.length > 0 ? messages : initialMessages;
    const outputs = extractData360Outputs(toIngest);
    for (const output of outputs) {
      manager.ingest(DATA360_GET_DATA_TOOL, output);
    }
  }, [messages, initialMessages, manager]);

  return null;
}

/**
 * Synchronously ingests all aggregation tool outputs from loaded messages
 * during commit (via useLayoutEffect) so that ClaimMark can verify numbers on
 * first paint — including after a page refresh when tool parts come from the DB.
 *
 * IngestToolOutput (from @pcn-js/ui) uses useEffect internally, which fires
 * *after* first paint. This component closes that gap by calling
 * claimsManager.ingest() during the commit phase for any session data that is
 * already present when the component mounts.
 */
export function PreIngestSessionClaims({
  messages,
  initialMessages = [],
}: {
  messages: MessageWithParts[];
  initialMessages?: MessageWithParts[];
}) {
  const ingestedPartKeysRef = useRef(new Set<string>());

  useLayoutEffect(() => {
    const buildPartKey = (part: Record<string, unknown>, toolName: string) => {
      if (typeof part.id === "string") return `${toolName}:${part.id}`;
      const toolCallId = typeof part.toolCallId === "string" ? part.toolCallId : "";
      return `${toolName}:${toolCallId}:${JSON.stringify(part.output ?? null)}`;
    };

    const source = messages.length > 0 ? messages : initialMessages;
    for (const msg of source) {
      for (const part of msg.parts ?? []) {
        const type = part.type as string | undefined;
        if (!type) continue;

        // Top-level tool parts
        if (AGG_TOOL_TYPES.has(type) && part.state === "output-available" && part.output != null) {
          const toolName = AGG_TOOL_NAMES[type];
          if (toolName) {
            const partKey = buildPartKey(part, toolName);
            if (ingestedPartKeysRef.current.has(partKey)) continue;
            claimsManager.ingest(toolName, part.output);
            ingestedPartKeysRef.current.add(partKey);
          }
        }

        // data-thinking-wrapped tool parts
        if (type === "data-thinking" && part.data != null && typeof part.data === "object") {
          const inner = part.data as Record<string, unknown>;
          const innerType = inner.type as string | undefined;
          if (innerType && AGG_TOOL_TYPES.has(innerType) && inner.state === "output-available" && inner.output != null) {
            const toolName = AGG_TOOL_NAMES[innerType];
            if (toolName) {
              const partKey = buildPartKey(inner, toolName);
              if (ingestedPartKeysRef.current.has(partKey)) continue;
              claimsManager.ingest(toolName, inner.output);
              ingestedPartKeysRef.current.add(partKey);
            }
          }
        }
      }
    }
  }, [messages, initialMessages]);

  return null;
}
