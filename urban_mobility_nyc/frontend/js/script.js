const API = 'http://127.0.0.1:5000';

// CHART.JS GLOBAL DEFAULTS
Chart.defaults.color       = '#5a6480';
Chart.defaults.font.family = 'DM Mono';
Chart.defaults.font.size   = 11;
const GRID_COLOR = 'rgba(255,255,255,0.04)';

// Map variables
let map;
let geojsonLayer;
let zoneLookup = {};   // location_id -> { name, borough }
let zoneByName = {};   // name -> location_id

// HELPERS
function fmt(n, prefix = '', suffix = '') {
  if (n === null || n === undefined) return '—';
  if (typeof n === 'number') {
    if (n >= 1_000_000) return prefix + (n / 1_000_000).toFixed(1) + 'M' + suffix;
    if (n >= 1_000)     return prefix + (n / 1_000).toFixed(1)     + 'K' + suffix;
    return prefix + n + suffix;
  }
  return prefix + n + suffix;
}

// HEALTH CHECK (/api/health)
async function checkHealth() {
  try {
    const data = await fetch(`${API}/api/health`).then(r => r.json());
    const dot  = document.getElementById('statusDot');
    const txt  = document.getElementById('statusText');
    if (data.database === 'connected') {
      dot.className   = 'dot';
      txt.textContent = 'DB CONNECTED';
    } else {
      dot.className   = 'dot error';
      txt.textContent = 'DB OFFLINE';
    }
  } catch {
    document.getElementById('statusDot').className    = 'dot error';
    document.getElementById('statusText').textContent = 'API OFFLINE';
  }
}

// KPI CARDS (/api/dashboard-summary)
async function loadKPIs() {
  try {
    const d = await fetch(`${API}/api/dashboard-summary`).then(r => r.json());
    document.getElementById('totalTrips').textContent   = fmt(d.total_trips);
    document.getElementById('avgFare').textContent      = fmt(d.avg_fare, '$');
    document.getElementById('avgDistance').textContent  = fmt(d.avg_distance, '', ' mi');
    document.getElementById('activeZones').textContent  = fmt(d.active_zones);
    document.getElementById('peakHour').textContent     = `${d.peak_hour}:00`;

    // Force conversion to number with parseFloat before formatting
    document.getElementById('totalRevenue').textContent = fmt(parseFloat(d.total_revenue), '$');

  } catch (e) { console.error('KPI error', e); }
}

//  HOURLY CHARTS (/api/hourly-trends) — 1 fetch, 3 charts 
async function loadCharts() {
  try {
    const data   = await fetch(`${API}/api/hourly-trends`).then(r => r.json());
    const labels = data.map(d => `${d.pickup_hour}h`);
    const trips  = data.map(d => d.trip_count);
    const speeds = data.map(d => d.avg_speed);
    const fares  = data.map(d => d.avg_fare);
    const maxT   = Math.max(...trips);

    // Bar: trips per hour
    new Chart(document.getElementById('hourlyChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Trips',
          data: trips,
          backgroundColor: trips.map(v =>
            `rgba(247,201,72,${(0.3 + 0.7 * v / maxT).toFixed(2)})`
          ),
          borderRadius: 3,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: GRID_COLOR } },
          y: { grid: { color: GRID_COLOR } }
        }
      }
    });

    // Line: avg speed per hour
    new Chart(document.getElementById('speedChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'MPH',
          data: speeds,
          borderColor: '#2dd4bf',
          backgroundColor: 'rgba(45,212,191,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#2dd4bf'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: GRID_COLOR } },
          y: { grid: { color: GRID_COLOR } }
        }
      }
    });

    // Line: avg fare per hour
    new Chart(document.getElementById('fareChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Avg Fare ($)',
          data: fares,
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167,139,250,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#a78bfa'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: GRID_COLOR } },
          y: {
            grid: { color: GRID_COLOR },
            ticks: { callback: v => '$' + v }
          }
        }
      }
    });

  } catch (e) { console.error('Chart error', e); }
}

