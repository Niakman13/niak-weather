const strings = {
  en: {
    cardName: "Niak Weather",
    forecast: "Forecast",
    nextHours: "Next hours",
    nextDays: "Next days",
    temperature: "Temperature",
    humidity: "Humidity",
    wind: "Wind",
    rain: "Rain",
    weatherEntity: "Weather entity",
    name: "Name",
    mode: "Display mode",
    compact: "Compact",
    detailed: "Detailed",
    detectStation: "Detect Ecowitt station",
    measuredHere: "measured here",
    apparent: "apparent",
    thermometer: "thermometer",
    unavailable: "Unavailable",
  },
  fr: {
    cardName: "Météo Niak",
    forecast: "Prévisions",
    nextHours: "Prochaines heures",
    nextDays: "Prochains jours",
    temperature: "Température",
    humidity: "Humidité",
    wind: "Vent",
    rain: "Pluie",
    weatherEntity: "Entité météo",
    name: "Nom",
    mode: "Mode d’affichage",
    compact: "Compact",
    detailed: "Détaillé",
    detectStation: "Détecter la station Ecowitt",
    measuredHere: "mesuré ici",
    apparent: "ressenti",
    thermometer: "thermomètre",
    unavailable: "Indisponible",
  },
} as const;

export type TranslationKey = keyof (typeof strings)["en"];

export function localize(language: string | undefined, key: TranslationKey): string {
  const locale = language?.toLowerCase().startsWith("fr") ? "fr" : "en";
  return strings[locale][key];
}
