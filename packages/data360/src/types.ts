export type CompactRankedCountry = {
  rank?: number;
  code?: string;
  country?: string;
  value?: number;
  claim_id?: string | null;
};

export type CompactRankingOutput = {
  year: string | null;
  year_selection_note: string | null;
  order: "asc" | "desc";
  counts: { with_data: number; requested: number };
  unit: string | null;
  indicator: string | null;
  rankings: CompactRankedCountry[];
  excluded_count: number;
  excluded_sample: Array<{ code: string; name: string | null }>;
  error: string | null;
};

export type CompactRankedEntry = CompactRankedCountry;

export const DATA360_GET_DATA_TOOL = "data360_get_data";

export type CompactComparisonSnapshot = {
  year?: string;
  rankings?: CompactRankedEntry[];
  spread?: Record<string, number | null>;
};

export type CompactTimeSeries = {
  year_range?: string | null;
  n_aligned_years?: number;
  convergence?: string | null;
  cagr?: Record<string, number | null>;
  series_schema?: string[];
  series?: Record<string, [string, number, string | null][]>;
};

export type CompactComparisonOutput = {
  indicator?: string | null;
  unit?: string | null;
  snapshot?: CompactComparisonSnapshot | null;
  time_series?: CompactTimeSeries | null;
  error?: string | null;
  [key: string]: unknown;
};

export type CompactGroupSummary = {
  group: Record<string, string>;
  n: number;
  latest: { value: number | null; year: string | null };
  earliest: { value: number | null; year: string | null };
  range: string | null;
  stats: {
    min: number | null;
    max: number | null;
    mean: number | null;
    median: number | null;
  };
  change: { abs: number | null; pct: number | null };
  trend: string | null;
  claim_ids: string[];
};

export type CompactSummaryOutput = {
  indicator: string | null;
  unit: string | null;
  ambiguous_dimensions: string[] | null;
  groups: CompactGroupSummary[];
  error: string | null;
};

export type MessageWithParts = {
  parts?: Array<Record<string, unknown>>;
};
