/**
 * ============================================================================
 * ArcGIS Living Atlas of Iraq - Map Legend Manager (مدير مفتاح الخريطة والرموز الكارتوغرافية)
 * 
 * Features:
 *  - Dynamic visual legend explaining all symbols, colors, strokes, and shapes
 *  - Real-time CAD & Urban Drawings inspection (Streets, Blocks, Buildings, Lines, Points, Labels)
 *  - Active Basemap readout with accurate cartographic attribution
 *  - Official Archaeological Sites of Iraq symbology
 *  - ERDAS IMAGINE satellite & calibrated raster overlays status
 *  - Active Living Atlas thematic layers integration
 *  - Full integration with Top Navigation Bar button (#toggleLegendBtn)
 * ============================================================================
 */

(function () {
  'use strict';

  class MapLegendManager {
    constructor() {
      this.panel = null;
      this.content = null;
      this.toggleBtn = null;
      this.isOpen = false;
      this._initialized = false;
      this._refreshTimer = null;
    }

    init() {
      if (this._initialized) return;

      this.panel = document.getElementById('legendPanel');
      this.content = document.getElementById('legendContent');
      this.toggleBtn = document.getElementById('toggleLegendBtn');
      const closeBtn = document.getElementById('closeLegendBtn');
      const refreshBtn = document.getElementById('refreshLegendBtn');

      if (this.toggleBtn) {
        this.toggleBtn.onclick = (e) => {
          e.preventDefault();
          this.toggle();
        };
      }

      if (closeBtn) {
        closeBtn.onclick = (e) => {
          e.preventDefault();
          this.close();
        };
      }

      if (refreshBtn) {
        refreshBtn.onclick = (e) => {
          e.preventDefault();
          this.render();
        };
      }

      this._initialized = true;
      console.log('🗺️ AtlasLegendManager: Map Legend Engine initialized successfully.');
    }

    toggle() {
      this.init();
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.init();
      if (!this.panel) return;
      this.panel.classList.remove('hidden');
      this.isOpen = true;

      if (this.toggleBtn) {
        this.toggleBtn.classList.add('bg-emerald-600/40', 'border-emerald-400', 'text-white', 'shadow-md', 'shadow-emerald-950/50');
      }

      this.render();

      // Poll periodically while open to stay updated with drawing changes
      if (!this._refreshTimer) {
        this._refreshTimer = setInterval(() => {
          if (this.isOpen) this.render();
        }, 3000);
      }
    }

    close() {
      if (!this.panel) return;
      this.panel.classList.add('hidden');
      this.isOpen = false;

      if (this.toggleBtn) {
        this.toggleBtn.classList.remove('bg-emerald-600/40', 'border-emerald-400', 'text-white', 'shadow-md', 'shadow-emerald-950/50');
      }

      if (this._refreshTimer) {
        clearInterval(this._refreshTimer);
        this._refreshTimer = null;
      }
    }

    /**
     * Render complete dynamic cartographic legend
     */
    render() {
      if (!this.content) return;

      const html = [];

      // 1. Current Basemap Details
      html.push(this._renderBasemapSection());

      // 2. CAD & Urban Drawing Features
      html.push(this._renderDrawingSection());

      // 3. Official Iraq Archaeological & Heritage Sites
      html.push(this._renderArchaeologySection());

      // 4. ERDAS IMAGINE & Calibrated Map Overlays
      html.push(this._renderOverlaysSection());

      // 5. Active Thematic Atlas Layers
      html.push(this._renderActiveLayersSection());

      // 6. Educational Note on Map Legend Utility
      html.push(this._renderEducationalFooter());

      this.content.innerHTML = html.join('');
    }

    _renderBasemapSection() {
      let bId = 'satellite';
      if (window.atlasState && window.atlasState.currentBasemapId) {
        bId = window.atlasState.currentBasemapId;
      } else if (window.AtlasLayoutStudio && window.AtlasLayoutStudio.options) {
        bId = window.AtlasLayoutStudio.options.basemapType || 'satellite';
      }

      const basemapMeta = {
        'satellite': { title: 'صور أقمار صناعية فائقة الدقة', desc: 'ArcGIS Living Atlas World Imagery (دقة بكسل سنتيمترية)', icon: 'fa-satellite', color: 'text-amber-400' },
        'hybrid': { title: 'قمر صناعي هجين مع أسماء المعالم', desc: 'ArcGIS World Imagery + Labels & Road Networks', icon: 'fa-earth-americas', color: 'text-emerald-400' },
        'streets': { title: 'خارطة الشوارع والتنقل المعتمدة', desc: 'ArcGIS World Street Map (عناوين وتقاطعات وشبكات نقل)', icon: 'fa-road', color: 'text-blue-400' },
        'topo': { title: 'الخارطة الطبوغرافية والتضاريس', desc: 'ArcGIS World Topographic (خطوط الكنتور والإغاثة الجبلية)', icon: 'fa-mountain-sun', color: 'text-emerald-400' },
        'dark-gray': { title: 'اللوحة الكارتوغرافية الداكنة', desc: 'ArcGIS Dark Gray Canvas (إبراز عالي التباين للبيانات والرسوم)', icon: 'fa-moon', color: 'text-slate-300' },
        'light': { title: 'اللوحة الكارتوغرافية الفاتحة', desc: 'ArcGIS Light Gray Canvas (طباعة ومخططات هندسية ورقية)', icon: 'fa-sun', color: 'text-amber-300' },
        'osm': { title: 'خارطة الشوارع المفتوحة (OSM)', desc: 'OpenStreetMap Global Vector Contributors', icon: 'fa-map', color: 'text-teal-400' },
        'grid': { title: 'شبكة الإسناد الكارتوغرافي النظيفة', desc: 'Engineering CAD Grid / WGS 84 Graticule', icon: 'fa-border-none', color: 'text-cyan-400' }
      }[bId] || { title: 'خارطة أساس قياسية', desc: 'ArcGIS Online Basemap Service', icon: 'fa-map', color: 'text-blue-400' };

      return `
        <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
              <i class="fa-solid fa-map text-blue-400 text-xs"></i>
              <span>خارطة الأساس الحالية (Base Map)</span>
            </span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">نشطة</span>
          </div>
          <div class="flex items-start gap-2 pt-0.5">
            <div class="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
              <i class="fa-solid ${basemapMeta.icon} ${basemapMeta.color} text-xs"></i>
            </div>
            <div>
              <div class="font-bold text-slate-100 text-xs leading-tight">${basemapMeta.title}</div>
              <div class="text-[10px] text-slate-400 leading-snug mt-0.5">${basemapMeta.desc}</div>
            </div>
          </div>
        </div>
      `;
    }

    _renderDrawingSection() {
      const engine = window.AtlasDrawingEngine;
      const features = (engine && engine.features) || [];

      // Group counts
      const counts = { street: 0, block: 0, building: 0, line: 0, point: 0, label: 0 };
      let totalStreetLen = 0;
      let totalBlockArea = 0;
      let totalBuildingArea = 0;

      features.forEach(f => {
        if (!f) return;
        if (counts[f.type] !== undefined) counts[f.type]++;
        if (f.type === 'street' || f.type === 'line') {
          totalStreetLen += (f.lengthM || 0);
        } else if (f.type === 'block') {
          totalBlockArea += (f.areaM2 || 0);
        } else if (f.type === 'building') {
          totalBuildingArea += (f.areaM2 || 0);
        }
      });

      const totalFeatures = features.length;

      return `
        <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
              <i class="fa-solid fa-pen-ruler text-teal-400 text-xs"></i>
              <span>رموز التخطيط الحضري والرسم (CAD & GIS)</span>
            </span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
              ${totalFeatures} ${totalFeatures === 1 ? 'معلم' : 'معالم'}
            </span>
          </div>

          <div class="grid grid-cols-1 gap-1.5 pt-0.5">
            <!-- 1. Blocks -->
            <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div class="flex items-center gap-2">
                <span class="inline-block w-4 h-3.5 rounded bg-blue-500/50 border border-blue-400 shrink-0"></span>
                <div>
                  <div class="font-bold text-slate-200 text-[11px]">البلوكات السكنية والعقارية (Cadastral Blocks)</div>
                  <div class="text-[10px] text-slate-400">مضلعات تقسيم عقاري وإفراز بلدي</div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-[11px] font-mono font-bold text-blue-300">${counts.block}</span>
                ${totalBlockArea > 0 ? `<div class="text-[9px] text-slate-400 font-mono">${Math.round(totalBlockArea).toLocaleString()} م²</div>` : ''}
              </div>
            </div>

            <!-- 2. Buildings -->
            <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div class="flex items-center gap-2">
                <span class="inline-block w-4 h-3.5 rounded bg-emerald-500/50 border border-emerald-400 shrink-0"></span>
                <div>
                  <div class="font-bold text-slate-200 text-[11px]">الأبنية والمنشآت الحضرية (Buildings)</div>
                  <div class="text-[10px] text-slate-400">كتل معمارية متعددة الاستخدام والطوابق</div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-[11px] font-mono font-bold text-emerald-300">${counts.building}</span>
                ${totalBuildingArea > 0 ? `<div class="text-[9px] text-slate-400 font-mono">${Math.round(totalBuildingArea).toLocaleString()} م²</div>` : ''}
              </div>
            </div>

            <!-- 3. Streets -->
            <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div class="flex items-center gap-2">
                <div class="w-4 flex flex-col items-center justify-center shrink-0">
                  <span class="w-4 h-1 bg-amber-500 rounded border border-slate-900"></span>
                </div>
                <div>
                  <div class="font-bold text-slate-200 text-[11px]">الشوارع والشبكات الطرقية (Arterial Streets)</div>
                  <div class="text-[10px] text-slate-400">محاور الحركة والتنقل بعروض قياسية</div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-[11px] font-mono font-bold text-amber-300">${counts.street}</span>
                ${totalStreetLen > 0 ? `<div class="text-[9px] text-slate-400 font-mono">${Math.round(totalStreetLen).toLocaleString()} م</div>` : ''}
              </div>
            </div>

            <!-- 4. Service Lines -->
            <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div class="flex items-center gap-2">
                <div class="w-4 flex items-center justify-center shrink-0">
                  <span class="w-4 h-0.5 border-b-2 border-dashed border-purple-400"></span>
                </div>
                <div>
                  <div class="font-bold text-slate-200 text-[11px]">المسارات والشبكات الخدمية (Utility Lines)</div>
                  <div class="text-[10px] text-slate-400">بنى تحتية، كهرباء، ماء، خطوط متقطعة</div>
                </div>
              </div>
              <span class="text-[11px] font-mono font-bold text-purple-300">${counts.line}</span>
            </div>

            <!-- 5. Points -->
            <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div class="flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 border border-white shrink-0"></span>
                <div>
                  <div class="font-bold text-slate-200 text-[11px]">محطات ونقاط الضبط (Control Points)</div>
                  <div class="text-[10px] text-slate-400">إحداثيات مساحية ومعالم محددة بدقة</div>
                </div>
              </div>
              <span class="text-[11px] font-mono font-bold text-red-400">${counts.point}</span>
            </div>

            <!-- 6. Labels -->
            <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div class="flex items-center gap-2">
                <span class="inline-block px-1 py-0.5 rounded bg-slate-800 border border-cyan-400 text-cyan-300 text-[9px] font-bold shrink-0">Aa</span>
                <div>
                  <div class="font-bold text-slate-200 text-[11px]">التسميات والنصوص المكانية (Labels)</div>
                  <div class="text-[10px] text-slate-400">عناوين الأحياء والمنشآت على الخارطة</div>
                </div>
              </div>
              <span class="text-[11px] font-mono font-bold text-cyan-300">${counts.label}</span>
            </div>
          </div>

          <div class="pt-1 flex items-center justify-end">
            <button type="button" onclick="window.toggleDrawingMode()" class="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer">
              <i class="fa-solid fa-pen"></i>
              <span>فتح شريط أدوات الرسم والتعديل</span>
            </button>
          </div>
        </div>
      `;
    }

    _renderArchaeologySection() {
      const isArchActive = window.atlasState && window.atlasState.layersMap && window.atlasState.layersMap.has('iraq-archaeology');

      return `
        <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
              <i class="fa-solid fa-landmark-dome text-amber-400 text-xs"></i>
              <span>المواقع الأثرية والتراثية (Archaeology)</span>
            </span>
            <span class="text-[9px] px-1.5 py-0.5 rounded ${isArchActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'} font-mono">
              ${isArchActive ? 'معروضة' : 'متوفرة'}
            </span>
          </div>
          <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-950 shadow-sm shrink-0 flex items-center justify-center">
                <span class="w-1 h-1 rounded-full bg-white"></span>
              </span>
              <div>
                <div class="font-bold text-amber-300 text-[11px]">موقع أثري وحضاري موثق</div>
                <div class="text-[10px] text-slate-400 leading-tight">سجل رسمي يشمل نينوى، أور، بابل، الحضر، النمرود، آشور، طاق كسرى</div>
              </div>
            </div>
            <button type="button" onclick="if(window.toggleLayer) { window.toggleLayer('iraq-archaeology', !${isArchActive}); if(window.AtlasLegendManager) window.AtlasLegendManager.render(); }" class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 shrink-0 cursor-pointer">
              ${isArchActive ? 'إخفاء' : 'إظهار'}
            </button>
          </div>
        </div>
      `;
    }

    _renderOverlaysSection() {
      const erdasState = window.AtlasErdasLoader && typeof window.AtlasErdasLoader.getState === 'function' ? window.AtlasErdasLoader.getState() : null;
      const hasErdas = erdasState && erdasState.overlayLayer;
      const hasCalib = window.calibOverlayInstance && window.isCalibOverlayVisible && window.isCalibOverlayVisible();

      if (!hasErdas && !hasCalib) return '';

      return `
        <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
          <span class="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
            <i class="fa-solid fa-satellite-dish text-purple-400 text-xs"></i>
            <span>المصورات الفضائية والمعايرة الجغرافية</span>
          </span>
          <div class="space-y-1 pt-0.5">
            ${hasErdas ? `
              <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]">
                <div class="flex items-center gap-2">
                  <span class="w-3.5 h-3.5 rounded bg-purple-500/30 border border-purple-400 flex items-center justify-center text-purple-300 text-[9px] shrink-0">
                    <i class="fa-solid fa-satellite"></i>
                  </span>
                  <div>
                    <div class="font-bold text-purple-300">خارطة ERDAS IMAGINE (.img / .ers)</div>
                    <div class="text-[10px] text-slate-400">${erdasState.fileName || 'مصور فضائي مرجع جغرافياً'}</div>
                  </div>
                </div>
                <span class="text-[10px] text-purple-300 font-mono">نشطة</span>
              </div>
            ` : ''}
            ${hasCalib ? `
              <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]">
                <div class="flex items-center gap-2">
                  <span class="w-3.5 h-3.5 rounded bg-cyan-500/30 border border-cyan-400 flex items-center justify-center text-cyan-300 text-[9px] shrink-0">
                    <i class="fa-solid fa-crosshairs"></i>
                  </span>
                  <div>
                    <div class="font-bold text-cyan-300">خارطة مصورة بمعايرة رباعية النقاط</div>
                    <div class="text-[10px] text-slate-400">إرجاع جغرافي مساحي معتمد</div>
                  </div>
                </div>
                <span class="text-[10px] text-cyan-300 font-mono">نشطة</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    _renderActiveLayersSection() {
      const activeLayers = [];
      if (window.atlasState && window.atlasState.layersMap) {
        window.atlasState.layersMap.forEach((layer, layerId) => {
          if (layerId === 'iraq-archaeology') return; // Handled separately
          const meta = (window.atlasState.layersMetadata && window.atlasState.layersMetadata.get(layerId)) || {};
          const isVis = window.map && window.map.hasLayer(layer);
          if (isVis) {
            activeLayers.push({ id: layerId, title: meta.title || layerId, category: meta.category || 'عام' });
          }
        });
      }

      if (activeLayers.length === 0) return '';

      return `
        <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
              <i class="fa-solid fa-layer-group text-blue-400 text-xs"></i>
              <span>طبقات أطلس العراق النشطة (${activeLayers.length})</span>
            </span>
          </div>
          <div class="space-y-1 pt-0.5">
            ${activeLayers.map(l => `
              <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-sm bg-blue-500 border border-blue-300 shrink-0"></span>
                  <span class="font-semibold text-slate-200">${l.title}</span>
                </div>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">${l.category}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    _renderEducationalFooter() {
      return `
        <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[10.5px] text-slate-300 space-y-1">
          <div class="font-bold text-emerald-300 flex items-center gap-1">
            <i class="fa-solid fa-circle-question text-emerald-400"></i>
            <span>فائدة مفتاح الخريطة (Map Legend):</span>
          </div>
          <p class="text-slate-300 leading-relaxed text-[10px]">
            يقوم مفتاح الخريطة بتفسير المعنى الهندسي والكارتوغرافي لكل لون ورمز وخيار على الخريطة (الشارع، البلوك، المنشأة، نوع الصورة الفضائية)، ويضمن قراءة المخطط وفهمه بدقة وفق المعايير المساحية والبلدية.
          </p>
        </div>
      `;
    }
  }

  // Global instance
  window.AtlasLegendManager = new MapLegendManager();

  // Auto-init on page ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AtlasLegendManager.init());
  } else {
    window.AtlasLegendManager.init();
  }
  window.addEventListener('load', () => window.AtlasLegendManager.init());

  // Global shortcut helper
  window.toggleMapLegend = function () {
    window.AtlasLegendManager.toggle();
  };

})();
