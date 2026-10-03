import type { HassEntity } from "./types";

export function displayState(entity: HassEntity | undefined, fallback: string): string {
  if (!entity || ["unknown", "unavailable"].includes(entity.state)) return fallback;
  const unit = entity.attributes.unit_of_measurement;
  return typeof unit === "string" && unit ? `${entity.state} ${unit}` : entity.state;
}

export function weatherIcon(condition: string | undefined): string {
  const icons: Record<string, string> = {
    sunny: "☀️", clear_night: "🌙", partlycloudy: "⛅", cloudy: "☁️",
    rainy: "🌧️", pouring: "🌧️", lightning: "🌩️", lightning_rainy: "⛈️",
    snowy: "❄️", snowy_rainy: "🌨️", fog: "🌫️", windy: "💨", windy_variant: "💨",
  };
  return icons[condition ?? ""] ?? "🌤️";
}
