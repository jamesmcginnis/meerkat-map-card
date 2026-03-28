# Meerkat Map Card

Track a person entity on a live OpenStreetMap with an animated pulsing marker, points of interest, distance calculations, and full address lookup — all from a single Dashboard card.

## Person tracking

The person marker is colour-coded by zone — green when home, orange when away. Tap it to open a popup showing zone name, last updated time, GPS accuracy, battery, speed, altitude, coordinates, and full address.

## Points of interest

53 POI categories across 7 groups, toggled individually in the visual editor. Data is fetched from OpenStreetMap via Overpass API and cached locally so the map reloads instantly on repeat visits without any network request.

> **Note:** Enable only a small number of categories at once, especially on mobile. A small selection of the most useful categories works best.

**Enabled by default:** Train Stations, Bus Stops, Hospitals, Pharmacies, Supermarkets.

Tap any POI marker to see its name, address, opening hours, phone (tap to call), website, and distance from the tracked person.

## POI status ring

A small ring in the bottom-left corner shows the current loading state at all times. It breathes yellow while fetching, pulses green on success, and fades from red back to white on failure. The centre button stops an active fetch or opens a confirmation prompt to force a full reload of the current area.

## iPhone and iPad

The iOS companion app blocks direct requests to external APIs, which prevents points of interest from loading. To fix this, install the free **Home Assistant Web Proxy** integration via HACS (Integrations), then add the following three URL patterns in its configuration:

- `https://overpass-api.de/*`
- `https://overpass.kumi.systems/*`
- `https://maps.mail.ru/*`

The card races all three mirrors simultaneously and uses whichever responds first. No card configuration is needed — it detects the proxy automatically.

See the [README](README.md) for full setup steps.

## Cache settings

The visual editor includes a Cache Settings section where you can:

- Set the **cache duration** — how long POI data is kept before being considered stale. The default of 48 hours is recommended, as POIs like bus stops and hospitals change very rarely.
- **Clear all cached data** — removes all saved POI data from the device immediately.

## Visual editor

All settings are configurable through the built-in visual editor — no YAML required. Options include:

- Person entity and geocoded location sensor
- Map height and default zoom level
- Dark / Light / Auto theme
- Distance units (km/m, mi/m, or mi/yd)
- Cache duration and clear cache button
- 53 POI category toggles organised into 7 groups

## Compatibility

Works on desktop browsers and the iOS/Android Home Assistant companion app. iPhone and iPad require the Home Assistant Web Proxy integration for POI loading (see above).
