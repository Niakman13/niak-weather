# Niak Weather

A weather dashboard card for Home Assistant, designed around the combination
of a **local Ecowitt weather station** and the **Météo-France** integration.

> Status: **v0.1.0 is a functional preview.** It displays current conditions,
> optional station measurements and Météo-France forecasts. The complete local
> weather model (apparent temperature, wind/pressure trends and the detailed
> visual dashboard) is still under development.

[![Open Niak Weather in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Niakman13&repository=niak-weather&category=plugin)

French installation instructions: [docs/installation.md](docs/installation.md).

## Requirements

Niak Weather is intentionally not a generic replacement for Home Assistant's
native weather card. Its purpose is to compare what is **measured above the
home** with what is **forecast for the area**.

1. The [Météo-France integration](https://www.home-assistant.io/integrations/meteo_france/), configured with a weather entity. It provides the hourly and daily forecasts.
2. An Ecowitt weather station exposed in Home Assistant. This includes any supported Ecowitt gateway or station — it is not limited to the GW2000. Entity names are chosen in the card editor; the installation does not assume a gateway model, location or language.
3. For the complete experience, the Niak Weather template package (to be published in this repository). It turns the raw station measurements into a consistent local-weather model: apparent temperature, observed condition, rain narrative, wind and pressure trends.

The card can show current conditions and forecasts while the template package
is being installed. The full model is the supported configuration for a
complete dashboard.

### Ecowitt measurements used by the complete model

| Purpose | Measurement |
| --- | --- |
| Outdoor conditions | temperature, humidity, dew point |
| Wind | 10-minute average speed and direction, gust |
| Rain | rate, daily, 24-hour, weekly, monthly and yearly totals |
| Sun | solar radiation, UV index, illuminance |
| Atmosphere | relative pressure |

An optional WH57 lightning detector and a Home Assistant sun entity enrich the
local condition when present. They are never fabricated when unavailable.

## Project goals

- one HACS installation and one resource for the card;
- visual configuration in Home Assistant — entity names are selected, never hard-coded;
- a versioned template package for the full Ecowitt + Météo-France data model;
- French and English interfaces, following the Home Assistant language;
- hourly and daily Météo-France forecasts read directly from Home Assistant;
- optional sensors: temperature, humidity, wind and rain rate;
- release assets generated and verified automatically.

## Development

```sh
npm install
npm run validate
```

`npm run build` creates `dist/niak-weather-card.js`, the file that HACS will install from each GitHub release.

## Installation with HACS

1. Install HACS first, then click the **Open Niak Weather in HACS** button above.
2. In Home Assistant, choose **Open link**, then **Download** in HACS.
3. HACS adds the dashboard resource automatically. Reload the dashboard and hard-refresh the browser if the card picker does not show Niak Weather immediately.
4. Add **Niak Weather** from the card picker, then select the Météo-France weather entity and any available Ecowitt measurements.

If the button cannot open your instance, go to **HACS → Dashboards → ⋮ → Custom repositories**, add `https://github.com/Niakman13/niak-weather`, choose **Dashboard**, and download it. Full French instructions and the manual resource fallback are in [docs/installation.md](docs/installation.md).

## Planned card configuration

```yaml
type: custom:niak-weather-card
weather_entity: weather.home
temperature_entity: sensor.outdoor_temperature
humidity_entity: sensor.outdoor_humidity
wind_speed_entity: sensor.wind_speed
rain_rate_entity: sensor.rain_rate
mode: detailed # or compact
```

The Météo-France weather entity is required. The station fields are selected in
the editor and remain optional: a basic station can show its temperature and
rain, while a fully equipped station progressively enables wind, sun, UV,
pressure and the richer local analysis.

## Releasing

Create and publish a GitHub release with a `v` tag, for example `v0.1.0`. GitHub validates the code, builds the card and attaches the installable JavaScript file to the release automatically.

## License

MIT. See [LICENSE](LICENSE).