// 4. BOROUGH STATS (/api/borough-stats) 1 fetch, table + donut
async function loadBorough() {
  try {
    const data     = await fetch(`${API}/api/borough-stats`).then(r => r.json());
    const maxTrips = Math.max(...data.map(d => d.trip_count || 0));

    document.getElementById('boroughTableBody').innerHTML = data.map(row => `
      <tr>
        <td style="color:var(--text);font-weight:500">${row.borough || '—'}</td>
        <td>${fmt(row.trip_count)}</td>
        <td style="color:#2dd4bf">${fmt(row.avg_fare, '$')}</td>
        <td>${row.avg_speed ? row.avg_speed + ' mph' : '—'}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:${Math.round((row.trip_count / maxTrips) * 100)}px;height:4px;background:#f7c948;border-radius:2px"></div>
            <span style="font-size:10px;color:#5a6480">${Math.round((row.trip_count / maxTrips) * 100)}%</span>
          </div>
        </td>
      </tr>
    `).join('');

    const COLORS = ['#f7c948', '#2dd4bf', '#3b82f6', '#a78bfa', '#ff4e4e', '#e8ff6e'];
    new Chart(document.getElementById('boroughChart'), {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.borough || 'Unknown'),
        datasets: [{
          data: data.map(d => d.trip_count),
          backgroundColor: COLORS,
          borderWidth: 2,
          borderColor: '#0d1420',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, padding: 16 } }
        }
      }
    });

  } catch (e) { console.error('Borough error', e); }
}

// ── 5. TOP ROUTES (/api/top-routes) ──────────────────────────────────────
async function loadRoutes() {
  try {
    const data = await fetch(`${API}/api/top-routes?limit=6`).then(r => r.json());
    const grid = document.getElementById('routesGrid');
    if (!grid) return;

    if (!data.length) {
      grid.innerHTML = '<p style="color:#5a6480;font-family:DM Mono;font-size:12px">No route data.</p>';
      return;
    }

    grid.innerHTML = data.map((route, i) => `
      <div class="route-card" style="animation-delay:${i * 0.06}s">
        <div class="route-zones">
          Zone <span>${route.pu_location_id}</span>
          <span class="route-arrow">&#8594;</span>
          Zone <span>${route.do_location_id}</span>
        </div>
        <div class="route-count">
          ${fmt(route.trip_count)}
          <span style="font-size:14px;color:#5a6480;margin-left:4px">trips</span>
        </div>
        <div class="route-meta">
          <div>Fare: <b>$${route.avg_fare}</b></div>
          <div>Dist: <b>${route.avg_distance} mi</b></div>
        </div>
      </div>
    `).join('');

  } catch (e) { console.error('Routes error', e); }
}

// ── 6. RANDOM INSIGHT (/api/random-insight) ──────────────────────────────
async function loadInsight() {
  document.getElementById('insightTitle').textContent = 'Loading...';
  document.getElementById('insightBody').textContent  = '—';
  try {
    const d = await fetch(`${API}/api/random-insight`).then(r => r.json());
    document.getElementById('insightTitle').textContent = d.title;
    document.getElementById('insightBody').textContent  =
      Object.entries(d.data).map(([k, v]) => `${k}: ${v}`).join(' · ');
  } catch {
    document.getElementById('insightTitle').textContent = 'Could not load insight';
    document.getElementById('insightBody').textContent  = 'API offline';
  }
}

// ── 7. MAP (/api/map-data + local GeoJSON) ───────────────────────────────
// Only 2 fetches: one API call + one local file.
// zoneLookup is built from GeoJSON properties — no extra API call needed.
async function loadMap() {
  try {
    map = L.map('map', { zoomControl: true }).setView([40.7128, -74.0060], 10);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB',
      maxZoom: 19
    }).addTo(map);

    // Fetch map-data API and GeoJSON file in parallel
    const [zoneStats, geojsonData] = await Promise.all([
      fetch(`${API}/api/map-data`).then(r => r.json()),
      fetch('data/taxi_zones.geojson').then(r => r.json())
    ]);

    // Build trip count lookup: location_id -> trip_count
    const tripLookup = {};
    zoneStats.forEach(d => tripLookup[d.location_id] = d.trip_count);
    const maxTrips = Math.max(...zoneStats.map(d => d.trip_count));

    // Render GeoJSON zones — supports all common NYC taxi GeoJSON property formats
    geojsonLayer = L.geoJSON(geojsonData, {
      style: feature => {
        const p     = feature.properties;
        const id    = p.LocationID || p.location_id || p.locationid || p.OBJECTID;
        const trips = tripLookup[id] || 0;
        const alpha = trips > 0 ? 0.15 + (trips / maxTrips) * 0.7 : 0.05;
        return {
          color: '#f7c948',
          weight: 0.8,
          opacity: 0.5,
          fillColor: trips > 0 ? '#f7c948' : '#2dd4bf',
          fillOpacity: alpha
        };
      },
      onEachFeature: (feature, layer) => {
        const p        = feature.properties;
        const zoneName = p.zone || p.Zone || p.zone_name || p.name || 'Unknown';
        const borough  = p.borough || p.Borough || '—';
        const id       = p.LocationID || p.location_id || p.locationid || p.OBJECTID || '—';
        const trips    = tripLookup[id] ? fmt(tripLookup[id]) : '—';

        // Build lookup tables for sidebar and search
        zoneLookup[id]       = { name: zoneName, borough };
        zoneByName[zoneName] = id;

        layer.bindPopup(`
          <div style="font-family:'DM Mono';padding:14px;background:#0d1420;border-radius:8px;min-width:200px;color:#e8eaf0">
            <div style="color:#f7c948;font-size:15px;font-weight:bold;margin-bottom:8px;border-bottom:1px solid #1a2332;padding-bottom:6px">${zoneName}</div>
            <div style="margin:4px 0;font-size:12px">${borough}</div>
            <div style="margin:4px 0;font-size:12px;color:#2dd4bf">Zone ID: ${id}</div>
            <div style="margin:4px 0;font-size:12px;color:#f7c948">Trips: ${trips}</div>
          </div>
        `);

        layer.on('mouseover', function () {
          this.setStyle({
            weight: 2,
            fillOpacity: Math.min((tripLookup[id] || 0) / maxTrips + 0.3, 0.95)
          });
        });
        layer.on('mouseout', function () { geojsonLayer.resetStyle(this); });
      }
    }).addTo(map);

    // Render sidebar using the same zoneStats — no extra fetch
    renderTopZonesSidebar(zoneStats);

  } catch (error) {
    console.error('Map error:', error);
    document.getElementById('map').innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#5a6480;font-family:DM Mono;font-size:13px">Map unavailable — check GeoJSON file path</div>';
  }
}

