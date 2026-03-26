# Meerkat Map Card

A custom Home Assistant Lovelace card that tracks a person entity on a live OpenStreetMap with an animated location marker, address lookups, and distance calculations.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=meerkat-map-card&category=plugin)

---

## Features

- **Live person tracking** — animated pulsing marker, colour-coded by zone (green = home, orange = away)
- **Person popup** — tap the marker to see zone, last updated, GPS accuracy, battery, speed, altitude, full address, and coordinates
- **Points of interest** — 53 categories across 7 groups, fetched from OpenStreetMap via Overpass API, cached in localStorage
- **POI popup** — tap any POI to see name, address, distance from person, opening hours, phone (tappable to call), website (icon clickable), and more
- **Distance measurement** — choose metric (km/m) or imperial (mi/yd) in the visual editor
- **Geocoded address** — link a `sensor.*_geocoded_location` entity (HA companion app) for full address including house number
- **Dark / Light / Auto theme**
- **Full visual editor** — no YAML required
- **iOS & desktop compatible** — works in the HA companion app and all desktop browsers

---

## Installation

### HACS (recommended)

Click the button above, or:

1. In HACS → Frontend, click the three-dot menu → **Custom repositories**
2. Add `https://github.com/jamesmcginnis/meerkat-map-card` with category **Frontend**
3. Install **Meerkat Map Card**
4. Refresh your browser

> **Note:** HACS requires at least one GitHub release to be published before the install button works. If you see an error, check that a release exists in the repository.

### Manual

1. Download `meerkat-map-card.js` from this repository
2. Copy it to `/config/www/meerkat-map-card.js`
3. In Home Assistant → Settings → Dashboards → Resources, add:
   - URL: `/local/meerkat-map-card.js`
   - Type: JavaScript module
4. Refresh your browser

---

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
# Only a few POI categories are enabled by default — see note below
show_train_stations: true
show_bus_stops: true
show_hospitals: true
show_pharmacies: true
show_supermarkets: true
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `person_entity` | string | — | Entity ID of the person or device tracker to display |
| `geocoded_entity` | string | — | Optional. HA companion app geocoded location sensor for full address inc. house number (e.g. `sensor.sarahs_iphone_geocoded_location`) |
| `theme` | string | `dark` | Map colour scheme: `dark`, `light`, or `auto` |
| `map_height` | number | `420` | Height of the map in pixels |
| `zoom_level` | number | `15` | Default zoom level (1–20) |
| `distance_unit` | string | `metric` | Distance units in POI popups: `metric` (km/m) or `imperial` (mi/yd) |

For a full list of the 53 POI `show_*` keys, see the visual editor — all categories are listed there with toggles.

---

## Points of Interest

> ⚠️ **Performance note:** It is not recommended to enable too many POI categories at once, especially on mobile. Each enabled category makes a separate network request to the Overpass API. Enabling many categories simultaneously will slow down the card significantly and may cause some categories to fail to load. Stick to a small number of the most useful categories for the best experience.

POI data is fetched from [OpenStreetMap](https://www.openstreetmap.org/) via the [Overpass API](https://overpass-api.de/). Results are cached in `localStorage` for 1 hour — after the first load, the map reloads instantly from cache on subsequent visits.

The 53 categories are organised into 7 groups in the visual editor:

- **Food & Drink** — Restaurants, Cafés, Pubs, Bars, Fast Food, Ice Cream
- **Shops & Services** — Supermarkets, Shops, Bakeries, Hairdressers, Post Offices, Post Boxes
- **Transport** — Train Stations, Bus Stops, Petrol Stations, Car Parks, EV Charging, Bike Parking, Taxi, Ferry
- **Health & Emergency** — Hospitals, Pharmacies, Doctors, Dentists, Vets, Police, Fire Stations
- **Finance** — ATMs, Banks, Currency Exchange
- **Education & Culture** — Schools, Colleges, Universities, Libraries, Theatres, Cinemas, Museums, Arts Centres, Places of Worship, Community Centres
- **Recreation** — Parks, Playgrounds, Sports Centres, Swimming Pools, Golf, Hotels, Attractions, Viewpoints, Campsites
- **Utilities & Environment** — Toilets, Drinking Water, Benches, Recycling

Tapping a POI marker shows its name, address, opening hours, phone number (tap to call), website (tap icon or link to open), brand, distance from the tracked person, and more.

**Enabled by default:** Train Stations, Bus Stops, Hospitals, Pharmacies, Supermarkets.

---

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

---

## Geocoded Location Sensor

The `geocoded_entity` option is the most reliable way to display a full address including the house number. The HA companion app (iOS and Android) creates this sensor automatically when location permissions are granted — it is the same sensor used by the built-in tile card and usually appears as `sensor.<your_name>_geocoded_location`.

Without this option the card falls back to [Nominatim](https://nominatim.openstreetmap.org/) reverse geocoding, which may omit the house number for some residential addresses.

---

## Privacy

- Map tiles are loaded from [CARTO](https://carto.com/) (OpenStreetMap data)
- POI data is fetched from the [Overpass API](https://overpass-api.de/) — only the visible map bounding box is sent
- Address fallback uses [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)
- POI results are cached in your browser's `localStorage` only
- No analytics, no accounts, no tracking

---

## Requirements

- Home Assistant 2023.1.0 or later
- A `person` entity or device tracker with `latitude` and `longitude` attributes

---

## License

MIT — see [LICENSE.md](LICENSE.md)
