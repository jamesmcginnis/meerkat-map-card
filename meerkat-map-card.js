/**
 * Meerkat Map Card
 * Home Assistant custom card — OpenStreetMap with person tracking,
 * POI overlays and info popups.
 *
 * Repository: https://github.com/jamesmcginnis/meerkat-map-card
 */

// ── Library Loader ─────────────────────────────────────────────────
const _mmCache = {};
function _mmScript(url) {
  if (_mmCache[url]) return _mmCache[url];
  _mmCache[url] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return _mmCache[url];
}
// Fetch CSS text so it can be injected directly into a shadow root
const _mmCSSText = {};
async function _mmFetchCSS(url) {
  if (_mmCSSText[url]) return _mmCSSText[url];
  const r = await fetch(url);
  const text = await r.text();
  _mmCSSText[url] = text;
  return text;
}

// ── POI Category Definitions ───────────────────────────────────────
const MM_POI_GROUPS = [
  {
    label: 'Food & Drink',
    pois: [
      { key: 'show_restaurants',    label: 'Restaurants',       emoji: '🍴',  color: '#FF6B6B', overpass: 'nwr["amenity"="restaurant"]',      icon: 'M11,9H9V2H7V9H5V2H3V9C3,11.12 4.66,12.84 6.75,12.97V22H9.25V12.97C11.34,12.84 13,11.12 13,9V2H11V9M16,6V14H18.5V22H21V2C18.24,2 16,4.24 16,6Z' },
      { key: 'show_cafes',          label: 'Cafés',             emoji: '☕',  color: '#A2845E', overpass: 'nwr["amenity"="cafe"]',             icon: 'M2,21H20V19H2M20,8H18V5H20M20,3H4V13A4,4 0 0,0 8,17H14A4,4 0 0,0 18,13V11H20A2,2 0 0,0 22,9V5C22,3.89 21.1,3 20,3Z' },
      { key: 'show_pubs',           label: 'Pubs',              emoji: '🍺',  color: '#F4A828', overpass: 'nwr["amenity"="pub"]',              icon: 'M4,5H8V4A2,2 0 0,1 10,2H14A2,2 0 0,1 16,4V5H20A1,1 0 0,1 21,6V7A3,3 0 0,1 18,10V19A2,2 0 0,1 16,21H8A2,2 0 0,1 6,19V10A3,3 0 0,1 3,7V6A1,1 0 0,1 4,5Z' },
      { key: 'show_bars',           label: 'Bars',              emoji: '🍸',  color: '#BF5AF2', overpass: 'nwr["amenity"="bar"]',              icon: 'M7,3L6,5H18L17,3H7M6.5,7L12,15V21H10V15L4.5,7H6.5M19.5,7H17.5L12,15V13L15,8.5L14,7H19.5Z' },
      { key: 'show_fast_food',      label: 'Fast Food',         emoji: '🍔',  color: '#FF9500', overpass: 'nwr["amenity"="fast_food"]',        icon: 'M18.06,3.89C18.74,4.57 18.84,5.58 18.36,6.39L15,12H19A1,1 0 0,1 20,13L20.03,13.5A7.65,7.65 0 0,1 12.4,21H8A6,6 0 0,1 2,15V14A1,1 0 0,1 3,13H6.34C6.1,12.42 6,11.79 6,11.13C6,9.45 6.78,7.91 8.05,6.87C8.93,5.66 10.5,5 12,5C13.06,5 14.09,5.35 14.94,6C15.37,5.33 16.04,4.86 16.82,4.74C17.27,4.66 17.73,4.18 18.06,3.89Z' },
      { key: 'show_ice_cream',      label: 'Ice Cream',         emoji: '🍦',  color: '#FF9EC0', overpass: 'nwr["amenity"="ice_cream"]',        icon: 'M12,2A5,5 0 0,1 17,7C17,8.38 16.5,9.65 15.67,10.63L12,22L8.33,10.63C7.5,9.65 7,8.38 7,7A5,5 0 0,1 12,2Z' },
    ]
  },
  {
    label: 'Shops & Services',
    pois: [
      { key: 'show_supermarkets',   label: 'Supermarkets',      emoji: '🛒',  color: '#30D158', overpass: 'nwr["shop"="supermarket"]',        icon: 'M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M7,4V8H17V4H7M16,10A1,1 0 0,0 15,11A1,1 0 0,0 16,12A1,1 0 0,0 17,11A1,1 0 0,0 16,10M8,11A1,1 0 0,0 9,12A1,1 0 0,0 10,11A1,1 0 0,0 9,10A1,1 0 0,0 8,11M12,10A1,1 0 0,0 11,11A1,1 0 0,0 12,12A1,1 0 0,0 13,11A1,1 0 0,0 12,10Z' },
      { key: 'show_shops',          label: 'Shops',             emoji: '🛍️',  color: '#FF9500', overpass: 'nwr["shop"]',                      icon: 'M19,6H17C17,3.24 14.76,1 12,1C9.24,1 7,3.24 7,6H5C3.9,6 3,6.9 3,8V20C3,21.1 3.9,22 5,22H19C20.1,22 21,21.1 21,20V8C21,6.9 20.1,6 19,6M12,3C13.66,3 15,4.34 15,6H9C9,4.34 10.34,3 12,3M19,20H5V8H19V20Z' },
      { key: 'show_bakeries',       label: 'Bakeries',          emoji: '🥖',  color: '#D4A35A', overpass: 'nwr["shop"="bakery"]',             icon: 'M18.06,3.89C18.74,4.57 18.84,5.58 18.36,6.39L15,12H19A1,1 0 0,1 20,13L20.03,13.5A7.65,7.65 0 0,1 12.4,21H8A6,6 0 0,1 2,15V14A1,1 0 0,1 3,13H6.34C6.1,12.42 6,11.79 6,11.13C6,9.45 6.78,7.91 8.05,6.87C8.93,5.66 10.5,5 12,5C13.06,5 14.09,5.35 14.94,6C15.37,5.33 16.04,4.86 16.82,4.74C17.27,4.66 17.73,4.18 18.06,3.89Z' },
      { key: 'show_hairdressers',   label: 'Hairdressers',      emoji: '💇',  color: '#FF6EC7', overpass: 'nwr["shop"="hairdresser"]',        icon: 'M9.5,4A6.5,6.5 0 0,0 3,10.5C3,14.09 5.36,17.12 8.63,18.19L7.5,21H9.5L10.5,18.45C10.67,18.47 10.83,18.5 11,18.5C13.66,18.5 16,16.91 16,15C16,14.3 15.67,13.65 15.12,13.13C15.68,12.58 16,11.84 16,11C16,9.5 14.83,8.24 13.25,7.7C12.29,5.53 11.06,4 9.5,4M9.5,6C10.26,6 11.17,7.29 11.87,9.07C11.25,9 10.62,9 10,9H9.16C8.76,8.08 8.5,7.12 8.5,6.5C8.5,6.22 8.97,6 9.5,6M7.28,10.56C7.72,10.21 8.32,10 9,10H10C11.66,10 13,10.45 13,11C13,11.55 11.66,12 10,12H7.81C7.39,11.57 7.17,11.07 7.28,10.56M9.14,13H10C11.66,13 13,13.45 13,14C13,14.55 12.45,15 11.67,15.34C10.5,14.67 9.5,14 9.5,14L9.14,13Z' },
      { key: 'show_post_offices',   label: 'Post Offices',      emoji: '📬',  color: '#FF6B35', overpass: 'nwr["amenity"="post_office"]',     icon: 'M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z' },
      { key: 'show_post_boxes',     label: 'Post Boxes',        emoji: '📮',  color: '#FF2D55', overpass: 'nwr["amenity"="post_box"]',        icon: 'M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z' },
    ]
  },
  {
    label: 'Transport',
    pois: [
      { key: 'show_train_stations', label: 'Train Stations',    emoji: '🚆',  color: '#5856D6', overpass: 'nwr["railway"="station"]',         icon: 'M12,2C8,2 4,2.5 4,6V15.5C4,17.43 5.57,19 7.5,19L6,20.5V21H18V20.5L16.5,19C18.43,19 20,17.43 20,15.5V6C20,2.5 16,2 12,2M8,17A1.5,1.5 0 0,1 6.5,15.5A1.5,1.5 0 0,1 8,14A1.5,1.5 0 0,1 9.5,15.5A1.5,1.5 0 0,1 8,17M11,11H6V6H11V11M13,11V6H18V11H13M16,17A1.5,1.5 0 0,1 14.5,15.5A1.5,1.5 0 0,1 16,14A1.5,1.5 0 0,1 17.5,15.5A1.5,1.5 0 0,1 16,17Z' },
      { key: 'show_bus_stops',      label: 'Bus Stops',         emoji: '🚌',  color: '#34C759', overpass: 'nwr["highway"="bus_stop"]',        icon: 'M4,16C4,16.88 4.39,17.67 5,18.22V20A1,1 0 0,0 6,21H7A1,1 0 0,0 8,20V19H16V20A1,1 0 0,0 17,21H18A1,1 0 0,0 19,20V18.22C19.61,17.67 20,16.88 20,16V6C20,2.5 16.42,2 12,2C7.58,2 4,2.5 4,6V16M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M18,11H6V6H18V11Z' },
      { key: 'show_fuel',           label: 'Petrol Stations',   emoji: '⛽',  color: '#FF3B30', overpass: 'nwr["amenity"="fuel"]',            icon: 'M9.5,6.5V11.5H7V4H13.5L14.5,8H18C19.1,8 20,8.9 20,10V14C20,15.1 19.1,16 18,16V20A2,2 0 0,1 16,22H6A2,2 0 0,1 4,20V6.5A2.5,2.5 0 0,1 6.5,4H9.5V6.5H7V11.5H9.5Z' },
      { key: 'show_parking',        label: 'Car Parks',         emoji: '🅿️',  color: '#0A84FF', overpass: 'nwr["amenity"="parking"]',         icon: 'M13,3A4,4 0 0,1 17,7A4,4 0 0,1 13,11H11V21H9V3M11,9H13A2,2 0 0,0 15,7A2,2 0 0,0 13,5H11V9Z' },
      { key: 'show_ev_charging',    label: 'EV Charging',       emoji: '⚡',  color: '#30D158', overpass: 'nwr["amenity"="charging_station"]', icon: 'M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z' },
      { key: 'show_bicycle_parking',label: 'Bike Parking',      emoji: '🚲',  color: '#34C759', overpass: 'nwr["amenity"="bicycle_parking"]', icon: 'M5,20.5A3.5,3.5 0 0,1 1.5,17A3.5,3.5 0 0,1 5,13.5A3.5,3.5 0 0,1 8.5,17A3.5,3.5 0 0,1 5,20.5M5,12A5,5 0 0,0 0,17A5,5 0 0,0 5,22A5,5 0 0,0 10,17A5,5 0 0,0 5,12M14.8,10H19V8.2H15.8L13.86,4.93C13.57,4.43 13,4.1 12.4,4.1C11.93,4.1 11.5,4.29 11.2,4.6L7.5,8.29C7.19,8.6 7,9 7,9.5C7,10.13 7.33,10.66 7.85,10.97L11.2,13V18H13V11.5L10.75,10.15L13.07,7.59M19,20.5A3.5,3.5 0 0,1 15.5,17A3.5,3.5 0 0,1 19,13.5A3.5,3.5 0 0,1 22.5,17A3.5,3.5 0 0,1 19,20.5M19,12A5,5 0 0,0 14,17A5,5 0 0,0 19,22A5,5 0 0,0 24,17A5,5 0 0,0 19,12M16,4.8C17,4.8 17.8,4 17.8,3C17.8,2 17,1.2 16,1.2C15,1.2 14.2,2 14.2,3C14.2,4 15,4.8 16,4.8Z' },
      { key: 'show_taxi',           label: 'Taxi Ranks',        emoji: '🚕',  color: '#FFCC00', overpass: 'nwr["amenity"="taxi"]',            icon: 'M18,11H6V6H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M19.88,5C19.58,4.14 18.76,3.5 17.83,3.5H16V2H8V3.5H6.17C5.24,3.5 4.42,4.14 4.12,5L2,11V21A1,1 0 0,0 3,22H4A1,1 0 0,0 5,21V20H19V21A1,1 0 0,0 20,22H21A1,1 0 0,0 22,21V11L19.88,5Z' },
      { key: 'show_ferry',          label: 'Ferry Terminals',   emoji: '⛴️',  color: '#0A84FF', overpass: 'nwr["amenity"="ferry_terminal"]',  icon: 'M4,12H12V14H4V12M4,8H8V10H4V8M2,20L4,16H20L22,20H2M20,12H22V14H20V12M15,8H17V10H15V8M15,4H17V6H15V4M11,4H13V6H11V4Z' },
    ]
  },
  {
    label: 'Health & Emergency',
    pois: [
      { key: 'show_hospitals',      label: 'Hospitals',         emoji: '🏥',  color: '#FF3B30', overpass: 'nwr["amenity"="hospital"]',        icon: 'M18,14H14V18H10V14H6V10H10V6H14V10H18M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z' },
      { key: 'show_pharmacies',     label: 'Pharmacies',        emoji: '💊',  color: '#5AC8FA', overpass: 'nwr["amenity"="pharmacy"]',        icon: 'M13,9H11V7H9V9H7V11H9V13H11V11H13M10,2A8,8 0 0,1 18,10A8,8 0 0,1 10,18A8,8 0 0,1 2,10A8,8 0 0,1 10,2M10,4A6,6 0 0,0 4,10A6,6 0 0,0 10,16A6,6 0 0,0 16,10A6,6 0 0,0 10,4Z' },
      { key: 'show_doctors',        label: 'Doctors / GPs',     emoji: '🩺',  color: '#FF6B6B', overpass: 'nwr["amenity"="doctors"]',         icon: 'M8,3A1,1 0 0,0 7,4V9H5A2,2 0 0,0 3,11V22H21V11A2,2 0 0,0 19,9H17V4A1,1 0 0,0 16,3H8M9,5H15V9H9V5M5,11H11V13H13V11H19V20H5V11M9,14V16H7V18H9V20H11V18H13V16H11V14H9Z' },
      { key: 'show_dentists',       label: 'Dentists',          emoji: '🦷',  color: '#5AC8FA', overpass: 'nwr["amenity"="dentist"]',         icon: 'M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21Z' },
      { key: 'show_vets',           label: 'Vets',              emoji: '🐾',  color: '#32D74B', overpass: 'nwr["amenity"="veterinary"]',      icon: 'M18.5,2C17,2 15.5,2.5 14.5,3.5L8,10L9.5,11.5L13,8H15V10L8.5,16.5C7.5,17.5 7.5,19 8.5,20C9.5,21 11,21 12,20L19,13C20.5,11.5 21,9.5 21,8C21,4.7 18.5,2 18.5,2M7,2H5C3,2 2,3 2,5V19C2,21 3,22 5,22H7C9,22 10,21 10,19V5C10,3 9,2 7,2M7,18C7.6,18 8,18.4 8,19C8,19.6 7.6,20 7,20C6.4,20 6,19.6 6,19C6,18.4 6.4,18 7,18Z' },
      { key: 'show_police',         label: 'Police Stations',   emoji: '👮',  color: '#0A84FF', overpass: 'nwr["amenity"="police"]',          icon: 'M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M17.13,17C15.92,18.85 14.11,20.24 12,20.92C9.89,20.24 8.08,18.85 6.87,17C6.53,16.5 6.24,15.97 6,15.43C6,13.82 8.71,12.5 12,12.5C15.29,12.5 18,13.82 18,15.43C17.76,15.97 17.47,16.5 17.13,17Z' },
      { key: 'show_fire_stations',  label: 'Fire Stations',     emoji: '🚒',  color: '#FF3B30', overpass: 'nwr["amenity"="fire_station"]',    icon: 'M17.66,11.2C17.43,10.9 17.15,10.64 16.89,10.38C16.22,9.78 15.46,9.35 14.82,8.72C13.33,7.26 13,4.85 13.95,3C13,3.23 12.17,3.75 11.46,4.32C8.87,6.4 7.85,10.07 9.07,13.22C9.11,13.32 9.15,13.42 9.15,13.55C9.15,13.77 9,13.97 8.8,14.05C8.57,14.15 8.33,14.09 8.14,13.93C8.08,13.88 8.04,13.83 8,13.76C6.87,12.33 6.69,10.28 7.45,8.64C5.78,10 4.87,12.3 5,14.47C5.06,14.97 5.12,15.47 5.29,15.97C5.43,16.57 5.7,17.17 6,17.7C7.08,19.43 8.95,20.67 10.96,20.92C13.1,21.19 15.39,20.8 17.03,19.32C18.86,17.66 19.5,15 18.56,12.72L18.43,12.46C18.22,12 17.66,11.2 17.66,11.2Z' },
    ]
  },
  {
    label: 'Finance',
    pois: [
      { key: 'show_atms',           label: 'ATMs',              emoji: '🏧',  color: '#FFCC00', overpass: 'nwr["amenity"="atm"]',             icon: 'M2,4V20H22V4H2M20,16H4V8H20V16M6,14H8V10H6V14M10,10H14V12H10V14H14V12H12V10H10Z' },
      { key: 'show_banks',          label: 'Banks',             emoji: '🏦',  color: '#30D158', overpass: 'nwr["amenity"="bank"]',            icon: 'M2,10H10V8L12,6L14,8V10H22V12H20V20H22V22H2V20H4V12H2V10M6,12V20H11V12H6M13,12V20H18V12H13Z' },
      { key: 'show_bureau_de_change', label: 'Currency Exchange', emoji: '💱', color: '#FFCC00', overpass: 'nwr["amenity"="bureau_de_change"]', icon: 'M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12.5,17.75V19H11.5V17.73C10.28,17.44 9.23,16.58 9,15.42L10.47,15.19C10.67,16.02 11.4,16.5 12.5,16.5C13.58,16.5 14.5,15.84 14.5,15C14.5,14.22 13.79,13.67 12.5,13.37C10.98,13.02 9.5,12.35 9.5,11C9.5,9.87 10.44,8.96 11.5,8.62V7H12.5V8.64C13.63,8.98 14.5,9.9 14.66,11.05L13.18,11.28C13.04,10.48 12.33,10 11.5,10C10.62,10 10,10.56 10,11.25C10,12.06 10.78,12.44 12.23,12.78C14,13.18 16,13.9 16,15.5C16,16.74 14.97,17.72 12.5,17.75Z' },
    ]
  },
  {
    label: 'Education & Culture',
    pois: [
      { key: 'show_schools',        label: 'Schools',           emoji: '🏫',  color: '#BF5AF2', overpass: 'nwr["amenity"="school"]',          icon: 'M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z' },
      { key: 'show_colleges',       label: 'Colleges',          emoji: '🎓',  color: '#BF5AF2', overpass: 'nwr["amenity"="college"]',         icon: 'M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z' },
      { key: 'show_universities',   label: 'Universities',      emoji: '🎓',  color: '#5856D6', overpass: 'nwr["amenity"="university"]',      icon: 'M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z' },
      { key: 'show_libraries',      label: 'Libraries',         emoji: '📚',  color: '#FF9500', overpass: 'nwr["amenity"="library"]',         icon: 'M12,17.5L6.5,8L9.5,3L17.5,17.5H12M12,17.5L17.5,17.5V19.5H12V17.5M5,8L2,13L5,18L8,13L5,8M19,8L16,13L19,18L22,13L19,8Z' },
      { key: 'show_theatres',       label: 'Theatres',          emoji: '🎭',  color: '#FF6B6B', overpass: 'nwr["amenity"="theatre"]',         icon: 'M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M9,16.5V7.5L16,12L9,16.5Z' },
      { key: 'show_cinemas',        label: 'Cinemas',           emoji: '🎬',  color: '#FF3B30', overpass: 'nwr["amenity"="cinema"]',          icon: 'M18,3V5H16V3H8V5H6V3H4V21H6V19H8V21H16V19H18V21H20V3M16,17H8V7H16V17Z' },
      { key: 'show_museums',        label: 'Museums',           emoji: '🏛️',  color: '#A2845E', overpass: 'nwr["tourism"="museum"]',          icon: 'M22,11V13H21V20H22V22H2V20H3V13H2V11L12,2L22,11M5,13V20H9V15H11V20H13V15H15V20H19V13L12,6L5,13Z' },
      { key: 'show_arts_centres',   label: 'Arts Centres',      emoji: '🎨',  color: '#BF5AF2', overpass: 'nwr["amenity"="arts_centre"]',     icon: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M13,9.94L14.06,11L13,12.06L14.06,13L16.18,10.88L14.06,8.76L13,9.94M10.94,9.94L9.88,8.76L7.76,10.88L9.88,13L10.94,12.06L9.88,11L10.94,9.94M12,14.5C11.17,14.5 10.43,14.08 10,13.43L8.82,14.61C9.58,15.5 10.73,16 12,16C13.27,16 14.42,15.5 15.18,14.61L14,13.43C13.57,14.08 12.83,14.5 12,14.5Z' },
      { key: 'show_worship',        label: 'Places of Worship', emoji: '⛪',  color: '#636366', overpass: 'nwr["amenity"="place_of_worship"]', icon: 'M22,9V7H20V5C20,3.89 19.1,3 18,3H4C2.89,3 2,3.89 2,5V21A1,1 0 0,0 3,22H21A1,1 0 0,0 22,21V11H24V9H22M20,21H13V17H11V21H4V5H18V21H20V9H22V21Z' },
      { key: 'show_community',      label: 'Community Centres', emoji: '🏛️',  color: '#34C759', overpass: 'nwr["amenity"="community_centre"]', icon: 'M22,9V7H20V5C20,3.89 19.1,3 18,3H4C2.89,3 2,3.89 2,5V21A1,1 0 0,0 3,22H21A1,1 0 0,0 22,21V11H24V9H22M20,21H13V17H11V21H4V5H18V21H20V9H22V21Z' },
    ]
  },
  {
    label: 'Recreation',
    pois: [
      { key: 'show_parks',          label: 'Parks',             emoji: '🌳',  color: '#32D74B', overpass: 'nwr["leisure"="park"]',            icon: 'M11,18L13,16.84V15H11C9.9,15 9,14.1 9,13C9,11.9 9.9,11 11,11H12V10.85L12.5,9H11C8.24,9 6,11.24 6,14C6,16.76 8.24,19 11,19V18M12.5,5L11,9H13L12,13H14L15.5,9H13.5L15,5H12.5M18,12C18,14.76 15.76,17 13,17V18.91C17,18.43 20,15.07 20,11C20,6.93 17,3.57 13,3.09V5C15.76,5 18,7.24 18,10V12Z' },
      { key: 'show_playgrounds',    label: 'Playgrounds',       emoji: '🛝',  color: '#FF9500', overpass: 'nwr["leisure"="playground"]',      icon: 'M5.5,5A2.5,2.5 0 0,0 3,7.5A2.5,2.5 0 0,0 5.5,10A2.5,2.5 0 0,0 8,7.5A2.5,2.5 0 0,0 5.5,5M17.5,5A2.5,2.5 0 0,0 15,7.5A2.5,2.5 0 0,0 17.5,10A2.5,2.5 0 0,0 20,7.5A2.5,2.5 0 0,0 17.5,5M7.93,11C6.36,11 5.06,12.19 5,13.76L3,22H5.25L6,18H7C7,18 6.82,17.16 6.59,16H9.41C9.18,17.16 9,18 9,18H10L10.9,13.97C10.6,13.12 10.54,12.16 10.91,11.27C10.74,11.1 10.35,11 10.07,11H7.93M17.93,11H15.93C15.65,11 15.26,11.1 15.09,11.27C15.46,12.16 15.4,13.12 15.1,13.97L16,18H17C17,18 16.82,17.16 16.59,16H19.41C19.18,17.16 19,18 19,18H21L19,13.76C18.94,12.19 17.64,11 16.07,11H17.93Z' },
      { key: 'show_sports_centres', label: 'Sports Centres',    emoji: '🏋️',  color: '#0A84FF', overpass: 'nwr["leisure"="sports_centre"]',   icon: 'M20.57,14.86L22,13.43L20.57,12L17,15.57L8.43,7L12,3.43L10.57,2L9.14,3.43L7.71,2L5.57,4.14L4.14,2.71L2.71,4.14L4.14,5.57L2,7.71L3.43,9.14L2,10.57L3.43,12L7,8.43L15.57,17L12,20.57L13.43,22L14.86,20.57L16.29,22L18.43,19.86L19.86,21.29L21.29,19.86L19.86,18.43L22,16.29L20.57,14.86Z' },
      { key: 'show_swimming',       label: 'Swimming Pools',    emoji: '🏊',  color: '#0A84FF', overpass: 'nwr["leisure"="swimming_pool"]',   icon: 'M2,13.5A4,4 0 0,0 6,9.5A4,4 0 0,0 10,13.5A4,4 0 0,0 14,9.5A4,4 0 0,0 18,13.5A4,4 0 0,0 22,9.5V8L20,6H18L15,9H13L10,6H8L5,9H3L2,10.5V13.5M10,18A4,4 0 0,1 6,22A4,4 0 0,1 2,18V16.5A4,4 0 0,0 6,20A4,4 0 0,0 10,16.5A4,4 0 0,0 14,20A4,4 0 0,0 18,16.5A4,4 0 0,0 22,20V18A4,4 0 0,1 18,22A4,4 0 0,1 14,18A4,4 0 0,1 10,18Z' },
      { key: 'show_golf',           label: 'Golf Courses',      emoji: '⛳',  color: '#32D74B', overpass: 'nwr["leisure"="golf_course"]',     icon: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4C14.76,4 17.23,5.16 18.95,7.05L17.06,8.94C15.84,7.72 14.04,6.96 12,6.96V4M12,19V17C14.04,17 15.84,16.24 17.06,15.02L18.95,16.91C17.23,18.8 14.76,19.96 12,19.96V19M20,12A8,8 0 0,1 12,20V18A6,6 0 0,0 18,12H20Z' },
      { key: 'show_hotels',         label: 'Hotels',            emoji: '🏨',  color: '#FFCC00', overpass: 'nwr["tourism"="hotel"]',           icon: 'M17,11H7V5H17M17,3H7C5.89,3 5,3.89 5,5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V5C19,3.89 18.1,3 17,3Z' },
      { key: 'show_attractions',    label: 'Attractions',       emoji: '🎡',  color: '#FF6B6B', overpass: 'nwr["tourism"="attraction"]',      icon: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z' },
      { key: 'show_viewpoints',     label: 'Viewpoints',        emoji: '👁️',  color: '#5856D6', overpass: 'nwr["tourism"="viewpoint"]',       icon: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z' },
      { key: 'show_campsites',      label: 'Campsites',         emoji: '⛺',  color: '#32D74B', overpass: 'nwr["tourism"="camp_site"]',       icon: 'M17,12H19L12,2L5,12H7L3,19H9.5V17H14.5V19H21L17,12Z' },
    ]
  },
  {
    label: 'Utilities & Environment',
    pois: [
      { key: 'show_toilets',        label: 'Toilets',           emoji: '🚻',  color: '#636366', overpass: 'nwr["amenity"="toilets"]',         icon: 'M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M10,17L5,12L6.41,10.59L10,14.17L17.59,6.58L19,8L10,17Z' },
      { key: 'show_drinking_water', label: 'Drinking Water',    emoji: '💧',  color: '#0A84FF', overpass: 'nwr["amenity"="drinking_water"]',  icon: 'M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21Z' },
      { key: 'show_benches',        label: 'Benches',           emoji: '🪑',  color: '#A2845E', overpass: 'nwr["amenity"="bench"]',           icon: 'M2,11H4V15H10V11H14V15H20V11H22V17H20V16H14V17H10V16H4V17H2V11Z' },
      { key: 'show_recycling',      label: 'Recycling',         emoji: '♻️',  color: '#32D74B', overpass: 'nwr["amenity"="recycling"]',       icon: 'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,17H13V11H11V17M11,9H13V7H11V9Z' },
    ]
  },
];
// Flat list for iteration (backwards compatible)
const MM_POIS = MM_POI_GROUPS.flatMap(g => g.pois);

// ── Tile Layer URLs ────────────────────────────────────────────────
const MM_TILES = {
  dark:  { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',      attr: '© OpenStreetMap contributors © CARTO' },
  light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',     attr: '© OpenStreetMap contributors © CARTO' },
};

// ── Colour helpers ─────────────────────────────────────────────────
function _mmHex(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Time formatter ─────────────────────────────────────────────────
function _mmTimeAgo(dateStr) {
  if (!dateStr) return 'Unknown';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 30) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return m === 1 ? '1 min ago' : `${m} mins ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

// ── Popup base styles (shared, injected once into document.body overlays) ──
const MM_POPUP_KEYFRAMES = `
  @keyframes mmFadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes mmSlideUp { from{transform:translateY(20px) scale(0.97);opacity:0} to{transform:none;opacity:1} }
  @keyframes mmPulse   { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.18);opacity:0.7} }
`;

// ═══════════════════════════════════════════════════════════════════
//  MAIN CARD CLASS
// ═══════════════════════════════════════════════════════════════════
class MeerkatMapCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._map         = null;
    this._tileLayer   = null;
    this._personMarker = null;
    this._poiLayers   = {};
    this._geocodeCache = {};
    this._activeOverlay = null;
    this._poiDebounce   = null;
    this._mapInitialised = false;
    this._mapCentredOnce = false;
    this._config      = MeerkatMapCard.getStubConfig();
    this._poiFetching = {};
  }

  // ── Static ───────────────────────────────────────────────────────
  static getConfigElement() { return document.createElement('meerkat-map-card-editor'); }
  static getStubConfig() {
    return {
      person_entity:       '',
      geocoded_entity:     '',
      theme:               'dark',
      map_height:          420,
      zoom_level:          15,
      distance_unit:       'metric',
      // Food & Drink
      show_restaurants:    false,
      show_cafes:          false,
      show_pubs:           false,
      show_bars:           false,
      show_fast_food:      false,
      show_ice_cream:      false,
      // Shops & Services
      show_supermarkets:   true,
      show_shops:          false,
      show_bakeries:       false,
      show_hairdressers:   false,
      show_post_offices:   false,
      show_post_boxes:     false,
      // Transport
      show_train_stations: true,
      show_bus_stops:      true,
      show_fuel:           false,
      show_parking:        false,
      show_ev_charging:    false,
      show_bicycle_parking:false,
      show_taxi:           false,
      show_ferry:          false,
      // Health & Emergency
      show_hospitals:      true,
      show_pharmacies:     true,
      show_doctors:        false,
      show_dentists:       false,
      show_vets:           false,
      show_police:         false,
      show_fire_stations:  false,
      // Finance
      show_atms:           false,
      show_banks:          false,
      show_bureau_de_change: false,
      // Education & Culture
      show_schools:        false,
      show_colleges:       false,
      show_universities:   false,
      show_libraries:      false,
      show_theatres:       false,
      show_cinemas:        false,
      show_museums:        false,
      show_arts_centres:   false,
      show_worship:        false,
      show_community:      false,
      // Recreation
      show_parks:          false,
      show_playgrounds:    false,
      show_sports_centres: false,
      show_swimming:       false,
      show_golf:           false,
      show_hotels:         false,
      show_attractions:    false,
      show_viewpoints:     false,
      show_campsites:      false,
      // Utilities & Environment
      show_toilets:        false,
      show_drinking_water: false,
      show_benches:        false,
      show_recycling:      false,
    };
  }

  // ── Config ───────────────────────────────────────────────────────
  setConfig(config) {
    const prev = this._config || {};
    this._config = { ...MeerkatMapCard.getStubConfig(), ...config };
    if (this._mapInitialised) {
      this._applyTheme();
      this._updateMap();
      // Clear in-flight guard for any category that was just toggled on
      // so the fetch fires immediately rather than being blocked
      for (const cat of MM_POIS) {
        if (this._config[cat.key] && !prev[cat.key]) {
          if (this._poiFetching) this._poiFetching[cat.key] = false;
        }
      }
      this._loadAllPOIs();
    }
  }

  // ── Hass ─────────────────────────────────────────────────────────
  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) this._render();
    if (!this._mapInitialised)      this._initMap();
    else                            this._updateMap();
  }

  // ── Lifecycle ────────────────────────────────────────────────────
  connectedCallback()    { /* map init happens in set hass */ }
  disconnectedCallback() {
    clearTimeout(this._poiDebounce);
    this._closeAllOverlays();
    if (this._map) {
      this._map.remove();
      this._map          = null;
      this._tileLayer    = null;
      this._personMarker = null;  // must null so re-init creates a fresh marker
      this._poiLayers    = {};
      this._poiFetching  = {};
    }
    this._mapInitialised = false;
    this._mapIniting     = false;  // must reset or re-init is blocked
    this._poiPending  = 0;
    this._mapCentredOnce = false;
    // Clear shadow DOM so _render() rebuilds the map container on reconnect
    this.shadowRoot.innerHTML = '';
  }

  // ── Render shell ─────────────────────────────────────────────────
  _render() {
    const isDark = this._isDark();
    const bg      = isDark ? 'rgba(18,18,20,0.95)' : 'rgba(250,250,252,0.97)';
    const border  = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
    const h       = parseInt(this._config.map_height) || 420;
    const accent  = '#007AFF';

    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: block; }
        ha-card {
          background: ${bg};
          border: 1px solid ${border};
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
        }
        #mm-map-wrap { position: relative; width: 100%; height: ${h}px; }
        #mm-map { width: 100%; height: 100%; z-index: 1; }
        /* Controls overlay */
        #mm-controls {
          position: absolute; top: 12px; right: 12px; z-index: 1000;
          display: flex; flex-direction: column; gap: 8px;
        }
        .mm-ctrl-btn {
          width: 40px; height: 40px; border-radius: 12px; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 16px rgba(0,0,0,0.35);
        }
        .mm-ctrl-btn:active { transform: scale(0.92); }
        .mm-ctrl-btn svg { width: 20px; height: 20px; }
        /* Theme-specific ctrl colours injected via JS */
        #mm-loading {
          position: absolute; inset: 0; z-index: 2000; display: flex; align-items: center;
          justify-content: center; flex-direction: column; gap: 10px;
          background: ${bg}; color: ${isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'};
          font-size: 13px; font-weight: 500;
        }
        .mm-spinner {
          width: 28px; height: 28px; border-radius: 50%;
          border: 3px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'};
          border-top-color: ${accent};
          animation: mmSpin 0.8s linear infinite;
        }
        @keyframes mmSpin { to { transform: rotate(360deg); } }
        /* Leaflet overrides inside shadow root */
        .leaflet-control-zoom { display: none !important; }
        /* POI loading ring */
        /* POI loading ring — small circle, bottom-left corner */
        #mm-poi-ring {
          position: absolute; bottom: 14px; left: 14px;
          width: 28px; height: 28px;
          pointer-events: none; z-index: 1500;
          opacity: 0;
          transition: opacity 0.8s ease;
        }
        #mm-poi-ring.mm-loading { opacity: 1; }
        #mm-poi-ring svg { width: 28px; height: 28px; transform: rotate(-90deg); display: block; }
        .leaflet-attribution-container a { color: ${accent}; }
      </style>
      <ha-card>
        <div id="mm-map-wrap">
          <div id="mm-map"></div>
          <div id="mm-controls">
            <button class="mm-ctrl-btn" id="mm-home-btn" title="Go to person">
              <svg viewBox="0 0 24 24"><path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" fill="currentColor"/></svg>
            </button>
            <button class="mm-ctrl-btn" id="mm-zoom-in-btn" title="Zoom in">
              <svg viewBox="0 0 24 24"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/></svg>
            </button>
            <button class="mm-ctrl-btn" id="mm-zoom-out-btn" title="Zoom out">
              <svg viewBox="0 0 24 24"><path d="M19,13H5V11H19V13Z" fill="currentColor"/></svg>
            </button>
          </div>
          <div id="mm-loading">
            <div class="mm-spinner"></div>
            <span>Loading map…</span>
          </div>
          <div id="mm-poi-ring">
            <svg viewBox="0 0 28 28" fill="none">
              <!-- track ring -->
              <circle id="mm-ring-track" cx="14" cy="14" r="11"
                stroke="rgba(255,255,255,0.12)" stroke-width="2.5" fill="none"/>
              <!-- progress arc -->
              <circle id="mm-ring-arc" cx="14" cy="14" r="11"
                stroke="rgba(255,255,255,0.7)" stroke-width="2.5" fill="none"
                stroke-linecap="round"
                style="transition:stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1);"/>
            </svg>
          </div>
        </div>
      </ha-card>`;

    this._applyTheme();

    // Ctrl buttons
    const homeBtn    = this.shadowRoot.getElementById('mm-home-btn');
    const zoomInBtn  = this.shadowRoot.getElementById('mm-zoom-in-btn');
    const zoomOutBtn = this.shadowRoot.getElementById('mm-zoom-out-btn');
    homeBtn.addEventListener('click',    () => this._centreOnPerson());
    zoomInBtn.addEventListener('click',  () => this._map?.zoomIn());
    zoomOutBtn.addEventListener('click', () => this._map?.zoomOut());
  }

  // ── Theme helpers ─────────────────────────────────────────────────
  _isDark() {
    const t = this._config?.theme || 'dark';
    if (t === 'auto') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
    }
    return t !== 'light';
  }

  _applyTheme() {
    const isDark = this._isDark();
    const bg     = isDark ? 'rgba(30,30,34,0.88)' : 'rgba(255,255,255,0.85)';
    const color  = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)';
    this.shadowRoot.querySelectorAll('.mm-ctrl-btn').forEach(b => {
      b.style.background = bg;
      b.style.color      = color;
    });
  }

  // ── Map init ─────────────────────────────────────────────────────
  async _initMap() {
    if (this._mapInitialised || this._mapIniting) return;
    this._mapIniting = true;

    try {
      // Load Leaflet JS and CSS in parallel.
      // CSS MUST be injected into the shadow root — document.head styles
      // do not pierce Shadow DOM, so tiles and layout would be broken.
      const [leafletCSS] = await Promise.all([
        _mmFetchCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),
        _mmScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'),
      ]);

      // Inject Leaflet CSS directly into shadow root
      if (!this.shadowRoot.getElementById('mm-leaflet-css')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'mm-leaflet-css';
        // Fix tile image paths — Leaflet CSS uses relative URLs for marker images
        styleEl.textContent = leafletCSS.replace(
          /url\(images\//g,
          'url(https://unpkg.com/leaflet@1.9.4/dist/images/'
        );
        this.shadowRoot.insertBefore(styleEl, this.shadowRoot.firstChild);
      }

      const L     = window.L;
      const mapEl = this.shadowRoot.getElementById('mm-map');
      if (!mapEl) { this._mapIniting = false; return; }

      const isDark = this._isDark();
      const zoom   = parseInt(this._config.zoom_level) || 15;

      this._map = L.map(mapEl, {
        zoomControl:        false,
        attributionControl: true,
        center:             [51.5, -0.12],
        zoom,
        preferCanvas:       true,
      });

      const tiles = isDark ? MM_TILES.dark : MM_TILES.light;
      this._tileLayer = L.tileLayer(tiles.url, {
        attribution: tiles.attr,
        subdomains:  'abcd',
        maxZoom:     20,
      }).addTo(this._map);

      this._mapInitialised = true;
      this._mapIniting     = false;

      // Load POIs on map move (debounced)
      this._map.on('moveend', () => {
        clearTimeout(this._poiDebounce);
        this._poiDebounce = setTimeout(() => this._loadAllPOIs(), 800);
      });

      // Hide loading overlay
      const loadEl = this.shadowRoot.getElementById('mm-loading');
      if (loadEl) loadEl.style.display = 'none';

      // Critical: tell Leaflet to recalculate its container size now that
      // it is fully visible. Without this tiles only load in a small region.
      requestAnimationFrame(() => {
        this._map.invalidateSize({ animate: false });
        this._updateMap();
        setTimeout(() => this._loadAllPOIs(), 600);
      });

    } catch (e) {
      console.error('[MeerkatMapCard] Map init failed:', e);
      this._mapIniting = false;
      const loadEl = this.shadowRoot.getElementById('mm-loading');
      if (loadEl) loadEl.textContent = 'Map failed to load.';
    }
  }

  // ── Update map ───────────────────────────────────────────────────
  _updateMap() {
    if (!this._mapInitialised || !this._hass || !this._config?.person_entity) return;
    const state = this._hass.states[this._config.person_entity];
    if (!state) return;

    const lat = parseFloat(state.attributes?.latitude);
    const lng = parseFloat(state.attributes?.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    // Centre on first load
    if (!this._mapCentredOnce) {
      this._map.setView([lat, lng], parseInt(this._config.zoom_level) || 15);
      this._mapCentredOnce = true;
    }

    this._updatePersonMarker(state, lat, lng);
  }

  // ── Person marker ─────────────────────────────────────────────────
  _updatePersonMarker(state, lat, lng) {
    const L       = window.L;
    const accent  = '#007AFF';
    const zone    = this._getZone(state);
    const zoneColor = zone === 'home' ? '#34C759' : zone === 'not_home' ? '#FF9500' : accent;
    const picUrl  = state.attributes?.entity_picture || '';
    const name    = state.attributes?.friendly_name || state.entity_id;
    const isDark  = this._isDark();

    const ringColor  = _mmHex(zoneColor.replace('#',''), 0.35);
    const iconHTML   = `
      <div class="mm-person-marker">
        <style>
          .mm-person-marker { position:relative; width:52px; height:52px; cursor:pointer; }
          .mm-person-ring {
            position:absolute; inset:-5px; border-radius:50%;
            box-shadow: 0 0 0 0 ${ringColor};
            animation: mmRingPulse 2.4s ease-in-out infinite;
          }
          @keyframes mmRingPulse {
            0%   { box-shadow: 0 0 0 0 ${ringColor}; }
            50%  { box-shadow: 0 0 0 10px rgba(0,0,0,0); }
            100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
          }
          .mm-person-circle {
            width:52px; height:52px; border-radius:50%; overflow:hidden;
            border: 3px solid ${zoneColor};
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            background: ${isDark ? '#1c1c1e' : '#f0f0f0'};
            display:flex; align-items:center; justify-content:center;
          }
          .mm-person-circle img { width:100%; height:100%; object-fit:cover; }
          .mm-person-initials { font-size:18px; font-weight:700; color:${zoneColor}; font-family:-apple-system,sans-serif; }

        </style>
        <div class="mm-person-ring"></div>
        <div class="mm-person-circle">
          ${picUrl
            ? `<img src="${picUrl}" alt="${name}" onerror="this.style.display='none'">`
            : `<span class="mm-person-initials">${(name[0]||'?').toUpperCase()}</span>`
          }
        </div>

      </div>`;

    const icon = L.divIcon({ html: iconHTML, className: '', iconSize: [52, 52], iconAnchor: [26, 26] });

    if (this._personMarker) {
      this._personMarker.setLatLng([lat, lng]).setIcon(icon);
    } else {
      this._personMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(this._map);
    }

    this._personMarker.off('click');
    this._personMarker.on('click', () => this._openPersonPopup(state, lat, lng));
  }

  // ── Centre on person ──────────────────────────────────────────────
  _centreOnPerson() {
    if (!this._hass || !this._config?.person_entity || !this._map) return;
    const state = this._hass.states[this._config.person_entity];
    const lat   = parseFloat(state?.attributes?.latitude);
    const lng   = parseFloat(state?.attributes?.longitude);
    if (!isNaN(lat) && !isNaN(lng)) this._map.flyTo([lat, lng], parseInt(this._config.zoom_level) || 15, { duration: 1.2 });
  }

  // ── Zone helper ───────────────────────────────────────────────────
  _getZone(state) {
    const s = (state?.state || '').toLowerCase();
    if (s === 'home') return 'home';
    if (s === 'not_home' || s === 'away') return 'not_home';
    return s || 'unknown';
  }

  _getZoneLabel(state) {
    const s = state?.state || 'unknown';
    if (s === 'home') return 'Home';
    if (s === 'not_home') return 'Away';
    // Find matching zone entity
    const zones = Object.entries(this._hass?.states || {})
      .filter(([k]) => k.startsWith('zone.'))
      .find(([, v]) => v.state === state.state || v.attributes?.friendly_name?.toLowerCase() === s.toLowerCase());
    if (zones) return zones[1].attributes?.friendly_name || s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ── Reverse geocode ───────────────────────────────────────────────
  async _reverseGeocode(lat, lng) {
    // Prefer HA geocoded sensor — has full address including house number
    const geoEnt = this._config.geocoded_entity;
    if (geoEnt && this._hass && this._hass.states[geoEnt]) {
      const st = this._hass.states[geoEnt].state;
      if (st && st !== 'unknown' && st !== 'unavailable') return st;
    }
    const key = `v10:${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (this._geocodeCache[key]) return this._geocodeCache[key];
    try {
      const _p = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const r  = await fetch(`${_p}//nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18&accept-language=en`);
      const d  = await r.json();
      const a  = d.address || {};
      var houseNum = a.house_number || '';
      if (!houseNum && d.display_name) {
        var seg = d.display_name.split(',')[0].trim();
        if (/^[0-9]+[A-Za-z]?$/.test(seg)) houseNum = seg;
      }
      const street = [houseNum, a.road].filter(Boolean).join(' ');
      const parts = [street||null, a.suburb||a.quarter||a.neighbourhood||null,
        a.town||a.city||a.village||a.county||null, a.postcode||null].filter(Boolean);
      const result = parts.join(', ') || d.display_name || 'Unknown location';
      this._geocodeCache[key] = result;
      return result;
    } catch { return 'Location unavailable'; }
  }

  // ── Distance calculation ──────────────────────────────────────────
  _distanceTo(lat1, lng1, lat2, lng2) {
    const R = 6371000; // metres
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLng = (lng2-lng1) * Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    const metres = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const unit = this._config.distance_unit || 'metric';
    if (unit === 'imperial') {
      const miles = metres / 1609.344;
      return miles < 0.1 ? `${Math.round(metres * 1.09361)} yd` : `${miles.toFixed(1)} mi`;
    }
    return metres < 1000 ? `${Math.round(metres)} m` : `${(metres/1000).toFixed(1)} km`;
  }

  // ── Person info popup ─────────────────────────────────────────────
  async _openPersonPopup(state, lat, lng) {
    this._closeAllOverlays();
    const isDark   = this._isDark();
    const accent   = '#007AFF';
    const zone     = this._getZone(state);
    const zoneLabel = this._getZoneLabel(state);
    const zoneColor = zone === 'home' ? '#34C759' : zone === 'not_home' ? '#FF9500' : accent;
    const name     = state.attributes?.friendly_name || state.entity_id;
    const picUrl   = state.attributes?.entity_picture || '';
    const lastChanged = state.last_changed || state.last_updated;
    const timeAgo  = _mmTimeAgo(lastChanged);
    const battery  = state.attributes?.battery_level ?? state.attributes?.battery ?? null;
    const accuracy = state.attributes?.gps_accuracy ?? null;
    const speed    = state.attributes?.speed ?? null;
    const altitude = state.attributes?.altitude ?? null;

    const bgBase   = isDark ? '28,28,30' : '252,252,254';
    const popupBg  = isDark ? `rgba(${bgBase},0.94)` : `rgba(${bgBase},0.96)`;
    const textCol  = isDark ? '#fff' : '#000';
    const subCol   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const borderC  = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.08)';
    const rowBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;padding:0 0 16px;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:mmFadeIn 0.2s ease;`;

    const style = document.createElement('style');
    style.textContent = MM_POPUP_KEYFRAMES + `
      .mm-popup { animation: mmSlideUp 0.28s cubic-bezier(0.34,1.3,0.64,1); }
      .mm-info-row { display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid ${rowBorder}; }
      .mm-info-row:last-child { border-bottom:none; }
      .mm-info-label { font-size:12px;color:${subCol};font-weight:500; }
      .mm-info-value { font-size:13px;font-weight:600;color:${textCol};text-align:right;max-width:200px;word-break:break-word; }
      .mm-zone-pill { display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.04em; }
    `;
    overlay.appendChild(style);

    const popup = document.createElement('div');
    popup.className = 'mm-popup';
    popup.style.cssText = `background:${popupBg};backdrop-filter:blur(40px) saturate(200%);-webkit-backdrop-filter:blur(40px) saturate(200%);border:1px solid ${borderC};border-radius:24px 24px 20px 20px;box-shadow:0 -8px 48px rgba(0,0,0,0.5),0 0 0 0.5px ${borderC};padding:0 0 4px;width:100%;max-width:440px;max-height:82vh;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;color:${textCol};`;
    popup.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    popup.addEventListener('click', e => e.stopPropagation());

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:14px;padding:10px 20px 14px;';
    header.innerHTML = `
      <div style="width:54px;height:54px;border-radius:50%;overflow:hidden;border:3px solid ${zoneColor};flex-shrink:0;background:${isDark ? '#2c2c2e' : '#e0e0e0'};display:flex;align-items:center;justify-content:center;">
        ${picUrl ? `<img src="${picUrl}" style="width:100%;height:100%;object-fit:cover;" alt="${name}">` : `<span style="font-size:22px;font-weight:700;color:${zoneColor};">${(name[0]||'?').toUpperCase()}</span>`}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:18px;font-weight:700;letter-spacing:-0.3px;margin-bottom:4px;">${name}</div>
        <span class="mm-zone-pill" style="background:${zoneColor}22;color:${zoneColor};border:1px solid ${zoneColor}44;">
          <svg viewBox="0 0 24 24" width="11" height="11"><path d="M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0,9.5c-1.38,0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5,1.12 2.5,2.5-1.12,2.5-2.5,2.5z" fill="${zoneColor}"/></svg>
          ${zoneLabel}
        </span>
      </div>
      <button id="mm-popup-close" style="background:${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'};border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:${subCol};font-size:16px;flex-shrink:0;transition:background 0.15s;">✕</button>`;

    // Info rows
    const infoWrap = document.createElement('div');
    infoWrap.style.cssText = 'padding:4px 20px 12px;';

    const addRow = (label, value) => {
      if (!value && value !== 0) return;
      infoWrap.innerHTML += `<div class="mm-info-row"><span class="mm-info-label">${label}</span><span class="mm-info-value">${value}</span></div>`;
    };

    addRow('Last updated', timeAgo);
    if (accuracy !== null) addRow('GPS accuracy', `±${Math.round(accuracy)} m`);
    if (battery   !== null) addRow('Battery', `${Math.round(battery)}%`);
    if (speed     !== null) addRow('Speed', `${Math.round(speed * 3.6)} km/h`);
    if (altitude  !== null) addRow('Altitude', `${Math.round(altitude)} m`);
    addRow('Coordinates', `${lat.toFixed(5)}, ${lng.toFixed(5)}`);

    // Geocode placeholder
    const geoRow = document.createElement('div');
    geoRow.className = 'mm-info-row';
    geoRow.innerHTML = `<span class="mm-info-label">Address</span><span class="mm-info-value" style="color:${subCol};font-style:italic;">Loading…</span>`;
    infoWrap.appendChild(geoRow);


    popup.appendChild(header);
    popup.appendChild(infoWrap);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    this._activeOverlay = overlay;

    overlay.addEventListener('click', () => this._closeAllOverlays());
    popup.querySelector('#mm-popup-close').addEventListener('click', () => this._closeAllOverlays());

    // Geocode async
    this._reverseGeocode(lat, lng).then(addr => {
      const valEl = geoRow.querySelector('.mm-info-value');
      if (valEl) { valEl.textContent = addr; valEl.style.fontStyle = 'normal'; valEl.style.color = textCol; }
    });

  }



  // ── POI loading ───────────────────────────────────────────────────
  async _loadAllPOIs() {
    if (!this._mapInitialised || !this._map) return;
    const bounds = this._map.getBounds();
    const s = bounds.getSouth(), w = bounds.getWest(), n = bounds.getNorth(), e = bounds.getEast();

    for (const cat of MM_POIS) {
      if (this._config[cat.key]) {
        this._loadPOICategory(cat, s, w, n, e); // fire all in parallel, no await
      } else {
        if (this._poiLayers[cat.key]) {
          this._map.removeLayer(this._poiLayers[cat.key]);
          delete this._poiLayers[cat.key];
        }
      }
    }
  }

  _poiCacheKey(cat, s, w, n, e) {
    // toFixed(3) ≈ 110m grid — fine enough to reuse when zoomed into a street
    return `mmPOI:${cat.key}:${(+s).toFixed(3)},${(+w).toFixed(3)},${(+n).toFixed(3)},${(+e).toFixed(3)}`;
  }

  // Find the best overlapping cache entry for this category ─────────
  _poiCacheFallback(cat, s, w, n, e) {
    try {
      const prefix = `mmPOI:${cat.key}:`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        const parts = k.slice(prefix.length).split(',');
        if (parts.length !== 4) continue;
        const [cs, cw, cn, ce] = parts.map(Number);
        // Use this cache entry if it covers the current view centre
        const midLat = (s + n) / 2, midLng = (w + e) / 2;
        if (midLat >= cs && midLat <= cn && midLng >= cw && midLng <= ce) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const { ts, elements } = JSON.parse(raw);
            if (Date.now() - ts < 3600000) return elements;
          }
        }
      }
    } catch (_) {}
    return null;
  }

  async _loadPOICategory(cat, s, w, n, e) {
    if (this._poiFetching && this._poiFetching[cat.key]) return;

    // Step 1: exact cache hit → render immediately
    const cacheKey = this._poiCacheKey(cat, s, w, n, e);
    let servedFromCache = false;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { ts, elements } = JSON.parse(cached);
        if (Date.now() - ts < 3600000) {
          this._renderPOILayer(cat, elements);
          servedFromCache = true;
          // Still refresh in background if >5 min old
          if (Date.now() - ts < 300000) return;
        }
      }
    } catch (_) {}

    // Step 2: no exact hit — try nearby cache to show something while fetching
    if (!servedFromCache) {
      const fallback = this._poiCacheFallback(cat, s, w, n, e);
      if (fallback) { this._renderPOILayer(cat, fallback); servedFromCache = true; }
    }

    // Step 3: fetch fresh data using XHR — more permissive than fetch() in iOS WKWebView
    if (!this._poiFetching) this._poiFetching = {};
    this._poiFetching[cat.key] = true;
    this._poiRingStart(cat);
    const query = `[out:json][timeout:25];(${cat.overpass}(${s},${w},${n},${e}););out center tags;`;
    const _p   = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const url  = `${_p}//overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const xhr  = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 30000;
    xhr.onload = () => {
      try {
        if (xhr.status < 200 || xhr.status >= 300) throw new Error(`HTTP ${xhr.status}`);
        const data = JSON.parse(xhr.responseText);
        const elements = data.elements || [];
        try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), elements })); } catch (_) {}
        this._renderPOILayer(cat, elements);
      } catch (e) {
        console.warn(`[MeerkatMapCard] POI parse error for ${cat.key}:`, e);
        if (!servedFromCache) {
          const fb = this._poiCacheFallback(cat, s, w, n, e);
          if (fb) this._renderPOILayer(cat, fb);
        }
      } finally {
        if (this._poiFetching) this._poiFetching[cat.key] = false;
        this._poiRingEnd(cat);
      }
    };
    xhr.onerror = xhr.ontimeout = () => {
      console.warn(`[MeerkatMapCard] POI fetch failed for ${cat.key}`);
      if (!servedFromCache) {
        const fb = this._poiCacheFallback(cat, s, w, n, e);
        if (fb) this._renderPOILayer(cat, fb);
      }
      if (this._poiFetching) this._poiFetching[cat.key] = false;
      this._poiRingEnd(cat);
    };
    xhr.send();
  }

    _renderPOILayer(cat, elements) {
    const L = window.L;
    const iconHTML = `
      <div style="
        width:28px;height:28px;border-radius:8px;
        background:${cat.color};
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 8px rgba(0,0,0,0.4);
        border:2px solid rgba(255,255,255,0.25);
      ">
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path d="${cat.icon}" fill="white"/>
        </svg>
      </div>`;
    const poiIcon = L.divIcon({ html: iconHTML, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });

    const markers = elements
      .map(el => {
        var lat = el.lat != null ? el.lat : (el.center ? el.center.lat : null);
        var lon = el.lon != null ? el.lon : (el.center ? el.center.lon : null);
        if (lat == null || lon == null) return null;
        el._lat = lat; el._lon = lon; // store for distance calc
        const m = L.marker([lat, lon], { icon: poiIcon });
        m.on('click', (ev) => {
          ev.originalEvent?.stopPropagation?.();
          this._openPOIPopup(cat, el);
        });
        return m;
      });

    const newLayer = L.layerGroup(markers.filter(Boolean)).addTo(this._map);
    if (this._poiLayers[cat.key]) this._map.removeLayer(this._poiLayers[cat.key]);
    this._poiLayers[cat.key] = newLayer;
  }

  // ── POI popup ─────────────────────────────────────────────────────
  _openPOIPopup(cat, el) {
    this._closeAllOverlays();
    const isDark  = this._isDark();
    const tags    = el.tags || {};
    const name    = tags.name || tags.brand || cat.label;
    const bgBase  = isDark ? '28,28,30' : '252,252,254';
    const popupBg = isDark ? `rgba(${bgBase},0.94)` : `rgba(${bgBase},0.96)`;
    const textCol = isDark ? '#fff' : '#000';
    const subCol  = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const borderC = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.08)';
    const rowBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;padding:0 0 16px;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:mmFadeIn 0.2s ease;`;

    const style = document.createElement('style');
    style.textContent = MM_POPUP_KEYFRAMES + `
      .mm-popup { animation: mmSlideUp 0.28s cubic-bezier(0.34,1.3,0.64,1); }
      .mm-info-row { display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid ${rowBorder}; }
      .mm-info-row:last-child { border-bottom:none; }
      .mm-info-label { font-size:12px;color:${subCol};font-weight:500;flex-shrink:0;margin-right:12px; }
      .mm-info-value { font-size:13px;font-weight:600;color:${textCol};text-align:right;word-break:break-word; }
      .mm-info-link { font-size:13px;font-weight:600;color:${cat.color};text-align:right;text-decoration:none; }
    `;
    overlay.appendChild(style);

    const popup = document.createElement('div');
    popup.className = 'mm-popup';
    popup.style.cssText = `background:${popupBg};backdrop-filter:blur(40px) saturate(200%);-webkit-backdrop-filter:blur(40px) saturate(200%);border:1px solid ${borderC};border-radius:24px 24px 20px 20px;box-shadow:0 -8px 48px rgba(0,0,0,0.5);padding:0 0 4px;width:100%;max-width:440px;max-height:75vh;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;color:${textCol};`;
    popup.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    popup.addEventListener('click', e => e.stopPropagation());

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:14px;padding:10px 20px 14px;';
    const website = tags.website || tags['contact:website'] || '';
    const phone   = tags.phone   || tags['contact:phone']   || '';
    const iconEl  = website
      ? `<a href="${website}" target="_blank" rel="noopener" title="Open website" style="width:50px;height:50px;border-radius:14px;background:${cat.color}22;border:2px solid ${cat.color}44;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;text-decoration:none;">
           <svg viewBox="0 0 24 24" width="24" height="24"><path d="${cat.icon}" fill="${cat.color}"/></svg>
         </a>`
      : `<div style="width:50px;height:50px;border-radius:14px;background:${cat.color}22;border:2px solid ${cat.color}44;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
           <svg viewBox="0 0 24 24" width="24" height="24"><path d="${cat.icon}" fill="${cat.color}"/></svg>
         </div>`;
    header.innerHTML = `
      ${iconEl}
      <div style="flex:1;min-width:0;">
        <div style="font-size:17px;font-weight:700;letter-spacing:-0.2px;">${name}</div>
        <div style="font-size:12px;color:${subCol};margin-top:2px;">${cat.label}</div>
      </div>
      <button id="mm-poi-close" style="background:${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'};border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:${subCol};font-size:16px;flex-shrink:0;">✕</button>`;

    // Info rows
    const infoWrap = document.createElement('div');
    infoWrap.style.cssText = 'padding:4px 20px 12px;';

    const addRow = (label, value, isLink = false) => {
      if (!value) return;
      const row = document.createElement('div');
      row.className = 'mm-info-row';
      row.innerHTML = `<span class="mm-info-label">${label}</span>${isLink
        ? `<a class="mm-info-link" href="${value}" target="_blank" rel="noopener">${value.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>`
        : `<span class="mm-info-value">${value}</span>`}`;
      infoWrap.appendChild(row);
    };

    // Build address from OSM tags
    const addrParts = [tags['addr:housenumber'] && tags['addr:street'] ? `${tags['addr:housenumber']} ${tags['addr:street']}` : tags['addr:street'], tags['addr:city'], tags['addr:postcode']].filter(Boolean);
    if (addrParts.length) addRow('Address', addrParts.join(', '));

    // Distance from person
    if (this._config.person_entity && this._hass && this._hass.states[this._config.person_entity]) {
      const ps = this._hass.states[this._config.person_entity];
      const pLat = parseFloat(ps.attributes?.latitude);
      const pLng = parseFloat(ps.attributes?.longitude);
      const elLat = el._lat != null ? el._lat : (el.center ? el.center.lat : el.lat);
      const elLng = el._lon != null ? el._lon : (el.center ? el.center.lon : el.lon);
      if (!isNaN(pLat) && !isNaN(pLng) && elLat != null && elLng != null) {
        addRow('Distance', this._distanceTo(pLat, pLng, elLat, elLng));
      }
    }
    if (tags.opening_hours)  addRow('Hours',   tags.opening_hours.replace(/;\s*/g, '\n'));
    if (phone) {
      const phoneRow = document.createElement('div');
      phoneRow.className = 'mm-info-row';
      phoneRow.innerHTML = `<span class="mm-info-label">Phone</span>`
        + `<span class="mm-info-value"><a href="tel:${phone}" style="color:${cat.color};text-decoration:none;font-weight:600;" onclick="event.preventDefault();if(confirm('Call ${phone}?'))window.location.href='tel:${phone}'">${phone}</a></span>`;
      infoWrap.appendChild(phoneRow);
    }
    if (tags.website || tags['contact:website']) addRow('Website', tags.website || tags['contact:website'], true);
    if (tags.brand)          addRow('Brand', tags.brand);
    if (tags.operator)       addRow('Operator', tags.operator);
    if (tags.cuisine)        addRow('Cuisine', tags.cuisine.replace(/;/g, ', '));
    if (tags.wheelchair)     addRow('Wheelchair', tags.wheelchair);
    if (tags.fee)            addRow('Fee', tags.fee);
    if (tags.network)        addRow('Network', tags.network);
    if (tags.ref)            addRow('Reference', tags.ref);
    const cLat = el._lat != null ? el._lat : (el.center ? el.center.lat : el.lat);
    const cLon = el._lon != null ? el._lon : (el.center ? el.center.lon : el.lon);
    if (cLat != null && cLon != null && !isNaN(cLat) && !isNaN(cLon)) {
      addRow('Coordinates', `${parseFloat(cLat).toFixed(5)}, ${parseFloat(cLon).toFixed(5)}`);
    }

    if (!infoWrap.children.length) {
      infoWrap.innerHTML = `<div style="font-size:13px;color:${subCol};text-align:center;padding:16px 0;">No additional information available.</div>`;
    }

    popup.appendChild(header);
    popup.appendChild(infoWrap);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    this._activeOverlay = overlay;

    overlay.addEventListener('click', () => this._closeAllOverlays());
    popup.querySelector('#mm-poi-close').addEventListener('click', () => this._closeAllOverlays());

  }

  // ── Close all overlays ────────────────────────────────────────────
  _closeAllOverlays() {
    if (this._activeOverlay) {
      this._activeOverlay.remove();
      this._activeOverlay = null;
    }
  }

  // ── POI loading ring (colour-coded per category) ─────────────────
  _poiRingStart(cat) {
    if (!this._poiLoadState) this._poiLoadState = {};
    this._poiLoadState[cat.key] = { done: false };
    this._updatePoiRing();
  }

  _poiRingEnd(cat) {
    if (this._poiLoadState && this._poiLoadState[cat.key]) {
      this._poiLoadState[cat.key].done = true;
    }
    this._updatePoiRing();
    const allDone = Object.values(this._poiLoadState || {}).every(s => s.done);
    if (allDone) {
      // Fill to 100% briefly, then fade out
      this._updatePoiRing(1.0);
      setTimeout(() => {
        const stillDone = Object.values(this._poiLoadState || {}).every(s => s.done);
        if (stillDone) {
          const ring = this.shadowRoot && this.shadowRoot.getElementById('mm-poi-ring');
          if (ring) ring.classList.remove('mm-loading');
          this._poiLoadState = {};
        }
      }, 900);
    }
  }

  _updatePoiRing(forceProgress) {
    const ring = this.shadowRoot && this.shadowRoot.getElementById('mm-poi-ring');
    const arc  = this.shadowRoot && this.shadowRoot.getElementById('mm-ring-arc');
    if (!ring || !arc) return;

    const state = this._poiLoadState || {};
    const cats  = Object.values(state);
    if (!cats.length) return;

    ring.classList.add('mm-loading');

    // r=11, circumference = 2π×11 ≈ 69.12
    const circ = 2 * Math.PI * 11;
    const total = cats.length;
    const done  = forceProgress != null ? total : cats.filter(s => s.done).length;
    const progress = total > 0 ? done / total : 0;

    // Update only the dasharray — element stays in DOM, transition fires smoothly
    const filled = circ * progress;
    arc.style.strokeDasharray = `${filled} ${circ - filled}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  EDITOR CLASS
