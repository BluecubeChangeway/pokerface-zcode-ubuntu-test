export type Phase = "measurement" | "calculation" | "comparison";

export type PeriodMode = "actual" | "coverage" | Phase;

export interface Period {
  start: string;
  end: string;
  mode?: PeriodMode;
  sourcePeriods?: Period[];
}
