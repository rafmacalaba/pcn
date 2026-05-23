"use client";

import { useMemo, type ReactNode } from "react";
import {
  ClaimsManager,
  createDataPointExtractor,
  type DataPointExtractorOptions,
} from "@pcn-js/core";
import { ClaimsProvider } from "@pcn-js/ui";
import { claimsManager as defaultClaimsManager } from "./ingest-session-data360";

/** Default tool name for Data360 get_data (use with IngestToolOutput). */
export const DATA360_GET_DATA_TOOL = "data360_get_data";

const DEFAULT_EXTRACTOR_OPTIONS: DataPointExtractorOptions = {
  dataKey: "data",
  claimIdKey: "claim_id",
  valueKey: "OBS_VALUE",
  countryKey: "REF_AREA",
  dateKey: "TIME_PERIOD",
};

export type Data360ClaimsProviderProps = {
  /** Tool name used when ingesting get_data results (default "data360_get_data"). */
  toolName?: string;
  /** Extractor options; defaults match Data360 get_data shape. */
  extractorOptions?: DataPointExtractorOptions;
  children: ReactNode;
};

/**
 * ClaimsProvider preconfigured with a ClaimsManager and a Data360 get_data
 * data-point extractor. Use with IngestToolOutput (from @pcn-js/ui) when rendering
 * data360_get_data results so ClaimMark can resolve claims by claim_id.
 */
export function Data360ClaimsProvider({
  toolName,
  extractorOptions,
  children,
}: Data360ClaimsProviderProps) {
  const manager = useMemo(() => {
    // If no custom options are provided, use the global pre-configured claimsManager
    if (!toolName && !extractorOptions) {
      return defaultClaimsManager;
    }

    const m = new ClaimsManager();
    const tName = toolName ?? DATA360_GET_DATA_TOOL;
    const opts = extractorOptions ?? DEFAULT_EXTRACTOR_OPTIONS;
    m.registerExtractor(tName, createDataPointExtractor(opts));
    return m;
  }, [toolName, extractorOptions]);

  return <ClaimsProvider manager={manager}>{children}</ClaimsProvider>;
}
