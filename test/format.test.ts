import { describe, expect, it } from "vitest";
import { forecastsFromResponse, toFiniteNumber } from "../src/forecast";
import { detectEcowittStation } from "../src/station-detection";
import { buildWeatherVerdict } from "../src/weather-model";

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
  it("keeps a measured shower distinct from an actionable downpour", () => {
    expect(buildWeatherVerdict({ rainRate: 1 }, "cloudy").alert).toBeUndefined();
    expect(buildWeatherVerdict({ rainRate: 12 }, "cloudy").alert).toBe("downpour");
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
    });
    // Thermal Comfort is no longer looked for: humidex is computed from temperature and humidity.
    expect(detectEcowittStation({ states })).not.toHaveProperty("humidex_entity");
  });
  it("recognizes the long Ecowitt WS90 entity names", () => {
    const prefix = "sensor.station_meteo_ecowitt_ws90_powered_by_shelly_";
    const names = ["temperature", "humidity", "wind_speed", "gust_speed", "wind_direction", "rain_rate", "precipitations_24h", "pressure", "illuminance", "uv_index", "humidex"];
    const states = Object.fromEntries(names.map(name => [`${prefix}${name}`, { entity_id: `${prefix}${name}`, state: "1", attributes: {} }]));
    const entities = names.map(name => ({ entity_id: `${prefix}${name}`, platform: "zigbee2mqtt", device_id: "ws90" }));
    expect(detectEcowittStation({ states }, { entities, devices: [] })).toMatchObject({
      temperature_entity: `${prefix}temperature`, humidity_entity: `${prefix}humidity`, wind_speed_entity: `${prefix}wind_speed`,
      wind_gust_entity: `${prefix}gust_speed`, wind_bearing_entity: `${prefix}wind_direction`, rain_rate_entity: `${prefix}rain_rate`,
      rain_24h_entity: `${prefix}precipitations_24h`, pressure_entity: `${prefix}pressure`, illuminance_entity: `${prefix}illuminance`,
      uv_index_entity: `${prefix}uv_index`,
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
    expect(toFiniteNumber(null)).toBeUndefined();
    expect(toFiniteNumber('')).toBeUndefined();
  });
});
