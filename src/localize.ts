const strings = {
  en: {
    cardName: "Niak Weather",
    forecast: "Forecast",
    temperature: "Temperature",
    humidity: "Humidity",
    wind: "Wind",
    rain: "Rain",
    unavailable: "Unavailable",
  },
  fr: {
    cardName: "Météo Niak",
    forecast: "Prévisions",
    temperature: "Température",
    humidity: "Humidité",
    wind: "Vent",
    rain: "Pluie",
    unavailable: "Indisponible",
  },
} as const;

export type TranslationKey = keyof (typeof strings)["en"];

export function localize(language: string | undefined, key: TranslationKey): string {
  const locale = language?.toLowerCase().startsWith("fr") ? "fr" : "en";
  return strings[locale][key];
}
