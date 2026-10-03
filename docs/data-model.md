# Data model

Niak Weather has two deliberately separate inputs:

```text
Ecowitt station ── measured local conditions ──┐
                                                 ├── Niak Weather card
Météo-France ─── forecast for the area ─────────┘
```

The station has priority when it observes a condition that a geographic
forecast cannot see at the home: current rain, nearby lightning, dense local
fog or strong sunshine beneath a forecast cloud layer. Météo-France remains
the source for the future forecast.

The upcoming template package owns the derived values and their history:

- apparent temperature and its breakdown (humidity, wind, sun, rain and night);
- observed condition and the source that established it;
- pressure and wind trends over an explicit measurement window;
- rainfall narrative and precipitation horizon.

This separation matters. A frontend card must not silently turn a missing
station measurement into a zero, nor present a few seconds of browser history
as a pressure trend. The template package keeps those values available to
automations and history as well as to the card.

The frontend owns presentation: responsive layout, the hourly curve, daily
range, translations, status tiles and optional details. It reads the versioned
data contract; it does not decide home-automation actions.
