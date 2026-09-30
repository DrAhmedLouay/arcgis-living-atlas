/**
 * ============================================================================
 * ArcGIS Living Atlas of Iraq - Cartographic Map Layout & Print Studio
 * استوديو تصميم وتصدير لوحات الخرائط الهندسية والطباعة القياسية (A0, A1, A2, A3, A4)
 * 
 * Features:
 *  - Interactive Map Selection Frame (Bounding Window / Aspect Ratio Lock / Drag & Resize)
 *  - Standard International Sheet Sizes: A0, A1, A2, A3, A4 (Landscape & Portrait)
 *  - Dynamic Representative Scale Calculation (1:500, 1:1,000, 1:2,500, 1:5,000, 1:10,000, ...)
 *  - Professional Dual-Neatline Cartographic Border with Graticule Coordinates (WGS84 & UTM)
 *  - Vector & Satellite Imagery Rendering with Calibrated Overlay & Drawn Features Integration
 *  - Graphic Scale Bar, High-Precision SVG North Arrow, Symbology Legend
 *  - Official Certified Engineer Metadata Cartouche:
 *    "تصميم وتطوير الدكتور المهندس احمد لؤي البجاري"
 *  - Direct Printing (Native High-DPI Plotter Support via @page CSS)
 *  - Direct PDF Export (via jsPDF) & High-Resolution PNG Graphic Export
 * ============================================================================
 */

