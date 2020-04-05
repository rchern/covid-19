export interface USAFactsCounty {
  countyFIPS: string;
  county: string;
  stateAbbr: string;
  deaths: number[];
  confirmed: number[];
}
export interface CountySummary {
  county: string;
  stateAbbr: string;
  population: number;
}

export type RegularMetric =
  | "newConfirmed"
  | "totalConfirmed"
  | "newDeaths"
  | "totalDeaths"
  | "totalConfirmedGrowthRate"
  | "totalDeathsGrowthRate"
  | "totalConfirmedGrowthToday"
  | "totalDeathsGrowthToday";
export type PerCapitaMetric =
  | "newConfirmedPerCapita"
  | "totalConfirmedPerCapita"
  | "newDeathsPerCapita"
  | "totalDeathsPerCapita";
export type Metric = RegularMetric | PerCapitaMetric;
export type Metrics<T> = Partial<Record<PerCapitaMetric, T>> &
  Record<RegularMetric, T>;

export interface Covid19Data {
  counties: Counties;
  days: DailyData[];
}
export interface Counties {
  [key: string]: CountySummary;
}
export interface DailyData {
  [key: string]: Metrics<number>;
}
export interface Population {
  [key: string]: number;
}
export interface Color {
  code: string;
  on: boolean;
}
