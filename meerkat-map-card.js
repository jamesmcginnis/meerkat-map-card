/**
 * Meerkat Map Card
 * Home Assistant custom card — OpenStreetMap with person tracking.
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

// ── Persistent storage layer ────────────────────────────────────────
// IDB schema (version 2) — one object store:
//
//   kv           — small key-value pairs only: geocode cache (mmGeo:*) and
//                  last map position (mmMapPos).  Mirrors to _mmMem for
//                  synchronous reads; also written to localStorage as a fast
//                  warm-up path on platforms where IDB open is slow.

const _mmMem = {};
let   _mmIDB = null;
const _mmIDB_NAME    = 'MeerkatMapCard';
const _mmIDB_VERSION = 2;
let   _mmInitPromise = null;

function _mmStorageInit() {
  if (_mmInitPromise) return _mmInitPromise;
  _mmInitPromise = new Promise(resolve => {
    // Seed _mmMem from localStorage synchronously for geo/mapPos only.
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('mmGeo:') || k === 'mmMapPos')) {
          const v = localStorage.getItem(k);
          if (v !== null) _mmMem[k] = v;
        }
      }
    } catch (_) {}

    if (!window.indexedDB) { resolve(); return; }

    let req;
    try { req = indexedDB.open(_mmIDB_NAME, _mmIDB_VERSION); } catch (_) { resolve(); return; }

    req.onupgradeneeded = e => {
      const db = e.target.result;

      // kv store — always ensure it exists (created in v1)
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
    };

    req.onerror = () => resolve();

    req.onsuccess = e => {
      _mmIDB = e.target.result;
      // Load only kv entries (geo + mapPos) into _mmMem.
      try {
        const tx  = _mmIDB.transaction('kv', 'readonly');
        const cur = tx.objectStore('kv').openCursor();
        cur.onsuccess = ev => {
          const c = ev.target.result;
          if (c) { _mmMem[c.key] = c.value; c.continue(); }
          else    resolve();
        };
        cur.onerror = () => resolve();
      } catch (_) { resolve(); }
    };
  });
  return _mmInitPromise;
}

// Kick off init immediately so IDB is ready as soon as possible.
_mmStorageInit();

// ── kv helpers (geo cache + map position only) ──────────────────────
function _mmStorageSet(key, value) {
  _mmMem[key] = value;
  if (_mmIDB) {
    try {
      const tx = _mmIDB.transaction('kv', 'readwrite');
      tx.onerror = () => {};
      tx.objectStore('kv').put(value, key);
    } catch (_) {}
  } else {
    _mmStorageInit().then(() => {
      if (_mmIDB) {
        try {
          const tx = _mmIDB.transaction('kv', 'readwrite');
          tx.onerror = () => {};
          tx.objectStore('kv').put(value, key);
        } catch (_) {}
      }
    });
  }
  // localStorage — fast warm-up on next load; geo strings are tiny so quota
  // pressure is not a concern here.
  try { localStorage.setItem(key, value); } catch (_) {}
  try { sessionStorage.setItem(key, value); } catch (_) {}
}

function _mmStorageGet(key) {
  if (_mmMem[key] !== undefined) return _mmMem[key];
  try { const v = sessionStorage.getItem(key); if (v !== null) return v; } catch (_) {}
  return null;
}

function _mmStorageRemove(key) {
  delete _mmMem[key];
  if (_mmIDB) {
    try {
      const tx = _mmIDB.transaction('kv', 'readwrite');
      tx.onerror = () => {};
      tx.objectStore('kv').delete(key);
    } catch (_) {}
  }
  try { localStorage.removeItem(key); }   catch (_) {}
  try { sessionStorage.removeItem(key); } catch (_) {}
}

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
    this._familyMarkers = {};   // entityId → Leaflet marker
    this._geocodeCache = {};
    this._activeOverlay = null;
    this._mapInitialised = false;
    this._mapCentredOnce = false;
    this._config      = MeerkatMapCard.getStubConfig();
  }

  // ── Static ───────────────────────────────────────────────────────
  static getConfigElement() { return document.createElement('meerkat-map-card-editor'); }
  static getStubConfig() {
    return {
      person_entity:       '',
      geocoded_entity:     '',
      family_members:      [],   // array of entity IDs to track alongside the main person
      theme:               'dark',
      map_height:          420,
      zoom_level:          15,
      distance_unit:       'metric',
      person_icon_size:    'medium', // Person marker size: 'small' | 'medium' | 'large'
    };
  }

  // ── Config ───────────────────────────────────────────────────────
  setConfig(config) {
    this._config = { ...MeerkatMapCard.getStubConfig(), ...config };
    // Pre-warm the in-memory caches from IndexedDB / localStorage as early as
    // possible.
    this._warmCacheFromStorage().then(() => {
      if (this._mapInitialised) {
        this._applyTheme();
        this._updateMap();
      }
    });
  }

  // ── Cache warm-up ─────────────────────────────────────────────────
  async _warmCacheFromStorage() {
    await _mmStorageInit();
  }

  // ── Hass ─────────────────────────────────────────────────────────
  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) this._render();
    if (!this._mapInitialised)      this._initMap();
    else                            { this._updateMap(); this._updateFamilyMarkers(); }
  }

  // ── Lifecycle ────────────────────────────────────────────────────
  connectedCallback()    { /* map init happens in set hass */ }
  disconnectedCallback() {
    this._closeAllOverlays();
    if (this._map) {
      // Save map position to kv store so it can be restored on reconnect.
      try {
        const c = this._map.getCenter();
        const z = this._map.getZoom();
        const payload = { lat: c.lat, lng: c.lng, zoom: z };
        _mmStorageSet('mmMapPos', JSON.stringify(payload));
      } catch (_) {}
      this._map.remove();
      this._map          = null;
      this._tileLayer    = null;
      this._personMarker = null;  // must null so re-init creates a fresh marker
      this._familyMarkers = {};
    }
    this._mapInitialised  = false;
    this._mapIniting      = false;  // must reset or re-init is blocked
    if (this._cacheClearedHandler) {
      window.removeEventListener('meerkat-cache-cleared', this._cacheClearedHandler);
      this._cacheClearedHandler = null;
    }
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
        /* Leaflet overrides inside shadow root */
        .leaflet-control-zoom { display: none !important; }
        .mm-spinner {
          width: 28px; height: 28px; border-radius: 50%;
          border: 3px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'};
          border-top-color: ${accent};
          animation: mmSpin 0.8s linear infinite;
        }
        @keyframes mmSpin { to { transform: rotate(360deg); } }
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


  async _initMap() {
    if (this._mapInitialised || this._mapIniting) return;
    this._mapIniting = true;

    // Kick off IDB warm-up immediately so it runs in parallel with the
    // Leaflet CDN fetch rather than sequentially after it.
    this._warmCacheFromStorage();

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

      // Custom panes guarantee DOM z-order regardless of lat-based zIndex math.
      // sharing entities → device to track (highest).
      this._map.createPane("mmSharingPane"); this._map.getPane("mmSharingPane").style.zIndex = "600";
      this._map.createPane("mmDevicePane");  this._map.getPane("mmDevicePane").style.zIndex  = "700";

      this._mapInitialised = true;
      this._mapIniting     = false;

      // Listen for cache-clear events fired by the visual editor.
      this._cacheClearedHandler = () => {
        this._geocodeCache = {};
      };
      window.addEventListener('meerkat-cache-cleared', this._cacheClearedHandler);

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

    // Always centre on the person's current location on first load.
    if (!this._mapCentredOnce) {
      this._map.setView([lat, lng], parseInt(this._config.zoom_level) || 15);
      this._mapCentredOnce = true;
    }

    this._updatePersonMarker(state, lat, lng);
    this._updateFamilyMarkers();
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

    const szMap   = { small: 36, medium: 52, large: 64 };
    const fsMap   = { small: 13, medium: 18, large: 22 };
    const sz      = szMap[this._config?.person_icon_size || 'medium'] || 52;
    const fs      = fsMap[this._config?.person_icon_size || 'medium'] || 18;
    const half    = sz / 2;

    const ringColor  = _mmHex(zoneColor.replace('#',''), 0.35);
    const iconHTML   = `
      <div class="mm-person-marker">
        <style>
          .mm-person-marker { position:relative; width:${sz}px; height:${sz}px; cursor:pointer; }
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
            width:${sz}px; height:${sz}px; border-radius:50%; overflow:hidden;
            border: 3px solid ${zoneColor};
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            background: ${isDark ? '#1c1c1e' : '#f0f0f0'};
            display:flex; align-items:center; justify-content:center;
          }
          .mm-person-circle img { width:100%; height:100%; object-fit:cover; }
          .mm-person-initials { font-size:${fs}px; font-weight:700; color:${zoneColor}; font-family:-apple-system,sans-serif; }

        </style>
        <div class="mm-person-ring"></div>
        <div class="mm-person-circle">
          ${picUrl
            ? `<img src="${picUrl}" alt="${name}" onerror="this.style.display='none'">`
            : `<span class="mm-person-initials">${(name[0]||'?').toUpperCase()}</span>`
          }
        </div>

      </div>`;

    const icon = L.divIcon({ html: iconHTML, className: '', iconSize: [sz, sz], iconAnchor: [half, half] });

    if (this._personMarker) {
      this._personMarker.setLatLng([lat, lng]).setIcon(icon);
    } else {
      this._personMarker = L.marker([lat, lng], { icon, pane: "mmDevicePane" }).addTo(this._map);
    }

    this._personMarker.off('click');
    this._personMarker.on('click', () => this._openPersonPopup(state, lat, lng));
  }

  // ── Family member markers ─────────────────────────────────────────
  _updateFamilyMarkers() {
    if (!this._mapInitialised || !this._map || !this._hass) return;
    const L = window.L;
    const members = Array.isArray(this._config?.family_members) ? this._config.family_members : [];

    // Remove markers/lines for members no longer in config
    const currentIds = new Set(members);
    for (const id of Object.keys(this._familyMarkers)) {
      if (!currentIds.has(id)) {
        this._map.removeLayer(this._familyMarkers[id]);
        delete this._familyMarkers[id];
      }
    }

    for (const entityId of members) {
      const state = this._hass.states[entityId];
      if (!state) continue;
      const lat = parseFloat(state.attributes?.latitude);
      const lng = parseFloat(state.attributes?.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;

      const isDark    = this._isDark();
      const zone      = this._getZone(state);
      const zoneColor = zone === 'home' ? '#34C759' : zone === 'not_home' ? '#FF9500' : '#AF52DE';
      const picUrl    = state.attributes?.entity_picture || '';
      const name      = state.attributes?.friendly_name || entityId;
      const safeId = entityId.replace(/\W/g, '_');

      const fszMap  = { small: 30, medium: 44, large: 54 };
      const ffsMap  = { small: 11, medium: 16, large: 20 };
      const fsz     = fszMap[this._config?.person_icon_size || 'medium'] || 44;
      const ffs     = ffsMap[this._config?.person_icon_size || 'medium'] || 16;
      const fhalf   = fsz / 2;

      const iconHTML = `
        <div style="position:relative;width:${fsz}px;height:${fsz}px;cursor:pointer;">
          <style>
            @keyframes mmFamilyPulse_${safeId} {
              0%   { box-shadow: 0 0 0 0 ${zoneColor}55; }
              50%  { box-shadow: 0 0 0 8px rgba(0,0,0,0); }
              100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
            }
          </style>
          <div style="width:${fsz}px;height:${fsz}px;border-radius:50%;overflow:hidden;border:3px solid ${zoneColor};box-shadow:0 3px 12px rgba(0,0,0,0.4);background:${isDark ? '#1c1c1e' : '#f0f0f0'};display:flex;align-items:center;justify-content:center;animation:mmFamilyPulse_${safeId} 3s ease-in-out infinite;">
            ${picUrl
              ? `<img src="${picUrl}" alt="${name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
              : `<span style="font-size:${ffs}px;font-weight:700;color:${zoneColor};font-family:-apple-system,sans-serif;">${(name[0]||'?').toUpperCase()}</span>`
            }
          </div>
        </div>`;

      const icon = L.divIcon({ html: iconHTML, className: '', iconSize: [fsz, fsz], iconAnchor: [fhalf, fhalf] });

      if (this._familyMarkers[entityId]) {
        this._familyMarkers[entityId].setLatLng([lat, lng]).setIcon(icon);
      } else {
        this._familyMarkers[entityId] = L.marker([lat, lng], { icon, pane: "mmSharingPane" }).addTo(this._map);
      }
      this._familyMarkers[entityId].off('click');
      this._familyMarkers[entityId].on('click', () => this._openFamilyMemberPopup(state, lat, lng));
    }
  }

  // ── Family member popup ───────────────────────────────────────────
  async _openFamilyMemberPopup(state, lat, lng) {
    this._closeAllOverlays();
    const isDark    = this._isDark();
    const accent    = '#AF52DE';
    const zone      = this._getZone(state);
    const zoneLabel = this._getZoneLabel(state);
    const zoneColor = zone === 'home' ? '#34C759' : zone === 'not_home' ? '#FF9500' : accent;
    const name      = state.attributes?.friendly_name || state.entity_id;
    const picUrl    = state.attributes?.entity_picture || '';
    const lastChanged = state.last_changed || state.last_updated;
    const timeAgo   = _mmTimeAgo(lastChanged);
    const sourceState = (() => {
      const src = state.attributes?.source;
      return src ? this._hass?.states[src] : null;
    })();
    const battery   = state.attributes?.battery_level ?? state.attributes?.battery
                   ?? sourceState?.attributes?.battery_level ?? sourceState?.attributes?.battery ?? null;
    const accuracy  = state.attributes?.gps_accuracy ?? null;

    const bgBase    = isDark ? '28,28,30' : '252,252,254';
    const popupBg   = isDark ? `rgba(${bgBase},0.94)` : `rgba(${bgBase},0.96)`;
    const textCol   = isDark ? '#fff' : '#000';
    const subCol    = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const borderC   = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.08)';
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
    `;
    overlay.appendChild(style);

    const popup = document.createElement('div');
    popup.className = 'mm-popup';
    popup.style.cssText = `background:${popupBg};backdrop-filter:blur(40px) saturate(200%);-webkit-backdrop-filter:blur(40px) saturate(200%);border:1px solid ${borderC};border-radius:24px 24px 20px 20px;box-shadow:0 -8px 48px rgba(0,0,0,0.5),0 0 0 0.5px ${borderC};padding:0 0 4px;width:100%;max-width:440px;max-height:82vh;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;color:${textCol};`;
    popup.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    popup.addEventListener('click', e => e.stopPropagation());

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:14px;padding:10px 20px 14px;';
    header.innerHTML = `
      <div id="mm-family-avatar" style="width:54px;height:54px;border-radius:50%;overflow:hidden;border:3px solid ${zoneColor};flex-shrink:0;background:${isDark ? '#2c2c2e' : '#e0e0e0'};display:flex;align-items:center;justify-content:center;cursor:pointer;" title="Fly to ${name}">
        ${picUrl ? `<img src="${picUrl}" style="width:100%;height:100%;object-fit:cover;" alt="${name}">` : `<span style="font-size:22px;font-weight:700;color:${zoneColor};">${(name[0]||'?').toUpperCase()}</span>`}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:18px;font-weight:700;letter-spacing:-0.3px;">${name}</div>
      </div>
      <button id="mm-family-popup-close" style="background:${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'};border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:${subCol};font-size:16px;flex-shrink:0;transition:background 0.15s;">✕</button>`;

    const infoWrap = document.createElement('div');
    infoWrap.style.cssText = 'padding:4px 20px 12px;';

    const addRow = (label, value) => {
      if (!value && value !== 0) return;
      infoWrap.innerHTML += `<div class="mm-info-row"><span class="mm-info-label">${label}</span><span class="mm-info-value">${value}</span></div>`;
    };

    addRow('Last updated', timeAgo);
    if (accuracy !== null) addRow('GPS accuracy', `±${Math.round(accuracy)} m`);
    if (battery   !== null) addRow('Battery', `${Math.round(battery)}%`);

    // Distance from main person
    const mainState = this._hass?.states[this._config?.person_entity];
    const mainLat   = parseFloat(mainState?.attributes?.latitude);
    const mainLng   = parseFloat(mainState?.attributes?.longitude);
    if (!isNaN(mainLat) && !isNaN(mainLng)) {
      addRow('Distance from you', this._distanceTo(mainLat, mainLng, lat, lng));
    }

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
    popup.querySelector('#mm-family-popup-close').addEventListener('click', () => this._closeAllOverlays());
    popup.querySelector('#mm-family-avatar').addEventListener('click', () => {
      this._closeAllOverlays();
      this._map.flyTo([lat, lng], parseInt(this._config.zoom_level) || 15, { duration: 1.2 });
    });

    this._reverseGeocode(lat, lng, true).then(addr => {
      const valEl = geoRow.querySelector('.mm-info-value');
      if (valEl) { valEl.textContent = addr; valEl.style.fontStyle = 'normal'; valEl.style.color = textCol; }
    });
  }

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
    // Match against zone entity ID slug: zone.work → "work"
    const zones = Object.entries(this._hass?.states || {})
      .filter(([k]) => k.startsWith('zone.'));
    const match = zones.find(([k, v]) => {
      const slug = k.replace('zone.', '').replace(/_/g, ' ');
      return slug.toLowerCase() === s.toLowerCase()
        || (v.attributes?.friendly_name || '').toLowerCase() === s.toLowerCase();
    });
    if (match) return match[1].attributes?.friendly_name || s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ── Reverse geocode ───────────────────────────────────────────────
  async _reverseGeocode(lat, lng, skipSensor) {
    // Prefer HA geocoded sensor — has full address including house number.
    // Only use it for the main person (skipSensor=true bypasses it for family members).
    if (!skipSensor) {
      const geoEnt = this._config.geocoded_entity;
      if (geoEnt && this._hass && this._hass.states[geoEnt]) {
        const st = this._hass.states[geoEnt].state;
        if (st && st !== 'unknown' && st !== 'unavailable') return st;
      }
    }
    const key = `v10:${lat.toFixed(4)},${lng.toFixed(4)}`;
    // 1. Check in-memory cache first (fastest)
    if (this._geocodeCache[key]) return this._geocodeCache[key];
    // 2. Check localStorage — avoids a network round-trip on page reload
    try {
      const stored = _mmStorageGet(`mmGeo:${key}`);
      if (stored) {
        this._geocodeCache[key] = stored;
        return stored;
      }
    } catch (_) {}
    // 3. No cached data at this map reference — fetch from Nominatim
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
      // Persist to localStorage so subsequent page loads skip the API call
      _mmStorageSet(`mmGeo:${key}`, result);
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
    if (unit === 'mixed') {
      // Miles for distance, metres for short distances
      const miles = metres / 1609.344;
      return miles < 0.1 ? `${Math.round(metres)} m` : `${miles.toFixed(1)} mi`;
    }
    return metres < 1000 ? `${Math.round(metres)} m` : `${(metres/1000).toFixed(1)} km`;
  }

  // ── Close all overlays ────────────────────────────────────────────
  _closeAllOverlays() {
    if (this._activeOverlay) {
      this._activeOverlay.remove();
      this._activeOverlay = null;
    }
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
    const sourceState = (() => {
      const src = state.attributes?.source;
      return src ? this._hass?.states[src] : null;
    })();
    const battery  = state.attributes?.battery_level ?? state.attributes?.battery
                  ?? sourceState?.attributes?.battery_level ?? sourceState?.attributes?.battery ?? null;
    const accuracy = state.attributes?.gps_accuracy ?? null;

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
      <div id="mm-person-avatar" style="width:54px;height:54px;border-radius:50%;overflow:hidden;border:3px solid ${zoneColor};flex-shrink:0;background:${isDark ? '#2c2c2e' : '#e0e0e0'};display:flex;align-items:center;justify-content:center;cursor:pointer;" title="Fly to ${name}">
        ${picUrl ? `<img src="${picUrl}" style="width:100%;height:100%;object-fit:cover;" alt="${name}">` : `<span style="font-size:22px;font-weight:700;color:${zoneColor};">${(name[0]||'?').toUpperCase()}</span>`}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:18px;font-weight:700;letter-spacing:-0.3px;">${name}</div>
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
    addRow('Coordinates', `${lat.toFixed(5)}, ${lng.toFixed(5)}`);

    // Geocode placeholder
    const geoRow = document.createElement('div');
    geoRow.className = 'mm-info-row';
    geoRow.innerHTML = `<span class="mm-info-label">Address</span><span class="mm-info-value" style="color:${subCol};font-style:italic;">Loading…</span>`;
    infoWrap.appendChild(geoRow);

    popup.appendChild(header);
    popup.appendChild(infoWrap);

    // ── Family members section ────────────────────────────────────
    const members = Array.isArray(this._config?.family_members) ? this._config.family_members : [];
    if (members.length > 0) {
      const divider = document.createElement('div');
      divider.style.cssText = `margin:0 20px;height:1px;background:${rowBorder};`;
      popup.appendChild(divider);

      const familySection = document.createElement('div');
      familySection.style.cssText = 'padding:12px 20px 16px;';

      const sectionHead = document.createElement('div');
      sectionHead.style.cssText = `font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${subCol};margin-bottom:10px;`;
      sectionHead.textContent = 'Sharing';
      familySection.appendChild(sectionHead);

      const memberRows = document.createElement('div');
      memberRows.style.cssText = 'display:flex;flex-direction:column;gap:0;';

      members.forEach((entityId, i) => {
        const mState  = this._hass?.states[entityId];
        if (!mState) return;
        const mName   = mState.attributes?.friendly_name || entityId;
        const mPicUrl = mState.attributes?.entity_picture || '';
        const mZone   = this._getZone(mState);
        const mColor  = mZone === 'home' ? '#34C759' : mZone === 'not_home' ? '#FF9500' : '#AF52DE';
        const mLat    = parseFloat(mState.attributes?.latitude);
        const mLng    = parseFloat(mState.attributes?.longitude);
        const hasMPos = !isNaN(mLat) && !isNaN(mLng);
        const distStr = hasMPos ? this._distanceTo(lat, lng, mLat, mLng) : null;

        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;gap:12px;padding:10px 0;cursor:pointer;border-radius:10px;transition:background 0.15s;${i > 0 ? 'border-top:1px solid ' + rowBorder + ';' : ''}`;
        row.addEventListener('mouseenter', () => row.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)');
        row.addEventListener('mouseleave', () => row.style.background = 'transparent');

        const avatar = document.createElement('div');
        avatar.style.cssText = `width:38px;height:38px;border-radius:50%;overflow:hidden;border:2px solid ${mColor};flex-shrink:0;background:${isDark ? '#2c2c2e' : '#e0e0e0'};display:flex;align-items:center;justify-content:center;`;
        avatar.innerHTML = mPicUrl
          ? `<img src="${mPicUrl}" style="width:100%;height:100%;object-fit:cover;" alt="${mName}">`
          : `<span style="font-size:15px;font-weight:700;color:${mColor};">${(mName[0]||'?').toUpperCase()}</span>`;

        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';
        info.innerHTML = `<div style="font-size:14px;font-weight:600;color:${textCol};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${mName}</div>`;

        // Address placeholder + distance
        const addrLine = document.createElement('div');
        addrLine.style.cssText = `font-size:11px;color:${subCol};margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
        addrLine.textContent = 'Loading address…';
        info.appendChild(addrLine);

        if (hasMPos) {
          this._reverseGeocode(mLat, mLng, true).then(addr => {
            addrLine.textContent = addr;
          });
        } else {
          addrLine.textContent = 'Location unavailable';
        }

        const meta = document.createElement('div');
        meta.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;';
        if (distStr) {
          meta.innerHTML = `<span style="font-size:13px;font-weight:700;color:${textCol};">${distStr}</span>`;
        }
        // Chevron
        meta.innerHTML += `<svg viewBox="0 0 24 24" width="14" height="14" style="opacity:0.35;"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="${textCol}"/></svg>`;

        row.appendChild(avatar);
        row.appendChild(info);
        row.appendChild(meta);
        memberRows.appendChild(row);

        if (hasMPos) {
          row.addEventListener('click', (e) => {
            e.stopPropagation();
            this._closeAllOverlays();
            this._map.flyTo([mLat, mLng], parseInt(this._config.zoom_level) || 15, { duration: 1.4 });
          });
        }
      });

      familySection.appendChild(memberRows);
      popup.appendChild(familySection);
    }

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    this._activeOverlay = overlay;

    overlay.addEventListener('click', () => this._closeAllOverlays());
    popup.querySelector('#mm-popup-close').addEventListener('click', () => this._closeAllOverlays());
    popup.querySelector('#mm-person-avatar').addEventListener('click', () => {
      this._closeAllOverlays();
      this._map.flyTo([lat, lng], parseInt(this._config.zoom_level) || 15, { duration: 1.2 });
    });

    // Geocode async — own address
    this._reverseGeocode(lat, lng).then(addr => {
      const valEl = geoRow.querySelector('.mm-info-value');
      if (valEl) { valEl.textContent = addr; valEl.style.fontStyle = 'normal'; valEl.style.color = textCol; }
    });

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
        .toggle-item { display: flex; align-items: center; justify-content: space-between; padding: 11px 8px 11px 6px; border-bottom: 1px solid rgba(128,128,128,0.1); min-height: 48px; }
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
              <label>Device to track</label>
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
                <input type="radio" name="dist" id="dist_mixed"    value="mixed"    ${cfg.distance_unit==='mixed'    ? 'checked':''}><label for="dist_mixed">mi / m</label>
                <input type="radio" name="dist" id="dist_imperial" value="imperial" ${cfg.distance_unit==='imperial' ? 'checked':''}><label for="dist_imperial">mi / yd</label>
              </div>
            </div>
          </div>
        </div>

        <!-- Sharing -->
        <div>
          <div class="section-title">Sharing</div>
          <div class="hint" style="margin-bottom:6px;">Track people, devices or any entity with GPS coordinates. Tap a marker to see its current location, address and distance from you.</div>
          <div class="card-block">
            <div style="padding:10px 12px 0;">
              <input type="text" id="mm-family-search" placeholder="Filter entities…" style="width:100%;box-sizing:border-box;background:var(--secondary-background-color,rgba(0,0,0,0.06));color:var(--primary-text-color);border:1px solid rgba(128,128,128,0.2);border-radius:8px;padding:9px 12px;font-size:13px;font-family:inherit;background-image:none;">
            </div>
            <div class="toggle-list" id="mm-family-list" style="max-height:320px;overflow-y:auto;-webkit-overflow-scrolling:touch;">
              <!-- populated by JS -->
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

        <!-- Person Icon Size -->
        <div>
          <div class="section-title">Person Icon Size</div>
          <div class="card-block" style="padding:12px;">
            <div class="segmented">
              <input type="radio" name="person_icon_size" id="person_size_small"  value="small"  ${(cfg.person_icon_size||'medium')==='small'  ? 'checked' : ''}><label for="person_size_small">Small</label>
              <input type="radio" name="person_icon_size" id="person_size_medium" value="medium" ${(cfg.person_icon_size||'medium')==='medium' ? 'checked' : ''}><label for="person_size_medium">Medium</label>
              <input type="radio" name="person_icon_size" id="person_size_large"  value="large"  ${(cfg.person_icon_size||'medium')==='large'  ? 'checked' : ''}><label for="person_size_large">Large</label>
            </div>
          </div>
        </div>

      </div>`;

    this._setupListeners();
    this._buildFamilyList();
  }

  // ── Family member checklist ───────────────────────────────────────
  _buildFamilyList(filter) {
    const root   = this.shadowRoot;
    const listEl = root.getElementById('mm-family-list');
    if (!listEl || !this._hass) return;

    const cfg        = this._config || {};
    const selected   = Array.isArray(cfg.family_members) ? cfg.family_members : [];
    const mainEntity = cfg.person_entity || '';

    // All entities with GPS coords, excluding the main person
    const allWithGPS = Object.keys(this._hass.states).filter(e => {
      if (e === mainEntity) return false;
      const s = this._hass.states[e];
      return s?.attributes?.latitude && s?.attributes?.longitude;
    });

    // Selected entities in user-defined order first, then unselected alphabetically
    const selectedInOrder = selected.filter(e => allWithGPS.includes(e));
    const unselected      = allWithGPS.filter(e => !selected.includes(e)).sort((a, b) => a.localeCompare(b));
    const candidates      = [...selectedInOrder, ...unselected];

    const q        = (filter || '').toLowerCase();
    const filtered = q ? candidates.filter(e => {
      const n = (this._hass.states[e]?.attributes?.friendly_name || '').toLowerCase();
      return e.toLowerCase().includes(q) || n.includes(q);
    }) : candidates;

    const isDark = (this._config?.theme || 'dark') !== 'light';
    const sub    = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    const noEntities = `<div style="padding:16px;text-align:center;font-size:13px;color:${sub};">No entities with GPS coordinates found</div>`;

    // Clear and rebuild list entirely with DOM nodes (not innerHTML) to avoid any parsing issues
    listEl.innerHTML = '';

    if (!filtered.length) {
      listEl.innerHTML = noEntities;
      return;
    }

    filtered.forEach((entityId, i) => {
      const state      = this._hass.states[entityId];
      const name       = state?.attributes?.friendly_name || entityId;
      const picUrl     = state?.attributes?.entity_picture || '';
      const isSelected = selected.includes(entityId);
      const selIdx     = selected.indexOf(entityId);
      const zone       = (state?.state || '').toLowerCase();
      const zoneColor  = zone === 'home' ? '#34C759' : zone === 'not_home' ? '#FF9500' : '#AF52DE';

      // Row container
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;min-height:52px;padding:6px 12px 6px 4px;${i > 0 ? 'border-top:1px solid rgba(128,128,128,0.1);' : ''}`;

      // ── Up/Down buttons (only for selected) ──
      const btnWrap = document.createElement('div');
      btnWrap.style.cssText = 'display:flex;flex-direction:column;gap:1px;flex-shrink:0;margin-right:4px;';

      if (isSelected) {
        const canUp   = selIdx > 0;
        const canDown = selIdx < selected.length - 1;

        const mkBtn = (dir, enabled) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.title = dir === 'up' ? 'Move up' : 'Move down';
          btn.style.cssText = `display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:none;border-radius:5px;cursor:${enabled ? 'pointer' : 'default'};background:${enabled ? 'rgba(0,122,255,0.13)' : 'transparent'};color:${enabled ? '#007AFF' : 'rgba(128,128,128,0.25)'};padding:0;flex-shrink:0;`;
          btn.innerHTML = dir === 'up'
            ? `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 14l5-5 5 5z" fill="currentColor"/></svg>`
            : `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>`;
          if (!enabled) { btn.disabled = true; return btn; }
          btn.addEventListener('click', () => {
            let cur = Array.isArray(this._config.family_members) ? [...this._config.family_members] : [];
            const idx = cur.indexOf(entityId);
            if (idx === -1) return;
            if (dir === 'up'   && idx > 0)              { [cur[idx-1], cur[idx]] = [cur[idx], cur[idx-1]]; }
            if (dir === 'down' && idx < cur.length - 1) { [cur[idx], cur[idx+1]] = [cur[idx+1], cur[idx]]; }
            this._updateConfig('family_members', cur);
            this._buildFamilyList(root.getElementById('mm-family-search')?.value || '');
          });
          return btn;
        };

        btnWrap.appendChild(mkBtn('up',   canUp));
        btnWrap.appendChild(mkBtn('down', canDown));
      } else {
        // Spacer so unselected rows align with selected ones
        btnWrap.style.width = '28px';
      }
      row.appendChild(btnWrap);

      // ── Avatar ──
      const avatarEl = document.createElement('div');
      avatarEl.style.cssText = `width:32px;height:32px;border-radius:50%;overflow:hidden;border:2px solid ${zoneColor};flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${zoneColor}22;margin-right:10px;`;
      if (picUrl) {
        const img = document.createElement('img');
        img.src = picUrl; img.alt = name;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        img.onerror = () => { img.style.display = 'none'; };
        avatarEl.appendChild(img);
      } else {
        avatarEl.style.fontSize = '14px';
        avatarEl.style.fontWeight = '700';
        avatarEl.style.color = zoneColor;
        avatarEl.textContent = (name[0] || '?').toUpperCase();
      }
      row.appendChild(avatarEl);

      // ── Label ──
      const labelWrap = document.createElement('div');
      labelWrap.style.cssText = 'flex:1;min-width:0;margin-right:10px;';
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      nameEl.textContent = name;
      const idEl = document.createElement('div');
      idEl.style.cssText = `font-size:11px;color:${sub};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
      idEl.textContent = entityId;
      labelWrap.appendChild(nameEl);
      labelWrap.appendChild(idEl);
      row.appendChild(labelWrap);

      // ── Toggle switch ──
      const label = document.createElement('label');
      label.style.cssText = 'position:relative;width:51px;height:31px;flex-shrink:0;';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isSelected;
      checkbox.style.cssText = 'opacity:0;width:0;height:0;position:absolute;';
      checkbox.addEventListener('change', () => {
        let cur = Array.isArray(this._config.family_members) ? [...this._config.family_members] : [];
        if (checkbox.checked) { if (!cur.includes(entityId)) cur.push(entityId); }
        else { cur = cur.filter(x => x !== entityId); }
        this._updateConfig('family_members', cur);
        this._buildFamilyList(root.getElementById('mm-family-search')?.value || '');
      });
      const track = document.createElement('span');
      track.style.cssText = `position:absolute;inset:0;border-radius:31px;background:${isSelected ? '#34C759' : 'rgba(120,120,128,0.32)'};cursor:pointer;transition:background 0.25s;`;
      const thumb = document.createElement('span');
      thumb.style.cssText = `position:absolute;width:27px;height:27px;border-radius:50%;background:#fff;top:2px;left:${isSelected ? '22px' : '2px'};box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:left 0.25s;`;
      track.appendChild(thumb);
      label.appendChild(checkbox);
      label.appendChild(track);
      row.appendChild(label);

      listEl.appendChild(row);
    });
  }

  _setupListeners() {
    const root = this.shadowRoot;

    root.getElementById('person_entity').onchange  = e => this._updateConfig('person_entity',  e.target.value);
    if (root.getElementById('geocoded_entity')) root.getElementById('geocoded_entity').onchange = e => this._updateConfig('geocoded_entity', e.target.value);
    root.querySelectorAll('input[name="dist"]').forEach(r => r.onchange = () => this._updateConfig('distance_unit', r.value));
    root.getElementById('map_height').oninput     = e => this._updateConfig('map_height', parseInt(e.target.value) || 420);
    root.getElementById('zoom_level').oninput     = e => this._updateConfig('zoom_level',  parseInt(e.target.value) || 15);

    root.querySelectorAll('input[name="theme"]').forEach(r => r.onchange = () => this._updateConfig('theme', r.value));

    root.querySelectorAll('input[name="person_icon_size"]').forEach(r => r.onchange = () => this._updateConfig('person_icon_size', r.value));

    // Family member search filter
    const familySearch = root.getElementById('mm-family-search');
    if (familySearch) {
      familySearch.oninput = () => this._buildFamilyList(familySearch.value);
    }

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
    root.querySelectorAll('input[name="person_icon_size"]').forEach(r => r.checked = r.value === (cfg.person_icon_size || 'medium'));
    // Use setTimeout so the re-render doesn't destroy DOM mid-event (e.g. button click)
    setTimeout(() => this._buildFamilyList(), 0);
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
    description: 'Interactive OpenStreetMap card with person tracking.',
  });
}