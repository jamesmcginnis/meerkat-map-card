# Meerkat Map Card

A custom Home Assistant Dashboard card that displays a live map of a tracked person with points of interest, address lookups, what3words locations, and distance calculations — built on OpenStreetMap via Leaflet.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)

-----

## Features

- **Live person tracking** — displays the person’s current location with an animated pulsing marker, colour-coded by zone (home = green, away = orange)
- **Tap for info** — tap the person marker to see zone, last updated time, GPS accuracy, battery, speed, altitude, address, and what3words location
- **Full address display** — reads from the HA companion app’s geocoded location sensor (includes house number) with Nominatim as a fallback
- **what3words** — shows the ///word.word.word location for the person and every POI, tappable to open what3words.com
- **12 POI categories** — fetched live from OpenStreetMap via Overpass API, cached in localStorage for instant reload
- **POI info popups** — tap any POI marker to see name, address, opening hours, phone, website, distance from person, and what3words location
- **Distance units** — choose metric (km/m) or imperial (mi/yd) in the visual editor
- **Dark / Light / Auto theme**
- **Visual editor** — full GUI configuration, no YAML required
- **Works on iPhone** — protocol-relative API calls avoid iOS mixed-content blocks; POI cache means the map works even on slow connections

-----

## Installation

### HACS (recommended)

1. In HACS → Frontend, click the three-dot menu → **Custom repositories**
1. Add `https://github.com/jamesmcginnis/meerkat-map-card` with category **Frontend**
1. Install **Meerkat Map Card**
1. Refresh your browser

### Manual

1. Download `meerkat-map-card.js` from this repository
1. Copy it to `/config/www/meerkat-map-card.js`
1. In Home Assistant → Settings → Dashboards → Resources, add:
- URL: `/local/meerkat-map-card.js`
- Type: JavaScript module

-----

## Configuration

The card has a full visual editor — click the pencil icon after adding the card. You can also configure it directly in YAML:

```yaml
type: custom:meerkat-map-card
person_entity: person.sarah
geocoded_entity: sensor.sarahs_iphone_geocoded_location
theme: dark
map_height: 420
zoom_level: 15
distance_unit: metric
show_train_stations: true
show_bus_stops: true
show_hospitals: true
show_shops: false
show_fuel: false
show_post_boxes: false
show_pharmacies: false
show_atms: false
show_restaurants: false
show_supermarkets: false
show_schools: false
show_parks: false
```

### Options

|Option               |Type  |Default |Description                                                                                                                                 |
|---------------------|------|--------|--------------------------------------------------------------------------------------------------------------------------------------------|
|`person_entity`      |string|—       |Entity ID of the person or device tracker to display                                                                                        |
|`geocoded_entity`    |string|—       |HA companion app geocoded location sensor — provides the full address including house number (e.g. `sensor.sarahs_iphone_geocoded_location`)|
|`theme`              |string|`dark`  |Map colour scheme: `dark`, `light`, or `auto`                                                                                               |
|`map_height`         |number|`420`   |Height of the map in pixels                                                                                                                 |
|`zoom_level`         |number|`15`    |Default zoom level (1–20)                                                                                                                   |
|`distance_unit`      |string|`metric`|Distance in POI popups: `metric` (km / m) or `imperial` (mi / yd)                                                                           |
|`show_train_stations`|bool  |`true`  |🚆 Train stations                                                                                                                            |
|`show_bus_stops`     |bool  |`true`  |🚌 Bus stops                                                                                                                                 |
|`show_hospitals`     |bool  |`true`  |🏥 Hospitals                                                                                                                                 |
|`show_shops`         |bool  |`false` |🛍️ Shops                                                                                                                                     |
|`show_fuel`          |bool  |`false` |⛽ Petrol stations                                                                                                                           |
|`show_post_boxes`    |bool  |`false` |📮 Post boxes                                                                                                                                |
|`show_pharmacies`    |bool  |`false` |💊 Pharmacies                                                                                                                                |
|`show_atms`          |bool  |`false` |🏧 ATMs                                                                                                                                      |
|`show_restaurants`   |bool  |`false` |🍴 Restaurants                                                                                                                               |
|`show_supermarkets`  |bool  |`false` |🛒 Supermarkets                                                                                                                              |
|`show_schools`       |bool  |`false` |🏫 Schools                                                                                                                                   |
|`show_parks`         |bool  |`false` |🌳 Parks                                                                                                                                     |

-----

## Person Popup

Tap the person marker to see:

- Zone (Home / Away / custom zone name)
- Last updated time
- GPS accuracy
- Battery level
- Speed
- Altitude
- Coordinates
- Full address (from geocoded sensor or Nominatim)
- what3words location (///word.word.word, tappable)

-----

## Points of Interest

POI data is fetched from [OpenStreetMap](https://www.openstreetmap.org/) via the [Overpass API](https://overpass-api.de/). Results are cached in `localStorage` for 1 hour — the map loads instantly on repeat visits and continues to show the last known POIs even if the network is slow.

Tapping a POI marker shows:

- Name and category
- Address (from OSM tags)
- Opening hours
- Phone number
- Website (tappable)
- Brand / operator
- Cuisine (for restaurants)
- Wheelchair access
- Distance from the tracked person
- what3words location (///word.word.word, tappable)

-----

## Geocoded Location Sensor

The `geocoded_entity` option is the most reliable way to get a full address including the house number. The HA companion app (iOS and Android) creates this sensor automatically when location permissions are granted — it typically appears as `sensor.<your_name>_geocoded_location` and is the same sensor used by the built-in tile card.

Without this option the card falls back to Nominatim reverse geocoding, which may omit the house number for some residential addresses.

-----

## what3words

Both the person popup and POI popups show a [what3words](https://what3words.com) address — a unique three-word combination identifying a 3 m × 3 m square anywhere on Earth. Tap the ///word.word.word link to open it in the what3words app or website.

No API key is required.

-----

## Privacy

- Map tiles are loaded from [CARTO](https://carto.com/) (based on OpenStreetMap data)
- POI data is fetched from the [Overpass API](https://overpass-api.de/) — only the visible map bounding box is sent, no personal data
- Address fallback uses [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)
- what3words lookups use the [what3words public API](https://developer.what3words.com/) — only coordinates are sent
- POI results are cached in your browser’s `localStorage` only — nothing is sent to any external server beyond the API calls above
- No analytics, no accounts, no tracking

-----

## Requirements

- Home Assistant 2023.1.0 or later
- A `person` entity or device tracker with `latitude` and `longitude` attributes

-----

## License

MIT — see <LICENSE.md>