"use client";

import { useMemo, type ReactNode } from "react";
import {
  ClaimsManager,
  createDataPointExtractor,
  type DataPointExtractorOptions,
} from "@pcn-js/core";
import { ClaimsProvider } from "@pcn-js/ui";
import { createData360ClaimsManager } from "./ingest-session-data360";
import { DATA360_GET_DATA_TOOL } from "./types";

export { DATA360_GET_DATA_TOOL };

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
    const m = createData360ClaimsManager();
    if (toolName || extractorOptions) {
      const tName = toolName ?? DATA360_GET_DATA_TOOL;
      const opts = extractorOptions ?? DEFAULT_EXTRACTOR_OPTIONS;
      m.registerExtractor(tName, createDataPointExtractor(opts));
    }
    return m;
  }, [toolName, extractorOptions]);

  return <ClaimsProvider manager={manager}>{children}</ClaimsProvider>;
}
