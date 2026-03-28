# Meerkat Map Card

A custom Home Assistant Lovelace card that tracks a person entity on a live OpenStreetMap with an animated location marker, address lookups, and distance calculations.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=meerkat-map-card&category=plugin)

-----

## Features

- **Live person tracking** — animated pulsing marker, colour-coded by zone (green = home, orange = away)
- **Person popup** — tap the marker to see zone, last updated, GPS accuracy, battery, speed, altitude, full address, and coordinates
- **Points of interest** — 53 categories across 7 groups, fetched from OpenStreetMap via Overpass API
- **Smart POI caching** — results cached for a configurable duration (default 48 hours); revisiting a location loads instantly from cache with no network request
- **POI status ring** — always-visible indicator showing loading, success, and error states with a centre button to stop or refresh
- **POI popup** — tap any POI to see name, address, distance from person, opening hours, phone (tappable to call), website (icon clickable), and more
- **Distance measurement** — choose metric (km/m), miles with metres (mi/m), or imperial (mi/yd) in the visual editor
- **Geocoded address** — link a `sensor.*_geocoded_location` entity (HA companion app) for full address including house number
- **Dark / Light / Auto theme**
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

To fix this, install the **Home Assistant Web Proxy** integration. It routes Overpass requests through your HA server so the browser never touches external APIs directly. The card detects it automatically — no card configuration needed.

### Step 1 — Install the proxy integration via HACS

1. In HACS → **Integrations** (not Frontend), click the three-dot menu → **Custom repositories**
1. Add `https://github.com/dermotduffy/hass-web-proxy-integration` with category **Integration**
1. Install **Home Assistant Web Proxy**
1. Restart Home Assistant

### Step 2 — Add the Overpass URL patterns

The card races three Overpass mirrors simultaneously and uses whichever responds first. Add all three for the fastest possible load times:

1. Settings → Devices & Services → find **Home Assistant Web Proxy** → **Configure**
1. Click **+ ADD** and enter `https://overpass-api.de/*`
1. Click **+ ADD** again and enter `https://overpass.kumi.systems/*`
1. Click **+ ADD** again and enter `https://maps.mail.ru/*`
1. Click **Save**

No restart needed after step 2. The card automatically uses the proxy on iOS and falls back to direct connections on desktop.

