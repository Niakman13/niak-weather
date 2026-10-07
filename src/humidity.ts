/**
 * Air-moisture quantities computed from temperature (°C) and relative humidity (%).
 * Same formulas as the Thermal Comfort integration, checked against its sensors on a real
 * GW2000A history: identical dew point to the hundredth of a degree. No extra integration needed.
 */

/** Dew point (°C): saturation vapour pressure from the Goff-Gratch/Arden Buck formulation. */
export function dewPoint(temperature: number, humidity: number): number | undefined {
  if (!(humidity > 0 && humidity <= 100) || !Number.isFinite(temperature)) return;
  const a0 = 373.15 / (273.15 + temperature);
  const sum = -7.90298 * (a0 - 1) + 5.02808 * Math.log10(a0) - 1.3816e-7 * (10 ** (11.344 * (1 - 1 / a0)) - 1)
    + 8.1328e-3 * (10 ** (-3.49149 * (a0 - 1)) - 1) + Math.log10(1013.246);
  const td = Math.log(10 ** (sum - 3) * humidity / 0.61078);
  return 241.88 * td / (17.558 - td);
}

/** Frost point (°C): the temperature at which a surface collects rime instead of dew. */
export function frostPoint(temperature: number, dew: number): number {
  const t = temperature + 273.15, d = dew + 273.15;
  return d - t + 2671.02 / (2954.61 / t + 2.193665 * Math.log(t) - 13.3448) - 273.15;
}

/** Humidex (Environment Canada) from temperature and dew point. */
export function humidex(temperature: number, dew: number): number {
  return temperature + 0.5555 * (6.11 * Math.exp(5417.7530 * (1 / 273.16 - 1 / (273.15 + dew))) - 10);
}

/** How the moisture feels, from the dew point; said only when it changes the experience. */
export function humidityFeel(dew: number | undefined, humidity: number | undefined, feels: number | undefined): string {
  if (dew === undefined || feels === undefined) return '';
  if (dew >= 24) return 'air étouffant';
  if (dew >= 21) return 'air très lourd';
  if (dew >= 18) return 'air lourd';
  if (dew >= 16 && feels >= 20) return 'air un peu humide';
  if (humidity !== undefined && humidity < 30 && feels >= 15) return 'air sec';
  return '';
}

/** Hover text for the humidex chip, in the same spirit as Thermal Comfort's perception sensors. */
export function humidexFeel(value: number): string {
  return value >= 54 ? 'coup de chaleur imminent' : value >= 45 ? 'inconfort dangereux' : value >= 40 ? 'fort inconfort'
    : value >= 35 ? 'inconfort évident' : value >= 30 ? 'léger inconfort' : 'confortable';
}

/**
 * One word for the overall feel, on the thresholds of the UTCI thermal stress scale.
 * The card's feels-like is not the UTCI itself: the scale is borrowed as a sensible reading grid.
 */
export function comfortWord(feels: number | undefined): string {
  if (feels === undefined) return '';
  return feels < -13 ? 'Froid intense' : feels < 0 ? 'Froid' : feels < 9 ? 'Frais' : feels < 26 ? 'Agréable'
    : feels < 32 ? 'Chaud' : feels < 38 ? 'Très chaud' : feels < 46 ? 'Chaleur intense' : 'Chaleur extrême';
}
