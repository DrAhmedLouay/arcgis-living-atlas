/**
 * النواة البرمجية لأطلس ArcGIS الحي
 * ArcGIS Living Atlas Engine (Powered by Esri Leaflet)
 * Includes: Comprehensive Basemap Switcher & Satellite Imagery Calibration / Georeferencing Studio
 */

document.addEventListener('DOMContentLoaded', () => {
  // Access curated catalog datasets from global window
  const ATLAS_CATEGORIES = window.ATLAS_CATEGORIES || [];
  const ATLAS_LAYERS = window.ATLAS_LAYERS || [];
  const ATLAS_BOOKMARKS = window.ATLAS_BOOKMARKS || [];

  // Global State
  const state = {
    map: null,
    currentBasemapId: 'dark-gray',
    isBasemapVisible: true,
    basemapLayers: {},
    layersMap: new Map(), // layerId -> L.esri.featureLayer instance
    layersMetadata: new Map(),
    activeCategory: 'iraq',
    searchQuery: '',
    customLayersCount: 0,
    archaeologyMarkers: new Map(),
    archCategoryFilter: 'all',
    archSearchQuery: ''
  };

  // 1. Initialize Leaflet Map (Centered on Iraq)
  const map = L.map('viewDiv', {
    center: [33.22, 43.68], // Iraq centroid
    zoom: 6,
    minZoom: 2,
    maxZoom: 19,
    zoomControl: false,
    attributionControl: false
  });
  state.map = map;

  // Add Custom Position Controls
  L.control.zoom({ position: 'topleft' }).addTo(map);
  L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(map);

  // 2. Initialize Extended Public Keyless Basemaps
  state.basemapLayers = {
    'dark-gray': L.layerGroup([
      L.esri.basemapLayer('DarkGray'),
      L.esri.basemapLayer('DarkGrayLabels')
    ]),
    'satellite': L.esri.basemapLayer('Imagery'),
    'hybrid': L.layerGroup([
      L.esri.basemapLayer('Imagery'),
      L.esri.basemapLayer('ImageryLabels')
    ]),
    'streets': L.esri.basemapLayer('Streets'),
    'osm': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }),
    'topo': L.esri.basemapLayer('Topographic'),
    'light-gray': L.layerGroup([
      L.esri.basemapLayer('Gray'),
      L.esri.basemapLayer('GrayLabels')
    ]),
    'oceans': L.esri.basemapLayer('Oceans')
  };

  // Add default Dark Gray basemap
  state.basemapLayers['dark-gray'].addTo(map);

  // 3. Setup Coordinate & Zoom Tracker
  const latSpan = document.getElementById('coordLat');
  const lonSpan = document.getElementById('coordLon');
  const zoomSpan = document.getElementById('zoomLevel');
  const scaleSpan = document.getElementById('mapScale');

  map.on('mousemove', (e) => {
    if (latSpan) latSpan.textContent = e.latlng.lat.toFixed(4);
    if (lonSpan) lonSpan.textContent = e.latlng.lng.toFixed(4);
  });

  map.on('zoomend', () => {
    if (zoomSpan) zoomSpan.textContent = map.getZoom();
    if (scaleSpan) scaleSpan.textContent = 'مستوى ' + map.getZoom();
  });

  // 4. Setup Search Geocoder (if available)
  try {
    if (L.esri && L.esri.Geocoding) {
      const searchControl = L.esri.Geocoding.geosearch({
        position: 'topleft',
        placeholder: 'ابحث عن مدينة، عنوان، أو معلم...',
        useMapBounds: false
      }).addTo(map);
      
      const searchContainer = document.getElementById('geosearchContainer');
      if (searchContainer) {
        searchContainer.appendChild(searchControl.getContainer());
      }
    }
  } catch (err) {
    console.warn('Geocoding container notice:', err);
  }

  // 5. Register metadata
  ATLAS_LAYERS.forEach(meta => {
    state.layersMetadata.set(meta.id, meta);
  });

  // 6. Setup All Engines & Renderers
  renderCategoryPills();
  renderCatalogList();
  renderBookmarks();
  setupBasemapPicker();
  setupMeasurementTools();
  setupSatelliteCalibrationEngine(map);
  setupCustomLayerAdder();
  setupUIEvents();

  // 7. Load Default Active Layers
  ATLAS_LAYERS.filter(l => l.defaultVisible).forEach(layerMeta => {
    toggleLayer(layerMeta.id, true);
  });

  updateActiveCountBadge();
  showToast('تم تحميل أطلس العراق بنجاح', 'success');

  /**
   * Switch Basemap with UI synchronization
   */
  function switchBasemap(id) {
    if (!state.basemapLayers[id]) return;

    // Remove active basemap
    if (state.basemapLayers[state.currentBasemapId]) {
      map.removeLayer(state.basemapLayers[state.currentBasemapId]);
    }

    // Add new basemap if currently visible
    if (state.isBasemapVisible !== false) {
      state.basemapLayers[id].addTo(map);
    }
    state.currentBasemapId = id;

    // Bring calibration overlay to front if exists
    if (window.calibOverlayInstance && map.hasLayer(window.calibOverlayInstance)) {
      window.calibOverlayInstance.bringToFront();
    }

    // Update Quick Bar buttons
    document.querySelectorAll('.quick-basemap-btn').forEach(btn => {
      const bmid = btn.getAttribute('data-bm');
      btn.classList.toggle('active-quick-bm', bmid === id);
      btn.classList.toggle('text-white', bmid === id);
      btn.classList.toggle('bg-blue-600', bmid === id);
      btn.classList.toggle('text-slate-300', bmid !== id);
    });

    // Update Modal buttons
    document.querySelectorAll('.basemap-option').forEach(btn => {
      const bmid = btn.getAttribute('data-basemap');
      btn.classList.toggle('ring-2', bmid === id);
      btn.classList.toggle('ring-blue-500', bmid === id);
      btn.classList.toggle('border-transparent', bmid === id);
      btn.classList.toggle('bg-slate-700', bmid === id);
    });

    showToast(`تم تبديل خريطة الأساس`, 'info');
  }

  /**
   * Setup Basemap Picker (Modal + Quick Bar)
   */
  function setupBasemapPicker() {
    const basemaps = [
      { id: 'streets', name: 'خريطة عادية (شوارع)', icon: 'fa-road', desc: 'شوارع ومعالم ومدن' },
      { id: 'satellite', name: 'فضائية نقية (قمر صناعي)', icon: 'fa-satellite', desc: 'صور عالية الدقة بدون أسماء' },
      { id: 'hybrid', name: 'فضائية هجينة', icon: 'fa-earth-americas', desc: 'صور فضائية مع أسماء وحدود' },
      { id: 'osm', name: 'OpenStreetMap', icon: 'fa-map', desc: 'خريطة مفتوحة تفصيلية' },
      { id: 'topo', name: 'طبوغرافية وتضاريس', icon: 'fa-mountain', desc: 'خطوط الارتفاع والتضاريس' },
      { id: 'dark-gray', name: 'رمادي داكن للتحليل', icon: 'fa-moon', desc: 'خلفية داكنة لإبراز البيانات' },
      { id: 'light-gray', name: 'رمادي فاتح', icon: 'fa-sun', desc: 'خلفية واضحة للطباعة' },
      { id: 'oceans', name: 'محيطات وبحار', icon: 'fa-water', desc: 'بيانات الأعماق والهيدرولوجيا' }
    ];

    const container = document.getElementById('basemapGrid');
    if (container) {
      container.innerHTML = basemaps.map(bm => `
        <button 
          class="basemap-option p-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 flex flex-col items-center gap-1.5 transition-all ${bm.id === state.currentBasemapId ? 'ring-2 ring-blue-500 border-transparent bg-slate-700' : ''}"
          data-basemap="${bm.id}"
        >
          <div class="w-10 h-10 rounded-lg bg-slate-900/60 flex items-center justify-center text-blue-400">
            <i class="fa-solid ${bm.icon} text-lg"></i>
          </div>
          <span class="text-xs font-semibold text-slate-100">${bm.name}</span>
          <span class="text-[10px] text-slate-400 text-center leading-tight">${bm.desc}</span>
        </button>
      `).join('');

      container.querySelectorAll('.basemap-option').forEach(btn => {
        btn.addEventListener('click', () => {
          switchBasemap(btn.getAttribute('data-basemap'));
        });
      });
    }

    // Quick Basemap floating bar buttons
    document.querySelectorAll('.quick-basemap-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchBasemap(btn.getAttribute('data-bm'));
      });
    });
  }

  /**
   * Satellite Imagery & ECW Calibration & Georeferencing Studio Engine
   */
  function setupSatelliteCalibrationEngine(map) {
    const fileInput = document.getElementById('satelliteImageFileInput');
    const companionFileInput = document.getElementById('companionImageFileInput');
    const triggerUploadBtn = document.getElementById('triggerUploadBtn');
    const triggerCompanionUploadBtn = document.getElementById('triggerCompanionUploadBtn');
    const ecwDropZone = document.getElementById('ecwDropZone');
    const urlInput = document.getElementById('satelliteImageUrlInput');
    const loadUrlBtn = document.getElementById('loadFromUrlBtn');
    const sampleBtn = document.getElementById('loadSampleSatelliteBtn');
    const loadBaghdadEcwBtn = document.getElementById('loadBaghdadEcwBtn');
    const loadBasraEcwBtn = document.getElementById('loadBasraEcwBtn');
    const loadErbilEcwBtn = document.getElementById('loadErbilEcwBtn');
    const controlsContainer = document.getElementById('calibrationControlsContainer');
    const statusLabel = document.getElementById('calibImageStatus');

    // ECW Metadata Inspector Elements
    const ecwMetadataBox = document.getElementById('ecwMetadataBox');
    const ecwFileNameLabel = document.getElementById('ecwFileNameLabel');
    const ecwMetaBadge = document.getElementById('ecwMetaBadge');
    const ecwMetaDimensions = document.getElementById('ecwMetaDimensions');
    const ecwMetaBands = document.getElementById('ecwMetaBands');
    const ecwMetaProjection = document.getElementById('ecwMetaProjection');
    const ecwMetaResolution = document.getElementById('ecwMetaResolution');
    const ecwMetaLatRange = document.getElementById('ecwMetaLatRange');
    const ecwMetaLngRange = document.getElementById('ecwMetaLngRange');
    const gdalCommandText = document.getElementById('gdalCommandText');
    const copyGdalCmdBtn = document.getElementById('copyGdalCmdBtn');

    // Geometric controls
    const lockBtn = document.getElementById('toggleLockCalibBtn');
    const lockText = document.getElementById('lockBtnText');
    const fitToViewBtn = document.getElementById('fitToViewBtn');
    const nudgeUp = document.getElementById('nudgeUpBtn');
    const nudgeDown = document.getElementById('nudgeDownBtn');
    const nudgeLeft = document.getElementById('nudgeLeftBtn');
    const nudgeRight = document.getElementById('nudgeRightBtn');
    const nudgeStep = document.getElementById('nudgeStepSelect');

    const rotationSlider = document.getElementById('calibRotationSlider');
    const rotationLabel = document.getElementById('rotationValLabel');
    const resetRotationBtn = document.getElementById('resetRotationBtn');

    const scaleSlider = document.getElementById('calibScaleSlider');
    const scaleLabel = document.getElementById('scaleValLabel');

    // Visual controls
    const opacitySlider = document.getElementById('calibOpacitySlider');
    const opacityLabel = document.getElementById('calibOpacityLabel');
    const brightnessSlider = document.getElementById('calibBrightnessSlider');
    const brightnessLabel = document.getElementById('calibBrightnessLabel');
    const contrastSlider = document.getElementById('calibContrastSlider');
    const contrastLabel = document.getElementById('calibContrastLabel');
    const saturationSlider = document.getElementById('calibSaturationSlider');
    const saturationLabel = document.getElementById('calibSaturationLabel');
    const invertToggle = document.getElementById('calibInvertToggle');
    const resetVisualsBtn = document.getElementById('resetVisualsBtn');

    // Export & Readout controls
    const boundNorth = document.getElementById('boundNorthVal');
    const boundSouth = document.getElementById('boundSouthVal');
    const boundEast = document.getElementById('boundEastVal');
    const boundWest = document.getElementById('boundWestVal');
    const boundRot = document.getElementById('boundRotVal');
    const copyJsonBtn = document.getElementById('copyCalibJsonBtn');
    const downloadGeoJsonBtn = document.getElementById('downloadCalibFileBtn');
    const removeBtn = document.getElementById('removeCalibImageBtn');

    // Visibility & Comparison Controls
    const floatingVisibilityBar = document.getElementById('floatingVisibilityBar');
    const floatToggleImportedBtn = document.getElementById('floatToggleImportedBtn');
    const floatImportedEyeIcon = document.getElementById('floatImportedEyeIcon');
    const floatImportedStatusText = document.getElementById('floatImportedStatusText');
    const floatToggleOriginalBtn = document.getElementById('floatToggleOriginalBtn');
    const floatOriginalEyeIcon = document.getElementById('floatOriginalEyeIcon');
    const floatOriginalStatusText = document.getElementById('floatOriginalStatusText');
    const floatBlinkBtn = document.getElementById('floatBlinkBtn');

    const toggleImportedMapBtn = document.getElementById('toggleImportedMapBtn');
    const importedMapEyeIcon = document.getElementById('importedMapEyeIcon');
    const importedMapStatusBadge = document.getElementById('importedMapStatusBadge');
    const toggleOriginalMapBtn = document.getElementById('toggleOriginalMapBtn');
    const originalMapEyeIcon = document.getElementById('originalMapEyeIcon');
    const originalMapStatusBadge = document.getElementById('originalMapStatusBadge');
    const blinkCompareBtn = document.getElementById('blinkCompareBtn');

    // Calibration Internal State
    let overlay = null;
    let bounds = null; // L.latLngBounds
    let baseCenter = null;
    let baseSpanLat = 0;
    let baseSpanLng = 0;
    let isLocked = false;
    let rotationDeg = 0;
    let scalePercent = 100;
    let handleMarkers = [];
    let boundaryBox = null;
    let currentEcwMeta = null;

    let isOverlayVisible = true;
    let isBlinking = false;

    let visualState = {
      opacity: 0.85,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      invert: false
    };

    /**
     * Exact UTM to WGS84 Latitude/Longitude Converter
     * Formulated for Transverse Mercator (UTM Zone 38N / 37N Iraq)
     */
    function utmToLatLng(easting, northing, zone = 38, northernHemisphere = true) {
      const a = 6378137.0;
      const f = 1 / 298.257223563;
      const k0 = 0.9996;
      const e = Math.sqrt(2 * f - f * f);
      const e1sq = (e * e) / (1 - e * e);
      const x = easting - 500000.0;
      const y = northernHemisphere ? northing : northing - 10000000.0;
      const m = y / k0;
      const mu = m / (a * (1 - (e * e) / 4 - (3 * Math.pow(e, 4)) / 64 - (5 * Math.pow(e, 6)) / 256));
      const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));
      const J1 = (3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32;
      const J2 = (21 * Math.pow(e1, 2)) / 16 - (55 * Math.pow(e1, 4)) / 32;
      const J3 = (151 * Math.pow(e1, 3)) / 96;
      const J4 = (1097 * Math.pow(e1, 4)) / 512;
      const fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);
      const C1 = e1sq * Math.pow(Math.cos(fp), 2);
      const T1 = Math.pow(Math.tan(fp), 2);
      const R1 = (a * (1 - e * e)) / Math.pow(1 - e * e * Math.pow(Math.sin(fp), 2), 1.5);
      const N1 = a / Math.sqrt(1 - e * e * Math.pow(Math.sin(fp), 2));
      const D = x / (N1 * k0);
      const lat = fp - (N1 * Math.tan(fp) / R1) * ((D * D) / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e1sq) * Math.pow(D, 4) / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e1sq - 3 * C1 * C1) * Math.pow(D, 6) / 720);
      const lng = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180 + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e1sq + 24 * T1 * T1) * Math.pow(D, 5) / 120) / Math.cos(fp);
      return { lat: lat * 180 / Math.PI, lng: lng * 180 / Math.PI };
    }

    /**
     * Parse ECW Binary Header (First 128KB)
     */
    function parseECWHeader(buffer, fileName, fileSize = 0) {
      const view = new DataView(buffer);
      const meta = {
        fileName: fileName,
        fileSizeMb: (fileSize / (1024 * 1024)).toFixed(1),
        isECW: false,
        version: 2,
        width: 14000,
        height: 11000,
        bands: 3,
        compression: 10,
        projection: 'UTM Zone 38N (EPSG:32638)',
        datum: 'WGS84',
        cellSizeUnits: 'METERS',
        cellIncrementX: 0.30,
        cellIncrementY: -0.30,
        originX: 441200,
        originY: 3689400,
        utmZone: 38,
        isNorthern: true
      };

      if (buffer.byteLength > 20) {
        const tag = view.getUint8(0);
        if (tag === 0x65 || tag === 0x45) { // 'e' or 'E'
          meta.isECW = true;
          meta.version = view.getUint8(1) || 2;
          const wBE = view.getUint32(6, false);
          const hBE = view.getUint32(10, false);
          const wLE = view.getUint32(6, true);
          const hLE = view.getUint32(10, true);

          if (wBE > 20 && wBE < 2000000 && hBE > 20 && hBE < 2000000) {
            meta.width = wBE;
            meta.height = hBE;
            meta.bands = view.getUint16(14, false) || 3;
          } else if (wLE > 20 && wLE < 2000000 && hLE > 20 && hLE < 2000000) {
            meta.width = wLE;
            meta.height = hLE;
            meta.bands = view.getUint16(14, true) || 3;
          }
        }
      }

      // ASCII string scanner for embedded metadata keywords
      let text = '';
      try {
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i++) {
          const c = bytes[i];
          if ((c >= 32 && c <= 126) || c === 10 || c === 13) {
            text += String.fromCharCode(c);
          } else {
            text += ' ';
          }
        }
      } catch (err) {
        console.warn('Text scan error:', err);
      }

      const nutmMatch = text.match(/NUTM(\d{1,2})/i);
      if (nutmMatch) {
        meta.utmZone = parseInt(nutmMatch[1], 10);
        meta.projection = `UTM Zone ${meta.utmZone}N (EPSG:${32600 + meta.utmZone})`;
      } else if (/EPSG:?(\d{4,5})/i.test(text)) {
        const epsgMatch = text.match(/EPSG:?(\d{4,5})/i);
        const code = epsgMatch[1];
        if (code === '4326') {
          meta.projection = 'WGS84 Geodetic (EPSG:4326)';
          meta.cellSizeUnits = 'DEGREES';
        } else if (code === '32638') {
          meta.projection = 'UTM Zone 38N (EPSG:32638)';
          meta.utmZone = 38;
        } else if (code === '32637') {
          meta.projection = 'UTM Zone 37N (EPSG:32637)';
          meta.utmZone = 37;
        } else {
          meta.projection = `EPSG:${code}`;
        }
      } else if (/GEODETIC|WGS84/i.test(text)) {
        meta.projection = 'WGS84 Geographic Lat/Lng';
        meta.datum = 'WGS84';
      }

      const datumMatch = text.match(/DATUM\s*[:=]\s*["']?([A-Za-z0-9_\-]+)/i);
      if (datumMatch) meta.datum = datumMatch[1].toUpperCase();

      const oxMatch = text.match(/(?:OriginX|Eastings)\s*[:=]\s*([+\-0-9.eE]+)/i);
      if (oxMatch) meta.originX = parseFloat(oxMatch[1]);

      const oyMatch = text.match(/(?:OriginY|Northings)\s*[:=]\s*([+\-0-9.eE]+)/i);
      if (oyMatch) meta.originY = parseFloat(oyMatch[1]);

      const cixMatch = text.match(/(?:CellIncrementX|Xdimension)\s*[:=]\s*([+\-0-9.eE]+)/i);
      if (cixMatch) meta.cellIncrementX = parseFloat(cixMatch[1]);

      const ciyMatch = text.match(/(?:CellIncrementY|Ydimension)\s*[:=]\s*([+\-0-9.eE]+)/i);
      if (ciyMatch) meta.cellIncrementY = parseFloat(ciyMatch[1]);

      return meta;
    }

    /**
     * Parse Sidecar .ERS / .EWW text if present
     */
    function parseSidecarMetadata(text, meta) {
      if (!text) return meta;

      const oxMatch = text.match(/(?:Eastings|RegistrationCoord\s*Begin[\s\S]*?Eastings)\s*=\s*([+\-0-9.eE]+)/i);
      if (oxMatch) meta.originX = parseFloat(oxMatch[1]);

      const oyMatch = text.match(/(?:Northings|RegistrationCoord\s*Begin[\s\S]*?Northings)\s*=\s*([+\-0-9.eE]+)/i);
      if (oyMatch) meta.originY = parseFloat(oyMatch[1]);

      const xDimMatch = text.match(/Xdimension\s*=\s*([+\-0-9.eE]+)/i);
      if (xDimMatch) meta.cellIncrementX = parseFloat(xDimMatch[1]);

      const yDimMatch = text.match(/Ydimension\s*=\s*([+\-0-9.eE]+)/i);
      if (yDimMatch) meta.cellIncrementY = -Math.abs(parseFloat(yDimMatch[1]));

      const projMatch = text.match(/Projection\s*=\s*["']?([A-Za-z0-9_\-]+)["']?/i);
      if (projMatch) {
        const p = projMatch[1].toUpperCase();
        if (p.includes('NUTM38') || p.includes('UTM38')) {
          meta.projection = 'UTM Zone 38N (EPSG:32638)';
          meta.utmZone = 38;
        } else if (p.includes('NUTM37') || p.includes('UTM37')) {
          meta.projection = 'UTM Zone 37N (EPSG:32637)';
          meta.utmZone = 37;
        } else if (p.includes('GEODETIC')) {
          meta.projection = 'WGS84 Geodetic (EPSG:4326)';
          meta.cellSizeUnits = 'DEGREES';
        }
      }

      const datumMatch = text.match(/Datum\s*=\s*["']?([A-Za-z0-9_\-]+)["']?/i);
      if (datumMatch) meta.datum = datumMatch[1].toUpperCase();

      return meta;
    }

    /**
     * Compute Geographic LatLngBounds from Metadata
     */
    function computeBoundsFromMeta(meta) {
      let north, south, east, west;

      // Case A: Coordinates are in UTM meters (easting: 100k - 900k, northing: 1M - 9M)
      if (meta.originX > 10000 && meta.originY > 100000) {
        const zone = meta.utmZone || 38;
        const widthMeters = meta.width * Math.abs(meta.cellIncrementX || 0.3);
        const heightMeters = meta.height * Math.abs(meta.cellIncrementY || 0.3);

        const tl = utmToLatLng(meta.originX, meta.originY, zone, true);
        const br = utmToLatLng(meta.originX + widthMeters, meta.originY - heightMeters, zone, true);

        north = Math.max(tl.lat, br.lat);
        south = Math.min(tl.lat, br.lat);
        west = Math.min(tl.lng, br.lng);
        east = Math.max(tl.lng, br.lng);
      }
      // Case B: Coordinates are in Geographic Degrees (WGS84)
      else if (meta.originX >= -180 && meta.originX <= 180 && meta.originY >= -90 && meta.originY <= 90) {
        const spanX = meta.width * Math.abs(meta.cellIncrementX || 0.00005);
        const spanY = meta.height * Math.abs(meta.cellIncrementY || 0.00005);

        west = meta.originX;
        east = meta.originX + spanX;
        north = meta.originY;
        south = meta.originY - spanY;
      }
      // Case C: Fallback to Baghdad Iraq center
      else {
        north = 33.3600;
        south = 33.2800;
        west = 44.3300;
        east = 44.4300;
      }

      return L.latLngBounds([south, west], [north, east]);
    }

    /**
     * Display ECW Metadata in Inspector Box
     */
    function displayECWMetadata(meta, computedBounds) {
      currentEcwMeta = meta;
      if (!ecwMetadataBox) return;

      ecwMetadataBox.classList.remove('hidden');
      if (ecwFileNameLabel) ecwFileNameLabel.textContent = meta.fileName || 'ملف ECW';
      if (ecwMetaBadge) {
        ecwMetaBadge.textContent = meta.isECW ? `ECW v${meta.version}` : 'Raster GIS';
      }
      if (ecwMetaDimensions) {
        ecwMetaDimensions.textContent = `${meta.width.toLocaleString('ar-IQ')} × ${meta.height.toLocaleString('ar-IQ')} px`;
      }
      if (ecwMetaBands) {
        ecwMetaBands.textContent = `${meta.bands} قنوات RGB (1:${meta.compression || 10})`;
      }
      if (ecwMetaProjection) {
        ecwMetaProjection.textContent = `${meta.projection} / ${meta.datum}`;
      }
      if (ecwMetaResolution) {
        const res = Math.abs(meta.cellIncrementX);
        ecwMetaResolution.textContent = res < 1 ? `${res.toFixed(2)} م/بكسل` : `${res.toFixed(5)}°/بكسل`;
      }
      if (ecwMetaLatRange && computedBounds) {
        ecwMetaLatRange.textContent = `${computedBounds.getSouth().toFixed(4)}° -> ${computedBounds.getNorth().toFixed(4)}° N`;
      }
      if (ecwMetaLngRange && computedBounds) {
        ecwMetaLngRange.textContent = `${computedBounds.getWest().toFixed(4)}° -> ${computedBounds.getEast().toFixed(4)}° E`;
      }
      if (gdalCommandText) {
        const cleanName = (meta.fileName || 'input.ecw').replace(/\s+/g, '_');
        gdalCommandText.textContent = `gdal_translate -of PNG -outsize 2048 0 "${cleanName}" "${cleanName.replace(/\.ecw$/i, '')}_calibrated.png"`;
      }
    }

    /**
     * Generate Matching High-Res Satellite Imagery URL for Bounding Box
     */
    function getSatelliteServiceUrlForBounds(b) {
      const w = b.getWest().toFixed(6);
      const s = b.getSouth().toFixed(6);
      const e = b.getEast().toFixed(6);
      const n = b.getNorth().toFixed(6);
      return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${w},${s},${e},${n}&bboxSR=4326&imageSR=4326&size=1024,800&f=image`;
    }

    /**
     * Process ECW Dataset (Binary Header, Sidecar, and Raster Pairing)
     */
    function processECWDataset(file, companionImageSrc = null, sidecarText = null) {
      const slice = file.slice(0, 131072);
      const reader = new FileReader();

      reader.onload = (e) => {
        let meta = parseECWHeader(e.target.result, file.name, file.size);
        if (sidecarText) {
          meta = parseSidecarMetadata(sidecarText, meta);
        }

        const calculatedBounds = computeBoundsFromMeta(meta);
        displayECWMetadata(meta, calculatedBounds);

        // If companion image exists, use it; otherwise fetch matching satellite imagery for the exact bounding box
        const imageToDisplay = companionImageSrc || getSatelliteServiceUrlForBounds(calculatedBounds);
        const labelText = `خريطة ECW: ${file.name}`;

        initCalibrationOverlay(imageToDisplay, labelText, calculatedBounds);
        showToast(`تم استيراد ${file.name} وقراءة نظام الإسقاط الجغرافي بنجاح!`, 'success');
      };

      reader.readAsArrayBuffer(slice);
    }

    /**
     * Handle Selected Files (Single or Multi-file drag/picker)
     */
    function handleSelectedFiles(files) {
      if (!files || files.length === 0) return;

      let ecwFile = null;
      let sidecarFile = null;
      let imageFile = null;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const lower = f.name.toLowerCase();
        if (lower.endsWith('.ecw')) {
          ecwFile = f;
        } else if (lower.endsWith('.ers') || lower.endsWith('.eww') || lower.endsWith('.wld')) {
          sidecarFile = f;
        } else if (f.type.startsWith('image/') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.tif') || lower.endsWith('.tiff')) {
          imageFile = f;
        }
      }

      if (ecwFile) {
        if (sidecarFile && imageFile) {
          const sidecarReader = new FileReader();
          sidecarReader.onload = (se) => {
            const imgReader = new FileReader();
            imgReader.onload = (ie) => {
              processECWDataset(ecwFile, ie.target.result, se.target.result);
            };
            imgReader.readAsDataURL(imageFile);
          };
          sidecarReader.readAsText(sidecarFile);
        } else if (sidecarFile) {
          const sidecarReader = new FileReader();
          sidecarReader.onload = (se) => {
            processECWDataset(ecwFile, null, se.target.result);
          };
          sidecarReader.readAsText(sidecarFile);
        } else if (imageFile) {
          const imgReader = new FileReader();
          imgReader.onload = (ie) => {
            processECWDataset(ecwFile, ie.target.result, null);
          };
          imgReader.readAsDataURL(imageFile);
        } else {
          processECWDataset(ecwFile, null, null);
        }
      } else if (imageFile) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          initCalibrationOverlay(evt.target.result, imageFile.name);
        };
        reader.readAsDataURL(imageFile);
      } else {
        showToast('يرجى اختيار ملف بصيغة .ecw أو صورة فضائية مدعومة', 'warning');
      }
    }

    // Trigger local file upload
    if (triggerUploadBtn && fileInput) {
      triggerUploadBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        handleSelectedFiles(e.target.files);
      });
    }

    // Drag & Drop on ECW Dropzone
    if (ecwDropZone) {
      ecwDropZone.addEventListener('click', (e) => {
        if (e.target !== triggerUploadBtn && !triggerUploadBtn.contains(e.target)) {
          fileInput.click();
        }
      });

      ecwDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ecwDropZone.classList.add('dragover');
      });

      ecwDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ecwDropZone.classList.remove('dragover');
      });

      ecwDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ecwDropZone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files) {
          handleSelectedFiles(e.dataTransfer.files);
        }
      });
    }

    // Attach Companion Converted Image
    if (triggerCompanionUploadBtn && companionFileInput) {
      triggerCompanionUploadBtn.addEventListener('click', () => companionFileInput.click());
      companionFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && overlay && bounds) {
          const imgReader = new FileReader();
          imgReader.onload = (evt) => {
            overlay.setUrl(evt.target.result);
            showToast(`تم إقران الصورة المحولة (${file.name}) بنطاق ECW بنجاح!`, 'success');
          };
          imgReader.readAsDataURL(file);
        } else if (!bounds) {
          showToast('يرجى استيراد ملف ECW أولاً', 'warning');
        }
      });
    }

    // Copy GDAL translation command
    if (copyGdalCmdBtn && gdalCommandText) {
      copyGdalCmdBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(gdalCommandText.textContent).then(() => {
          showToast('تم نسخ أمر GDAL للتحويل بنجاح!', 'success');
        });
      });
    }

    /**
     * Toggle Visibility of the Imported Satellite / ECW Overlay
     */
    function toggleOverlayVisibility(forceState = null) {
      if (!overlay) return;
      isOverlayVisible = (forceState !== null) ? forceState : !isOverlayVisible;

      if (isOverlayVisible) {
        if (!map.hasLayer(overlay)) overlay.addTo(map);
        if (overlay.getElement()) overlay.getElement().style.display = '';
        applyVisualFilters();
        applyRotation();
        overlay.bringToFront();
        if (boundaryBox && !map.hasLayer(boundaryBox) && !isLocked) boundaryBox.addTo(map);
        handleMarkers.forEach(m => { if (!map.hasLayer(m) && !isLocked) m.addTo(map); });
      } else {
        if (map.hasLayer(overlay)) map.removeLayer(overlay);
        if (boundaryBox && map.hasLayer(boundaryBox)) map.removeLayer(boundaryBox);
        handleMarkers.forEach(m => { if (map.hasLayer(m)) map.removeLayer(m); });
      }

      updateVisibilityUI();
      renderActiveLayersTab();
      showToast(isOverlayVisible ? 'تم إظهار الخارطة المستوردة' : 'تم إخفاء الخارطة المستوردة', 'info');
    }

    /**
     * Toggle Visibility of the Original Basemap underneath
     */
    function toggleBasemapVisibility(forceState = null) {
      const curBm = state.basemapLayers[state.currentBasemapId];
      if (!curBm) return;
      state.isBasemapVisible = (forceState !== null) ? forceState : !state.isBasemapVisible;

      if (state.isBasemapVisible) {
        if (!map.hasLayer(curBm)) curBm.addTo(map);
        if (overlay && map.hasLayer(overlay) && isOverlayVisible) overlay.bringToFront();
      } else {
        if (map.hasLayer(curBm)) map.removeLayer(curBm);
      }

      updateVisibilityUI();
      renderActiveLayersTab();
      showToast(state.isBasemapVisible ? 'تم إظهار خارطة الأساس الأصلية' : 'تم إخفاء خارطة الأساس الأصلية', 'info');
    }

    /**
     * Quick Blink Comparison Mode (Temporarily hide imported map to peek original)
     */
    function blinkCompare() {
      if (!overlay || isBlinking) return;
      isBlinking = true;
      const priorState = isOverlayVisible;

      if (map.hasLayer(overlay)) map.removeLayer(overlay);
      if (boundaryBox && map.hasLayer(boundaryBox)) map.removeLayer(boundaryBox);
      handleMarkers.forEach(m => { if (map.hasLayer(m)) map.removeLayer(m); });

      if (importedMapStatusBadge) importedMapStatusBadge.textContent = 'معاينة...';
      if (floatImportedStatusText) floatImportedStatusText.textContent = 'معاينة...';

      setTimeout(() => {
        if (priorState) {
          if (!map.hasLayer(overlay)) overlay.addTo(map);
          applyVisualFilters();
          applyRotation();
          overlay.bringToFront();
          if (boundaryBox && !isLocked) boundaryBox.addTo(map);
          handleMarkers.forEach(m => { if (!isLocked) m.addTo(map); });
        }
        isBlinking = false;
        updateVisibilityUI();
      }, 1200);
    }

    /**
     * Update all visibility labels, badges, and icons across UI
     */
    function updateVisibilityUI() {
      const importedText = isOverlayVisible ? 'ظاهرة' : 'مخفية';
      const importedEyeClass = isOverlayVisible ? 'fa-solid fa-eye text-sky-400' : 'fa-solid fa-eye-slash text-slate-500';

      if (importedMapStatusBadge) {
        importedMapStatusBadge.textContent = importedText;
        importedMapStatusBadge.className = isOverlayVisible
          ? 'text-[10px] px-1.5 py-0.5 rounded bg-sky-500/30 text-white font-mono font-bold'
          : 'text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono font-bold border border-slate-700';
      }
      if (importedMapEyeIcon) importedMapEyeIcon.className = importedEyeClass;

      if (floatImportedStatusText) {
        floatImportedStatusText.textContent = importedText;
        floatImportedStatusText.className = isOverlayVisible ? 'text-white' : 'text-slate-400';
      }
      if (floatImportedEyeIcon) floatImportedEyeIcon.className = importedEyeClass;

      const isBmVis = (state.isBasemapVisible !== false);
      const originalText = isBmVis ? 'ظاهرة' : 'مخفية';
      const originalEyeClass = isBmVis ? 'fa-solid fa-eye text-emerald-400' : 'fa-solid fa-eye-slash text-slate-500';

      if (originalMapStatusBadge) {
        originalMapStatusBadge.textContent = originalText;
        originalMapStatusBadge.className = isBmVis
          ? 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-white font-mono font-bold'
          : 'text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono font-bold border border-slate-700';
      }
      if (originalMapEyeIcon) originalMapEyeIcon.className = originalEyeClass;

      if (floatOriginalStatusText) {
        floatOriginalStatusText.textContent = originalText;
        floatOriginalStatusText.className = isBmVis ? 'text-white' : 'text-slate-400';
      }
      if (floatOriginalEyeIcon) floatOriginalEyeIcon.className = originalEyeClass;
    }

    // Attach Click Handlers
    if (toggleImportedMapBtn) {
      toggleImportedMapBtn.addEventListener('click', () => toggleOverlayVisibility());
    }
    if (floatToggleImportedBtn) {
      floatToggleImportedBtn.addEventListener('click', () => toggleOverlayVisibility());
    }

    if (toggleOriginalMapBtn) {
      toggleOriginalMapBtn.addEventListener('click', () => toggleBasemapVisibility());
    }
    if (floatToggleOriginalBtn) {
      floatToggleOriginalBtn.addEventListener('click', () => toggleBasemapVisibility());
    }

    if (blinkCompareBtn) {
      blinkCompareBtn.addEventListener('click', () => blinkCompare());
    }
    if (floatBlinkBtn) {
      floatBlinkBtn.addEventListener('click', () => blinkCompare());
    }

    // Bind Global Handlers for Active Layers tab integration
    window.toggleCalibOverlayVisibility = toggleOverlayVisibility;
    window.toggleBasemapVisibility = toggleBasemapVisibility;
    window.removeCalibOverlay = removeOverlay;
    window.zoomToCalibOverlay = () => {
      if (bounds) map.fitBounds(bounds, { padding: [40, 40] });
    };
    window.isCalibOverlayVisible = () => isOverlayVisible;
    window.getCalibOverlayLabel = () => (statusLabel ? statusLabel.textContent.replace('معايرة: ', '') : 'الخارطة المستوردة');

    // Load from URL
    if (loadUrlBtn && urlInput) {
      loadUrlBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
          initCalibrationOverlay(url, 'خدمة / صورة فضائية عبر الرابط');
        } else {
          showToast('يرجى كتابة رابط صورة فضائية صحيح', 'warning');
        }
      });
    }

    // ==========================================
    // Pre-loaded Iraq ECW Presets
    // ==========================================
    if (loadBaghdadEcwBtn) {
      loadBaghdadEcwBtn.addEventListener('click', () => {
        const meta = {
          fileName: 'Baghdad_Tigris_UTM38N.ecw',
          fileSizeMb: '185.4',
          isECW: true,
          version: 2,
          width: 18500,
          height: 14200,
          bands: 3,
          compression: 12,
          projection: 'UTM Zone 38N (EPSG:32638)',
          datum: 'WGS84',
          cellSizeUnits: 'METERS',
          cellIncrementX: 0.30,
          cellIncrementY: -0.30,
          originX: 440200,
          originY: 3691800,
          utmZone: 38,
          isNorthern: true
        };
        const sampleBounds = computeBoundsFromMeta(meta);
        displayECWMetadata(meta, sampleBounds);
        const imageUrl = getSatelliteServiceUrlForBounds(sampleBounds);
        initCalibrationOverlay(imageUrl, 'موزاييك بغداد ونهر دجلة (ECW)', sampleBounds);
      });
    }

    if (loadBasraEcwBtn) {
      loadBasraEcwBtn.addEventListener('click', () => {
        const meta = {
          fileName: 'Basra_Port_ShattAlArab_UTM38N.ecw',
          fileSizeMb: '142.1',
          isECW: true,
          version: 2,
          width: 16200,
          height: 11800,
          bands: 3,
          compression: 10,
          projection: 'UTM Zone 38N (EPSG:32638)',
          datum: 'WGS84',
          cellSizeUnits: 'METERS',
          cellIncrementX: 0.50,
          cellIncrementY: -0.50,
          originX: 765400,
          originY: 3375800,
          utmZone: 38,
          isNorthern: true
        };
        const sampleBounds = computeBoundsFromMeta(meta);
        displayECWMetadata(meta, sampleBounds);
        const imageUrl = getSatelliteServiceUrlForBounds(sampleBounds);
        initCalibrationOverlay(imageUrl, 'ميناء البصرة وشط العرب (ECW)', sampleBounds);
      });
    }

    if (loadErbilEcwBtn) {
      loadErbilEcwBtn.addEventListener('click', () => {
        const meta = {
          fileName: 'Erbil_Citadel_HighRes_UTM38N.ecw',
          fileSizeMb: '98.6',
          isECW: true,
          version: 2,
          width: 15000,
          height: 12500,
          bands: 3,
          compression: 8,
          projection: 'UTM Zone 38N (EPSG:32638)',
          datum: 'WGS84',
          cellSizeUnits: 'METERS',
          cellIncrementX: 0.20,
          cellIncrementY: -0.20,
          originX: 408500,
          originY: 4004200,
          utmZone: 38,
          isNorthern: true
        };
        const sampleBounds = computeBoundsFromMeta(meta);
        displayECWMetadata(meta, sampleBounds);
        const imageUrl = getSatelliteServiceUrlForBounds(sampleBounds);
        initCalibrationOverlay(imageUrl, 'قلعة أربيل والمركز القديم (ECW)', sampleBounds);
      });
    }

    // Generic Sample Button (Baghdad Tigris)
    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        if (loadBaghdadEcwBtn) loadBaghdadEcwBtn.click();
      });
    }

    /**
     * Initialize or Replace Calibrated Overlay
     */
    function initCalibrationOverlay(imageSrc, label, customBounds = null) {
      // Clean up previous
      removeOverlay();

      // Determine initial bounds
      if (customBounds) {
        bounds = customBounds;
      } else {
        const center = map.getCenter();
        const delta = 0.08;
        bounds = L.latLngBounds(
          [center.lat - delta, center.lng - delta],
          [center.lat + delta, center.lng + delta]
        );
      }

      baseCenter = bounds.getCenter();
      baseSpanLat = bounds.getNorth() - bounds.getSouth();
      baseSpanLng = bounds.getEast() - bounds.getWest();

      // Create Leaflet Image Overlay
      overlay = L.imageOverlay(imageSrc, bounds, {
        opacity: visualState.opacity,
        interactive: false,
        className: 'calibrated-satellite-overlay'
      }).addTo(map);

      window.calibOverlayInstance = overlay;

      // Update UI
      if (controlsContainer) controlsContainer.classList.remove('hidden');
      if (statusLabel) {
        statusLabel.textContent = `معايرة: ${label.substring(0, 20)}...`;
        statusLabel.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium';
      }

      // Fly to image
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

      // Create boundary outline & corner handles
      createHandles();
      applyVisualFilters();
      applyRotation();
      isOverlayVisible = true;
      if (floatingVisibilityBar) floatingVisibilityBar.classList.remove('hidden');
      updateVisibilityUI();
      renderActiveLayersTab();

      showToast(`تم تحميل الخريطة الفضائية! يمكنك الآن معايرتها وتصحيحها.`, 'success');
    }

    /**
     * Create interactive handles for georeferencing
     */
    function createHandles() {
      clearHandles();
      if (!bounds || isLocked) return;

      // Dashed boundary rectangle
      boundaryBox = L.rectangle(bounds, {
        color: '#f59e0b',
        weight: 1.5,
        dashArray: '5, 8',
        fill: false,
        interactive: false
      }).addTo(map);

      const corners = [
        { id: 'ne', pos: bounds.getNorthEast(), cursor: 'ne-resize' },
        { id: 'nw', pos: bounds.getNorthWest(), cursor: 'nw-resize' },
        { id: 'se', pos: bounds.getSouthEast(), cursor: 'se-resize' },
        { id: 'sw', pos: bounds.getSouthWest(), cursor: 'sw-resize' }
      ];

      corners.forEach(corner => {
        const marker = L.marker(corner.pos, {
          draggable: true,
          icon: L.divIcon({
            className: 'calib-handle-icon',
            iconSize: [14, 14]
          })
        }).addTo(map);

        marker.on('drag', () => {
          const newPos = marker.getLatLng();
          const curSw = bounds.getSouthWest();
          const curNe = bounds.getNorthEast();

          if (corner.id === 'ne') {
            bounds = L.latLngBounds(curSw, newPos);
          } else if (corner.id === 'nw') {
            bounds = L.latLngBounds([curSw.lat, newPos.lng], [newPos.lat, curNe.lng]);
          } else if (corner.id === 'se') {
            bounds = L.latLngBounds([newPos.lat, curSw.lng], [curNe.lat, newPos.lng]);
          } else if (corner.id === 'sw') {
            bounds = L.latLngBounds(newPos, curNe);
          }

          baseCenter = bounds.getCenter();
          baseSpanLat = bounds.getNorth() - bounds.getSouth();
          baseSpanLng = bounds.getEast() - bounds.getWest();

          updateOverlayGeometry();
        });

        marker.on('dragend', () => {
          createHandles();
          updateReadout();
        });

        handleMarkers.push(marker);
      });

      // Center move marker
      const centerMarker = L.marker(bounds.getCenter(), {
        draggable: true,
        icon: L.divIcon({
          className: 'calib-center-icon',
          iconSize: [16, 16]
        })
      }).addTo(map);

      centerMarker.on('drag', () => {
        const newCenter = centerMarker.getLatLng();
        const dLat = newCenter.lat - baseCenter.lat;
        const dLng = newCenter.lng - baseCenter.lng;

        bounds = L.latLngBounds(
          [bounds.getSouth() + dLat, bounds.getWest() + dLng],
          [bounds.getNorth() + dLat, bounds.getEast() + dLng]
        );
        baseCenter = newCenter;
        updateOverlayGeometry();
      });

      centerMarker.on('dragend', () => {
        createHandles();
        updateReadout();
      });

      handleMarkers.push(centerMarker);
    }

    function clearHandles() {
      handleMarkers.forEach(m => map.removeLayer(m));
      handleMarkers = [];
      if (boundaryBox) {
        map.removeLayer(boundaryBox);
        boundaryBox = null;
      }
    }

    /**
     * Update overlay geometry on map
     */
    function updateOverlayGeometry() {
      if (overlay && bounds) {
        overlay.setBounds(bounds);
        applyRotation();
        if (boundaryBox) boundaryBox.setBounds(bounds);
        updateReadout();
      }
    }

    /**
     * Apply CSS rotation
     */
    function applyRotation() {
      if (!overlay) return;
      const el = overlay.getElement();
      if (el) {
        el.style.transform = (el.style.transform || '').replace(/rotate\([^)]*\)/g, '') + ` rotate(${rotationDeg}deg)`;
      }
    }

    /**
     * Apply Radiometric & Visual Corrections (Brightness, Contrast, Saturation, Invert, Opacity)
     */
    function applyVisualFilters() {
      if (!overlay) return;
      overlay.setOpacity(visualState.opacity);
      const el = overlay.getElement();
      if (el) {
        el.style.filter = `brightness(${visualState.brightness}%) contrast(${visualState.contrast}%) saturate(${visualState.saturation}%) ${visualState.invert ? 'invert(100%)' : ''}`;
      }
    }

    /**
     * Nudge Bounds in a specified direction
     */
    function nudge(dLat, dLng) {
      if (!bounds) return;
      bounds = L.latLngBounds(
        [bounds.getSouth() + dLat, bounds.getWest() + dLng],
        [bounds.getNorth() + dLat, bounds.getEast() + dLng]
      );
      baseCenter = bounds.getCenter();
      updateOverlayGeometry();
      createHandles();
    }

    // Nudge Handlers
    if (nudgeUp) {
      nudgeUp.addEventListener('click', () => {
        const step = parseFloat(nudgeStep.value) || 0.005;
        nudge(step, 0);
      });
    }
    if (nudgeDown) {
      nudgeDown.addEventListener('click', () => {
        const step = parseFloat(nudgeStep.value) || 0.005;
        nudge(-step, 0);
      });
    }
    if (nudgeLeft) {
      nudgeLeft.addEventListener('click', () => {
        const step = parseFloat(nudgeStep.value) || 0.005;
        nudge(0, -step);
      });
    }
    if (nudgeRight) {
      nudgeRight.addEventListener('click', () => {
        const step = parseFloat(nudgeStep.value) || 0.005;
        nudge(0, step);
      });
    }

    // Fit to view
    if (fitToViewBtn) {
      fitToViewBtn.addEventListener('click', () => {
        if (!overlay) return;
        const curMapBounds = map.getBounds().pad(-0.15);
        bounds = curMapBounds;
        baseCenter = bounds.getCenter();
        baseSpanLat = bounds.getNorth() - bounds.getSouth();
        baseSpanLng = bounds.getEast() - bounds.getWest();
        updateOverlayGeometry();
        createHandles();
        showToast('تمت مطابقة أبعاد الصورة مع نطاق الشاشة', 'info');
      });
    }

    // Rotation slider
    if (rotationSlider) {
      rotationSlider.addEventListener('input', (e) => {
        rotationDeg = parseInt(e.target.value, 10);
        if (rotationLabel) rotationLabel.textContent = `${rotationDeg}°`;
        if (boundRot) boundRot.textContent = `${rotationDeg}°`;
        applyRotation();
      });
    }

    if (resetRotationBtn) {
      resetRotationBtn.addEventListener('click', () => {
        rotationDeg = 0;
        if (rotationSlider) rotationSlider.value = 0;
        if (rotationLabel) rotationLabel.textContent = '0°';
        if (boundRot) boundRot.textContent = '0°';
        applyRotation();
      });
    }

    // Scale slider
    if (scaleSlider) {
      scaleSlider.addEventListener('input', (e) => {
        scalePercent = parseInt(e.target.value, 10);
        if (scaleLabel) scaleLabel.textContent = `${scalePercent}%`;

        if (!bounds || !baseCenter) return;
        const factor = scalePercent / 100;
        const halfLat = (baseSpanLat * factor) / 2;
        const halfLng = (baseSpanLng * factor) / 2;

        bounds = L.latLngBounds(
          [baseCenter.lat - halfLat, baseCenter.lng - halfLng],
          [baseCenter.lat + halfLat, baseCenter.lng + halfLng]
        );
        updateOverlayGeometry();
        createHandles();
      });
    }

    // Visual sliders
    if (opacitySlider) {
      opacitySlider.addEventListener('input', (e) => {
        visualState.opacity = parseInt(e.target.value, 10) / 100;
        if (opacityLabel) opacityLabel.textContent = `${Math.round(visualState.opacity * 100)}%`;
        applyVisualFilters();
      });
    }

    if (brightnessSlider) {
      brightnessSlider.addEventListener('input', (e) => {
        visualState.brightness = parseInt(e.target.value, 10);
        if (brightnessLabel) brightnessLabel.textContent = `${visualState.brightness}%`;
        applyVisualFilters();
      });
    }

    if (contrastSlider) {
      contrastSlider.addEventListener('input', (e) => {
        visualState.contrast = parseInt(e.target.value, 10);
        if (contrastLabel) contrastLabel.textContent = `${visualState.contrast}%`;
        applyVisualFilters();
      });
    }

    if (saturationSlider) {
      saturationSlider.addEventListener('input', (e) => {
        visualState.saturation = parseInt(e.target.value, 10);
        if (saturationLabel) saturationLabel.textContent = `${visualState.saturation}%`;
        applyVisualFilters();
      });
    }

    if (invertToggle) {
      invertToggle.addEventListener('change', (e) => {
        visualState.invert = e.target.checked;
        applyVisualFilters();
      });
    }

    if (resetVisualsBtn) {
      resetVisualsBtn.addEventListener('click', () => {
        visualState = {
          opacity: 0.85,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          invert: false
        };
        if (opacitySlider) opacitySlider.value = 85;
        if (opacityLabel) opacityLabel.textContent = '85%';
        if (brightnessSlider) brightnessSlider.value = 100;
        if (brightnessLabel) brightnessLabel.textContent = '100%';
        if (contrastSlider) contrastSlider.value = 100;
        if (contrastLabel) contrastLabel.textContent = '100%';
        if (saturationSlider) saturationSlider.value = 100;
        if (saturationLabel) saturationLabel.textContent = '100%';
        if (invertToggle) invertToggle.checked = false;
        applyVisualFilters();
        showToast('تمت إعادة ضبط المرشحات البصرية', 'info');
      });
    }

    // Toggle Lock Georeference
    if (lockBtn) {
      lockBtn.addEventListener('click', () => {
        isLocked = !isLocked;
        if (isLocked) {
          clearHandles();
          lockText.textContent = 'المعايرة مقفلة (محمية)';
          lockBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-500');
          lockBtn.classList.remove('bg-slate-800', 'text-slate-300');
          lockBtn.querySelector('i').className = 'fa-solid fa-lock text-white';
          showToast('تم قفل الإرجاع الجغرافي وتثبيت المعالم', 'success');
        } else {
          createHandles();
          lockText.textContent = 'المعايرة مفعلة';
          lockBtn.classList.remove('bg-blue-600', 'text-white', 'border-blue-500');
          lockBtn.classList.add('bg-slate-800', 'text-slate-300');
          lockBtn.querySelector('i').className = 'fa-solid fa-lock-open text-amber-400';
          showToast('تم تفعيل مقابض المعايرة', 'info');
        }
      });
    }

    // Update readout coordinates
    function updateReadout() {
      if (!bounds) return;
      if (boundNorth) boundNorth.textContent = bounds.getNorth().toFixed(5) + '° N';
      if (boundSouth) boundSouth.textContent = bounds.getSouth().toFixed(5) + '° S';
      if (boundEast) boundEast.textContent = bounds.getEast().toFixed(5) + '° E';
      if (boundWest) boundWest.textContent = bounds.getWest().toFixed(5) + '° W';
      if (boundRot) boundRot.textContent = `${rotationDeg}°`;
    }

    // Copy Calibration JSON
    if (copyJsonBtn) {
      copyJsonBtn.addEventListener('click', () => {
        if (!bounds) return;
        const calibData = {
          calibrationType: 'Georeferenced Satellite Imagery',
          spatialReference: 'EPSG:4326 (WGS84)',
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          },
          center: [bounds.getCenter().lat, bounds.getCenter().lng],
          rotationDegrees: rotationDeg,
          visualCorrections: visualState
        };
        navigator.clipboard.writeText(JSON.stringify(calibData, null, 2)).then(() => {
          showToast('تم نسخ إحداثيات المعايرة بنجاح!', 'success');
        });
      });
    }

    // Download GeoJSON Calibration Boundary
    if (downloadGeoJsonBtn) {
      downloadGeoJsonBtn.addEventListener('click', () => {
        if (!bounds) return;
        const nw = [bounds.getWest(), bounds.getNorth()];
        const ne = [bounds.getEast(), bounds.getNorth()];
        const se = [bounds.getEast(), bounds.getSouth()];
        const sw = [bounds.getWest(), bounds.getSouth()];

        const geoJson = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                name: 'Calibrated Satellite Footprint',
                rotation: rotationDeg,
                scalePercent: scalePercent,
                timestamp: new Date().toISOString()
              },
              geometry: {
                type: 'Polygon',
                coordinates: [[nw, ne, se, sw, nw]]
              }
            }
          ]
        };

        const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `calibrated-satellite-footprint-${Date.now()}.geojson`;
        a.click();
        showToast('تم تنزيل ملف الإسناد الجغرافي GeoJSON', 'success');
      });
    }

    // Remove Overlay
    function removeOverlay() {
      if (overlay) {
        map.removeLayer(overlay);
        overlay = null;
        window.calibOverlayInstance = null;
      }
      clearHandles();
      bounds = null;
      isOverlayVisible = false;
      if (floatingVisibilityBar) floatingVisibilityBar.classList.add('hidden');
      if (controlsContainer) controlsContainer.classList.add('hidden');
      if (statusLabel) {
        statusLabel.textContent = 'لم يتم اختيار ملف';
        statusLabel.className = 'text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700';
      }
      updateVisibilityUI();
      renderActiveLayersTab();
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        removeOverlay();
        showToast('تمت إزالة الصورة الفضائية المعايرة', 'info');
      });
    }
  }

  /**
   * Measurement Tools (Distance & Area on Map)
   */
  function setupMeasurementTools() {
    const distBtn = document.getElementById('measureDistBtn');
    const areaBtn = document.getElementById('measureAreaBtn');
    const clearBtn = document.getElementById('clearMeasureBtn');
    const measureDiv = document.getElementById('measurementWidgetDiv');

    let mode = null;
    let points = [];
    let shapeLayer = null;

    function reset() {
      points = [];
      if (shapeLayer) {
        map.removeLayer(shapeLayer);
        shapeLayer = null;
      }
      if (measureDiv) measureDiv.innerHTML = '';
      if (distBtn) distBtn.classList.remove('bg-blue-600', 'text-white');
      if (areaBtn) areaBtn.classList.remove('bg-blue-600', 'text-white');
      mode = null;
    }

    if (distBtn) {
      distBtn.addEventListener('click', () => {
        reset();
        mode = 'distance';
        distBtn.classList.add('bg-blue-600', 'text-white');
        showToast('انقر على الخريطة لتحديد النقاط وقياس المسافة', 'info');
      });
    }

    if (areaBtn) {
      areaBtn.addEventListener('click', () => {
        reset();
        mode = 'area';
        areaBtn.classList.add('bg-blue-600', 'text-white');
        showToast('انقر لتحديد أركان المضلع وحساب المساحة', 'info');
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        reset();
        showToast('تم تفريغ أداة القياس', 'info');
      });
    }

    map.on('click', (e) => {
      if (!mode) return;
      points.push(e.latlng);

      if (shapeLayer) map.removeLayer(shapeLayer);

      if (mode === 'distance') {
        shapeLayer = L.polyline(points, { color: '#38bdf8', weight: 3, dashArray: '5, 8' }).addTo(map);
        let totalMeters = 0;
        for (let i = 0; i < points.length - 1; i++) {
          totalMeters += points[i].distanceTo(points[i + 1]);
        }
        const km = (totalMeters / 1000).toFixed(2);
        if (measureDiv) {
          measureDiv.innerHTML = `
            <div class="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs space-y-1">
              <span class="text-slate-400">إجمالي المسافة المقاسة:</span>
              <div class="text-base font-bold text-sky-400 font-mono">${km} كم</div>
              <div class="text-[10px] text-slate-500">عدد النقاط: ${points.length}</div>
            </div>
          `;
        }
      } else if (mode === 'area') {
        if (points.length >= 3) {
          shapeLayer = L.polygon(points, { color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.25 }).addTo(map);
          if (measureDiv) {
            measureDiv.innerHTML = `
              <div class="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs space-y-1">
                <span class="text-slate-400">المضلع المحدد:</span>
                <div class="text-sm font-bold text-emerald-400">تم تحديد ${points.length} نقاط</div>
              </div>
            `;
          }
        } else {
          shapeLayer = L.polyline(points, { color: '#10b981', weight: 2, dashArray: '4, 8' }).addTo(map);
        }
      }
    });
  }

  /**
   * Render Category Pills
   */
  function renderCategoryPills() {
    const pillsContainer = document.getElementById('categoryPills');
    if (!pillsContainer) return;

    pillsContainer.innerHTML = ATLAS_CATEGORIES.map(cat => `
      <button 
        class="category-pill px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
          state.activeCategory === cat.id 
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' 
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
        }"
        data-category="${cat.id}"
      >
        <i class="fa-solid ${cat.icon} text-[11px]"></i>
        <span>${cat.nameAr}</span>
      </button>
    `).join('');

    pillsContainer.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeCategory = btn.getAttribute('data-category');
        renderCategoryPills();
        renderCatalogList();
      });
    });
  }

  /**
   * Render Layer Catalog List
   */
  function renderCatalogList() {
    const catalogContainer = document.getElementById('catalogList');
    if (!catalogContainer) return;

    const layers = Array.from(state.layersMetadata.values());
    const filtered = layers.filter(layer => {
      const matchesCategory = state.activeCategory === 'all' || layer.category === state.activeCategory;
      const q = state.searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        layer.titleAr.toLowerCase().includes(q) || 
        layer.titleEn.toLowerCase().includes(q) || 
        layer.descriptionAr.toLowerCase().includes(q) ||
        (layer.provider && layer.provider.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      catalogContainer.innerHTML = `
        <div class="text-center py-10 px-4 text-slate-400">
          <i class="fa-regular fa-folder-open text-3xl mb-2 text-slate-500"></i>
          <p class="text-sm font-medium">لا توجد طبقات في هذا التصنيف حالياً</p>
          <span class="text-xs text-slate-500">انقر على "جميع الطبقات" أو اختر فئة أخرى</span>
        </div>
      `;
      return;
    }

    catalogContainer.innerHTML = filtered.map(layer => {
      const isLoaded = state.layersMap.has(layer.id);
      const isVisible = isLoaded && map.hasLayer(state.layersMap.get(layer.id));
      const currentOpacity = Math.round((layer.defaultOpacity || 1) * 100);

      const badgeBg = {
        red: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        orange: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        blue: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
        amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        gray: 'bg-slate-700/50 text-slate-300 border-slate-600'
      }[layer.badgeColor || 'blue'] || 'bg-blue-500/20 text-blue-400 border-blue-500/30';

      return `
        <div class="layer-card group bg-slate-800/80 hover:bg-slate-800 border ${isVisible ? 'border-blue-500/60 shadow-lg shadow-blue-900/20' : 'border-slate-700/60'} rounded-xl p-3.5 transition-all duration-200">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-2.5 flex-1 min-w-0">
              <div class="w-8 h-8 rounded-lg ${isVisible ? 'bg-blue-600 text-white' : 'bg-slate-700/70 text-slate-400'} flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                <i class="fa-solid ${layer.icon || 'fa-layer-group'} text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h4 class="font-semibold text-sm text-slate-100 truncate">${layer.titleAr}</h4>
                  <span class="text-[10px] px-2 py-0.5 rounded-full border ${badgeBg} font-mono">${layer.badge || 'طبقة'}</span>
                </div>
                <div class="text-[11px] text-slate-400 font-mono mt-0.5 truncate">${layer.titleEn}</div>
                <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">${layer.descriptionAr}</p>
              </div>
            </div>

            <!-- Toggle Switch -->
            <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input type="checkbox" class="sr-only peer layer-toggle-input" data-id="${layer.id}" ${isVisible ? 'checked' : ''}>
              <div class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <!-- Controls when active -->
          <div class="layer-expanded-controls mt-3 pt-2.5 border-t border-slate-700/50 flex flex-col gap-2 ${isVisible ? 'block' : 'hidden'}" id="controls-${layer.id}">
            <!-- Opacity Slider -->
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="flex items-center gap-1.5">
                <i class="fa-solid fa-circle-half-stroke text-[11px]"></i>
                الشفافية
              </span>
              <div class="flex items-center gap-2 flex-1 max-w-[150px] mx-2">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value="${currentOpacity}" 
                  class="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 opacity-slider" 
                  data-id="${layer.id}"
                >
                <span class="text-[11px] font-mono text-slate-300 w-8 text-left opacity-label-${layer.id}">${currentOpacity}%</span>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center justify-between pt-1">
              <button class="zoom-extent-btn text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors" data-id="${layer.id}">
                <i class="fa-solid fa-expand text-[10px]"></i>
                <span>تقريب للنطاق</span>
              </button>
              <button class="layer-info-btn text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors" data-id="${layer.id}">
                <i class="fa-solid fa-circle-info text-[10px]"></i>
                <span>التفاصيل والمصدر</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach Toggle handlers
    catalogContainer.querySelectorAll('.layer-toggle-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = input.getAttribute('data-id');
        toggleLayer(id, input.checked);
        const controls = document.getElementById(`controls-${id}`);
        if (controls) {
          controls.classList.toggle('hidden', !input.checked);
          controls.classList.toggle('block', input.checked);
        }
      });
    });

    // Attach Opacity handlers
    catalogContainer.querySelectorAll('.opacity-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const id = slider.getAttribute('data-id');
        const val = parseInt(slider.value, 10);
        setLayerOpacity(id, val / 100);
        const label = document.querySelector(`.opacity-label-${id}`);
        if (label) label.textContent = `${val}%`;
      });
    });

    // Attach Zoom extent handlers
    catalogContainer.querySelectorAll('.zoom-extent-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        zoomToLayer(btn.getAttribute('data-id'));
      });
    });

    // Attach Info modal handlers
    catalogContainer.querySelectorAll('.layer-info-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showLayerInfoModal(btn.getAttribute('data-id'));
      });
    });
  }

  /**
   * Toggle Layer Visibility
   */
  function toggleLayer(layerId, visible) {
    const meta = state.layersMetadata.get(layerId);
    if (!meta) return;

    if (!state.layersMap.has(layerId)) {
      if (!visible) return;
      const esriLayer = createEsriLeafletLayer(meta);
      state.layersMap.set(layerId, esriLayer);
      esriLayer.addTo(map);
      updateActiveCountBadge();
      renderActiveLayersTab();
    } else {
      const esriLayer = state.layersMap.get(layerId);
      if (visible) {
        if (!map.hasLayer(esriLayer)) esriLayer.addTo(map);
      } else {
        if (map.hasLayer(esriLayer)) map.removeLayer(esriLayer);
      }
      updateActiveCountBadge();
      renderActiveLayersTab();
    }
    if (layerId === 'iraq-archaeology' && typeof updateArchToggleBtnState === 'function') {
      updateArchToggleBtnState();
    }
  }

  /**
   * Create Esri Leaflet Layer from Metadata
   */
  function createEsriLeafletLayer(meta) {
    let layer;

    if (meta.id === 'iraq-archaeology') {
      const geojson = window.IRAQ_ARCHAEOLOGY_DATA ? window.IRAQ_ARCHAEOLOGY_DATA.toGeoJSON() : null;
      if (!geojson) return L.layerGroup();

      state.archaeologyMarkers.clear();

      layer = L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => {
          const props = feature.properties;
          let iconClass = 'fa-landmark';
          let pulseBorder = 'border-amber-400 shadow-amber-500/50';
          let bgGradient = 'from-amber-500 via-amber-600 to-amber-800';
          let pinDot = 'bg-amber-300';

          if (props.category === 'unesco_tentative') {
            iconClass = 'fa-monument';
            pulseBorder = 'border-sky-400 shadow-sky-500/50';
            bgGradient = 'from-sky-500 via-sky-600 to-sky-800';
            pinDot = 'bg-sky-300';
          } else if (props.category === 'national_registered') {
            iconClass = 'fa-archway';
            pulseBorder = 'border-emerald-400 shadow-emerald-500/50';
            bgGradient = 'from-emerald-500 via-emerald-600 to-emerald-800';
            pinDot = 'bg-emerald-300';
          }

          const iconHtml = `
            <div class="relative group cursor-pointer flex items-center justify-center">
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr ${bgGradient} border-2 ${pulseBorder} flex items-center justify-center text-white text-xs shadow-xl transition-all duration-200 group-hover:scale-125">
                <i class="fa-solid ${iconClass}"></i>
              </div>
              <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${pinDot} border border-slate-900 shadow-sm"></span>
            </div>
          `;

          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'archaeology-marker-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -18]
          });

          const marker = L.marker(latlng, { icon: customIcon });
          if (props.id) {
            state.archaeologyMarkers.set(props.id, marker);
          }
          return marker;
        },

        onEachFeature: (feature, l) => {
          const p = feature.properties;

          const catLabel = p.category === 'unesco_inscribed'
            ? 'موقع تراث عالمي (UNESCO)'
            : p.category === 'unesco_tentative'
              ? 'القائمة التمهيدية لليونسكو'
              : 'معلم أثري وطني مسجل (SBAH)';

          const catBadgeClass = p.category === 'unesco_inscribed'
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : p.category === 'unesco_tentative'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

          l.bindTooltip(`
            <div class="text-right p-1 font-sans">
              <div class="font-bold text-xs text-white">${p.nameAr}</div>
              <div class="text-[10px] text-slate-300 font-mono">${p.nameEn}</div>
              <div class="text-[10px] text-amber-400 mt-0.5 font-semibold">${catLabel}</div>
            </div>
          `, { direction: 'top', className: 'archaeology-tooltip' });

          l.bindPopup(() => {
            const prop = feature.properties;
            const monumentsHtml = (prop.keyMonuments && prop.keyMonuments.length > 0)
              ? `
                <div class="mt-2.5 pt-2 border-t border-slate-700/80">
                  <div class="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <i class="fa-solid fa-gem text-amber-400 text-[10px]"></i>
                    <span>أبرز المعالم المكتشفة:</span>
                  </div>
                  <div class="flex flex-wrap gap-1">
                    ${prop.keyMonuments.map(m => `<span class="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-200 border border-slate-700">${m}</span>`).join('')}
                  </div>
                </div>
              `
              : '';

            const unescoBtn = prop.unescoUrl
              ? `
                <a href="${prop.unescoUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 text-[11px] flex items-center gap-1 transition-all" title="فتح صفحة اليونسكو الرسمية">
                  <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  <span>تقرير اليونسكو الرسمي</span>
                </a>
              `
              : '';

            return `
              <div class="text-right p-1 max-w-[340px] space-y-2 font-sans">
                <div class="border-b border-slate-700 pb-2">
                  <div class="flex items-center justify-between gap-2 mb-1.5">
                    <span class="text-[10px] px-2 py-0.5 rounded-full border ${catBadgeClass} font-bold">
                      ${catLabel}
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">سنة التسجيل: ${prop.inscribedYear}</span>
                  </div>
                  <h4 class="text-sm font-bold text-white flex items-center gap-1.5">
                    <i class="fa-solid fa-landmark text-amber-400"></i>
                    <span>${prop.nameAr}</span>
                  </h4>
                  <div class="text-[11px] text-slate-400 font-mono">${prop.nameEn}</div>
                  ${prop.ancientName ? `<div class="text-[10px] text-amber-400/90 font-mono mt-0.5">الاسم القديم: ${prop.ancientName}</div>` : ''}
                </div>

                <div class="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-900/80 p-2 rounded-lg border border-slate-700/60">
                  <div><span class="text-slate-400">المحافظة:</span> <strong class="text-slate-100">${prop.governorate}</strong></div>
                  <div><span class="text-slate-400">الرمز:</span> <strong class="text-slate-100 font-mono">${prop.unescoRef}</strong></div>
                  <div class="col-span-2"><span class="text-slate-400">الحضارة / العصر:</span> <span class="text-slate-200">${prop.civilization}</span></div>
                </div>

                <p class="text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-1">
                  ${prop.descriptionAr}
                </p>

                ${monumentsHtml}

                <div class="pt-2 border-t border-slate-700 flex items-center justify-between gap-1.5">
                  <button type="button" class="zoom-to-arch-site-btn px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-all" data-lat="${prop.lat}" data-lng="${prop.lng}">
                    <i class="fa-solid fa-crosshairs text-[10px]"></i>
                    <span>تكبير للموقع</span>
                  </button>
                  ${unescoBtn}
                </div>
              </div>
            `;
          });
        }
      });
    } else if (meta.id === 'iraq-governorates') {
      layer = L.esri.featureLayer({
        url: meta.url,
        style: {
          color: '#38bdf8',
          weight: 1.5,
          fillColor: '#0ea5e9',
          fillOpacity: 0.15
        }
      });

      layer.bindPopup((l) => {
        const p = l.feature.properties;
        return `
          <div class="text-right">
            <h4 class="font-bold text-sm text-sky-400">محافظة: ${p.ADM1_AR || ''}</h4>
            <div class="text-xs text-slate-300 font-mono mt-0.5">${p.ADM1_EN || ''}</div>
            <div class="text-xs text-slate-400 mt-2 border-t border-slate-700 pt-1.5">
              <span>الرمز الإداري: <strong class="text-slate-200">${p.ADM1_PCODE || '--'}</strong></span>
            </div>
          </div>
        `;
      });

      layer.bindTooltip((l) => {
        return l.feature.properties.ADM1_AR || '';
      }, { permanent: true, direction: 'center', className: 'gov-label' });

    } else if (meta.id === 'iraq-boundary') {
      layer = L.esri.featureLayer({
        url: meta.url,
        style: {
          color: '#f43f5e',
          weight: 2.5,
          fillOpacity: 0
        }
      });
      layer.bindPopup(() => `<b>جمهورية العراق</b><br><span class="text-xs text-slate-400">الحدود السيادية الوطنية</span>`);

    } else if (meta.id === 'usgs-earthquakes') {
      layer = L.esri.featureLayer({
        url: meta.url,
        pointToLayer: (geojson, latlng) => {
          const mag = geojson.properties.mag || 3;
          return L.circleMarker(latlng, {
            radius: Math.max(mag * 2.5, 4),
            fillColor: mag >= 5 ? '#ef4444' : '#f97316',
            color: '#ffffff',
            weight: 1,
            fillOpacity: 0.8
          });
        }
      });

      layer.bindPopup((l) => {
        const p = l.feature.properties;
        const timeStr = p.time ? new Date(p.time).toLocaleString('ar-IQ') : '--';
        return `
          <div class="text-right">
            <h4 class="font-bold text-sm text-rose-400">زلزال بقوة ${p.mag || '--'} ريختر</h4>
            <div class="text-xs text-slate-300 mt-1">${p.place || ''}</div>
            <div class="text-xs text-slate-400 mt-2 border-t border-slate-700 pt-1.5 space-y-1">
              <div>العمق: <strong class="text-slate-200">${p.depth || '--'} كم</strong></div>
              <div>التوقيت: <span class="text-slate-300">${timeStr}</span></div>
            </div>
          </div>
        `;
      });

    } else if (meta.id === 'nasa-active-fires') {
      layer = L.esri.featureLayer({
        url: meta.url,
        pointToLayer: (geojson, latlng) => {
          return L.circleMarker(latlng, {
            radius: 4,
            fillColor: '#f97316',
            color: '#fbbf24',
            weight: 1,
            fillOpacity: 0.85
          });
        }
      });

      layer.bindPopup((l) => {
        const p = l.feature.properties;
        return `
          <div class="text-right">
            <h4 class="font-bold text-sm text-amber-400">بؤرة حرارية / حريق نشط</h4>
            <div class="text-xs text-slate-300 mt-1">القمر الصناعي: ${p.satellite || 'MODIS/VIIRS'}</div>
            <div class="text-xs text-slate-400 mt-1">الطاقة الإشعاعية: ${p.frp || '--'} MW</div>
          </div>
        `;
      });

    } else if (meta.id === 'noaa-metar-weather') {
      layer = L.esri.featureLayer({
        url: meta.url,
        pointToLayer: (geojson, latlng) => {
          return L.circleMarker(latlng, {
            radius: 4,
            fillColor: '#38bdf8',
            color: '#ffffff',
            weight: 1,
            fillOpacity: 0.8
          });
        }
      });

      layer.bindPopup((l) => {
        const p = l.feature.properties;
        return `
          <div class="text-right">
            <h4 class="font-bold text-sm text-sky-400">محطة رصد: ${p.station_name || p.icao_id || ''}</h4>
            <div class="text-xs text-slate-300 mt-1">الحرارة: ${p.temp_c !== undefined ? p.temp_c + '°C' : '--'}</div>
            <div class="text-xs text-slate-400 mt-1">سرعة الرياح: ${p.wind_speed_kt || '--'} عقدة</div>
          </div>
        `;
      });

    } else if (meta.type === 'image-server') {
      layer = L.esri.imageMapLayer({
        url: meta.url,
        opacity: meta.defaultOpacity || 0.9
      });
    } else if (meta.type === 'map-image') {
      layer = L.esri.dynamicMapLayer({
        url: meta.url,
        opacity: meta.defaultOpacity || 0.9
      });
    } else if (meta.type === 'wms') {
      layer = L.tileLayer.wms(meta.url, {
        layers: meta.wmsLayers || '',
        format: 'image/png',
        transparent: true,
        opacity: meta.defaultOpacity || 0.9
      });
    } else if (meta.type === 'vector-tile') {
      layer = L.esri.tiledMapLayer({
        url: meta.url,
        opacity: meta.defaultOpacity || 0.9
      });
    } else {
      layer = L.esri.featureLayer({
        url: meta.url
      });
      layer.bindPopup((l) => {
        const p = l.feature.properties;
        const keys = Object.keys(p).slice(0, 5);
        return `<div class="text-right">` + keys.map(k => `<div><strong>${k}:</strong> ${p[k]}</div>`).join('') + `</div>`;
      });
    }

    return layer;
  }

  /**
   * Set Layer Opacity
   */
  function setLayerOpacity(layerId, opacity) {
    if (state.layersMap.has(layerId)) {
      const layer = state.layersMap.get(layerId);
      if (layer.setOpacity) {
        layer.setOpacity(opacity);
      } else if (layer.setStyle) {
        layer.setStyle({ fillOpacity: opacity * 0.5, opacity: opacity });
      }
    }
  }

  /**
   * Zoom to Layer Extent
   */
  function zoomToLayer(layerId) {
    if (!state.layersMap.has(layerId)) return;
    const layer = state.layersMap.get(layerId);
    if (layer.getBounds && typeof layer.getBounds === 'function') {
      try {
        const b = layer.getBounds();
        if (b && b.isValid && b.isValid()) {
          map.fitBounds(b, { padding: [35, 35] });
          return;
        }
      } catch (err) {
        // Fallback to query
      }
    }
    if (layer.query) {
      layer.query().bounds((err, latlngbounds) => {
        if (!err && latlngbounds && latlngbounds.isValid()) {
          map.fitBounds(latlngbounds, { padding: [30, 30] });
        } else {
          showToast('تعذر تحديد النطاق الدقيق للطبقة', 'warning');
        }
      });
    }
  }

  /**
   * Render Active Layers Tab
   */
  function renderActiveLayersTab() {
    const container = document.getElementById('activeLayersList');
    if (!container) return;

    const activeList = [];
    state.layersMap.forEach((layer, id) => {
      if (map.hasLayer(layer)) {
        activeList.push({ id, layer, meta: state.layersMetadata.get(id) });
      }
    });

    const hasCalib = !!window.calibOverlayInstance;
    const isCalibVis = window.isCalibOverlayVisible ? window.isCalibOverlayVisible() : false;
    const isBmVis = (state.isBasemapVisible !== false);

    const basemapNames = {
      'dark-gray': 'الرمادي الداكن (Dark Gray)',
      'satellite': 'الصور الفضائية النقية (Pure Satellite)',
      'hybrid': 'الفضائية الهجينة (Hybrid Satellite)',
      'streets': 'الشوارع العامة (Standard Streets)',
      'osm': 'OpenStreetMap (OSM)',
      'topo': 'التضاريس والطبوغرافيا (Topographic)',
      'light-gray': 'الرمادي الفاتح (Light Gray)',
      'oceans': 'المحيطات والبحار (Oceans)'
    };
    const bmName = basemapNames[state.currentBasemapId] || state.currentBasemapId;

    let calibHtml = '';
    if (hasCalib) {
      const lbl = window.getCalibOverlayLabel ? window.getCalibOverlayLabel() : 'الخارطة المستوردة';
      calibHtml = `
        <div class="bg-gradient-to-r from-amber-950/40 via-slate-800 to-slate-800 border border-amber-500/50 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full ${isCalibVis ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-slate-600'}"></span>
              <h5 class="text-xs font-bold text-amber-200">${lbl}</h5>
              <span class="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">ECW / مستوردة</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button class="toggle-imported-layer-btn p-1 text-xs ${isCalibVis ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-300'}" title="${isCalibVis ? 'إخفاء الخريطة المستوردة' : 'إظهار الخريطة المستوردة'}">
                <i class="fa-solid ${isCalibVis ? 'fa-eye' : 'fa-eye-slash'}"></i>
              </button>
              <button class="remove-imported-layer-btn p-1 text-slate-400 hover:text-rose-400 text-xs" title="إزالة الخريطة المستوردة">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-300">
            <span>الرؤية: <strong class="${isCalibVis ? 'text-emerald-400' : 'text-slate-400'}">${isCalibVis ? 'معروضة على الخريطة' : 'مخفية مؤقتاً'}</strong></span>
            <button class="zoom-imported-layer-btn text-blue-400 hover:text-blue-300 text-[11px] flex items-center gap-1">
              <i class="fa-solid fa-crosshairs text-[10px]"></i>
              <span>التركيز على النطاق</span>
            </button>
          </div>
        </div>
      `;
    }

    const basemapHtml = `
      <div class="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${isBmVis ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'}"></span>
            <h5 class="text-xs font-semibold text-slate-200">خريطة الأساس الأصلية: ${bmName}</h5>
          </div>
          <button class="toggle-basemap-layer-btn p-1 text-xs ${isBmVis ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-300'}" title="${isBmVis ? 'إخفاء خريطة الأساس الأصلية' : 'إظهار خريطة الأساس الأصلية'}">
            <i class="fa-solid ${isBmVis ? 'fa-eye' : 'fa-eye-slash'}"></i>
          </button>
        </div>
        <div class="text-[10px] text-slate-400 flex items-center justify-between">
          <span>الحالة: <strong class="${isBmVis ? 'text-emerald-400' : 'text-slate-400'}">${isBmVis ? 'ظاهرة' : 'مخفية'}</strong></span>
          <span class="text-slate-500">الخريطة المرجعية</span>
        </div>
      </div>
    `;

    const layersHtml = activeList.map(({ id, layer, meta }) => {
      const curOpacity = Math.round((meta.defaultOpacity || 1) * 100);
      return `
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
              <h5 class="text-xs font-semibold text-slate-100">${meta.titleAr}</h5>
            </div>
            <button class="remove-active-layer-btn text-slate-400 hover:text-rose-400 text-xs transition-colors p-1" data-id="${id}" title="إخفاء الطبقة">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span>الشفافية: ${curOpacity}%</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value="${curOpacity}" 
              class="w-28 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-blue-500 active-tab-opacity" 
              data-id="${id}"
            >
          </div>
          <div class="flex justify-end gap-2 text-xs">
            <button class="text-blue-400 hover:text-blue-300 zoom-extent-btn text-[11px] flex items-center gap-1" data-id="${id}">
              <i class="fa-solid fa-crosshairs text-[10px]"></i>
              <span>التركيز على الطبقة</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = calibHtml + basemapHtml + layersHtml;

    // Attach Active Layers listeners
    const toggleImportedBtn = container.querySelector('.toggle-imported-layer-btn');
    if (toggleImportedBtn) {
      toggleImportedBtn.addEventListener('click', () => {
        if (window.toggleCalibOverlayVisibility) window.toggleCalibOverlayVisibility();
      });
    }

    const removeImportedBtn = container.querySelector('.remove-imported-layer-btn');
    if (removeImportedBtn) {
      removeImportedBtn.addEventListener('click', () => {
        if (window.removeCalibOverlay) window.removeCalibOverlay();
      });
    }

    const zoomImportedBtn = container.querySelector('.zoom-imported-layer-btn');
    if (zoomImportedBtn) {
      zoomImportedBtn.addEventListener('click', () => {
        if (window.zoomToCalibOverlay) window.zoomToCalibOverlay();
      });
    }

    const toggleBasemapBtn = container.querySelector('.toggle-basemap-layer-btn');
    if (toggleBasemapBtn) {
      toggleBasemapBtn.addEventListener('click', () => {
        if (window.toggleBasemapVisibility) window.toggleBasemapVisibility();
      });
    }

    container.querySelectorAll('.remove-active-layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        toggleLayer(id, false);
        renderCatalogList();
      });
    });

    container.querySelectorAll('.active-tab-opacity').forEach(slider => {
      slider.addEventListener('input', () => {
        const id = slider.getAttribute('data-id');
        const val = parseInt(slider.value, 10);
        setLayerOpacity(id, val / 100);
        renderCatalogList();
      });
    });

    container.querySelectorAll('.zoom-extent-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        zoomToLayer(btn.getAttribute('data-id'));
      });
    });

    updateActiveCountBadge();
  }

  /**
   * Update Badge Counter
   */
  function updateActiveCountBadge() {
    let count = 0;
    state.layersMap.forEach(l => {
      if (map.hasLayer(l)) count++;
    });
    if (window.calibOverlayInstance && window.isCalibOverlayVisible && window.isCalibOverlayVisible()) {
      count++;
    }
    const headerBadge = document.getElementById('activeLayersHeaderBadge');
    const tabBadge = document.getElementById('activeLayersTabBadge');
    if (headerBadge) headerBadge.textContent = count;
    if (tabBadge) tabBadge.textContent = count;
  }

  /**
   * Render Spatial Bookmarks
   */
  function renderBookmarks() {
    const bookmarksContainer = document.getElementById('bookmarksList');
    if (!bookmarksContainer) return;

    bookmarksContainer.innerHTML = ATLAS_BOOKMARKS.map(bm => `
      <button 
        class="bookmark-item w-full text-right p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 hover:border-blue-500/50 transition-all flex items-center justify-between group"
        data-id="${bm.id}"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
            <i class="fa-solid fa-location-dot text-sm"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-100 group-hover:text-white">${bm.nameAr}</div>
            <div class="text-[10px] text-slate-400 font-mono">${bm.nameEn}</div>
          </div>
        </div>
        <i class="fa-solid fa-chevron-left text-xs text-slate-500 group-hover:text-blue-400 transition-colors"></i>
      </button>
    `).join('');

    bookmarksContainer.querySelectorAll('.bookmark-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const bmId = btn.getAttribute('data-id');
        const bm = ATLAS_BOOKMARKS.find(b => b.id === bmId);
        if (bm) {
          const latlng = [bm.center[1], bm.center[0]];
          map.flyTo(latlng, bm.zoom, { duration: 1.5 });
          showToast(`تم الانتقال إلى: ${bm.nameAr}`, 'info');
        }
      });
    });
  }

  /**
   * Custom Layer Adder
   */
  function setupCustomLayerAdder() {
    const form = document.getElementById('customLayerForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = document.getElementById('customLayerUrl').value.trim();
      const title = document.getElementById('customLayerTitle').value.trim() || `طبقة مخصصة #${++state.customLayersCount}`;

      if (!url) {
        showToast('يرجى إدخال رابط الخدمة', 'warning');
        return;
      }

      const customId = `custom-layer-${Date.now()}`;
      const typeSelect = document.getElementById('customLayerType');
      const layerType = typeSelect ? typeSelect.value : 'feature';
      const meta = {
        id: customId,
        category: 'custom',
        titleAr: title,
        titleEn: 'Custom GIS Layer',
        descriptionAr: `طبقة خارجية مضافة (${layerType}): ${url}`,
        descriptionEn: `External GIS service (${layerType}): ${url}`,
        provider: 'مخصص',
        type: layerType,
        url: url,
        icon: layerType.includes('image') || layerType === 'wms' ? 'fa-satellite' : 'fa-cube',
        badge: layerType === 'image-server' ? 'ImageServer' : (layerType === 'wms' ? 'WMS' : 'مخصص'),
        badgeColor: 'purple',
        defaultOpacity: 0.9,
        defaultVisible: true
      };

      state.layersMetadata.set(customId, meta);
      showToast('جاري إضافة الطبقة...', 'info');

      try {
        const esriLayer = createEsriLeafletLayer(meta);
        state.layersMap.set(customId, esriLayer);
        esriLayer.addTo(map);

        updateActiveCountBadge();
        renderActiveLayersTab();
        renderCatalogList();

        zoomToLayer(customId);
        showToast(`تمت إضافة: ${title} بنجاح!`, 'success');
        document.getElementById('customLayerUrl').value = '';
        document.getElementById('customLayerTitle').value = '';
      } catch (err) {
        console.error('Custom layer error:', err);
        showToast('فشل إضافة الطبقة', 'error');
      }
    });
  }

  /**
   * Setup Official Archaeology Browser
   */
  function setupArchaeologyBrowser() {
    const searchInput = document.getElementById('archSearchInput');
    const filterChips = document.querySelectorAll('.arch-filter-chip');
    const toggleQuickBtn = document.getElementById('toggleArchLayerQuickBtn');
    const zoomAllBtn = document.getElementById('zoomAllArchBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.archSearchQuery = e.target.value.trim().toLowerCase();
        renderArchaeologyPanel();
      });
    }

    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => {
          c.classList.remove('active', 'bg-amber-500', 'text-slate-950', 'font-semibold');
          c.classList.add('bg-slate-800', 'text-slate-300', 'font-medium', 'border', 'border-slate-700');
        });
        chip.classList.add('active', 'bg-amber-500', 'text-slate-950', 'font-semibold');
        chip.classList.remove('bg-slate-800', 'text-slate-300', 'font-medium', 'border', 'border-slate-700');

        state.archCategoryFilter = chip.getAttribute('data-cat') || 'all';
        renderArchaeologyPanel();
      });
    });

    if (toggleQuickBtn) {
      toggleQuickBtn.addEventListener('click', () => {
        const isCurrentActive = state.layersMap.has('iraq-archaeology') && map.hasLayer(state.layersMap.get('iraq-archaeology'));
        toggleLayer('iraq-archaeology', !isCurrentActive);
        updateArchToggleBtnState();
        renderCatalogList();
      });
    }

    if (zoomAllBtn) {
      zoomAllBtn.addEventListener('click', () => {
        if (!state.layersMap.has('iraq-archaeology') || !map.hasLayer(state.layersMap.get('iraq-archaeology'))) {
          toggleLayer('iraq-archaeology', true);
          updateArchToggleBtnState();
        }
        zoomToLayer('iraq-archaeology');
        showToast('عرض جميع المواقع الأثرية في العراق', 'info');
      });
    }

    // Delegate click for popup zoom button
    document.addEventListener('click', (e) => {
      const zoomBtn = e.target.closest('.zoom-to-arch-site-btn');
      if (zoomBtn) {
        const lat = parseFloat(zoomBtn.getAttribute('data-lat'));
        const lng = parseFloat(zoomBtn.getAttribute('data-lng'));
        if (!isNaN(lat) && !isNaN(lng)) {
          map.flyTo([lat, lng], 16, { duration: 1.2 });
        }
      }
    });

    renderArchaeologyPanel();
    updateArchToggleBtnState();
  }

  /**
   * Update Archaeology Layer Toggle Button State in Panel
   */
  function updateArchToggleBtnState() {
    const isVis = state.layersMap.has('iraq-archaeology') && map.hasLayer(state.layersMap.get('iraq-archaeology'));
    const toggleQuickBtn = document.getElementById('toggleArchLayerQuickBtn');
    const eyeIcon = document.getElementById('archLayerToggleEyeIcon');
    const toggleText = document.getElementById('archLayerToggleText');

    if (toggleQuickBtn && eyeIcon && toggleText) {
      if (isVis) {
        eyeIcon.className = 'fa-solid fa-eye text-amber-400';
        toggleText.textContent = 'الطبقة معروضة';
        toggleQuickBtn.className = 'flex-1 py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all';
      } else {
        eyeIcon.className = 'fa-solid fa-eye-slash text-slate-500';
        toggleText.textContent = 'الطبقة مخفية';
        toggleQuickBtn.className = 'flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all';
      }
    }
  }

  /**
   * Render Archaeology Panel List
   */
  function renderArchaeologyPanel() {
    const container = document.getElementById('archaeologySitesList');
    if (!container) return;

    if (!window.IRAQ_ARCHAEOLOGY_DATA || !window.IRAQ_ARCHAEOLOGY_DATA.sites) {
      container.innerHTML = '<div class="text-xs text-slate-400 text-center py-4">جاري تحميل سجل المواقع الأثرية...</div>';
      return;
    }

    const sites = window.IRAQ_ARCHAEOLOGY_DATA.sites;
    const catFilter = state.archCategoryFilter || 'all';
    const query = state.archSearchQuery || '';

    const filtered = sites.filter(site => {
      if (catFilter !== 'all' && site.category !== catFilter) {
        return false;
      }
      if (query) {
        const str = `${site.nameAr} ${site.nameEn} ${site.ancientName || ''} ${site.governorate} ${site.civilization} ${site.period || ''} ${site.descriptionAr}`.toLowerCase();
        if (!str.includes(query)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-slate-400 space-y-2 bg-slate-900/40 rounded-xl border border-slate-800">
          <i class="fa-solid fa-monument text-2xl text-slate-600"></i>
          <p class="text-xs font-semibold text-slate-300">لم يتم العثور على مواقع أثرية مطابقة</p>
          <p class="text-[11px] text-slate-500">جرب تعديل كلمات البحث أو تغيير الفلتر.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(site => {
      let catBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      let catText = 'موقع يونسكو معتمد';
      let iconColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      let icon = 'fa-landmark';

      if (site.category === 'unesco_tentative') {
        catBadge = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
        catText = 'القائمة التمهيدية';
        iconColor = 'text-sky-400 bg-sky-500/10 border-sky-500/30';
        icon = 'fa-monument';
      } else if (site.category === 'national_registered') {
        catBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        catText = 'معلم وطني مسجل';
        iconColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        icon = 'fa-archway';
      }

      return `
        <div class="arch-site-card bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-xl p-3 flex flex-col gap-2 transition-all cursor-pointer group shadow-sm hover:shadow-md" data-id="${site.id}" data-lat="${site.lat}" data-lng="${site.lng}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center border text-xs shrink-0 mt-0.5 ${iconColor}">
                <i class="fa-solid ${icon}"></i>
              </span>
              <div>
                <h5 class="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">${site.nameAr}</h5>
                <div class="text-[10px] text-slate-400 font-mono">${site.nameEn}</div>
                ${site.ancientName ? `<div class="text-[10px] text-amber-400/90 font-mono mt-0.5">الاسم القديم: ${site.ancientName}</div>` : ''}
              </div>
            </div>
            <span class="text-[9px] px-2 py-0.5 rounded-full border ${catBadge} font-bold shrink-0 font-mono">
              ${catText}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-1 text-[10px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <div><span class="text-slate-500">المحافظة:</span> <strong class="text-slate-200">${site.governorate}</strong></div>
            <div><span class="text-slate-500">التسجيل:</span> <span class="text-slate-200 font-mono">${site.inscribedYear}</span></div>
            <div class="col-span-2 text-[10px] text-slate-400 truncate"><span class="text-slate-500">العصر:</span> ${site.civilization}</div>
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-slate-700/60 text-[11px]">
            <button type="button" class="fly-to-site-btn text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
              <i class="fa-solid fa-location-crosshairs text-[10px]"></i>
              <span>الذهاب للموقع والتفاصيل</span>
            </button>
            ${site.unescoUrl ? `
              <a href="${site.unescoUrl}" target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-sky-300 text-[10px] flex items-center gap-1" onclick="event.stopPropagation()">
                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                <span>اليونسكو</span>
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach click listener to each site card
    container.querySelectorAll('.arch-site-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const lat = parseFloat(card.getAttribute('data-lat'));
        const lng = parseFloat(card.getAttribute('data-lng'));

        if (!state.layersMap.has('iraq-archaeology') || !map.hasLayer(state.layersMap.get('iraq-archaeology'))) {
          toggleLayer('iraq-archaeology', true);
          updateArchToggleBtnState();
          renderCatalogList();
        }

        map.flyTo([lat, lng], 15, { duration: 1.2 });

        setTimeout(() => {
          const marker = state.archaeologyMarkers.get(id);
          if (marker) {
            marker.openPopup();
          }
        }, 1300);
      });
    });
  }

  /**
   * UI Events & Tabs
   */
  function setupUIEvents() {
    const catalogSearch = document.getElementById('catalogSearchInput');
    if (catalogSearch) {
      catalogSearch.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderCatalogList();
      });
    }

    setupArchaeologyBrowser();

    const tabButtons = document.querySelectorAll('.sidebar-tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        tabButtons.forEach(b => {
          b.classList.remove('active', 'border-blue-500', 'text-blue-400');
          b.classList.add('border-transparent', 'text-slate-400');
        });
        btn.classList.add('active', 'border-blue-500', 'text-blue-400');
        btn.classList.remove('border-transparent', 'text-slate-400');

        tabPanels.forEach(panel => {
          panel.classList.toggle('hidden', panel.getAttribute('data-panel') !== tab);
        });

        if (tab === 'active') {
          renderActiveLayersTab();
        } else if (tab === 'archaeology') {
          renderArchaeologyPanel();
          updateArchToggleBtnState();
        }
      });
    });

    const sidebar = document.getElementById('appSidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    if (toggleSidebarBtn && sidebar) {
      toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('translate-x-full');
      });
    }

    const toggleBasemapBtn = document.getElementById('toggleBasemapBtn');
    const basemapModal = document.getElementById('basemapModal');
    const closeBasemapBtn = document.getElementById('closeBasemapBtn');

    if (toggleBasemapBtn && basemapModal) {
      toggleBasemapBtn.addEventListener('click', () => {
        basemapModal.classList.toggle('hidden');
      });
    }
    if (closeBasemapBtn && basemapModal) {
      closeBasemapBtn.addEventListener('click', () => {
        basemapModal.classList.add('hidden');
      });
    }

    // Screenshot / Map Export
    const screenshotBtn = document.getElementById('screenshotBtn');
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Save current bookmark
    const addBookmarkBtn = document.getElementById('saveCurrentViewBookmark');
    if (addBookmarkBtn) {
      addBookmarkBtn.addEventListener('click', () => {
        const name = prompt('أدخل اسماً للإشارة المرجعية الجديدة:');
        if (!name) return;
        const center = map.getCenter();
        const newBm = {
          id: `bm-${Date.now()}`,
          nameAr: name,
          nameEn: 'Custom Saved Bookmark',
          center: [center.lng, center.lat],
          zoom: map.getZoom()
        };
        ATLAS_BOOKMARKS.unshift(newBm);
        renderBookmarks();
        showToast(`تم حفظ الإشارة المرجعية: ${name}`, 'success');
      });
    }
  }

  /**
   * Layer Details Modal
   */
  function showLayerInfoModal(layerId) {
    const meta = state.layersMetadata.get(layerId);
    if (!meta) return;

    const modal = document.getElementById('layerInfoModal');
    const titleEl = document.getElementById('infoModalTitle');
    const contentEl = document.getElementById('infoModalContent');
    const closeBtn = document.getElementById('closeInfoModalBtn');

    if (!modal || !titleEl || !contentEl) return;

    titleEl.textContent = meta.titleAr;
    contentEl.innerHTML = `
      <div class="space-y-4 text-sm text-slate-300">
        <div>
          <span class="text-xs text-slate-400 block mb-1">الاسم بالإنجليزية:</span>
          <p class="font-mono text-xs text-slate-200 bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">${meta.titleEn}</p>
        </div>
        <div>
          <span class="text-xs text-slate-400 block mb-1">الوصف العام:</span>
          <p class="leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-700/40">${meta.descriptionAr}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
            <span class="text-slate-400 block">المصدر والمزود:</span>
            <span class="font-semibold text-slate-200">${meta.provider || 'Living Atlas'}</span>
          </div>
          <div class="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
            <span class="text-slate-400 block">معدل التحديث:</span>
            <span class="font-semibold text-emerald-400">${meta.updateFrequency || 'مستمر'}</span>
          </div>
        </div>
        <div>
          <span class="text-xs text-slate-400 block mb-1">رابط خدمة ArcGIS REST Service:</span>
          <div class="flex items-center gap-2">
            <input type="text" readonly value="${meta.url}" class="w-full bg-slate-900 text-slate-300 font-mono text-[11px] p-2 rounded-lg border border-slate-700 select-all" />
            <a href="${meta.url}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs shrink-0 flex items-center gap-1.5 transition-colors">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
              فتح
            </a>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.add('hidden');
    }
  }

  /**
   * Toast Notifications Helper
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
      info: 'bg-blue-900/90 text-blue-200 border-blue-700/60',
      success: 'bg-emerald-900/90 text-emerald-200 border-emerald-700/60',
      warning: 'bg-amber-900/90 text-amber-200 border-amber-700/60',
      error: 'bg-rose-900/90 text-rose-200 border-rose-700/60'
    }[type] || 'bg-slate-900 text-slate-200 border-slate-700';

    const icons = {
      info: 'fa-circle-info',
      success: 'fa-circle-check',
      warning: 'fa-triangle-exclamation',
      error: 'fa-circle-exclamation'
    }[type] || 'fa-bell';

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium backdrop-blur-md transition-all duration-300 translate-y-2 opacity-0 ${colors}`;
    toast.innerHTML = `
      <i class="fa-solid ${icons} text-sm"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 20);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
});
