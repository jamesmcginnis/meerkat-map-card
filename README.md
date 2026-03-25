<div align="center">

# Meerkat Map Card

WORK IN PROGRESS, NOTHING WORKS YET

**An interactive OpenStreetMap card for Home Assistant**  
Track people, explore points of interest, and open street-level imagery — all from your dashboard.

<br/>

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=meerkat-map-card&category=plugin)

<br/>

![Map view](https://raw.githubusercontent.com/jamesmcginnis/meerkat-map-card/main/preview1.png)

<p>
  <img src="https://raw.githubusercontent.com/jamesmcginnis/meerkat-map-card/main/preview2.png" alt="Person info popup" width="48%" />
  &nbsp;
  <img src="https://raw.githubusercontent.com/jamesmcginnis/meerkat-map-card/main/preview3.png" alt="POI popup" width="48%" />
</p>

<p>
  <img src="https://raw.githubusercontent.com/jamesmcginnis/meerkat-map-card/main/preview4.png" alt="Street view" width="48%" />
  &nbsp;
  <img src="https://raw.githubusercontent.com/jamesmcginnis/meerkat-map-card/main/preview5.png" alt="Visual editor" width="48%" />
</p>

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗺️ **OpenStreetMap** | Dark, Light, or system-auto tile themes via CartoDB |
| 👤 **Person marker** | Entity picture in a pulsing animated circle with colour-coded zone ring |
| 💬 **Info popup** | Tap to see zone, reverse-geocoded address, battery, GPS accuracy, speed & altitude |
| 🌍 **Street view** | Long-press the marker to open interactive Mapillary street-level imagery |
| 📍 **POI overlays** | 12 categories — shops, petrol stations, post boxes, transport, hospitals & more |
| ⚙️ **Visual editor** | Auto-detects person entities; full configuration without editing YAML |
| 🏠 **Home button** | MDI home icon returns the map view to the tracked person |

---

## 🚀 Installation

### Via HACS (Recommended)

1. Click the button below to open HACS and add this repository:

<div align="center">

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=meerkat-map-card&category=plugin)

</div>

2. Search for **Meerkat Map Card** and click **Download**
3. Reload your browser
4. Add the card to a dashboard — the visual editor will auto-detect your person entities

### Manual Installation

1. Download [`meerkat-map-card.js`](https://github.com/jamesmcginnis/meerkat-map-card/releases/latest) from the latest release
2. Copy it to `/config/www/meerkat-map-card.js`
3. Go to **Settings → Dashboards → Resources** and add:
   - **URL:** `/local/meerkat-map-card.js`
   - **Type:** JavaScript Module
4. Reload your browser

---

## ⚙️ Configuration

All options are available via the **visual editor** in the dashboard UI. Below is the full YAML reference:

```yaml
type: custom:meerkat-map-card

# Required
person_entity: person.james

# Map
map_height: 420          # Height of the map in pixels (default: 420)
zoom_level: 15           # Default zoom level 5–20 (default: 15)
theme: dark              # dark | light | auto (default: dark)
accent_color: '#007AFF'  # Hex colour for rings, buttons & highlights

# Street View
mapillary_token: 'MLY|...'  # Free token from mapillary.com/developer

# Points of Interest
show_shops: false
show_fuel: false
show_post_boxes: false
show_train_stations: true
show_bus_stops: true
show_hospitals: true
show_pharmacies: false
show_atms: false
show_restaurants: false
show_supermarkets: false
show_schools: false
show_parks: false
```

---

## 🗺️ Points of Interest

POI data is fetched live from [OpenStreetMap](https://www.openstreetmap.org) via the [Overpass API](https://overpass-api.de). Tapping any marker shows a popup with all available details.

| Toggle | Category | Data source tag |
|---|---|---|
| `show_shops` | 🛍️ Shops | `shop=*` |
| `show_fuel` | ⛽ Petrol Stations | `amenity=fuel` |
| `show_post_boxes` | 📮 Post Boxes | `amenity=post_box` |
| `show_train_stations` | 🚆 Train Stations | `railway=station` |
| `show_bus_stops` | 🚌 Bus Stops | `highway=bus_stop` |
| `show_hospitals` | 🏥 Hospitals | `amenity=hospital` |
| `show_pharmacies` | 💊 Pharmacies | `amenity=pharmacy` |
| `show_atms` | 🏧 ATMs | `amenity=atm` |
| `show_restaurants` | 🍴 Restaurants | `amenity=restaurant` |
| `show_supermarkets` | 🛒 Supermarkets | `shop=supermarket` |
| `show_schools` | 🏫 Schools | `amenity=school` |
| `show_parks` | 🌳 Parks | `leisure=park` |

---

## 🌍 Street View

Long-press the person marker on the map to open an interactive **Mapillary** street view panel. You can look around, navigate through nearby imagery using the thumbnail strip at the bottom, and close back to the map with the ✕ button.

A free Mapillary access token is required. Get one at [mapillary.com/developer](https://www.mapillary.com/developer) — create an application and copy the **Client Token**.

---

## 📋 Requirements

- Home Assistant **2023.1.0** or later
- A `person.*` entity **or** any entity with `latitude` and `longitude` attributes  
  *(e.g. `device_tracker.*` from the Google Maps, Life360, or OwnTracks integrations)*
- *(Optional)* Free [Mapillary access token](https://www.mapillary.com/developer) for street view

---

## 🔒 Privacy

- Map tiles are loaded from [CartoDB](https://carto.com) (OpenStreetMap data)
- POI data is fetched from [overpass-api.de](https://overpass-api.de) — only the current map bounding box is sent
- Reverse geocoding uses [Nominatim](https://nominatim.openstreetmap.org) (OpenStreetMap) — only GPS coordinates are sent
- Street view imagery is from [Mapillary](https://www.mapillary.com) — your access token is stored in the card config only
- No analytics, no tracking, no external data collection

---

## 🤝 Contributing

Pull requests and issues are welcome! Please open an issue first for major changes.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push and open a pull request

---

## 📄 Licence

This project is licensed under the **MIT Licence** — see the [LICENSE](https://github.com/jamesmcginnis/meerkat-map-card/blob/main/LICENSE.md) file for details.

---

<div align="center">Made with ❤️ for the Home Assistant community</div>
