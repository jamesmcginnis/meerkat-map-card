# Meerkat Map Card

Track a person entity on a live OpenStreetMap with an animated pulsing marker, distance calculations, full address lookup, and shared location tracking — all from a single Lovelace card.

## Person tracking

The person marker is colour-coded by zone — green when home, orange when away. Tap it to open a popup showing last updated time, GPS accuracy, battery, coordinates, and full address.

## Sharing

Add any entity with GPS coordinates to the map alongside yourself — people, device trackers, phones, cars, or anything else Home Assistant can locate. Each shared entity appears as its own pulsing marker, colour-coded by zone status.

Tap your own marker to see a **Sharing** section listing all tracked entities with their current address and distance from you. Tap any row to close the popup and fly the map directly to that entity's location.

Tap a tracked entity's marker directly to see its own popup with last updated time, GPS accuracy, battery, distance from you, coordinates, and a reverse-geocoded address.

Configure shared entities in the **Sharing** section of the visual editor — it lists all entities with GPS coordinates and lets you toggle them on with a search filter to find them quickly.

## Visual editor

All settings are configurable through the built-in visual editor — no YAML required. Options include:

- Person entity and geocoded location sensor
- Sharing — add people, devices or any GPS entity to track alongside yourself
- Map height and default zoom level
- Dark / Light / Auto theme
- Distance units (km/m, mi/m, or mi/yd)
- Person icon size (Small / Medium / Large)

## Compatibility

Works on desktop browsers and the iOS/Android Home Assistant companion app.
