# Meerkat Map Card

A custom Home Assistant Lovelace card that tracks a person entity on a live OpenStreetMap with an animated location marker, points of interest, what3words locations, and distance calculations.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=meerkat-map-card&category=plugin)

-----

## Features

- **Live person tracking** — animated pulsing marker, colour-coded by zone (green = home, orange = away)
- **Person popup** — tap the marker to see zone, last updated, GPS accuracy, battery, speed, altitude, full address, and what3words location
- **Points of interest** — 12 categories fetched live from OpenStreetMap via Overpass API, cached in localStorage for instant reload
- **POI popup** — tap any POI to see name, address, distance from person, what3words location, opening hours, phone, website, and more
- **Distance measurement** — choose metric (km/m) or imperial (mi/yd) in the visual editor
- **what3words** — tappable `///word.word.word` links in both person and POI popups, opens what3words.com
- **Geocoded address** — link a `sensor.*_geocoded_location` entity (HA companion app) for full address including house number
- **Dark / Light / Auto theme**
- **Full visual editor** — no YAML required
- **iOS & desktop compatible** — works in the HA companion app and all desktop browsers

-----

## Installation

### HACS (recommended)

Click the button above, or:

1. In HACS → Frontend, click the three-dot menu → **Custom repositories**
1. Add `https://github.com/jamesmcginnis/meerkat-map-card` with category **Frontend**
1. Install **Meerkat Map Card**
1. Refresh your browser

> **Note:** HACS requires at least one GitHub release to be published before the install button works. If you see an error, check that a release exists in the repository.

### Manual

1. Download `meerkat-map-card.js` from this repository
1. Copy it to `/config/www/meerkat-map-card.js`
1. In Home Assistant → Settings → Dashboards → Resources, add:
- URL: `/local/meerkat-map-card.js`
- Type: JavaScript module
1. Refresh your browser

-----

## Configuration

The card has a full visual editor — click the pencil icon after adding it to a dashboard. You can also configure it directly in YAML:

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

|Option               |Type  |Default |Description                                                                                                                           |
|---------------------|------|--------|--------------------------------------------------------------------------------------------------------------------------------------|
|`person_entity`      |string|—       |Entity ID of the person or device tracker to display                                                                                  |
|`geocoded_entity`    |string|—       |Optional. HA companion app geocoded location sensor for full address inc. house number (e.g. `sensor.sarahs_iphone_geocoded_location`)|
|`theme`              |string|`dark`  |Map colour scheme: `dark`, `light`, or `auto`                                                                                         |
|`map_height`         |number|`420`   |Height of the map in pixels                                                                                                           |
|`zoom_level`         |number|`15`    |Default zoom level (1–20)                                                                                                             |
|`distance_unit`      |string|`metric`|Distance units in POI popups: `metric` (km/m) or `imperial` (mi/yd)                                                                   |
|`show_train_stations`|bool  |`true`  |🚆 Train stations                                                                                                                      |
|`show_bus_stops`     |bool  |`true`  |🚌 Bus stops                                                                                                                           |
|`show_hospitals`     |bool  |`true`  |🏥 Hospitals                                                                                                                           |
|`show_shops`         |bool  |`false` |🛍️ Shops                                                                                                                               |
|`show_fuel`          |bool  |`false` |⛽ Petrol stations                                                                                                                     |
|`show_post_boxes`    |bool  |`false` |📮 Post boxes                                                                                                                          |
|`show_pharmacies`    |bool  |`false` |💊 Pharmacies                                                                                                                          |
|`show_atms`          |bool  |`false` |🏧 ATMs                                                                                                                                |
|`show_restaurants`   |bool  |`false` |🍴 Restaurants                                                                                                                         |
|`show_supermarkets`  |bool  |`false` |🛒 Supermarkets                                                                                                                        |
|`show_schools`       |bool  |`false` |🏫 Schools                                                                                                                             |
|`show_parks`         |bool  |`false` |🌳 Parks                                                                                                                               |

-----

## Person Popup

Tap the person marker to see:

- Zone name (Home, Away, or a custom zone label)
- Last updated time
- GPS accuracy
- Battery level
- Speed
- Altitude
- Coordinates
- Full address (from geocoded sensor or Nominatim fallback)
- what3words location (tappable ///word.word.word link)

-----

## Points of Interest

POI data is fetched from [OpenStreetMap](https://www.openstreetmap.org/) via the [Overpass API](https://overpass-api.de/). Results are cached in `localStorage` for 1 hour — the map loads instantly on repeat visits and continues showing the last known data even on slow connections.

Tapping a POI marker shows:

- Name and category
- Address (from OSM tags)
- Opening hours
- Phone number
- Website (tappable link)
- Brand / operator
- Cuisine (restaurants)
- Wheelchair access
- Distance from the tracked person
- what3words location (tappable ///word.word.word link)

-----

## Geocoded Location Sensor

The `geocoded_entity` option is the most reliable way to display a full address including the house number. The HA companion app (iOS and Android) creates this sensor automatically when location permissions are granted — it is the same sensor used by the built-in tile card and usually appears as `sensor.<your_name>_geocoded_location`.

Without this option the card falls back to [Nominatim](https://nominatim.openstreetmap.org/) reverse geocoding, which may omit the house number for some residential addresses.

-----

## what3words

Both the person popup and POI popups show a [what3words](https://what3words.com) address — a unique three-word combination identifying a 3 m × 3 m square anywhere on Earth. Tap the ///word.word.word link to open it in the what3words app or website.

No API key is required.

-----

## Privacy

- Map tiles are loaded from [CARTO](https://carto.com/) (OpenStreetMap data)
- POI data is fetched from the [Overpass API](https://overpass-api.de/) — only the visible map bounding box is sent
- Address fallback uses [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)
- what3words lookups use the [what3words public API](https://developer.what3words.com/) — only coordinates are sent
- POI results are cached in your browser’s `localStorage` only
- No analytics, no accounts, no tracking

-----

## Requirements

- Home Assistant 2023.1.0 or later
- A `person` entity or device tracker with `latitude` and `longitude` attributes

-----

## License

MIT — see <LICENSE.md>