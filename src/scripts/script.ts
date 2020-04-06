import "../styles/style.scss";
import {
  CountySummary,
  Covid19Data,
  Metric,
  Metrics,
  Population,
  USAFactsCounty,
  DailyData,
  DailyDatum,
} from "./types";
import Map from "./map";
import LogarithmicSlider from "./logSlider";
import { Legend, LegendItem } from "./legend";

class Covid19 {
  private covid19?: Covid19Data;
  private legends?: Metrics<Legend>;
  private population: Population = {};
  private max: Metrics<number>;

  private regularShades: string[] = [
    "FFFFFF",
    "F2F0F7",
    "DADAEB",
    "BCBDDC",
    "9E9AC8",
    "807DBA",
    "6A51A3",
    "4A1486",
  ];
  private growthRateShades: string[] = [
    "FFFFFF",
    "31A354",
    "A1D99B",
    "E5F5E0",
    "FFF7BC",
    "FEE0D2",
    "FC9272",
    "DE2D26",
    "333333",
  ];
  //private growthShades: string[] = [ "31A354", "A1D99B", "E5F5E0", "white", "FEE0D2", "FC9272", "DE2D26"];

  private map?: Map;

  constructor(private mapId: string) {
    this.max = {
      newDeaths: 0,
      totalDeaths: 0,
      newConfirmed: 0,
      totalConfirmed: 0,

      newDeathsPerCapita: 0,
      totalDeathsPerCapita: 0,
      newConfirmedPerCapita: 0,
      totalConfirmedPerCapita: 0,

      totalConfirmedGrowthToday: 0,
      totalDeathsGrowthToday: 0,

      totalConfirmedGrowthRate: 0,
      totalDeathsGrowthRate: 0,
    };
  }

  initialize(): void {
    $.when(this.fetchData()).done(() => {
      this.legends = this.generateLegends();
      this.map = new Map(
        this.mapId,
        "totalConfirmed",
        this.covid19!,
        this.max!,
        this.legends
      );
      this.map!.styleMap();
    });
  }

  fetchData(): JQuery.Thenable<USAFactsCounty[]> {
    return $.when(this.fetchPopulationData()).then(() =>
      this.fetchCovid19Data()
    );
    // await this.fetchPopulationData();
    // return await this.fetchCovid19Data();
  }

  fetchPopulationData(): JQuery.jqXHR<Population> {
    return $.getJSON("./data/population.json").done((data: Population) => {
      this.population = data;
    });
  }

  checkMax(countyData: Metrics<number>, metric: Metric): void {
    const max = countyData[metric] || 0;
    if (max > (this.max[metric] || 0)) {
      this.max[metric] = max;
    }
  }

