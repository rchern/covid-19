import { Color, Metric, Metrics, Covid19Data } from "./types";
import { Legend } from "./legend";

export default class Map {
  private map: google.maps.Map;
  private infoWindow: google.maps.InfoWindow;
  private currentDayIndex = 0;
  private minPopulation?: number;
  private maxPopulation?: number;
  private animationId: NodeJS.Timeout | null = null;
  private startDate = new Date(2020, 0, 22);

  private shades: Color[] = [
    { code: "F2F0F7", on: true },
    { code: "DADAEB", on: true },
    { code: "BCBDDC", on: true },
    { code: "9E9AC8", on: true },
    { code: "807DBA", on: true },
    { code: "6A51A3", on: true },
    { code: "4A1486", on: true },
    { code: "333333", on: true },
  ];

  constructor(private mapId: string, private metric: Metric, private data: Covid19Data, private max: Metrics<number>, private legends: Metrics<Legend>) {
    this.currentDayIndex = data.days.length - 1;

    this.map = new google.maps.Map(document.getElementById(this.mapId) as Element, {
      zoom: 4,
      center: { lat: 38.95809, lng: -95.26726 },
    });
    this.map.data.loadGeoJson("./data/gz_2010_us_050_00_20m.json");
    this.infoWindow = new google.maps.InfoWindow();

    this.map.data.addListener("click", (evt: google.maps.Data.MouseEvent) => {
      this.showCountyDetails(evt);
    });

    this.handleMetric();
    this.handleAnimation();
    this.handleToggles();
    this.handlePopulation();

    this.styleMap();
  }

  handlePopulation(): void {
    const minPopulation = $("#minPopulation");
    minPopulation.on("change", () => {
      const val = minPopulation.val();
      this.minPopulation = val === "" ? undefined : (val as number) * 1000;

      this.styleMap();
    });

    const maxPopulation = $("#maxPopulation");
    maxPopulation.on("change", () => {
      const val = maxPopulation.val();
      this.maxPopulation = val === "" ? undefined : (val as number) * 1000;

      this.styleMap();
    });
  }

  handleToggles(): void {
    $("#legend").on("click", ".legend-value", (evt) => {
      const target = $(evt.currentTarget);
      const position = target.data("position");

      this.legends[this.metric]!.toggleItem(position);
      target.toggleClass("on");

      this.styleMap();
    });
  }

  handleAnimation(): void {
    const adjust = (day: number): void => {
      if (day >= 0 && day <= this.data.days.length - 1) {
        this.currentDayIndex = day;
        this.styleMap();
      }
    };
    $("#rewind-all").on("click", () => adjust(0));
    $("#rewind-1").on("click", () => adjust(this.currentDayIndex - 1));
    $("#fast-forward-1").on("click", () => adjust(this.currentDayIndex + 1));
    $("#toggle").on("click", () => {
      if (this.animationId == null) {
        $("#toggle").removeClass("play").addClass("pause");
        const update = (): void => {
          this.animationId = setTimeout(() => {
            if (this.currentDayIndex < this.data.days.length - 1) {
              adjust(this.currentDayIndex + 1);
              update();
            } else {
              $("#toggle").click();
            }
          }, 50);
        };

        update();
      } else {
        $("#toggle").removeClass("pause").addClass("play");
        clearTimeout(this.animationId);
        this.animationId = null;
      }
    });
    $("#fast-forward-all").on("click", () => adjust(this.data.days.length - 1));
  }

  displayDate(): void {
    const date = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate());
    date.setDate(date.getDate() + this.currentDayIndex);
    $("#currentDate").text(date.toLocaleDateString("en-US"));

    const isGrowth = this.metric.indexOf("Growth") >= 0;
    const national = this.data.days[this.currentDayIndex].national[this.metric];

