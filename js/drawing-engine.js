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
  const STORAGE_KEY = 'ATLAS_URBAN_DRAWING_FEATURES_V2';

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

      // Create feature group for drawn elements
      this.featureGroup = L.featureGroup().addTo(this.map);
      this.tempLayerGroup = L.featureGroup().addTo(this.map);

      // Bind Map Events
      this.map.on('click', this._onMapClick);
      this.map.on('mousemove', this._onMapMouseMove);
      this.map.on('dblclick', this._onMapDblClick);
      window.addEventListener('keydown', this._onKeyDown);

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
      this.cancelCurrentDrawing();

      if (this.activeMode === mode) {
        // Toggle off if same mode clicked
        this.activeMode = null;
      } else {
        this.activeMode = mode;
      }

      this._updateToolbarUiState();

      if (this.activeMode) {
        L.DomUtil.addClass(this.map.getContainer(), 'drawing-crosshair-mode');
        this._showFloatingTip(this._getModeHelpText(this.activeMode));
      } else {
        L.DomUtil.removeClass(this.map.getContainer(), 'drawing-crosshair-mode');
        this._hideFloatingTip();
      }
    }

    _getModeHelpText(mode) {
      switch (mode) {
        case 'street':
          return 'انقر على الخريطة لرسم مسار الشارع. انقر نقراً مزدوجاً لإنهاء المسار.';
        case 'block':
          return 'انقر لتحديد زوايا البلوك السكني. انقر نقراً مزدوجاً لإغلاق المضلع وحساب المساحة.';
        case 'building':
          return 'انقر لتحديد أركان المبنى (أو نقطتين لمستطيل). انقر نقراً مزدوجاً لإنهاء المبنى.';
        case 'line':
          return 'انقر لرسم المسار الخطي الخدمي. انقر نقراً مزدوجاً للإنهاء.';
        case 'point':
          return 'انقر على الخريطة لوضع علامة المعلم أو نقطة الاهتمام.';
        case 'label':
          return 'انقر على الخريطة لتثبيت نص توضيحي.';
        case 'edit':
          return 'انقر على أي عنصر مرسوم لتعديل رؤوسه ومساره.';
        default:
          return '';
      }
    }

    /**
     * Map Click Event Dispatcher
     */
    _handleMapClick(e) {
      if (!this.activeMode) return;
      const latlng = e.latlng;

      if (this.activeMode === 'point') {
        this._createPointFeature(latlng);
        return;
      }

      if (this.activeMode === 'label') {
        this._createLabelFeature(latlng);
        return;
      }

      if (this.activeMode === 'edit') {
        return;
      }

      // Polyline / Polygon Drawing Process
      this.drawingPoints.push(latlng);

      // Create vertex marker
      const vMarker = L.circleMarker(latlng, {
        radius: 5,
        color: '#ffffff',
        weight: 2,
        fillColor: this.currentSettings.color,
        fillOpacity: 1
      }).addTo(this.tempLayerGroup);
      this.tempVertexMarkers.push(vMarker);

      // Update Temporary Layers
      if (this.activeMode === 'street' || this.activeMode === 'line') {
        if (!this.tempPolyline) {
          this.tempPolyline = L.polyline(this.drawingPoints, {
            color: this.currentSettings.color,
            weight: this.activeMode === 'street' ? 6 : 3,
            dashArray: this.activeMode === 'line' ? '6,6' : null,
            opacity: 0.9
          }).addTo(this.tempLayerGroup);
        } else {
          this.tempPolyline.setLatLngs(this.drawingPoints);
        }
      } else if (this.activeMode === 'block' || this.activeMode === 'building') {
        if (!this.tempPolygon) {
          this.tempPolygon = L.polygon(this.drawingPoints, {
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
    }

    /**
     * Map MouseMove Handler (Rubberband preview & dynamic readout)
     */
    _handleMapMouseMove(e) {
      if (!this.activeMode || this.drawingPoints.length === 0) return;
      const curLatLng = e.latlng;
      const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];

      // Update Rubberband line from last placed point to mouse cursor
      if (!this.tempRubberband) {
        this.tempRubberband = L.polyline([lastPoint, curLatLng], {
          color: this.currentSettings.color,
          weight: 2,
          dashArray: '4, 4',
          opacity: 0.7
        }).addTo(this.tempLayerGroup);
      } else {
        this.tempRubberband.setLatLngs([lastPoint, curLatLng]);
      }

      // Live Tooltip following mouse cursor
      const ptsWithCursor = [...this.drawingPoints, curLatLng];
      let readoutText = '';

      if (this.activeMode === 'street' || this.activeMode === 'line') {
        const lengthM = this.computePolylineLength(ptsWithCursor);
        readoutText = `الطول: ${this.formatLength(lengthM)}`;
      } else if (this.activeMode === 'block' || this.activeMode === 'building') {
        if (ptsWithCursor.length >= 3) {
          const areaM2 = this.computePolygonArea(ptsWithCursor);
          const perimM = this.computePolylineLength([...ptsWithCursor, ptsWithCursor[0]]);
          readoutText = `المساحة: ${this.formatArea(areaM2)}<br>المحيط: ${this.formatLength(perimM)}`;
        } else {
          const segM = this.map.distance(lastPoint, curLatLng);
          readoutText = `المسافة: ${this.formatLength(segM)}`;
        }
      }

      this._updateLiveCursorTooltip(e.containerPoint, readoutText);
    }

    /**
     * Map Double Click Handler (Finish Polygon / Line)
     */
    _handleMapDblClick(e) {
      if (!this.activeMode) return;
      L.DomEvent.stop(e); // Prevent map zoom on double click

      if (this.activeMode === 'street' || this.activeMode === 'line') {
        if (this.drawingPoints.length >= 2) {
          this._finalizeLineFeature();
        }
      } else if (this.activeMode === 'block' || this.activeMode === 'building') {
        if (this.drawingPoints.length >= 3) {
          this._finalizePolygonFeature();
        }
      }
    }

    /**
     * Keyboard Shortcuts (Esc = Cancel, Backspace = Undo Last Point)
     */
    _handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (this.drawingPoints.length > 0) {
          this.cancelCurrentDrawing();
        } else if (this.activeMode) {
          this.setMode(null);
        }
      } else if (e.key === 'Backspace' && this.drawingPoints.length > 0) {
        // Prevent browser navigation and remove last point
        e.preventDefault();
        this._undoLastVertex();
      }
    }

    _undoLastVertex() {
      if (this.drawingPoints.length === 0) return;
      this.drawingPoints.pop();
      const lastMarker = this.tempVertexMarkers.pop();
      if (lastMarker) this.tempLayerGroup.removeLayer(lastMarker);

      if (this.drawingPoints.length === 0) {
        this.cancelCurrentDrawing();
        return;
      }

      if (this.tempPolyline) this.tempPolyline.setLatLngs(this.drawingPoints);
      if (this.tempPolygon) this.tempPolygon.setLatLngs(this.drawingPoints);
      if (this.tempRubberband) {
        this.tempLayerGroup.removeLayer(this.tempRubberband);
        this.tempRubberband = null;
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
      this._showToast(`✅ تم إنشاء ${name} بمساحة ${this.formatArea(areaM2)}`, 'success');
    }

    /**
     * Create Point Feature (Marker / POI)
     */
    _createPointFeature(latlng) {
      const id = 'feat_' + Date.now();
      const count = this.features.filter(f => f.type === 'point').length + 1;
      const name = `${this.currentSettings.poiCategory} رقم ${count}`;

      const featureData = {
        id,
        type: 'point',
        name,
        color: this.currentSettings.color,
        points: [{ lat: latlng.lat, lng: latlng.lng }],
        properties: {
          category: this.currentSettings.poiCategory,
          createdDate: new Date().toISOString()
        }
      };

      this._addFeatureToMap(featureData);
      this.saveToStorage();
      this.updateStatsUi();
      this._showToast(`✅ تم تثبيت ${name} على الخارطة`, 'success');
    }

    /**
     * Create Label Feature
     */
    _createLabelFeature(latlng) {
      const text = prompt('أدخل النص التوضيحي أو اسم المعلم:', 'حي القادسية');
      if (!text || text.trim() === '') return;

      const id = 'feat_' + Date.now();
      const featureData = {
        id,
        type: 'label',
        name: text.trim(),
        color: this.currentSettings.color,
        points: [{ lat: latlng.lat, lng: latlng.lng }],
        properties: {
          text: text.trim(),
          createdDate: new Date().toISOString()
        }
      };

      this._addFeatureToMap(featureData);
      this.saveToStorage();
      this.updateStatsUi();
      this._showToast(`✅ تم إضافة التسمية: ${text}`, 'success');
    }

    /**
     * Add Feature Object to Leaflet Map with interactive popup & events
     */
    _addFeatureToMap(f) {
      let layer;

      if (f.type === 'street' || f.type === 'line') {
        const latlngs = f.points.map(p => L.latLng(p.lat, p.lng));
        layer = L.polyline(latlngs, {
          color: f.color || '#f59e0b',
          weight: f.weight || (f.type === 'street' ? 6 : 3),
          dashArray: f.dashArray || null,
          opacity: 0.95
        });

      } else if (f.type === 'block' || f.type === 'building') {
        const latlngs = f.points.map(p => L.latLng(p.lat, p.lng));
        layer = L.polygon(latlngs, {
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
        layer = L.marker([p.lat, p.lng], { icon: customIcon });

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
        layer = L.marker([p.lat, p.lng], { icon: labelIcon });
      }

      if (!layer) return;

      f.layer = layer;
      layer._featureData = f;

      // Popup Content
      layer.bindPopup(() => this._generateFeaturePopup(f), { maxWidth: 320 });

      // Click event
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        this.selectedFeature = f;
        this._highlightFeatureInList(f.id);
      });

      this.featureGroup.addLayer(layer);
      if (!this.features.some(item => item.id === f.id)) {
        this.features.push(f);
      }
    }

    /**
     * Generate ESRI-styled Popup for Feature
     */
    _generateFeaturePopup(f) {
      const typeInfo = FEATURE_TYPES[f.type] || { name: f.type, icon: 'fa-vector-square' };
      let metricsHtml = '';

      if (f.areaM2) {
        const dunams = (f.areaM2 / IRAQI_DUNAM_SQM).toFixed(2);
        const hectares = (f.areaM2 / HECTARE_SQM).toFixed(2);
        metricsHtml += `
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1">
            <span class="text-slate-400">المساحة السطحية:</span>
            <span class="font-bold text-emerald-400 font-mono">${f.areaM2.toLocaleString('ar-IQ', { maximumFractionDigits: 1 })} م²</span>
          </div>
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1">
            <span class="text-slate-400">بالدونم العراقي:</span>
            <span class="font-bold text-amber-300 font-mono">${dunams} دونم</span>
          </div>
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1">
            <span class="text-slate-400">المحيط الخارجي:</span>
            <span class="font-bold text-sky-300 font-mono">${this.formatLength(f.perimeterM)}</span>
          </div>
        `;
      }

      if (f.lengthM) {
        metricsHtml += `
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1">
            <span class="text-slate-400">الطول الإجمالي:</span>
            <span class="font-bold text-amber-300 font-mono">${this.formatLength(f.lengthM)}</span>
          </div>
        `;
      }

      if (f.properties && f.properties.streetWidth) {
        metricsHtml += `
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1">
            <span class="text-slate-400">عرض الشارع:</span>
            <span class="font-bold text-slate-200 font-mono">${f.properties.streetWidth} متر</span>
          </div>
        `;
      }

      if (f.properties && f.properties.floors) {
        metricsHtml += `
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1">
            <span class="text-slate-400">عدد الطوابق:</span>
            <span class="font-bold text-slate-200 font-mono">${f.properties.floors} طابق</span>
          </div>
        `;
      }

      return `
        <div class="p-2 space-y-2.5 text-right font-sans min-w-[240px]">
          <div class="flex items-center justify-between border-b border-slate-700 pb-2">
            <div class="flex items-center gap-1.5 font-bold text-white text-xs">
              <i class="fa-solid ${typeInfo.icon} text-amber-400"></i>
              <span>${f.name}</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              ${typeInfo.name}
            </span>
          </div>

          <div class="space-y-1.5 text-xs text-slate-300">
            ${metricsHtml}
          </div>

          <div class="flex items-center gap-1.5 pt-1 border-t border-slate-700">
            <button onclick="window.AtlasDrawingEngine.renameFeature('${f.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors flex items-center gap-1">
              <i class="fa-solid fa-pen text-[10px]"></i>
              <span>تسمية</span>
            </button>
            <button onclick="window.AtlasDrawingEngine.zoomToFeature('${f.id}')" class="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 rounded text-[11px] font-medium transition-colors flex items-center gap-1">
              <i class="fa-solid fa-crosshairs text-[10px]"></i>
              <span>تركيز</span>
            </button>
            <button onclick="window.AtlasDrawingEngine.deleteFeature('${f.id}')" class="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded text-[11px] font-medium transition-colors mr-auto flex items-center gap-1">
              <i class="fa-solid fa-trash text-[10px]"></i>
              <span>حذف</span>
            </button>
          </div>
        </div>
      `;
    }

    /**
     * Rename Feature
     */
    renameFeature(id) {
      const feat = this.features.find(f => f.id === id);
      if (!feat) return;
      const newName = prompt('تعديل اسم العنصر:', feat.name);
      if (newName && newName.trim() !== '') {
        feat.name = newName.trim();
        if (feat.layer) {
          feat.layer.closePopup();
        }
        this.saveToStorage();
        this.updateStatsUi();
        this._showToast(`✅ تم تحديث الاسم إلى: ${feat.name}`, 'success');
      }
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
     * Delete Feature
     */
    deleteFeature(id) {
      const idx = this.features.findIndex(f => f.id === id);
      if (idx === -1) return;
      const feat = this.features[idx];

      if (feat.layer) {
        this.featureGroup.removeLayer(feat.layer);
      }
      this.features.splice(idx, 1);
      this.saveToStorage();
      this.updateStatsUi();
      this._showToast('🗑️ تم حذف العنصر بنجاح', 'info');
    }

    /**
     * Clear all drawn features with confirmation
     */
    clearAllFeatures() {
      if (this.features.length === 0) return;
      if (!confirm('هل أنت متأكد من رغبتك في حذف جميع الرسوم والشوارع والبلوكات والمباني؟')) return;

      this.featureGroup.clearLayers();
      this.features = [];
      this.cancelCurrentDrawing();
      this.saveToStorage();
      this.updateStatsUi();
      this._showToast('🗑️ تم مسح كافة الرسوم من الخارطة', 'warning');
    }

    /**
     * Toggle entire drawing layer visibility on/off
     */
    toggleLayerVisibility() {
      this.isLayerVisible = !this.isLayerVisible;
      if (this.isLayerVisible) {
        this.map.addLayer(this.featureGroup);
      } else {
        this.map.removeLayer(this.featureGroup);
      }
      this._updateVisibilityUi();
      return this.isLayerVisible;
    }

    /**
     * Cancel ongoing drawing action
     */
    cancelCurrentDrawing() {
      this.drawingPoints = [];
      this.tempLayerGroup.clearLayers();
      this.tempPolyline = null;
      this.tempPolygon = null;
      this.tempRubberband = null;
      this.tempVertexMarkers = [];
      this._hideLiveCursorTooltip();
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

})(window);
