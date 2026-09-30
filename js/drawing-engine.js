/**
 * ============================================================================
 * ArcGIS Living Atlas - Specialized GIS Drawing & Urban Digitization Engine
 * محرك الرسم والتخطيط العمراني والمسح العقاري الجيوديسي
 * Author: Dr. Eng. Ahmed Louay Al-Bajari (تصميم وتطوير الدكتور المهندس احمد لؤي البجاري)
 * ============================================================================
 */

(function (window) {
  'use strict';

  // Constants & Measurements
  const IRAQI_DUNAM_SQM = 2500; // 1 دونم عراقي = 2500 متر مربع
  const HECTARE_SQM = 10000;    // 1 هكتار = 10,000 متر مربع
  const STORAGE_KEY = 'ATLAS_URBAN_DRAWING_FEATURES_V3';

  // Automatically purge legacy test drawings so default main page opens completely clean
  try {
    localStorage.removeItem('ATLAS_URBAN_DRAWING_FEATURES');
    localStorage.removeItem('ATLAS_URBAN_DRAWING_FEATURES_V2');
    localStorage.removeItem('ATLAS_URBAN_DRAWING_FEATURES_V3');
  } catch (e) {
    // Restricted or sandboxed storage
  }

  // Palette & Feature Type Presets
  const FEATURE_TYPES = {
    street: {
      id: 'street',
      name: 'شارع / طريق',
      icon: 'fa-road',
      color: '#f59e0b',
      defaultWidth: 15,
      weight: 5,
      dashArray: null
    },
    block: {
      id: 'block',
      name: 'بلوك سكني / مقاطعة',
      icon: 'fa-city',
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.35,
      weight: 3
    },
    building: {
      id: 'building',
      name: 'مبنى / منشأة',
      icon: 'fa-building',
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.5,
      weight: 2
    },
    line: {
      id: 'line',
      name: 'خط / مسار خدمي',
      icon: 'fa-route',
      color: '#8b5cf6',
      weight: 3,
      dashArray: '6, 6'
    },
    point: {
      id: 'point',
      name: 'نقطة / معلم جغرافي',
      icon: 'fa-location-dot',
      color: '#ef4444'
    },
    label: {
      id: 'label',
      name: 'نص / تسمية مكانية',
      icon: 'fa-font',
      color: '#38bdf8'
    },
    edit: {
      id: 'edit',
      name: 'تعديل الرؤوس والمسار',
      icon: 'fa-draw-polygon',
      color: '#10b981'
    }
  };

  class AtlasDrawingEngine {
    constructor() {
      this.map = null;
      this.featureGroup = null;
      this.tempLayerGroup = null;
      this.features = [];
      this.activeMode = null; // 'street', 'block', 'building', 'line', 'point', 'label', 'edit'
      this.drawingPoints = [];
      this.tempRubberband = null;
      this.tempPolyline = null;
      this.tempPolygon = null;
      this.tempVertexMarkers = [];
      this.liveTooltip = null;
      this.selectedFeature = null;
      this.editingFeature = null;
      this.isLayerVisible = true;
      this.isEditingVertices = false;
      this.activeVertexHandles = [];

      // Default Active Styles
      this.currentSettings = {
        color: '#f59e0b',
        fillOpacity: 0.35,
        weight: 3,
        streetWidth: 15,
        streetType: 'محلي',
        buildingFloors: 2,
        buildingUsage: 'سكني',
        blockZone: 'سكني',
        poiCategory: 'مسجد'
      };

      // Bound Event Handlers for Leaflet
      this._onMapClick = this._handleMapClick.bind(this);
      this._onMapMouseMove = this._handleMapMouseMove.bind(this);
      this._onMapDblClick = this._handleMapDblClick.bind(this);
      this._onKeyDown = this._handleKeyDown.bind(this);
    }

    /**
     * Initialize Engine with Leaflet Map instance
     */
    init(mapInstance) {
      if (!mapInstance || this.map) return;
      this.map = mapInstance;

      // Create dedicated Leaflet map pane for drawing elements (z-index: 650)
      if (!this.map.getPane('drawingLayerPane')) {
        const pane = this.map.createPane('drawingLayerPane');
        pane.style.zIndex = '650';
      }

      // Create feature group for drawn elements
      this.featureGroup = L.featureGroup([], { pane: 'drawingLayerPane' }).addTo(this.map);
      this.tempLayerGroup = L.featureGroup([], { pane: 'drawingLayerPane' }).addTo(this.map);

      // Bind Map Events
      this.map.on('click', this._onMapClick);
      this.map.on('mousemove', this._onMapMouseMove);
      this.map.on('dblclick', this._onMapDblClick);
      window.addEventListener('keydown', this._onKeyDown);

      // Disable click propagation on toolbar so clicking buttons does not click map
      const bar = document.getElementById('floatingDrawToolbar');
      if (bar) {
        L.DomEvent.disableClickPropagation(bar);
        L.DomEvent.disableScrollPropagation(bar);
      }

      // Direct Container Capturing Listeners to GUARANTEE all mouse events register at real scale,
      // even when clicking directly on interactive image overlays (ECW, satellite, GeoTIFF)
      const container = this.map.getContainer();
      if (container) {
        // Capturing click listener
        container.addEventListener('click', (e) => {
          if (!this.activeMode) return;
          if (e.target.closest('#floatingDrawToolbar, #appSidebar, header, .leaflet-control, .glass-panel, #gisExportModal, #chatHistoryModal, .swal2-container')) return;
          const latlng = this.map.mouseEventToLatLng(e);
          if (latlng) {
            this._handleMapClick({ latlng, originalEvent: e });
          }
        }, true); // useCapture: true

        // Capturing mousemove listener for live rubberbanding & tooltips over overlay
        container.addEventListener('mousemove', (e) => {
          if (!this.activeMode || this.drawingPoints.length === 0) return;
          if (e.target.closest('#floatingDrawToolbar, #appSidebar, header, .leaflet-control, .glass-panel, #gisExportModal, #chatHistoryModal, .swal2-container')) return;
          const latlng = this.map.mouseEventToLatLng(e);
          if (latlng) {
            this._handleMapMouseMove({ latlng, originalEvent: e, containerPoint: L.point(e.clientX, e.clientY) });
          }
        }, true); // useCapture: true

        // Capturing dblclick listener
        container.addEventListener('dblclick', (e) => {
          if (!this.activeMode) return;
          if (e.target.closest('#floatingDrawToolbar, #appSidebar, header, .leaflet-control, .glass-panel')) return;
          e.stopPropagation();
          e.preventDefault();
          this._handleMapDblClick(e);
        }, true); // useCapture: true
      }

      // Load saved features from LocalStorage
      this.loadFromStorage();

      // Setup UI listeners
      this._setupUiHooks();
      this.updateStatsUi();

      console.log('✅ Atlas Drawing & Urban Digitization Engine initialized successfully.');
    }

    /**
     * Start Drawing a specific feature type
     */
    setMode(mode) {
      if (!this.map) {
        const candidate = window.map || window.atlasMap;
        if (candidate) this.init(candidate);
      }

      this.cancelCurrentDrawing();

      if (this.activeMode === mode) {
        this.activeMode = null;
      } else {
        this.activeMode = mode;
      }

      // Automatically adopt tool color & style presets
      if (this.activeMode && FEATURE_TYPES[this.activeMode]) {
        const ft = FEATURE_TYPES[this.activeMode];
        if (ft.color) this.currentSettings.color = ft.color;
        if (ft.fillOpacity !== undefined) this.currentSettings.fillOpacity = ft.fillOpacity;
        if (ft.weight !== undefined) this.currentSettings.weight = ft.weight;
        const colorPicker = document.getElementById('drawActiveColor');
        if (colorPicker && ft.color) colorPicker.value = ft.color;
      }

      if (this.activeMode !== 'edit') {
        this.disableFeatureEditing();
      }

      this._updateToolbarUiState();
      this._updateDrawingProgressUi();

      if (this.map) {
        const container = this.map.getContainer();
        if (this.activeMode) {
          if (this.map.doubleClickZoom) this.map.doubleClickZoom.disable();
          document.body.classList.add('drawing-mode-active');
          if (container) L.DomUtil.addClass(container, 'drawing-crosshair-mode');
          this._showFloatingTip(this._getModeHelpText(this.activeMode));
          // Temporarily disable overlay pointer events to ensure click-through at real scale
          document.querySelectorAll('.calibrated-satellite-overlay, .leaflet-image-layer, .leaflet-overlay-pane img, .calib-handle-icon, .calib-center-icon').forEach(img => {
            img.style.setProperty('pointer-events', 'none', 'important');
          });
          if (window.calibOverlayInstance) {
            const oEl = window.calibOverlayInstance.getElement ? window.calibOverlayInstance.getElement() : window.calibOverlayInstance._image;
            if (oEl) oEl.style.setProperty('pointer-events', 'none', 'important');
          }
        } else {
          if (this.map.doubleClickZoom) this.map.doubleClickZoom.enable();
          document.body.classList.remove('drawing-mode-active');
          if (container) L.DomUtil.removeClass(container, 'drawing-crosshair-mode');
          this._hideFloatingTip();
          // Restore overlay pointer events
          document.querySelectorAll('.calibrated-satellite-overlay, .leaflet-image-layer, .leaflet-overlay-pane img, .calib-handle-icon, .calib-center-icon').forEach(img => {
            img.style.removeProperty('pointer-events');
          });
          if (typeof window.attachOverlayDragEvents === 'function') {
            window.attachOverlayDragEvents();
          }
        }
      }
    }

    _getModeHelpText(mode) {
      switch (mode) {
        case 'street':
          return 'انقر على الخريطة لرسم مسار الشارع. انقر نقراً مزدوجاً أو اضغط [إنهاء وحفظ].';
        case 'block':
          return 'انقر لتحديد زوايا البلوك السكني. انقر على نقطة البداية أو [إنهاء وحفظ] للإغلاق وحساب الدونم.';
        case 'building':
          return 'انقر لتحديد أركان المبنى. انقر على نقطة البداية أو اضغط [إنهاء وحفظ] لإنشاء المبنى.';
        case 'line':
          return 'انقر لرسم المسار الخطي الخدمي، ثم انقر [إنهاء وحفظ].';
        case 'point':
          return 'انقر على الخريطة لتثبيت المعلم أو نقطة الاهتمام مباشرة.';
        case 'label':
          return 'انقر على الخريطة لكتابة وتثبيت نص توضيحي.';
        case 'edit':
          return 'وضع تعديل الرؤوس: انقر على أي شكل مرسوم على الخارطة لإظهار مقابض التعديل وسحبها.';
        default:
          return '';
      }
    }

    /**
     * Map Click Event Dispatcher
     */
    _handleMapClick(e) {
      if (!this.activeMode) return;
      const now = Date.now();
      if (this._lastHandledClickTime && (now - this._lastHandledClickTime < 180)) return;
      this._lastHandledClickTime = now;

      const latlng = e.latlng;
      if (!latlng) return;

      if (this.activeMode === 'point') {
        this._createPointFeature(latlng);
        return;
      }

      if (this.activeMode === 'label') {
        this._createLabelFeature(latlng);
        return;
      }

      if (this.activeMode === 'edit') {
        this.disableFeatureEditing();
        return;
      }

      // Check if closing polygon by clicking near the first vertex (when >= 3 points)
      if ((this.activeMode === 'block' || this.activeMode === 'building') && this.drawingPoints.length >= 3) {
        const firstPt = this.drawingPoints[0];
        const distM = this.map.distance(latlng, firstPt);
        const p1 = this.map.latLngToContainerPoint(latlng);
        const p0 = this.map.latLngToContainerPoint(firstPt);
        const distPx = p1.distanceTo(p0);
        if (distM < 5 || distPx < 25) {
          // Close and finish polygon immediately
          this._finalizePolygonFeature();
          return;
        }
      }

      // Polyline / Polygon Drawing Process
      this.drawingPoints.push(latlng);

      // Create vertex marker with interactive: false so clicks at close range are NEVER blocked
      const vMarker = L.circleMarker(latlng, {
        pane: 'drawingLayerPane',
        radius: 5,
        color: '#ffffff',
        weight: 2,
        fillColor: this.currentSettings.color,
        fillOpacity: 1,
        interactive: false,
        className: 'drawing-vertex-marker'
      }).addTo(this.tempLayerGroup);

      this.tempVertexMarkers.push(vMarker);

      // Update Temporary Layers
      if (this.activeMode === 'street' || this.activeMode === 'line') {
        if (!this.tempPolyline) {
          this.tempPolyline = L.polyline(this.drawingPoints, {
            pane: 'drawingLayerPane',
            color: this.currentSettings.color,
            weight: this.activeMode === 'street' ? 6 : 3,
            dashArray: this.activeMode === 'line' ? '6,6' : null,
            opacity: 0.95
          }).addTo(this.tempLayerGroup);
        } else {
          this.tempPolyline.setLatLngs(this.drawingPoints);
        }
      } else if (this.activeMode === 'block' || this.activeMode === 'building') {
        if (!this.tempPolygon) {
          this.tempPolygon = L.polygon(this.drawingPoints, {
            pane: 'drawingLayerPane',
            color: this.currentSettings.color,
            weight: 3,
            fillColor: this.currentSettings.color,
            fillOpacity: this.currentSettings.fillOpacity,
            dashArray: '4,4'
          }).addTo(this.tempLayerGroup);
        } else {
          this.tempPolygon.setLatLngs(this.drawingPoints);
        }
      }

      this._updateDrawingProgressUi();
    }

    /**
     * Map MouseMove Handler (Rubberband preview & dynamic readout)
     */
    _handleMapMouseMove(e) {
      if (!this.activeMode || this.drawingPoints.length === 0) {
        this._hideLiveCursorTooltip();
        return;
      }
      const curLatLng = e.latlng;
      if (!curLatLng) return;
      const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];

      // Update Rubberband line from last placed point to mouse cursor
      if (!this.tempRubberband) {
        this.tempRubberband = L.polyline([lastPoint, curLatLng], {
          pane: 'drawingLayerPane',
          color: this.currentSettings.color,
          weight: 2,
          dashArray: '4, 4',
          opacity: 0.8
        }).addTo(this.tempLayerGroup);
      } else {
        this.tempRubberband.setLatLngs([lastPoint, curLatLng]);
      }

      // Live Tooltip following mouse cursor
      const ptsWithCursor = [...this.drawingPoints, curLatLng];
      let readoutText = '';

      if (this.activeMode === 'street' || this.activeMode === 'line') {
        const lengthM = this.computePolylineLength(ptsWithCursor);
        readoutText = `الطول: ${this.formatLength(lengthM)}<br><span style="color:#6ee7b7">انقر لإضافة نقطة، أو Enter للإنهاء</span>`;
      } else if (this.activeMode === 'block' || this.activeMode === 'building') {
        if (ptsWithCursor.length >= 3) {
          const areaM2 = this.computePolygonArea(ptsWithCursor);
          const perimM = this.computePolylineLength([...ptsWithCursor, ptsWithCursor[0]]);
          readoutText = `المساحة: ${this.formatArea(areaM2)}<br>المحيط: ${this.formatLength(perimM)}<br><span style="color:#6ee7b7">Enter أو انقر [إنهاء] للإغلاق</span>`;
        } else {
          const segM = this.map.distance(lastPoint, curLatLng);
          readoutText = `المسافة: ${this.formatLength(segM)}<br><span style="color:#6ee7b7">انقر لتحديد النقطة التالية</span>`;
        }
      }

      const point = e.containerPoint || (this.map ? this.map.latLngToContainerPoint(curLatLng) : null);
      if (point) {
        this._updateLiveCursorTooltip(point, readoutText);
      }
    }

    /**
     * Map Double Click Handler (Finish Polygon / Line)
     */
    _handleMapDblClick(e) {
      if (!this.activeMode) return;
      L.DomEvent.stop(e); // Prevent map zoom on double click
      this.finishCurrentDrawing();
    }

    /**
     * Finish and save current ongoing line/polygon feature
     */
    finishCurrentDrawing() {
      if (!this.activeMode) return;
      if (this.activeMode === 'street' || this.activeMode === 'line') {
        if (this.drawingPoints.length >= 2) {
          this._finalizeLineFeature();
        } else {
          this._showToast('⚠️ يرجى تحديد نقطتين على الأقل لإكمال رسم الشارع', 'warning');
        }
      } else if (this.activeMode === 'block' || this.activeMode === 'building') {
        if (this.drawingPoints.length >= 3) {
          this._finalizePolygonFeature();
        } else if (this.activeMode === 'building' && this.drawingPoints.length === 2) {
          // If building has 2 points, automatically expand opposite corners to 4-point rectangle
          const p1 = this.drawingPoints[0];
          const p2 = this.drawingPoints[1];
          this.drawingPoints = [
            p1,
            L.latLng(p1.lat, p2.lng),
            p2,
            L.latLng(p2.lat, p1.lng)
          ];
          this._finalizePolygonFeature();
        } else {
          this._showToast('⚠️ يرجى تحديد 3 نقاط على الأقل للمضلع (أو نقطتين لرسم مستطيل المبنى)', 'warning');
        }
      }
    }

    /**
     * Keyboard Shortcuts (Esc = Cancel/Deselect, Backspace/Delete = Undo or Delete selected, Enter = Finish)
     */
    _handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (this.drawingPoints.length > 0) {
          this.cancelCurrentDrawing();
        } else if (this.activeMode) {
          this.setMode(null);
        } else if (this.selectedFeature) {
          this.deselectFeature();
        }
      } else if (e.key === 'Backspace' && this.drawingPoints.length > 0) {
        e.preventDefault();
        this.undoLastVertex();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedFeature && !this.activeMode && this.drawingPoints.length === 0) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
        e.preventDefault();
        const featToDelete = this.selectedFeature;
        this.deleteFeature(featToDelete.id);
      } else if (e.key === 'Enter' && this.drawingPoints.length > 0) {
        e.preventDefault();
        this.finishCurrentDrawing();
      }
    }

    undoLastVertex() {
      if (this.drawingPoints.length === 0) return;
      this.drawingPoints.pop();
      const lastMarker = this.tempVertexMarkers.pop();
      if (lastMarker && this.tempLayerGroup) this.tempLayerGroup.removeLayer(lastMarker);

      if (this.drawingPoints.length === 0) {
        this.cancelCurrentDrawing();
        return;
      }

      if (this.tempPolyline) this.tempPolyline.setLatLngs(this.drawingPoints);
      if (this.tempPolygon) this.tempPolygon.setLatLngs(this.drawingPoints);
      if (this.tempRubberband && this.tempLayerGroup) {
        this.tempLayerGroup.removeLayer(this.tempRubberband);
        this.tempRubberband = null;
      }
      this._updateDrawingProgressUi();
    }

    _updateDrawingProgressUi() {
      const activeBar = document.getElementById('drawingActiveActions');
      const countBadge = document.getElementById('drawingPointsCountBadge');
      const count = this.drawingPoints.length;

      if (!this.activeMode) {
        if (activeBar) {
          activeBar.classList.add('hidden');
          activeBar.classList.remove('flex');
        }
        return;
      }

      if (activeBar) {
        if (count > 0) {
          activeBar.classList.remove('hidden');
          activeBar.classList.add('flex');
        } else {
          activeBar.classList.add('hidden');
          activeBar.classList.remove('flex');
        }
      }

      if (countBadge) {
        countBadge.textContent = `${count} ${count === 1 ? 'نقطة' : 'نقاط'}`;
      }
    }

    /**
     * Finalize Line / Street Feature
     */
    _finalizeLineFeature() {
      const type = this.activeMode;
      const pts = [...this.drawingPoints];
      const lengthM = this.computePolylineLength(pts);
      const id = 'feat_' + Date.now();
      const count = this.features.filter(f => f.type === type).length + 1;

      const name = type === 'street' 
        ? `شارع رقم ${count} (${this.currentSettings.streetWidth}م)` 
        : `مسار خدمي رقم ${count}`;

      const featureData = {
        id,
        type,
        name,
        color: this.currentSettings.color,
        weight: type === 'street' ? 6 : 3,
        dashArray: type === 'line' ? '6,6' : null,
        lengthM,
        points: pts.map(p => ({ lat: p.lat, lng: p.lng })),
        properties: {
          streetWidth: this.currentSettings.streetWidth,
          streetType: this.currentSettings.streetType,
          createdDate: new Date().toISOString()
        }
      };

      this._addFeatureToMap(featureData);
      this.cancelCurrentDrawing();
      this.saveToStorage();
      this.updateStatsUi();
      this.setMode(null);
      this._showToast(`✅ تم إنشاء ${name} بطول ${this.formatLength(lengthM)}`, 'success');
    }

    /**
     * Finalize Polygon (Block / Building) Feature
     */
    _finalizePolygonFeature() {
      const type = this.activeMode;
      const pts = [...this.drawingPoints];
      const areaM2 = this.computePolygonArea(pts);
      const perimeterM = this.computePolylineLength([...pts, pts[0]]);
      const id = 'feat_' + Date.now();
      const count = this.features.filter(f => f.type === type).length + 1;

      const name = type === 'block' 
        ? `بلوك سكني رقم ${count}` 
        : `مبنى ${this.currentSettings.buildingUsage} رقم ${count}`;

      const featureData = {
        id,
        type,
        name,
        color: this.currentSettings.color,
        fillColor: this.currentSettings.color,
        fillOpacity: this.currentSettings.fillOpacity,
        weight: 3,
        areaM2,
        perimeterM,
        points: pts.map(p => ({ lat: p.lat, lng: p.lng })),
        properties: {
          floors: type === 'building' ? this.currentSettings.buildingFloors : null,
          usage: type === 'building' ? this.currentSettings.buildingUsage : null,
          zone: type === 'block' ? this.currentSettings.blockZone : null,
          dunam: (areaM2 / IRAQI_DUNAM_SQM).toFixed(3),
          createdDate: new Date().toISOString()
        }
      };

      this._addFeatureToMap(featureData);
      this.cancelCurrentDrawing();
      this.saveToStorage();
      this.updateStatsUi();
      this.setMode(null);
      this._showToast(`✅ تم إنشاء ${name} بمساحة ${this.formatArea(areaM2)}`, 'success');
    }

    /**
     * Create Point Feature (Marker / POI)
     */
    _createPointFeature(latlng) {
      const id = 'feat_' + Date.now();
      const count = this.features.filter(f => f.type === 'point').length + 1;
      const category = this.currentSettings.poiCategory || 'معلم جغرافي';
      const name = `${category} رقم ${count}`;

      const featureData = {
        id,
        type: 'point',
        name,
        color: '#ef4444',
        points: [{ lat: latlng.lat, lng: latlng.lng }],
        properties: {
          category,
          createdDate: new Date().toISOString()
        }
      };

      this._addFeatureToMap(featureData);
      this.saveToStorage();
      this.updateStatsUi();
      this._showToast(`✅ تم تثبيت ${name} على الخارطة`, 'success');
    }

    /**
     * Create Label Feature with Guaranteed In-App Modal Dialog
     */
    _createLabelFeature(latlng) {
      this.openAddLabelDialog(latlng);
    }

    openAddLabelDialog(latlng) {
      const existing = document.getElementById('drawLabelModal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'drawLabelModal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4';
      modal.innerHTML = `
        <div class="bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-2xl max-w-sm w-full p-4 space-y-3.5 text-right font-sans text-slate-100 animate-in fade-in zoom-in-95 duration-150">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30 text-xs font-bold">
                <i class="fa-solid fa-font"></i>
              </span>
              <h3 class="font-bold text-sm text-white">إضافة تسمية مكانية</h3>
            </div>
            <button type="button" id="closeLabelModalBtn" class="text-slate-400 hover:text-white p-1 rounded-lg text-sm cursor-pointer">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-slate-300">نص التسمية أو اسم المعلم:</label>
            <input type="text" id="labelTextInput" value="حي القادسية" class="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white outline-none" autofocus placeholder="أدخل اسم الشارع، المبنى أو الحي...">
          </div>

          <div class="flex items-center gap-2 justify-end pt-1">
            <button type="button" id="cancelLabelModalBtn" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer">
              إلغاء
            </button>
            <button type="button" id="saveLabelModalBtn" class="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-600/30">
              <i class="fa-solid fa-check"></i>
              <span>تثبيت التسمية</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const input = modal.querySelector('#labelTextInput');
      if (input) {
        setTimeout(() => {
          input.focus();
          input.select();
        }, 50);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            modal.remove();
          }
        });
      }

      const submit = () => {
        const val = (input ? input.value : '').trim();
        modal.remove();
        if (!val) return;
        const id = 'feat_' + Date.now();
        const featureData = {
          id,
          type: 'label',
          name: val,
          color: this.currentSettings.color || '#38bdf8',
          points: [{ lat: latlng.lat, lng: latlng.lng }],
          properties: {
            text: val,
            createdDate: new Date().toISOString()
          }
        };
        this._addFeatureToMap(featureData);
        this.saveToStorage();
        this.updateStatsUi();
        this.setMode(null);
        this._showToast(`✅ تم إضافة التسمية: ${val}`, 'success');
      };

      modal.querySelector('#saveLabelModalBtn').onclick = submit;
      modal.querySelector('#cancelLabelModalBtn').onclick = () => modal.remove();
      modal.querySelector('#closeLabelModalBtn').onclick = () => modal.remove();
    }

    /**
     * Interactive Vertex Editing Engine
     */
    enableFeatureEditing(f) {
      this.disableFeatureEditing();
      if (!f || !f.layer || !f.points || f.points.length === 0) return;
      if (f.type === 'point' || f.type === 'label') {
        this._showToast(`ℹ️ المعالم النقطية والتسميات يمكن نقلها أو إعادة رسمها`, 'info');
        return;
      }

      this.editingFeature = f;
      this.isEditingVertices = true;

      f.points.forEach((pt, idx) => {
        const handle = L.marker([pt.lat, pt.lng], {
          draggable: true,
          pane: 'drawingLayerPane',
          icon: L.divIcon({
            className: 'draw-vertex-handle-icon',
            html: `<div style="background:#10b981; border:2.5px solid #ffffff; width:14px; height:14px; border-radius:50%; box-shadow:0 2px 8px rgba(0,0,0,0.8); cursor:grab;"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          })
        }).addTo(this.tempLayerGroup);

        handle.on('drag', () => {
          const newPos = handle.getLatLng();
          f.points[idx] = { lat: newPos.lat, lng: newPos.lng };
          const newLatLngs = f.points.map(p => L.latLng(p.lat, p.lng));
          f.layer.setLatLngs(newLatLngs);

          // Update metrics in real-time
          if (f.type === 'street' || f.type === 'line') {
            f.lengthM = this.computePolylineLength(f.points);
          } else if (f.type === 'block' || f.type === 'building') {
            f.areaM2 = this.computePolygonArea(f.points);
            f.perimeterM = this.computePolylineLength([...f.points, f.points[0]]);
          }
        });

        handle.on('dragend', () => {
          this.saveToStorage();
          this.updateStatsUi();
          this._showToast(`✅ تم تعديل إحداثيات الرأس رقم ${idx + 1} لـ ${f.name}`, 'info');
        });

        this.activeVertexHandles.push(handle);
      });

      this._showToast(`✏️ وضع التعديل نشط: اسحب المقابض الخضراء لتعديل مسار وزوايا ${f.name}`, 'info');
    }

    disableFeatureEditing() {
      if (this.activeVertexHandles && this.activeVertexHandles.length > 0) {
        this.activeVertexHandles.forEach(h => {
          if (this.tempLayerGroup) this.tempLayerGroup.removeLayer(h);
        });
        this.activeVertexHandles = [];
      }
      this.editingFeature = null;
      this.isEditingVertices = false;
    }

    /**
     * Add Feature Object to Leaflet Map with interactive popup & events
     */
    _addFeatureToMap(f) {
      let layer;

      if (f.type === 'street' || f.type === 'line') {
        const latlngs = f.points.map(p => L.latLng(p.lat, p.lng));
        layer = L.polyline(latlngs, {
          pane: 'drawingLayerPane',
          color: f.color || '#f59e0b',
          weight: f.weight || (f.type === 'street' ? 6 : 3),
          dashArray: f.dashArray || null,
          opacity: 0.95
        });

      } else if (f.type === 'block' || f.type === 'building') {
        const latlngs = f.points.map(p => L.latLng(p.lat, p.lng));
        layer = L.polygon(latlngs, {
          pane: 'drawingLayerPane',
          color: f.color || '#3b82f6',
          weight: f.weight || 2.5,
          fillColor: f.fillColor || f.color || '#3b82f6',
          fillOpacity: f.fillOpacity !== undefined ? f.fillOpacity : 0.35
        });

      } else if (f.type === 'point') {
        const p = f.points[0];
        const iconHtml = `
          <div style="background-color: ${f.color || '#ef4444'}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);">
            <i class="fa-solid fa-location-dot" style="font-size: 13px;"></i>
          </div>
        `;
        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-poi-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 28]
        });
        layer = L.marker([p.lat, p.lng], { icon: customIcon, pane: 'drawingLayerPane' });

      } else if (f.type === 'label') {
        const p = f.points[0];
        const labelHtml = `
          <div class="px-2 py-0.5 rounded-md bg-slate-900/90 text-amber-300 font-bold text-xs border border-amber-500/50 shadow-lg whitespace-nowrap">
            ${f.name}
          </div>
        `;
        const labelIcon = L.divIcon({
          html: labelHtml,
          className: 'custom-map-annotation',
          iconAnchor: [10, 10]
        });
        layer = L.marker([p.lat, p.lng], { icon: labelIcon, pane: 'drawingLayerPane' });
      }

      if (!layer) return;

      f.layer = layer;
      layer._featureData = f;

      // Popup Content
      layer.bindPopup(() => this._generateFeaturePopup(f), { maxWidth: 320 });

      // Click event
      layer.on('click', (e) => {
        if (this.activeMode === 'edit') {
          L.DomEvent.stopPropagation(e);
          this.enableFeatureEditing(f);
          return;
        }
        if (this.activeMode) {
          this._handleMapClick(e);
          return;
        }
        L.DomEvent.stopPropagation(e);
        this.selectFeature(f);
      });

      this.featureGroup.addLayer(layer);
      if (!this.features.some(item => item.id === f.id)) {
        this.features.push(f);
      }
    }

    /**
     * Generate Interactive Feature Popup with Drag Indicator, Color Swatches, and Delete
     * "عند الضغط على اشياء تم رسمها ، تتحول اليد الى امكانية حذف او تحريك او تغيير لون الشيء"
     */
    _generateFeaturePopup(f) {
      const typeInfo = FEATURE_TYPES[f.type] || { name: f.type, icon: 'fa-vector-square' };
      const currentColor = f.color || f.fillColor || '#3b82f6';
      let metricsHtml = '';

      if (f.areaM2) {
        const dunams = (f.areaM2 / IRAQI_DUNAM_SQM).toFixed(2);
        metricsHtml += `
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1 text-[11px]">
            <span class="text-slate-400">المساحة السطحية:</span>
            <span class="font-bold text-emerald-400 font-mono">${f.areaM2.toLocaleString('ar-IQ', { maximumFractionDigits: 1 })} م²</span>
          </div>
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1 text-[11px]">
            <span class="text-slate-400">بالدونم العراقي:</span>
            <span class="font-bold text-amber-300 font-mono">${dunams} دونم</span>
          </div>
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1 text-[11px]">
            <span class="text-slate-400">المحيط الخارجي:</span>
            <span class="font-bold text-sky-300 font-mono">${this.formatLength(f.perimeterM)}</span>
          </div>
        `;
      }

      if (f.lengthM) {
        metricsHtml += `
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1 text-[11px]">
            <span class="text-slate-400">الطول الإجمالي:</span>
            <span class="font-bold text-amber-300 font-mono">${this.formatLength(f.lengthM)}</span>
          </div>
        `;
      }

      if (f.properties && f.properties.streetWidth) {
        metricsHtml += `
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1 text-[11px]">
            <span class="text-slate-400">عرض الشارع:</span>
            <span class="font-bold text-slate-200 font-mono">${f.properties.streetWidth} متر</span>
          </div>
        `;
      }

      if (f.properties && f.properties.floors) {
        metricsHtml += `
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1 text-[11px]">
            <span class="text-slate-400">عدد الطوابق:</span>
            <span class="font-bold text-slate-200 font-mono">${f.properties.floors} طابق</span>
          </div>
        `;
      }

      // Color Palette Swatches (تغيير لون الشيء) — 9 colors
      const SWATCHES = [
        { color: '#ffffff', label: 'أبيض' },
        { color: '#ec4899', label: 'وردي' },
        { color: '#06b6d4', label: 'سماوي' },
        { color: '#ef4444', label: 'أحمر' },
        { color: '#8b5cf6', label: 'بنفسجي' },
        { color: '#10b981', label: 'أخضر' },
        { color: '#3b82f6', label: 'أزرق' },
        { color: '#f59e0b', label: 'ذهبي' }
      ];

      const swatchesHtml = SWATCHES.map(s => {
        const isActive = s.color.toLowerCase() === currentColor.toLowerCase();
        return `<button type="button"
          onclick="window.AtlasDrawingEngine.changeFeatureColor('${f.id}', '${s.color}')"
          class="feature-color-swatch ${isActive ? 'active' : ''}"
          style="background-color:${s.color}; width:26px; height:26px; border-radius:50%; border:${isActive ? '3px solid #fff' : '2px solid rgba(255,255,255,0.25)'}; cursor:pointer; box-shadow:${isActive ? '0 0 0 2px #38bdf8' : 'none'}; transition:all 0.15s; flex-shrink:0;"
          title="${s.label}"></button>`;
      }).join('');

      // Build editable property fields based on feature type
      let editablePropsHtml = '';

      if (f.type === 'street' || f.type === 'line') {
        const sw = (f.properties && f.properties.streetWidth) ? f.properties.streetWidth : 15;
        const st = (f.properties && f.properties.streetType) ? f.properties.streetType : 'رئيسي';
        editablePropsHtml = `
          <div class="space-y-1.5 pt-1 border-t border-slate-700/70">
            <div class="text-[10px] font-bold text-sky-300 mb-1 flex items-center gap-1">
              <i class="fa-solid fa-sliders text-[9px]"></i>
              <span>تعديل خصائص الشارع</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <label class="text-[10px] text-slate-400 shrink-0">عرض الشارع:</label>
              <div class="flex items-center gap-1">
                <input type="number" min="1" max="200" step="1" value="${sw}"
                  onchange="window.AtlasDrawingEngine.updateFeatureProperty('${f.id}','streetWidth',+this.value)"
                  class="w-16 bg-slate-800 border border-slate-600 focus:border-sky-500 rounded-lg px-2 py-0.5 text-[11px] text-white font-mono text-center outline-none">
                <span class="text-[10px] text-slate-400">متر</span>
              </div>
            </div>
            <div class="flex items-center justify-between gap-2">
              <label class="text-[10px] text-slate-400 shrink-0">نوع الشارع:</label>
              <select onchange="window.AtlasDrawingEngine.updateFeatureProperty('${f.id}','streetType',this.value)"
                class="bg-slate-800 border border-slate-600 focus:border-sky-500 rounded-lg px-2 py-0.5 text-[11px] text-white outline-none cursor-pointer">
                <option value="رئيسي" ${st==='رئيسي'?'selected':''}>رئيسي</option>
                <option value="ثانوي" ${st==='ثانوي'?'selected':''}>ثانوي</option>
                <option value="خدمي" ${st==='خدمي'?'selected':''}>خدمي</option>
                <option value="سريع" ${st==='سريع'?'selected':''}>سريع</option>
                <option value="محلي" ${st==='محلي'?'selected':''}>محلي</option>
              </select>
            </div>
          </div>`;
      } else if (f.type === 'building') {
        const floors = (f.properties && f.properties.floors) ? f.properties.floors : 1;
        const usage  = (f.properties && f.properties.usage)  ? f.properties.usage  : 'سكني';
        editablePropsHtml = `
          <div class="space-y-1.5 pt-1 border-t border-slate-700/70">
            <div class="text-[10px] font-bold text-emerald-300 mb-1 flex items-center gap-1">
              <i class="fa-solid fa-sliders text-[9px]"></i>
              <span>تعديل خصائص المبنى</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <label class="text-[10px] text-slate-400 shrink-0">عدد الطوابق:</label>
              <input type="number" min="1" max="200" step="1" value="${floors}"
                onchange="window.AtlasDrawingEngine.updateFeatureProperty('${f.id}','floors',+this.value)"
                class="w-16 bg-slate-800 border border-slate-600 focus:border-emerald-500 rounded-lg px-2 py-0.5 text-[11px] text-white font-mono text-center outline-none">
            </div>
            <div class="flex items-center justify-between gap-2">
              <label class="text-[10px] text-slate-400 shrink-0">الاستخدام:</label>
              <select onchange="window.AtlasDrawingEngine.updateFeatureProperty('${f.id}','usage',this.value)"
                class="bg-slate-800 border border-slate-600 focus:border-emerald-500 rounded-lg px-2 py-0.5 text-[11px] text-white outline-none cursor-pointer">
                <option value="سكني"    ${usage==='سكني'?'selected':''}>سكني</option>
                <option value="تجاري"   ${usage==='تجاري'?'selected':''}>تجاري</option>
                <option value="حكومي"   ${usage==='حكومي'?'selected':''}>حكومي</option>
                <option value="صناعي"   ${usage==='صناعي'?'selected':''}>صناعي</option>
                <option value="ديني"    ${usage==='ديني'?'selected':''}>ديني</option>
                <option value="تعليمي"  ${usage==='تعليمي'?'selected':''}>تعليمي</option>
                <option value="صحي"     ${usage==='صحي'?'selected':''}>صحي</option>
              </select>
            </div>
          </div>`;
      } else if (f.type === 'block') {
        const zone = (f.properties && f.properties.zone) ? f.properties.zone : 'A';
        editablePropsHtml = `
          <div class="space-y-1.5 pt-1 border-t border-slate-700/70">
            <div class="text-[10px] font-bold text-sky-300 mb-1 flex items-center gap-1">
              <i class="fa-solid fa-sliders text-[9px]"></i>
              <span>تعديل خصائص البلوك</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <label class="text-[10px] text-slate-400 shrink-0">رمز المنطقة:</label>
              <input type="text" maxlength="10" value="${zone}"
                onchange="window.AtlasDrawingEngine.updateFeatureProperty('${f.id}','zone',this.value)"
                class="w-20 bg-slate-800 border border-slate-600 focus:border-sky-500 rounded-lg px-2 py-0.5 text-[11px] text-white font-mono text-center outline-none">
            </div>
          </div>`;
      } else if (f.type === 'label') {
        editablePropsHtml = `
          <div class="space-y-1.5 pt-1 border-t border-slate-700/70">
            <div class="text-[10px] font-bold text-cyan-300 mb-1 flex items-center gap-1">
              <i class="fa-solid fa-font text-[9px]"></i>
              <span>تعديل نص التسمية</span>
            </div>
            <div class="flex items-center gap-1.5">
              <input type="text" value="${f.name}"
                id="labelInlineEditInput_${f.id}"
                class="flex-1 bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-lg px-2 py-1 text-[11px] text-white outline-none">
              <button type="button"
                onclick="window.AtlasDrawingEngine.renameFeatureInline('${f.id}', document.getElementById('labelInlineEditInput_${f.id}').value)"
                class="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold cursor-pointer shrink-0">
                حفظ
              </button>
            </div>
          </div>`;
      }

      return `
        <div class="p-2.5 space-y-2 text-right font-sans select-none" dir="rtl" style="min-width:290px; max-width:320px;">

          <!-- Header -->
          <div class="border-b border-slate-700 pb-2">
            <div class="flex items-center justify-between gap-1.5">
              <div class="flex items-center gap-1.5 font-bold text-white text-xs" style="max-width:65%;">
                <i class="fa-solid ${typeInfo.icon} text-amber-400 shrink-0"></i>
                <span class="truncate" title="${f.name}">${f.name}</span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">${typeInfo.name}</span>
            </div>
            <!-- Drag Hint -->
            <div class="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 bg-cyan-950/70 px-2 py-1 rounded-md border border-cyan-800/80">
              <i class="fa-solid fa-hand text-xs text-cyan-400"></i>
              <span>متاح للتحريك بالسحب المباشر بالماوس ✋</span>
            </div>
          </div>

          <!-- Metrics -->
          ${metricsHtml ? `<div class="space-y-1 text-slate-300">${metricsHtml}</div>` : ''}

          <!-- Editable Properties (per-type) -->
          ${editablePropsHtml}

          <!-- Color Palette Picker -->
          <div class="space-y-1.5 pt-1 border-t border-slate-700">
            <div class="flex items-center justify-between text-[11px] font-bold">
              <span class="flex items-center gap-1 text-amber-300">
                <i class="fa-solid fa-palette text-xs"></i>
                <span>🎨 تغيير لون الشيء:</span>
              </span>
              <label class="text-[10px] text-slate-400 cursor-pointer flex items-center gap-1 hover:text-white">
                <span>مخصص:</span>
                <input type="color" value="${currentColor}"
                  onchange="window.AtlasDrawingEngine.changeFeatureColor('${f.id}', this.value)"
                  class="w-5 h-5 rounded cursor-pointer border-0 bg-transparent">
              </label>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
              ${swatchesHtml}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-700">
            <button type="button"
              onclick="window.AtlasDrawingEngine.openRenameModal('${f.id}')"
              class="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              title="تعديل اسم العنصر">
              <i class="fa-solid fa-pen text-[10px] text-slate-300"></i>
              <span>تسمية</span>
            </button>
            <button type="button"
              onclick="window.AtlasDrawingEngine.enableFeatureEditingById('${f.id}')"
              class="py-1.5 bg-emerald-600/25 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm"
              title="تعديل زوايا ورؤوس الشكل">
              <i class="fa-solid fa-draw-polygon text-xs"></i>
              <span>تعديل</span>
            </button>
            <button type="button"
              onclick="window.AtlasDrawingEngine.deleteFeature('${f.id}')"
              class="py-1.5 bg-rose-600/25 hover:bg-rose-600/50 text-rose-300 border border-rose-500/50 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm"
              title="حذف هذا الشكل نهائياً">
              <i class="fa-solid fa-trash text-xs"></i>
              <span>حذف</span>
            </button>
          </div>

        </div>
      `;
    }


    /**
     * Select Feature and Enable Hand Dragging, Color Change, and Deletion
     * "عند الضغط على اشياء تم رسمها ، تتحول اليد الى امكانية حذف او تحريك او تغيير لون الشيء"
     */
    selectFeature(f) {
      if (!f || !f.layer) return;

      // Deselect previously selected
      this.deselectFeature();

      this.selectedFeature = f;
      this._highlightFeatureInList(f.id);

      // Add visual selection style to layer and set cursor to grab/hand
      if (f.layer.getElement) {
        const el = f.layer.getElement();
        if (el) {
          L.DomUtil.addClass(el, 'drawn-feature-selected');
        }
      }

      // Enable Hand Dragging on Feature
      this.enableFeatureDragging(f);

      // Open interactive action popup
      f.layer.openPopup();

      this._showToast(`✋ تم تحديد "${f.name}" • يمكنك سحبه بالماوس أو تغيير لونه أو حذفه`, 'info');
    }

    /**
     * Deselect currently selected feature
     */
    deselectFeature() {
      if (this.selectedFeature && this.selectedFeature.layer) {
        if (this.selectedFeature.layer.getElement) {
          const el = this.selectedFeature.layer.getElement();
          if (el) {
            L.DomUtil.removeClass(el, 'drawn-feature-selected');
          }
        }
        this.disableFeatureDragging(this.selectedFeature);
      }
      this.selectedFeature = null;
    }

    /**
     * Enable Whole-Feature Move / Dragging (تحريك الشيء بالسحب باليد)
     */
    enableFeatureDragging(f) {
      if (!f || !f.layer) return;

      if (f.type === 'point') {
        if (f.layer.dragging) {
          f.layer.dragging.enable();
          f.layer.off('dragend');
          f.layer.on('dragend', () => {
            const newPos = f.layer.getLatLng();
            f.points = [{ lat: newPos.lat, lng: newPos.lng }];
            this.saveToStorage();
            this.updateStatsUi();
            this._showToast(`✋ تم تحريك ${f.name} إلى موقعه الجديد`, 'success');
          });
        }
        return;
      }

      // Ensure cursor is grab
      if (f.layer.getElement) {
        const el = f.layer.getElement();
        if (el) L.DomUtil.addClass(el, 'drawn-feature-selected');
      }

      // Attach mouse/touch drag for Polygons & Polylines
      if (!f._dragHandlersAttached) {
        f._dragHandlersAttached = true;
        let isDragging = false;
        let startLatLng = null;
        let initialPoints = null;

        const onMouseDown = (e) => {
          if (this.activeMode === 'edit') return;
          // Ignore clicks inside popup or controls
          if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.closest('button, input, a, .leaflet-popup, .draw-vertex-handle-icon')) return;

          isDragging = true;
          startLatLng = e.latlng;
          // Deep copy initial points
          initialPoints = f.points.map(p => ({ lat: p.lat, lng: p.lng }));
          this.map.dragging.disable();
          document.body.classList.add('dragging-feature-active');
          L.DomEvent.stopPropagation(e);

          const onMouseMove = (moveEvt) => {
            if (!isDragging || !startLatLng || !initialPoints) return;
            const deltaLat = moveEvt.latlng.lat - startLatLng.lat;
            const deltaLng = moveEvt.latlng.lng - startLatLng.lng;

            const shifted = initialPoints.map(p => L.latLng(p.lat + deltaLat, p.lng + deltaLng));
            f.layer.setLatLngs(shifted);
          };

          const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            this.map.dragging.enable();
            document.body.classList.remove('dragging-feature-active');

            this.map.off('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            // Update f.points & f.geometry
            const currentLatLngs = f.layer.getLatLngs();
            const flatPts = Array.isArray(currentLatLngs[0]) ? currentLatLngs[0] : currentLatLngs;
            f.points = flatPts.map(ll => ({ lat: ll.lat, lng: ll.lng }));

            // Recalculate metrics
            if (f.type === 'block' || f.type === 'building') {
              f.areaM2 = this.computePolygonArea(f.points);
              f.perimeterM = this.computePolylineLength([...f.points, f.points[0]]);
              if (f.properties) {
                f.properties.dunam = (f.areaM2 / IRAQI_DUNAM_SQM).toFixed(3);
              }
            } else if (f.type === 'street' || f.type === 'line') {
              f.lengthM = this.computePolylineLength(f.points);
            }

            this.saveToStorage();
            this.updateStatsUi();
            // Refresh popup with new metrics if open
            if (f.layer.getPopup && f.layer.getPopup().isOpen && f.layer.getPopup().isOpen()) {
              f.layer.setPopupContent(this._generateFeaturePopup(f));
            }
            this._showToast(`✋ تم تحريك "${f.name}" بنجاح`, 'success');
          };

          this.map.on('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp, { once: true });
        };

        f.layer.on('mousedown', onMouseDown);
      }
    }

    /**
     * Disable Feature Dragging
     */
    disableFeatureDragging(f) {
      if (!f || !f.layer) return;
      if (f.type === 'point' && f.layer.dragging) {
        f.layer.dragging.disable();
      }
    }

    /**
     * Change Feature Color (تغيير لون الشيء)
     */
    changeFeatureColor(id, newColor) {
      const f = this.features.find(item => item.id === id);
      if (!f || !f.layer) return;

      f.color = newColor;
      f.fillColor = newColor;
      if (!f.properties) f.properties = {};
      f.properties.color = newColor;

      if (f.type === 'street' || f.type === 'line') {
        f.layer.setStyle({ color: newColor });
      } else if (f.type === 'block' || f.type === 'building') {
        f.layer.setStyle({
          color: newColor,
          fillColor: newColor
        });
      } else if (f.type === 'point') {
        const iconHtml = `
          <div style="background-color: ${newColor}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);">
            <i class="fa-solid fa-location-dot" style="font-size: 13px;"></i>
          </div>
        `;
        f.layer.setIcon(L.divIcon({
          html: iconHtml,
          className: 'custom-poi-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 28]
        }));
      } else if (f.type === 'label') {
        const labelHtml = `
          <div class="px-2 py-0.5 rounded-md bg-slate-900/90 text-amber-300 font-bold text-xs border shadow-lg whitespace-nowrap" style="border-color: ${newColor}; color: ${newColor};">
            ${f.name}
          </div>
        `;
        f.layer.setIcon(L.divIcon({
          html: labelHtml,
          className: 'custom-map-annotation',
          iconAnchor: [10, 10]
        }));
      }

      this.saveToStorage();
      this.updateStatsUi();

      // Refresh popup content so active color swatch is highlighted
      if (f.layer.getPopup && f.layer.getPopup()) {
        f.layer.setPopupContent(this._generateFeaturePopup(f));
      }

      this._showToast(`🎨 تم تغيير لون "${f.name}" بنجاح`, 'success');
    }

    /**
     * Open In-App Rename Modal (replaces browser prompt)
     */
    openRenameModal(id) {
      const feat = this.features.find(f => f.id === id);
      if (!feat) return;

      // Close popup so modal is visible
      if (feat.layer && feat.layer.closePopup) feat.layer.closePopup();

      const existing = document.getElementById('drawRenameModal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'drawRenameModal';
      modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4';
      modal.innerHTML = `
        <div class="bg-slate-900 border border-sky-500/50 rounded-2xl shadow-2xl max-w-sm w-full p-4 space-y-3.5 text-right font-sans text-slate-100" dir="rtl">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-500/30 text-xs">
                <i class="fa-solid fa-pen"></i>
              </span>
              <h3 class="font-bold text-sm text-white">تعديل اسم العنصر</h3>
            </div>
            <button type="button" id="closeRenameModalBtn" class="text-slate-400 hover:text-white p-1 rounded-lg text-sm cursor-pointer">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-slate-300">الاسم الجديد للعنصر:</label>
            <input type="text" id="renameFeatureInput" value="${feat.name.replace(/"/g,'&quot;')}"
              class="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-sm text-white outline-none"
              autofocus>
          </div>
          <div class="flex items-center gap-2 justify-end pt-1">
            <button type="button" id="cancelRenameModalBtn"
              class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer">
              إلغاء
            </button>
            <button type="button" id="saveRenameModalBtn"
              class="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-md">
              <i class="fa-solid fa-check"></i>
              <span>حفظ الاسم</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const input = modal.querySelector('#renameFeatureInput');
      if (input) {
        input.focus();
        input.select();
      }

      const doSave = () => {
        const val = input ? input.value.trim() : '';
        if (val) {
          this.renameFeatureInline(id, val);
        }
        modal.remove();
      };

      modal.querySelector('#saveRenameModalBtn').addEventListener('click', doSave);
      modal.querySelector('#cancelRenameModalBtn').addEventListener('click', () => modal.remove());
      modal.querySelector('#closeRenameModalBtn').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') doSave();
          if (e.key === 'Escape') modal.remove();
        });
      }
    }

    /**
     * Rename Feature (inline or from modal) — applies name and updates map/popup
     */
    renameFeatureInline(id, newName) {
      const feat = this.features.find(f => f.id === id);
      if (!feat || !newName || !newName.trim()) return;
      feat.name = newName.trim();

      if (feat.layer) {
        if (feat.type === 'label') {
          const labelHtml = `
            <div class="px-2 py-0.5 rounded-md bg-slate-900/90 font-bold text-xs border shadow-lg whitespace-nowrap"
              style="border-color:${feat.color||'#38bdf8'}; color:${feat.color||'#38bdf8'};">
              ${feat.name}
            </div>`;
          feat.layer.setIcon(L.divIcon({
            html: labelHtml,
            className: 'custom-map-annotation',
            iconAnchor: [10, 10]
          }));
        }
        if (feat.layer.getPopup && feat.layer.getPopup()) {
          feat.layer.setPopupContent(this._generateFeaturePopup(feat));
        }
      }
      this.saveToStorage();
      this.updateStatsUi();
      this._showToast(`✅ تم تحديث الاسم إلى: ${feat.name}`, 'success');
    }

    /**
     * Rename Feature — legacy wrapper (kept for sidebar buttons)
     */
    renameFeature(id) {
      this.openRenameModal(id);
    }

    /**
     * Update a single property on a feature (called from popup inputs)
     * e.g. streetWidth, streetType, floors, usage, zone
     */
    updateFeatureProperty(id, key, value) {
      const feat = this.features.find(f => f.id === id);
      if (!feat) return;
      if (!feat.properties) feat.properties = {};
      feat.properties[key] = value;

      // If updating streetWidth, also update line weight visually
      if ((key === 'streetWidth') && feat.layer && feat.layer.setStyle) {
        const scaledWeight = Math.max(2, Math.min(20, Math.round(value / 3)));
        feat.layer.setStyle({ weight: scaledWeight });
        feat.weight = scaledWeight;
      }

      // Refresh popup immediately
      if (feat.layer && feat.layer.getPopup && feat.layer.getPopup()) {
        feat.layer.setPopupContent(this._generateFeaturePopup(feat));
      }

      this.saveToStorage();
      this.updateStatsUi();
    }

    /**
     * Enable vertex editing by feature ID (called from popup button)
     */
    enableFeatureEditingById(id) {
      const feat = this.features.find(f => f.id === id);
      if (!feat) return;
      // Close popup first
      if (feat.layer && feat.layer.closePopup) feat.layer.closePopup();
      this.enableFeatureEditing(feat);
    }

    /**
     * Zoom map to feature bounds
     */
    zoomToFeature(id) {
      const feat = this.features.find(f => f.id === id);
      if (!feat || !feat.layer) return;

      if (feat.layer.getBounds) {
        this.map.fitBounds(feat.layer.getBounds(), { padding: [50, 50], maxZoom: 18 });
      } else if (feat.layer.getLatLng) {
        this.map.setView(feat.layer.getLatLng(), 17);
      }
      feat.layer.openPopup();
    }


    /**
     * Delete Feature (حذف الشيء)
     */
    deleteFeature(id) {
      const idx = this.features.findIndex(f => f.id === id);
      if (idx === -1) return;
      const feat = this.features[idx];

      if (this.editingFeature && this.editingFeature.id === id) {
        this.disableFeatureEditing();
      }

      if (feat.layer) {
        this.featureGroup.removeLayer(feat.layer);
      }
      this.features.splice(idx, 1);
      this.selectedFeature = null;

      this.saveToStorage();
      this.updateStatsUi();
      this._updateToolbarCount();
      this._showToast(`🗑️ تم حذف "${feat.name}" بنجاح`, 'info');
    }

    /**
     * Clear all drawn features with confirmation or programmatically
     */
    clearAllFeatures(skipConfirm = false) {
      if (this.features.length === 0 && this.drawingPoints.length === 0) return;
      if (!skipConfirm && !confirm('هل أنت متأكد من رغبتك في حذف جميع الرسوم والشوارع والبلوكات والمباني؟')) return;

      if (this.featureGroup) this.featureGroup.clearLayers();
      if (this.tempLayerGroup) this.tempLayerGroup.clearLayers();
      this.features = [];
      this.cancelCurrentDrawing();
      this.disableFeatureEditing();
      this.selectedFeature = null;
      this.saveToStorage();
      this.updateStatsUi();
      this._updateToolbarCount();
      this.setMode(null);
      this._showToast('🗑️ تم مسح وحذف كافة الرسوم من الخارطة', 'warning');
    }

    /**
     * Toggle entire drawing layer visibility on/off
     */
    toggleLayerVisibility() {
      this.isLayerVisible = !this.isLayerVisible;
      if (this.isLayerVisible) {
        if (!this.map.hasLayer(this.featureGroup)) this.map.addLayer(this.featureGroup);
        if (!this.map.hasLayer(this.tempLayerGroup)) this.map.addLayer(this.tempLayerGroup);
      } else {
        if (this.map.hasLayer(this.featureGroup)) this.map.removeLayer(this.featureGroup);
        if (this.map.hasLayer(this.tempLayerGroup)) this.map.removeLayer(this.tempLayerGroup);
      }
      this._updateVisibilityUi();
      this._showToast(this.isLayerVisible ? '👁️ تم إظهار طبقة الرسوم' : '🙈 تم إخفاء طبقة الرسوم', 'info');
      return this.isLayerVisible;
    }

    /**
     * Cancel ongoing drawing action
     */
    cancelCurrentDrawing() {
      this.drawingPoints = [];
      if (this.tempLayerGroup) this.tempLayerGroup.clearLayers();
      this.tempPolyline = null;
      this.tempPolygon = null;
      this.tempRubberband = null;
      this.tempVertexMarkers = [];
      this.disableFeatureEditing();
      this._hideLiveCursorTooltip();
      this._updateDrawingProgressUi();
    }

    /**
     * Save features to LocalStorage
     */
    saveToStorage() {
      try {
        const cleanFeatures = this.features.map(f => ({
          id: f.id,
          type: f.type,
          name: f.name,
          color: f.color,
          fillColor: f.fillColor,
          fillOpacity: f.fillOpacity,
          weight: f.weight,
          dashArray: f.dashArray,
          lengthM: f.lengthM,
          areaM2: f.areaM2,
          perimeterM: f.perimeterM,
          points: f.points,
          properties: f.properties
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanFeatures));
      } catch (err) {
        console.warn('Could not save drawn features to storage:', err);
      }
    }

    /**
     * Load features from LocalStorage
     */
    loadFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(f => this._addFeatureToMap(f));
        }
      } catch (err) {
        console.warn('Could not load drawn features from storage:', err);
      }
    }

    /**
     * Export all drawn features as GeoJSON standard file
     */
    exportGeoJson() {
      if (this.features.length === 0) {
        this._showToast('⚠️ لا توجد رسومات لتصديرها. قم برسم شوارع أو بلوكات أولاً.', 'warning');
        return;
      }

      const geojson = {
        type: 'FeatureCollection',
        metadata: {
          title: 'ArcGIS Living Atlas - Urban Drawing Layer',
          author: 'Dr. Eng. Ahmed Louay Al-Bajari - تصميم وتطوير الدكتور المهندس احمد لؤي البجاري',
          date: new Date().toISOString(),
          totalFeatures: this.features.length
        },
        features: this.features.map(f => {
          let geometry;
          if (f.type === 'point' || f.type === 'label') {
            geometry = {
              type: 'Point',
              coordinates: [f.points[0].lng, f.points[0].lat]
            };
          } else if (f.type === 'street' || f.type === 'line') {
            geometry = {
              type: 'LineString',
              coordinates: f.points.map(p => [p.lng, p.lat])
            };
          } else if (f.type === 'block' || f.type === 'building') {
            const ring = f.points.map(p => [p.lng, p.lat]);
            // Close ring if not closed
            if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
              ring.push([ring[0][0], ring[0][1]]);
            }
            geometry = {
              type: 'Polygon',
              coordinates: [ring]
            };
          }

          return {
            type: 'Feature',
            id: f.id,
            properties: {
              name: f.name,
              type: f.type,
              areaM2: f.areaM2 || null,
              dunamIraqi: f.areaM2 ? (f.areaM2 / IRAQI_DUNAM_SQM).toFixed(3) : null,
              lengthM: f.lengthM || null,
              color: f.color,
              ...f.properties
            },
            geometry
          };
        })
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `Urban_Cadastre_Planning_${Date.now()}.geojson`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      this._showToast('🎉 تم تصدير طبقة الرسوم بصيغة GeoJSON بنجاح!', 'success');
    }

    /**
     * Import GeoJSON File
     */
    importGeoJsonFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          let count = 0;
          if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
            json.features.forEach(feat => {
              if (this._convertGeoJsonFeature(feat)) count++;
            });
          }
          this.saveToStorage();
          this.updateStatsUi();
          this._showToast(`🎉 تم استيراد ${count} عنصر بنجاح إلى طبقة الرسم!`, 'success');
        } catch (err) {
          console.error(err);
          this._showToast('❌ تعذر قراءة ملف GeoJSON. تأكد من صحة الملف.', 'error');
        }
      };
      reader.readAsText(file);
    }

    _convertGeoJsonFeature(feat) {
      if (!feat || !feat.geometry) return false;
      const geom = feat.geometry;
      const props = feat.properties || {};
      const id = feat.id || ('feat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
      let points = [];
      let type = props.type || 'line';

      if (geom.type === 'Point') {
        points = [{ lat: geom.coordinates[1], lng: geom.coordinates[0] }];
        type = props.type || 'point';
      } else if (geom.type === 'LineString') {
        points = geom.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
        type = props.type || 'street';
      } else if (geom.type === 'Polygon' && geom.coordinates.length > 0) {
        points = geom.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));
        type = props.type || 'block';
      }

      if (points.length === 0) return false;

      const f = {
        id,
        type,
        name: props.name || ('عنصر مستورد ' + id),
        color: props.color || '#3b82f6',
        fillColor: props.fillColor || props.color || '#3b82f6',
        fillOpacity: props.fillOpacity || 0.35,
        weight: props.weight || 3,
        lengthM: props.lengthM || (type === 'street' || type === 'line' ? this.computePolylineLength(points) : null),
        areaM2: props.areaM2 || (type === 'block' || type === 'building' ? this.computePolygonArea(points) : null),
        points,
        properties: props
      };

      this._addFeatureToMap(f);
      return true;
    }

    /**
     * Compute Spherical Length (Meters)
     */
    computePolylineLength(latlngs) {
      if (!latlngs || latlngs.length < 2) return 0;
      let total = 0;
      for (let i = 0; i < latlngs.length - 1; i++) {
        total += this.map.distance(latlngs[i], latlngs[i + 1]);
      }
      return total;
    }

    /**
     * Compute Spherical Polygon Area in Square Meters (Exact Geodesic)
     */
    computePolygonArea(latlngs) {
      if (!latlngs || latlngs.length < 3) return 0;
      const R = 6378137; // Earth's WGS84 Radius in meters
      let area = 0;
      const len = latlngs.length;

      for (let i = 0; i < len; i++) {
        const p1 = latlngs[i];
        const p2 = latlngs[(i + 1) % len];
        const dLambda = (p2.lng - p1.lng) * (Math.PI / 180);
        const phi1 = p1.lat * (Math.PI / 180);
        const phi2 = p2.lat * (Math.PI / 180);
        area += dLambda * (2 + Math.sin(phi1) + Math.sin(phi2));
      }

      area = (Math.abs(area) * R * R) / 4.0;
      return area;
    }

    formatLength(meters) {
      if (meters === undefined || meters === null) return '--';
      if (meters < 1000) {
        return `${meters.toFixed(1)} متر`;
      }
      return `${(meters / 1000).toFixed(2)} كم (${meters.toFixed(0)}م)`;
    }

    formatArea(sqMeters) {
      if (sqMeters === undefined || sqMeters === null) return '--';
      const dunams = (sqMeters / IRAQI_DUNAM_SQM).toFixed(2);
      if (sqMeters < 10000) {
        return `${sqMeters.toFixed(1)} م² (${dunams} دونم عراقي)`;
      }
      const hectares = (sqMeters / HECTARE_SQM).toFixed(2);
      return `${hectares} هكتار (${dunams} دونم عراقي • ${sqMeters.toLocaleString('ar-IQ', { maximumFractionDigits: 0 })} م²)`;
    }

    /**
     * UI Updates and Hooks
     */
    updateStatsUi() {
      // Update badge counts
      const countBadges = document.querySelectorAll('#drawnFeaturesCountBadge, #toolbarDrawnCountBadge, #drawnFeaturesBadge');
      countBadges.forEach(b => {
        b.textContent = this.features.length;
      });

      // Update statistics table in Sidebar panel
      const streets = this.features.filter(f => f.type === 'street');
      const blocks = this.features.filter(f => f.type === 'block');
      const buildings = this.features.filter(f => f.type === 'building');
      const others = this.features.filter(f => f.type !== 'street' && f.type !== 'block' && f.type !== 'building');

      const totalStreetKm = streets.reduce((sum, s) => sum + (s.lengthM || 0), 0) / 1000;
      const totalBlockSqm = blocks.reduce((sum, b) => sum + (b.areaM2 || 0), 0);
      const totalDunams = totalBlockSqm / IRAQI_DUNAM_SQM;

      const streetsCountEl = document.getElementById('drawStatsStreetsCount');
      if (streetsCountEl) streetsCountEl.textContent = `${streets.length} (${totalStreetKm.toFixed(2)} كم)`;

      const blocksCountEl = document.getElementById('drawStatsBlocksCount');
      if (blocksCountEl) blocksCountEl.textContent = `${blocks.length} (${totalDunams.toFixed(1)} دونم)`;

      const buildingsCountEl = document.getElementById('drawStatsBuildingsCount');
      if (buildingsCountEl) buildingsCountEl.textContent = buildings.length;

      // Populate Features List in Sidebar
      this._renderFeaturesList();

      // Refresh Active Layers Tab if present
      if (typeof window.renderActiveLayersTab === 'function') {
        window.renderActiveLayersTab();
      }
    }

    _renderFeaturesList() {
      const container = document.getElementById('drawnFeaturesListContainer');
      if (!container) return;

      if (this.features.length === 0) {
        container.innerHTML = `
          <div class="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
            <i class="fa-solid fa-pen-ruler text-lg text-slate-600 mb-1"></i>
            <div>لا توجد كائنات مرسومة حالياً</div>
            <div class="text-[10px] text-slate-600">اختر أداة من الأعلى وابدأ الرسم على الخارطة</div>
          </div>
        `;
        return;
      }

      let html = '';
      this.features.slice().reverse().forEach(f => {
        const typeInfo = FEATURE_TYPES[f.type] || { name: f.type, icon: 'fa-vector-square' };
        let metricsStr = '';
        if (f.areaM2) metricsStr = `${(f.areaM2 / IRAQI_DUNAM_SQM).toFixed(2)} دونم (${f.areaM2.toFixed(0)} م²)`;
        else if (f.lengthM) metricsStr = this.formatLength(f.lengthM);

        html += `
          <div class="p-2.5 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors feature-item-card" data-id="${f.id}">
            <div class="flex items-center gap-2 overflow-hidden cursor-pointer" onclick="window.AtlasDrawingEngine.zoomToFeature('${f.id}')">
              <span class="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0" style="background-color: ${f.color || '#3b82f6'};">
                <i class="fa-solid ${typeInfo.icon} text-[10px]"></i>
              </span>
              <div class="truncate">
                <div class="font-bold text-slate-200 truncate">${f.name}</div>
                <div class="text-[10px] text-slate-400 font-mono">${metricsStr}</div>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button onclick="window.AtlasDrawingEngine.renameFeature('${f.id}')" class="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white" title="تعديل الاسم">
                <i class="fa-solid fa-pen text-[10px]"></i>
              </button>
              <button onclick="window.AtlasDrawingEngine.zoomToFeature('${f.id}')" class="p-1.5 rounded hover:bg-slate-700 text-sky-400 hover:text-sky-300" title="التركيز على الخريطة">
                <i class="fa-solid fa-crosshairs text-[10px]"></i>
              </button>
              <button onclick="window.AtlasDrawingEngine.deleteFeature('${f.id}')" class="p-1.5 rounded hover:bg-slate-700 text-rose-400 hover:text-rose-300" title="حذف">
                <i class="fa-solid fa-trash text-[10px]"></i>
              </button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    _highlightFeatureInList(id) {
      document.querySelectorAll('.feature-item-card').forEach(card => {
        if (card.getAttribute('data-id') === id) {
          card.classList.add('border-emerald-500', 'bg-slate-800');
        } else {
          card.classList.remove('border-emerald-500', 'bg-slate-800');
        }
      });
    }

    _updateToolbarUiState() {
      const toolButtons = document.querySelectorAll('.draw-tool-btn');
      toolButtons.forEach(btn => {
        const mode = btn.getAttribute('data-draw-mode');
        if (mode === this.activeMode) {
          btn.classList.add('bg-emerald-600', 'text-white', 'border-emerald-400');
          btn.classList.remove('bg-slate-800', 'text-slate-300');
        } else {
          btn.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-400');
          btn.classList.add('bg-slate-800', 'text-slate-300');
        }
      });
    }

    _updateVisibilityUi() {
      const toggleBtns = document.querySelectorAll('.toggle-drawing-layer-btn');
      toggleBtns.forEach(btn => {
        if (this.isLayerVisible) {
          btn.classList.add('text-emerald-400');
          btn.classList.remove('text-slate-500');
          btn.setAttribute('title', 'إخفاء طبقة الرسوم');
        } else {
          btn.classList.remove('text-emerald-400');
          btn.classList.add('text-slate-500');
          btn.setAttribute('title', 'إظهار طبقة الرسوم');
        }
      });
    }

    _setupUiHooks() {
      // Connect file input for GeoJSON import
      const fileInput = document.getElementById('drawGeoJsonFileInput');
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            this.importGeoJsonFile(e.target.files[0]);
            e.target.value = '';
          }
        });
      }

      // Settings: Color Picker
      const colorInput = document.getElementById('drawActiveColor');
      if (colorInput) {
        colorInput.addEventListener('input', (e) => {
          this.currentSettings.color = e.target.value;
          this.currentSettings.fillColor = e.target.value;
        });
      }

      // Color Swatch buttons
      const swatches = document.querySelectorAll('.draw-color-swatch');
      swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
          const col = swatch.getAttribute('data-color');
          if (col) {
            this.currentSettings.color = col;
            this.currentSettings.fillColor = col;
            if (colorInput) colorInput.value = col;
            swatches.forEach(s => s.classList.remove('ring-2', 'ring-white', 'scale-110'));
            swatch.classList.add('ring-2', 'ring-white', 'scale-110');
          }
        });
      });

      // Settings: Street Width
      const streetWidthSelect = document.getElementById('drawStreetWidthSelect');
      if (streetWidthSelect) {
        streetWidthSelect.addEventListener('change', (e) => {
          this.currentSettings.streetWidth = parseFloat(e.target.value) || 15;
        });
      }

      // Settings: Street Type
      const streetTypeSelect = document.getElementById('drawStreetTypeSelect');
      if (streetTypeSelect) {
        streetTypeSelect.addEventListener('change', (e) => {
          this.currentSettings.streetType = e.target.value;
        });
      }

      // Settings: Building Floors
      const buildingFloorsInput = document.getElementById('drawBuildingFloorsInput');
      if (buildingFloorsInput) {
        buildingFloorsInput.addEventListener('change', (e) => {
          this.currentSettings.buildingFloors = parseInt(e.target.value, 10) || 2;
        });
      }

      // Settings: Building Usage
      const buildingUsageSelect = document.getElementById('drawBuildingUsageSelect');
      if (buildingUsageSelect) {
        buildingUsageSelect.addEventListener('change', (e) => {
          this.currentSettings.buildingUsage = e.target.value;
        });
      }

      // Settings: Block Zone
      const blockZoneSelect = document.getElementById('drawBlockZoneSelect');
      if (blockZoneSelect) {
        blockZoneSelect.addEventListener('change', (e) => {
          this.currentSettings.blockZone = e.target.value;
        });
      }

      // Settings: POI Category
      const poiCategorySelect = document.getElementById('drawPoiCategorySelect');
      if (poiCategorySelect) {
        poiCategorySelect.addEventListener('change', (e) => {
          this.currentSettings.poiCategory = e.target.value;
        });
      }
    }

    _showFloatingTip(msg) {
      let tip = document.getElementById('drawingHelpTip');
      if (!tip) {
        tip = document.createElement('div');
        tip.id = 'drawingHelpTip';
        tip.className = 'fixed bottom-14 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-amber-300 text-xs px-4 py-2 rounded-xl border border-amber-500/50 shadow-2xl pointer-events-none flex items-center gap-2 transition-all';
        document.body.appendChild(tip);
      }
      tip.innerHTML = `<i class="fa-solid fa-circle-info text-amber-400"></i><span>${msg}</span><span class="text-slate-500 text-[10px] mr-2">(اضغط Esc للإلغاء)</span>`;
      tip.style.display = 'flex';
    }

    _hideFloatingTip() {
      const tip = document.getElementById('drawingHelpTip');
      if (tip) tip.style.display = 'none';
    }

    _updateLiveCursorTooltip(point, html) {
      let tt = document.getElementById('drawingCursorTooltip');
      if (!tt) {
        tt = document.createElement('div');
        tt.id = 'drawingCursorTooltip';
        tt.className = 'fixed z-50 pointer-events-none bg-slate-950/90 text-white text-[11px] font-mono px-2.5 py-1 rounded-lg border border-slate-700 shadow-xl transition-none leading-snug';
        document.body.appendChild(tt);
      }
      tt.innerHTML = html;
      tt.style.left = (point.x + 18) + 'px';
      tt.style.top = (point.y - 12) + 'px';
      tt.style.display = 'block';
    }

    _hideLiveCursorTooltip() {
      const tt = document.getElementById('drawingCursorTooltip');
      if (tt) tt.style.display = 'none';
    }

    _showToast(msg, type = 'info') {
      if (typeof window.showToast === 'function') {
        window.showToast(msg, type);
      } else {
        console.log(`[Toast ${type}]: ${msg}`);
      }
    }
  }

  // Global Engine Instance
  window.AtlasDrawingEngine = new AtlasDrawingEngine();

  // Helper Global Wrappers for Inline HTML buttons
  window.setDrawingMode = function (mode) {
    if (window.AtlasDrawingEngine) {
      window.AtlasDrawingEngine.setMode(mode);
    }
  };

  window.toggleDrawingMode = function () {
    const bar = document.getElementById('floatingDrawToolbar');
    if (bar) {
      bar.classList.toggle('hidden');
    }
    // Also switch to Drawing tab in sidebar if open
    const drawTabBtn = document.querySelector('.sidebar-tab-btn[data-tab="draw"]');
    if (drawTabBtn) {
      drawTabBtn.click();
    }
  };

  window.toggleDrawingLayerVisibility = function () {
    if (window.AtlasDrawingEngine) {
      window.AtlasDrawingEngine.toggleLayerVisibility();
    }
  };

  window.exportDrawnFeatures = function () {
    if (window.AtlasDrawingEngine) {
      window.AtlasDrawingEngine.exportGeoJson();
    }
  };

  window.clearAllDrawnFeatures = function () {
    if (window.AtlasDrawingEngine) {
      window.AtlasDrawingEngine.clearAllFeatures();
    }
  };

  window.finishCurrentDrawing = function () {
    if (window.AtlasDrawingEngine) {
      window.AtlasDrawingEngine.finishCurrentDrawing();
    }
  };

  window.undoLastDrawingVertex = function () {
    if (window.AtlasDrawingEngine) {
      window.AtlasDrawingEngine.undoLastVertex();
    }
  };

  window.cancelActiveDrawing = function () {
    if (window.AtlasDrawingEngine) {
      window.AtlasDrawingEngine.cancelCurrentDrawing();
      window.AtlasDrawingEngine.setMode(null);
    }
  };

  // Auto-init if map is already available on window
  if (typeof window !== 'undefined') {
    if (window.map) {
      window.AtlasDrawingEngine.init(window.map);
    } else if (window.atlasMap) {
      window.AtlasDrawingEngine.init(window.atlasMap);
    }
  }

})(window);
