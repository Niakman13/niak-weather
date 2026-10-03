# Niak Weather

A modern, configurable weather card for Home Assistant.

> Status: under active development. The first public release will be published after the complete weather experience and its editor have been validated in Home Assistant.

## Project goals

- one HACS installation and one resource for the card;
- visual configuration in Home Assistant — no templates to copy;
- French and English interfaces, following the Home Assistant language;
- optional sensors: temperature, humidity, wind and rain rate;
- release assets generated and verified automatically.

## Development

```sh
npm install
npm run validate
```

`npm run build` creates `dist/niak-weather-card.js`, the file that HACS will install from each GitHub release.

## Planned card configuration

```yaml
type: custom:niak-weather-card
weather_entity: weather.home
temperature_entity: sensor.outdoor_temperature
humidity_entity: sensor.outdoor_humidity
wind_speed_entity: sensor.wind_speed
rain_rate_entity: sensor.rain_rate
```

All sensor fields are optional. The card never assumes entity names or a specific weather-station brand.

## Releasing

Create and publish a GitHub release with a `v` tag, for example `v0.1.0`. GitHub validates the code, builds the card and attaches the installable JavaScript file to the release automatically.

## License

MIT. See [LICENSE](LICENSE).
