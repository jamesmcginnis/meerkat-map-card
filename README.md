# Meerkat Map Card

A custom Home Assistant Lovelace card that tracks a person entity on a live OpenStreetMap with an animated location marker, address lookups, distance calculations, and shared location tracking for people and devices.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=meerkat-map-card&category=plugin)

-----

## Features

- **Live person tracking** — animated pulsing marker, colour-coded by zone (green = home, orange = away)
- **Person popup** — tap the marker to see last updated time, GPS accuracy, battery, full address, and coordinates
- **Sharing** — track additional people, devices, or any GPS entity alongside yourself; each appears as its own marker with its current address and distance from you
- **Distance measurement** — choose metric (km/m), miles with metres (mi/m), or imperial (mi/yd) in the visual editor
- **Geocoded address** — link a `sensor.*_geocoded_location` entity (HA companion app) for full address including house number
- **Dark / Light / Auto theme**
- **Person icon size** — Small, Medium, or Large marker size for the tracked person and shared entities
- **Full visual editor** — no YAML required
- **iOS compatible** — works in the HA companion app on iPhone and iPad

-----

## Installation

### HACS (recommended)

Click the button above, or:

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
1. Refresh your browser

-----

## Configuration

The card has a full visual editor — click the pencil icon after adding it to a dashboard. You can also configure it directly in YAML:

```yaml
type: custom:meerkat-map-card
person_entity: person.sarah
geocoded_entity: sensor.sarahs_iphone_geocoded_location
family_members:
  - person.james
  - device_tracker.sarahs_car
theme: dark
map_height: 420
zoom_level: 15
distance_unit: metric
person_icon_size: medium
```

### Options

| Option              | Type   | Default  | Description                                                                            |
|---------------------|--------|----------|----------------------------------------------------------------------------------------|
| `person_entity`     | string | —        | Entity ID of the person or device tracker to display                                   |
| `geocoded_entity`   | string | —        | Optional. HA companion app geocoded location sensor for full address inc. house number |
| `family_members`    | list   | `[]`     | Additional entities to show on the map — people, device trackers, or anything with GPS |
| `theme`             | string | `dark`   | Map colour scheme: `dark`, `light`, or `auto`                                          |
| `map_height`        | number | `420`    | Height of the map in pixels                                                            |
| `zoom_level`        | number | `15`     | Default zoom level (1–20)                                                              |
| `distance_unit`     | string | `metric` | Distance units: `metric` (km/m), `mixed` (mi/m), or `imperial` (mi/yd)                |
| `person_icon_size`  | string | `medium` | Size of person and shared entity markers: `small`, `medium`, or `large`                |

-----

## Sharing

The **Sharing** section in the visual editor lets you add any Home Assistant entity with GPS coordinates to the map alongside yourself — family members, friends, device trackers, vehicles, or anything else HA can locate.

Each tracked entity appears as a pulsing circular marker, colour-coded by zone status (green = home, orange = away). Tap any marker to see a popup with:

- Last updated time
- GPS accuracy and battery (where available)
- Distance from you
- Current reverse-geocoded address
- Coordinates

Tap your **own** marker to see a **Sharing** section at the bottom of your popup, listing all tracked entities with their current address and distance from you. Tap any row to close the popup and fly the map to that entity's location.

In the editor, the Sharing list shows all entities with GPS coordinates, with a search bar to filter by name or entity ID. Selected entities appear at the top of the list.

-----

## Person Popup

Tap the person marker to see last updated time, GPS accuracy, battery, coordinates, and full address. If you have any entities configured in **Sharing**, a section at the bottom lists each one with its current address and distance from you — tap any row to fly the map to their location.

-----

## Geocoded Location Sensor

The `geocoded_entity` option is the most reliable way to display a full address including the house number. The HA companion app (iOS and Android) creates this sensor automatically when location permissions are granted — it usually appears as `sensor.<your_name>_geocoded_location`.

Without this option the card falls back to [Nominatim](https://nominatim.openstreetmap.org/) reverse geocoding, which may omit the house number for some residential addresses. Nominatim is always used for entities in the Sharing list, since the geocoded sensor only knows your own location.

-----

## Privacy

- Map tiles are loaded from [CARTO](https://carto.com/) (OpenStreetMap data)
- Address lookups use [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)
- No analytics, no accounts, no tracking

-----

## Requirements

- Home Assistant 2023.1.0 or later
- A `person` entity or device tracker with `latitude` and `longitude` attributes

-----

## License

MIT — see LICENSE.md