  fetchCovid19Data(): JQuery.jqXHR<USAFactsCounty[]> {
    return $.getJSON(
      "https://usafactsstatic.blob.core.windows.net/public/2020/coronavirus-timeline/allData.json"
    ).done((data: USAFactsCounty[]) => {
      const days = data[0].confirmed.length;

      this.covid19 = { counties: {}, days: [] };
      data.forEach((i) => {
        if (
          i.countyFIPS === "00" ||
          i.deaths[days - 1] > i.confirmed[days - 1]
        ) {
          return;
        }

        const countySummary: CountySummary = {
          county: i.county,
          stateAbbr: i.stateAbbr,
          population: this.population[i.countyFIPS],
        };

        this.covid19!.counties[i.countyFIPS] = countySummary;

        for (let d = 0; d < days; d++) {
          const totalConfirmed2Ago = d <= 1 ? 0 : i.confirmed[d - 2];
          const totalDeaths2Ago = d <= 1 ? 0 : i.deaths[d - 2];

          let totalConfirmedYesterday = d === 0 ? 0 : i.confirmed[d - 1];
          let totalDeathsYesterday = d === 0 ? 0 : i.deaths[d - 1];

          if (totalConfirmedYesterday < totalConfirmed2Ago) {
            totalConfirmedYesterday = totalConfirmed2Ago;
          }
          if (totalDeathsYesterday < totalDeaths2Ago) {
            totalDeathsYesterday = totalDeaths2Ago;
          }

          let totalConfirmedToday = i.confirmed[d];
          let totalDeathsToday = i.deaths[d];

          if (totalConfirmedToday < totalConfirmedYesterday) {
            totalConfirmedToday = totalConfirmedYesterday;
          }
          if (totalDeathsToday < totalDeathsYesterday) {
            totalDeathsToday = totalDeathsYesterday;
          }

          const newConfirmedToday =
            totalConfirmedToday - totalConfirmedYesterday;
          const newDeathsToday = totalDeathsToday - totalDeathsYesterday;

          const newConfirmedYesterday =
            totalConfirmedYesterday - totalConfirmed2Ago;
          const newDeathsYesterday = totalDeathsYesterday - totalDeaths2Ago;

          const confirmedGrowthToday =
            totalConfirmedYesterday === 0
              ? 0
              : Math.floor((newConfirmedToday / totalConfirmedYesterday) * 100);
          const deathsGrowthToday =
            totalDeathsYesterday === 0
              ? 0
              : Math.floor((newDeathsToday / totalDeathsYesterday) * 100);

          const confirmedGrowthYesterday =
            totalConfirmed2Ago === 0
              ? 0
              : Math.floor((newConfirmedYesterday / totalConfirmed2Ago) * 100);
          const deathsGrowthYesterday =
            totalDeaths2Ago === 0
              ? 0
              : Math.floor((newDeathsYesterday / totalDeaths2Ago) * 100);

          const confirmedGrowthComparison =
            confirmedGrowthYesterday === 0
              ? 0
              : Math.floor(
                  (confirmedGrowthToday / confirmedGrowthYesterday) * 100
                );
          const deathsGrowthComparison =
            deathsGrowthYesterday === 0
              ? 0
              : Math.floor((deathsGrowthToday / deathsGrowthYesterday) * 100);

          const countyData: Metrics<number> = {
            totalConfirmed: totalConfirmedToday,
            totalDeaths: totalDeathsToday,

            newConfirmed: newConfirmedToday,
            newDeaths: newDeathsToday,

            totalConfirmedGrowthToday:
              Math.floor(confirmedGrowthToday * 100) / 100,
            totalDeathsGrowthToday: Math.floor(deathsGrowthToday * 100) / 100,

            totalConfirmedGrowthRate:
              Math.floor(confirmedGrowthComparison * 100) / 100,
            totalDeathsGrowthRate:
              Math.floor(deathsGrowthComparison * 100) / 100,
          };

          this.checkMax(countyData, "totalConfirmed");
          this.checkMax(countyData, "totalDeaths");
          this.checkMax(countyData, "newConfirmed");
          this.checkMax(countyData, "newDeaths");

          if (countySummary.population !== null) {
            const denominator = countySummary.population / 1000000;

            countyData.totalConfirmedPerCapita = Math.floor(
              countyData.totalConfirmed / denominator
            );
            countyData.totalDeathsPerCapita = Math.floor(
              countyData.totalDeaths / denominator
            );

            countyData.newConfirmedPerCapita = Math.floor(
              countyData.newConfirmed / denominator
            );
            countyData.newDeathsPerCapita = Math.floor(
              countyData.newDeaths / denominator
            );

            this.checkMax(countyData, "totalConfirmedPerCapita");
            this.checkMax(countyData, "totalDeathsPerCapita");
            this.checkMax(countyData, "newConfirmedPerCapita");
            this.checkMax(countyData, "newDeathsPerCapita");
          }

          if (this.covid19!.days[d] == null) {
            this.covid19!.days[d] = {
              national: {} as Metrics<number>,
              data: {} as DailyDatum,
            } as DailyData;
          }
          this.covid19!.days[d].data[i.countyFIPS] = countyData;
        }
      });

      this.covid19.days.forEach((d) => {
        d.national = Object.keys(d.data).reduce((res, cKey) => {
          const countyData = d.data[cKey];

          res.totalConfirmed =
            (res.totalConfirmed || 0) + countyData.totalConfirmed;
          res.totalDeaths = (res.totalDeaths || 0) + countyData.totalDeaths;
          res.newConfirmed = (res.newConfirmed || 0) + countyData.newConfirmed;
          res.newDeaths = (res.newDeaths || 0) + countyData.newDeaths;

          const yesterdayConfirmed = res.totalConfirmed - res.newConfirmed;
          res.totalConfirmedGrowthToday =
            yesterdayConfirmed === 0
              ? 0
              : Math.floor(
                  (res.newConfirmed / yesterdayConfirmed) * 100 * 100
                ) / 100;

          const yesterdayDeaths = res.totalDeaths - res.newDeaths;
          res.totalDeathsGrowthToday =
            yesterdayDeaths === 0
              ? 0
              : Math.floor((res.newDeaths / yesterdayDeaths) * 100 * 100) / 100;

          return res;
        }, {} as Metrics<number>);
      });

      this.covid19!.days.forEach((d, i) => {
        if (i > 0) {
          const totalConfirmedGrowthYesterday = this.covid19!.days[i - 1]
            .national.totalConfirmedGrowthToday;
          d.national.totalConfirmedGrowthRate =
            totalConfirmedGrowthYesterday === 0
              ? 0
              : Math.floor(
                  (d.national.totalConfirmedGrowthToday /
                    totalConfirmedGrowthYesterday) *
                    100 *
                    100
                ) / 100;

          const totalDeathsGrowthYesterday = this.covid19!.days[i - 1].national
            .totalDeathsGrowthToday;
          d.national.totalDeathsGrowthRate =
            totalDeathsGrowthYesterday === 0
              ? 0
              : Math.floor(
                  (d.national.totalDeathsGrowthToday /
                    totalDeathsGrowthYesterday) *
                    100 *
                    100
                ) / 100;
        }
      });
    });
  }