// Sidebar — uses data already fetched by loadMap(), no extra API call
function renderTopZonesSidebar(zoneStats) {
  const container = document.getElementById('topZonesList');
  if (!container) return;

  const top5 = [...zoneStats].sort((a, b) => b.trip_count - a.trip_count).slice(0, 5);

  container.innerHTML = top5.map(zone => {
    const info = zoneLookup[zone.location_id];
    const name = info ? info.name : `Zone ${zone.location_id}`;
    return `
      <div class="top-zone-item" onclick="focusMapOnZone(${zone.location_id})">
        <span class="zone-name">${name}</span>
        <span class="zone-count">${fmt(zone.trip_count)}</span>
      </div>
    `;
  }).join('');
}

// Focus and highlight a zone on the map by its location_id
window.focusMapOnZone = function (id) {
  if (!geojsonLayer) return;
  geojsonLayer.eachLayer(layer => {
    const p       = layer.feature.properties;
    const layerId = p.LocationID || p.location_id || p.locationid || p.OBJECTID;
    if (String(layerId) === String(id)) {
      map.fitBounds(layer.getBounds(), { padding: [60, 60] });
      layer.openPopup();
      layer.setStyle({ weight: 3, color: '#ffffff', fillOpacity: 0.85 });
      setTimeout(() => geojsonLayer.resetStyle(layer), 3000);
    }
  });
};

// SEARCH (/api/search) — lazy, fires only when user types
let searchTimeout;
const searchInput   = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

if (searchInput) {
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    const q = this.value.trim();
    if (q.length < 2) { searchResults.style.display = 'none'; return; }

    searchTimeout = setTimeout(async () => {
      try {
        // backend uses zone_name column, returns { id, name, borough }
        const results = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`).then(r => r.json());

        if (!results.length) {
          searchResults.innerHTML = '<div class="search-result-item" style="color:#5a6480">No results found</div>';
        } else {
          searchResults.innerHTML = results.map(item => `
            <div class="search-result-item" onclick="selectSearchResult(${item.id}, '${item.name.replace(/'/g, "\\'")}')">
              <span>${item.name}</span>
              <span class="search-result-borough">${item.borough}</span>
            </div>
          `).join('');
        }
        searchResults.style.display = 'block';
      } catch (e) { console.error('Search error', e); }
    }, 300);
  });
}

window.selectSearchResult = function (id, name) {
  searchInput.value           = name;
  searchResults.style.display = 'none';
  window.focusMapOnZone(id);
};

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap') && searchResults) {
    searchResults.style.display = 'none';
  }
});

// INIT all fetches run in parallel
(async function init() {
  await checkHealth();

  await Promise.all([
    loadKPIs(),       // /api/dashboard-summary
    loadCharts(),     // /api/hourly-trends  → 3 charts
    loadBorough(),    // /api/borough-stats  → table + donut
    loadRoutes(),     // /api/top-routes
    loadInsight(),    // /api/random-insight
    loadMap()         // /api/map-data + data/taxi_zones.geojson
  ]);
})();