"use strict";
var Covid19 = /** @class */ (function () {
    function Covid19(mapId) {
        var _this = this;
        this.mapId = mapId;
        this.animationId = null;
        this.allCounties = {};
        this.populationThreshold = 0;
        this.geoIdPattern = /.+US(\d+)/;
        this.shades = [
            { color: "E8DEFF", on: true },
            { color: "D8C7FF", on: true },
            { color: "B99AFF", on: true },
            { color: "9B6DFF", on: true },
            { color: "7C40FF", on: true },
            { color: "6D2AFF", on: true },
            { color: "651FFF", on: true },
            { color: "333333", on: true }
        ];
        this.startDate = new Date(2020, 0, 22);
        this.max = {
            newDeaths: 0,
            totalDeaths: 0,
            newConfirmed: 0,
            totalConfirmed: 0,
            newDeathsNormalized: 0,
            totalDeathsNormalized: 0,
            newConfirmedNormalized: 0,
            totalConfirmedNormalized: 0,
            population: 0
        };
        this.metric = "totalConfirmed";
        this.fetchData().done(function () {
            _this.currentDayIndex = _this.covid19.length - 1;
            _this.initMap();
            _this.handleMetric();
            _this.handleAnimation();
            _this.handleToggles();
            _this.handlePopulation();
        });
    }
    Covid19.prototype.handlePopulation = function () {
        var _this = this;
        var population = $("#population");
        population.on("change", function () {
            _this.populationThreshold = population.val();
            _this.styleMap();
        });
    };
    Covid19.prototype.handleToggles = function () {
        var _this = this;
        $("#legend").on("click", ".legend-value", function (evt) {
            var target = $(evt.currentTarget);
            var position = target.data("position");
            _this.shades[position].on = !_this.shades[position].on;
            target.toggleClass("on");
            _this.styleMap();
        });
    };
    Covid19.prototype.handleAnimation = function () {
        var _this = this;
        var adjust = function (day) {
            if (day >= 0 && day <= _this.covid19.length - 1) {
                _this.currentDayIndex = day;
                _this.styleMap();
            }
        };
        $("#rewind-all").on("click", function () { return adjust(0); });
        $("#rewind-1").on("click", function () { return adjust(_this.currentDayIndex - 1); });
        $("#fast-forward-1").on("click", function () { return adjust(_this.currentDayIndex + 1); });
        $("#toggle").on("click", function () {
            if (_this.animationId == null) {
                $("#toggle").removeClass("play").addClass("pause");
                var update = function () {
                    _this.animationId = setTimeout(function () {
                        if (_this.currentDayIndex < _this.covid19.length - 1) {
                            adjust(_this.currentDayIndex + 1);
                            update();
                        }
                        else {
                            $("#toggle").click();
                        }
                    }, 50);
                };
                update();
            }
            else {
                $("#toggle").removeClass("pause").addClass("play");
                clearTimeout(_this.animationId);
                _this.animationId = null;
            }
        });
        $("#fast-forward-all").on("click", function () { return adjust(_this.covid19.length - 1); });
    };
    Covid19.prototype.displayDate = function () {
        var date = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate());
        date.setDate(date.getDate() + this.currentDayIndex);
        $("#currentDate").text(date.toLocaleDateString("en-US"));
    };
    Covid19.prototype.handleMetric = function () {
        var _this = this;
        var $metric = $("#metric");
        $metric.on("change", function (evt) {
            _this.metric = $metric.val();
            _this.styleMap();
        });
    };
    Covid19.prototype.fetchData = function () {
        var _this = this;
        return this.fetchPopulationData().then(function () { return _this.fetchCovid19Data(); });
    };
    Covid19.prototype.fetchPopulationData = function () {
        var _this = this;
        return $.getJSON("./population.json").done(function (data) {
            _this.population = data;
        }).fail(function (xhr, text, error) { alert("Something went wrong. Please try again.") });
    };
    Covid19.prototype.fetchCovid19Data = function () {
        var _this = this;
        return $.getJSON("https://usafactsstatic.blob.core.windows.net/public/2020/coronavirus-timeline/allData.json").done(function (data) {
            var dataByCounty = data
                .filter(function (i) { return i.countyFIPS !== "00"; })
                .map(function (i) {
                var county = { fips: i.countyFIPS, daily: [] };
                var population = _this.population[county.fips];
                var countyData = {
                    county: i.county,
                    stateAbbr: i.stateAbbr,
                    population: population
                };
                _this.allCounties[county.fips] = countyData;
                var runningDeaths = 0;
                var runningConfirmed = 0;
                var runningDeathsNormalized = 0;
                var runningConfirmedNormalized = 0;
                var totalDeaths = i.deaths.reduce(function (sum, v) { return sum += v; });
                var totalConfirmed = i.confirmed.reduce(function (sum, v) { return sum += v; });
                if (totalDeaths > totalConfirmed) {
                    return null;
                }
                for (var d = 0; d < i.deaths.length; d++) {
                    var deaths = i.deaths[d];
                    var confirmed = i.confirmed[d];
                    runningDeaths += deaths;
                    runningConfirmed += confirmed;
                    if (population != null) {
                        var denominator = countyData.population / 1000000;
                        var deathsNormalized = Math.floor(deaths / denominator);
                        var confirmedNormalized = Math.floor(confirmed / denominator);
                        runningDeathsNormalized += deathsNormalized;
                        runningConfirmedNormalized += confirmedNormalized;
                    }
                    county.daily.push({
                        newDeaths: deaths,
                        totalDeaths: runningDeaths,
                        newConfirmed: confirmed,
                        totalConfirmed: runningConfirmed,
                        newDeathsNormalized: deathsNormalized,
                        totalDeathsNormalized: runningDeathsNormalized,
                        newConfirmedNormalized: confirmedNormalized,
                        totalConfirmedNormalized: runningConfirmedNormalized
                    });
                    if (deaths > _this.max.newDeaths) {
                        _this.max.newDeaths = deaths;
                    }
                    if (confirmed > _this.max.newConfirmed) {
                        _this.max.newConfirmed = confirmed;
                    }
                    if (population != null && deathsNormalized > _this.max.newDeathsNormalized) {
                        _this.max.newDeathsNormalized = deathsNormalized;
                    }
                    if (population != null && confirmedNormalized > _this.max.newConfirmedNormalized) {
                        _this.max.newConfirmedNormalized = confirmedNormalized;
                    }
                }
                if (runningDeaths > _this.max.totalDeaths) {
                    _this.max.totalDeaths = runningDeaths;
                }
                if (runningConfirmed > _this.max.totalConfirmed) {
                    _this.max.totalConfirmed = runningConfirmed;
                }
                if (runningDeathsNormalized > _this.max.totalDeathsNormalized) {
                    _this.max.totalDeathsNormalized = runningDeathsNormalized;
                }
                if (runningConfirmedNormalized > _this.max.totalConfirmedNormalized) {
                    _this.max.totalConfirmedNormalized = runningConfirmedNormalized;
                }
                if (population > _this.max.population) {
                    _this.max.population = population;
                }
                return county;
            }).filter(function (i) { return i != null; });
            var dataByDay = [];
            for (var a = 0; a < dataByCounty[0].daily.length; a++) {
                var counties = dataByCounty.reduce(function (res, c) {
                    res[c.fips] = {
                        newDeaths: c.daily[a].newDeaths,
                        totalDeaths: c.daily[a].totalDeaths,
                        newConfirmed: c.daily[a].newConfirmed,
                        totalConfirmed: c.daily[a].totalConfirmed,
                        newDeathsNormalized: c.daily[a].newDeathsNormalized,
                        totalDeathsNormalized: c.daily[a].totalDeathsNormalized,
                        newConfirmedNormalized: c.daily[a].newConfirmedNormalized,
                        totalConfirmedNormalized: c.daily[a].totalConfirmedNormalized
                    };
                    return res;
                }, {});
                dataByDay.push(counties);
            }
            _this.covid19 = dataByDay;
        });
    };
    Covid19.prototype.initMap = function () {
        var _this = this;
        this.map = new google.maps.Map(document.getElementById("map"), {
            zoom: 4,
            center: { lat: 38.95809, lng: -95.26726 }
        });
        this.map.data.loadGeoJson("./gz_2010_us_050_00_20m.json");
        this.map.data.addListener("click", function (evt) {
            _this.showCountyDetails(evt);
        });
        this.infoWindow = new google.maps.InfoWindow();
        this.styleMap();
    };
    Covid19.prototype.showCountyDetails = function (evt) {
        var geoId = this.getGeoId(evt.feature);
        var countyData = this.covid19[this.currentDayIndex][geoId];
        var county = this.allCounties[geoId];
        var html = "\n<div><b>" + county.county + ", " + county.stateAbbr + "</b></div>\n<div>Population: " + county.population.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "\n</div><p>Day " + this.currentDayIndex + "</p>\n<p></p>\n<p>New Confirmed: " + countyData.newConfirmed + "<br>" + countyData.newConfirmedNormalized + " per million\n<p>Total Confirmed: " + countyData.totalConfirmed + "<br>" + countyData.totalConfirmedNormalized + " per million</p>\n<p></p>\n<p>New Deaths: " + countyData.newDeaths + "<br>" + countyData.newDeathsNormalized + " per million</p>\n<p>Total Deaths: " + countyData.totalDeaths + "<br>" + countyData.totalDeathsNormalized + " per million</p>\n";
        this.infoWindow.setContent(html);
        this.infoWindow.setPosition(evt.latLng);
        this.infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -34) });
        this.infoWindow.open(this.map);
    };
    Covid19.prototype.getGeoId = function (feature) {
        return feature.getProperty("GEOID");
    };
    Covid19.prototype.styleMap = function () {
        var _this = this;
        this.displayDate();
        var day = this.currentDayIndex;
        if (day == 0) {
            $("#rewind-1,#rewind-all").addClass("disabled");
        }
        else {
            $("#rewind-1,#rewind-all").removeClass("disabled");
        }
        if (day == this.covid19.length - 1) {
            $("#fast-forward-1,#fast-forward-all,#toggle").addClass("disabled");
        }
        else {
            $("#fast-forward-1,#fast-forward-all,#toggle").removeClass("disabled");
        }
        this.logSlider = new LogarithmicSlider(this.shades.length, this.max[this.metric]);
        this.generateLegend();
        this.map.data.setStyle(function (feature) { return _this.styleFeature(feature); });
    };
    Covid19.prototype.generateLegend = function () {
        var html = "";
        html += "<div>";
        html += "<div class='row align-items-center no-gutters'>";
        var maxValue = 0;
        for (var i = 0; i < this.shades.length; i++) {
            var newValue = this.logSlider.getValue(i);
            var shade = this.shades[i];
            var text = i === 0 || i === this.shades.length - 1 ? newValue : (newValue == 0 ? 0 : maxValue + 1) + " - " + newValue;
            html += "<div class='col-6 col-sm-3'>";
            html += "<div data-position=\"" + i + "\" class=\"legend-value " + (shade.on ? "on" : "") + "\" style='background-color: #" + shade.color + "'><div>" + text + "</div></div>";
            html += "</div>";
            maxValue = newValue;
        }
        html += "</div>";
        html += "</div>";
        $("#legend").html(html);
    };
    Covid19.prototype.styleFeature = function (feature) {
        var geoId = this.getGeoId(feature);
        var countyData = this.covid19[this.currentDayIndex][geoId];
        var county = this.allCounties[geoId];
        var bucket = "white";
        if (countyData != null) {
            var position = this.logSlider.getPosition(countyData[this.metric]);
            var shade = this.shades[position];
            if (shade.on) {
                if (this.populationThreshold <= county.population) {
                    bucket = "#" + shade.color;
                }
            }
        }
        return {
            fillColor: bucket,
            strokeWeight: 0,
            fillOpacity: 0.75
        };
    };
    return Covid19;
}());
var LogarithmicSlider = /** @class */ (function () {
    function LogarithmicSlider(buckets, max) {
        this.buckets = buckets;
        this.max = max;
        this.minp = 0;
        this.maxp = buckets - 2;
        this.minv = 0;
        this.maxv = Math.log(max);
        this.scale = (this.maxv - this.minv) / (this.maxp - this.minp);
    }
    LogarithmicSlider.prototype.getPosition = function (value) {
        if (value <= 0) {
            return 0;
        }
        else if (value === this.max - 1) {
            return this.maxp;
        }
        else if (value === this.max) {
            return this.maxp + 1;
        }
        return Math.ceil((Math.log(value) - this.minv) / this.scale + this.minp);
    };
    LogarithmicSlider.prototype.getValue = function (position) {
        if (position === this.buckets - 1) {
            return this.max;
        }
        else if (position === 0) {
            return 0;
        }
        else if (position === this.maxp) {
            return this.max - 1;
        }
        var value = Math.floor(Math.exp(this.minv + this.scale * (position - this.minp)));
        if (value <= 0) {
            value = 1;
        }
        return value;
    };
    return LogarithmicSlider;
}());
var covid19;
function initMap() {
    covid19 = new Covid19("map");
}