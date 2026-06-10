/* ── Type configuration ─────────────────────────────────────── */
const TYPES = {
  copy_shop:     { label: 'Copy Shop',    color: '#388bfd' },
  library:       { label: 'Bibliothek',   color: '#bc8cff' },
  office_supply: { label: 'Bürobedarf',   color: '#d29922' },
  hotel:         { label: 'Hotel',        color: '#f778ba' },
  university:    { label: 'Universität',  color: '#39d353' },
  pharmacy:      { label: 'Apotheke',     color: '#f85149' },
  general:       { label: 'Allgemein',    color: '#8b949e' },
};

const STATUS_COLOR = { active: '#3fb950', inactive: '#484f58' };

const PRINTER_ICON_PATH = 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z';

/* ── Settings ────────────────────────────────────────────────── */
const SETTINGS_KEY = 'printmap-settings';

const TILES = {
  dark:  { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',  subdomains: 'abcd' },
  light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', subdomains: 'abcd' },
  osm:   { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',              subdomains: 'abc'  },
};

const CLUSTER_RADIUS = { tight: 25, medium: 50, loose: 90 };

const SETTINGS_DEFAULTS = { theme: 'dark', tileStyle: 'dark', clusterRadius: 'medium' };

function loadSettings() {
  try {
    return { ...SETTINGS_DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch { return { ...SETTINGS_DEFAULTS }; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

const settings = loadSettings();

/* ── Apply theme immediately (before paint) ─────────────────── */
document.documentElement.dataset.theme = settings.theme;

/* ── Map init ────────────────────────────────────────────────── */
const map = L.map('map', { center: [51.9607, 7.6261], zoom: 13, zoomControl: false });

L.control.zoom({ position: 'bottomright' }).addTo(map);

function makeTileLayer(style) {
  const t = TILES[style];
  return L.tileLayer(t.url, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
    subdomains: t.subdomains,
    maxZoom: 19,
  });
}

let currentTileLayer = makeTileLayer(settings.tileStyle).addTo(map);

/* ── Marker cluster ──────────────────────────────────────────── */
let cluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  maxClusterRadius: CLUSTER_RADIUS[settings.clusterRadius],
  chunkedLoading: true,
});
map.addLayer(cluster);

/* ── State ───────────────────────────────────────────────────── */
let allPrinters = [];
let activeFilters = { access: 'all', search: '' };
let markerMap = new Map();
let selectedId = null;

/* ── API ─────────────────────────────────────────────────────── */
async function loadPrinters() {
  const res = await fetch('data/printers.json');
  allPrinters = await res.json();
  applyFilters();
}

/* ── Marker icon ─────────────────────────────────────────────── */
function makeIcon(printer) {
  const cfg   = TYPES[printer.type] || TYPES.general;
  const color = printer.status === 'active' ? cfg.color : '#30363d';
  const cls   = printer.status !== 'active' ? ' inactive' : '';

  return L.divIcon({
    className: '',
    html: `<div class="map-marker${cls}" style="background:${color}">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" width="14" height="14"
           style="transform:rotate(45deg)">
        <path d="${PRINTER_ICON_PATH}"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
}

/* ── Popup HTML ──────────────────────────────────────────────── */
function makePopup(p) {
  const cfg         = TYPES[p.type] || TYPES.general;
  const statusColor = STATUS_COLOR[p.status] || STATUS_COLOR.inactive;
  const address     = [p.street, p.house_number].filter(Boolean).join(' ');
  const location    = [address, p.zip, p.district].filter(Boolean).join(', ');
  const mapsUrl     = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location + ', Münster')}`;

  const row = (icon, text) => text ? `<div class="popup-row">${icon}<span>${text}</span></div>` : '';

  const iconMonitor  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
  const iconHome     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  const iconUser     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const iconClock    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  const iconPhone    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const iconInfo     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  const accessBadge = p.public_access
    ? '<span class="badge badge-public">Öffentlich</span>'
    : '<span class="badge badge-private">Intern</span>';

  return `<div class="popup-body">
    <div class="popup-name">${p.name}</div>
    <div class="popup-address">${location || '–'}</div>
    <div class="printer-meta" style="margin-bottom:8px">
      <span class="badge" style="background:${cfg.color}22;color:${cfg.color}">${cfg.label}</span>
      <span class="badge" style="background:${statusColor}22;color:${statusColor}">${p.status === 'active' ? 'Aktiv' : 'Inaktiv'}</span>
      ${accessBadge}
    </div>
    ${row(iconMonitor, [p.model, p.serial_number].filter(Boolean).join(' · '))}
    ${row(iconHome,    p.room)}
    ${row(iconUser,    p.contact_name)}
    ${row(iconClock,   p.opening_hours)}
    ${row(iconPhone,   p.phone)}
    ${row(iconInfo,    p.notes)}
    <div class="popup-actions">
      <a class="popup-btn" href="${mapsUrl}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Route
      </a>
    </div>
  </div>`;
}

/* ── Render markers ──────────────────────────────────────────── */
function renderMarkers(printers) {
  cluster.clearLayers();
  markerMap.clear();

  printers
    .filter(p => p.lat != null && p.lng != null)
    .forEach(p => {
      const marker = L.marker([p.lat, p.lng], { icon: makeIcon(p) });
      marker.bindPopup(makePopup(p), { maxWidth: 320 });
      marker.on('click', () => selectPrinter(p.id, false));
      markerMap.set(p.id, marker);
    });

  cluster.addLayers([...markerMap.values()]);
}

/* ── Render sidebar list ─────────────────────────────────────── */
function renderList(printers) {
  const list = document.getElementById('printerList');
  list.innerHTML = printers.map(p => {
    const cfg       = TYPES[p.type] || TYPES.general;
    const dotColor  = p.status === 'active' ? STATUS_COLOR.active : STATUS_COLOR.inactive;
    const address   = [p.street, p.house_number].filter(Boolean).join(' ');
    const sub       = [address, p.district].filter(Boolean).join(' · ');
    const noCoords  = p.lat == null ? '<span class="no-coords">nicht kartiert</span>' : '';
    const accessBadge = p.public_access
      ? '<span class="badge badge-public">Öffentlich</span>'
      : '<span class="badge badge-private">Intern</span>';

    return `<li class="printer-item${selectedId === p.id ? ' selected' : ''}" role="listitem" data-id="${p.id}">
      <span class="printer-dot" style="background:${dotColor}"></span>
      <div class="printer-info">
        <div class="printer-name">${p.name}</div>
        <div class="printer-address">${sub || '–'}</div>
        <div class="printer-meta">
          <span class="badge" style="background:${cfg.color}22;color:${cfg.color}">${cfg.label}</span>
          ${accessBadge}
          ${noCoords}
        </div>
      </div>
    </li>`;
  }).join('');

  list.querySelectorAll('.printer-item').forEach(el => {
    el.addEventListener('click', () => selectPrinter(Number(el.dataset.id), true));
  });
}

/* ── Selection ───────────────────────────────────────────────── */
function selectPrinter(id, flyTo) {
  selectedId = id;
  document.querySelectorAll('.printer-item').forEach(el => {
    el.classList.toggle('selected', Number(el.dataset.id) === id);
  });
  document.querySelector(`.printer-item[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  const marker = markerMap.get(id);
  if (!marker) return;

  if (flyTo) {
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 16), { duration: 0.6 });
    setTimeout(() => marker.openPopup(), 650);
  } else {
    marker.openPopup();
  }
}

/* ── Filtering ───────────────────────────────────────────────── */
function applyFilters() {
  const { access, search } = activeFilters;
  const q = search.toLowerCase().trim();

  const filtered = allPrinters.filter(p => {
    if (access === 'public'  && !p.public_access) return false;
    if (access === 'private' &&  p.public_access) return false;
    if (q) {
      const hay = [p.name, p.street, p.district].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  renderMarkers(filtered);
  renderList(filtered);
  updateStats(filtered);
}

/* ── Stats ───────────────────────────────────────────────────── */
function updateStats(filtered) {
  const list = filtered ?? allPrinters;
  document.getElementById('statsCount').textContent  = list.length;
  document.getElementById('statsMapped').textContent = list.filter(p => p.lat != null).length;
}

/* ── Event wiring: filters ───────────────────────────────────── */
document.getElementById('search').addEventListener('input', e => {
  activeFilters.search = e.target.value;
  applyFilters();
});

document.getElementById('accessFilter').addEventListener('click', e => {
  const btn = e.target.closest('.chip[data-access]');
  if (!btn) return;
  document.querySelectorAll('#accessFilter .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  activeFilters.access = btn.dataset.access;
  applyFilters();
});

/* ── Map popup sync ──────────────────────────────────────────── */
map.on('popupopen', e => {
  const marker = e.popup._source;
  if (!marker) return;
  for (const [id, m] of markerMap) {
    if (m === marker) { selectedId = id; break; }
  }
  document.querySelectorAll('.printer-item').forEach(el => {
    el.classList.toggle('selected', Number(el.dataset.id) === selectedId);
  });
  document.querySelector(`.printer-item[data-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});

map.on('popupclose', () => {
  selectedId = null;
  document.querySelectorAll('.printer-item').forEach(el => el.classList.remove('selected'));
});

/* ── Settings panel ──────────────────────────────────────────── */
const settingsPanel = document.getElementById('settingsPanel');

document.getElementById('settingsBtn').addEventListener('click', () => {
  settingsPanel.classList.add('open');
});

document.getElementById('settingsClose').addEventListener('click', () => {
  settingsPanel.classList.remove('open');
});

function syncToggleGroup(containerId, value) {
  document.querySelectorAll(`#${containerId} .tgl`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

/* theme */
syncToggleGroup('themeToggle', settings.theme);
document.getElementById('themeToggle').addEventListener('click', e => {
  const btn = e.target.closest('.tgl');
  if (!btn) return;
  settings.theme = btn.dataset.value;
  document.documentElement.dataset.theme = settings.theme;
  saveSettings(settings);
  syncToggleGroup('themeToggle', settings.theme);
});

/* tile style */
syncToggleGroup('tileToggle', settings.tileStyle);
document.getElementById('tileToggle').addEventListener('click', e => {
  const btn = e.target.closest('.tgl');
  if (!btn || btn.dataset.value === settings.tileStyle) return;
  settings.tileStyle = btn.dataset.value;
  map.removeLayer(currentTileLayer);
  currentTileLayer = makeTileLayer(settings.tileStyle).addTo(map);
  saveSettings(settings);
  syncToggleGroup('tileToggle', settings.tileStyle);
});

/* cluster radius */
syncToggleGroup('clusterToggle', settings.clusterRadius);
document.getElementById('clusterToggle').addEventListener('click', e => {
  const btn = e.target.closest('.tgl');
  if (!btn || btn.dataset.value === settings.clusterRadius) return;
  settings.clusterRadius = btn.dataset.value;

  map.removeLayer(cluster);
  cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    maxClusterRadius: CLUSTER_RADIUS[settings.clusterRadius],
    chunkedLoading: true,
  });
  map.addLayer(cluster);
  cluster.addLayers([...markerMap.values()]);

  saveSettings(settings);
  syncToggleGroup('clusterToggle', settings.clusterRadius);
});

/* ── Sidebar toggle ──────────────────────────────────────────── */
if (localStorage.getItem('sidebar-collapsed') === 'true') {
  document.body.classList.add('sidebar-collapsed');
}

document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('sidebar-collapsed', document.body.classList.contains('sidebar-collapsed'));
  setTimeout(() => map.invalidateSize(), 260);
});

/* ── User geolocation ────────────────────────────────────────── */
(function initGeolocation() {
  if (!navigator.geolocation) return;

  const userIcon = L.divIcon({
    className: '',
    html: '<div class="user-dot"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });

  let userMarker    = null;
  let accuracyCircle = null;

  function onPosition(pos) {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;

    if (!userMarker) {
      userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
        .bindPopup('<div style="font-size:13px;padding:2px 4px">Dein Standort</div>')
        .addTo(map);
      accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#388bfd',
        fillColor: '#388bfd',
        fillOpacity: 0.08,
        weight: 1,
        opacity: 0.4,
      }).addTo(map);
    } else {
      userMarker.setLatLng([lat, lng]);
      accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy);
    }
  }

  navigator.geolocation.watchPosition(onPosition, () => {}, {
    enableHighAccuracy: true,
    maximumAge: 30000,
    timeout: 10000,
  });
})();

/* ── Boot ────────────────────────────────────────────────────── */
loadPrinters();