> **Why three mirrors?** Each is an independent Overpass server in a different location. Racing them simultaneously means the card always uses whichever is fastest at that moment.

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
cache_ttl_hours: 48
show_train_stations: true
show_bus_stops: true
show_hospitals: true
show_pharmacies: true
show_supermarkets: true
```

### Options

|Option           |Type  |Default |Description                                                                           |
|-----------------|------|--------|--------------------------------------------------------------------------------------|
|`person_entity`  |string|—       |Entity ID of the person or device tracker to display                                  |
|`geocoded_entity`|string|—       |Optional. HA companion app geocoded location sensor for full address inc. house number|
|`theme`          |string|`dark`  |Map colour scheme: `dark`, `light`, or `auto`                                         |
|`map_height`     |number|`420`   |Height of the map in pixels                                                           |
|`zoom_level`     |number|`15`    |Default zoom level (1–20)                                                             |
|`distance_unit`  |string|`metric`|Distance units: `metric` (km/m), `mixed` (mi/m), or `imperial` (mi/yd)                |
|`cache_ttl_hours`|number|`48`    |How long POI data is cached before a refresh is needed (hours)                        |

For a full list of the 53 POI `show_*` keys, see the visual editor.

-----

## Points of Interest

> ⚠️ **Performance note:** Enable only a small number of POI categories at once, especially on mobile. Each batch of up to 5 categories uses one network request — enabling more increases load time.

POI data is fetched from [OpenStreetMap](https://www.openstreetmap.org/) via the [Overpass API](https://overpass-api.de/) and cached locally. Returning to a location you have visited before loads instantly from cache with no network request and no loading indicator. The cache duration is configurable in the visual editor (default 48 hours — recommended).

The card includes several optimisations to minimise load time:

- Up to 5 categories are batched into a single network request
- Three Overpass mirrors are raced simultaneously — the fastest response wins
- Each mirror has a 20-second timeout so a slow server never blocks the others
- A 25% expanded area is fetched on first load so short pans are already cached
- Zooming in never triggers a refetch — the data is already loaded
- A 2.5-second pause after panning avoids wasted fetches mid-drag
- Panning to a new area cancels in-flight requests for the old location
- Navigating away and returning never triggers a refetch if data is already cached

The 53 categories are organised into 7 groups in the visual editor:

- **Food & Drink** — Restaurants, Cafés, Pubs, Bars, Fast Food, Ice Cream
- **Shops & Services** — Supermarkets, Shops, Bakeries, Hairdressers, Post Offices, Post Boxes
- **Transport** — Train Stations, Bus Stops, Petrol Stations, Car Parks, EV Charging, Bike Parking, Taxi, Ferry
- **Health & Emergency** — Hospitals, Pharmacies, Doctors, Dentists, Vets, Police, Fire Stations
- **Finance** — ATMs, Banks, Currency Exchange
- **Education & Culture** — Schools, Colleges, Universities, Libraries, Theatres, Cinemas, Museums, Arts Centres, Places of Worship, Community Centres
- **Recreation** — Parks, Playgrounds, Sports Centres, Swimming Pools, Golf, Hotels, Attractions, Viewpoints, Campsites
- **Utilities & Environment** — Toilets, Drinking Water, Benches, Recycling

**Enabled by default:** Train Stations, Bus Stops, Hospitals, Pharmacies, Supermarkets.

-----

## POI Status Ring

A small ring in the bottom-left corner of the map shows the current state of POI data loading:

|State      |Colour             |Meaning                                      |
|-----------|-------------------|---------------------------------------------|
|**Idle**   |White              |Data loaded and up to date                   |
|**Loading**|Yellow, breathing  |Fetching data from Overpass                  |
|**Success**|Green, pulsing     |Data loaded successfully                     |
|**Error**  |Red, fades to white|Fetch failed — tap the centre button to retry|

The centre button changes depending on state — a stop icon while loading, a refresh icon otherwise. Tapping the refresh button shows a confirmation prompt before clearing the cache and reloading.

-----

## Cache Settings

The visual editor includes a **Cache Settings** section with two options:

**Cache Duration** — controls how long POI data is kept before the card considers it stale. Options range from 6 hours to 1 week. The default of 48 hours is recommended: POIs like bus stops, hospitals, and shops change very rarely, so there is no benefit to fetching them more frequently.

**Clear All Cached POI Data** — removes all saved POI data from the device immediately. Useful if you notice outdated information on the map.

-----

## Person Popup

Tap the person marker to see zone name, last updated time, GPS accuracy, battery, speed, altitude, coordinates, and full address.

-----

## Geocoded Location Sensor

The `geocoded_entity` option is the most reliable way to display a full address including the house number. The HA companion app (iOS and Android) creates this sensor automatically when location permissions are granted — it usually appears as `sensor.<your_name>_geocoded_location`.

Without this option the card falls back to [Nominatim](https://nominatim.openstreetmap.org/) reverse geocoding, which may omit the house number for some residential addresses.

-----

## Privacy

- Map tiles are loaded from [CARTO](https://carto.com/) (OpenStreetMap data)
- POI data is fetched from the [Overpass API](https://overpass-api.de/) and two public mirrors — only the visible map bounding box is sent, no personal data
- Address fallback uses [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)
- POI results are cached in your browser’s `localStorage` only — nothing is sent to any third party beyond the API calls above
- No analytics, no accounts, no tracking

-----

## Requirements

- Home Assistant 2023.1.0 or later
- A `person` entity or device tracker with `latitude` and `longitude` attributes
- For POI loading on iPhone and iPad: [Home Assistant Web Proxy](https://github.com/dermotduffy/hass-web-proxy-integration) (free HACS integration)

-----

## License

MIT — see <LICENSE.md>