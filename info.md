![preview](preview1.png)

# Meerkat Map Card

Track a person entity on a live OpenStreetMap with an animated pulsing marker, 12 categories of points of interest, what3words locations, distance calculations, and full address lookup — all from a single Lovelace card.

## Person tracking

The person marker is colour-coded by zone — green when home, orange when away. Tap it to open a popup showing:

- Zone name (Home, Away, or a custom zone)
- Last updated time
- GPS accuracy, battery, speed, altitude
- Full address (including house number via the HA companion app geocoded sensor)
- what3words location — tap the ///word.word.word link to open in the what3words app

## Points of interest

Toggle up to 12 POI categories in the visual editor. Data is fetched live from OpenStreetMap via Overpass API and cached locally so the map loads instantly on repeat visits.

Categories: 🛍️ Shops · ⛽ Petrol Stations · 📮 Post Boxes · 🚆 Train Stations · 🚌 Bus Stops · 🏥 Hospitals · 💊 Pharmacies · 🏧 ATMs · 🍴 Restaurants · 🛒 Supermarkets · 🏫 Schools · 🌳 Parks

Tap any POI marker to see its name, address, opening hours, phone, website, distance from the tracked person, and what3words location.

## Visual editor

All settings are configurable through the built-in visual editor — no YAML required. Options include:

- Person entity and geocoded location sensor
- Map height and default zoom level
- Dark / Light / Auto theme
- Distance units (metric or imperial)
- Individual POI category toggles

## Compatibility

Works on desktop browsers and the iOS/Android Home Assistant companion app.