// ═══════════════════════════════════════════════════════════════════
class MeerkatMapCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...MeerkatMapCard.getStubConfig(), ...config };
    if (this.shadowRoot.innerHTML) this._updateUI();
    else this.connectedCallback();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) this.connectedCallback();
  }

  connectedCallback() {
    if (!this._hass) return;
    this._buildEditor();
  }

  // ── Auto-detect person entity ─────────────────────────────────────
  _detectPersonEntities() {
    if (!this._hass) return [];
    const personKws = ['person', 'location', 'gps', 'tracking'];
    return Object.keys(this._hass.states)
      .filter(e => {
        if (e.startsWith('person.')) return true;
        const s = this._hass.states[e];
        const hasCoords = s.attributes?.latitude && s.attributes?.longitude;
        if (!hasCoords) return false;
        const id = e.toLowerCase(), name = (s.attributes?.friendly_name || '').toLowerCase();
        return personKws.some(k => id.includes(k) || name.includes(k));
      })
      .sort((a, b) => {
        const ap = a.startsWith('person.') ? 0 : 1;
        const bp = b.startsWith('person.') ? 0 : 1;
        return ap - bp || a.localeCompare(b);
      });
  }

  // ── Build editor ──────────────────────────────────────────────────
  _buildEditor() {
    const hass = this._hass;
    const cfg  = this._config;

    const personEntities = this._detectPersonEntities();

    // Auto-detect if not set
    if (!cfg.person_entity && personEntities.length) {
      this._updateConfig('person_entity', personEntities[0]);
    }

    const personOptions = `<option value="">— None —</option>` +
      personEntities.map(e => {
        const name = hass.states[e]?.attributes?.friendly_name || e;
        return `<option value="${e}" ${e === cfg.person_entity ? 'selected' : ''}>${e.startsWith('person.') ? '★ ' : ''}${name} (${e})</option>`;
      }).join('') +
      Object.keys(hass.states)
        .filter(e => !personEntities.includes(e) && !['unavailable','unknown'].includes(hass.states[e]?.state))
        .filter(e => hass.states[e]?.attributes?.latitude)
        .map(e => `<option value="${e}" ${e === cfg.person_entity ? 'selected' : ''}>${hass.states[e]?.attributes?.friendly_name||e} (${e})</option>`)
        .join('');

    const geocodedOptions = '<option value="">— None —</option>' +
      Object.keys(hass.states)
        .filter(e => e.startsWith('sensor.') && e.includes('geocod'))
        .sort()
        .map(e => `<option value="${e}" ${e===cfg.geocoded_entity?'selected':''}>${hass.states[e]?.attributes?.friendly_name||e}</option>`)
        .join('');

    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .container { display: flex; flex-direction: column; gap: 16px; padding: 4px 0 8px; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 4px; }
        .card-block { background: var(--card-background-color); border: 1px solid rgba(128,128,128,0.18); border-radius: 12px; overflow: hidden; }
        .select-row { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
        .select-row label { font-size: 13px; font-weight: 600; color: var(--primary-text-color); }
        .hint { font-size: 11px; color: #888; }
        select, input[type="text"], input[type="number"] {
          width: 100%; background: var(--secondary-background-color, rgba(0,0,0,0.06));
          color: var(--primary-text-color); border: 1px solid rgba(128,128,128,0.2);
          border-radius: 8px; padding: 9px 12px; font-size: 13px;
          -webkit-appearance: none; appearance: none; font-family: inherit;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
        }
        input[type="text"], input[type="number"] { background-image: none; padding-right: 12px; }
        .toggle-list { display: flex; flex-direction: column; }
        .toggle-item { display: flex; align-items: center; justify-content: space-between; padding: 11px 16px; border-bottom: 1px solid rgba(128,128,128,0.1); min-height: 48px; }
        .toggle-item:last-child { border-bottom: none; }
        .toggle-label { font-size: 14px; font-weight: 500; flex: 1; padding-right: 12px; }
        .toggle-sublabel { font-size: 11px; color: #888; margin-top: 1px; }
        .toggle-icon { font-size: 16px; margin-right: 8px; }
        .toggle-left { display:flex;align-items:center;flex:1; }
        .toggle-switch { position: relative; width: 51px; height: 31px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-track { position: absolute; inset: 0; border-radius: 31px; background: rgba(120,120,128,0.32); cursor: pointer; transition: background 0.25s; }
        .toggle-track::after { content:''; position:absolute; width:27px; height:27px; border-radius:50%; background:#fff; top:2px; left:2px; box-shadow:0 2px 6px rgba(0,0,0,0.3); transition:transform 0.25s; }
        .toggle-switch input:checked + .toggle-track { background:#34C759; }
        .toggle-switch input:checked + .toggle-track::after { transform:translateX(20px); }
        .segmented { display:flex; background:rgba(118,118,128,0.18); border-radius:9px; padding:2px; gap:2px; }
        .segmented input[type="radio"] { display:none; }
        .segmented label { flex:1; text-align:center; padding:8px 4px; font-size:13px; font-weight:500; border-radius:7px; cursor:pointer; color:var(--primary-text-color); transition:all 0.2s; }
        .segmented input[type="radio"]:checked + label { background:#007AFF; color:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.3); }
        .input-row { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .two-col > div { display:flex; flex-direction:column; gap:4px; }
        .two-col label { font-size:11px; font-weight:600; color:#888; }
      </style>
      <div class="container">

        <!-- Person Entity -->
        <div>
          <div class="section-title">Person Entity</div>
          <div class="hint" style="margin-bottom:6px;">★ = Person entity (auto-detected). Any entity with GPS coordinates can be tracked.</div>
          <div class="card-block">
            <div class="select-row">
              <label>Person to track</label>
              <select id="person_entity">${personOptions}</select>
            </div>
            <div class="select-row" style="border-top:1px solid var(--divider-color,rgba(0,0,0,0.06));padding-top:12px;">
              <label>Geocoded Location Sensor <span style="opacity:0.5;font-weight:400;">(optional — shows full address inc. house number)</span></label>
              <select id="geocoded_entity">${geocodedOptions}</select>
            </div>
            <div class="select-row" style="border-top:1px solid var(--divider-color,rgba(0,0,0,0.06));padding-top:12px;">
              <label>Distance Units</label>
              <div class="segmented" style="margin-top:4px;">
                <input type="radio" name="dist" id="dist_metric"   value="metric"   ${(cfg.distance_unit||'metric')==='metric'   ? 'checked':''}><label for="dist_metric">km / m</label>
                <input type="radio" name="dist" id="dist_imperial" value="imperial" ${cfg.distance_unit==='imperial' ? 'checked':''}><label for="dist_imperial">mi / yd</label>
              </div>
            </div>
          </div>
        </div>

        <!-- Map Settings -->
        <div>
          <div class="section-title">Map Settings</div>
          <div class="card-block">
            <div class="input-row">
              <div class="two-col">
                <div>
                  <label>Map Height (px)</label>
                  <input type="number" id="map_height" min="200" max="900" step="10" value="${cfg.map_height || 420}">
                </div>
                <div>
                  <label>Default Zoom</label>
                  <input type="number" id="zoom_level" min="5" max="20" step="1" value="${cfg.zoom_level || 15}">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Theme -->
        <div>
          <div class="section-title">Map Theme</div>
          <div class="card-block" style="padding:12px;">
            <div class="segmented">
              <input type="radio" name="theme" id="theme_dark"  value="dark"  ${(cfg.theme||'dark')==='dark'  ? 'checked' : ''}><label for="theme_dark">🌙 Dark</label>
              <input type="radio" name="theme" id="theme_light" value="light" ${cfg.theme==='light' ? 'checked' : ''}><label for="theme_light">☀️ Light</label>
              <input type="radio" name="theme" id="theme_auto"  value="auto"  ${cfg.theme==='auto'  ? 'checked' : ''}><label for="theme_auto">⚙️ Auto</label>
            </div>
          </div>
        </div>

        <!-- Points of Interest -->
        <div>
          <div class="section-title">Points of Interest</div>
          <div class="hint" style="margin-bottom:6px;">Toggle categories. Data from OpenStreetMap via Overpass API.</div>
          ${MM_POI_GROUPS.map(group => `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--secondary-text-color);padding:6px 0 2px;">${group.label}</div>
            <div class="card-block">
              <div class="toggle-list">
                ${group.pois.map(cat => `
                  <div class="toggle-item">
                    <div class="toggle-left">
                      <span class="toggle-icon">${cat.emoji}</span>
                      <div class="toggle-label">${cat.label}</div>
                    </div>
                    <label class="toggle-switch">
                      <input type="checkbox" data-key="${cat.key}" ${cfg[cat.key] ? 'checked' : ''}><span class="toggle-track"></span>
                    </label>
                  </div>`).join('')}
              </div>
            </div>
          </div>`).join('')}
        </div>



      </div>`;

    this._setupListeners();
  }

  _setupListeners() {
    const root = this.shadowRoot;

    root.getElementById('person_entity').onchange  = e => this._updateConfig('person_entity',  e.target.value);
    if (root.getElementById('geocoded_entity')) root.getElementById('geocoded_entity').onchange = e => this._updateConfig('geocoded_entity', e.target.value);
    root.querySelectorAll('input[name="dist"]').forEach(r => r.onchange = () => this._updateConfig('distance_unit', r.value));
    root.getElementById('map_height').oninput     = e => this._updateConfig('map_height', parseInt(e.target.value) || 420);
    root.getElementById('zoom_level').oninput     = e => this._updateConfig('zoom_level',  parseInt(e.target.value) || 15);

    root.querySelectorAll('input[name="theme"]').forEach(r => r.onchange = () => this._updateConfig('theme', r.value));

    root.querySelectorAll('input[data-key]').forEach(el => {
      el.onchange = () => this._updateConfig(el.dataset.key, el.checked);
    });

    // Accent colour
    // accent_color removed
  }

  _updateUI() {
    const root = this.shadowRoot;
    const cfg  = this._config;
    const el   = id => root.getElementById(id);
    if (el('person_entity'))   el('person_entity').value   = cfg.person_entity   || '';
    if (el('geocoded_entity')) el('geocoded_entity').value = cfg.geocoded_entity || '';
    root.querySelectorAll('input[name="dist"]').forEach(r => r.checked = r.value === (cfg.distance_unit||'metric'));
    if (el('map_height'))      el('map_height').value      = cfg.map_height      || 420;
    if (el('zoom_level'))      el('zoom_level').value      = cfg.zoom_level      || 15;
    root.querySelectorAll('input[name="theme"]').forEach(r => r.checked = r.value === (cfg.theme || 'dark'));
    root.querySelectorAll('input[data-key]').forEach(r => r.checked = !!cfg[r.dataset.key]);
  }

  _updateConfig(key, value) {
    if (!this._config) return;
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

// ── Registration ──────────────────────────────────────────────────
if (!customElements.get('meerkat-map-card')) {
  customElements.define('meerkat-map-card', MeerkatMapCard);
}
if (!customElements.get('meerkat-map-card-editor')) {
  customElements.define('meerkat-map-card-editor', MeerkatMapCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'meerkat-map-card')) {
  window.customCards.push({
    type:        'meerkat-map-card',
    name:        'Meerkat Map Card',
    preview:     false,
    description: 'Interactive OpenStreetMap card with person tracking, POI overlays, and info popups.',
  });
}