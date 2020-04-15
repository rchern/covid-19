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
        (isGrowth ? national : national.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")) + (this.metric.indexOf("Growth") >= 0 ? "%" : "")
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

  showCountyDetails(evt: google.maps.Data.MouseEvent): void {
    const geoId = this.getGeoId(evt.feature);

    const countyData = this.data.days[this.currentDayIndex].data[geoId];
    const county = this.data.counties[geoId];

    const html = `
<div><b>${county.county}, ${county.stateAbbr}</b></div>
<div>Population:  ${county.population.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
<p>Day ${this.currentDayIndex}</p>
<p></p>
<p>
    New Confirmed: ${countyData.newConfirmed} (${countyData.newConfirmedAverage} avg)
    <br />
    ${countyData.newConfirmedPerCapita} per million (${countyData.newConfirmedPerCapitaAverage} avg)
</p>
<p>
    Total Confirmed: ${countyData.totalConfirmed}
    <br />
    ${countyData.totalConfirmedPerCapita} per million
</p>
<p>
    Confirmed Growth:
    ${countyData.totalConfirmedGrowthToday}% yesterday (${countyData.totalConfirmedGrowthTodayAverage}% avg)
    <br />
    ${countyData.totalConfirmedGrowthRate}% change from yesterday
</p>
<p></p>
<p>
    New Deaths: ${countyData.newDeaths} (${countyData.newDeathsAverage} avg)
    <br />
    ${countyData.newDeathsPerCapita} per million (${countyData.newDeathsPerCapitaAverage} avg)
</p>
<p>
    Total Deaths: ${countyData.totalDeaths}
    <br />
    ${countyData.totalDeathsPerCapita} per million
</p>
<p>
    Deaths Growth:
    ${countyData.totalDeathsGrowthToday}% from yesterday (${countyData.totalDeathsGrowthTodayAverage}% avg)
    <br />
    ${countyData.totalDeathsGrowthRate}% change from yesterday
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
      const shade = this.legends[this.metric]!.getPosition(value);

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
