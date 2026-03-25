# Meerkat Map Card

An interactive OpenStreetMap card for Home Assistant with real-time person tracking, points of interest overlays, detailed info popups, and Mapillary street view.

![Map view](https://raw.githubusercontent.com/jamesmcginnis/meerkat-map-card/main/preview1.png)

---

## Features

- 🗺️ **Live OpenStreetMap** — Dark, Light, or Auto theme
- 👤 **Person tracking** — Entity picture on a pulsing ring marker
- 💬 **Info popup** — Zone, address, battery, GPS accuracy, speed & more
- 🌍 **Street view** — Long-press the marker to open Mapillary street view
- 📍 **POI overlays** — Shops, petrol stations, hospitals, transport & more
- ⚙️ **Visual editor** — Auto-detects person entities, full HACS UI configuration

---

## Requirements

- Home Assistant **2023.1.0** or later
- A `person.*` entity **or** any entity with `latitude` / `longitude` attributes
- *(Optional)* A free [Mapillary access token](https://www.mapillary.com/developer) for street view

---

## Quick start

After installing via HACS, add the card to a dashboard and select your person entity in the visual editor. All map data is fetched live — no additional integrations required.
