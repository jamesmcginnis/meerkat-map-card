# Meerkat Map Card

Track a person entity on a live OpenStreetMap with an animated pulsing marker, points of interest, distance calculations, and full address lookup — all from a single Lovelace card.

## Person tracking

The person marker is colour-coded by zone — green when home, orange when away. Tap it to open a popup showing:

- Zone name (Home, Away, or a custom zone)
- Last updated time
- GPS accuracy, battery, speed, altitude
- Full address (including house number via the HA companion app geocoded sensor)
- Coordinates

## Points of interest

53 POI categories across 7 groups, toggled individually in the visual editor. Data is fetched from OpenStreetMap via Overpass API and cached locally so the map reloads instantly on repeat visits.

> **Note:** It is not recommended to enable too many categories at once. Each enabled category makes a separate network request and enabling several simultaneously will slow down the card, especially on mobile. A small selection of the most useful categories works best.

**Enabled by default:** Train Stations, Bus Stops, Hospitals, Pharmacies, Supermarkets.

Tap any POI marker to see its name, address, opening hours, phone (tap to call), website, and distance from the tracked person.

## Visual editor

All settings are configurable through the built-in visual editor — no YAML required. Options include:

- Person entity and geocoded location sensor
- Map height and default zoom level
- Dark / Light / Auto theme
- Distance units (metric or imperial)
- 53 POI category toggles organised into 7 groups

## Compatibility

Works on desktop browsers and the iOS/Android Home Assistant companion app.