    if (national == null) {
      $("#nationValue").text("");
      $("#national").hide();
    } else {
      $("#nationalValue").text(
        this.formatNumber(national, isGrowth)
      );
      $("#national").show();
    }
  }

  handleMetric(): void {
    const $metric = $("#metric");
    $metric.on("change", () => {
      this.metric = $metric.val() as Metric;
      this.styleMap();
    });
  }

  formatNumber(num: number, isPercent: boolean = false) {
    const val = isPercent ? Math.floor(num * 100) / 100 : Math.floor(num);
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }





  showCountyDetails(evt: google.maps.Data.MouseEvent): void {
    const geoId = this.getGeoId(evt.feature);

    const countyData = this.data.days[this.currentDayIndex].data[geoId];
    const county = this.data.counties[geoId];

    const html = `
<div data-fips="${geoId}"><b>${county.county}, ${county.stateAbbr}</b></div>
<div>Population:  ${this.formatNumber(county.population)}</div>
<p>Day ${this.currentDayIndex}</p>
<p></p>
<p>
    14-day Downward Case Trajectory for Reopen: ${countyData.reopenTrajectory == -1 ? "no" : countyData.reopenTrajectory == 1 ? "yes" : "not enough data"}
<p>
    New Confirmed: ${this.formatNumber(countyData.newConfirmed)} (${this.formatNumber(countyData.newConfirmedAverage!)} avg)
    <br />
    ${this.formatNumber(countyData.newConfirmedPerCapita!)} per million (${this.formatNumber(countyData.newConfirmedPerCapitaAverage!)} avg)
</p>
<p>
    Total Confirmed: ${this.formatNumber(countyData.totalConfirmed)}
    <br />
    ${this.formatNumber(countyData.totalConfirmedPerCapita!)} per million
</p>
<p>
    Confirmed Growth:
    ${this.formatNumber(countyData.totalConfirmedGrowthToday, true)}% yesterday (${this.formatNumber(countyData.totalConfirmedGrowthTodayAverage!, true)}% avg)
    <br />
    ${this.formatNumber(countyData.totalConfirmedGrowthRate, true)}% change from yesterday
</p>
<p></p>
<p>
    New Deaths: ${this.formatNumber(countyData.newDeaths)} (${this.formatNumber(countyData.newDeathsAverage!)} avg)
    <br />
    ${this.formatNumber(countyData.newDeathsPerCapita!)} per million (${this.formatNumber(countyData.newDeathsPerCapitaAverage!)} avg)
</p>
<p>
    Total Deaths: ${this.formatNumber(countyData.totalDeaths)}
    <br />
    ${this.formatNumber(countyData.totalDeathsPerCapita!)} per million
</p>
<p>
    Deaths Growth:
    ${this.formatNumber(countyData.totalDeathsGrowthToday!, true)}% from yesterday (${this.formatNumber(countyData.totalDeathsGrowthTodayAverage!, true)}% avg)
    <br />
    ${this.formatNumber(countyData.totalDeathsGrowthRate, true)}% change from yesterday
</p>
  `;

    this.infoWindow!.setContent(html);
    this.infoWindow!.setPosition(evt.latLng);
    this.infoWindow!.setOptions({ pixelOffset: new google.maps.Size(0, -34) });
    this.infoWindow!.open(this.map!);
  }

  getGeoId(feature: google.maps.Data.Feature): string {
    return feature.getProperty("GEOID");
  }

  styleMap(): void {
    this.displayDate();
    const day = this.currentDayIndex;

    if (day == 0) {
      $("#rewind-1,#rewind-all").addClass("disabled");
    } else {
      $("#rewind-1,#rewind-all").removeClass("disabled");
    }

    if (day == this.data.days.length - 1) {
      $("#fast-forward-1,#fast-forward-all,#toggle").addClass("disabled");
    } else {
      $("#fast-forward-1,#fast-forward-all,#toggle").removeClass("disabled");
    }

    this.displayLegend();
    this.map!.data.setStyle((feature) => this.styleFeature(feature));
  }

  styleFeature(feature: google.maps.Data.Feature): google.maps.Data.StyleOptions {
    const geoId = this.getGeoId(feature);
    const countyData = this.data.days[this.currentDayIndex].data[geoId];
    const county = this.data.counties[geoId];

    let bucket = "white";
    if (countyData != null) {
      const value = countyData[this.metric] || 0;
      const formattedValue = this.formatNumber(value, this.metric.indexOf("Growth") >= 0);
      const shade = this.legends[this.metric]!.getPosition(formattedValue);

      if (shade == null) {
        console.log(geoId, countyData, county, value, formattedValue, shade);
      }
      if (shade.isOn()) {
        if (
          (this.minPopulation == null || this.minPopulation <= county.population) &&
          (this.maxPopulation == null || this.maxPopulation >= county.population)
        ) {
          bucket = "#" + shade.getColor();
        }
      }
    }

    return {
      fillColor: bucket,
      strokeWeight: 1,
      strokeColor: "#CCCCCC",
      fillOpacity: 0.75,
    };
  }

  displayLegend(): void {
    const legend = this.legends[this.metric];
    $("#legend").html(legend!.getHTML());
  }
}
