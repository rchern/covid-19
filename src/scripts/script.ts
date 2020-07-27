import "../styles/style.scss";
import { CountySummary, Covid19Data, Metric, Metrics, Population, USAFactsCounty, DailyData, DailyDatum } from "./types";
import Map from "./map";
import LogarithmicSlider from "./logSlider";
import { Legend, LegendItem } from "./legend";

class Covid19 {
  private covid19?: Covid19Data;
  private legends?: Metrics<Legend>;
  private population: Population = {};
  private max: Metrics<number>;

  //private regularShades: string[] = ["FFFFFF", "F2F0F7", "DADAEB", "BCBDDC", "9E9AC8", "807DBA", "6A51A3", "4A1486"];
  private regularShades: string[] = ["FFFFFF", "EDF8FB", "BFD3E6", "9EBCDA", "8C96C6", "8C6BB1", "88419D", "6E016B"];
  private growthRateShades: string[] = ["FFFFFF", "31A354", "A1D99B", "E5F5E0", "FFF7BC", "FEE0D2", "FC9272", "DE2D26", "333333"];
  private yesNoShades: string[] = ["DE2D26", "FFFFFF", "31A354"];

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

      newDeathsAverage: 0,
      newConfirmedAverage: 0,
      newDeathsPerCapitaAverage: 0,
      newConfirmedPerCapitaAverage: 0,
      totalDeathsGrowthTodayAverage: 0,
      totalConfirmedGrowthTodayAverage: 0,

