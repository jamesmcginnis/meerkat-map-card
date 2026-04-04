# Meerkat Map Card

A custom Home Assistant Lovelace card that tracks a person entity on a live OpenStreetMap with an animated location marker, address lookups, distance calculations, and shared location tracking for people and devices.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=meerkat-map-card&category=plugin)

-----

## Features

- **Live person tracking** — animated pulsing marker, colour-coded by zone (green = home, orange = away)
- **Person popup** — tap the marker to see last updated time, GPS accuracy, battery, full address, and coordinates
- **Sharing** — track additional people, devices, or any GPS entity alongside yourself; each appears as its own marker with its current address and distance from you
- **Points of interest** — 53 categories across 8 groups, fetched from OpenStreetMap via Overpass API
- **Persistent POI caching** — all fetched POIs accumulate across every area you visit; panning and zooming never causes previously loaded markers to disappear, and revisiting any location restores markers instantly from cache with no network request
- **POI status ring** — always-visible indicator showing loading, success, and error states with a centre button to stop or refresh
- **POI popup** — tap any POI to see name, category, address, distance from person, opening hours, phone (tap to call — a styled confirmation sheet appears before dialling), website (icon clickable), and any available extra details such as cuisine, wheelchair access, fees, operator, brand, and network
- **Distance measurement** — choose metric (km/m), miles with metres (mi/m), or imperial (mi/yd) in the visual editor
- **Geocoded address** — link a `sensor.*_geocoded_location` entity (HA companion app) for full address including house number
- **Dark / Light / Auto theme**
- **POI icon size** — Small, Medium, or Large marker size for POIs
- **Person icon size** — Small, Medium, or Large marker size for the tracked person and shared entities
- **POI quick-select** — tap the map pin button on the map to toggle points of interest directly without opening the editor
- **Full visual editor** — no YAML required
- **iOS compatible** — works in the HA companion app on iPhone and iPad with the proxy integration (see below)

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

## iOS Setup — Points of Interest

> ⚠️ **iPhone and iPad users:** The iOS Home Assistant companion app blocks direct requests to external APIs including the Overpass API used for POI data. Without the steps below, points of interest will not load on any iPhone or iPad that does not already have them cached.

To fix this, install the **Home Assistant Web Proxy** integration. It routes Overpass requests through your HA server so the browser never touches external APIs directly. The card always tries the proxy first on all platforms — if it is not installed or unreachable, the card falls back to direct connections automatically. No card configuration is needed.

### Step 1 — Install the proxy integration via HACS

1. In HACS → **Integrations** (not Frontend), click the three-dot menu → **Custom repositories**
1. Add `https://github.com/dermotduffy/hass-web-proxy-integration` with category **Integration**
1. Install **Home Assistant Web Proxy**
1. Restart Home Assistant

### Step 2 — Add the Overpass URL patterns

The card races all three Overpass mirrors simultaneously through the proxy and uses whichever responds first. Add all three for the fastest possible load times:

1. Settings → Devices & Services → find **Home Assistant Web Proxy** → **Configure**
1. Click **+ ADD** and enter `https://overpass-api.de/*`
1. Click **+ ADD** again and enter `https://overpass.kumi.systems/*`
1. Click **+ ADD** again and enter `https://maps.mail.ru/*`
1. Click **Save**

No restart needed after step 2.

> **Why three mirrors?** Each is an independent Overpass server in a different location. Racing them simultaneously means the card always uses whichever is fastest at that moment.

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
cache_ttl_hours: 48
poi_icon_size: medium
person_icon_size: medium
show_train_stations: true
show_bus_stops: true
show_hospitals: true
show_pharmacies: true
show_supermarkets: true
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
| `cache_ttl_hours`   | number | `48`     | How long POI data is cached before a refresh is needed (hours)                         |
| `poi_icon_size`     | string | `medium` | Size of POI markers: `small`, `medium`, or `large`                                     |
| `person_icon_size`  | string | `medium` | Size of person and shared entity markers: `small`, `medium`, or `large`                |

For a full list of the 53 POI `show_*` keys, see the visual editor.

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

## Points of Interest

> ⚠️ **Performance note:** Enable only a small number of POI categories at once, especially on mobile. Each batch of up to 5 categories uses one network request — enabling more increases load time.