(function () {
  'use strict';

  // Standard ISO 216 Paper Sizes in Millimeters
  const SHEET_SIZES = {
    'a4': { name: 'A4', widthMm: 210, heightMm: 297, label: 'لوحة A4 (210 × 297 ملم) - تقارير وسجلات رسمية' },
    'a3': { name: 'A3', widthMm: 297, heightMm: 420, label: 'لوحة A3 (297 × 420 ملم) - خرائط مسح ومخططات ميدانية' },
    'a2': { name: 'A2', widthMm: 420, heightMm: 594, label: 'لوحة A2 (420 × 594 ملم) - إفراز وتقسيم عقاري' },
    'a1': { name: 'A1', widthMm: 594, heightMm: 841, label: 'لوحة A1 (594 × 841 ملم) - تصميم أساس وتخطيط حضري' },
    'a0': { name: 'A0', widthMm: 841, heightMm: 1189, label: 'لوحة A0 (841 × 1189 ملم) - مخططات كبرى ومسوحات إقليمية' }
  };

  // Standard Cartographic Scales for rounding
  const STANDARD_SCALES = [
    250, 500, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000,
    7500, 10000, 15000, 20000, 25000, 50000, 75000, 100000, 150000, 200000, 250000, 500000
  ];

  class LayoutStudioEngine {
    constructor() {
      this.map = null;
      this.selectedSheet = 'a3';
      this.orientation = 'landscape'; // 'landscape' | 'portrait'
      this.aspectRatioLocked = true;
      this.dpi = 150; // 150 DPI for preview/fast, 300 DPI for ultra print
      this.frameBounds = null; // L.latLngBounds
      this.isFrameVisible = false;
      this.isDraggingFrame = false;
      this.activeHandle = null;
      this.dragStartLatLng = null;
      this.dragStartBounds = null;

      // Leaflet Layers
      this.frameLayerGroup = null;
      this.frameRectangle = null;
      this.maskPolygon = null;
      this.handleMarkers = [];
      this.frameBannerMarker = null;

      // Settings
      this.options = {
        title: 'مخطط الرقمنة والمسح الحضري والعقاري',
        subtitle: 'أطلس البيانات المكانية التفاعلي - جمهورية العراق',
        locationName: 'محافظة نينوى - مدينة الموصل',
        organization: 'جمهورية العراق • أطلس البيانات المكانية التفاعلي',
        engineerAttribution: 'تصميم وتطوير الدكتور المهندس احمد لؤي البجاري',
        crs: 'WGS 84 / UTM Zone 38N (EPSG:32638)',
        showNorthArrow: true,
        showScaleBar: true,
        showLegend: true,
        showCartouche: true,
        showCoordinates: true,
        showGrid: true,
        basemapType: 'satellite', // 'satellite' | 'streets' | 'topo'
        sheetNumber: '01 / IRQ-LAYOUT'
      };

      this.cachedCanvas = null;
      this._cachedSatImg = null;
      this._cachedSatBbox = null;
      this._debounceTimer = null;
    }

    /**
     * Initialize Engine with Leaflet Map instance
     */
    init(mapInstance) {
      if (!mapInstance) {
        mapInstance = window.map || window.atlasMap;
      }
      if (!mapInstance) {
        console.warn('AtlasLayoutStudio: Map instance not available yet.');
        return;
      }
      this.map = mapInstance;

      if (!this.frameLayerGroup) {
        this.frameLayerGroup = L.layerGroup().addTo(this.map);
      }

      this._initEventListeners();
      console.log('📐 AtlasLayoutStudio: Cartographic Map Layout Engine initialized successfully.');
    }

    /**
     * Calculate Map Frame Aspect Ratio on the chosen sheet
     */
    getMapFrameAspectRatio() {
      const sheet = SHEET_SIZES[this.selectedSheet] || SHEET_SIZES['a3'];
      let sheetW = sheet.widthMm;
      let sheetH = sheet.heightMm;

      if (this.orientation === 'landscape') {
        const temp = Math.max(sheetW, sheetH);
        sheetH = Math.min(sheetW, sheetH);
        sheetW = temp;
      } else {
        const temp = Math.min(sheetW, sheetH);
        sheetH = Math.max(sheetW, sheetH);
        sheetW = temp;
      }

      // Allow for margins, header (24mm), and bottom cartouche panel (38mm)
      const margin = 14; // mm
      const mapWidthMm = sheetW - (margin * 2);
      const mapHeightMm = sheetH - (margin * 2) - 26 - 36; // Header + bottom accessories

      return Math.max(0.2, mapWidthMm / Math.max(10, mapHeightMm));
    }

    /**
     * Show or Toggle the interactive Map Frame on the map
     */
    toggleSelectionFrame() {
      if (this.isFrameVisible) {
        this.hideSelectionFrame();
      } else {
        this.showSelectionFrame();
      }
    }

    /**
     * Show the Map Selection Frame
     */
    showSelectionFrame() {
      if (!this.map) this.init();
      if (!this.map) return;

      this.isFrameVisible = true;

      // If no frame bounds yet, initialize matching current map center and view
      if (!this.frameBounds) {
        this.fitFrameToCurrentView();
      } else {
        this._renderFrameOverlay();
      }

      // Ensure frame is visible in viewport
      if (this.frameBounds && !this.map.getBounds().intersects(this.frameBounds)) {
        this.map.fitBounds(this.frameBounds, { padding: [50, 50] });
      }

      // Update UI button state if present
      const btn = document.getElementById('toggleMapLayoutFrameBtn');
      if (btn) {
        btn.classList.add('bg-cyan-500/30', 'border-cyan-400', 'text-cyan-200');
      }

      this._showToast('تم إظهار نافذة لوحة الخارطة (Frame) • يمكنك سحبها أو تعديل مقاسها بدقة', 'info');
    }

    /**
     * Hide the Map Selection Frame
     */
    hideSelectionFrame() {
      this.isFrameVisible = false;
      if (this.frameLayerGroup) {
        this.frameLayerGroup.clearLayers();
      }
      this.handleMarkers = [];
      this.frameRectangle = null;
      this.maskPolygon = null;
      this.frameBannerMarker = null;

      const btn = document.getElementById('toggleMapLayoutFrameBtn');
      if (btn) {
        btn.classList.remove('bg-cyan-500/30', 'border-cyan-400', 'text-cyan-200');
      }
    }

    /**
     * Fit Frame to Current Map View respecting aspect ratio
     */
    fitFrameToCurrentView() {
      if (!this.map) return;
      const mapBounds = this.map.getBounds();
      const center = mapBounds.getCenter();
      const targetRatio = this.getMapFrameAspectRatio();

      const spanLat = (mapBounds.getNorth() - mapBounds.getSouth()) * 0.72;
      const spanLng = (mapBounds.getEast() - mapBounds.getWest()) * 0.72;

      // Adjust for latitude distortion in Mercator
      const latCos = Math.cos(center.lat * Math.PI / 180);
      let halfLat = spanLat / 2;
      let halfLng = (halfLat * targetRatio) / latCos;

      // Ensure halfLng fits within screen span
      if (halfLng * 2 > spanLng) {
        halfLng = spanLng / 2;
        halfLat = (halfLng / targetRatio) * latCos;
      }

      this.frameBounds = L.latLngBounds(
        [center.lat - halfLat, center.lng - halfLng],
        [center.lat + halfLat, center.lng + halfLng]
      );

      this.isFrameVisible = true;
      this._cachedSatImg = null;
      this._cachedSatBbox = null;
      this._renderFrameOverlay();
      this.updateStudioModalUi();
    }

    /**
     * Set Sheet Size (a0, a1, a2, a3, a4) and re-adjust frame aspect ratio
     */
    async setSheetSize(size) {
      if (!SHEET_SIZES[size]) return;
      this.selectedSheet = size;
      this._cachedSatImg = null;
      this._cachedSatBbox = null;
      if (this.aspectRatioLocked && this.frameBounds) {
        this._adjustFrameBoundsToAspectRatio();
      }
      this._renderFrameOverlay();
      this.updateStudioModalUi();
      await this.refreshStudioPreview();
    }

    /**
     * Set Orientation ('landscape' | 'portrait')
     */
    async setOrientation(orientation) {
      if (orientation !== 'landscape' && orientation !== 'portrait') return;
      this.orientation = orientation;
      this._cachedSatImg = null;
      this._cachedSatBbox = null;
      if (this.aspectRatioLocked && this.frameBounds) {
        this._adjustFrameBoundsToAspectRatio();
      }
      this._renderFrameOverlay();
      this.updateStudioModalUi();
      await this.refreshStudioPreview();
    }

    /**
     * Set DPI Resolution (150 or 300)
     */
    async setDpi(dpi) {
      this.dpi = Number(dpi) || 150;
      const btn150 = document.getElementById('layoutDpi150Btn');
      const btn300 = document.getElementById('layoutDpi300Btn');
      if (btn150 && btn300) {
        if (this.dpi === 300) {
          btn300.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white border border-cyan-500/40 cursor-pointer shadow-sm';
          btn150.className = 'flex-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer';
        } else {
          btn150.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white border border-cyan-500/40 cursor-pointer shadow-sm';
          btn300.className = 'flex-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer';
        }
      }
      await this.refreshStudioPreview();
    }

    /**
     * Debounced preview refresh for text input typing
     */
    debouncedRefresh(delay = 250) {
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this.refreshStudioPreview();
      }, delay);
    }

    /**
     * Toggle Aspect Ratio Lock
     */
    toggleAspectRatioLock() {
      this.aspectRatioLocked = !this.aspectRatioLocked;
      if (this.aspectRatioLocked && this.frameBounds) {
        this._adjustFrameBoundsToAspectRatio();
        this._renderFrameOverlay();
      }
      this._showToast(this.aspectRatioLocked ? 'تم قفل نسبة أبعاد اللوحة 🔒' : 'تم تحرير نسبة الأبعاد للتحجيم الحر 🔓', 'info');
      this.updateStudioModalUi();
    }

    /**
     * Adjust current frame bounds to strictly match the layout aspect ratio
     */
    _adjustFrameBoundsToAspectRatio() {
      if (!this.frameBounds) return;
      const center = this.frameBounds.getCenter();
      const targetRatio = this.getMapFrameAspectRatio();
      const latCos = Math.cos(center.lat * Math.PI / 180);

      const currentLatSpan = this.frameBounds.getNorth() - this.frameBounds.getSouth();
      const halfLat = currentLatSpan / 2;
      const halfLng = (halfLat * targetRatio) / latCos;

      this.frameBounds = L.latLngBounds(
        [center.lat - halfLat, center.lng - halfLng],
        [center.lat + halfLat, center.lng + halfLng]
      );
    }

    /**
     * Calculate Representative Fraction Scale (e.g. 1:2,500)
     */
    calculateScale() {
      if (!this.frameBounds) return 2500;
      const sw = this.frameBounds.getSouthWest();
      const se = this.frameBounds.getSouthEast();
      const groundWidthMeters = sw.distanceTo(se);

      const sheet = SHEET_SIZES[this.selectedSheet] || SHEET_SIZES['a3'];
      let sheetW = sheet.widthMm;
      let sheetH = sheet.heightMm;
      if (this.orientation === 'landscape') {
        sheetW = Math.max(sheetW, sheetH);
      } else {
        sheetW = Math.min(sheetW, sheetH);
      }

      // Map width in meters on paper
      const mapWidthPaperMeters = (sheetW - 28) / 1000;
      if (mapWidthPaperMeters <= 0) return 2500;

      const rawScale = groundWidthMeters / mapWidthPaperMeters;

      // Find closest standard cartographic scale
      let closest = STANDARD_SCALES[0];
      let minDiff = Math.abs(rawScale - closest);
      for (let s of STANDARD_SCALES) {
        const diff = Math.abs(rawScale - s);
        if (diff < minDiff) {
          minDiff = diff;
          closest = s;
        }
      }
      return closest;
    }

    /**
     * Format Scale String (e.g., "1:2,500")
     */
    getScaleString() {
      const s = this.calculateScale();
      return `1:${s.toLocaleString('en-US')}`;
    }

    /**
     * Render the visual Frame, Outer Dimming Mask, and Handles on Leaflet Map
     */
    _renderFrameOverlay() {
      if (!this.isFrameVisible || !this.map || !this.frameBounds) return;
      this.frameLayerGroup.clearLayers();
      this.handleMarkers = [];

      const b = this.frameBounds;
      const nw = b.getNorthWest();
      const ne = b.getNorthEast();
      const se = b.getSouthEast();
      const sw = b.getSouthWest();

      // 1. Semi-transparent outer darkening mask
      const worldOuter = [
        [85, -180],
        [85, 180],
        [-85, 180],
        [-85, -180]
      ];
      const hole = [
        [nw.lat, nw.lng],
        [ne.lat, ne.lng],
        [se.lat, se.lng],
        [sw.lat, sw.lng]
      ];

      this.maskPolygon = L.polygon([worldOuter, hole], {
        color: '#000000',
        weight: 0,
        fillColor: '#020617',
        fillOpacity: 0.52,
        interactive: false
      }).addTo(this.frameLayerGroup);

      // 2. High-visibility neatline border rectangle
      this.frameRectangle = L.rectangle(b, {
        color: '#06b6d4',
        weight: 2.5,
        dashArray: '6, 6',
        fillColor: '#06b6d4',
        fillOpacity: 0.04,
        className: 'layout-frame-rect'
      }).addTo(this.frameLayerGroup);

      // Make inner area draggable for whole-frame panning
      this.frameRectangle.on('mousedown', (e) => {
        L.DomEvent.stopPropagation(e);
        this._startDragging('center', e.latlng);
      });

      // 3. Resize & Move Handles (8 Handles + Center Move)
      const positions = [
        { id: 'nw', latlng: nw, cursor: 'nwse-resize' },
        { id: 'n',  latlng: L.latLng(nw.lat, (nw.lng + ne.lng) / 2), cursor: 'ns-resize' },
        { id: 'ne', latlng: ne, cursor: 'nesw-resize' },
        { id: 'e',  latlng: L.latLng((ne.lat + se.lat) / 2, ne.lng), cursor: 'ew-resize' },
        { id: 'se', latlng: se, cursor: 'nwse-resize' },
        { id: 's',  latlng: L.latLng(sw.lat, (sw.lng + se.lng) / 2), cursor: 'ns-resize' },
        { id: 'sw', latlng: sw, cursor: 'nesw-resize' },
        { id: 'w',  latlng: L.latLng((nw.lat + sw.lat) / 2, nw.lng), cursor: 'ew-resize' }
      ];

      positions.forEach(pos => {
        const icon = L.divIcon({
          className: 'layout-frame-handle',
          html: `<div class="w-3.5 h-3.5 bg-cyan-400 border-2 border-slate-950 rounded-sm shadow-lg hover:scale-125 transition-transform" style="cursor: ${pos.cursor};"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker(pos.latlng, {
          icon: icon,
          draggable: false,
          interactive: true,
          zIndexOffset: 1200
        }).addTo(this.frameLayerGroup);

        marker.on('mousedown', (e) => {
          L.DomEvent.stopPropagation(e);
          this._startDragging(pos.id, e.latlng);
        });

        this.handleMarkers.push(marker);
      });

      // 4. Center Move Pin
      const centerPt = b.getCenter();
      const centerIcon = L.divIcon({
        className: 'layout-center-move-handle',
        html: `<div class="px-2 py-1 rounded-full bg-slate-900/90 border border-cyan-400 text-cyan-300 text-[10px] font-bold flex items-center gap-1 shadow-xl hover:bg-cyan-950 cursor-move">
          <i class="fa-solid fa-arrows-up-down-left-right text-xs"></i>
          <span>تحريك الإطار</span>
        </div>`,
        iconSize: [90, 24],
        iconAnchor: [45, 12]
      });

      const centerMarker = L.marker(centerPt, {
        icon: centerIcon,
        interactive: true,
        zIndexOffset: 1100
      }).addTo(this.frameLayerGroup);

      centerMarker.on('mousedown', (e) => {
        L.DomEvent.stopPropagation(e);
        this._startDragging('center', e.latlng);
      });

      // 5. Floating Info & Action Banner on Top of Frame
      const sheetInfo = SHEET_SIZES[this.selectedSheet];
      const scaleStr = this.getScaleString();
      const widthKm = (sw.distanceTo(se) / 1000).toFixed(2);
      const heightKm = (sw.distanceTo(nw) / 1000).toFixed(2);

      const bannerHtml = `
        <div class="layout-frame-banner bg-slate-900/95 backdrop-blur-md border border-cyan-500/80 rounded-2xl shadow-2xl p-2 text-slate-100 flex items-center gap-2 select-none" dir="rtl">
          <div class="flex items-center gap-1.5 pl-2 border-l border-slate-700">
            <span class="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-bold text-xs">
              ${sheetInfo.name}
            </span>
            <div class="text-[11px] leading-tight">
              <div class="font-bold text-cyan-300 flex items-center gap-1">
                <span>لوحة ${sheetInfo.name} (${this.orientation === 'landscape' ? 'أفقي' : 'عمودي'})</span>
              </div>
              <div class="text-[10px] text-slate-400 font-mono">
                المقياس: ${scaleStr} • ${widthKm} × ${heightKm} كم
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button type="button" onclick="window.AtlasLayoutStudio.openStudioModal()" class="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-colors cursor-pointer" title="فتح استوديو التصدير والطباعة">
              <i class="fa-solid fa-print"></i>
              <span>طباعة وتصدير</span>
            </button>

            <button type="button" onclick="window.AtlasLayoutStudio.toggleOrientation()" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors cursor-pointer" title="تبديل التوجيه (أفقي / عمودي)">
              <i class="fa-solid fa-arrows-rotate"></i>
            </button>

            <button type="button" onclick="window.AtlasLayoutStudio.toggleAspectRatioLock()" class="p-1.5 rounded-lg ${this.aspectRatioLocked ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50' : 'bg-slate-800 text-slate-400'} border text-xs transition-colors cursor-pointer" title="قفل / تحرير نسبة الأبعاد">
              <i class="fa-solid ${this.aspectRatioLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
            </button>

            <button type="button" onclick="window.AtlasLayoutStudio.fitFrameToCurrentView()" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors cursor-pointer" title="مطابقة نافذة العرض الحالية">
              <i class="fa-solid fa-expand"></i>
            </button>

            <button type="button" onclick="window.AtlasLayoutStudio.hideSelectionFrame()" class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-rose-400 hover:text-rose-200 border border-slate-700 text-xs transition-colors cursor-pointer" title="إخفاء إطار اللوحة">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `;

      const bannerIcon = L.divIcon({
        className: 'layout-frame-banner-icon',
        html: bannerHtml,
        iconSize: [360, 48],
        iconAnchor: [180, 56]
      });

      this.frameBannerMarker = L.marker(nw, {
        icon: bannerIcon,
        interactive: true,
        zIndexOffset: 1300
      }).addTo(this.frameLayerGroup);
    }

    /**
     * Start Dragging Handle or Center
     */
    _startDragging(handleId, latlng) {
      this.isDraggingFrame = true;
      this.activeHandle = handleId;
      this.dragStartLatLng = latlng;
      this.dragStartBounds = L.latLngBounds(this.frameBounds.getSouthWest(), this.frameBounds.getNorthEast());

      if (this.map.dragging) this.map.dragging.disable();
    }

    /**
     * Handle MouseMove for Frame Resizing and Panning
     */
    _handleMouseMove(e) {
      if (!this.isDraggingFrame || !this.dragStartBounds || !this.dragStartLatLng) return;

      const deltaLat = e.latlng.lat - this.dragStartLatLng.lat;
      const deltaLng = e.latlng.lng - this.dragStartLatLng.lng;
      const orig = this.dragStartBounds;

      let south = orig.getSouth();
      let north = orig.getNorth();
      let west = orig.getWest();
      let east = orig.getEast();

      if (this.activeHandle === 'center') {
        // Move entire box
        this.frameBounds = L.latLngBounds(
          [south + deltaLat, west + deltaLng],
          [north + deltaLat, east + deltaLng]
        );
      } else {
        // Handle resizing
        if (this.activeHandle.includes('n')) north += deltaLat;
        if (this.activeHandle.includes('s')) south += deltaLat;
        if (this.activeHandle.includes('e')) east += deltaLng;
        if (this.activeHandle.includes('w')) west += deltaLng;

        // Prevent inversion
        if (north <= south + 0.001) north = south + 0.001;
        if (east <= west + 0.001) east = west + 0.001;

        let newBounds = L.latLngBounds([south, west], [north, east]);

        if (this.aspectRatioLocked) {
          const targetRatio = this.getMapFrameAspectRatio();
          const latCos = Math.cos(((north + south) / 2) * Math.PI / 180);
          const currentLatSpan = north - south;
          const desiredLngSpan = (currentLatSpan * targetRatio) / latCos;

          if (this.activeHandle.includes('e')) {
            east = west + desiredLngSpan;
          } else if (this.activeHandle.includes('w')) {
            west = east - desiredLngSpan;
          } else if (this.activeHandle.includes('n') || this.activeHandle.includes('s')) {
            const centerLng = (west + east) / 2;
            west = centerLng - desiredLngSpan / 2;
            east = centerLng + desiredLngSpan / 2;
          }
          newBounds = L.latLngBounds([south, west], [north, east]);
        }

        this.frameBounds = newBounds;
      }

      this._renderFrameOverlay();
    }

    /**
     * Stop Dragging
     */
    _stopDragging() {
      if (this.isDraggingFrame) {
        this.isDraggingFrame = false;
        this.activeHandle = null;
        this.dragStartLatLng = null;
        this.dragStartBounds = null;
        if (this.map && this.map.dragging) this.map.dragging.enable();
      }
    }

    /**
     * Wire up Map Event Listeners
     */
    _initEventListeners() {
      if (!this.map) return;
      this.map.on('mousemove', (e) => this._handleMouseMove(e));
      this.map.on('mouseup', () => this._stopDragging());

      window.addEventListener('mouseup', () => this._stopDragging());

      // If zoom changes, re-render frame overlay
      this.map.on('zoomend', () => {
        if (this.isFrameVisible) {
          this._renderFrameOverlay();
        }
      });
    }

    /**
     * Toggle Orientation Shortcut
     */
    toggleOrientation() {
      this.setOrientation(this.orientation === 'landscape' ? 'portrait' : 'landscape');
    }

    // =========================================================================
    // High-Resolution Cartographic Canvas Rendering Pipeline
    // =========================================================================

    /**
     * Generate the complete layout sheet onto an HTML5 Canvas at target DPI
     */
    async renderLayoutCanvas(dpiChoice = 150) {
      if (!this.frameBounds) {
        this.fitFrameToCurrentView();
      }

      const sheet = SHEET_SIZES[this.selectedSheet] || SHEET_SIZES['a3'];
      let widthMm = sheet.widthMm;
      let heightMm = sheet.heightMm;

      if (this.orientation === 'landscape') {
        const temp = Math.max(widthMm, heightMm);
        heightMm = Math.min(widthMm, heightMm);
        widthMm = temp;
      } else {
        const temp = Math.min(widthMm, heightMm);
        heightMm = Math.max(widthMm, heightMm);
        widthMm = temp;
      }

      const dpi = dpiChoice || this.dpi || 150;
      const mmToPx = (dpi / 25.4);
      const totalWidthPx = Math.round(widthMm * mmToPx);
      const totalHeightPx = Math.round(heightMm * mmToPx);

      const canvas = document.createElement('canvas');
      canvas.width = totalWidthPx;
      canvas.height = totalHeightPx;
      const ctx = canvas.getContext('2d');

      // 1. Sheet Background (Crisp White Fine Paper)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalWidthPx, totalHeightPx);

      // 2. Cartographic Margins & Double Neatline Border
      const marginPx = Math.round(12 * mmToPx);
      const outerBorderPx = Math.round(2 * mmToPx);

      ctx.strokeStyle = '#0f172a'; // Deep slate
      ctx.lineWidth = Math.max(2, Math.round(0.8 * mmToPx));
      ctx.strokeRect(marginPx, marginPx, totalWidthPx - (marginPx * 2), totalHeightPx - (marginPx * 2));

      // Inner neatline
      const innerMarginPx = marginPx + outerBorderPx;
      ctx.lineWidth = Math.max(1, Math.round(0.3 * mmToPx));
      ctx.strokeRect(innerMarginPx, innerMarginPx, totalWidthPx - (innerMarginPx * 2), totalHeightPx - (innerMarginPx * 2));

      // 3. Layout Regions Calculation
      const contentX = innerMarginPx + Math.round(2 * mmToPx);
      const contentY = innerMarginPx + Math.round(2 * mmToPx);
      const contentW = totalWidthPx - (contentX * 2);
      const contentH = totalHeightPx - (contentY * 2);

      const headerHeightPx = Math.round(24 * mmToPx);
      const bottomPanelHeightPx = Math.round(38 * mmToPx);

      const mapX = contentX;
      const mapY = contentY + headerHeightPx;
      const mapW = contentW;
      const mapH = contentH - headerHeightPx - bottomPanelHeightPx;

      // 4. Draw Official Header Bar
      this._drawLayoutHeader(ctx, contentX, contentY, contentW, headerHeightPx, mmToPx);

      // 5. Draw Main Map Frame (Satellite/Basemap + Calibrated Overlay + Vector CAD Drawings)
      await this._drawMapFrameContent(ctx, mapX, mapY, mapW, mapH, mmToPx);

      // 6. Draw Graticule Coordinate Ticks on Map Frame Corners
      if (this.options.showCoordinates) {
        this._drawGraticuleTicks(ctx, mapX, mapY, mapW, mapH, mmToPx);
      }

      // 7. Draw Bottom Accessories Panel (Scale, North Arrow, Legend, Certified Cartouche)
      this._drawBottomAccessoriesPanel(ctx, contentX, mapY + mapH, contentW, bottomPanelHeightPx, mmToPx);

      this.cachedCanvas = canvas;
      return canvas;
    }

    /**
     * Draw Official Header Bar
     */
    _drawLayoutHeader(ctx, x, y, w, h, mmToPx) {
      // Header background container
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(1, Math.round(0.25 * mmToPx));
      ctx.strokeRect(x, y, w, h);

      // National emblem / Logo placeholder circle
      const logoRadius = Math.round(8 * mmToPx);
      const logoCenterX = x + w - logoRadius - Math.round(4 * mmToPx);
      const logoCenterY = y + (h / 2);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(logoCenterX, logoCenterY, logoRadius, 0, Math.PI * 2);
      ctx.fill();

      // Golden eagle / star icon representation
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.round(7 * mmToPx)}px "Font Awesome 6 Free", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GIS', logoCenterX, logoCenterY);

      // Text Titles
      const textRight = logoCenterX - logoRadius - Math.round(4 * mmToPx);

      // Primary Title
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.round(6.2 * mmToPx)}px system-ui, -apple-system, "Segoe UI", Roboto, "Cairo", sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(this.options.title, textRight, y + Math.round(3.5 * mmToPx));

      // Subtitle & Project
      ctx.fillStyle = '#475569';
      ctx.font = `500 ${Math.round(3.4 * mmToPx)}px system-ui, -apple-system, "Segoe UI", Roboto, "Cairo", sans-serif`;
      ctx.fillText(`${this.options.subtitle} • ${this.options.locationName}`, textRight, y + Math.round(13 * mmToPx));

      // Left Metadata Block
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.round(4.2 * mmToPx)}px "Courier New", monospace`;
      ctx.fillText(`SHEET: ${this.options.sheetNumber}`, x + Math.round(4 * mmToPx), y + Math.round(4 * mmToPx));

      ctx.fillStyle = '#64748b';
      ctx.font = `400 ${Math.round(3 * mmToPx)}px system-ui, sans-serif`;
      ctx.fillText(`PROJECTION: ${this.options.crs}`, x + Math.round(4 * mmToPx), y + Math.round(11 * mmToPx));
      ctx.fillText(`DATE: ${new Date().toLocaleDateString('ar-IQ')} / ${new Date().toISOString().slice(0, 10)}`, x + Math.round(4 * mmToPx), y + Math.round(16 * mmToPx));
    }

    /**
     * Draw Map Frame Content (ArcGIS World Imagery + Overlays + Drawings)
     */
    async _drawMapFrameContent(ctx, x, y, w, h, mmToPx) {
      // 1. Background Fill & Clip to Map Frame
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, w, h);

      const b = this.frameBounds;

      // 2. Fetch and Draw High-Resolution Satellite Map Image from ArcGIS Living Atlas
      // We request in Web Mercator (3857) so the returned image is in the same
      // projection used by _latLngToCanvas → perfect pixel alignment with drawn features.
      const reqW = Math.min(1600, Math.max(400, Math.round(w)));
      const reqH = Math.min(1200, Math.max(300, Math.round(h)));

      // Convert frame bounds from geographic to Web Mercator (EPSG:3857)
      const EARTH_RADIUS = 6378137;
      const mercXmin = b.getWest()  * Math.PI / 180 * EARTH_RADIUS;
      const mercXmax = b.getEast()  * Math.PI / 180 * EARTH_RADIUS;
      const mercYmin = Math.log(Math.tan(Math.PI / 4 + b.getSouth() * Math.PI / 360)) * EARTH_RADIUS;
      const mercYmax = Math.log(Math.tan(Math.PI / 4 + b.getNorth() * Math.PI / 360)) * EARTH_RADIUS;

      const bboxStr = `${mercXmin.toFixed(2)},${mercYmin.toFixed(2)},${mercXmax.toFixed(2)},${mercYmax.toFixed(2)}`;
      const exportUrl = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bboxStr}&bboxSR=3857&imageSR=3857&size=${reqW},${reqH}&f=image`;

      let satImgLoaded = false;
      if (this._cachedSatImg && this._cachedSatBbox === bboxStr) {
        try {
          ctx.drawImage(this._cachedSatImg, x, y, w, h);
          satImgLoaded = true;
        } catch (e) {
          this._cachedSatImg = null;
        }
      }

      if (!satImgLoaded) {
        try {
          const satImg = await this._loadImageWithTimeout(exportUrl, 8000);
          ctx.drawImage(satImg, x, y, w, h);
          this._cachedSatImg = satImg;
          this._cachedSatBbox = bboxStr;
          satImgLoaded = true;
        } catch (err) {
          console.warn('AtlasLayoutStudio: ArcGIS satellite imagery offline or timeout, using cartographic grid fallback:', err);
          this._drawFallbackCartographicGrid(ctx, x, y, w, h, b, mmToPx);
        }
      }


      // 3. Draw Rectified/Calibrated Overlay if active and visible
      if (window.calibOverlayInstance && window.isCalibOverlayVisible && window.isCalibOverlayVisible()) {
        await this._drawCalibratedOverlayOnCanvas(ctx, x, y, w, h, b);
      }

      // 4. Draw User Vector Drawings (Streets, Blocks, Buildings, Lines, Points, Labels)
      this._drawDrawnVectorFeatures(ctx, x, y, w, h, b, mmToPx);

      // 5. Draw Archaeological & Historical Sites if visible
      if (window.IRAQ_ARCHAEOLOGY_DATA && window.IRAQ_ARCHAEOLOGY_DATA.sites) {
        this._drawArchaeologicalSites(ctx, x, y, w, h, b, mmToPx);
      }

      // 6. Draw Grid Graticule Lines inside the map
      if (this.options.showGrid) {
        this._drawMapGridLines(ctx, x, y, w, h, b, mmToPx);
      }

      ctx.restore();

      // Outer border around map frame
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(1.5, Math.round(0.5 * mmToPx));
      ctx.strokeRect(x, y, w, h);
    }

    /**
     * Fallback high-contrast cartographic grid when satellite service is slow or offline
     */
    _drawFallbackCartographicGrid(ctx, x, y, w, h, b, mmToPx) {
      ctx.save();
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#0b1329');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      // Fine Cartographic Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      const stepX = w / 6;
      const stepY = h / 4;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * stepX, y);
        ctx.lineTo(x + i * stepX, y + h);
        ctx.stroke();
      }
      for (let j = 1; j < 4; j++) {
        ctx.beginPath();
        ctx.moveTo(x, y + j * stepY);
        ctx.lineTo(x + w, y + j * stepY);
        ctx.stroke();
      }

      // Compass Rose watermark in center
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * 0.22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = `bold ${Math.round(3.4 * mmToPx)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('أطلس العراق • شبكة الإحداثيات الجغرافية (WGS84)', cx, cy);
      ctx.restore();
    }

    /**
     * Draw Calibrated Overlay onto Map Canvas
     */
    async _drawCalibratedOverlayOnCanvas(ctx, mapX, mapY, mapW, mapH, frameBounds) {
      const overlay = window.calibOverlayInstance;
      if (!overlay || !overlay._url) return;

      try {
        const overlayBounds = overlay.getBounds ? overlay.getBounds() : null;
        if (!overlayBounds || !frameBounds.intersects(overlayBounds)) return;

        const img = await this._loadImageWithTimeout(overlay._url, 5000);
        const nw = overlayBounds.getNorthWest();
        const se = overlayBounds.getSouthEast();

        const p1 = this._latLngToCanvas(nw.lat, nw.lng, frameBounds, mapX, mapY, mapW, mapH);
        const p2 = this._latLngToCanvas(se.lat, se.lng, frameBounds, mapX, mapY, mapW, mapH);

        const drawX = Math.min(p1.x, p2.x);
        const drawY = Math.min(p1.y, p2.y);
        const drawW = Math.abs(p2.x - p1.x);
        const drawH = Math.abs(p2.y - p1.y);

        ctx.save();
        ctx.globalAlpha = overlay.options && typeof overlay.options.opacity === 'number' ? overlay.options.opacity : 0.88;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
      } catch (e) {
        console.warn('AtlasLayoutStudio: Failed to draw calibrated overlay onto layout:', e);
      }
    }

    /**
     * Convert latitude in degrees to Web Mercator Y (same formula Leaflet/ArcGIS use)
     * This is critical: the satellite basemap image is fetched in EPSG:4326 bbox but
     * rendered by ArcGIS in Web Mercator projection internally, so drawn feature
     * coordinates MUST be projected through the same Mercator formula to align correctly.
     */
    _latToMercatorY(lat) {
      const latRad = lat * Math.PI / 180;
      return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    }

    /**
     * Project Lat/Lng to Canvas Pixels inside Map Window using Web Mercator projection.
     * Matches Leaflet + ArcGIS World Imagery rendering exactly, preventing feature offset.
     */
    _latLngToCanvas(lat, lng, b, mapX, mapY, mapW, mapH) {
      const west  = b.getWest();
      const east  = b.getEast();
      const north = b.getNorth();
      const south = b.getSouth();

      // Longitude: linear in both geographic and Mercator — no correction needed
      const x = mapX + ((lng - west) / (east - west)) * mapW;

      // Latitude: must use Mercator Y to match the basemap image projection
      const mercN = this._latToMercatorY(north);
      const mercS = this._latToMercatorY(south);
      const mercP = this._latToMercatorY(lat);

      // Clamp to avoid NaN at exactly ±90°
      const mercRange = mercN - mercS;
      const y = mercRange > 0
        ? mapY + ((mercN - mercP) / mercRange) * mapH
        : mapY + ((north - lat) / (north - south || 1)) * mapH;

      return { x, y };
    }

    /**
     * Draw Vector Drawings on Canvas (Streets, Blocks, Buildings, Lines, Points, Labels)
     */
    _drawDrawnVectorFeatures(ctx, mapX, mapY, mapW, mapH, b, mmToPx) {
      const engine = window.AtlasDrawingEngine;
      if (!engine || !engine.features || engine.features.length === 0 || !engine.isLayerVisible) return;

      engine.features.forEach(f => {
        if (!f) return;
        const type = f.type;
        const color = (f.properties && f.properties.color) || f.color || '#f59e0b';

        ctx.save();

        if (type === 'street' || type === 'line') {
          // Polylines
          const rawPts = f.points || (Array.isArray(f.geometry) ? f.geometry : []);
          const pts = rawPts.map(coord => this._latLngToCanvas(coord.lat, coord.lng, b, mapX, mapY, mapW, mapH));
          if (pts.length < 2) {
            ctx.restore();
            return;
          }

          // Casing / Outline
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = Math.max(3, Math.round((type === 'street' ? 2.5 : 1.5) * mmToPx));
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Main Colored Stroke
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(2, Math.round((type === 'street' ? 1.8 : 1.0) * mmToPx));
          ctx.stroke();

        } else if (type === 'block' || type === 'building') {
          // Polygons
          const rawPts = f.points || (Array.isArray(f.geometry) ? f.geometry : []);
          const pts = rawPts.map(coord => this._latLngToCanvas(coord.lat, coord.lng, b, mapX, mapY, mapW, mapH));
          if (pts.length < 3) {
            ctx.restore();
            return;
          }

          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();

          // Fill
          ctx.fillStyle = type === 'building' ? 'rgba(16, 185, 129, 0.45)' : 'rgba(59, 130, 246, 0.35)';
          ctx.fill();

          // Stroke
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1.5, Math.round(0.8 * mmToPx));
          ctx.stroke();

          // Label Centered inside Polygon
          const lbl = (f.properties && (f.properties.label || f.properties.name)) || f.name;
          if (lbl) {
            let cx = 0, cy = 0;
            pts.forEach(p => { cx += p.x; cy += p.y; });
            cx /= pts.length;
            cy /= pts.length;

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(2.6 * mmToPx)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.85)';
            ctx.shadowBlur = 4;
            ctx.fillText(lbl, cx, cy);
            ctx.shadowBlur = 0;
          }

        } else if (type === 'point') {
          // Point Marker
          const ptCoord = (f.points && f.points[0]) || (f.geometry && f.geometry.lat ? f.geometry : null) || (f.layer && f.layer.getLatLng && f.layer.getLatLng());
          if (!ptCoord) {
            ctx.restore();
            return;
          }
          const pt = this._latLngToCanvas(ptCoord.lat, ptCoord.lng, b, mapX, mapY, mapW, mapH);
          const r = Math.max(4, Math.round(1.8 * mmToPx));

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, Math.round(0.4 * mmToPx));
          ctx.stroke();

          const lbl = (f.properties && (f.properties.label || f.properties.name)) || f.name;
          if (lbl) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(2.4 * mmToPx)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.fillText(lbl, pt.x, pt.y - r - 2);
            ctx.shadowBlur = 0;
          }

        } else if (type === 'label') {
          // Text Label
          const ptCoord = (f.points && f.points[0]) || (f.geometry && f.geometry.lat ? f.geometry : null) || (f.layer && f.layer.getLatLng && f.layer.getLatLng());
          if (!ptCoord) {
            ctx.restore();
            return;
          }
          const pt = this._latLngToCanvas(ptCoord.lat, ptCoord.lng, b, mapX, mapY, mapW, mapH);
          const txt = (f.properties && (f.properties.text || f.properties.label)) || f.name || 'نص';

          ctx.font = `bold ${Math.round(3.0 * mmToPx)}px system-ui, sans-serif`;
          const textMetrics = ctx.measureText(txt);
          const pad = Math.round(1.2 * mmToPx);

          // Background Badge
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(pt.x - textMetrics.width / 2 - pad, pt.y - pad * 2, textMetrics.width + pad * 2, Math.round(4 * mmToPx));
          ctx.strokeStyle = color || '#38bdf8';
          ctx.lineWidth = 1;
          ctx.strokeRect(pt.x - textMetrics.width / 2 - pad, pt.y - pad * 2, textMetrics.width + pad * 2, Math.round(4 * mmToPx));

          ctx.fillStyle = color || '#38bdf8';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(txt, pt.x, pt.y);
        }

        ctx.restore();
      });
    }

    /**
     * Draw Archaeological Sites within frame bounds
     */
    _drawArchaeologicalSites(ctx, mapX, mapY, mapW, mapH, b, mmToPx) {
      const sites = window.IRAQ_ARCHAEOLOGY_DATA.sites;
      sites.forEach(site => {
        if (!b.contains([site.lat, site.lng])) return;
        const pt = this._latLngToCanvas(site.lat, site.lng, b, mapX, mapY, mapW, mapH);

        ctx.save();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.round(1.5 * mmToPx), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = `600 ${Math.round(2.2 * mmToPx)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 3;
        ctx.fillText(site.name_ar, pt.x, pt.y - 4);
        ctx.restore();
      });
    }

    /**
     * Draw Grid Lines inside the map frame
     */
    _drawMapGridLines(ctx, mapX, mapY, mapW, mapH, b, mmToPx) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const steps = 4;
      for (let i = 1; i < steps; i++) {
        // Vertical grid line
        const gx = mapX + (mapW / steps) * i;
        ctx.beginPath();
        ctx.moveTo(gx, mapY);
        ctx.lineTo(gx, mapY + mapH);
        ctx.stroke();

        // Horizontal grid line
        const gy = mapY + (mapH / steps) * i;
        ctx.beginPath();
        ctx.moveTo(mapX, gy);
        ctx.lineTo(mapX + mapW, gy);
        ctx.stroke();
      }
      ctx.restore();
    }

    /**
     * Draw Graticule Coordinate Ticks on Map Frame Corners
     */
    _drawGraticuleTicks(ctx, x, y, w, h, mmToPx) {
      const b = this.frameBounds;
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.round(2.4 * mmToPx)}px "Courier New", monospace`;

      const nwDms = this._toDms(b.getNorth(), b.getWest());
      const neDms = this._toDms(b.getNorth(), b.getEast());
      const swDms = this._toDms(b.getSouth(), b.getWest());
      const seDms = this._toDms(b.getSouth(), b.getEast());

      // NW Corner
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(nwDms, x + 2, y - 2);

      // NE Corner
      ctx.textAlign = 'right';
      ctx.fillText(neDms, x + w - 2, y - 2);

      // SW Corner
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(swDms, x + 2, y + h + 2);

      // SE Corner
      ctx.textAlign = 'right';
      ctx.fillText(seDms, x + w - 2, y + h + 2);

      ctx.restore();
    }

    /**
     * Convert decimal degrees to DMS string
     */
    _toDms(lat, lng) {
      const latD = Math.floor(Math.abs(lat));
      const latM = Math.floor((Math.abs(lat) - latD) * 60);
      const latS = Math.round(((Math.abs(lat) - latD) * 60 - latM) * 60);
      const latDir = lat >= 0 ? 'N' : 'S';

      const lngD = Math.floor(Math.abs(lng));
      const lngM = Math.floor((Math.abs(lng) - lngD) * 60);
      const lngS = Math.round(((Math.abs(lng) - lngD) * 60 - lngM) * 60);
      const lngDir = lng >= 0 ? 'E' : 'W';

      return `${latD}°${latM}'${latS}"${latDir}  ${lngD}°${lngM}'${lngS}"${lngDir}`;
    }

    /**
     * Draw Bottom Accessories Panel (Scale Bar, North Arrow, Legend, Certified Engineer Cartouche)
     */
    _drawBottomAccessoriesPanel(ctx, x, y, w, h, mmToPx) {
      // 1. Background box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(1, Math.round(0.25 * mmToPx));
      ctx.strokeRect(x, y, w, h);

      // Divide into 3 sections:
      // Left (30%): Graphic Scale Bar & North Arrow
      // Center (35%): Symbology Legend (مفتاح الخارطة)
      // Right (35%): Official Certified Engineering Cartouche (الخرطوشة الهندسية)
      const col1W = Math.round(w * 0.30);
      const col2W = Math.round(w * 0.35);
      const col3W = w - col1W - col2W;

      const col1X = x;
      const col2X = col1X + col1W;
      const col3X = col2X + col2W;

      // Dividers
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(col2X, y);
      ctx.lineTo(col2X, y + h);
      ctx.moveTo(col3X, y);
      ctx.lineTo(col3X, y + h);
      ctx.stroke();

      // Section 1: North Arrow & Scale Bar
      if (this.options.showNorthArrow !== false || this.options.showScaleBar !== false) {
        this._drawNorthAndScaleSection(ctx, col1X, y, col1W, h, mmToPx);
      }

      // Section 2: Legend
      if (this.options.showLegend !== false) {
        this._drawLegendSection(ctx, col2X, y, col2W, h, mmToPx);
      }

      // Section 3: Official Certified Cartouche
      if (this.options.showCartouche !== false) {
        this._drawCertifiedCartoucheSection(ctx, col3X, y, col3W, h, mmToPx);
      }
    }

    /**
     * Draw North Arrow and Metric Scale Bar
     */
    _drawNorthAndScaleSection(ctx, x, y, w, h, mmToPx) {
      const showNorth = this.options.showNorthArrow !== false;
      const showScale = this.options.showScaleBar !== false;

      // 1. North Arrow
      const northCenterX = x + Math.round(14 * mmToPx);
      const northCenterY = y + (h / 2);
      const northRadius = Math.round(11 * mmToPx);

      if (showNorth) {
        // Outer ring
        ctx.save();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = Math.max(1, Math.round(0.3 * mmToPx));
        ctx.beginPath();
        ctx.arc(northCenterX, northCenterY, northRadius, 0, Math.PI * 2);
        ctx.stroke();

        // North needle (Dark half)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(northCenterX, northCenterY - northRadius + 2);
        ctx.lineTo(northCenterX - Math.round(3.5 * mmToPx), northCenterY);
        ctx.lineTo(northCenterX, northCenterY);
        ctx.closePath();
        ctx.fill();

        // North needle (Light half)
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(northCenterX, northCenterY - northRadius + 2);
        ctx.lineTo(northCenterX + Math.round(3.5 * mmToPx), northCenterY);
        ctx.lineTo(northCenterX, northCenterY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // South needle
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(northCenterX, northCenterY + northRadius - 2);
        ctx.lineTo(northCenterX - Math.round(3.5 * mmToPx), northCenterY);
        ctx.lineTo(northCenterX, northCenterY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(northCenterX, northCenterY + northRadius - 2);
        ctx.lineTo(northCenterX + Math.round(3.5 * mmToPx), northCenterY);
        ctx.lineTo(northCenterX, northCenterY);
        ctx.closePath();
        ctx.fill();

        // 'N' Label
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(3.5 * mmToPx)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('N', northCenterX, northCenterY - northRadius - 1);

        ctx.restore();
      }

      // 2. Graphic Scale Bar
      if (showScale) {
        const scaleX = showNorth ? (northCenterX + northRadius + Math.round(6 * mmToPx)) : (x + Math.round(6 * mmToPx));
        const scaleY = y + Math.round(18 * mmToPx);
        const scaleBarWidth = w - (scaleX - x) - Math.round(8 * mmToPx);

        // Representative Scale Text
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(4.0 * mmToPx)}px "Courier New", monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`SCALE ${this.getScaleString()}`, scaleX, y + Math.round(5 * mmToPx));

        // Calculate real scale intervals
        const groundWidthM = this.frameBounds.getSouthWest().distanceTo(this.frameBounds.getSouthEast());
        const maxSegmentM = Math.round(groundWidthM * 0.25);

        // Alternating Black/White Scale Bar Segments
        const segments = 4;
        const segW = Math.max(10, scaleBarWidth / segments);
        const segH = Math.round(2.5 * mmToPx);

        for (let i = 0; i < segments; i++) {
          ctx.fillStyle = (i % 2 === 0) ? '#0f172a' : '#ffffff';
          ctx.fillRect(scaleX + (i * segW), scaleY, segW, segH);
          ctx.strokeStyle = '#0f172a';
          ctx.strokeRect(scaleX + (i * segW), scaleY, segW, segH);

          // Segment number ticks
          const segDist = Math.round((maxSegmentM / segments) * i);
          ctx.fillStyle = '#334155';
          ctx.font = `600 ${Math.round(2.2 * mmToPx)}px "Courier New", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(segDist.toString(), scaleX + (i * segW), scaleY - 2);
        }

        // End Tick
        ctx.fillText(`${maxSegmentM} m`, scaleX + (segments * segW), scaleY - 2);

        // Metric unit note
        ctx.fillStyle = '#64748b';
        ctx.font = `400 ${Math.round(2.2 * mmToPx)}px system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText('المقياس المتري (الأبعاد بالمتر)', scaleX, scaleY + segH + Math.round(2.5 * mmToPx));
      }
    }

    /**
     * Draw Symbology Legend (مفتاح المصطلحات والرموز)
     */
    _drawLegendSection(ctx, x, y, w, h, mmToPx) {
      ctx.save();
      // Section Header
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.round(3.6 * mmToPx)}px system-ui, "Cairo", sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('مفتاح الرموز والمصطلحات (LEGEND)', x + w - Math.round(6 * mmToPx), y + Math.round(4 * mmToPx));

      // Items list in 2 columns
      const items = [
        { label: 'شوارع وطرق شريانية', color: '#f59e0b', type: 'line' },
        { label: 'بلوكات سكنية وعقارية', color: '#3b82f6', type: 'poly' },
        { label: 'أبنية ومنشآت حضرية', color: '#10b981', type: 'poly' },
        { label: 'مسارات وشبكات خدمية', color: '#8b5cf6', type: 'line' },
        { label: 'معالم ومحطات ضبط', color: '#ef4444', type: 'point' },
        { label: 'مواقع تاريخية وأثرية', color: '#f59e0b', type: 'star' }
      ];

      const startY = y + Math.round(11 * mmToPx);
      const rowH = Math.round(8 * mmToPx);
      const colW = (w - Math.round(12 * mmToPx)) / 2;

      items.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const itemX = x + w - Math.round(6 * mmToPx) - (col * colW);
        const itemY = startY + (row * rowH);

        // Swatch icon
        const iconX = itemX - Math.round(2 * mmToPx);
        const iconY = itemY + Math.round(1.5 * mmToPx);

        if (item.type === 'poly') {
          ctx.fillStyle = item.color;
          ctx.globalAlpha = 0.55;
          ctx.fillRect(iconX - Math.round(4 * mmToPx), iconY - Math.round(1.5 * mmToPx), Math.round(4 * mmToPx), Math.round(3 * mmToPx));
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = item.color;
          ctx.strokeRect(iconX - Math.round(4 * mmToPx), iconY - Math.round(1.5 * mmToPx), Math.round(4 * mmToPx), Math.round(3 * mmToPx));
        } else if (item.type === 'line') {
          ctx.strokeStyle = item.color;
          ctx.lineWidth = Math.max(2, Math.round(0.8 * mmToPx));
          ctx.beginPath();
          ctx.moveTo(iconX - Math.round(5 * mmToPx), iconY);
          ctx.lineTo(iconX, iconY);
          ctx.stroke();
        } else if (item.type === 'point' || item.type === 'star') {
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.arc(iconX - Math.round(2.5 * mmToPx), iconY, Math.round(1.4 * mmToPx), 0, Math.PI * 2);
          ctx.fill();
        }

        // Label
        ctx.fillStyle = '#334155';
        ctx.font = `500 ${Math.round(2.5 * mmToPx)}px system-ui, "Cairo", sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, iconX - Math.round(6 * mmToPx), iconY);
      });

      ctx.restore();
    }

    /**
     * Draw Official Certified Engineer Metadata Cartouche (الخرطوشة الهندسية المعتمدة)
     */
    _drawCertifiedCartoucheSection(ctx, x, y, w, h, mmToPx) {
      ctx.save();

      // Inner Engineering Border
      const pad = Math.round(3 * mmToPx);
      const bx = x + pad;
      const by = y + pad;
      const bw = w - (pad * 2);
      const bh = h - (pad * 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(1, Math.round(0.4 * mmToPx));
      ctx.strokeRect(bx, by, bw, bh);

      // Row 1: Prominent Certified Attribution
      const r1H = Math.round(11 * mmToPx);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(bx, by, bw, r1H);
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(bx, by + r1H);
      ctx.lineTo(bx + bw, by + r1H);
      ctx.stroke();

      // The exact requested attribution in bold gold/dark
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.round(3.8 * mmToPx)}px system-ui, "Cairo", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.options.engineerAttribution, bx + (bw / 2), by + (r1H / 2));

      // Row 2 & 3: Project and Reference Parameters
      const metaY = by + r1H + Math.round(3 * mmToPx);
      ctx.fillStyle = '#334155';
      ctx.font = `500 ${Math.round(2.5 * mmToPx)}px system-ui, "Cairo", sans-serif`;
      ctx.textAlign = 'right';

      ctx.fillText('منظومة ArcGIS Living Atlas Iraq • الرقمنة والمسح الهندسي', bx + bw - Math.round(4 * mmToPx), metaY);
      ctx.fillText(`المرجع الجيوديسي: ${this.options.crs}`, bx + bw - Math.round(4 * mmToPx), metaY + Math.round(5 * mmToPx));
      ctx.fillText(`حجم اللوحة: ${SHEET_SIZES[this.selectedSheet].name} (${this.orientation === 'landscape' ? 'أفقي' : 'عمودي'}) • المقياس: ${this.getScaleString()}`, bx + bw - Math.round(4 * mmToPx), metaY + Math.round(10 * mmToPx));

      // Left Stamp / Approval Box
      const stampW = Math.round(20 * mmToPx);
      const stampH = Math.round(14 * mmToPx);
      const stampX = bx + Math.round(3 * mmToPx);
      const stampY = by + r1H + Math.round(2 * mmToPx);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      ctx.strokeRect(stampX, stampY, stampW, stampH);

      ctx.fillStyle = '#0284c7';
      ctx.font = `bold ${Math.round(2.2 * mmToPx)}px "Cairo", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('معتمد هندسياً', stampX + (stampW / 2), stampY + Math.round(4 * mmToPx));
      ctx.font = `400 ${Math.round(2.0 * mmToPx)}px monospace`;
      ctx.fillText('VERIFIED', stampX + (stampW / 2), stampY + Math.round(8 * mmToPx));
      ctx.fillText('2026', stampX + (stampW / 2), stampY + Math.round(12 * mmToPx));

      ctx.restore();
    }

    /**
     * Image loader helper with timeout
     */
    _loadImageWithTimeout(url, timeoutMs = 7000) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          reject(new Error(`Timeout loading image after ${timeoutMs}ms`));
        }, timeoutMs);

        img.onload = () => {
          if (!timedOut) {
            clearTimeout(timer);
            resolve(img);
          }
        };

        img.onerror = (e) => {
          if (!timedOut) {
            clearTimeout(timer);
            reject(new Error(`Failed to load image from URL: ${url}`));
          }
        };

        img.src = url;
      });
    }

    // =========================================================================
    // Direct PDF & Print Export Actions
    // =========================================================================

    /**
     * Export Direct to PDF (via jsPDF)
     */
    async exportPdf() {
      this._showToast('جاري توليد ملف PDF فائق الدقة للوحة الخارطة...', 'info');

      try {
        const canvas = await this.renderLayoutCanvas(this.dpi || 150);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.94);

        const sheet = SHEET_SIZES[this.selectedSheet] || SHEET_SIZES['a3'];
        let wMm = sheet.widthMm;
        let hMm = sheet.heightMm;

        if (this.orientation === 'landscape') {
          const temp = Math.max(wMm, hMm);
          hMm = Math.min(wMm, hMm);
          wMm = temp;
        } else {
          const temp = Math.min(wMm, hMm);
          hMm = Math.max(wMm, hMm);
          wMm = temp;
        }

        // Check jsPDF availability
        if (window.jspdf && window.jspdf.jsPDF) {
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({
            orientation: this.orientation,
            unit: 'mm',
            format: [wMm, hMm]
          });

          pdf.addImage(dataUrl, 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');

          const filename = `Iraq_Map_Layout_${sheet.name}_${this.orientation}_${Date.now()}.pdf`;
          pdf.save(filename);
          this._showToast(`✅ تم تصدير وحفظ اللوحة بنجاح: ${filename}`, 'success');
        } else {
          // If jsPDF is not loaded, fallback smoothly to direct print / download
          console.warn('AtlasLayoutStudio: jsPDF not detected, triggering direct high-res print.');
          this.printLayout();
        }
      } catch (err) {
        console.error('AtlasLayoutStudio: exportPdf error:', err);
        this._showToast('حدث خطأ أثناء تصدير PDF، يمكنك استخدام خيار الطباعة المباشرة', 'error');
      }
    }

    /**
     * Print Layout Directly to Printer / Large Format Plotter (A0, A1, A2, A3, A4)
     */
    async printLayout() {
      this._showToast('جاري تحضير اللوحة للإرسال إلى الطابعة / الراسمة (Plotter)...', 'info');

      try {
        const canvas = await this.renderLayoutCanvas(this.dpi || 150);
        const dataUrl = canvas.toDataURL('image/png');

        const sheet = SHEET_SIZES[this.selectedSheet] || SHEET_SIZES['a3'];
        let printContainer = document.getElementById('cartographicPrintContainer');
        if (!printContainer) {
          printContainer = document.createElement('div');
          printContainer.id = 'cartographicPrintContainer';
          document.body.appendChild(printContainer);
        }

        printContainer.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: contain; display: block;" alt="Map Layout">`;

        // Inject Dynamic @page style for the exact paper size and orientation
        let styleTag = document.getElementById('cartographicPrintStyleTag');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'cartographicPrintStyleTag';
          document.head.appendChild(styleTag);
        }

        styleTag.innerHTML = `
          @page {
            size: ${sheet.name} ${this.orientation};
            margin: 0;
          }
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            body > *:not(#cartographicPrintContainer) {
              display: none !important;
            }
            #cartographicPrintContainer {
              display: block !important;
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              z-index: 999999 !important;
            }
          }
        `;

        // Trigger native print dialog
        setTimeout(() => {
          window.print();
        }, 300);

      } catch (err) {
        console.error('AtlasLayoutStudio: printLayout error:', err);
        this._showToast('حدث خطأ أثناء إعداد الطباعة المباشرة', 'error');
      }
    }

    /**
     * Export High-Resolution PNG Graphic
     */
    async exportPng() {
      this._showToast('جاري تصدير صورة اللوحة فائقة الدقة (PNG)...', 'info');
      try {
        const canvas = await this.renderLayoutCanvas(this.dpi || 150);
        const link = document.createElement('a');
        const filename = `Iraq_Map_Layout_${this.selectedSheet.toUpperCase()}_${Date.now()}.png`;
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this._showToast(`تم تنزيل اللوحة بصيغة PNG: ${filename}`, 'success');
      } catch (err) {
        console.error('AtlasLayoutStudio: exportPng error:', err);
        this._showToast('حدث خطأ أثناء تنزيل الصورة', 'error');
      }
    }

    // =========================================================================
    // UI Modal Management
    // =========================================================================

    /**
     * Open Layout Studio Dialog Modal
     */
    async openStudioModal() {
      const modal = document.getElementById('mapLayoutStudioModal');
      if (!modal) return;

      modal.classList.remove('hidden');

      if (!this.frameBounds) {
        this.fitFrameToCurrentView();
      }

      this.updateStudioModalUi();
      await this.refreshStudioPreview();
    }

    /**
     * Close Layout Studio Dialog Modal
     */
    closeStudioModal() {
      const modal = document.getElementById('mapLayoutStudioModal');
      if (modal) {
        modal.classList.add('hidden');
      }
    }

    /**
     * Update UI selections inside Modal
     */
    updateStudioModalUi() {
      // Sheet buttons
      document.querySelectorAll('.layout-sheet-btn').forEach(btn => {
        const sheet = btn.dataset.sheet;
        const icon = btn.querySelector('i:last-child');
        if (sheet === this.selectedSheet) {
          btn.className = 'layout-sheet-btn px-3 py-2 rounded-xl text-xs font-bold text-cyan-200 bg-cyan-950/80 border border-cyan-500 shadow-md flex items-center justify-between cursor-pointer';
          if (icon) {
            icon.className = 'fa-solid fa-check text-[11px] text-cyan-400';
          }
        } else {
          btn.className = 'layout-sheet-btn px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-all flex items-center justify-between cursor-pointer';
          if (icon) {
            icon.className = 'fa-solid fa-chevron-left text-[10px] text-slate-500';
          }
        }
      });

      // Orientation radio buttons
      const landBtn = document.getElementById('layoutOrientLandscapeBtn');
      const portBtn = document.getElementById('layoutOrientPortraitBtn');
      if (landBtn && portBtn) {
        if (this.orientation === 'landscape') {
          landBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white shadow cursor-pointer transition-all flex items-center justify-center gap-1.5';
          portBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 cursor-pointer transition-all flex items-center justify-center gap-1.5';
        } else {
          portBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white shadow cursor-pointer transition-all flex items-center justify-center gap-1.5';
          landBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 cursor-pointer transition-all flex items-center justify-center gap-1.5';
        }
      }

      // DPI buttons
      const btn150 = document.getElementById('layoutDpi150Btn');
      const btn300 = document.getElementById('layoutDpi300Btn');
      if (btn150 && btn300) {
        if (this.dpi === 300) {
          btn300.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white border border-cyan-500/40 cursor-pointer shadow-sm';
          btn150.className = 'flex-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer';
        } else {
          btn150.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white border border-cyan-500/40 cursor-pointer shadow-sm';
          btn300.className = 'flex-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer';
        }
      }

      // Title inputs
      const titleInput = document.getElementById('layoutTitleInput');
      if (titleInput && !titleInput.dataset.dirty) {
        titleInput.value = this.options.title;
      }

      const subInput = document.getElementById('layoutSubtitleInput');
      if (subInput && !subInput.dataset.dirty) {
        subInput.value = this.options.subtitle;
      }

      // Scale readout badge
      const scaleBadge = document.getElementById('layoutScalePreviewBadge');
      if (scaleBadge) {
        scaleBadge.textContent = this.getScaleString();
      }

      const sheetBadge = document.getElementById('layoutSheetNameBadge');
      if (sheetBadge) {
        const sInfo = SHEET_SIZES[this.selectedSheet] || SHEET_SIZES['a3'];
        sheetBadge.textContent = `${sInfo.name} (${this.orientation === 'landscape' ? 'أفقي' : 'عمودي'})`;
      }
    }

    /**
     * Refresh Modal Live Preview
     */
    async refreshStudioPreview() {
      const previewContainer = document.getElementById('layoutStudioPreviewCanvasContainer');
      const loader = document.getElementById('layoutPreviewLoader');
      if (!previewContainer) return;

      if (loader) loader.classList.remove('hidden');

      try {
        const canvas = await this.renderLayoutCanvas(100); // 100 DPI for ultra-fast live preview
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';
        canvas.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
        canvas.style.border = '1px solid #334155';
        canvas.style.borderRadius = '4px';

        previewContainer.innerHTML = '';
        previewContainer.appendChild(canvas);
      } catch (e) {
        console.warn('AtlasLayoutStudio: Preview refresh error:', e);
      } finally {
        if (loader) loader.classList.add('hidden');
      }
    }

    /**
     * Toast notification helper
     */
    _showToast(msg, type = 'info') {
      if (typeof window.showToast === 'function') {
        window.showToast(msg, type);
      } else {
        console.log(`[${type}] ${msg}`);
      }
    }
  }

  // Instantiate and expose globally
  window.AtlasLayoutStudio = new LayoutStudioEngine();

  // Auto-init when map is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (window.map || window.atlasMap) {
      window.AtlasLayoutStudio.init(window.map || window.atlasMap);
    }
  });

  // Global convenient helpers
  window.openMapLayoutStudio = function () {
    window.AtlasLayoutStudio.openStudioModal();
  };

  window.toggleMapLayoutSelectionFrame = function () {
    window.AtlasLayoutStudio.toggleSelectionFrame();
  };

  window.printMapLayout = function () {
    window.AtlasLayoutStudio.printLayout();
  };

  window.exportMapLayoutPdf = function () {
    window.AtlasLayoutStudio.exportPdf();
  };

  window.exportMapLayoutPng = function () {
    window.AtlasLayoutStudio.exportPng();
  };

})();