      reopenTrajectory: 1,
    };
  }

  initialize(): void {
    $.when(this.fetchData()).done(() => {
      this.legends = this.generateLegends();
      this.map = new Map(this.mapId, "totalConfirmed", this.covid19!, this.max!, this.legends);
      this.map!.styleMap();
    });
  }

  fetchData(): JQuery.Thenable<USAFactsCounty[]> {
    return $.when(this.fetchPopulationData()).then(() => this.fetchCovid19Data());
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
    return $.getJSON("https://script.google.com/macros/s/AKfycby9NQ59C_tP1oLlYRnUeY8g-5HfSFwJsE77OksJDO5kfUB0yL4/exec").done((data: USAFactsCounty[]) => {
      const days = data[0].confirmed.length;

      this.covid19 = { counties: {}, days: [] };
      data.forEach((i) => {
        if (i.countyFIPS === "00" || i.deaths[days - 1] > i.confirmed[days - 1]) {
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

          const newConfirmedToday = totalConfirmedToday - totalConfirmedYesterday;
          const newDeathsToday = totalDeathsToday - totalDeathsYesterday;

          const newConfirmedYesterday = totalConfirmedYesterday - totalConfirmed2Ago;
          const newDeathsYesterday = totalDeathsYesterday - totalDeaths2Ago;

          const confirmedGrowthToday = totalConfirmedYesterday === 0 ? 0 : (newConfirmedToday / totalConfirmedYesterday) * 100;
          const deathsGrowthToday = totalDeathsYesterday === 0 ? 0 : (newDeathsToday / totalDeathsYesterday) * 100;

          const confirmedGrowthYesterday = totalConfirmed2Ago === 0 ? 0 : (newConfirmedYesterday / totalConfirmed2Ago) * 100;
          const deathsGrowthYesterday = totalDeaths2Ago === 0 ? 0 : (newDeathsYesterday / totalDeaths2Ago) * 100;

          const confirmedGrowthComparison = confirmedGrowthYesterday === 0 ? 0 : (confirmedGrowthToday / confirmedGrowthYesterday) * 100;
          const deathsGrowthComparison = deathsGrowthYesterday === 0 ? 0 : (deathsGrowthToday / deathsGrowthYesterday) * 100;

          const countyData: Metrics<number> = {
            totalConfirmed: totalConfirmedToday,
            totalDeaths: totalDeathsToday,

            newConfirmed: newConfirmedToday,
            newDeaths: newDeathsToday,

            totalConfirmedGrowthToday: confirmedGrowthToday,
            totalDeathsGrowthToday: deathsGrowthToday,

            totalConfirmedGrowthRate: confirmedGrowthComparison,
            totalDeathsGrowthRate: deathsGrowthComparison,
          };

          this.checkMax(countyData, "totalConfirmed");
          this.checkMax(countyData, "totalDeaths");
          this.checkMax(countyData, "newConfirmed");
          this.checkMax(countyData, "newDeaths");

          if (countySummary.population !== null) {
            const denominator = countySummary.population / 1000000;

            countyData.totalConfirmedPerCapita = countyData.totalConfirmed / denominator;
            countyData.totalDeathsPerCapita = countyData.totalDeaths / denominator;

            countyData.newConfirmedPerCapita = countyData.newConfirmed / denominator;
            countyData.newDeathsPerCapita = countyData.newDeaths / denominator;

            this.checkMax(countyData, "totalConfirmedPerCapita");
            this.checkMax(countyData, "totalDeathsPerCapita");
            this.checkMax(countyData, "newConfirmedPerCapita");
            this.checkMax(countyData, "newDeathsPerCapita");
          } else {
            console.log(i.county, "no population");
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

      this.covid19.days.forEach((d, i) => {
        d.national = Object.keys(d.data).reduce((res, cKey) => {
          const countyData = d.data[cKey];

          res.totalConfirmed = (res.totalConfirmed || 0) + countyData.totalConfirmed;
          res.totalDeaths = (res.totalDeaths || 0) + countyData.totalDeaths;
          res.newConfirmed = (res.newConfirmed || 0) + countyData.newConfirmed;
          res.newDeaths = (res.newDeaths || 0) + countyData.newDeaths;

          const yesterdayConfirmed = res.totalConfirmed - res.newConfirmed;
          res.totalConfirmedGrowthToday = yesterdayConfirmed === 0 ? 0 : (res.newConfirmed / yesterdayConfirmed) * 100;

          const yesterdayDeaths = res.totalDeaths - res.newDeaths;
          res.totalDeathsGrowthToday = yesterdayDeaths === 0 ? 0 : (res.newDeaths / yesterdayDeaths) * 100;

          const window = this.getWindow(i).map((d) => d.data[cKey]);
          countyData.newConfirmedAverage = window.reduce((sum, c) => sum + c.newConfirmed, 0) / window.length;
          countyData.newDeathsAverage = window.reduce((sum, c) => sum + c.newDeaths, 0) / window.length;
          countyData.totalConfirmedGrowthTodayAverage = window.reduce((sum, c) => sum + c.totalConfirmedGrowthToday, 0) / window.length;
          countyData.totalDeathsGrowthTodayAverage = window.reduce((sum, c) => sum + c.totalDeathsGrowthToday, 0) / window.length;

          this.checkMax(countyData, "newConfirmedAverage");
          this.checkMax(countyData, "newDeathsAverage");
          this.checkMax(countyData, "totalConfirmedGrowthTodayAverage");
          this.checkMax(countyData, "totalDeathsGrowthTodayAverage");

          countyData.reopenTrajectory = 0;
          if (countyData.totalConfirmed > 0 && i >= 13) {
            const slice = this.covid19!.days.slice(Math.max(0, i - 14), i).map((c) => c.data[cKey].newConfirmedAverage);

            const slope = (slice[slice.length - 1]! - slice[0]!) / slice.length;

            const sorted = [...slice].sort((a, b) => b! - a!);

            const half = Math.floor(slice.length / 2);

            const median = (sorted[half - 1]! + sorted[half]!) / 2.0;

            const medianGood = slice[0]! > median && slice[slice.length - 1]! < median;

            const allZero = slice.every((v) => v == 0);

            countyData.reopenTrajectory = slope < 0 && (allZero || medianGood) ? 1 : -1;

            //countyData.reopenTrajectory = slope < 0 ? 1 : (slope > 0 ? -1 : 0);
          }

          const countySummary = this.covid19!.counties[cKey];
          if (countySummary.population !== null) {
            countyData.newConfirmedPerCapitaAverage = window.reduce((sum, c) => sum + c.newConfirmedPerCapita!, 0) / window.length;
            countyData.newDeathsPerCapitaAverage = window.reduce((sum, c) => sum + c.newDeathsPerCapita!, 0) / window.length;

            this.checkMax(countyData, "newConfirmedPerCapitaAverage");
            this.checkMax(countyData, "newDeathsPerCapitaAverage");
          }

          return res;
        }, {} as Metrics<number>);
      });

      this.covid19!.days.forEach((d, i) => {
        if (i > 0) {
          const totalConfirmedGrowthYesterday = this.covid19!.days[i - 1].national.totalConfirmedGrowthToday;
          d.national.totalConfirmedGrowthRate =
            totalConfirmedGrowthYesterday === 0 ? 0 : (d.national.totalConfirmedGrowthToday / totalConfirmedGrowthYesterday) * 100;

          const totalDeathsGrowthYesterday = this.covid19!.days[i - 1].national.totalDeathsGrowthToday;
          d.national.totalDeathsGrowthRate = totalDeathsGrowthYesterday === 0 ? 0 : (d.national.totalDeathsGrowthToday / totalDeathsGrowthYesterday) * 100;
        }

        const window = this.getWindow(i).map((d) => d.national);
        d.national.newConfirmedAverage = window.reduce((sum, n) => sum + n.newConfirmed, 0) / window.length;
        d.national.newDeathsAverage = window.reduce((sum, n) => sum + n.newDeaths, 0) / window.length;
        d.national.totalConfirmedGrowthTodayAverage = window.reduce((sum, c) => sum + c.totalConfirmedGrowthToday, 0) / window.length;
        d.national.totalDeathsGrowthTodayAverage = window.reduce((sum, c) => sum + c.totalDeathsGrowthToday, 0) / window.length;
      });
    });
  }

  getWindow(index: number): DailyData[] {
    const start = Math.max(0, index - 3);
    const end = Math.min(this.covid19!.days.length, index + 4);
    return this.covid19!.days.slice(start, end);
  }

  generateLegends(): Metrics<Legend> {
    const legends = Object.keys(this.max).reduce((res, k) => {
      if (k.indexOf("GrowthToday") > 0) {
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
      } else if (k.indexOf("GrowthRate") > 0) {
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
      } else if (k === "reopenTrajectory") {
        res[k as Metric] = new Legend([
          new LegendItem(0, this.yesNoShades[0], -1, -1, true, "Not Ready to Re-Open"),
          new LegendItem(1, this.yesNoShades[1], 0, 0, true, "Not Enough Data"),
          new LegendItem(2, this.yesNoShades[2], 1, 1, true, "Ready To Re-Open"),
        ]);
      } else {
        const slider = new LogarithmicSlider(this.regularShades.length, this.max[k as Metric]!);
        const legendItems = this.regularShades.map((s, i) => new LegendItem(i, s, i === 0 ? 0 : slider.getValue(i - 1) + 1, slider.getValue(i), true));
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
