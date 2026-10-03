# Data model

Niak Weather has two deliberately separate inputs:

```text
Ecowitt station or gateway ─ measured local conditions ─┐
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

## Capability-based configuration

The card does not identify a station by model. A GW2000, another Ecowitt
gateway, or a simpler Ecowitt station can all provide the local side of the
model when exposed as Home Assistant entities.

Each measurement is an independent capability selected in the visual editor.
For example, a station with temperature and rain works without a UV sensor;
the UV detail simply remains absent. The complete template package applies the
same rule: it only derives a result from measurements that are actually
available, and marks an unavailable conclusion as unavailable rather than
inventing a value.
