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
    currentBasemapId: 'satellite',
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

  // Add default Satellite basemap
  state.basemapLayers['satellite'].addTo(map);

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
      const bmid = btn.getAttribute('data-bm');
      const isCur = bmid === state.currentBasemapId;
      btn.classList.toggle('active-quick-bm', isCur);
      btn.classList.toggle('text-white', isCur);
      btn.classList.toggle('bg-blue-600', isCur);
      btn.classList.toggle('text-slate-300', !isCur);

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
    const sharpToggle = document.getElementById('calibSharpToggle');
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

    // AI Spatial Alignment & Landmark Matching Studio Elements
    const aiAutoScanHeaderBtn = document.getElementById('aiAutoScanHeaderBtn');
    const aiCoordsTextInput = document.getElementById('aiCoordsTextInput');
    const aiParseCoordsBtn = document.getElementById('aiParseCoordsBtn');
    const aiClearCoordsBtn = document.getElementById('aiClearCoordsBtn');
    const aiLandmarkSelect = document.getElementById('aiLandmarkSelect');
    const aiSnapLandmarkBtn = document.getElementById('aiSnapLandmarkBtn');
    const startGcpMatchBtn = document.getElementById('startGcpMatchBtn');
    const cancelGcpMatchBtn = document.getElementById('cancelGcpMatchBtn');
    const gcpStatusBadge = document.getElementById('gcpStatusBadge');
    const gcpBtnLabel = document.getElementById('gcpBtnLabel');
    const gcpInstructionsText = document.getElementById('gcpInstructionsText');

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

    let lastEcwRawBuffer = null;
    let lastEcwRawFile = null;

    // 2-Point GCP Affine Calibration State
    let isGcpMatchingActive = false;
    let gcpStep = 0; // 0: inactive, 1: imgPt1, 2: basePt1, 3: imgPt2, 4: basePt2
    let gcpPoints = {
      imgPt1: null,
      basePt1: null,
      imgPt2: null,
      basePt2: null
    };
    let gcpMarkers = [];
    let gcpLines = [];

    // Real-World Iraqi Visual Landmark Bounding Extents (21 Comprehensive Landmarks)
    const IRAQI_LANDMARKS = {
      'baghdad-kadhimya': {
        name: 'بغداد: انحناء دجلة والكاظمية / الأعظمية',
        province: 'بغداد',
        icon: 'fa-city',
        bounds: L.latLngBounds([33.3450, 44.2950], [33.4250, 44.3850]),
        center: [33.3850, 44.3400]
      },
      'baghdad-center': {
        name: 'بغداد: قلب العاصمة (التحرير والكرادة ودجلة)',
        province: 'بغداد',
        icon: 'fa-landmark',
        bounds: L.latLngBounds([33.2850, 44.3550], [33.3650, 44.4550]),
        center: [33.3250, 44.4050]
      },
      'baghdad-airport': {
        name: 'بغداد: مطار بغداد الدولي والمدرجات',
        province: 'بغداد',
        icon: 'fa-plane-departure',
        bounds: L.latLngBounds([33.2200, 44.1800], [33.2940, 44.2880]),
        center: [33.2570, 44.2340]
      },
      'basra-port': {
        name: 'البصرة: شط العرب وميناء المعقل والتنومة',
        province: 'البصرة',
        icon: 'fa-ship',
        bounds: L.latLngBounds([30.4900, 47.7500], [30.5900, 47.8700]),
        center: [30.5400, 47.8100]
      },
      'basra-stadium': {
        name: 'البصرة: شط البصرة وقناة المصب والمدينة الرياضية',
        province: 'البصرة',
        icon: 'fa-trophy',
        bounds: L.latLngBounds([30.3950, 47.7300], [30.4750, 47.8260]),
        center: [30.4350, 47.7780]
      },
      'erbil-citadel': {
        name: 'أربيل: قلعة أربيل ومحاور الشوارع الحلقية (30م-60م)',
        province: 'أربيل',
        icon: 'fa-monument',
        bounds: L.latLngBounds([36.1600, 43.9700], [36.2224, 44.0484]),
        center: [36.1912, 44.0092]
      },
      'mosul-center': {
        name: 'الموصل: الجسور الخمسة ودجلة والمدينة القديمة',
        province: 'نينوى',
        icon: 'fa-archway',
        bounds: L.latLngBounds([36.3000, 43.0900], [36.3800, 43.1900]),
        center: [36.3400, 43.1400]
      },
      'mosul-dam': {
        name: 'نينوى: بحيرة وجسم سد الموصل',
        province: 'نينوى',
        icon: 'fa-water',
        bounds: L.latLngBounds([36.5700, 42.7500], [36.6900, 42.9000]),
        center: [36.6300, 42.8250]
      },
      'habbaniyah-lake': {
        name: 'الأنبار: بحيرة الحبانية وسد ومجرى الفرات',
        province: 'الأنبار',
        icon: 'fa-water',
        bounds: L.latLngBounds([33.2200, 43.4700], [33.3600, 43.6700]),
        center: [33.2900, 43.5700]
      },
      'fallujah-city': {
        name: 'الأنبار: مجرى الفرات وجسر الفلوجة ومحيطها',
        province: 'الأنبار',
        icon: 'fa-bridge',
        bounds: L.latLngBounds([33.3250, 43.7400], [33.3850, 43.8250]),
        center: [33.3550, 43.7820]
      },
      'karbala-shrines': {
        name: 'كربلاء: العتبات المقدسة والمركز التاريخي',
        province: 'كربلاء',
        icon: 'fa-mosque',
        bounds: L.latLngBounds([32.6050, 43.9950], [32.6350, 44.0500]),
        center: [32.6160, 44.0320]
      },
      'razzaza-lake': {
        name: 'كربلاء: بحيرة الرزازة وبادية الأخيضر',
        province: 'كربلاء',
        icon: 'fa-water',
        bounds: L.latLngBounds([32.5500, 43.6500], [32.8100, 43.9300]),
        center: [32.6800, 43.7900]
      },
      'najaf-shrines': {
        name: 'النجف: الروضة الحيدرية ووادي السلام وبحر النجف',
        province: 'النجف',
        icon: 'fa-mosque',
        bounds: L.latLngBounds([31.9850, 44.3000], [32.0300, 44.3500]),
        center: [32.0000, 44.3180]
      },
      'samarra-dam': {
        name: 'صلاح الدين: سد سامراء وناظم الثرثار والملوية',
        province: 'صلاح الدين',
        icon: 'fa-monument',
        bounds: L.latLngBounds([34.1600, 43.7500], [34.2700, 43.8800]),
        center: [34.2150, 43.8150]
      },
      'babylon-ancient': {
        name: 'بابل: مدينة بابل الأثرية وشط الحلة',
        province: 'بابل',
        icon: 'fa-landmark',
        bounds: L.latLngBounds([32.5250, 44.4050], [32.5650, 44.4450]),
        center: [32.5430, 44.4230]
      },
      'ur-ziggurat': {
        name: 'ذي قار: زقورة أور والمدينة الأثرية التاريخية',
        province: 'ذي قار',
        icon: 'fa-monument',
        bounds: L.latLngBounds([30.9500, 46.0900], [30.9800, 46.1300]),
        center: [30.9628, 46.1030]
      },
      'chibayish-marshes': {
        name: 'ذي قار: أهوار الجبايش وملتقى دجلة والفرات',
        province: 'ذي قار',
        icon: 'fa-leaf',
        bounds: L.latLngBounds([30.9000, 46.9100], [31.0400, 47.1100]),
        center: [30.9700, 47.0100]
      },
      'dukan-lake': {
        name: 'السليمانية: بحيرة وخزان دوكان الجبلي',
        province: 'السليمانية',
        icon: 'fa-water',
        bounds: L.latLngBounds([35.8600, 44.8500], [36.0400, 45.0700]),
        center: [35.9500, 44.9600]
      },
      'kirkuk-citadel': {
        name: 'كركوك: قلعة كركوك ومرتفع بابا كركر',
        province: 'كركوك',
        icon: 'fa-monument',
        bounds: L.latLngBounds([35.4550, 44.3750], [35.5000, 44.4250]),
        center: [35.4700, 44.3950]
      },
      'duhok-center': {
        name: 'دهوك: سد دهوك ومجرى الوادي ومركز المدينة',
        province: 'دهوك',
        icon: 'fa-mountain-sun',
        bounds: L.latLngBounds([36.8400, 42.9600], [36.8900, 43.0300]),
        center: [36.8650, 42.9900]
      },
      'kut-barrage': {
        name: 'واسط: سدة الكوت ومجرى نهر دجلة',
        province: 'واسط',
        icon: 'fa-water',
        bounds: L.latLngBounds([32.4900, 45.8050], [32.5300, 45.8550]),
        center: [32.5050, 45.8280]
      }
    };

    let isOverlayVisible = true;
    let isBlinking = false;

    let visualState = {
      opacity: 0.85,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      invert: false,
      crisp: true
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
     * Extract Embedded Raster (JPEG / PNG Thumbnail or Preview) from Raw Binary Buffer
     */
    function extractEmbeddedRaster(buffer) {
      if (!buffer || buffer.byteLength < 1000) return null;
      const bytes = new Uint8Array(buffer);
      const len = bytes.length;

      // 1. Scan for JPEG Start of Image (0xFF, 0xD8, 0xFF)
      for (let i = 0; i < len - 4; i++) {
        if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
          // Look for JPEG End of Image (0xFF, 0xD9)
          for (let j = i + 100; j < len - 1; j++) {
            if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
              const jpegSlice = bytes.subarray(i, j + 2);
              if (jpegSlice.length >= 2048) { // Valid image preview >= 2KB
                try {
                  const blob = new Blob([jpegSlice], { type: 'image/jpeg' });
                  return URL.createObjectURL(blob);
                } catch (err) {
                  console.warn('Failed to construct JPEG preview blob:', err);
                }
              }
            }
          }
        }
      }

      // 2. Scan for PNG Signature (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
      for (let i = 0; i < len - 8; i++) {
        if (bytes[i] === 0x89 && bytes[i+1] === 0x50 && bytes[i+2] === 0x4E && bytes[i+3] === 0x47 &&
            bytes[i+4] === 0x0D && bytes[i+5] === 0x0A && bytes[i+6] === 0x1A && bytes[i+7] === 0x0A) {
          for (let j = i + 100; j < len - 7; j++) {
            if (bytes[j] === 0x49 && bytes[j+1] === 0x45 && bytes[j+2] === 0x4E && bytes[j+3] === 0x44) {
              const pngSlice = bytes.subarray(i, j + 8);
              if (pngSlice.length >= 2048) {
                try {
                  const blob = new Blob([pngSlice], { type: 'image/png' });
                  return URL.createObjectURL(blob);
                } catch (err) {
                  console.warn('Failed to construct PNG preview blob:', err);
                }
              }
            }
          }
        }
      }

      return null;
    }

    /**
     * Generate Informative High-Tech Vector Grid Footprint (SVG Data URL)
     * Replaces false satellite imagery with a clear raster footprint for ECW files
     */
    function generateEcwPlaceholderDataUrl(meta) {
      const width = 1200;
      const height = 900;
      const fileName = (meta.fileName || 'خريطة فضائية ECW').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const proj = (meta.projection || 'UTM Zone 38N').replace(/</g, '&lt;');
      const source = (meta.detectionSource || 'كشف ذكي').replace(/</g, '&lt;');
      const dims = `${(meta.width || 0).toLocaleString('ar-IQ')} × ${(meta.height || 0).toLocaleString('ar-IQ')} px`;

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <pattern id="ecwGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(245, 158, 11, 0.18)" stroke-width="1.5"/>
            <circle cx="0" cy="0" r="2" fill="rgba(245, 158, 11, 0.4)"/>
          </pattern>
          <linearGradient id="ecwBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#020617" stop-opacity="0.88"/>
            <stop offset="50%" stop-color="#0f172a" stop-opacity="0.84"/>
            <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0.88"/>
          </linearGradient>
        </defs>
        
        <rect width="${width}" height="${height}" fill="url(#ecwBg)" rx="16"/>
        <rect width="${width}" height="${height}" fill="url(#ecwGrid)"/>
        <rect width="${width}" height="${height}" fill="none" stroke="#f59e0b" stroke-width="6" rx="16"/>
        
        <circle cx="${width/2}" cy="${height/2}" r="240" fill="none" stroke="rgba(245, 158, 11, 0.25)" stroke-width="2" stroke-dasharray="8 6"/>
        <circle cx="${width/2}" cy="${height/2}" r="120" fill="none" stroke="rgba(245, 158, 11, 0.4)" stroke-width="2"/>
        <line x1="${width/2 - 280}" y1="${height/2}" x2="${width/2 + 280}" y2="${height/2}" stroke="#f59e0b" stroke-width="2"/>
        <line x1="${width/2}" y1="${height/2 - 280}" x2="${width/2}" y2="${height/2 + 280}" stroke="#f59e0b" stroke-width="2"/>
        
        <g transform="translate(60, 50)">
          <rect width="440" height="46" rx="8" fill="rgba(245, 158, 11, 0.25)" stroke="#f59e0b" stroke-width="2"/>
          <text x="220" y="30" fill="#fde68a" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" text-anchor="middle">نطاق خريطة فضائية مستوردة (ECW Footprint)</text>
        </g>

        <g transform="translate(${width/2 - 400}, ${height/2 - 140})">
          <rect width="800" height="280" rx="16" fill="rgba(15, 23, 42, 0.94)" stroke="rgba(245, 158, 11, 0.7)" stroke-width="2.5"/>
          
          <text x="400" y="55" fill="#ffffff" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle">📁 ${fileName}</text>
          
          <text x="400" y="105" fill="#38bdf8" font-family="system-ui, monospace" font-size="18" text-anchor="middle">📐 الأبعاد: ${dims} | الإسناد: ${proj}</text>
          <text x="400" y="145" fill="#34d399" font-family="system-ui, sans-serif" font-size="17" text-anchor="middle">🎯 مصدر الإحداثيات: ${source}</text>
          
          <line x1="80" y1="175" x2="720" y2="175" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
          
          <text x="400" y="215" fill="#fde047" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">✨ لعرض صورة الخارطة: اختر (إقران صورة PNG/JPG) أو طابق المعالم</text>
          <text x="400" y="250" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="15" text-anchor="middle">يمكنك سحب وإفلات صورة الخارطة المصدرة هنا في أي وقت لإظهارها فوراً</text>
        </g>

        <text x="45" y="${height - 35}" fill="#94a3b8" font-family="monospace" font-size="15">SW CORNER</text>
        <text x="${width - 160}" y="${height - 35}" fill="#94a3b8" font-family="monospace" font-size="15">SE CORNER</text>
        <text x="45" y="40" fill="#94a3b8" font-family="monospace" font-size="15">NW CORNER</text>
        <text x="${width - 160}" y="40" fill="#94a3b8" font-family="monospace" font-size="15">NE CORNER</text>
      </svg>`;
      
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    /**
     * Parse GeoTIFF Header (ModelTiepointTag & ModelPixelScaleTag)
     */
    function parseTIFFGeoHeader(buffer, fileName) {
      if (!buffer || buffer.byteLength < 16) return null;
      const view = new DataView(buffer);
      
      const byteOrder = view.getUint16(0);
      let isLE = false;
      if (byteOrder === 0x4949) {
        isLE = true;
      } else if (byteOrder === 0x4D4D) {
        isLE = false;
      } else {
        return null;
      }
      
      const magic = view.getUint16(2, isLE);
      if (magic !== 42 && magic !== 0x2B) return null;
      
      const ifdOffset = view.getUint32(4, isLE);
      if (ifdOffset <= 0 || ifdOffset >= buffer.byteLength) return null;
      
      const numEntries = view.getUint16(ifdOffset, isLE);
      let entryOffset = ifdOffset + 2;
      
      let width = null, height = null;
      let pixelScale = null;
      let tiepoints = null;
      let epsgCode = null;
      
      for (let e = 0; e < numEntries; e++) {
        if (entryOffset + 12 > buffer.byteLength) break;
        const tag = view.getUint16(entryOffset, isLE);
        const type = view.getUint16(entryOffset + 2, isLE);
        const count = view.getUint32(entryOffset + 4, isLE);
        
        if (tag === 256) {
          width = (type === 3) ? view.getUint16(entryOffset + 8, isLE) : view.getUint32(entryOffset + 8, isLE);
        } else if (tag === 257) {
          height = (type === 3) ? view.getUint16(entryOffset + 8, isLE) : view.getUint32(entryOffset + 8, isLE);
        } else if (tag === 33550 && count >= 2) {
          const valOffset = view.getUint32(entryOffset + 8, isLE);
          if (valOffset + 24 <= buffer.byteLength) {
            pixelScale = [
              view.getFloat64(valOffset, isLE),
              view.getFloat64(valOffset + 8, isLE),
              view.getFloat64(valOffset + 16, isLE)
            ];
          }
        } else if (tag === 33922 && count >= 6) {
          const valOffset = view.getUint32(entryOffset + 8, isLE);
          if (valOffset + 48 <= buffer.byteLength) {
            tiepoints = [
              view.getFloat64(valOffset, isLE),
              view.getFloat64(valOffset + 8, isLE),
              view.getFloat64(valOffset + 16, isLE),
              view.getFloat64(valOffset + 24, isLE),
              view.getFloat64(valOffset + 32, isLE),
              view.getFloat64(valOffset + 40, isLE)
            ];
          }
        } else if (tag === 34735 && count >= 4) {
          const valOffset = view.getUint32(entryOffset + 8, isLE);
          if (valOffset + count * 2 <= buffer.byteLength) {
            const numKeys = view.getUint16(valOffset + 6, isLE);
            for (let k = 0; k < numKeys; k++) {
              const keyOff = valOffset + 8 + k * 8;
              if (keyOff + 8 <= buffer.byteLength) {
                const keyId = view.getUint16(keyOff, isLE);
                const val = view.getUint16(keyOff + 6, isLE);
                if (keyId === 3072) {
                  epsgCode = val;
                } else if (keyId === 2048 && !epsgCode) {
                  epsgCode = val;
                }
              }
            }
          }
        }
        entryOffset += 12;
      }
      
      if (tiepoints && pixelScale && width && height) {
        const originX = tiepoints[3];
        const originY = tiepoints[4];
        const scaleX = pixelScale[0];
        const scaleY = pixelScale[1];
        
        let utmZone = 38;
        let projection = 'UTM Zone 38N (EPSG:32638)';
        if (epsgCode === 32637 || (originX > 100000 && originX < 500000 && fileName.includes('37'))) {
          utmZone = 37;
          projection = 'UTM Zone 37N (EPSG:32637)';
        } else if (epsgCode === 32639) {
          utmZone = 39;
          projection = 'UTM Zone 39N (EPSG:32639)';
        } else if (epsgCode === 4326) {
          projection = 'WGS84 Geodetic (EPSG:4326)';
        }
        
        return {
          fileName,
          isECW: false,
          width,
          height,
          bands: 3,
          compression: 1,
          originX,
          originY,
          cellIncrementX: scaleX,
          cellIncrementY: -scaleY,
          projection,
          utmZone,
          datum: 'WGS84',
          detectionSource: `بيانات GeoTIFF الأصلية (EPSG:${epsgCode || 32638})`
        };
      }
      
      return null;
    }

    function getTiffBandStats(band) {
      if (!band || band.length === 0) return { min: 0, max: 255, is8bit: true };
      let min = Infinity, max = -Infinity;
      const len = band.length;
      const step = Math.max(1, Math.floor(len / 3000));
      for (let i = 0; i < len; i += step) {
        const val = band[i];
        if (isFinite(val) && val > 0) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
      if (!isFinite(min)) min = 0;
      if (!isFinite(max) || max <= min) max = min + 255;
      return { min, max, is8bit: max <= 255 && min >= 0 };
    }

    function normalizeTiffVal(val, stat) {
      if (!isFinite(val)) return 0;
      if (stat.is8bit) return Math.min(255, Math.max(0, Math.round(val)));
      const range = stat.max - stat.min;
      if (range <= 0) return 0;
      return Math.min(255, Math.max(0, Math.round(((val - stat.min) / range) * 255)));
    }

    /**
     * Advanced Dual-Engine TIFF & GeoTIFF Decoder
     * Engine 1: GeoTIFF.js (Standard for satellite, BigTIFF, and tiled raster mosaics)
     * Engine 2: UTIF.js (Fallback for classic stripped TIFF images)
     * Engine 3: Native GeoTIFF Binary Header Scanner
     */
    async function decodeTiffDataset(buffer, fileName) {
      let geoMeta = null;
      let pngDataUrl = null;
      let width = 0;
      let height = 0;

      // 1. Try GeoTIFF.js first (Supports BigTIFF, Tiled, Overviews, LZW, Deflate, JPEG)
      if (typeof GeoTIFF !== 'undefined') {
        try {
          const tiff = await GeoTIFF.fromArrayBuffer(buffer);
          const imageCount = typeof tiff.getImageCount === 'function' ? await tiff.getImageCount() : 1;
          const mainImage = await tiff.getImage(0);
          width = mainImage.getWidth();
          height = mainImage.getHeight();

          // Geographic bounding box: [minX, minY, maxX, maxY]
          let bbox = null;
          try {
            bbox = mainImage.getBoundingBox();
          } catch (be) {}

          let originX = null, originY = null, resX = 0.5, resY = 0.5;
          try {
            const origin = mainImage.getOrigin();
            if (origin && origin.length >= 2) {
              originX = origin[0];
              originY = origin[1];
            }
          } catch (oe) {}

          try {
            const res = mainImage.getResolution();
            if (res && res.length >= 2) {
              resX = Math.abs(res[0]);
              resY = Math.abs(res[1]);
            }
          } catch (re) {}

          let epsgCode = 32638;
          try {
            const geoKeys = mainImage.getGeoKeys();
            if (geoKeys) {
              epsgCode = geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey || 32638;
            }
          } catch (ge) {}

          if (bbox && bbox.length >= 4) {
            const minX = bbox[0];
            const minY = bbox[1];
            const maxX = bbox[2];
            const maxY = bbox[3];

            let utmZone = 38;
            let proj = `UTM Zone 38N (EPSG:${epsgCode})`;
            if (epsgCode === 32637 || (minX > 100000 && minX < 500000 && fileName.includes('37'))) {
              utmZone = 37;
              proj = 'UTM Zone 37N (EPSG:32637)';
            } else if (epsgCode === 32639) {
              utmZone = 39;
              proj = 'UTM Zone 39N (EPSG:32639)';
            } else if (epsgCode === 4326 || (minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90)) {
              proj = 'WGS84 Geodetic (EPSG:4326)';
            }

            geoMeta = {
              fileName: fileName,
              isECW: false,
              width: width,
              height: height,
              bands: mainImage.getSamplesPerPixel() || 3,
              compression: 1,
              originX: minX,
              originY: maxY,
              cellIncrementX: resX,
              cellIncrementY: -resY,
              projection: proj,
              utmZone: utmZone,
              datum: 'WGS84',
              detectionSource: `بيانات GeoTIFF الأصلية (EPSG:${epsgCode})`
            };
          } else if (originX !== null && originY !== null) {
            let utmZone = 38;
            let proj = `UTM Zone 38N (EPSG:${epsgCode})`;
            if (epsgCode === 4326 || (originX >= -180 && originX <= 180 && originY >= -90 && originY <= 90)) {
              proj = 'WGS84 Geodetic (EPSG:4326)';
            }
            geoMeta = {
              fileName: fileName,
              isECW: false,
              width: width,
              height: height,
              bands: mainImage.getSamplesPerPixel() || 3,
              compression: 1,
              originX: originX,
              originY: originY,
              cellIncrementX: resX,
              cellIncrementY: -resY,
              projection: proj,
              utmZone: utmZone,
              datum: 'WGS84',
              detectionSource: `بيانات GeoTIFF الأصلية (EPSG:${epsgCode})`
            };
          }

          // Select best resolution image to render: if overviews exist, pick overview closest to 3840px
          const targetUHD = 3840;
          let renderImage = mainImage;
          if (imageCount > 1 && (width > targetUHD || height > targetUHD)) {
            let bestOverview = null;
            let bestDiff = Infinity;
            for (let idx = 1; idx < imageCount; idx++) {
              try {
                const ov = await tiff.getImage(idx);
                const ow = ov.getWidth();
                const oh = ov.getHeight();
                const maxO = Math.max(ow, oh);
                const diff = Math.abs(maxO - targetUHD);
                if (diff < bestDiff) {
                  bestDiff = diff;
                  bestOverview = ov;
                }
              } catch (ove) {}
            }
            if (bestOverview) {
              renderImage = bestOverview;
            }
          }

          const rw = renderImage.getWidth();
          const rh = renderImage.getHeight();

          // Strategy A: readRGB directly on renderImage (Proven fast and high quality)
          try {
            const rgb = await renderImage.readRGB();
            if (rgb && rgb.length >= rw * rh * 3) {
              const srcCanvas = document.createElement('canvas');
              srcCanvas.width = rw;
              srcCanvas.height = rh;
              const ctx = srcCanvas.getContext('2d');
              const imgData = ctx.createImageData(rw, rh);
              for (let i = 0, j = 0; i < rgb.length && j < rw * rh * 4; i += 3, j += 4) {
                imgData.data[j]     = rgb[i];
                imgData.data[j + 1] = rgb[i + 1];
                imgData.data[j + 2] = rgb[i + 2];
                imgData.data[j + 3] = 255;
              }
              ctx.putImageData(imgData, 0, 0);

              const maxDim = 3840;
              if (rw > maxDim || rh > maxDim) {
                const sc = Math.min(maxDim / rw, maxDim / rh);
                const tw = Math.round(rw * sc);
                const th = Math.round(rh * sc);
                const destCanvas = document.createElement('canvas');
                destCanvas.width = tw;
                destCanvas.height = th;
                destCanvas.getContext('2d').drawImage(srcCanvas, 0, 0, tw, th);
                pngDataUrl = destCanvas.toDataURL('image/jpeg', 0.94);
              } else {
                pngDataUrl = srcCanvas.toDataURL('image/jpeg', 0.94);
              }
            }
          } catch (rgbE) {
            console.warn('readRGB on renderImage failed, trying readRasters:', rgbE);
          }

          // Strategy B: readRasters on renderImage (for multi-band / satellite rasters)
          if (!pngDataUrl) {
            try {
              const rasters = await renderImage.readRasters();
              if (rasters && rasters.length > 0 && rasters[0]) {
                const srcCanvas = document.createElement('canvas');
                srcCanvas.width = rw;
                srcCanvas.height = rh;
                const ctx = srcCanvas.getContext('2d');
                const imgData = ctx.createImageData(rw, rh);
                const b0 = rasters[0];
                const b1 = rasters.length > 1 ? rasters[1] : b0;
                const b2 = rasters.length > 2 ? rasters[2] : b0;
                const bA = rasters.length > 3 ? rasters[3] : null;

                const rStat = getTiffBandStats(b0);
                const gStat = rasters.length > 1 ? getTiffBandStats(b1) : rStat;
                const bStat = rasters.length > 2 ? getTiffBandStats(b2) : rStat;

                for (let idx = 0, p = 0; idx < rw * rh && idx < b0.length; idx++, p += 4) {
                  imgData.data[p]     = normalizeTiffVal(b0[idx], rStat);
                  imgData.data[p + 1] = normalizeTiffVal(b1[idx], gStat);
                  imgData.data[p + 2] = normalizeTiffVal(b2[idx], bStat);
                  imgData.data[p + 3] = bA ? Math.min(255, Math.max(0, Math.round(bA[idx]))) : 255;
                }
                ctx.putImageData(imgData, 0, 0);

                const maxDim = 3840;
                if (rw > maxDim || rh > maxDim) {
                  const sc = Math.min(maxDim / rw, maxDim / rh);
                  const tw = Math.round(rw * sc);
                  const th = Math.round(rh * sc);
                  const destCanvas = document.createElement('canvas');
                  destCanvas.width = tw;
                  destCanvas.height = th;
                  destCanvas.getContext('2d').drawImage(srcCanvas, 0, 0, tw, th);
                  pngDataUrl = destCanvas.toDataURL('image/jpeg', 0.94);
                } else {
                  pngDataUrl = srcCanvas.toDataURL('image/jpeg', 0.94);
                }
              }
            } catch (rastE) {
              console.warn('readRasters on renderImage failed:', rastE);
            }
          }

          // Strategy C: If renderImage was an overview and failed, try mainImage directly
          if (!pngDataUrl && renderImage !== mainImage && width * height <= 20000000) {
            try {
              const rgb = await mainImage.readRGB();
              if (rgb && rgb.length >= width * height * 3) {
                const srcCanvas = document.createElement('canvas');
                srcCanvas.width = width;
                srcCanvas.height = height;
                const ctx = srcCanvas.getContext('2d');
                const imgData = ctx.createImageData(width, height);
                for (let i = 0, j = 0; i < rgb.length && j < width * height * 4; i += 3, j += 4) {
                  imgData.data[j]     = rgb[i];
                  imgData.data[j + 1] = rgb[i + 1];
                  imgData.data[j + 2] = rgb[i + 2];
                  imgData.data[j + 3] = 255;
                }
                ctx.putImageData(imgData, 0, 0);
                const maxDim = 3840;
                if (width > maxDim || height > maxDim) {
                  const sc = Math.min(maxDim / width, maxDim / height);
                  const tw = Math.round(width * sc);
                  const th = Math.round(height * sc);
                  const destCanvas = document.createElement('canvas');
                  destCanvas.width = tw;
                  destCanvas.height = th;
                  destCanvas.getContext('2d').drawImage(srcCanvas, 0, 0, tw, th);
                  pngDataUrl = destCanvas.toDataURL('image/jpeg', 0.94);
                } else {
                  pngDataUrl = srcCanvas.toDataURL('image/jpeg', 0.94);
                }
              }
            } catch (mainE) {
              console.warn('mainImage readRGB failed:', mainE);
            }
          }
        } catch (gtErr) {
          console.warn('GeoTIFF.js could not decode, will try UTIF:', gtErr);
        }
      }

      // 2. Fallback to parseTIFFGeoHeader if GeoTIFF.js didn't extract coordinates
      if (!geoMeta) {
        geoMeta = parseTIFFGeoHeader(buffer, fileName);
      }

      // 3. Fallback to UTIF.js if GeoTIFF.js didn't produce visual raster
      if (!pngDataUrl && typeof UTIF !== 'undefined') {
        try {
          const ifds = UTIF.decode(buffer);
          if (ifds && ifds.length > 0) {
            UTIF.decodeImage(buffer, ifds[0]);
            const rgba = UTIF.toRGBA8(ifds[0]);
            const w = ifds[0].width;
            const h = ifds[0].height;
            if (rgba && w > 0 && h > 0) {
              width = width || w;
              height = height || h;
              const srcCanvas = document.createElement('canvas');
              srcCanvas.width = w;
              srcCanvas.height = h;
              const srcCtx = srcCanvas.getContext('2d');
              const imgData = srcCtx.createImageData(w, h);
              imgData.data.set(rgba);
              srcCtx.putImageData(imgData, 0, 0);

              const maxDim = 3840;
              if (w > maxDim || h > maxDim) {
                const sc = Math.min(maxDim / w, maxDim / h);
                const tw = Math.round(w * sc);
                const th = Math.round(h * sc);
                const destCanvas = document.createElement('canvas');
                destCanvas.width = tw;
                destCanvas.height = th;
                destCanvas.getContext('2d').drawImage(srcCanvas, 0, 0, tw, th);
                pngDataUrl = destCanvas.toDataURL('image/jpeg', 0.94);
              } else {
                pngDataUrl = srcCanvas.toDataURL('image/jpeg', 0.94);
              }
            }
          }
        } catch (utifErr) {
          console.warn('UTIF.js fallback error:', utifErr);
        }
      }

      // 4. If visual raster STILL failed (e.g. unsupported compression),
      // generate an informative vector footprint with the real metadata so it never fails!
      if (!pngDataUrl && geoMeta) {
        pngDataUrl = generateEcwPlaceholderDataUrl(geoMeta);
      }

      return { geoMeta, pngDataUrl, width, height };
    }

    /**
     * Parse ECW Binary Header with AI Deep Scanner, IEEE 754 Search, and Iraq Heuristics
     */
    function parseECWHeader(buffer, fileName, fileSize = 0) {
      const view = new DataView(buffer);
      const meta = {
        fileName: fileName,
        fileSizeMb: (fileSize / (1024 * 1024)).toFixed(1),
        isECW: false,
        version: 2,
        width: 12000,
        height: 10000,
        bands: 3,
        compression: 10,
        projection: 'UTM Zone 38N (EPSG:32638)',
        datum: 'WGS84',
        cellSizeUnits: 'METERS',
        cellIncrementX: 0.50,
        cellIncrementY: -0.50,
        originX: null,
        originY: null,
        utmZone: 38,
        isNorthern: true,
        detectionSource: 'غير محدد بعد'
      };

      // 1. ECW Header Signature & Dimensions
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

      // 2. Direct ECW v2/v3 Fixed Offsets Double Float Check
      let foundDirectCoords = false;
      for (const off of [32, 36, 40, 28, 48]) {
        for (const isLE of [false, true]) {
          if (off + 16 <= buffer.byteLength) {
            try {
              const ox = view.getFloat64(off, isLE);
              const oy = view.getFloat64(off + 8, isLE);
              if (isFinite(ox) && isFinite(oy)) {
                if (ox >= 150000 && ox <= 850000 && oy >= 3200000 && oy <= 4300000) {
                  meta.originX = ox;
                  meta.originY = oy;
                  meta.detectionSource = `ترويسة ECW الثنائية المباشرة (Offset ${off})`;
                  foundDirectCoords = true;
                  break;
                } else if (ox >= 38.0 && ox <= 49.5 && oy >= 28.5 && oy <= 38.5) {
                  meta.originX = ox;
                  meta.originY = oy;
                  meta.projection = 'WGS84 Geodetic (EPSG:4326)';
                  meta.cellSizeUnits = 'DEGREES';
                  meta.detectionSource = `ترويسة ECW الثنائية الجغرافية (Offset ${off})`;
                  foundDirectCoords = true;
                  break;
                }
              }
            } catch (err) {}
          }
        }
        if (foundDirectCoords) break;
      }

      // 3. ASCII & XML Scanner for embedded metadata keywords
      let text = '';
      try {
        const bytes = new Uint8Array(buffer);
        const textLimit = Math.min(bytes.length, 131072);
        for (let i = 0; i < textLimit; i++) {
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

      let foundTextCoords = false;
      if (!foundDirectCoords && text) {
        const oxMatch = text.match(/(?:OriginX|Eastings|<OriginX>)\s*[:=><]?\s*([+\-0-9.eE]+)/i);
        if (oxMatch) {
          meta.originX = parseFloat(oxMatch[1]);
          foundTextCoords = true;
        }

        const oyMatch = text.match(/(?:OriginY|Northings|<OriginY>)\s*[:=><]?\s*([+\-0-9.eE]+)/i);
        if (oyMatch) {
          meta.originY = parseFloat(oyMatch[1]);
          foundTextCoords = true;
        }

        const cixMatch = text.match(/(?:CellIncrementX|Xdimension|<CellIncrementX>)\s*[:=><]?\s*([+\-0-9.eE]+)/i);
        if (cixMatch) meta.cellIncrementX = parseFloat(cixMatch[1]);

        const ciyMatch = text.match(/(?:CellIncrementY|Ydimension|<CellIncrementY>)\s*[:=><]?\s*([+\-0-9.eE]+)/i);
        if (ciyMatch) meta.cellIncrementY = parseFloat(ciyMatch[1]);

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

        if (foundTextCoords) {
          meta.detectionSource = 'ميتاداتا نصية مدمجة (ASCII / XML Header)';
        }
      }

      // 4. AI Deep Binary IEEE 754 Float64 Scanner
      if (!foundDirectCoords && !foundTextCoords && buffer.byteLength > 64) {
        let foundBinaryCoords = false;
        const scanLimit = Math.min(buffer.byteLength - 8, 65536);

        for (const isLE of [false, true]) {
          if (foundBinaryCoords) break;
          for (let offset = 16; offset < scanLimit; offset += 4) {
            try {
              const val1 = view.getFloat64(offset, isLE);
              if (!isFinite(val1)) continue;

              // Easting (UTM 150k - 850k)
              if (val1 >= 150000 && val1 <= 850000) {
                for (let step = 8; step <= 48; step += 8) {
                  if (offset + step + 8 <= buffer.byteLength) {
                    const val2 = view.getFloat64(offset + step, isLE);
                    if (isFinite(val2) && val2 >= 3200000 && val2 <= 4300000) {
                      meta.originX = val1;
                      meta.originY = val2;
                      meta.utmZone = (val1 > 500000 && fileName && fileName.toLowerCase().includes('37')) ? 37 : 38;
                      meta.projection = `UTM Zone ${meta.utmZone}N (EPSG:${32600 + meta.utmZone})`;
                      meta.detectionSource = 'مسح ثنائي عميق بالذكاء الاصطناعي (IEEE 754 UTM)';
                      foundBinaryCoords = true;
                      break;
                    }
                  }
                }
              }
              // Northing first
              else if (val1 >= 3200000 && val1 <= 4300000) {
                for (let step = 8; step <= 48; step += 8) {
                  if (offset + step + 8 <= buffer.byteLength) {
                    const val2 = view.getFloat64(offset + step, isLE);
                    if (isFinite(val2) && val2 >= 150000 && val2 <= 850000) {
                      meta.originY = val1;
                      meta.originX = val2;
                      meta.utmZone = 38;
                      meta.projection = `UTM Zone 38N (EPSG:32638)`;
                      meta.detectionSource = 'مسح ثنائي عميق بالذكاء الاصطناعي (IEEE 754 UTM)';
                      foundBinaryCoords = true;
                      break;
                    }
                  }
                }
              }
              // WGS84 Geodetic
              else if (val1 >= 38.0 && val1 <= 49.5) {
                for (let step = 8; step <= 48; step += 8) {
                  if (offset + step + 8 <= buffer.byteLength) {
                    const val2 = view.getFloat64(offset + step, isLE);
                    if (isFinite(val2) && val2 >= 28.5 && val2 <= 38.5) {
                      meta.originX = val1;
                      meta.originY = val2;
                      meta.projection = 'WGS84 Geodetic (EPSG:4326)';
                      meta.cellSizeUnits = 'DEGREES';
                      meta.detectionSource = 'مسح ثنائي عميق بالذكاء الاصطناعي (IEEE 754 WGS84)';
                      foundBinaryCoords = true;
                      break;
                    }
                  }
                }
              }
              if (foundBinaryCoords) break;
            } catch (err) {}
          }
        }
      }

      // 5. AI Heuristic Analysis from Filename across all Iraqi Governorates & Landmarks
      if ((meta.originX === null || meta.originY === null) && fileName) {
        const lowerName = fileName.toLowerCase();
        const coordNameMatch = lowerName.match(/(?:e|east)?([1-8]\d{5})[_\- ]+(?:n|north)?([34]\d{6})/i);
        if (coordNameMatch) {
          meta.originX = parseFloat(coordNameMatch[1]);
          meta.originY = parseFloat(coordNameMatch[2]);
          meta.detectionSource = 'كشف ذكي من إحداثيات اسم الملف (UTM)';
        } else if (lowerName.includes('basra') || lowerName.includes('shatt') || lowerName.includes('fao') || lowerName.includes('zubair') || lowerName.includes('بصرة')) {
          meta.originX = 765400; meta.originY = 3375800; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (البصرة)';
        } else if (lowerName.includes('erbil') || lowerName.includes('arbil') || lowerName.includes('hawler') || lowerName.includes('أربيل')) {
          meta.originX = 408500; meta.originY = 4004200; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (أربيل)';
        } else if (lowerName.includes('mosul') || lowerName.includes('nineveh') || lowerName.includes('ninawa') || lowerName.includes('موصل') || lowerName.includes('نينوى')) {
          meta.originX = 333000; meta.originY = 4023000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (الموصل)';
        } else if (lowerName.includes('sulayman') || lowerName.includes('slemani') || lowerName.includes('dukan') || lowerName.includes('سليمانية')) {
          meta.originX = 496000; meta.originY = 3938000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (السليمانية)';
        } else if (lowerName.includes('karbala') || lowerName.includes('razzaza') || lowerName.includes('كربلاء')) {
          meta.originX = 387000; meta.originY = 3612000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (كربلاء)';
        } else if (lowerName.includes('najaf') || lowerName.includes('kufa') || lowerName.includes('نجف') || lowerName.includes('كوفة')) {
          meta.originX = 437000; meta.originY = 3543000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (النجف)';
        } else if (lowerName.includes('anbar') || lowerName.includes('habbaniyah') || lowerName.includes('ramadi') || lowerName.includes('fallujah') || lowerName.includes('أنبار')) {
          meta.originX = 366000; meta.originY = 3698000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (الأنبار)';
        } else if (lowerName.includes('samarra') || lowerName.includes('salah') || lowerName.includes('سامراء') || lowerName.includes('صلاح الدين')) {
          meta.originX = 391000; meta.originY = 3786000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (سامراء)';
        } else if (lowerName.includes('chibayish') || lowerName.includes('nasiriyah') || lowerName.includes('marsh') || lowerName.includes('جبايش') || lowerName.includes('ناصرية') || lowerName.includes('أهوار')) {
          meta.originX = 693000; meta.originY = 3428000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المنطقة (الأهوار والناصرية)';
        } else if (lowerName.includes('kirkuk') || lowerName.includes('كركوك')) {
          meta.originX = 444000; meta.originY = 3924000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (كركوك)';
        } else if (lowerName.includes('duhok') || lowerName.includes('دهوك') || lowerName.includes('zakho')) {
          meta.originX = 318000; meta.originY = 4078000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (دهوك)';
        } else if (lowerName.includes('babil') || lowerName.includes('babylon') || lowerName.includes('hilla') || lowerName.includes('بابل') || lowerName.includes('حلة')) {
          meta.originX = 447000; meta.originY = 3600000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (بابل)';
        } else if (lowerName.includes('wasit') || lowerName.includes('kut') || lowerName.includes('واسط') || lowerName.includes('كوت')) {
          meta.originX = 578000; meta.originY = 3601000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (واسط)';
        } else if (lowerName.includes('diyala') || lowerName.includes('baqubah') || lowerName.includes('ديالى') || lowerName.includes('بعقوبة')) {
          meta.originX = 472000; meta.originY = 3734000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المحافظة (ديالى)';
        } else if (lowerName.includes('fadileh') || lowerName.includes('fadhili') || lowerName.includes('fadili') || lowerName.includes('فضيلية') || lowerName.includes('فاضلية')) {
          meta.originX = 458000; meta.originY = 3690000; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم المنطقة (الفضيلية / شرق بغداد)';
        } else if (lowerName.includes('baghdad') || lowerName.includes('بغداد')) {
          meta.originX = 444500; meta.originY = 3687500; meta.utmZone = 38;
          meta.detectionSource = 'مطابقة ذكية لاسم العاصمة (بغداد)';
        }
      }

      return meta;
    }

    /**
     * Parse Sidecar .ERS / .EWW / .TFW / .JGW / .WLD text if present
     */
    function parseSidecarMetadata(text, meta) {
      if (!text) return meta;

      // 1. Check 6-line World File format (.tfw, .jgw, .pgw, .wld)
      const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length >= 6 && !isNaN(parseFloat(lines[0])) && !isNaN(parseFloat(lines[4])) && !isNaN(parseFloat(lines[5]))) {
        const xRes = parseFloat(lines[0]);
        const yRes = parseFloat(lines[3]);
        const origX = parseFloat(lines[4]);
        const origY = parseFloat(lines[5]);
        if (isFinite(origX) && isFinite(origY)) {
          meta.cellIncrementX = xRes;
          meta.cellIncrementY = yRes;
          meta.originX = origX;
          meta.originY = origY;
          meta.detectionSource = 'ملف إسناد مكاني عالمي (.TFW / .WLD World File)';
          if (origX > 100000 && origX < 900000 && origY > 1000000) {
            meta.projection = 'UTM Zone 38N (EPSG:32638)';
            meta.utmZone = 38;
          } else if (origX >= -180 && origX <= 180 && origY >= -90 && origY <= 90) {
            meta.projection = 'WGS84 Geodetic (EPSG:4326)';
            meta.cellSizeUnits = 'DEGREES';
          }
          return meta;
        }
      }

      // 2. ER Mapper / XML / Text format (.ers, .eww)
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

      meta.detectionSource = 'ملف إسناد جانبي (.ERS / .EWW Sidecar)';
      return meta;
    }

    /**
     * Compute Geographic LatLngBounds from Metadata
     * If coordinates are unknown, falls back to current viewport (never forces Baghdad/desert!)
     */
    function computeBoundsFromMeta(meta) {
      let north, south, east, west;

      // Case A: Coordinates are in UTM meters (easting: 100k - 900k, northing: 1M - 9M)
      if (meta.originX && meta.originY && meta.originX > 10000 && meta.originY > 100000) {
        const zone = meta.utmZone || 38;
        const widthMeters = (meta.width || 8000) * Math.abs(meta.cellIncrementX || 0.5);
        const heightMeters = (meta.height || 6000) * Math.abs(meta.cellIncrementY || 0.5);

        const tl = utmToLatLng(meta.originX, meta.originY, zone, true);
        const br = utmToLatLng(meta.originX + widthMeters, meta.originY - heightMeters, zone, true);

        north = Math.max(tl.lat, br.lat);
        south = Math.min(tl.lat, br.lat);
        west = Math.min(tl.lng, br.lng);
        east = Math.max(tl.lng, br.lng);
      }
      // Case B: Coordinates are in Geographic Degrees (WGS84)
      else if (meta.originX !== null && meta.originY !== null && meta.originX >= -180 && meta.originX <= 180 && meta.originY >= -90 && meta.originY <= 90) {
        const spanX = (meta.width || 8000) * Math.abs(meta.cellIncrementX || 0.00005);
        const spanY = (meta.height || 6000) * Math.abs(meta.cellIncrementY || 0.00005);

        west = Math.min(meta.originX, meta.originX + spanX);
        east = Math.max(meta.originX, meta.originX + spanX);
        north = Math.max(meta.originY, meta.originY - spanY);
        south = Math.min(meta.originY, meta.originY - spanY);
      }
      // Case C: Unreferenced image - Adaptive placement at current viewport or center
      else {
        let centerLat = 33.3152;
        let centerLng = 44.3661;
        let spanDeg = 0.04;

        if (typeof map !== 'undefined' && map && typeof map.getCenter === 'function') {
          const c = map.getCenter();
          if (c && isFinite(c.lat) && isFinite(c.lng)) {
            centerLat = c.lat;
            centerLng = c.lng;
          }
          const z = map.getZoom ? map.getZoom() : 12;
          spanDeg = Math.max(0.002, Math.min(0.2, 0.4 / Math.pow(2, Math.max(0, z - 10))));
        }

        const aspect = (meta.width && meta.height && meta.height > 0) ? (meta.width / meta.height) : 1.33;
        const halfLat = spanDeg / 2;
        const halfLng = (spanDeg * aspect) / 2;

        north = centerLat + halfLat;
        south = centerLat - halfLat;
        west = centerLng - halfLng;
        east = centerLng + halfLng;
        meta.detectionSource = '📍 تم وضع الصورة في منتصف العرض الحالي للمعايرة اليدوية / GCP';
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
        ecwMetaBadge.textContent = meta.detectionSource ? `${meta.isECW ? 'ECW' : 'Raster'}: ${meta.detectionSource}` : (meta.isECW ? `ECW v${meta.version}` : 'Raster GIS');
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
     * AI Text & Metadata Parser
     * Extracts coordinates from pasted text (GDAL info, ArcGIS extents, UTM numbers, BBOX, Lat/Lng)
     */
    function parseAITextGeoreference(text) {
      if (!text || typeof text !== 'string') return null;

      const cleanText = text.trim();
      let newBounds = null;
      let detectedMethod = '';

      // Pattern 1: GDAL info Upper Left & Lower Right
      const gdalUlMatch = cleanText.match(/Upper\s+Left\s*\(\s*([+\-0-9.]+)\s*,\s*([+\-0-9.]+)\s*\)/i);
      const gdalLrMatch = cleanText.match(/Lower\s+Right\s*\(\s*([+\-0-9.]+)\s*,\s*([+\-0-9.]+)\s*\)/i);
      if (gdalUlMatch && gdalLrMatch) {
        const x1 = parseFloat(gdalUlMatch[1]);
        const y1 = parseFloat(gdalUlMatch[2]);
        const x2 = parseFloat(gdalLrMatch[1]);
        const y2 = parseFloat(gdalLrMatch[2]);
        if (x1 > 10000 && y1 > 100000) {
          const pt1 = utmToLatLng(x1, y1, 38, true);
          const pt2 = utmToLatLng(x2, y2, 38, true);
          newBounds = L.latLngBounds(
            [Math.min(pt1.lat, pt2.lat), Math.min(pt1.lng, pt2.lng)],
            [Math.max(pt1.lat, pt2.lat), Math.max(pt1.lng, pt2.lng)]
          );
          detectedMethod = 'GDAL info (Upper Left / Lower Right UTM)';
        } else {
          newBounds = L.latLngBounds(
            [Math.min(y1, y2), Math.min(x1, x2)],
            [Math.max(y1, y2), Math.max(x1, x2)]
          );
          detectedMethod = 'GDAL info (WGS84 Degrees)';
        }
      }

      // Pattern 2: BBOX / North-South-East-West
      if (!newBounds) {
        const nMatch = cleanText.match(/North(?:ing)?\s*[:=]\s*([+\-0-9.]+)/i);
        const sMatch = cleanText.match(/South(?:ing)?\s*[:=]\s*([+\-0-9.]+)/i);
        const eMatch = cleanText.match(/East(?:ing)?\s*[:=]\s*([+\-0-9.]+)/i);
        const wMatch = cleanText.match(/West(?:ing)?\s*[:=]\s*([+\-0-9.]+)/i);
        if (nMatch && sMatch && eMatch && wMatch) {
          const n = parseFloat(nMatch[1]);
          const s = parseFloat(sMatch[1]);
          const e = parseFloat(eMatch[1]);
          const w = parseFloat(wMatch[1]);
          if (n > 100000 && e > 10000) {
            const tl = utmToLatLng(w, n, 38, true);
            const br = utmToLatLng(e, s, 38, true);
            newBounds = L.latLngBounds(
              [Math.min(tl.lat, br.lat), Math.min(tl.lng, br.lng)],
              [Math.max(tl.lat, br.lat), Math.max(tl.lng, br.lng)]
            );
            detectedMethod = 'Bounding Box (UTM Extents)';
          } else {
            newBounds = L.latLngBounds([Math.min(s, n), Math.min(w, e)], [Math.max(s, n), Math.max(w, e)]);
            detectedMethod = 'Bounding Box (Geographic Lat/Lng)';
          }
        }
      }

      // Pattern 3: Standard BBOX string: minX,minY,maxX,maxY or [minX, minY, maxX, maxY]
      if (!newBounds) {
        const bboxMatch = cleanText.match(/(?:bbox\s*[:=]?\s*\[?\s*|\b)([+\-0-9.]+)\s*,\s*([+\-0-9.]+)\s*,\s*([+\-0-9.]+)\s*,\s*([+\-0-9.]+)/i);
        if (bboxMatch) {
          const v1 = parseFloat(bboxMatch[1]);
          const v2 = parseFloat(bboxMatch[2]);
          const v3 = parseFloat(bboxMatch[3]);
          const v4 = parseFloat(bboxMatch[4]);
          if (v1 > 10000 || v2 > 100000) {
            const tl = utmToLatLng(Math.min(v1, v3), Math.max(v2, v4), 38, true);
            const br = utmToLatLng(Math.max(v1, v3), Math.min(v2, v4), 38, true);
            newBounds = L.latLngBounds(
              [Math.min(tl.lat, br.lat), Math.min(tl.lng, br.lng)],
              [Math.max(tl.lat, br.lat), Math.max(tl.lng, br.lng)]
            );
            detectedMethod = 'BBOX Array (UTM Metric)';
          } else {
            let latMin = Math.min(v2, v4);
            let latMax = Math.max(v2, v4);
            let lngMin = Math.min(v1, v3);
            let lngMax = Math.max(v1, v3);
            if (v1 >= 28 && v1 <= 38.5 && v2 >= 38 && v2 <= 49.5) {
              latMin = Math.min(v1, v3);
              latMax = Math.max(v1, v3);
              lngMin = Math.min(v2, v4);
              lngMax = Math.max(v2, v4);
            }
            newBounds = L.latLngBounds([latMin, lngMin], [latMax, lngMax]);
            detectedMethod = 'BBOX Coordinate Tuple';
          }
        }
      }

      // Pattern 4: Single Pair of Coordinates (Center or Origin)
      if (!newBounds) {
        const utmPairMatch = cleanText.match(/([1-8]\d{5}(?:\.\d+)?)\s*[,;\s\t]+\s*([34]\d{6}(?:\.\d+)?)/);
        if (utmPairMatch) {
          const easting = parseFloat(utmPairMatch[1]);
          const northing = parseFloat(utmPairMatch[2]);
          const centerPt = utmToLatLng(easting, northing, 38, true);
          const delta = 0.04;
          newBounds = L.latLngBounds([centerPt.lat - delta, centerPt.lng - delta], [centerPt.lat + delta, centerPt.lng + delta]);
          detectedMethod = `UTM Coordinate Pair (${easting}, ${northing})`;
        } else {
          const latLngMatch = cleanText.match(/([23]\d\.\d{3,})\s*(?:°|[Nn])?\s*[,;\s\t]+\s*([34]\d\.\d{3,})\s*(?:°|[Ee])?/);
          if (latLngMatch) {
            const lat = parseFloat(latLngMatch[1]);
            const lng = parseFloat(latLngMatch[2]);
            const delta = 0.04;
            newBounds = L.latLngBounds([lat - delta, lng - delta], [lat + delta, lng + delta]);
            detectedMethod = `WGS84 Lat/Lng Pair (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
          }
        }
      }

      if (newBounds) {
        return { bounds: newBounds, method: detectedMethod };
      }
      return null;
    }

    /**
     * Apply new LatLngBounds to the current calibrated overlay
     */
    function applyNewOverlayBounds(newBounds) {
      if (!overlay || !newBounds) return;
      bounds = newBounds;
      baseCenter = bounds.getCenter();
      baseSpanLat = bounds.getNorth() - bounds.getSouth();
      baseSpanLng = bounds.getEast() - bounds.getWest();

      updateOverlayGeometry();
      createHandles();
      updateReadout();
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
    }

    /**
     * Snap overlay to real-world visual landmark in Iraq
     */
    function snapToLandmark(landmarkKey) {
      if (!overlay) {
        showToast('يرجى تحميل أو استيراد خريطة فضائية أولاً قبل المطابقة', 'warning');
        return;
      }
      const landmark = IRAQI_LANDMARKS[landmarkKey];
      if (!landmark) {
        showToast('يرجى اختيار معلم جغرافي صحيح من القائمة', 'warning');
        return;
      }

      applyNewOverlayBounds(landmark.bounds);
      showToast(`تمت مطابقة وإسقاط الخارطة بنجاح فوق معلم: ${landmark.name}`, 'success');

      // Trigger automatic blink comparison to show visual match with real basemap
      setTimeout(() => {
        blinkCompare();
      }, 900);
    }

    /**
     * 2-Point Ground Control Points (GCP) Interactive Calibration
     */
    function startGcpMatching() {
      if (!overlay) {
        showToast('يرجى استيراد خريطة فضائية أولاً لتفعيل معايرة نقاط الضبط', 'warning');
        return;
      }

      isGcpMatchingActive = true;
      gcpStep = 1;
      gcpPoints = { imgPt1: null, basePt1: null, imgPt2: null, basePt2: null };
      clearGcpMarkers();

      if (cancelGcpMatchBtn) cancelGcpMatchBtn.classList.remove('hidden');
      if (gcpStatusBadge) {
        gcpStatusBadge.textContent = 'نشط - النقطة 1A';
        gcpStatusBadge.className = 'text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold';
      }
      if (gcpBtnLabel) gcpBtnLabel.textContent = 'المعايرة جارية (انقر على الخارطة)...';

      updateGcpInstructions(1);
      map.on('click', handleMapGcpClick);
      showToast('وضع نقاط الضبط (GCP) مفعل: انقر على معلم بالخارطة المستوردة', 'info');
    }

    function cancelGcpMatching() {
      isGcpMatchingActive = false;
      gcpStep = 0;
      map.off('click', handleMapGcpClick);
      clearGcpMarkers();

      if (cancelGcpMatchBtn) cancelGcpMatchBtn.classList.add('hidden');
      if (gcpInstructionsText) gcpInstructionsText.classList.add('hidden');
      if (gcpStatusBadge) {
        gcpStatusBadge.textContent = 'غير نشط';
        gcpStatusBadge.className = 'text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono';
      }
      if (gcpBtnLabel) gcpBtnLabel.textContent = 'بدء تحديد نقطتي الضبط (GCP)';
    }

    function clearGcpMarkers() {
      gcpMarkers.forEach(m => { if (map.hasLayer(m)) map.removeLayer(m); });
      gcpMarkers = [];
      gcpLines.forEach(l => { if (map.hasLayer(l)) map.removeLayer(l); });
      gcpLines = [];
    }

    function updateGcpInstructions(step) {
      if (!gcpInstructionsText) return;
      gcpInstructionsText.classList.remove('hidden');

      if (step === 1) {
        gcpInstructionsText.innerHTML = `
          <div class="flex items-center gap-1.5 text-blue-400 font-bold">
            <span class="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center text-[9px]">1</span>
            <span>الخطوة 1 من 4: حدد النقطة الأولى (صورة)</span>
          </div>
          <p class="text-slate-300 text-[10px]">انقر على معلم مميز وواضح داخل <strong>الخارطة المستوردة</strong> (مثل: رأس جسر، تقاطع طرق، زاوية مدرج).</p>
        `;
      } else if (step === 2) {
        gcpInstructionsText.innerHTML = `
          <div class="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span class="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-[9px]">2</span>
            <span>الخطوة 2 من 4: حدد النقطة المقابلة في الواقع (خارطة الأساس)</span>
          </div>
          <p class="text-slate-300 text-[10px]">انقر الآن على <strong>نفس المعلم تماماً</strong> في خارطة الأساس الفضائية الواقعية بالأسفل.</p>
        `;
      } else if (step === 3) {
        gcpInstructionsText.innerHTML = `
          <div class="flex items-center gap-1.5 text-amber-400 font-bold">
            <span class="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center text-[9px]">3</span>
            <span>الخطوة 3 من 4: حدد النقطة الثانية (صورة)</span>
          </div>
          <p class="text-slate-300 text-[10px]">انقر على معلم ثانٍ مميز ومتباعد داخل <strong>الخارطة المستوردة</strong> لحساب الدوران والمقياس.</p>
        `;
      } else if (step === 4) {
        gcpInstructionsText.innerHTML = `
          <div class="flex items-center gap-1.5 text-teal-400 font-bold">
            <span class="w-4 h-4 rounded-full bg-teal-500/30 text-teal-300 flex items-center justify-center text-[9px]">4</span>
            <span>الخطوة 4 من 4: حدد النقطة المقابلة الثانية في الواقع</span>
          </div>
          <p class="text-slate-300 text-[10px]">انقر الآن على <strong>نفس المعلم الثاني</strong> في خارطة الأساس الواقعية لإنهاء حل مصفوفة التحويل.</p>
        `;
      }
    }

    function createGcpMarker(latlng, label, bgColor) {
      const icon = L.divIcon({
        className: 'gcp-marker-wrapper',
        html: `<div style="background-color: ${bgColor};" class="text-white font-bold text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg">${label}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const marker = L.marker(latlng, { icon: icon, interactive: false }).addTo(map);
      gcpMarkers.push(marker);
      return marker;
    }

    function handleMapGcpClick(e) {
      if (!isGcpMatchingActive) return;
      const pt = e.latlng;

      if (gcpStep === 1) {
        gcpPoints.imgPt1 = pt;
        createGcpMarker(pt, '1A', '#2563eb');
        gcpStep = 2;
        if (gcpStatusBadge) gcpStatusBadge.textContent = 'نشط - النقطة 1B (الواقع)';
        updateGcpInstructions(2);
        // Quick blink to help user see beneath
        blinkCompare();
      } else if (gcpStep === 2) {
        gcpPoints.basePt1 = pt;
        createGcpMarker(pt, '1B', '#059669');
        const line = L.polyline([gcpPoints.imgPt1, pt], { color: '#10b981', weight: 2, dashArray: '4, 4' }).addTo(map);
        gcpLines.push(line);
        gcpStep = 3;
        if (gcpStatusBadge) gcpStatusBadge.textContent = 'نشط - النقطة 2A (الصورة)';
        updateGcpInstructions(3);
      } else if (gcpStep === 3) {
        gcpPoints.imgPt2 = pt;
        createGcpMarker(pt, '2A', '#d97706');
        gcpStep = 4;
        if (gcpStatusBadge) gcpStatusBadge.textContent = 'نشط - النقطة 2B (الواقع)';
        updateGcpInstructions(4);
        blinkCompare();
      } else if (gcpStep === 4) {
        gcpPoints.basePt2 = pt;
        createGcpMarker(pt, '2B', '#0d9488');
        const line = L.polyline([gcpPoints.imgPt2, pt], { color: '#0d9488', weight: 2, dashArray: '4, 4' }).addTo(map);
        gcpLines.push(line);

        // All 4 points captured -> Solve Affine Transformation!
        solve2PointGcpAffine(gcpPoints.imgPt1, gcpPoints.basePt1, gcpPoints.imgPt2, gcpPoints.basePt2);

        // Finish mode
        isGcpMatchingActive = false;
        gcpStep = 0;
        map.off('click', handleMapGcpClick);
        if (cancelGcpMatchBtn) cancelGcpMatchBtn.classList.add('hidden');
        if (gcpStatusBadge) {
          gcpStatusBadge.textContent = 'تمت المعايرة بنجاح';
          gcpStatusBadge.className = 'text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold';
        }
        if (gcpBtnLabel) gcpBtnLabel.textContent = 'إعادة المعايرة بنقاط الضبط (GCP)';
        if (gcpInstructionsText) {
          gcpInstructionsText.innerHTML = `
            <div class="text-emerald-400 font-bold flex items-center gap-1.5">
              <i class="fa-solid fa-circle-check"></i>
              <span>اكتملت المعايرة بنجاح!</span>
            </div>
            <p class="text-slate-300 text-[10px]">تم حل التحويل التآلفي وتطبيق الإزاحة، المقياس، وزاوية الدوران بدقة على الخريطة المستوردة.</p>
          `;
        }

        // Clean up visual GCP markers after 5 seconds
        setTimeout(() => {
          clearGcpMarkers();
          if (gcpInstructionsText) gcpInstructionsText.classList.add('hidden');
          if (gcpStatusBadge) {
            gcpStatusBadge.textContent = 'غير نشط';
            gcpStatusBadge.className = 'text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono';
          }
        }, 5000);
      }
    }

    /**
     * Solve Affine Transformation Matrix for 2-Point Ground Control Points (GCP)
     * Handles translation, scale matching, and rotation matching
     */
    function solve2PointGcpAffine(p1A, p1B, p2A, p2B) {
      if (!overlay || !bounds) return;

      // Image points (x = lng, y = lat)
      const x1 = p1A.lng, y1 = p1A.lat;
      const x2 = p2A.lng, y2 = p2A.lat;

      // Ground points (X = lng, Y = lat)
      const X1 = p1B.lng, Y1 = p1B.lat;
      const X2 = p2B.lng, Y2 = p2B.lat;

      const dImgX = x2 - x1;
      const dImgY = y2 - y1;
      const dImgDist = Math.sqrt(dImgX * dImgX + dImgY * dImgY);

      const dGrdX = X2 - X1;
      const dGrdY = Y2 - Y1;
      const dGrdDist = Math.sqrt(dGrdX * dGrdX + dGrdY * dGrdY);

      if (dImgDist < 0.000001 || dGrdDist < 0.000001) {
        showToast('نقاط الضبط قريبة جداً من بعضها، يرجى اختيار نقاط متباعدة', 'warning');
        return;
      }

      // 1. Scale Ratio
      const scaleRatio = dGrdDist / dImgDist;

      // 2. Rotation Angle (Degrees)
      const angleImg = Math.atan2(dImgY, dImgX);
      const angleGrd = Math.atan2(dGrdY, dGrdX);
      let deltaAngleRad = angleGrd - angleImg;
      let deltaAngleDeg = deltaAngleRad * (180 / Math.PI);

      // Accumulate rotation
      rotationDeg = Math.round((rotationDeg + deltaAngleDeg) % 360);
      if (rotationDeg < 0) rotationDeg += 360;
      if (rotationSlider) rotationSlider.value = rotationDeg;
      if (rotationLabel) rotationLabel.textContent = `${rotationDeg}°`;
      if (boundRot) boundRot.textContent = `${rotationDeg}°`;

      // 3. Image & Ground Midpoints
      const mImgLng = (x1 + x2) / 2;
      const mImgLat = (y1 + y2) / 2;
      const mGrdLng = (X1 + X2) / 2;
      const mGrdLat = (Y1 + Y2) / 2;

      // 4. Center Translation
      const curCenter = bounds.getCenter();
      const relLng = curCenter.lng - mImgLng;
      const relLat = curCenter.lat - mImgLat;

      // Rotate and scale the relative center vector
      const cosA = Math.cos(deltaAngleRad);
      const sinA = Math.sin(deltaAngleRad);
      const newRelLng = scaleRatio * (relLng * cosA - relLat * sinA);
      const newRelLat = scaleRatio * (relLng * sinA + relLat * cosA);

      const newCenterLng = mGrdLng + newRelLng;
      const newCenterLat = mGrdLat + newRelLat;

      // 5. Update Span & Bounds
      const newSpanLat = (bounds.getNorth() - bounds.getSouth()) * scaleRatio;
      const newSpanLng = (bounds.getEast() - bounds.getWest()) * scaleRatio;

      bounds = L.latLngBounds(
        [newCenterLat - newSpanLat / 2, newCenterLng - newSpanLng / 2],
        [newCenterLat + newSpanLat / 2, newCenterLng + newSpanLng / 2]
      );

      baseCenter = bounds.getCenter();
      baseSpanLat = newSpanLat;
      baseSpanLng = newSpanLng;

      scalePercent = Math.round(scalePercent * scaleRatio);
      if (scaleSlider) scaleSlider.value = Math.min(Math.max(scalePercent, 20), 400);
      if (scaleLabel) scaleLabel.textContent = `${scalePercent}%`;

      updateOverlayGeometry();
      createHandles();
      updateReadout();
      map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2 });

      showToast(`تمت المعايرة بنجاح عبر نقطتي الضبط (GCP)! دوران: ${Math.round(deltaAngleDeg)}°، مقياس: ${(scaleRatio * 100).toFixed(0)}%`, 'success');
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
     * Switch Sidebar to Calibrate Tab & Expand if Collapsed
     */
    function switchToCalibrateTab() {
      const tabButtons = document.querySelectorAll('.sidebar-tab-btn');
      const tabPanels = document.querySelectorAll('.tab-panel');
      tabButtons.forEach(b => {
        const isTarget = b.getAttribute('data-tab') === 'calibrate';
        b.classList.toggle('active', isTarget);
        b.classList.toggle('border-blue-500', isTarget);
        b.classList.toggle('text-blue-400', isTarget);
        b.classList.toggle('border-transparent', !isTarget);
        b.classList.toggle('text-slate-400', !isTarget);
      });
      tabPanels.forEach(panel => {
        panel.classList.toggle('hidden', panel.getAttribute('data-panel') !== 'calibrate');
      });
      const sidebar = document.getElementById('appSidebar');
      if (sidebar && sidebar.classList.contains('translate-x-full')) {
        sidebar.classList.remove('translate-x-full');
      }
    }

    /**
     * Process ECW Dataset (Binary Header, Sidecar, and Raster Pairing)
     * Never silently fetches Baghdad satellite imagery; uses actual raster or vector footprint + AI modal
     */
    function processECWDataset(file, companionImageSrc = null, sidecarText = null) {
      switchToCalibrateTab();

      // Read 512KB slice for thorough binary header and embedded preview scan
      const slice = file.slice(0, 524288);
      lastEcwRawFile = file;
      const reader = new FileReader();

      reader.onload = (e) => {
        lastEcwRawBuffer = e.target.result;
        let meta = parseECWHeader(e.target.result, file.name, file.size);
        if (sidecarText) {
          meta = parseSidecarMetadata(sidecarText, meta);
        }

        const calculatedBounds = computeBoundsFromMeta(meta);
        displayECWMetadata(meta, calculatedBounds);

        // Pre-fill AI Coords input with detected bounds info for transparency
        if (aiCoordsTextInput && meta.originX && meta.originY) {
          aiCoordsTextInput.value = `OriginX: ${meta.originX.toFixed(2)}, OriginY: ${meta.originY.toFixed(2)}\nProjection: ${meta.projection} | Datum: ${meta.datum}\nBounds: [${calculatedBounds.getSouth().toFixed(5)}, ${calculatedBounds.getWest().toFixed(5)}] -> [${calculatedBounds.getNorth().toFixed(5)}, ${calculatedBounds.getEast().toFixed(5)}]`;
        }

        // 1. Companion Image
        let imageToDisplay = companionImageSrc;

        // 2. Embedded Raster Preview inside ECW binary buffer
        if (!imageToDisplay) {
          const embeddedRaster = extractEmbeddedRaster(e.target.result);
          if (embeddedRaster) {
            imageToDisplay = embeddedRaster;
            meta.detectionSource += ' + معاينة نقطية مدمجة بالملف';
          }
        }

        // 3. Informative Vector Footprint (SVG Data URL)
        if (!imageToDisplay) {
          imageToDisplay = generateEcwPlaceholderDataUrl(meta);
        }

        const labelText = `خريطة ECW: ${file.name}`;
        initCalibrationOverlay(imageToDisplay, labelText, calculatedBounds);
        showToast(`تم استيراد ${file.name} - الإسناد: ${meta.detectionSource}`, 'success');

        // Automatically launch AI Reality Alignment Studio if no companion raster was supplied
        if (!companionImageSrc) {
          setTimeout(() => {
            openAiAlignmentModal(meta, calculatedBounds);
          }, 500);
        }
      };

      reader.readAsArrayBuffer(slice);
    }

    /**
     * Unified Image Processor for ANY Satellite / Aerial Format (TIFF, GeoTIFF, PNG, JPG, JPEG, WEBP, ECW)
     */
    async function processAnyImageFile(imageFile, sidecarFile = null) {
      if (!imageFile) return;

      switchToCalibrateTab();
      showToast(`جاري معالجة وفحص الخارطة: ${imageFile.name}...`, 'info');

      let sidecarText = null;
      if (sidecarFile) {
        try {
          sidecarText = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.target.result);
            r.onerror = () => resolve(null);
            r.readAsText(sidecarFile);
          });
        } catch (e) {
          console.warn('Could not read sidecar file:', e);
        }
      }

      const lowerName = imageFile.name.toLowerCase();
      const isTiff = lowerName.endsWith('.tif') || lowerName.endsWith('.tiff') || (imageFile.type && imageFile.type.includes('tiff'));
      const isEcw = lowerName.endsWith('.ecw');

      if (isEcw) {
        processECWDataset(imageFile, null, sidecarText);
        return;
      }

      if (isTiff) {
        try {
          const arrayBuffer = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.target.result);
            r.onerror = (err) => reject(err);
            r.readAsArrayBuffer(imageFile);
          });

          const decoded = await decodeTiffDataset(arrayBuffer, imageFile.name);
          let geoMeta = decoded.geoMeta;
          if (!geoMeta) {
            geoMeta = parseECWHeader(arrayBuffer, imageFile.name, imageFile.size);
          }
          if (sidecarText) {
            geoMeta = parseSidecarMetadata(sidecarText, geoMeta);
          }
          if (decoded.width > 0 && (!geoMeta.width || geoMeta.width <= 0)) {
            geoMeta.width = decoded.width;
            geoMeta.height = decoded.height;
          }

          const customBounds = computeBoundsFromMeta(geoMeta);
          displayECWMetadata(geoMeta, customBounds);

          const imageSrcToUse = decoded.pngDataUrl || generateEcwPlaceholderDataUrl(geoMeta);
          initCalibrationOverlay(imageSrcToUse, imageFile.name, customBounds);

          // Prepare Gemini Vision / AI Reality Studio
          if (decoded.pngDataUrl && decoded.pngDataUrl.startsWith('data:image/')) {
            const parts = decoded.pngDataUrl.split(',');
            geminiSelectedImageBase64 = parts[1];
            geminiSelectedImageMime = decoded.pngDataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
            if (geminiPickImageBtnText) {
              geminiPickImageBtnText.textContent = `✅ ${imageFile.name} (TIFF جاهز للمعايرة والتحليل)`;
            }
          }

          if (geoMeta.originX) {
            showToast(`تم استيراد GeoTIFF بنجاح: ${geoMeta.detectionSource}`, 'success');
          } else {
            showToast(`تم استيراد وعرض صورة TIFF بنجاح للمعايرة`, 'success');
          }
        } catch (tiffErr) {
          console.error('Error processing TIFF:', tiffErr);
          showToast(`خطأ في معالجة ملف TIFF: ${tiffErr.message || tiffErr}`, 'error');
        }
        return;
      }

      // Standard Image: PNG / JPG / JPEG / WEBP
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.target.result);
          r.onerror = (err) => reject(err);
          r.readAsDataURL(imageFile);
        });

        // Determine real image dimensions
        const dims = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
          img.onerror = () => resolve({ width: 2048, height: 2048 });
          img.src = dataUrl;
        });

        let geoMeta = parseECWHeader(new ArrayBuffer(32), imageFile.name, imageFile.size);
        geoMeta.width = dims.width;
        geoMeta.height = dims.height;

        if (sidecarText) {
          geoMeta = parseSidecarMetadata(sidecarText, geoMeta);
        }

        const customBounds = computeBoundsFromMeta(geoMeta);
        displayECWMetadata(geoMeta, customBounds);

        initCalibrationOverlay(dataUrl, imageFile.name, customBounds);

        // Prepare Gemini Vision / AI Reality Studio
        const parts = dataUrl.split(',');
        geminiSelectedImageBase64 = parts[1];
        geminiSelectedImageMime = imageFile.type || (dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg');
        if (geminiPickImageBtnText) {
          geminiPickImageBtnText.textContent = `✅ ${imageFile.name} (جاهزة للمعايرة والتحليل)`;
        }

        if (geoMeta.originX) {
          showToast(`تم التعرف على موقع الصورة: ${geoMeta.detectionSource}`, 'success');
        } else {
          showToast(`تم عرض الصورة على الخارطة ويمكنك الآن معايرتها وضبط موقعها بدقة`, 'success');
        }
      } catch (imgErr) {
        console.error('Error processing image:', imgErr);
        showToast(`خطأ في معالجة الصورة: ${imgErr.message || imgErr}`, 'error');
      }
    }

    /**
     * Handle Selected Files (Single or Multi-file drag/picker)
     */
    async function handleSelectedFiles(files) {
      if (!files || files.length === 0) return;

      let ecwFile = null;
      let sidecarFile = null;
      let imageFile = null;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const lower = f.name.toLowerCase();
        if (lower.endsWith('.ecw')) {
          ecwFile = f;
        } else if (lower.endsWith('.ers') || lower.endsWith('.eww') || lower.endsWith('.wld') || lower.endsWith('.tfw') || lower.endsWith('.jgw') || lower.endsWith('.pgw')) {
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
        await processAnyImageFile(imageFile, sidecarFile);
      } else {
        showToast('يرجى اختيار ملف بصيغة .ecw أو صورة فضائية مدعومة (TIFF / PNG / JPG)', 'warning');
      }
    }

    // Trigger local file upload
    if (triggerUploadBtn && fileInput) {
      triggerUploadBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        handleSelectedFiles(e.target.files);
        fileInput.value = '';
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

    // Global Drag & Drop on Window & Map Canvas
    ['dragenter', 'dragover'].forEach(eventType => {
      window.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (ecwDropZone) ecwDropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'dragend'].forEach(eventType => {
      window.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.clientX <= 0 || e.clientY <= 0) {
          if (ecwDropZone) ecwDropZone.classList.remove('dragover');
        }
      });
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (ecwDropZone) ecwDropZone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleSelectedFiles(e.dataTransfer.files);
      }
    });

    // Attach Companion Converted Image (PNG, JPG, TIFF)
    if (triggerCompanionUploadBtn && companionFileInput) {
      triggerCompanionUploadBtn.addEventListener('click', () => companionFileInput.click());
      companionFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        companionFileInput.value = '';
        if (!file) return;

        if (overlay && bounds) {
          const lower = file.name.toLowerCase();
          const isTiff = lower.endsWith('.tif') || lower.endsWith('.tiff') || (file.type && file.type.includes('tiff'));

          if (isTiff) {
            try {
              const arrReader = new FileReader();
              arrReader.onload = async (ae) => {
                const decoded = await decodeTiffDataset(ae.target.result, file.name);
                if (decoded && decoded.pngDataUrl) {
                  overlay.setUrl(decoded.pngDataUrl);
                  const parts = decoded.pngDataUrl.split(',');
                  geminiSelectedImageBase64 = parts[1];
                  geminiSelectedImageMime = decoded.pngDataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
                  if (geminiPickImageBtnText) geminiPickImageBtnText.textContent = `✅ ${file.name} (TIFF مقترن)`;
                  showToast(`تم إقران صورة TIFF المحولة (${file.name}) بنطاق الخارطة بنجاح!`, 'success');
                } else {
                  showToast(`تعذّر فك ضغط ملف TIFF: ${file.name}`, 'error');
                }
              };
              arrReader.readAsArrayBuffer(file);
            } catch (err) {
              showToast(`خطأ في معالجة TIFF: ${err.message || err}`, 'error');
            }
          } else {
            const imgReader = new FileReader();
            imgReader.onload = (evt) => {
              const dataUrl = evt.target.result;
              overlay.setUrl(dataUrl);
              const parts = dataUrl.split(',');
              geminiSelectedImageBase64 = parts[1];
              geminiSelectedImageMime = file.type || 'image/jpeg';
              if (geminiPickImageBtnText) geminiPickImageBtnText.textContent = `✅ ${file.name} (صورة مقترنة)`;
              showToast(`تم إقران الصورة المحولة (${file.name}) بنطاق الخارطة بنجاح!`, 'success');
            };
            imgReader.readAsDataURL(file);
          }
        } else {
          await processAnyImageFile(file);
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

    // ==========================================
    // AI Spatial Alignment & Landmark Studio Event Listeners
    // ==========================================
    if (aiAutoScanHeaderBtn) {
      aiAutoScanHeaderBtn.addEventListener('click', () => {
        if (lastEcwRawBuffer && lastEcwRawFile) {
          const meta = parseECWHeader(lastEcwRawBuffer, lastEcwRawFile.name, lastEcwRawFile.size);
          const scannedBounds = computeBoundsFromMeta(meta);
          applyNewOverlayBounds(scannedBounds);
          displayECWMetadata(meta, scannedBounds);
          if (aiCoordsTextInput) {
            aiCoordsTextInput.value = `OriginX: ${meta.originX.toFixed(2)}, OriginY: ${meta.originY.toFixed(2)}\nProjection: ${meta.projection} | Datum: ${meta.datum}\nBounds: [${scannedBounds.getSouth().toFixed(5)}, ${scannedBounds.getWest().toFixed(5)}] -> [${scannedBounds.getNorth().toFixed(5)}, ${scannedBounds.getEast().toFixed(5)}]`;
          }
          showToast(`تمت إعادة المسح العميق لترويسة الملف: ${meta.detectionSource}`, 'success');
        } else {
          showToast('يرجى استيراد ملف ECW أولاً لإجراء المسح العميق للترويسة الثنائية', 'warning');
        }
      });
    }

    if (aiParseCoordsBtn && aiCoordsTextInput) {
      aiParseCoordsBtn.addEventListener('click', () => {
        const val = aiCoordsTextInput.value;
        if (!val || !val.trim()) {
          showToast('يرجى لصق نص ميتاداتا أو أرقام إحداثيات في المربع أولاً', 'warning');
          return;
        }

        const parsed = parseAITextGeoreference(val);
        if (parsed) {
          applyNewOverlayBounds(parsed.bounds);
          showToast(`تم التعرف الذكي على الإحداثيات عبر: ${parsed.method}`, 'success');
        } else {
          showToast('لم يتم التعرف على نسق إحداثيات صالح. جرب لصق BBOX أو UTM أو Lat/Lng', 'warning');
        }
      });
    }

    if (aiClearCoordsBtn && aiCoordsTextInput) {
      aiClearCoordsBtn.addEventListener('click', () => {
        aiCoordsTextInput.value = '';
        showToast('تم مسح مربع نص الإحداثيات', 'info');
      });
    }

    if (aiSnapLandmarkBtn && aiLandmarkSelect) {
      aiSnapLandmarkBtn.addEventListener('click', () => {
        const key = aiLandmarkSelect.value;
        if (!key) {
          showToast('يرجى اختيار معلم جغرافي عراقي من القائمة أولاً', 'warning');
          return;
        }
        snapToLandmark(key);
      });
    }

    if (startGcpMatchBtn) {
      startGcpMatchBtn.addEventListener('click', () => {
        if (isGcpMatchingActive) {
          cancelGcpMatching();
        } else {
          startGcpMatching();
        }
      });
    }

    if (cancelGcpMatchBtn) {
      cancelGcpMatchBtn.addEventListener('click', () => {
        cancelGcpMatching();
        showToast('تم إلغاء وضع المعايرة بنقاط الضبط', 'info');
      });
    }

    // ==========================================
    // AI Reality Alignment & Calibration Modal Studio
    // ==========================================
    const aiAlignmentModal = document.getElementById('aiAlignmentModal');
    const closeAiAlignmentModalBtn = document.getElementById('closeAiAlignmentModalBtn');
    const aiModalCloseBottomBtn = document.getElementById('aiModalCloseBottomBtn');
    const openAiAlignmentModalBtn = document.getElementById('openAiAlignmentModalBtn');
    const floatAiAlignBtn = document.getElementById('floatAiAlignBtn');
    const aiModalFileName = document.getElementById('aiModalFileName');
    const aiModalDims = document.getElementById('aiModalDims');
    const aiModalCrs = document.getElementById('aiModalCrs');
    const aiModalCoords = document.getElementById('aiModalCoords');
    const aiModalSourceBadge = document.getElementById('aiModalSourceBadge');
    const aiModalPairRasterBtn = document.getElementById('aiModalPairRasterBtn');
    const aiModalLaunchGcpBtn = document.getElementById('aiModalLaunchGcpBtn');
    const aiModalLandmarksGrid = document.getElementById('aiModalLandmarksGrid');
    const aiLandmarkFilters = document.getElementById('aiLandmarkFilters');

    function openAiAlignmentModal(meta = null, currentBounds = null) {
      if (!aiAlignmentModal) return;
      const m = meta || currentEcwMeta || {
        fileName: 'خارطة فضائية للمعايرة',
        width: 0,
        height: 0,
        projection: 'UTM Zone 38N (EPSG:32638)',
        detectionSource: 'كشف ذكي'
      };
      const b = currentBounds || bounds || map.getBounds();

      if (aiModalFileName) aiModalFileName.textContent = m.fileName || 'خريطة فضائية مستوردة';
      if (aiModalDims) aiModalDims.textContent = (m.width && m.height) ? `${m.width.toLocaleString('ar-IQ')} × ${m.height.toLocaleString('ar-IQ')} px` : 'غير محدد';
      if (aiModalCrs) aiModalCrs.textContent = m.projection || 'UTM Zone 38N (EPSG:32638)';
      if (aiModalSourceBadge) aiModalSourceBadge.textContent = m.detectionSource || 'كشف ذكي';
      if (aiModalCoords && b) {
        aiModalCoords.textContent = `[${b.getSouth().toFixed(4)}°, ${b.getWest().toFixed(4)}°] -> [${b.getNorth().toFixed(4)}°, ${b.getEast().toFixed(4)}°]`;
      }

      renderModalLandmarksGrid('all');
      aiAlignmentModal.classList.remove('hidden');
    }

    function closeAiAlignmentModal() {
      if (aiAlignmentModal) aiAlignmentModal.classList.add('hidden');
    }

    function renderModalLandmarksGrid(filter = 'all') {
      if (!aiModalLandmarksGrid) return;
      aiModalLandmarksGrid.innerHTML = '';

      const entries = Object.entries(IRAQI_LANDMARKS);
      const regex = (filter === 'all') ? null : new RegExp(filter, 'i');

      entries.forEach(([key, lm]) => {
        if (regex && !regex.test(lm.province || '') && !regex.test(lm.name)) {
          return;
        }

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'w-full text-right p-2.5 rounded-xl bg-slate-950/80 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/60 transition-all flex items-center justify-between group shadow-sm';
        
        card.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 flex items-center justify-center text-xs">
              <i class="fa-solid ${lm.icon || 'fa-location-dot'}"></i>
            </span>
            <div class="text-right">
              <div class="font-bold text-slate-200 group-hover:text-white text-[11px] leading-tight">${lm.name}</div>
              <div class="text-[10px] text-slate-400 font-mono mt-0.5">محافظة ${lm.province || 'العراق'}</div>
            </div>
          </div>
          <span class="text-[10px] px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 font-bold border border-emerald-500/30 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            مطابقة
          </span>
        `;

        card.addEventListener('click', () => {
          snapToLandmark(key);
          closeAiAlignmentModal();
        });

        aiModalLandmarksGrid.appendChild(card);
      });
    }

    // Modal Triggers
    if (openAiAlignmentModalBtn) {
      openAiAlignmentModalBtn.addEventListener('click', () => openAiAlignmentModal());
    }
    if (floatAiAlignBtn) {
      floatAiAlignBtn.addEventListener('click', () => openAiAlignmentModal());
    }
    if (closeAiAlignmentModalBtn) {
      closeAiAlignmentModalBtn.addEventListener('click', () => closeAiAlignmentModal());
    }
    if (aiModalCloseBottomBtn) {
      aiModalCloseBottomBtn.addEventListener('click', () => closeAiAlignmentModal());
    }
    if (aiModalPairRasterBtn && companionFileInput) {
      aiModalPairRasterBtn.addEventListener('click', () => {
        closeAiAlignmentModal();
        companionFileInput.click();
      });
    }
    if (aiModalLaunchGcpBtn) {
      aiModalLaunchGcpBtn.addEventListener('click', () => {
        closeAiAlignmentModal();
        startGcpMatching();
      });
    }

    if (aiLandmarkFilters) {
      aiLandmarkFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.landmark-filter-btn');
        if (!btn) return;
        aiLandmarkFilters.querySelectorAll('.landmark-filter-btn').forEach(b => {
          b.className = 'landmark-filter-btn px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-all';
        });
        btn.className = 'landmark-filter-btn px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold transition-all';
        renderModalLandmarksGrid(btn.dataset.filter || 'all');
      });
    }

    window.openAiAlignmentModal = openAiAlignmentModal;
    window.closeAiAlignmentModal = closeAiAlignmentModal;

    // ==========================================
    // Gemini Vision API - Auto Geolocation (Direct File Upload)
    // ==========================================
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const saveGeminiKeyBtn  = document.getElementById('saveGeminiKeyBtn');
    const geminiAnalyzeBtn  = document.getElementById('geminiAnalyzeBtn');
    const geminiAnalyzeBtnText = document.getElementById('geminiAnalyzeBtnText');
    const geminiAnalysisStatus = document.getElementById('geminiAnalysisStatus');
    const geminiImageFileInput = document.getElementById('geminiImageFileInput');
    const geminiPickImageBtn   = document.getElementById('geminiPickImageBtn');
    const geminiPickImageBtnText = document.getElementById('geminiPickImageBtnText');

    // Track the selected image base64 + mime type
    let geminiSelectedImageBase64 = null;
    let geminiSelectedImageMime   = 'image/jpeg';

    // Load saved API key from localStorage
    const _savedKey = localStorage.getItem('atlas_gemini_api_key');
    if (_savedKey && geminiApiKeyInput) {
      geminiApiKeyInput.value = _savedKey;
      refreshGeminiModelsDropdown(_savedKey);
    }

    // Save key button
    if (saveGeminiKeyBtn && geminiApiKeyInput) {
      saveGeminiKeyBtn.addEventListener('click', () => {
        const k = geminiApiKeyInput.value.trim();
        if (k) {
          localStorage.setItem('atlas_gemini_api_key', k);
          refreshGeminiModelsDropdown(k);
          showToast('تم حفظ مفتاح Gemini API وتحديث قائمة النماذج', 'success');
        } else {
          localStorage.removeItem('atlas_gemini_api_key');
          showToast('تم حذف المفتاح المحفوظ', 'info');
        }
      });
    }

    if (geminiApiKeyInput) {
      geminiApiKeyInput.addEventListener('blur', () => {
        const k = geminiApiKeyInput.value.trim();
        if (k && k.length > 20) refreshGeminiModelsDropdown(k);
      });
    }

    // Open file picker (supports TIFF, GeoTIFF, PNG, JPG, WEBP)
    if (geminiPickImageBtn && geminiImageFileInput) {
      geminiPickImageBtn.addEventListener('click', () => geminiImageFileInput.click());
      geminiImageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await processAnyImageFile(file);
      });
    }

    // Analyze button
    if (geminiAnalyzeBtn) {
      geminiAnalyzeBtn.addEventListener('click', async () => {
        const apiKey = (geminiApiKeyInput?.value || '').trim()
                    || localStorage.getItem('atlas_gemini_api_key') || '';

        if (!apiKey) {
          showToast('يرجى إدخال مفتاح Gemini API أولاً', 'warning');
          return;
        }
        if (!geminiSelectedImageBase64) {
          showToast('يرجى اختيار صورة TIFF أو PNG أو JPG للتحليل أولاً', 'warning');
          return;
        }

        // UI: loading state
        geminiAnalyzeBtn.disabled = true;
        if (geminiAnalyzeBtnText) geminiAnalyzeBtnText.textContent = '⏳ جاري التحليل...';
        if (geminiAnalysisStatus) {
          geminiAnalysisStatus.classList.remove('hidden');
          geminiAnalysisStatus.innerHTML = '<span class="text-purple-400">🤖 جاري إرسال الصورة إلى Gemini Vision...</span>';
        }

        try {
          const result = await callGeminiVision(apiKey, geminiSelectedImageBase64, geminiSelectedImageMime);
          const b = result.bbox;

          if (b && typeof b.north === 'number' && typeof b.south === 'number' &&
              typeof b.east  === 'number' && typeof b.west  === 'number' &&
              b.north > b.south && b.east > b.west) {

            const newBounds = L.latLngBounds([b.south, b.west], [b.north, b.east]);

            if (overlay) {
              applyNewOverlayBounds(newBounds);
            } else {
              // No overlay yet — create one using the selected image
              initCalibrationOverlay(
                'data:' + geminiSelectedImageMime + ';base64,' + geminiSelectedImageBase64,
                'صورة محللة بالذكاء الاصطناعي',
                newBounds
              );
            }

            if (geminiAnalysisStatus) {
              geminiAnalysisStatus.innerHTML = `
                <div class="text-emerald-400 font-bold mb-1">✅ تم تحديد الموقع (ثقة: ${result.confidence || 'متوسطة'})</div>
                <div class="text-slate-200 mb-1">📍 ${result.location || 'موقع غير محدد'}</div>
                <div class="text-slate-400">معالم: ${(result.landmarks || []).join('، ') || '—'}</div>
                <div class="text-sky-300 font-mono mt-1 text-[9px]">N:${b.north.toFixed(4)}° S:${b.south.toFixed(4)}° E:${b.east.toFixed(4)}° W:${b.west.toFixed(4)}°</div>
                ${result.notes ? `<div class="text-slate-500 mt-0.5 text-[10px]">${result.notes}</div>` : ''}
              `;
            }
            showToast('✅ تم تحديد الموقع بالذكاء الاصطناعي', 'success');

          } else {
            throw new Error('الذكاء الاصطناعي لم يتمكن من تحديد إحداثيات واضحة من الصورة');
          }

        } catch (err) {
          if (geminiAnalysisStatus) {
            geminiAnalysisStatus.innerHTML = `
              <div class="text-rose-400 font-bold">❌ خطأ في التحليل</div>
              <div class="text-slate-400 text-[10px] mt-1 break-all">${err.message}</div>
            `;
          }
          showToast('خطأ Gemini: ' + err.message.substring(0, 80), 'error');
        } finally {
          geminiAnalyzeBtn.disabled = false;
          if (geminiAnalyzeBtnText) geminiAnalyzeBtnText.textContent = 'تحليل وتحديد الموقع بالذكاء الاصطناعي';
        }
      });
    }

    /**
     * Query Google API to get list of active models for this API key
     */
    async function fetchLiveGeminiModels(apiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.models)) {
            const list = data.models
              .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => m.name.replace(/^models\//, ''))
              .filter(name => !name.includes('embedding') && !name.includes('aqa') && !name.includes('imagen') && name !== 'gemini-1.5-flash-8b');
            if (list.length > 0) return list;
          }
        }
      } catch (e) {
        console.warn('Live models fetch error:', e);
      }
      return null;
    }

    /**
     * Refresh models dropdown dynamically based on user's API key
     */
    async function refreshGeminiModelsDropdown(apiKey) {
      if (!apiKey) return;
      const modelSelect = document.getElementById('geminiModelSelect');
      if (!modelSelect) return;
      try {
        const live = await fetchLiveGeminiModels(apiKey);
        if (live && live.length > 0) {
          const cur = modelSelect.value;
          const best = live.includes(cur) ? cur : (live.find(m => m.includes('2.5-flash') || m.includes('2.0-flash')) || live[0]);
          modelSelect.innerHTML = live.map(m => `<option value="${m}" ${m === best ? 'selected' : ''}>${m}</option>`).join('');
        }
      } catch (e) {
        console.warn('Could not refresh dropdown:', e);
      }
    }

    /**
     * Optimize image specifically for Gemini Vision API prompt payload (<= 1536px)
     * Keeps map overlay at full 6K UHD while ensuring fast API response without 413 payload limits
     */
    function optimizeImageForGemini(base64Data, mimeType) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1536;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            const sc = Math.min(maxDim / w, maxDim / h);
            w = Math.max(32, Math.round(w * sc));
            h = Math.max(32, Math.round(h * sc));
          }
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = c.toDataURL('image/jpeg', 0.88);
          resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' });
        };
        img.onerror = () => resolve({ base64: base64Data, mime: mimeType || 'image/jpeg' });
        img.src = 'data:' + (mimeType || 'image/jpeg') + ';base64,' + base64Data;
      });
    }

    /**
     * Call Gemini Vision API with dynamic model discovery, optimized payload, and multi-version fallback
     */
    async function callGeminiVision(apiKey, base64Data, mimeType) {
      const modelSelect = document.getElementById('geminiModelSelect');
      const chosen = (modelSelect?.value || '').trim();

      if (geminiAnalysisStatus) {
        geminiAnalysisStatus.innerHTML = `<span class="text-purple-400">🔍 جاري التحقق من النماذج المتاحة في حسابك لدى Google...</span>`;
      }

      // Step 1: Discover live models from Google for this key
      const liveModels = await fetchLiveGeminiModels(apiKey);

      // If we got live models, update select dropdown
      if (liveModels && liveModels.length > 0 && modelSelect) {
        const cur = chosen && liveModels.includes(chosen) ? chosen : liveModels[0];
        modelSelect.innerHTML = liveModels.map(m => `<option value="${m}" ${m === cur ? 'selected' : ''}>${m}</option>`).join('');
      }

      // Candidate models to try in order
      const primaryModels = [
        chosen,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
      ];

      const rawChain = [chosen, ...(liveModels || []), ...primaryModels];
      const modelChain = rawChain.filter((v, i, a) => v && v !== 'gemini-1.5-flash-8b' && a.indexOf(v) === i);

      // Step 2: Optimize image payload specifically for API request
      let payloadBase64 = base64Data;
      let payloadMime = mimeType || 'image/jpeg';
      if (base64Data && base64Data.length > 1000000) {
        try {
          const opt = await optimizeImageForGemini(base64Data, payloadMime);
          payloadBase64 = opt.base64;
          payloadMime = opt.mime;
        } catch (oe) {
          console.warn('Image optimization fallback to original:', oe);
        }
      }

      const prompt = `You are a professional GIS expert and geographer specializing in Iraq and the Middle East.
Analyze this satellite or aerial image carefully and identify its exact geographic location.
Look for: rivers (Tigris, Euphrates, Diyala, Shatt al-Arab), cities, highways, agricultural canals, citadels, landmarks.
The image is most likely from Iraq (lat 29-38°N, lon 38-49°E).

Respond ONLY in this exact JSON format (no markdown, no other text):
{"location":"city or district name","landmarks":["landmark 1","landmark 2"],"confidence":"high|medium|low","bbox":{"north":33.45,"south":33.25,"east":44.55,"west":44.25},"notes":"geographic observations"}`;

      const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: payloadMime, data: payloadBase64 } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
      });

      let lastErr = null;
      for (const model of modelChain) {
        for (const apiVer of ['v1beta', 'v1']) {
          if (geminiAnalysisStatus) {
            geminiAnalysisStatus.innerHTML = `<span class="text-purple-400">🤖 جاري التحليل عبر النموذج: <b class="text-white">${model}</b> (${apiVer})...</span>`;
          }
          try {
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey}`,
              { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
            );

            if (!resp.ok) {
              const txt = await resp.text();
              let parsedMsg = '';
              try {
                const j = JSON.parse(txt);
                parsedMsg = j.error?.message || txt;
              } catch (pe) {
                parsedMsg = txt;
              }

              // Friendly Arabic translations for known API errors
              if (parsedMsg.includes('API_KEY_INVALID') || parsedMsg.includes('API key not valid')) {
                lastErr = new Error('مفتاح Gemini API غير صالح. يرجى التأكد من نسخه بدقة من Google AI Studio.');
                throw lastErr;
              } else if (parsedMsg.includes('RESOURCE_EXHAUSTED')) {
                lastErr = new Error(`${model}: تم تجاوز حد الحصة المجانية المؤقت لمفتاحك، جاري تجربة نموذج بديل...`);
              } else {
                lastErr = new Error(`${model}: ${parsedMsg.substring(0, 180)}`);
              }
              continue;
            }

            const data = await resp.json();
            const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const m = raw.match(/\{[\s\S]*\}/);
            if (!m) {
              lastErr = new Error(`${model}: لم يُرجع الذكاء الاصطناعي بيانات JSON صالحة`);
              continue;
            }

            if (modelSelect) modelSelect.value = model; // reflect working model
            return JSON.parse(m[0]);
          } catch (e) {
            lastErr = e;
            if (e.message && e.message.includes('Google AI Studio')) throw e;
          }
        }
      }

      throw lastErr || new Error('تعذّر الاتصال بنماذج Google Gemini. يرجى التأكد من صلاحية المفتاح والاتصال.');
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

      // Reset rotation and scale state for newly loaded image
      rotationDeg = 0;
      scalePercent = 100;
      if (rotationSlider) rotationSlider.value = 0;
      if (rotationLabel) rotationLabel.textContent = '0°';
      if (boundRot) boundRot.textContent = '0°';
      if (scaleSlider) scaleSlider.value = 100;
      if (scaleLabel) scaleLabel.textContent = '100%';

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
      if (rotationDeg !== 0) {
        applyRotation();
      }
      isOverlayVisible = true;
      if (floatingVisibilityBar) floatingVisibilityBar.classList.remove('hidden');
      updateVisibilityUI();
      renderActiveLayersTab();
      switchToCalibrateTab();

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
        if (rotationDeg !== 0) {
          applyRotation();
        }
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
      if (!el) return;
      el.style.transformOrigin = 'center center';
      const cleanTransform = (el.style.transform || '').replace(/\s*rotate\([^)]*\)/g, '').trim();
      if (rotationDeg !== 0) {
        el.style.transform = cleanTransform ? `${cleanTransform} rotate(${rotationDeg}deg)` : `rotate(${rotationDeg}deg)`;
      } else {
        el.style.transform = cleanTransform;
      }
    }

    map.on('zoom viewreset moveend', () => {
      if (overlay && rotationDeg !== 0) {
        applyRotation();
      }
    });

    /**
     * Apply Radiometric & Visual Corrections (Brightness, Contrast, Saturation, Invert, Opacity, Crisp Zoom)
     */
    function applyVisualFilters() {
      if (!overlay) return;
      overlay.setOpacity(visualState.opacity);
      const el = overlay.getElement();
      if (el) {
        el.style.filter = `brightness(${visualState.brightness}%) contrast(${visualState.contrast}%) saturate(${visualState.saturation}%) ${visualState.invert ? 'invert(100%)' : ''}`;
        if (visualState.crisp) {
          el.classList.add('sharp-crisp');
          el.style.imageRendering = '-webkit-optimize-contrast';
          el.style.imageRendering = 'crisp-edges';
        } else {
          el.classList.remove('sharp-crisp');
          el.style.imageRendering = 'auto';
        }
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

    if (sharpToggle) {
      sharpToggle.addEventListener('change', (e) => {
        visualState.crisp = e.target.checked;
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
          invert: false,
          crisp: true
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
        if (sharpToggle) sharpToggle.checked = true;
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
      rotationDeg = 0;
      scalePercent = 100;
      if (rotationSlider) rotationSlider.value = 0;
      if (rotationLabel) rotationLabel.textContent = '0°';
      if (boundRot) boundRot.textContent = '0°';
      if (scaleSlider) scaleSlider.value = 100;
      if (scaleLabel) scaleLabel.textContent = '100%';
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
   * Advanced Geodesic Measurement Tools (Distance & Area on Map)
   * Formulated for WGS84 Geodesic distances and Iraqi units (Dunams / m² / km²)
   */
  function setupMeasurementTools() {
    const distBtn = document.getElementById('measureDistBtn');
    const areaBtn = document.getElementById('measureAreaBtn');
    const distBtnBadge = document.getElementById('distBtnBadge');
    const areaBtnBadge = document.getElementById('areaBtnBadge');
    const measureActiveStatusBadge = document.getElementById('measureActiveStatusBadge');
    const finishBtn = document.getElementById('finishMeasureBtn');
    const clearBtn = document.getElementById('clearMeasureBtn');
    const unitSelect = document.getElementById('measureUnitSelect');
    const measureDiv = document.getElementById('measurementWidgetDiv');

    const floatingMeasureBar = document.getElementById('floatingMeasureBar');
    const floatingMeasureIcon = document.getElementById('floatingMeasureIcon');
    const floatingMeasureTitle = document.getElementById('floatingMeasureTitle');
    const floatingMeasurePointsBadge = document.getElementById('floatingMeasurePointsBadge');
    const floatingMeasureResult = document.getElementById('floatingMeasureResult');
    const floatFinishMeasureBtn = document.getElementById('floatFinishMeasureBtn');
    const floatClearMeasureBtn = document.getElementById('floatClearMeasureBtn');
    const quickDistBtn = document.getElementById('quickMeasureDistBtn');
    const quickAreaBtn = document.getElementById('quickMeasureAreaBtn');

    let measureMode = null; // 'distance' | 'area' | null
    let points = [];
    let vertexMarkers = [];
    let segmentMarkers = [];
    let shapeLayer = null;
    let rubberBandLayer = null;
    let isFinished = false;
    let currentUnit = 'km'; // default distance unit

    /**
     * Exact Spherical Excess Geodesic Area (m²)
     */
    function calculatePolygonArea(latlngs) {
      if (!latlngs || latlngs.length < 3) return 0;
      const RADIUS = 6378137.0; // WGS84 mean earth radius (meters)
      let total = 0;
      const len = latlngs.length;

      for (let i = 0; i < len; i++) {
        const p1 = latlngs[i];
        const p2 = latlngs[(i + 1) % len];
        const dLng = (p2.lng - p1.lng) * (Math.PI / 180);
        const lat1 = p1.lat * (Math.PI / 180);
        const lat2 = p2.lat * (Math.PI / 180);
        total += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
      }

      return Math.abs(total * RADIUS * RADIUS / 2.0);
    }

    /**
     * Total Geodesic Distance along Path (meters)
     */
    function calculateDistance(latlngs) {
      if (!latlngs || latlngs.length < 2) return 0;
      let total = 0;
      for (let i = 0; i < latlngs.length - 1; i++) {
        total += latlngs[i].distanceTo(latlngs[i + 1]);
      }
      return total;
    }

    /**
     * Format Distance Value with unit
     */
    function formatDistance(meters, unit = 'km') {
      if (meters <= 0) return '0 م';
      if (unit === 'm') {
        return `${Math.round(meters).toLocaleString('ar-IQ')} م`;
      } else if (unit === 'nm') {
        return `${(meters / 1852).toFixed(2)} ميل بحري`;
      }
      return meters < 1000
        ? `${Math.round(meters).toLocaleString('ar-IQ')} م`
        : `${(meters / 1000).toFixed(2)} كم`;
    }

    /**
     * Format Area Value with Iraqi Dunams & Metric units
     */
    function formatArea(sqMeters, unit = 'dunam') {
      if (sqMeters <= 0) return '0 م²';
      const dunams = (sqMeters / 2500).toFixed(2);
      const sqKm = (sqMeters / 1000000).toFixed(3);
      const hectares = (sqMeters / 10000).toFixed(2);
      const sqM = Math.round(sqMeters).toLocaleString('ar-IQ');

      if (unit === 'dunam') {
        return `${dunams} دونم عراقي`;
      } else if (unit === 'sqkm') {
        return `${sqKm} كم²`;
      } else if (unit === 'hectare') {
        return `${hectares} هكتار`;
      } else {
        return `${sqM} م²`;
      }
    }

    /**
     * Switch to Tools tab in sidebar
     */
    function activateToolsTab() {
      const tabButtons = document.querySelectorAll('.sidebar-tab-btn');
      const tabPanels = document.querySelectorAll('.tab-panel');
      tabButtons.forEach(b => {
        const isTarget = b.getAttribute('data-tab') === 'tools';
        b.classList.toggle('active', isTarget);
        b.classList.toggle('border-blue-500', isTarget);
        b.classList.toggle('text-blue-400', isTarget);
        b.classList.toggle('border-transparent', !isTarget);
        b.classList.toggle('text-slate-400', !isTarget);
      });
      tabPanels.forEach(panel => {
        panel.classList.toggle('hidden', panel.getAttribute('data-panel') !== 'tools');
      });
      const sidebar = document.getElementById('appSidebar');
      if (sidebar && sidebar.classList.contains('translate-x-full')) {
        sidebar.classList.remove('translate-x-full');
      }
    }

    /**
     * Set active measurement mode
     */
    function setMeasureMode(newMode) {
      if (measureMode === newMode) {
        // Toggle off if clicking the already active tool
        resetMeasurement(false);
        showToast('تم إيقاف أداة القياس', 'info');
        return;
      }

      resetMeasurement(true);
      measureMode = newMode;
      isFinished = false;

      if (measureMode) {
        map.closePopup();
        currentUnit = (measureMode === 'area') ? 'dunam' : 'km';
        if (unitSelect) unitSelect.value = currentUnit;

        map.getContainer().classList.add('measuring-mode-active');
        map.doubleClickZoom.disable();

        if (floatingMeasureBar) floatingMeasureBar.classList.remove('hidden');
        updateButtonStates();
        renderReadout();
        updateFloatingWidget();

        showToast(
          measureMode === 'distance'
            ? 'وضع قياس المسافة مفعل: انقر على الخريطة لتحديد النقاط'
            : 'وضع قياس المساحة مفعل: انقر على الخريطة لتحديد الأركان',
          'info'
        );
      }
    }

    /**
     * Reset and clear all measurements
     */
    function resetMeasurement(keepMode = false) {
      points = [];
      isFinished = false;
      if (!keepMode) {
        measureMode = null;
      }

      if (shapeLayer && map.hasLayer(shapeLayer)) {
        map.removeLayer(shapeLayer);
        shapeLayer = null;
      }
      if (rubberBandLayer && map.hasLayer(rubberBandLayer)) {
        map.removeLayer(rubberBandLayer);
        rubberBandLayer = null;
      }

      vertexMarkers.forEach(m => { if (map.hasLayer(m)) map.removeLayer(m); });
      vertexMarkers = [];
      segmentMarkers.forEach(l => { if (map.hasLayer(l)) map.removeLayer(l); });
      segmentMarkers = [];

      map.getContainer().classList.remove('measuring-mode-active');
      map.doubleClickZoom.enable();

      if (floatingMeasureBar) floatingMeasureBar.classList.add('hidden');
      updateButtonStates();
      renderReadout();
    }

    /**
     * Update visual states of selector buttons
     */
    function updateButtonStates() {
      const isDist = measureMode === 'distance';
      const isArea = measureMode === 'area';

      if (distBtn) {
        distBtn.className = isDist
          ? 'p-3 rounded-xl border border-sky-400 bg-sky-950/80 ring-2 ring-sky-400/50 flex flex-col items-center gap-2 transition-all relative overflow-hidden group shadow-lg shadow-sky-900/40 text-sky-200'
          : 'p-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 flex flex-col items-center gap-2 transition-all relative overflow-hidden group text-slate-100';
      }
      if (distBtnBadge) {
        distBtnBadge.classList.toggle('hidden', !isDist);
      }

      if (areaBtn) {
        areaBtn.className = isArea
          ? 'p-3 rounded-xl border border-emerald-400 bg-emerald-950/80 ring-2 ring-emerald-400/50 flex flex-col items-center gap-2 transition-all relative overflow-hidden group shadow-lg shadow-emerald-900/40 text-emerald-200'
          : 'p-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 flex flex-col items-center gap-2 transition-all relative overflow-hidden group text-slate-100';
      }
      if (areaBtnBadge) {
        areaBtnBadge.classList.toggle('hidden', !isArea);
      }

      if (quickDistBtn) {
        quickDistBtn.className = isDist
          ? 'px-2.5 py-1.5 rounded-md text-xs font-bold text-white bg-sky-600 shadow-sm flex items-center gap-1.5 transition-all ring-1 ring-sky-400'
          : 'px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:text-sky-300 hover:bg-slate-700 flex items-center gap-1.5 transition-all';
      }
      if (quickAreaBtn) {
        quickAreaBtn.className = isArea
          ? 'px-2.5 py-1.5 rounded-md text-xs font-bold text-white bg-emerald-600 shadow-sm flex items-center gap-1.5 transition-all ring-1 ring-emerald-400'
          : 'px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:text-emerald-300 hover:bg-slate-700 flex items-center gap-1.5 transition-all';
      }

      if (measureActiveStatusBadge) {
        if (measureMode) {
          measureActiveStatusBadge.textContent = isDist ? 'قياس مسافة نشط' : 'قياس مساحة نشط';
          measureActiveStatusBadge.className = isDist
            ? 'text-[9px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
            : 'text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40';
        } else {
          measureActiveStatusBadge.textContent = 'خامل';
          measureActiveStatusBadge.className = 'text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono border border-slate-700';
        }
      }
    }

    /**
     * Add interactive numbered vertex marker
     */
    function addVertexMarker(latlng, index) {
      const isArea = measureMode === 'area';
      const bg = isArea ? '#059669' : '#0284c7';
      const border = isArea ? '#34d399' : '#38bdf8';

      const icon = L.divIcon({
        className: 'measure-vertex-icon',
        html: `<div style="background-color: ${bg}; border-color: ${border};" class="w-5 h-5 rounded-full text-white font-mono font-bold text-[9px] flex items-center justify-center border-2 shadow-lg cursor-pointer transform hover:scale-125 transition-transform" title="${index === 0 && isArea ? 'انقر لإغلاق المضلع وحساب المساحة' : 'نقطة ' + (index + 1)}">${index + 1}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      // Only vertex 0 in area mode is interactive to close the polygon
      const isClosingMarker = (isArea && index === 0);
      const marker = L.marker(latlng, {
        icon: icon,
        interactive: isClosingMarker
      }).addTo(map);

      if (isClosingMarker) {
        marker.on('click', (e) => {
          if (measureMode === 'area' && points.length >= 3 && !isFinished) {
            L.DomEvent.stopPropagation(e);
            finishMeasurement();
          }
        });
      }

      vertexMarkers.push(marker);
      return marker;
    }

    /**
     * Render distance tags on line segments
     */
    function updateSegmentMarkers() {
      segmentMarkers.forEach(m => { if (map.hasLayer(m)) map.removeLayer(m); });
      segmentMarkers = [];

      if (points.length < 2) return;

      const count = (measureMode === 'area' && isFinished) ? points.length : points.length - 1;
      for (let i = 0; i < count; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const mid = L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2);
        const d = p1.distanceTo(p2);
        const dText = formatDistance(d, currentUnit === 'm' ? 'm' : 'km');

        const icon = L.divIcon({
          className: 'measure-segment-tooltip',
          html: dText,
          iconSize: [60, 16],
          iconAnchor: [30, 8]
        });

        const m = L.marker(mid, { icon: icon, interactive: false }).addTo(map);
        segmentMarkers.push(m);
      }
    }

    /**
     * Update active shape layer and all readouts
     */
    function updateShapeAndUI() {
      if (shapeLayer && map.hasLayer(shapeLayer)) {
        map.removeLayer(shapeLayer);
        shapeLayer = null;
      }

      if (measureMode === 'distance') {
        if (points.length >= 2) {
          shapeLayer = L.polyline(points, {
            color: '#38bdf8',
            weight: 3.5,
            opacity: 0.95,
            className: 'measure-element',
            interactive: false
          }).addTo(map);
        }
      } else if (measureMode === 'area') {
        if (points.length >= 3) {
          shapeLayer = L.polygon(points, {
            color: '#10b981',
            weight: 2.5,
            fillColor: '#10b981',
            fillOpacity: 0.28,
            className: 'measure-element',
            interactive: false
          }).addTo(map);
        } else if (points.length === 2) {
          shapeLayer = L.polyline(points, {
            color: '#10b981',
            weight: 2,
            dashArray: '5, 6',
            className: 'measure-element',
            interactive: false
          }).addTo(map);
        }
      }

      updateSegmentMarkers();
      renderReadout();
      updateFloatingWidget();
    }

    /**
     * Update Sidebar Readout HTML
     */
    function renderReadout() {
      if (!measureDiv) return;

      if (!measureMode) {
        measureDiv.innerHTML = `
          <div class="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
            <i class="fa-solid fa-mouse-pointer text-slate-500 text-sm mb-1 block"></i>
            اختر أداة (مسافة أو مساحة) ثم انقر على الخريطة لتحديد النقاط.
          </div>
        `;
        return;
      }

      if (points.length === 0) {
        measureDiv.innerHTML = `
          <div class="p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs space-y-2">
            <div class="flex items-center gap-2 text-sky-400 font-semibold">
              <i class="fa-solid fa-circle-dot animate-pulse"></i>
              <span>${measureMode === 'distance' ? 'جاهز لقياس المسافة' : 'جاهز لقياس المساحة'}</span>
            </div>
            <p class="text-slate-300 text-[11px] leading-relaxed">
              انقر فوق أي مكان على سطح الخريطة لتحديد النقطة الأولى للبدء.
            </p>
          </div>
        `;
        return;
      }

      if (measureMode === 'distance') {
        const totalMeters = calculateDistance(points);
        const distKm = (totalMeters / 1000).toFixed(2);
        const distM = Math.round(totalMeters).toLocaleString('ar-IQ');
        const distNm = (totalMeters / 1852).toFixed(2);

        measureDiv.innerHTML = `
          <div class="bg-gradient-to-br from-slate-900 to-slate-950 border border-sky-500/40 rounded-xl p-3.5 space-y-3 shadow-lg">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <i class="fa-solid fa-ruler"></i>
                <span>إجمالي المسافة المقاسة:</span>
              </span>
              <span class="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full font-mono font-bold">${points.length} نقاط</span>
            </div>

            <div>
              <div class="text-2xl font-black text-white font-mono tracking-tight">${formatDistance(totalMeters, currentUnit)}</div>
              <div class="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                <span><strong>${distM}</strong> متر</span>
                <span>&bull;</span>
                <span><strong>${distKm}</strong> كم</span>
                <span>&bull;</span>
                <span><strong>${distNm}</strong> ميل بحري</span>
              </div>
            </div>

            ${points.length >= 2 ? `
              <div class="pt-2 border-t border-slate-800/80 space-y-1 text-[10px]">
                <span class="text-slate-400 font-semibold block mb-1">أطوال الأقسام المقاسة:</span>
                <div class="max-h-24 overflow-y-auto space-y-1 font-mono pr-1">
                  ${points.slice(0, -1).map((p, idx) => {
                    const segDist = p.distanceTo(points[idx + 1]);
                    return `
                      <div class="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                        <span class="text-slate-400">قطعة ${idx + 1} &rarr; ${idx + 2}:</span>
                        <span class="text-sky-300 font-bold">${formatDistance(segDist, currentUnit)}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            <div class="pt-1 text-[10px] text-slate-400 flex items-center gap-1">
              <i class="fa-solid fa-circle-info text-amber-400"></i>
              <span>${isFinished ? 'اكتمل القياس وتثبتت النتيجة على الخريطة.' : 'انقر لإضافة نقاط أخرى، أو نقر مزدوج للإنهاء.'}</span>
            </div>
          </div>
        `;
      } else if (measureMode === 'area') {
        const sqMeters = points.length >= 3 ? calculatePolygonArea(points) : 0;
        const perimeterMeters = calculateDistance(points) + (points.length >= 3 ? points[points.length - 1].distanceTo(points[0]) : 0);

        const dunams = (sqMeters / 2500).toFixed(2);
        const sqKm = (sqMeters / 1000000).toFixed(3);
        const hectares = (sqMeters / 10000).toFixed(2);
        const sqM = Math.round(sqMeters).toLocaleString('ar-IQ');

        measureDiv.innerHTML = `
          <div class="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/40 rounded-xl p-3.5 space-y-3 shadow-lg">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <i class="fa-solid fa-draw-polygon"></i>
                <span>المساحة الجيوديسية الإجمالية:</span>
              </span>
              <span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold">${points.length} أركان</span>
            </div>

            <div>
              <div class="text-2xl font-black text-white font-mono tracking-tight">${points.length >= 3 ? formatArea(sqMeters, currentUnit) : '--'}</div>
              ${points.length >= 3 ? `
                <div class="text-[10px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span class="text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">${dunams} دونم عراقي</span>
                  <span>&bull;</span>
                  <span><strong>${sqKm}</strong> كم²</span>
                  <span>&bull;</span>
                  <span><strong>${hectares}</strong> هكتار</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-1.5">
                  المحيط الإجمالي: <strong class="text-slate-200 font-mono">${formatDistance(perimeterMeters, 'km')}</strong>
                </div>
              ` : `
                <p class="text-[11px] text-amber-300 mt-1">يلزم تحديد 3 نقاط على الأقل لحساب مساحة المضلع.</p>
              `}
            </div>

            <div class="pt-1 text-[10px] text-slate-400 flex items-center gap-1 border-t border-slate-800/80">
              <i class="fa-solid fa-circle-info text-amber-400"></i>
              <span>${isFinished ? 'اكتملت مساحة المضلع وثبتت النتيجة على الخريطة.' : 'انقر لتحديد بقية الأركان، أو انقر نقراً مزدوجاً للإنهاء.'}</span>
            </div>
          </div>
        `;
      }
    }

    /**
     * Update Floating HUD Bar on Map
     */
    function updateFloatingWidget(livePoint = null) {
      if (!floatingMeasureBar) return;
      if (!measureMode) {
        floatingMeasureBar.classList.add('hidden');
        return;
      }
      floatingMeasureBar.classList.remove('hidden');

      const isArea = measureMode === 'area';
      if (floatingMeasureIcon) {
        floatingMeasureIcon.innerHTML = isArea ? '<i class="fa-solid fa-draw-polygon"></i>' : '<i class="fa-solid fa-ruler"></i>';
        floatingMeasureIcon.className = isArea
          ? 'w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-sm shadow-sm'
          : 'w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center text-sm shadow-sm';
      }

      if (floatingMeasureTitle) {
        floatingMeasureTitle.textContent = isArea ? 'قياس المساحة' : 'قياس المسافة';
        floatingMeasureTitle.className = isArea ? 'text-xs font-bold text-emerald-300' : 'text-xs font-bold text-sky-300';
      }

      const pts = livePoint ? [...points, livePoint] : points;
      if (floatingMeasurePointsBadge) {
        floatingMeasurePointsBadge.textContent = isFinished ? `${points.length} نقاط (مكتمل)` : `${pts.length} نقاط`;
      }

      if (floatFinishMeasureBtn) {
        if (isFinished) {
          floatFinishMeasureBtn.innerHTML = '<i class="fa-solid fa-redo text-[10px]"></i><span>قياس جديد</span>';
          floatFinishMeasureBtn.className = 'px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-1';
        } else {
          floatFinishMeasureBtn.innerHTML = '<i class="fa-solid fa-check text-[10px]"></i><span>إنهاء</span>';
          floatFinishMeasureBtn.className = 'px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-1';
        }
      }

      if (floatingMeasureResult) {
        if (!isArea) {
          const d = calculateDistance(pts);
          floatingMeasureResult.textContent = formatDistance(d, currentUnit);
        } else {
          if (pts.length >= 3) {
            const a = calculatePolygonArea(pts);
            floatingMeasureResult.textContent = formatArea(a, currentUnit);
          } else {
            floatingMeasureResult.textContent = pts.length === 2 ? 'حدد النقطة 3...' : 'حدد النقطة 2...';
          }
        }
      }
    }

    /**
     * Complete and lock measurement
     */
    function finishMeasurement() {
      if (!measureMode || isFinished) return;
      if (measureMode === 'distance' && points.length < 2) {
        showToast('يرجى تحديد نقطتين على الأقل لإتمام قياس المسافة', 'warning');
        return;
      }
      if (measureMode === 'area' && points.length < 3) {
        showToast('يرجى تحديد 3 نقاط على الأقل لإتمام قياس المساحة', 'warning');
        return;
      }

      isFinished = true;
      if (rubberBandLayer && map.hasLayer(rubberBandLayer)) {
        map.removeLayer(rubberBandLayer);
        rubberBandLayer = null;
      }

      map.getContainer().classList.remove('measuring-mode-active');
      map.doubleClickZoom.enable();

      updateShapeAndUI();

      // Show summary popup on map
      if (measureMode === 'distance') {
        const total = calculateDistance(points);
        const lastPt = points[points.length - 1];
        const popupContent = `
          <div class="p-2 text-right font-sans space-y-1">
            <div class="text-xs font-bold text-sky-400 flex items-center gap-1">
              <i class="fa-solid fa-ruler"></i>
              <span>نتيجة قياس المسافة</span>
            </div>
            <div class="text-lg font-black font-mono text-white">${formatDistance(total, currentUnit)}</div>
            <div class="text-[10px] text-slate-300">
              عدد المقاطع: <strong>${points.length - 1}</strong> &bull; النقاط: <strong>${points.length}</strong>
            </div>
          </div>
        `;
        L.popup({ className: 'measure-result-popup', offset: [0, -10] })
          .setLatLng(lastPt)
          .setContent(popupContent)
          .openOn(map);
      } else if (measureMode === 'area') {
        const area = calculatePolygonArea(points);
        const perim = calculateDistance(points) + points[points.length - 1].distanceTo(points[0]);
        const center = shapeLayer.getBounds().getCenter();
        const popupContent = `
          <div class="p-2 text-right font-sans space-y-1">
            <div class="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <i class="fa-solid fa-draw-polygon"></i>
              <span>نتيجة قياس المساحة</span>
            </div>
            <div class="text-lg font-black font-mono text-white">${formatArea(area, currentUnit)}</div>
            <div class="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded inline-block">
              ${(area / 2500).toFixed(2)} دونم عراقي
            </div>
            <div class="text-[10px] text-slate-300">
              المحيط: <strong>${formatDistance(perim, 'km')}</strong> &bull; الأركان: <strong>${points.length}</strong>
            </div>
          </div>
        `;
        L.popup({ className: 'measure-result-popup' })
          .setLatLng(center)
          .setContent(popupContent)
          .openOn(map);
      }

      showToast('اكتمل القياس بنجاح وتم تثبيت النتيجة على الخريطة!', 'success');
    }

    // Attach Click Handlers to Tool Buttons
    if (distBtn) {
      distBtn.addEventListener('click', () => {
        setMeasureMode(measureMode === 'distance' ? null : 'distance');
      });
    }

    if (areaBtn) {
      areaBtn.addEventListener('click', () => {
        setMeasureMode(measureMode === 'area' ? null : 'area');
      });
    }

    // Quick Measurement Buttons in Header
    if (quickDistBtn) {
      quickDistBtn.addEventListener('click', () => {
        activateToolsTab();
        setMeasureMode(measureMode === 'distance' ? null : 'distance');
      });
    }

    if (quickAreaBtn) {
      quickAreaBtn.addEventListener('click', () => {
        activateToolsTab();
        setMeasureMode(measureMode === 'area' ? null : 'area');
      });
    }

    if (finishBtn) {
      finishBtn.addEventListener('click', finishMeasurement);
    }
    if (floatFinishMeasureBtn) {
      floatFinishMeasureBtn.addEventListener('click', () => {
        if (isFinished) {
          const currentM = measureMode || 'distance';
          resetMeasurement(true);
          setMeasureMode(currentM);
        } else {
          finishMeasurement();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        resetMeasurement(false);
        showToast('تم تفريغ أداة القياس', 'info');
      });
    }
    if (floatClearMeasureBtn) {
      floatClearMeasureBtn.addEventListener('click', () => {
        resetMeasurement(false);
        showToast('تم تفريغ أداة القياس', 'info');
      });
    }

    if (unitSelect) {
      unitSelect.addEventListener('change', (e) => {
        currentUnit = e.target.value;
        updateShapeAndUI();
      });
    }

    // Map Click & Mouse Interaction
    map.on('click', (e) => {
      if (!measureMode || isFinished) return;
      map.closePopup();
      const pt = e.latlng;
      points.push(pt);
      addVertexMarker(pt, points.length - 1);
      updateShapeAndUI();
    });

    map.on('mousemove', (e) => {
      if (!measureMode || isFinished || points.length === 0) return;
      const curr = e.latlng;
      const lastPt = points[points.length - 1];

      if (rubberBandLayer && map.hasLayer(rubberBandLayer)) {
        map.removeLayer(rubberBandLayer);
      }

      if (measureMode === 'distance') {
        rubberBandLayer = L.polyline([lastPt, curr], {
          color: '#38bdf8',
          weight: 2,
          dashArray: '4, 6',
          opacity: 0.75,
          className: 'measure-element',
          interactive: false
        }).addTo(map);
      } else if (measureMode === 'area') {
        if (points.length >= 2) {
          rubberBandLayer = L.polygon([...points, curr], {
            color: '#10b981',
            weight: 1.5,
            dashArray: '4, 5',
            fillColor: '#10b981',
            fillOpacity: 0.14,
            className: 'measure-element',
            interactive: false
          }).addTo(map);
        } else {
          rubberBandLayer = L.polyline([lastPt, curr], {
            color: '#10b981',
            weight: 1.5,
            dashArray: '4, 5',
            className: 'measure-element',
            interactive: false
          }).addTo(map);
        }
      }

      updateFloatingWidget(curr);
    });

    map.on('dblclick', (e) => {
      if (measureMode && !isFinished) {
        L.DomEvent.stopPropagation(e);
        // Leaflet double click may register a duplicated point, prune if necessary
        if (points.length > 2) {
          const pLast = points[points.length - 1];
          const pPrev = points[points.length - 2];
          if (pLast.distanceTo(pPrev) < 5) {
            points.pop();
            const lastMarker = vertexMarkers.pop();
            if (lastMarker && map.hasLayer(lastMarker)) map.removeLayer(lastMarker);
          }
        }
        finishMeasurement();
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