  generateLegends(): Metrics<Legend> {
    const legends = Object.keys(this.max).reduce((res, k) => {
      if (k === "totalConfirmedGrowthToday" || k === "totalDeathsGrowthToday") {
        res[k as Metric] = new Legend([
          new LegendItem(0, this.regularShades[0], 0, 0, true),
          new LegendItem(1, this.regularShades[1], 1, 16, true),
          new LegendItem(2, this.regularShades[2], 17, 32, true),
          new LegendItem(3, this.regularShades[3], 33, 48, true),
          new LegendItem(4, this.regularShades[4], 49, 64, true),
          new LegendItem(5, this.regularShades[5], 65, 80, true),
          new LegendItem(6, this.regularShades[6], 81, 99, true),
          new LegendItem(7, this.regularShades[7], 100, null, true),
        ]);
      } else if (
        k === "totalConfirmedGrowthRate" ||
        k === "totalDeathsGrowthRate"
      ) {
        res[k as Metric] = new Legend([
          new LegendItem(0, this.growthRateShades[0], 0, 0, true),
          new LegendItem(1, this.growthRateShades[1], 1, 33, true),
          new LegendItem(2, this.growthRateShades[2], 34, 66, true),
          new LegendItem(3, this.growthRateShades[3], 67, 99, true),
          new LegendItem(4, this.growthRateShades[4], 100, 100, true),
          new LegendItem(5, this.growthRateShades[5], 101, 133, true),
          new LegendItem(6, this.growthRateShades[6], 134, 166, true),
          new LegendItem(7, this.growthRateShades[7], 167, 199, true),
          new LegendItem(7, this.growthRateShades[8], 200, null, true),
        ]);
      } else {
        const slider = new LogarithmicSlider(
          this.regularShades.length,
          this.max[k as Metric]!
        );
        const legendItems = this.regularShades.map(
          (s, i) =>
            new LegendItem(
              i,
              s,
              i === 0 ? 0 : slider.getValue(i - 1) + 1,
              slider.getValue(i),
              true
            )
        );
        res[k as Metric] = new Legend(legendItems);
      }
      return res;
    }, {} as Metrics<Legend>);

    return legends;
  }
}

declare global {
  interface Window {
    initMap: () => void;
    covid19: Covid19;
  }
}

window.initMap = function initMap(): void {
  const covid19 = new Covid19("map");
  window.covid19 = covid19;
  covid19.initialize();
};
