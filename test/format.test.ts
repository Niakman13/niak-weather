import { describe, expect, it } from "vitest";
import { displayState, weatherIcon } from "../src/format";
import { forecastsFromResponse, toFiniteNumber } from "../src/forecast";
import { detectEcowittStation } from "../src/station-detection";
import { buildWeatherVerdict } from "../src/weather-model";
import { buildDailyRanges, buildHourlyChart } from "../src/forecast-chart";

describe("weather presentation", () => {
  it("shows a measured value with its unit", () => {
    expect(displayState({ entity_id: "sensor.outdoor", state: "12.4", attributes: { unit_of_measurement: "°C" } }, "Unavailable")).toBe("12.4 °C");
  });
  it("does not mistake an unavailable state for a measurement", () => {
    expect(displayState({ entity_id: "sensor.outdoor", state: "unavailable", attributes: {} }, "Unavailable")).toBe("Unavailable");
  });
  it("maps a weather condition to a recognisable icon", () => {
    expect(weatherIcon("lightning_rainy")).toBe("⛈️");
  });
});

describe("forecast chart geometry", () => {
  it("keeps the warmest hourly forecast highest on the graph", () => {
    const chart = buildHourlyChart([
      { datetime: "2026-10-03T10:00:00+02:00", temperature: 10 },
      { datetime: "2026-10-03T11:00:00+02:00", temperature: 20, precipitation: 1 },
    ]);
    expect(chart[1].y).toBeLessThan(chart[0].y);
    expect(chart[1].rain).toBeGreaterThan(0);
  });
  it("uses one shared scale for every daily low/high range", () => {
    const days = buildDailyRanges([
      { datetime: "2026-10-03T10:00:00+02:00", temperature: 20, templow: 10 },
      { datetime: "2026-10-04T10:00:00+02:00", temperature: 30, templow: 20 },
    ]);
    expect(days[1].start).toBeGreaterThan(days[0].start);
    expect(days[0].width).toBeGreaterThan(0);
  });
});

describe("local weather model", () => {
  it("makes measured rain take precedence over an area forecast", () => {
    const verdict = buildWeatherVerdict({ temperature: 18, rainRate: 5 }, "cloudy");
    expect(verdict.condition).toBe("pouring");
    expect(verdict.conditionSource).toBe("station");
  });
  it("finds the first notable rain in the hourly forecast", () => {
    const verdict = buildWeatherVerdict({}, "partlycloudy", [
      { datetime: "2026-10-03T10:00:00+02:00", precipitation: 0 },
      { datetime: "2026-10-03T11:00:00+02:00", precipitation: 0.4 },
    ]);
    expect(verdict.nextRainHours).toBe(1);
    expect(verdict.nextRainAmount).toBe(0.4);
  });
  it("warns about rain while openings are left open", () => {
    expect(buildWeatherVerdict({ rainRate: 1, openWindows: 2 }, "cloudy").alert).toBe("openings");
  });
});

describe("Ecowitt station detection", () => {
  it("prefills compatible outdoor measurements from the same station", () => {
    const states = {
      "sensor.gw2000a_outdoor_temperature": { entity_id: "sensor.gw2000a_outdoor_temperature", state: "12", attributes: { device_class: "temperature", unit_of_measurement: "°C" } },
      "sensor.gw2000a_outdoor_humidity": { entity_id: "sensor.gw2000a_outdoor_humidity", state: "80", attributes: { device_class: "humidity", unit_of_measurement: "%" } },
      "sensor.gw2000a_wind_speed": { entity_id: "sensor.gw2000a_wind_speed", state: "5", attributes: { device_class: "wind_speed", unit_of_measurement: "km/h" } },
      "sensor.gw2000a_rain_rate": { entity_id: "sensor.gw2000a_rain_rate", state: "0", attributes: { device_class: "precipitation_intensity", unit_of_measurement: "mm/h" } },
      "sensor.indoor_temperature": { entity_id: "sensor.indoor_temperature", state: "23", attributes: { device_class: "temperature", unit_of_measurement: "°C" } },
      "sensor.thermal_comfort_humidex": { entity_id: "sensor.thermal_comfort_humidex", state: "13", attributes: { device_class: "temperature", unit_of_measurement: "°C" } },
      "sensor.confort_ouvertures": { entity_id: "sensor.confort_ouvertures", state: "ok", attributes: {} },
    };
    expect(detectEcowittStation({ states })).toMatchObject({
      temperature_entity: "sensor.gw2000a_outdoor_temperature",
      humidity_entity: "sensor.gw2000a_outdoor_humidity",
      wind_speed_entity: "sensor.gw2000a_wind_speed",
      rain_rate_entity: "sensor.gw2000a_rain_rate",
      humidex_entity: "sensor.thermal_comfort_humidex",
      comfort_entity: "sensor.confort_ouvertures",
    });
  });
});

describe("forecast data", () => {
  it("reads only forecasts for the configured weather entity", () => {
    const payload = { response: { "weather.home": { forecast: [{ datetime: "2026-10-03T12:00:00+02:00" }] } } };
    expect(forecastsFromResponse(payload, "weather.home")).toHaveLength(1);
    expect(forecastsFromResponse(payload, "weather.other")).toEqual([]);
  });
  it("accepts numeric strings without turning invalid values into zero", () => {
    expect(toFiniteNumber("12.4")).toBe(12.4);
    expect(toFiniteNumber("unknown")).toBeUndefined();
  });
});
