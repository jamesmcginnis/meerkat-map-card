/**
 * Meerkat Map Card
 * Home Assistant custom card — OpenStreetMap with person tracking,
 * POI overlays, info popups, and Mapillary street-view.
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
const MM_POIS = [
  { key: 'show_shops',          label: 'Shops',           emoji: '🛍️',  color: '#FF9500', overpass: 'node["shop"]',                     icon: 'M19,6H17C17,3.24 14.76,1 12,1C9.24,1 7,3.24 7,6H5C3.9,6 3,6.9 3,8V20C3,21.1 3.9,22 5,22H19C20.1,22 21,21.1 21,20V8C21,6.9 20.1,6 19,6M12,3C13.66,3 15,4.34 15,6H9C9,4.34 10.34,3 12,3M19,20H5V8H19V20Z' },
  { key: 'show_fuel',           label: 'Petrol Stations', emoji: '⛽',  color: '#FF3B30', overpass: 'node["amenity"="fuel"]',            icon: 'M9.5,6.5V11.5H7V4H13.5L14.5,8H18C19.1,8 20,8.9 20,10V14C20,15.1 19.1,16 18,16V20A2,2 0 0,1 16,22H6A2,2 0 0,1 4,20V6.5A2.5,2.5 0 0,1 6.5,4H9.5V6.5H7V11.5H9.5Z' },
  { key: 'show_post_boxes',     label: 'Post Boxes',      emoji: '📮',  color: '#FF2D55', overpass: 'node["amenity"="post_box"]',       icon: 'M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z' },
  { key: 'show_train_stations', label: 'Train Stations',  emoji: '🚆',  color: '#5856D6', overpass: 'node["railway"="station"]',        icon: 'M12,2C8,2 4,2.5 4,6V15.5C4,17.43 5.57,19 7.5,19L6,20.5V21H18V20.5L16.5,19C18.43,19 20,17.43 20,15.5V6C20,2.5 16,2 12,2M8,17A1.5,1.5 0 0,1 6.5,15.5A1.5,1.5 0 0,1 8,14A1.5,1.5 0 0,1 9.5,15.5A1.5,1.5 0 0,1 8,17M11,11H6V6H11V11M13,11V6H18V11H13M16,17A1.5,1.5 0 0,1 14.5,15.5A1.5,1.5 0 0,1 16,14A1.5,1.5 0 0,1 17.5,15.5A1.5,1.5 0 0,1 16,17Z' },
  { key: 'show_bus_stops',      label: 'Bus Stops',       emoji: '🚌',  color: '#34C759', overpass: 'node["highway"="bus_stop"]',       icon: 'M4,16C4,16.88 4.39,17.67 5,18.22V20A1,1 0 0,0 6,21H7A1,1 0 0,0 8,20V19H16V20A1,1 0 0,0 17,21H18A1,1 0 0,0 19,20V18.22C19.61,17.67 20,16.88 20,16V6C20,2.5 16.42,2 12,2C7.58,2 4,2.5 4,6V16M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M18,11H6V6H18V11Z' },
  { key: 'show_hospitals',      label: 'Hospitals',       emoji: '🏥',  color: '#FF3B30', overpass: 'node["amenity"="hospital"]',       icon: 'M18,14H14V18H10V14H6V10H10V6H14V10H18M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z' },
  { key: 'show_pharmacies',     label: 'Pharmacies',      emoji: '💊',  color: '#5AC8FA', overpass: 'node["amenity"="pharmacy"]',       icon: 'M13,9H11V7H9V9H7V11H9V13H11V11H13M10,2A8,8 0 0,1 18,10A8,8 0 0,1 10,18A8,8 0 0,1 2,10A8,8 0 0,1 10,2M10,4A6,6 0 0,0 4,10A6,6 0 0,0 10,16A6,6 0 0,0 16,10A6,6 0 0,0 10,4Z' },
  { key: 'show_atms',           label: 'ATMs',            emoji: '🏧',  color: '#FFCC00', overpass: 'node["amenity"="atm"]',            icon: 'M2,4V20H22V4H2M20,16H4V8H20V16M6,14H8V10H6V14M10,10H14V12H10V14H14V12H12V10H10Z' },
  { key: 'show_restaurants',    label: 'Restaurants',     emoji: '🍴',  color: '#FF6B6B', overpass: 'node["amenity"="restaurant"]',     icon: 'M11,9H9V2H7V9H5V2H3V9C3,11.12 4.66,12.84 6.75,12.97V22H9.25V12.97C11.34,12.84 13,11.12 13,9V2H11V9M16,6V14H18.5V22H21V2C18.24,2 16,4.24 16,6Z' },
  { key: 'show_supermarkets',   label: 'Supermarkets',    emoji: '🛒',  color: '#30D158', overpass: 'node["shop"="supermarket"]',       icon: 'M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M7,4V8H17V4H7M16,10A1,1 0 0,0 15,11A1,1 0 0,0 16,12A1,1 0 0,0 17,11A1,1 0 0,0 16,10M8,11A1,1 0 0,0 9,12A1,1 0 0,0 10,11A1,1 0 0,0 9,10A1,1 0 0,0 8,11M12,10A1,1 0 0,0 11,11A1,1 0 0,0 12,12A1,1 0 0,0 13,11A1,1 0 0,0 12,10Z' },
  { key: 'show_schools',        label: 'Schools',         emoji: '🏫',  color: '#BF5AF2', overpass: 'node["amenity"="school"]',         icon: 'M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z' },
  { key: 'show_parks',          label: 'Parks',           emoji: '🌳',  color: '#32D74B', overpass: 'node["leisure"="park"]',           icon: 'M11,18L13,16.84V15H11C9.9,15 9,14.1 9,13C9,11.9 9.9,11 11,11H12V10.85L12.5,9H11C8.24,9 6,11.24 6,14C6,16.76 8.24,19 11,19V18M12.5,5L11,9H13L12,13H14L15.5,9H13.5L15,5H12.5M18,12C18,14.76 15.76,17 13,17V18.91C17,18.43 20,15.07 20,11C20,6.93 17,3.57 13,3.09V5C15.76,5 18,7.24 18,10V12Z' },
];

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
    this._longPressTimer = null;
    this._longPressFired = false;
    this._activeOverlay = null;
    this._poiDebounce   = null;
    this._mapInitialised = false;
    this._mapCentredOnce = false;
  }

  // ── Static ───────────────────────────────────────────────────────
  static getConfigElement() { return document.createElement('meerkat-map-card-editor'); }
  static getStubConfig() {
    return {
      person_entity: '',
      theme: 'dark',
      map_height: 420,
      zoom_level: 15,
      accent_color: '#007AFF',
      mapillary_token: '',
      show_shops:          false,
      show_fuel:           false,
      show_post_boxes:     false,
      show_train_stations: true,
      show_bus_stops:      true,
      show_hospitals:      true,
      show_pharmacies:     false,
      show_atms:           false,
      show_restaurants:    false,
      show_supermarkets:   false,
      show_schools:        false,
      show_parks:          false,
    };
  }

  // ── Config ───────────────────────────────────────────────────────
  setConfig(config) {
    this._config = { ...MeerkatMapCard.getStubConfig(), ...config };
    if (this._mapInitialised) {
      this._applyTheme();
      this._updateMap();
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
    clearTimeout(this._longPressTimer);
    this._closeAllOverlays();
    if (this._map) { this._map.remove(); this._map = null; this._mapInitialised = false; this._mapCentredOnce = false; }
  }

  // ── Render shell ─────────────────────────────────────────────────
  _render() {
    const isDark = this._isDark();
    const bg      = isDark ? 'rgba(18,18,20,0.95)' : 'rgba(250,250,252,0.97)';
    const border  = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
    const h       = parseInt(this._config.map_height) || 420;
    const accent  = this._config.accent_color || '#007AFF';

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
    this._loadAllPOIs();
  }

  // ── Person marker ─────────────────────────────────────────────────
  _updatePersonMarker(state, lat, lng) {
    const L       = window.L;
    const accent  = this._config.accent_color || '#007AFF';
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
            border: 3px solid ${zoneColor};
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
          .mm-person-arrow {
            position:absolute; bottom:-10px; left:50%; transform:translateX(-50%);
            width:10px; height:10px; background:${zoneColor};
            clip-path:polygon(50% 100%,0 0,100% 0); border-radius:0 0 2px 2px;
          }
        </style>
        <div class="mm-person-ring"></div>
        <div class="mm-person-circle">
          ${picUrl
            ? `<img src="${picUrl}" alt="${name}" onerror="this.style.display='none'">`
            : `<span class="mm-person-initials">${(name[0]||'?').toUpperCase()}</span>`
          }
        </div>
        <div class="mm-person-arrow"></div>
      </div>`;

    const icon = L.divIcon({ html: iconHTML, className: '', iconSize: [52, 62], iconAnchor: [26, 62], popupAnchor: [0, -62] });

    if (this._personMarker) {
      this._personMarker.setLatLng([lat, lng]).setIcon(icon);
    } else {
      this._personMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(this._map);
    }

    // Events
    this._personMarker.off('click').off('mousedown').off('mouseup').off('touchstart').off('touchend');

    const onStart = () => {
      this._longPressFired = false;
      this._longPressTimer = setTimeout(() => {
        this._longPressFired = true;
        this._openStreetViewPopup(lat, lng);
      }, 600);
    };
    const onEnd = () => clearTimeout(this._longPressTimer);

    this._personMarker.on('mousedown',  onStart);
    this._personMarker.on('touchstart', onStart, { passive: true });
    this._personMarker.on('mouseup',    onEnd);
    this._personMarker.on('touchend',   onEnd);
    this._personMarker.on('click',      () => { if (!this._longPressFired) this._openPersonPopup(state, lat, lng); });
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
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (this._geocodeCache[key]) return this._geocodeCache[key];
    try {
      const r  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
      const d  = await r.json();
      const a  = d.address || {};
      const parts = [a.road, a.suburb || a.quarter, a.town || a.city || a.village, a.country].filter(Boolean);
      const result = parts.join(', ') || d.display_name || 'Unknown location';
      this._geocodeCache[key] = result;
      return result;
    } catch { return 'Location unavailable'; }
  }

  // ── Person info popup ─────────────────────────────────────────────
  async _openPersonPopup(state, lat, lng) {
    this._closeAllOverlays();
    const isDark   = this._isDark();
    const accent   = this._config.accent_color || '#007AFF';
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

    // Drag handle
    popup.innerHTML = `<div style="display:flex;justify-content:center;padding:10px 0 4px;"><div style="width:36px;height:4px;border-radius:2px;background:${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}"></div></div>`;

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

    // Street view hint
    const hint = document.createElement('div');
    hint.style.cssText = `margin-top:10px;padding:10px 14px;border-radius:12px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'};display:flex;align-items:center;gap:10px;cursor:pointer;transition:background 0.15s;`;
    hint.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" style="flex-shrink:0;opacity:0.5;"><path d="M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7-7.75 7-13C19,5.13 15.87,2 12,2z" fill="${textCol}"/></svg>
      <div>
        <div style="font-size:12px;font-weight:600;opacity:0.7;">Street View</div>
        <div style="font-size:11px;opacity:0.4;margin-top:1px;">Long-press the map marker to open</div>
      </div>`;
    hint.addEventListener('click', () => { this._closeAllOverlays(); this._openStreetViewPopup(lat, lng); });
    infoWrap.appendChild(hint);

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

  // ── Street view (Mapillary) popup ─────────────────────────────────
  async _openStreetViewPopup(lat, lng) {
    this._closeAllOverlays();
    const token   = this._config.mapillary_token;
    const isDark  = this._isDark();
    const accent  = this._config.accent_color || '#007AFF';
    const bgBase  = isDark ? '12,12,14' : '20,20,22';

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;z-index:99999;background:rgba(${bgBase},0.97);display:flex;flex-direction:column;animation:mmFadeIn 0.2s ease;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;`;

    const style = document.createElement('style');
    style.textContent = MM_POPUP_KEYFRAMES;
    overlay.appendChild(style);

    // Top bar
    const topBar = document.createElement('div');
    topBar.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:14px 18px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.08);`;
    topBar.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7-7.75 7-13C19,5.13 15.87,2 12,2z" fill="${accent}"/></svg>
        <div>
          <div style="font-size:14px;font-weight:700;color:#fff;">Street View</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);">Powered by Mapillary</div>
        </div>
      </div>
      <button id="mm-sv-close" style="background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);font-size:16px;transition:background 0.15s;">✕</button>`;

    const viewerWrap = document.createElement('div');
    viewerWrap.id    = 'mm-mapillary-viewer';
    viewerWrap.style.cssText = 'flex:1;position:relative;overflow:hidden;';

    overlay.appendChild(topBar);
    overlay.appendChild(viewerWrap);
    document.body.appendChild(overlay);
    this._activeOverlay = overlay;

    topBar.querySelector('#mm-sv-close').addEventListener('click', () => this._closeAllOverlays());

    if (!token) {
      viewerWrap.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;padding:24px;text-align:center;">
          <div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" width="30" height="30"><path d="M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7-7.75 7-13C19,5.13 15.87,2 12,2z" fill="${accent}"/></svg>
          </div>
          <div>
            <div style="font-size:17px;font-weight:700;color:#fff;margin-bottom:8px;">Mapillary Token Required</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.55;max-width:300px;">
              Add a free Mapillary access token in the card editor to enable street view.<br><br>
              Get one at <span style="color:${accent};">mapillary.com/developer</span>
            </div>
          </div>
        </div>`;
      return;
    }

    // Loading state
    viewerWrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;"><div style="width:30px;height:30px;border-radius:50%;border:3px solid rgba(255,255,255,0.12);border-top-color:${accent};animation:mmSpin 0.8s linear infinite;"></div><div style="font-size:13px;color:rgba(255,255,255,0.4);">Finding nearby imagery…</div></div>
      <style>@keyframes mmSpin{to{transform:rotate(360deg)}}</style>`;

    try {
      // Find nearest Mapillary image
      const radius = 0.01; // ~1km
      const bbox   = `${lng-radius},${lat-radius},${lng+radius},${lat+radius}`;
      const apiUrl = `https://graph.mapillary.com/images?access_token=${token}&fields=id,thumb_2048_url,geometry,compass_angle,captured_at&bbox=${bbox}&limit=50`;
      const resp   = await fetch(apiUrl);
      const data   = await resp.json();

      if (!data.data || data.data.length === 0) {
        viewerWrap.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;"><div style="font-size:16px;font-weight:600;color:#fff;">No street-level imagery nearby</div><div style="font-size:13px;color:rgba(255,255,255,0.4);">Mapillary has no coverage at this location.</div></div>`;
        return;
      }

      // Sort by distance to point
      const sorted = data.data
        .filter(img => img.geometry?.coordinates)
        .map(img => {
          const [iLng, iLat] = img.geometry.coordinates;
          const d = Math.hypot(iLat - lat, iLng - lng);
          return { ...img, _dist: d };
        })
        .sort((a, b) => a._dist - b._dist);

      // Load mapillary-js viewer
      _mmCSS('https://unpkg.com/mapillary-js@4.1.2/dist/mapillary.css');
      await _mmScript('https://unpkg.com/mapillary-js@4.1.2/dist/mapillary.js');

      viewerWrap.innerHTML = '';
      const viewerDiv = document.createElement('div');
      viewerDiv.id    = 'mly-viewer-inner';
      viewerDiv.style.cssText = 'width:100%;height:100%;';
      viewerWrap.appendChild(viewerDiv);

      const { Viewer } = window.mapillary || {};
      if (!Viewer) throw new Error('mapillary-js not available');

      const viewer = new Viewer({
        accessToken: token,
        container:   viewerDiv,
        imageId:     sorted[0].id,
        component:   { cover: false },
      });

      // Navigation thumbnails
      const thumbBar = document.createElement('div');
      thumbBar.style.cssText = `position:absolute;bottom:0;left:0;right:0;padding:12px;display:flex;gap:8px;overflow-x:auto;background:linear-gradient(to top,rgba(0,0,0,0.7),transparent);scrollbar-width:none;`;
      thumbBar.innerHTML = sorted.slice(0, 12).map((img, i) => `
        <div class="mm-sv-thumb" data-id="${img.id}" style="flex-shrink:0;width:72px;height:54px;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid ${i===0 ? accent : 'transparent'};opacity:${i===0 ? 1 : 0.6};transition:all 0.2s;background:#111;">
          <img src="${img.thumb_2048_url||''}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
        </div>`).join('');

      thumbBar.querySelectorAll('.mm-sv-thumb').forEach(el => {
        el.addEventListener('click', () => {
          viewer.moveTo(el.dataset.id);
          thumbBar.querySelectorAll('.mm-sv-thumb').forEach(t => { t.style.borderColor = 'transparent'; t.style.opacity = '0.6'; });
          el.style.borderColor = accent; el.style.opacity = '1';
        });
      });

      viewerWrap.appendChild(thumbBar);
      this._mapillaryViewer = viewer;

    } catch (err) {
      viewerWrap.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;padding:24px;text-align:center;">
        <div style="font-size:16px;font-weight:600;color:#fff;">Could not load street view</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.4);">${err.message || 'An unexpected error occurred.'}</div>
      </div>`;
    }
  }

  // ── POI loading ───────────────────────────────────────────────────
  async _loadAllPOIs() {
    if (!this._mapInitialised || !this._map) return;
    const bounds = this._map.getBounds();
    const s = bounds.getSouth(), w = bounds.getWest(), n = bounds.getNorth(), e = bounds.getEast();

    for (const cat of MM_POIS) {
      if (this._config[cat.key]) {
        this._loadPOICategory(cat, s, w, n, e);
      } else {
        // Remove layer if toggled off
        if (this._poiLayers[cat.key]) {
          this._map.removeLayer(this._poiLayers[cat.key]);
          delete this._poiLayers[cat.key];
        }
      }
    }
  }

  async _loadPOICategory(cat, s, w, n, e) {
    try {
      const query  = `[out:json][timeout:15];(${cat.overpass}(${s},${w},${n},${e}););out body;`;
      const url    = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const resp   = await fetch(url);
      const data   = await resp.json();
      this._renderPOILayer(cat, data.elements || []);
    } catch (e) {
      console.warn(`[MeerkatMapCard] POI fetch failed for ${cat.key}:`, e);
    }
  }

  _renderPOILayer(cat, elements) {
    const L = window.L;
    if (this._poiLayers[cat.key]) {
      this._map.removeLayer(this._poiLayers[cat.key]);
    }

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
      .filter(el => el.lat && el.lon)
      .map(el => {
        const m = L.marker([el.lat, el.lon], { icon: poiIcon });
        m.on('click', (ev) => {
          ev.originalEvent?.stopPropagation?.();
          this._openPOIPopup(cat, el);
        });
        return m;
      });

    this._poiLayers[cat.key] = L.layerGroup(markers).addTo(this._map);
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

    // Drag handle
    popup.innerHTML = `<div style="display:flex;justify-content:center;padding:10px 0 4px;"><div style="width:36px;height:4px;border-radius:2px;background:${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}"></div></div>`;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:14px;padding:10px 20px 14px;';
    header.innerHTML = `
      <div style="width:50px;height:50px;border-radius:14px;background:${cat.color}22;border:2px solid ${cat.color}44;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="${cat.icon}" fill="${cat.color}"/></svg>
      </div>
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

    // Build address from tags
    const addrParts = [tags['addr:housenumber'] && tags['addr:street'] ? `${tags['addr:housenumber']} ${tags['addr:street']}` : tags['addr:street'], tags['addr:city'], tags['addr:postcode']].filter(Boolean);
    if (addrParts.length) addRow('Address', addrParts.join(', '));
    if (tags.opening_hours)  addRow('Hours',   tags.opening_hours.replace(/;\s*/g, '\n'));
    if (tags.phone || tags['contact:phone']) addRow('Phone', tags.phone || tags['contact:phone']);
    if (tags.website || tags['contact:website']) addRow('Website', tags.website || tags['contact:website'], true);
    if (tags.brand)          addRow('Brand', tags.brand);
    if (tags.operator)       addRow('Operator', tags.operator);
    if (tags.cuisine)        addRow('Cuisine', tags.cuisine.replace(/;/g, ', '));
    if (tags.wheelchair)     addRow('Wheelchair', tags.wheelchair);
    if (tags.fee)            addRow('Fee', tags.fee);
    if (tags.network)        addRow('Network', tags.network);
    if (tags.ref)            addRow('Reference', tags.ref);
    addRow('Coordinates', `${parseFloat(el.lat).toFixed(5)}, ${parseFloat(el.lon).toFixed(5)}`);

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
    if (this._mapillaryViewer) {
      try { this._mapillaryViewer.remove?.(); } catch {}
      this._mapillaryViewer = null;
    }
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
          <div class="hint" style="margin-bottom:6px;">Toggle which categories appear on the map. Data from OpenStreetMap via Overpass API.</div>
          <div class="card-block">
            <div class="toggle-list">
              ${MM_POIS.map(cat => `
                <div class="toggle-item">
                  <div class="toggle-left">
                    <span class="toggle-icon">${cat.emoji}</span>
                    <div>
                      <div class="toggle-label">${cat.label}</div>
                    </div>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" data-key="${cat.key}" ${cfg[cat.key] ? 'checked' : ''}><span class="toggle-track"></span>
                  </label>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Mapillary -->
        <div>
          <div class="section-title">Street View (Mapillary)</div>
          <div class="hint" style="margin-bottom:6px;">Long-press the person marker to open street view. Get a free token at mapillary.com/developer</div>
          <div class="card-block">
            <div class="input-row">
              <label style="font-size:13px;font-weight:600;color:var(--primary-text-color);">Mapillary Access Token</label>
              <input type="text" id="mapillary_token" placeholder="MLY|..." value="${cfg.mapillary_token || ''}">
            </div>
          </div>
        </div>

        <!-- Accent Colour -->
        <div>
          <div class="section-title">Accent Colour</div>
          <div class="card-block">
            <div class="input-row" style="flex-direction:row;align-items:center;gap:12px;">
              <input type="color" id="accent_color_picker" value="${cfg.accent_color || '#007AFF'}" style="width:40px;height:40px;border-radius:10px;border:none;cursor:pointer;padding:0;background:none;-webkit-appearance:none;">
              <input type="text"  id="accent_color"        value="${cfg.accent_color || '#007AFF'}" style="flex:1;" maxlength="7" placeholder="#007AFF">
            </div>
          </div>
        </div>

      </div>`;

    this._setupListeners();
  }

  _setupListeners() {
    const root = this.shadowRoot;

    root.getElementById('person_entity').onchange = e => this._updateConfig('person_entity', e.target.value);
    root.getElementById('map_height').oninput     = e => this._updateConfig('map_height', parseInt(e.target.value) || 420);
    root.getElementById('zoom_level').oninput     = e => this._updateConfig('zoom_level',  parseInt(e.target.value) || 15);
    root.getElementById('mapillary_token').oninput = e => this._updateConfig('mapillary_token', e.target.value.trim());

    root.querySelectorAll('input[name="theme"]').forEach(r => r.onchange = () => this._updateConfig('theme', r.value));

    root.querySelectorAll('input[data-key]').forEach(el => {
      el.onchange = () => this._updateConfig(el.dataset.key, el.checked);
    });

    // Accent colour
    const picker = root.getElementById('accent_color_picker');
    const hexIn  = root.getElementById('accent_color');
    picker.oninput = () => { hexIn.value = picker.value; this._updateConfig('accent_color', picker.value); };
    hexIn.oninput  = () => {
      const v = hexIn.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { picker.value = v; this._updateConfig('accent_color', v); }
    };
  }

  _updateUI() {
    const root = this.shadowRoot;
    const cfg  = this._config;
    const el   = id => root.getElementById(id);
    if (el('person_entity'))   el('person_entity').value   = cfg.person_entity   || '';
    if (el('map_height'))      el('map_height').value      = cfg.map_height      || 420;
    if (el('zoom_level'))      el('zoom_level').value      = cfg.zoom_level      || 15;
    if (el('mapillary_token')) el('mapillary_token').value = cfg.mapillary_token || '';
    if (el('accent_color'))    el('accent_color').value    = cfg.accent_color    || '#007AFF';
    if (el('accent_color_picker')) el('accent_color_picker').value = cfg.accent_color || '#007AFF';
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
    description: 'Interactive OpenStreetMap card with person tracking, POI overlays, info popups, and Mapillary street view.',
  });
}
