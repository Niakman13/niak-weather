import { describe, expect, it } from "vitest";
import { displayState, weatherIcon } from "../src/format";
import { forecastsFromResponse, toFiniteNumber } from "../src/forecast";

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