POI data is fetched from [OpenStreetMap](https://www.openstreetmap.org/) via the [Overpass API](https://overpass-api.de/) and stored in a persistent local cache. The cache is cumulative — every POI fetched across every area you visit is accumulated and never discarded when you pan or zoom. Returning to any previously visited location restores all markers instantly from cache with no network request and no loading indicator. The cache duration is configurable in the visual editor (default 48 hours — recommended).

The card includes several optimisations to minimise load time and network usage:

- All fetched POIs accumulate in a global cache across the entire session — panning and zooming never causes markers to disappear
- Up to 5 categories are batched into a single network request
- Three Overpass mirrors are raced simultaneously — the fastest response wins
- Each mirror has a 20-second timeout so a slow server never blocks the others
- A 25% expanded area is fetched on first load so short pans are already cached
- Zooming in never triggers a refetch — the data is already loaded
- A 2.5-second pause after panning avoids wasted fetches mid-drag
- Panning to a new area cancels any in-flight requests for the old location
- Navigating away and returning restores all markers instantly from cache

The 53 categories are organised into 8 groups in the visual editor:

- **Food & Drink** — Restaurants, Cafés, Pubs, Bars, Fast Food, Ice Cream
- **Shops & Services** — Supermarkets, Shops, Bakeries, Hairdressers, Post Offices, Post Boxes
- **Transport** — Train Stations, Bus Stops, Petrol Stations, Car Parks, EV Charging, Bike Parking, Taxi Ranks, Ferry Terminals
- **Health & Emergency** — Hospitals, Pharmacies, Doctors / GPs, Dentists, Vets, Police Stations, Fire Stations
- **Finance** — ATMs, Banks, Currency Exchange
- **Education & Culture** — Schools, Colleges, Universities, Libraries, Theatres, Cinemas, Museums, Arts Centres, Places of Worship, Community Centres
- **Recreation** — Parks, Playgrounds, Sports Centres, Swimming Pools, Golf Courses, Hotels, Attractions, Viewpoints, Campsites
- **Utilities & Environment** — Toilets, Drinking Water, Benches, Recycling

**Enabled by default:** Train Stations, Bus Stops, Hospitals, Pharmacies, Supermarkets.

-----

## POI Status Ring

A small ring in the bottom-left corner of the map shows the current state of POI data loading:

| State       | Colour            | Meaning                                       |
|-------------|-------------------|-----------------------------------------------|
| **Idle**    | White             | Data loaded and up to date                    |
| **Loading** | Yellow, breathing | Fetching data from Overpass                   |
| **Success** | Green, pulsing    | Data loaded successfully                      |
| **Error**   | Red, fades to white | Fetch failed — tap the centre button to retry |

The centre button changes depending on state — a stop icon while loading, a refresh icon otherwise. Tapping the refresh button shows a confirmation prompt; confirming clears the entire local POI cache and downloads fresh data from OpenStreetMap.

-----

## Cache Settings

The visual editor includes a **Cache Settings** section with two options:

**Cache Duration** — controls how long POI data is kept before the card considers it stale. Options range from 6 hours to 3 months. The default of 48 hours is recommended: POIs like bus stops, hospitals, and shops change very rarely, so there is no benefit to fetching them more frequently.

**Clear All Cached POI Data** — removes all saved POI data from the device immediately. The current cache size is shown directly below the button (e.g. *184.3 KB across 12 stored regions*) so you can see exactly how much is stored before clearing.

-----

## Person Popup

Tap the person marker to see last updated time, GPS accuracy, battery, coordinates, and full address. If you have any entities configured in **Sharing**, a section at the bottom lists each one with its current address and distance from you — tap any row to fly the map to their location.

-----

## POI Popup

Tap any POI marker to open a popup showing all available information from OpenStreetMap, including:

- Name and category
- Address
- Distance from the tracked person
- Opening hours
- Phone number — tap to open a confirmation sheet, then call directly
- Website — tap the icon in the header to open in a new tab
- Cuisine type, wheelchair access, fees, operator, brand, network, and reference where available
- Coordinates

-----

## Geocoded Location Sensor

The `geocoded_entity` option is the most reliable way to display a full address including the house number. The HA companion app (iOS and Android) creates this sensor automatically when location permissions are granted — it usually appears as `sensor.<your_name>_geocoded_location`.

Without this option the card falls back to [Nominatim](https://nominatim.openstreetmap.org/) reverse geocoding, which may omit the house number for some residential addresses. Nominatim is always used for entities in the Sharing list, since the geocoded sensor only knows your own location.

-----

## Privacy

- Map tiles are loaded from [CARTO](https://carto.com/) (OpenStreetMap data)
- POI data is fetched from the [Overpass API](https://overpass-api.de/) and two public mirrors — only the visible map bounding box is sent, no personal data
- Address fallback uses [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)
- POI results are cached in your browser's `localStorage` only — nothing is sent to any third party beyond the API calls above
- No analytics, no accounts, no tracking

-----

## Requirements

- Home Assistant 2023.1.0 or later
- A `person` entity or device tracker with `latitude` and `longitude` attributes
- For POI loading on iPhone and iPad: [Home Assistant Web Proxy](https://github.com/dermotduffy/hass-web-proxy-integration) (free HACS integration)

-----

## License

MIT — see <LICENSE.md>
