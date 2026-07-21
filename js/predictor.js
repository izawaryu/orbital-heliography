document.addEventListener('DOMContentLoaded', () => {
  // --- SATELLITE CONFIGURATION & FALLBACK TLEs ---
  const SATELLITES = {
    '42063': {
      name: 'Sentinel-2B',
      noradId: '42063',
      tleLine1: '1 42063U 17012A   26201.55427083  .00000185  00000+0  54123-4 0  9997',
      tleLine2: '2 42063  98.5700 280.1250 0001150 102.3450 257.8000 14.30825000489435'
    },
    '40697': {
      name: 'Sentinel-2A',
      noradId: '40697',
      tleLine1: '1 40697U 15028A   26201.54321000  .00000150  00000+0  48900-4 0  9992',
      tleLine2: '2 40697  98.5700 275.4500 0001200  95.1200 265.1000 14.30825000571371'
    },
    '60989': {
      name: 'Sentinel-2C',
      noradId: '60989',
      tleLine1: '1 60989U 24160A   26201.56000000  .00000210  00000+0  61000-4 0  9991',
      tleLine2: '2 60989  98.5700 290.8000 0001100 110.5000 249.6000 14.30825000091332'
    }
  };

  let activeSatId = '42063'; // Default to Sentinel-2B
  let filterStrict = true; // Default to Strict Intercept Window (>=75 deg, 9AM-3PM local)
  let userLocation = {
    lat: 40.2514,
    lon: -74.0692,
    elevation: 35, // meters (Wayside, NJ default)
    name: 'Wayside, NJ (Default)'
  };
  let map, marker, footprintCircle;
  let countdownInterval = null;
  let activePasses = [];

  // --- INITIALIZE MAP ---
  const initMap = () => {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Default view at Wayside, NJ
    map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([userLocation.lat, userLocation.lon], 11);

    // Dark CartoDB tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Custom marker icon
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="background-color: var(--accent-cyan); width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px var(--accent-cyan);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    marker = L.marker([userLocation.lat, userLocation.lon], { icon: customIcon, draggable: true }).addTo(map);
    
    // Footprint circle (~120km horizon visibility radius for 10m LEO)
    footprintCircle = L.circle([userLocation.lat, userLocation.lon], {
      color: 'rgba(0, 240, 240, 0.35)',
      fillColor: 'rgba(0, 240, 240, 0.05)',
      fillOpacity: 0.2,
      weight: 1,
      dashArray: '4, 4',
      radius: 120000
    }).addTo(map);

    // Click map to select new ground location
    map.on('click', (e) => {
      updateLocation(e.latlng.lat, e.latlng.lng, `Lat: ${e.latlng.lat.toFixed(4)}, Lon: ${e.latlng.lng.toFixed(4)}`);
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      updateLocation(pos.lat, pos.lng, `Lat: ${pos.lat.toFixed(4)}, Lon: ${pos.lng.toFixed(4)}`);
    });
  };

  const updateLocation = (lat, lon, name = '') => {
    userLocation.lat = parseFloat(lat);
    userLocation.lon = parseFloat(lon);
    userLocation.name = name || `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;

    if (marker) marker.setLatLng([lat, lon]);
    if (footprintCircle) footprintCircle.setLatLng([lat, lon]);

    const coordsDisplay = document.getElementById('selected-coords-display');
    if (coordsDisplay) {
      coordsDisplay.textContent = `${userLocation.lat.toFixed(4)}°, ${userLocation.lon.toFixed(4)}°`;
    }

    calculatePasses();
  };

  // --- CELESTRAK LIVE TLE FETCHING ---
  const fetchLiveTLE = async (noradId) => {
    try {
      const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=TLE`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('CelesTrak response not ok');
      const text = await response.text();
      const lines = text.trim().split('\n');
      if (lines.length >= 3) {
        SATELLITES[noradId].tleLine1 = lines[1].trim();
        SATELLITES[noradId].tleLine2 = lines[2].trim();
        console.log(`Updated live TLE for ${SATELLITES[noradId].name} from CelesTrak`);
      }
    } catch (e) {
      console.warn(`Could not fetch live TLE for ${noradId}, using static fallback:`, e);
    }
  };

  // --- SGP4 PASS PREDICTION ENGINE (Ported from kuzuebiko.py) ---
  const calculatePasses = () => {
    if (typeof satellite === 'undefined') {
      console.error('satellite.js library not loaded');
      return;
    }

    const satObj = SATELLITES[activeSatId];
    if (!satObj) return;

    const satrec = satellite.twoline2satrec(satObj.tleLine1, satObj.tleLine2);
    
    const observerGd = {
      longitude: satellite.degreesToRadians(userLocation.lon),
      latitude: satellite.degreesToRadians(userLocation.lat),
      height: userLocation.elevation / 1000 // in km
    };

    const startTime = new Date();
    const passes = [];
    const searchDurationDays = 10; // Search across next 10 days
    const searchEnd = new Date(startTime.getTime() + searchDurationDays * 86400 * 1000);

    let curr = new Date(startTime.getTime());
    let inPass = false;
    let currentPass = null;

    // Step 1: Search across 10 days
    while (curr < searchEnd) {
      const positionAndVelocity = satellite.propagate(satrec, curr);
      if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
        const gmst = satellite.gstime(curr);
        const positionEcf = satellite.eciToEcf(positionAndVelocity.position, gmst);
        const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

        const elevationDeg = satellite.radiansToDegrees(lookAngles.elevation);
        const azimuthDeg = satellite.radiansToDegrees(lookAngles.azimuth);
        const distanceKm = lookAngles.rangeSat;

        if (elevationDeg > 0) {
          if (!inPass) {
            inPass = true;
            currentPass = {
              aos: new Date(curr.getTime()),
              los: null,
              tca: new Date(curr.getTime()),
              maxElev: elevationDeg,
              azAtMax: azimuthDeg,
              distAtMax: distanceKm
            };
          } else {
            if (elevationDeg > currentPass.maxElev) {
              currentPass.maxElev = elevationDeg;
              currentPass.tca = new Date(curr.getTime());
              currentPass.azAtMax = azimuthDeg;
              currentPass.distAtMax = distanceKm;
            }
          }
        } else {
          if (inPass) {
            inPass = false;
            currentPass.los = new Date(curr.getTime());
            
            // Refine peak TCA down to 1-second precision
            refinePassPeak(satrec, observerGd, currentPass);
            
            // Apply Filters:
            // 1. Peak elevation >= 75.0 degrees (if strict) or >= 10.0 degrees (if all)
            // 2. Local time at TCA between 9:00 AM and 3:00 PM (9 <= localHour < 15)
            const localHour = currentPass.tca.getHours(); // Local hour 0-23
            const matchesElev = filterStrict ? (currentPass.maxElev >= 75.0) : (currentPass.maxElev >= 10.0);
            const matchesTime = filterStrict ? (localHour >= 9 && localHour < 15) : true;

            if (matchesElev && matchesTime) {
              passes.push(currentPass);
            }
            currentPass = null;
          }
        }
      }
      curr = new Date(curr.getTime() + 45 * 1000); // 45s step
    }

    activePasses = passes;
    renderPassResults();
  };

  // Binary search refinement for exact TCA (ported from kuzuebiko.py time_step)
  const refinePassPeak = (satrec, observerGd, pass) => {
    let tStart = new Date(pass.tca.getTime() - 60 * 1000);
    let tEnd = new Date(pass.tca.getTime() + 60 * 1000);
    let bestTime = pass.tca;
    let bestElev = pass.maxElev;
    let bestAz = pass.azAtMax;
    let bestDist = pass.distAtMax;

    for (let t = tStart.getTime(); t <= tEnd.getTime(); t += 1000) {
      const d = new Date(t);
      const pv = satellite.propagate(satrec, d);
      if (pv.position && typeof pv.position !== 'boolean') {
        const gmst = satellite.gstime(d);
        const posEcf = satellite.eciToEcf(pv.position, gmst);
        const look = satellite.ecfToLookAngles(observerGd, posEcf);
        const el = satellite.radiansToDegrees(look.elevation);
        if (el > bestElev) {
          bestElev = el;
          bestTime = d;
          bestAz = satellite.radiansToDegrees(look.azimuth);
          bestDist = look.rangeSat;
        }
      }
    }

    pass.tca = bestTime;
    pass.maxElev = bestElev;
    pass.azAtMax = bestAz;
    pass.distAtMax = bestDist;

    // Evaluate single point in time: EXACT MOMENT 1 SECOND AFTER PEAK (TCA + 1s)
    const tcaPlus1 = new Date(bestTime.getTime() + 1000);
    const pv1 = satellite.propagate(satrec, tcaPlus1);
    if (pv1.position && typeof pv1.position !== 'boolean') {
      const gmst1 = satellite.gstime(tcaPlus1);
      const posEcf1 = satellite.eciToEcf(pv1.position, gmst1);
      const look1 = satellite.ecfToLookAngles(observerGd, posEcf1);
      const elev1 = satellite.radiansToDegrees(look1.elevation);
      const az1 = satellite.radiansToDegrees(look1.azimuth);
      const dist1 = look1.rangeSat;
      const geom1 = calculateHeliostatGeometry(tcaPlus1, az1, elev1);

      pass.targetMoment = {
        time: tcaPlus1,
        elev: elev1,
        az: az1,
        dist: dist1,
        geom: geom1
      };
    } else {
      pass.targetMoment = {
        time: tcaPlus1,
        elev: bestElev,
        az: bestAz,
        dist: bestDist,
        geom: calculateHeliostatGeometry(tcaPlus1, bestAz, bestElev)
      };
    }
  };

  // --- HELIOSTATIC REFLECTION GEOMETRY (kuzuebiko.py bisect_vectors) ---
  const calculateHeliostatGeometry = (tcaDate, satAz, satElev) => {
    if (typeof SunCalc === 'undefined') {
      const sunAz = (satAz + 180) % 360;
      const sunElev = 45;
      const mirrorAz = (sunAz + satAz) / 2;
      const mirrorTilt = (sunElev + satElev) / 4;
      return { sunAz: sunAz.toFixed(1), sunElev: sunElev.toFixed(1), mirrorAz: mirrorAz.toFixed(1), mirrorTilt: mirrorTilt.toFixed(1) };
    }

    const sunPos = SunCalc.getPosition(tcaDate, userLocation.lat, userLocation.lon);
    const sunElev = sunPos.altitude * (180 / Math.PI);
    const sunAz = (sunPos.azimuth * (180 / Math.PI) + 180) % 360; // 0=North

    // 3D Unit vectors (kuzuebiko.py light_satellite)
    const toRad = Math.PI / 180;
    const S = [
      Math.cos(sunElev * toRad) * Math.sin(sunAz * toRad),
      Math.cos(sunElev * toRad) * Math.cos(sunAz * toRad),
      Math.sin(sunElev * toRad)
    ];

    const Sat = [
      Math.cos(satElev * toRad) * Math.sin(satAz * toRad),
      Math.cos(satElev * toRad) * Math.cos(satAz * toRad),
      Math.sin(satElev * toRad)
    ];

    // Bisector vector M = (S + Sat) / norm(S + Sat)
    const M = [S[0] + Sat[0], S[1] + Sat[1], S[2] + Sat[2]];
    const lenM = Math.sqrt(M[0] * M[0] + M[1] * M[1] + M[2] * M[2]);
    const normM = [M[0] / lenM, M[1] / lenM, M[2] / lenM];

    const mirrorElev = Math.asin(normM[2]) * (180 / Math.PI);
    const mirrorAz = (Math.atan2(normM[0], normM[1]) * (180 / Math.PI) + 360) % 360;

    return {
      sunAz: sunAz.toFixed(1),
      sunElev: sunElev.toFixed(1),
      mirrorAz: mirrorAz.toFixed(1),
      mirrorTilt: mirrorElev.toFixed(1)
    };
  };

  // --- RENDER TELEMETRY DASHBOARD ---
  const renderPassResults = () => {
    const nextPass = activePasses[0];
    const countdownEl = document.getElementById('countdown-display');
    const satNameDisplay = document.getElementById('active-sat-name');
    const tcaDisplay = document.getElementById('tca-time-display');
    const maxElevDisplay = document.getElementById('max-elev-display');
    const azDisplay = document.getElementById('azimuth-display');
    const distDisplay = document.getElementById('distance-display');

    const sunAzEl = document.getElementById('sun-az-display');
    const mirrorAzEl = document.getElementById('mirror-az-display');
    const mirrorTiltEl = document.getElementById('mirror-tilt-display');

    if (satNameDisplay) satNameDisplay.textContent = SATELLITES[activeSatId].name;

    if (!nextPass) {
      if (countdownEl) countdownEl.textContent = 'NO PASSES FOUND';
      if (tcaDisplay) tcaDisplay.textContent = 'N/A';
      return;
    }

    if (tcaDisplay) tcaDisplay.textContent = formatDate(nextPass.tca);
    if (maxElevDisplay) maxElevDisplay.textContent = `${nextPass.maxElev.toFixed(1)}°`;
    if (azDisplay) azDisplay.textContent = `${nextPass.azAtMax.toFixed(1)}°`;
    if (distDisplay) distDisplay.textContent = `${Math.round(nextPass.distAtMax)} km`;

    // Solar Reflection Geometry
    const geom = calculateHeliostatGeometry(nextPass.tca, nextPass.azAtMax, nextPass.maxElev);
    if (sunAzEl) sunAzEl.textContent = `${geom.sunAz}° / ${geom.sunElev}°`;
    if (mirrorAzEl) mirrorAzEl.textContent = `${geom.mirrorAz}°`;
    if (mirrorTiltEl) mirrorTiltEl.textContent = `${geom.mirrorTilt}°`;

    // Start Live Countdown
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      const now = new Date().getTime();
      const diff = nextPass.tca.getTime() - now;

      if (diff <= 0) {
        if (countdownEl) countdownEl.textContent = 'PASS IN PROGRESS / TRANSIT';
      } else {
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        
        const pad = (n) => String(n).padStart(2, '0');
        if (countdownEl) {
          countdownEl.textContent = `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
        }
      }
    }, 1000);

    // Render Table of Passes
    renderPassesTable();
  };

  const renderPassesTable = () => {
    const tableBody = document.getElementById('passes-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (activePasses.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--accent-gold); padding: 1.5rem 1rem;">
            No passes matching <strong>Peak Elev ≥ 75°</strong> between <strong>9:00 AM – 3:00 PM Local</strong> found in next 10 days.<br>
            <button id="switch-all-passes-btn" style="margin-top: 0.75rem; background: rgba(0,240,240,0.12); border: 1px dashed var(--accent-cyan); color: var(--accent-cyan); padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; font-family: var(--font-mono); font-size: 0.75rem;">
              View All Passes (≥10° Elev)
            </button>
          </td>
        </tr>
      `;

      const switchBtn = document.getElementById('switch-all-passes-btn');
      if (switchBtn) {
        switchBtn.addEventListener('click', () => {
          const allBtn = document.getElementById('filter-all-btn');
          if (allBtn) allBtn.click();
        });
      }
      return;
    }

    activePasses.forEach((p, idx) => {
      const tr = document.createElement('tr');
      const targetTime = (p.targetMoment && p.targetMoment.time) ? p.targetMoment.time : new Date(p.tca.getTime() + 1000);
      const dateStr = targetTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = targetTime.toLocaleTimeString('en-US', { hour12: false });
      
      const elevVal = p.targetMoment ? p.targetMoment.elev.toFixed(1) : p.maxElev.toFixed(1);
      const azVal = p.targetMoment ? p.targetMoment.az.toFixed(1) : p.azAtMax.toFixed(1);
      const distVal = p.targetMoment ? Math.round(p.targetMoment.dist) : Math.round(p.distAtMax);
      const mirrorVal = (p.targetMoment && p.targetMoment.geom) 
        ? `Az ${p.targetMoment.geom.mirrorAz}° / Tilt ${p.targetMoment.geom.mirrorTilt}°` 
        : '--';

      tr.innerHTML = `
        <td>#${idx + 1}</td>
        <td>${dateStr} ${timeStr} UTC</td>
        <td><strong style="color: var(--accent-cyan);">${elevVal}°</strong></td>
        <td>${azVal}°</td>
        <td style="color: var(--accent-gold); font-size: 0.78rem; font-family: var(--font-mono);">${mirrorVal}</td>
        <td>${distVal} km</td>
      `;
      tableBody.appendChild(tr);
    });
  };

  const formatDate = (d) => {
    return d.toUTCString().replace('GMT', 'UTC');
  };

  // --- ADDRESS SEARCH (Nominatim Geocoder) ---
  const searchBtn = document.getElementById('search-addr-btn');
  const searchInput = document.getElementById('search-addr-input');

  if (searchBtn && searchInput) {
    const handleSearch = async () => {
      const q = searchInput.value.trim();
      if (!q) return;

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.length > 0) {
          const first = data[0];
          const lat = parseFloat(first.lat);
          const lon = parseFloat(first.lon);
          map.setView([lat, lon], 12);
          updateLocation(lat, lon, first.display_name.split(',')[0]);
        } else {
          alert('Location not found. Please try another search term or click on the map.');
        }
      } catch (e) {
        console.error('Geocoding error:', e);
      }
    };

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
  }

  // --- SATELLITE SELECTION BUTTONS ---
  const satBtns = document.querySelectorAll('.sat-btn');
  satBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      satBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSatId = btn.getAttribute('data-sat-id');
      
      // Fetch fresh TLE in background & recalculate
      fetchLiveTLE(activeSatId).then(() => {
        calculatePasses();
      });
    });
  });

  // --- PASS FILTER BUTTONS ---
  const filterStrictBtn = document.getElementById('filter-strict-btn');
  const filterAllBtn = document.getElementById('filter-all-btn');

  if (filterStrictBtn && filterAllBtn) {
    filterStrictBtn.addEventListener('click', () => {
      filterStrictBtn.classList.add('active');
      filterAllBtn.classList.remove('active');
      filterStrict = true;
      calculatePasses();
    });

    filterAllBtn.addEventListener('click', () => {
      filterAllBtn.classList.add('active');
      filterStrictBtn.classList.remove('active');
      filterStrict = false;
      calculatePasses();
    });
  }

  // INITIAL LOAD
  initMap();
  fetchLiveTLE(activeSatId).then(() => {
    calculatePasses();
  });
});
