import { describe, expect, it } from "vitest";
import { displayState, weatherIcon } from "../src/format";

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
