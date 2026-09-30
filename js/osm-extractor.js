/**
 * OSM Vector Extractor Engine
 * استخراج أشكال الأبنية والبلوكات من OpenStreetMap
 *
 * تصميم وتطوير الدكتور المهندس احمد لؤي البجاري
 * Uses Overpass API (free, no key required)
 */

(function () {
  'use strict';

  /* =========================================================================
     State
     ========================================================================= */
  const state = {
    map: null,
    isDrawingBbox: false,
    bboxRect: null,        // L.rectangle — الإطار المرسوم
    bboxBounds: null,      // L.LatLngBounds
    osmLayerGroup: null,   // L.layerGroup — نتائج OSM
    drawStartLatLng: null,
    featureCount: 0,
    isLoading: false
  };

  /* =========================================================================
     Constants
     ========================================================================= */
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  const MAX_AREA_KM2 = 25;   // أقصى مساحة للاستخراج (كم²)

  const LAYER_STYLES = {
    building: {
      color: '#f59e0b',
      weight: 1.8,
      fillColor: '#f59e0b',
      fillOpacity: 0.12,
      opacity: 0.9
    },
    block: {
      color: '#3b82f6',
      weight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
      opacity: 0.85
    },
    highway: {
      color: '#10b981',
      weight: 1.5,
      opacity: 0.85
    }
  };

  /* =========================================================================
     Utility — حساب مساحة bbox بالكيلومتر المربع
     ========================================================================= */
  function bboxAreaKm2(bounds) {
    const R = 6371;
    const lat1 = bounds.getSouth() * Math.PI / 180;
    const lat2 = bounds.getNorth() * Math.PI / 180;
    const lon1 = bounds.getWest() * Math.PI / 180;
    const lon2 = bounds.getEast() * Math.PI / 180;
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = dLat * dLon * R * R * Math.cos((lat1 + lat2) / 2);
    return Math.abs(a);
  }

  /* =========================================================================
     Build Overpass Query
     ========================================================================= */
  function buildQuery(bounds, types) {
    const s = bounds.getSouth().toFixed(6);
    const w = bounds.getWest().toFixed(6);
    const n = bounds.getNorth().toFixed(6);
    const e = bounds.getEast().toFixed(6);
    const bbox = `${s},${w},${n},${e}`;

    let filters = '';
    if (types.buildings) {
      filters += `  way["building"](${bbox});\n`;
      filters += `  relation["building"]["type"="multipolygon"](${bbox});\n`;
    }
    if (types.blocks) {
      filters += `  way["landuse"~"residential|commercial|industrial|retail|farmland"](${bbox});\n`;
      filters += `  way["place"~"block|suburb|neighbourhood"](${bbox});\n`;
    }
    if (types.streets) {
      filters += `  way["highway"~"primary|secondary|tertiary|residential|service|unclassified|trunk|motorway|living_street|pedestrian|footway|cycleway"](${bbox});\n`;
    }

    return `[out:json][timeout:40];\n(\n${filters});\nout body;\n>;\nout skel qt;`;
  }

  /* =========================================================================
     Parse Overpass JSON → Leaflet layers
     ========================================================================= */
  function parseOverpassResponse(data, types) {
    // Build node lookup map
    const nodes = {};
    data.elements.forEach(el => {
      if (el.type === 'node') nodes[el.id] = [el.lat, el.lon];
    });

    const layers = [];

    data.elements.forEach(el => {
      if (el.type !== 'way' || !el.nodes) return;

      const latlngs = el.nodes.map(nid => nodes[nid]).filter(Boolean);
      if (latlngs.length < 2) return;

      const tags = el.tags || {};

      // Determine type
      let layerType = null;
      let style = {};
      let tooltipText = '';

      if (tags.building && types.buildings) {
        layerType = 'building';
        style = { ...LAYER_STYLES.building };
        const name = tags.name || tags['name:ar'] || tags['addr:street'] || '';
        const lvl  = tags.building_levels || tags.levels || '';
        tooltipText = `🏢 ${tags.building !== 'yes' ? tags.building : 'مبنى'}${name ? ' — ' + name : ''}${lvl ? ' (' + lvl + ' طوابق)' : ''}`;
      } else if ((tags.landuse || tags.place) && types.blocks) {
        layerType = 'block';
        style = { ...LAYER_STYLES.block };
        const name = tags.name || tags['name:ar'] || '';
        tooltipText = `🏘️ ${tags.landuse || tags.place}${name ? ' — ' + name : ''}`;
      } else if (tags.highway && types.streets) {
        layerType = 'highway';
        style = { ...LAYER_STYLES.highway };
        const name = tags.name || tags['name:ar'] || tags.ref || '';
        tooltipText = `🛣️ ${tags.highway}${name ? ' — ' + name : ''}`;
      }

      if (!layerType) return;

      // Build layer
      const isClosed = el.nodes[0] === el.nodes[el.nodes.length - 1];
      let layer;
      if (layerType !== 'highway' && isClosed && latlngs.length >= 3) {
        layer = L.polygon(latlngs, style);
      } else {
        layer = L.polyline(latlngs, style);
      }

      if (tooltipText) {
        layer.bindTooltip(tooltipText, {
          permanent: false,
          direction: 'top',
          className: 'osm-tooltip',
          sticky: true
        });
      }

      layer._osmType = layerType;
      layer._osmTags = tags;
      layers.push(layer);
    });

    return layers;
  }

  /* =========================================================================
     Fetch from Overpass
     ========================================================================= */
  async function fetchOsm(bounds, types) {
    const query = buildQuery(bounds, types);
    const body  = new URLSearchParams({ data: query });

    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    return res.json();
  }

  /* =========================================================================
     Render Results
     ========================================================================= */
  function renderResults(layers) {
    // Clear old results
    clearOsmLayer();

    state.osmLayerGroup = L.layerGroup(layers).addTo(state.map);
    state.featureCount  = layers.length;

    // Fit map to results
    if (layers.length > 0) {
      try {
        const group = L.featureGroup(layers);
        state.map.fitBounds(group.getBounds(), { padding: [20, 20] });
      } catch (_) { /* ignore */ }
    }
  }

  /* =========================================================================
     Clear OSM Layer
     ========================================================================= */
  function clearOsmLayer() {
    if (state.osmLayerGroup) {
      state.map.removeLayer(state.osmLayerGroup);
      state.osmLayerGroup = null;
    }
    state.featureCount = 0;
  }

  /* =========================================================================
     Convert OSM layer to Drawing Engine features
     ========================================================================= */
  function addOsmToDrawingEngine() {
    if (!state.osmLayerGroup || !window.AtlasDrawingEngine) return;
    const engine = window.AtlasDrawingEngine;
    let added = 0;

    state.osmLayerGroup.eachLayer(layer => {
      const tags = layer._osmTags || {};
      const type = layer._osmType;

      let latlngs;
      if (layer.getLatLngs) {
        const raw = layer.getLatLngs();
        latlngs = Array.isArray(raw[0]) ? raw[0] : raw;
      } else return;

      const points = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
      if (points.length < 2) return;

      let drawType = 'line';
      let color    = '#10b981';
      const name   = tags.name || tags['name:ar'] || '';

      if (type === 'building') {
        drawType = 'building';
        color    = '#f59e0b';
      } else if (type === 'block') {
        drawType = 'block';
        color    = '#3b82f6';
      } else if (type === 'highway') {
        drawType = 'street';
        color    = '#10b981';
      }

      const fCount = engine.features.filter(f => f.type === drawType).length + added + 1;
      const fName  = name
        ? name
        : (drawType === 'building' ? `مبنى OSM ${fCount}`
          : drawType === 'block'   ? `بلوك OSM ${fCount}`
          : `شارع OSM ${fCount}`);

      const feat = {
        id:        'osm_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        type:      drawType,
        name:      fName,
        color,
        fillColor: color,
        fillOpacity: 0.18,
        weight:    drawType === 'street' ? 3 : 2,
        points,
        properties: {
          source:       'OpenStreetMap',
          osmTags:      tags,
          streetWidth:  tags.lanes ? parseInt(tags.lanes) * 3 : (drawType === 'street' ? 6 : undefined),
          floors:       tags.building_levels ? parseInt(tags.building_levels) : undefined,
          usage:        tags.amenity || tags.shop || tags.office || undefined
        }
      };

      if (drawType === 'building' || drawType === 'block') {
        feat.areaM2 = engine.computePolygonArea ? engine.computePolygonArea(points) : 0;
        feat.perimeterM = engine.computePolylineLength ? engine.computePolylineLength([...points, points[0]]) : 0;
      } else {
        feat.lengthM = engine.computePolylineLength ? engine.computePolylineLength(points) : 0;
      }

      engine._addFeatureToMap(feat);
      added++;
    });

    engine.saveToStorage();
    engine.updateStatsUi();

    // Remove the raw OSM layer (now in drawing engine)
    clearOsmLayer();

    return added;
  }

  /* =========================================================================
     BBox Drawing Mode (رسم نافذة التحديد)
     ========================================================================= */
  function startBboxDraw(onFinish) {
    if (!state.map) return;
    state.isDrawingBbox = true;

    const map = state.map;
    map.getContainer().style.cursor = 'crosshair';

    // Remove old rect
    if (state.bboxRect) { map.removeLayer(state.bboxRect); state.bboxRect = null; }

    let startPt = null;

    function onMouseDown(e) {
      startPt = e.latlng;
      if (state.bboxRect) map.removeLayer(state.bboxRect);
      state.bboxRect = L.rectangle([startPt, startPt], {
        color: '#38bdf8',
        weight: 2,
        dashArray: '6,4',
        fillColor: '#38bdf8',
        fillOpacity: 0.08
      }).addTo(map);
      map.dragging.disable();
    }

    function onMouseMove(e) {
      if (!startPt || !state.bboxRect) return;
      state.bboxRect.setBounds(L.latLngBounds(startPt, e.latlng));
    }

    function onMouseUp(e) {
      if (!startPt) return;
      const bounds = L.latLngBounds(startPt, e.latlng);
      state.bboxBounds = bounds;
      cleanup();
      onFinish(bounds);
    }

    function cleanup() {
      state.isDrawingBbox = false;
      map.getContainer().style.cursor = '';
      map.dragging.enable();
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
    }

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
  }

  /* =========================================================================
     UI — Modal HTML
     ========================================================================= */
  function getModalHtml() {
    return `
      <div id="osmExtractorModal"
        class="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        dir="rtl">
        <div class="bg-slate-900 border border-sky-500/40 rounded-2xl shadow-2xl w-full max-w-md text-right font-sans text-slate-100 overflow-hidden">

          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-sky-900/40 to-slate-900">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 text-sm">
                <i class="fa-brands fa-openstreetmap"></i>
              </span>
              <div>
                <h3 class="font-bold text-sm text-white">استخراج طبقات OSM</h3>
                <p class="text-[10px] text-slate-400">OpenStreetMap Overpass API</p>
              </div>
            </div>
            <button type="button" id="closeOsmModalBtn"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="p-4 space-y-4">

            <!-- Layer Type Selection -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <i class="fa-solid fa-layer-group text-sky-400 text-[11px]"></i>
                اختر أنواع البيانات المراد استخراجها:
              </label>
              <div class="space-y-2">
                <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 cursor-pointer transition-colors group">
                  <input type="checkbox" id="osmTypeBuildings" checked
                    class="w-4 h-4 rounded accent-amber-400 cursor-pointer">
                  <span class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs border border-amber-500/30 shrink-0">
                    <i class="fa-solid fa-building"></i>
                  </span>
                  <div class="flex-1">
                    <div class="text-xs font-bold text-slate-200">مباني Building Footprints</div>
                    <div class="text-[10px] text-slate-400">حدود ومساقط الأبنية كمضلعات</div>
                  </div>
                  <span class="w-3 h-3 rounded-full shrink-0" style="background:#f59e0b;"></span>
                </label>

                <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-blue-500/50 cursor-pointer transition-colors group">
                  <input type="checkbox" id="osmTypeBlocks" checked
                    class="w-4 h-4 rounded accent-blue-400 cursor-pointer">
                  <span class="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs border border-blue-500/30 shrink-0">
                    <i class="fa-solid fa-city"></i>
                  </span>
                  <div class="flex-1">
                    <div class="text-xs font-bold text-slate-200">بلوكات وقطاعات Landuse</div>
                    <div class="text-[10px] text-slate-400">مناطق سكنية، تجارية، صناعية</div>
                  </div>
                  <span class="w-3 h-3 rounded-full shrink-0" style="background:#3b82f6;"></span>
                </label>

                <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-colors group">
                  <input type="checkbox" id="osmTypeStreets"
                    class="w-4 h-4 rounded accent-emerald-400 cursor-pointer">
                  <span class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs border border-emerald-500/30 shrink-0">
                    <i class="fa-solid fa-road"></i>
                  </span>
                  <div class="flex-1">
                    <div class="text-xs font-bold text-slate-200">شوارع وطرق Highway Network</div>
                    <div class="text-[10px] text-slate-400">شبكة الشوارع والطرق المصنفة</div>
                  </div>
                  <span class="w-3 h-3 rounded-full shrink-0" style="background:#10b981;"></span>
                </label>
              </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-slate-700/60"></div>

            <!-- Area Selection -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <i class="fa-solid fa-vector-square text-cyan-400 text-[11px]"></i>
                تحديد منطقة الاستخراج:
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" id="osmUseCurrViewBtn"
                  class="osm-area-btn active-area-btn flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-sky-600/30 border-2 border-sky-500/70 text-sky-200 text-[11px] font-bold cursor-pointer hover:bg-sky-600/40 transition-all">
                  <i class="fa-solid fa-map text-sky-300 text-xs"></i>
                  <span>نطاق الخارطة الحالي</span>
                </button>
                <button type="button" id="osmDrawBboxBtn"
                  class="osm-area-btn flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 border-2 border-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer hover:border-cyan-500/60 hover:text-cyan-200 transition-all">
                  <i class="fa-solid fa-draw-square text-cyan-400 text-xs"></i>
                  <span>رسم نافذة تحديد</span>
                </button>
              </div>

              <!-- Bbox Status Badge -->
              <div id="osmBboxStatus"
                class="hidden items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-[11px] text-cyan-300 font-medium">
                <i class="fa-solid fa-check-circle text-cyan-400 text-xs"></i>
                <span id="osmBboxStatusText">تم رسم النافذة</span>
              </div>
            </div>

            <!-- Warning -->
            <div class="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-950/50 border border-amber-700/40 text-[10px] text-amber-300">
              <i class="fa-solid fa-triangle-exclamation text-amber-400 mt-0.5 shrink-0"></i>
              <span>لتجنب الحمل الزائد، يُنصح باستخدام مناطق أقل من <strong>25 كم²</strong>. المناطق الكبيرة قد تستغرق وقتاً أطول.</span>
            </div>

          </div>

          <!-- Footer Buttons -->
          <div class="px-4 pb-4 flex items-center gap-2 border-t border-slate-800 pt-3">
            <button type="button" id="osmExtractBtn"
              class="flex-1 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-900/40 cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95">
              <i class="fa-brands fa-openstreetmap text-sm"></i>
              <span id="osmExtractBtnText">استخراج الآن</span>
            </button>
            <button type="button" id="closeOsmModalBtn2"
              class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl cursor-pointer transition-colors">
              إلغاء
            </button>
          </div>

        </div>
      </div>
    `;
  }

  /* =========================================================================
     UI — Results Overlay
     ========================================================================= */
  function getResultsHtml(count, types) {
    const buildingCount = types.buildings ? '✓' : '—';
    return `
      <div id="osmResultsBar"
        class="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5
               bg-slate-900/95 backdrop-blur-md border border-sky-500/50 rounded-2xl shadow-2xl"
        dir="rtl">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center text-sm">
            <i class="fa-brands fa-openstreetmap"></i>
          </span>
          <div>
            <div class="text-xs font-bold text-sky-200">تم استخراج بيانات OSM</div>
            <div class="text-[10px] text-slate-400"><strong class="text-white">${count}</strong> عنصر مُحمَّل على الخارطة</div>
          </div>
        </div>
        <div class="h-7 w-px bg-slate-700"></div>
        <div class="flex items-center gap-1.5">
          <button type="button" id="osmAddToDrawBtn"
            class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1 shadow-md active:scale-95"
            title="إضافة الطبقة المستخرجة إلى محرك الرسم للتعديل والتصدير">
            <i class="fa-solid fa-pen-ruler text-[10px]"></i>
            <span>أضف للرسم</span>
          </button>
          <button type="button" id="osmExportGeoJsonBtn"
            class="px-2.5 py-1.5 bg-slate-800 hover:bg-sky-900/60 text-sky-300 border border-sky-500/40 text-[11px] font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1"
            title="تصدير البيانات بصيغة GeoJSON">
            <i class="fa-solid fa-file-export text-[10px]"></i>
            <span>GeoJSON</span>
          </button>
          <button type="button" id="osmClearLayerBtn"
            class="px-2.5 py-1 bg-slate-800 hover:bg-rose-900/40 text-rose-400 border border-slate-700 text-[11px] font-bold rounded-xl cursor-pointer transition-colors"
            title="مسح طبقة OSM">
            <i class="fa-solid fa-trash text-[10px]"></i>
          </button>
        </div>
      </div>
    `;
  }

  /* =========================================================================
     Export GeoJSON
     ========================================================================= */
  function exportGeoJson() {
    if (!state.osmLayerGroup) return;
    const features = [];
    state.osmLayerGroup.eachLayer(layer => {
      try {
        const gj = layer.toGeoJSON ? layer.toGeoJSON() : null;
        if (gj) {
          gj.properties = layer._osmTags || {};
          gj.properties._osmType = layer._osmType;
          features.push(gj);
        }
      } catch (_) { /* skip */ }
    });

    const fc = { type: 'FeatureCollection', features };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `osm_extract_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* =========================================================================
     Open Modal
     ========================================================================= */
  function openModal() {
    const existing = document.getElementById('osmExtractorModal');
    if (existing) { existing.remove(); return; }

    document.body.insertAdjacentHTML('beforeend', getModalHtml());

    const modal   = document.getElementById('osmExtractorModal');
    let useDrawn  = false;   // false = current view, true = drawn bbox

    // Close handlers
    const closeModal = () => modal.remove();
    document.getElementById('closeOsmModalBtn').addEventListener('click', closeModal);
    document.getElementById('closeOsmModalBtn2').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    // Area selection buttons
    const currViewBtn = document.getElementById('osmUseCurrViewBtn');
    const drawBboxBtn = document.getElementById('osmDrawBboxBtn');
    const bboxStatus  = document.getElementById('osmBboxStatus');

    currViewBtn.addEventListener('click', () => {
      useDrawn = false;
      currViewBtn.classList.add('active-area-btn', 'bg-sky-600/30', 'border-sky-500/70', 'text-sky-200');
      currViewBtn.classList.remove('bg-slate-800', 'border-slate-700', 'text-slate-300');
      drawBboxBtn.classList.remove('active-area-btn', 'bg-sky-600/30', 'border-sky-500/70', 'text-sky-200');
      drawBboxBtn.classList.add('bg-slate-800', 'border-slate-700', 'text-slate-300');
    });

    drawBboxBtn.addEventListener('click', () => {
      // Hide modal temporarily while drawing
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';

      if (typeof window.showToast === 'function') {
        window.showToast('انقر واسحب على الخارطة لرسم نافذة الاستخراج', 'info');
      }

      startBboxDraw((bounds) => {
        useDrawn = true;
        modal.style.opacity = '1';
        modal.style.pointerEvents = '';

        const areaKm2 = bboxAreaKm2(bounds).toFixed(2);
        const statusEl = document.getElementById('osmBboxStatus');
        const textEl   = document.getElementById('osmBboxStatusText');
        if (statusEl) {
          statusEl.classList.remove('hidden');
          statusEl.classList.add('flex');
          if (textEl) textEl.textContent = `النافذة: ${areaKm2} كم² — جاهزة للاستخراج`;
        }

        drawBboxBtn.classList.add('active-area-btn', 'border-cyan-500/70', 'text-cyan-200');
        drawBboxBtn.classList.remove('bg-slate-800', 'border-slate-700', 'text-slate-300');
        currViewBtn.classList.remove('active-area-btn', 'bg-sky-600/30', 'border-sky-500/70', 'text-sky-200');
        currViewBtn.classList.add('bg-slate-800', 'border-slate-700', 'text-slate-300');
      });
    });

    // Extract button
    document.getElementById('osmExtractBtn').addEventListener('click', async () => {
      const types = {
        buildings: document.getElementById('osmTypeBuildings').checked,
        blocks:    document.getElementById('osmTypeBlocks').checked,
        streets:   document.getElementById('osmTypeStreets').checked
      };

      if (!types.buildings && !types.blocks && !types.streets) {
        if (typeof window.showToast === 'function') {
          window.showToast('⚠️ يرجى اختيار نوع بيانات واحد على الأقل', 'warning');
        }
        return;
      }

      // Get bbox
      let bounds;
      if (useDrawn && state.bboxBounds) {
        bounds = state.bboxBounds;
      } else {
        bounds = state.map.getBounds();
      }

      // Check area
      const areaKm2 = bboxAreaKm2(bounds);
      if (areaKm2 > MAX_AREA_KM2) {
        if (typeof window.showToast === 'function') {
          window.showToast(`⚠️ المنطقة كبيرة جداً (${areaKm2.toFixed(1)} كم²). يرجى تكبير الخارطة أو رسم نافذة أصغر.`, 'warning');
        }
        return;
      }

      // Loading state
      state.isLoading = true;
      const btn = document.getElementById('osmExtractBtn');
      const txt = document.getElementById('osmExtractBtnText');
      if (btn) btn.disabled = true;
      if (txt) txt.textContent = 'جارٍ الاستخراج...';
      if (btn) btn.classList.add('opacity-70');

      if (typeof window.showToast === 'function') {
        window.showToast('🛰️ جارٍ الاستعلام من OpenStreetMap Overpass API...', 'info');
      }

      try {
        const data   = await fetchOsm(bounds, types);
        const layers = parseOverpassResponse(data, types);

        renderResults(layers);
        closeModal();

        // Remove drawn bbox rect
        if (state.bboxRect) { state.map.removeLayer(state.bboxRect); state.bboxRect = null; }

        // Show results bar
        const existingBar = document.getElementById('osmResultsBar');
        if (existingBar) existingBar.remove();

        const mapMain = document.querySelector('#mainWorkspaceWrapper main');
        if (mapMain) {
          mapMain.insertAdjacentHTML('beforeend', getResultsHtml(layers.length, types));

          document.getElementById('osmAddToDrawBtn').addEventListener('click', () => {
            const added = addOsmToDrawingEngine();
            document.getElementById('osmResultsBar')?.remove();
            if (typeof window.showToast === 'function') {
              window.showToast(`✅ تمت إضافة ${added} عنصر OSM إلى محرك الرسم بنجاح`, 'success');
            }
          });

          document.getElementById('osmExportGeoJsonBtn').addEventListener('click', () => {
            exportGeoJson();
            if (typeof window.showToast === 'function') {
              window.showToast('📁 تم تصدير البيانات بصيغة GeoJSON', 'success');
            }
          });

          document.getElementById('osmClearLayerBtn').addEventListener('click', () => {
            clearOsmLayer();
            document.getElementById('osmResultsBar')?.remove();
            if (typeof window.showToast === 'function') {
              window.showToast('🗑️ تم مسح طبقة OSM', 'info');
            }
          });
        }

        if (typeof window.showToast === 'function') {
          window.showToast(`✅ تم استخراج ${layers.length} عنصر من OpenStreetMap`, 'success');
        }

      } catch (err) {
        console.error('OSM Extractor error:', err);
        if (typeof window.showToast === 'function') {
          window.showToast('❌ فشل الاتصال بـ Overpass API. تحقق من اتصال الإنترنت وحاول مجدداً.', 'error');
        }
        if (btn) { btn.disabled = false; btn.classList.remove('opacity-70'); }
        if (txt) txt.textContent = 'استخراج الآن';
      } finally {
        state.isLoading = false;
      }
    });
  }

  /* =========================================================================
     Init — wait for window.map
     ========================================================================= */
  function init(mapInstance) {
    state.map = mapInstance;
    window.openOsmExtractor = openModal;
    window.clearOsmLayer    = clearOsmLayer;
  }

  function _tryInit(attempts) {
    const m = window.map || window.atlasMap;
    if (m) { init(m); return; }
    if (attempts > 0) setTimeout(() => _tryInit(attempts - 1), 200);
  }

  _tryInit(30);

  window.AtlasOsmExtractor = { init, open: openModal, clear: clearOsmLayer };

})();
