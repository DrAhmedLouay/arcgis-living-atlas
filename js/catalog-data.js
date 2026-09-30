/**
 * سجل طبقات ArcGIS Living Atlas المنسقة - إصدار العراق والشرق الأوسط
 * Curated ArcGIS Living Atlas Layer Registry - Iraq & Regional Edition
 */

const ATLAS_CATEGORIES = [
  { id: 'all', nameAr: 'جميع الطبقات', nameEn: 'All Layers', icon: 'fa-layer-group' },
  { id: 'iraq', nameAr: 'العراق وبلاد الرافدين', nameEn: 'Iraq Datasets', icon: 'fa-landmark' },
  { id: 'hazards', nameAr: 'الكوارث والمخاطر', nameEn: 'Hazards & Disasters', icon: 'fa-triangle-exclamation' },
  { id: 'environment', nameAr: 'البيئة والمناخ', nameEn: 'Environment & Climate', icon: 'fa-seedling' },
  { id: 'demographics', nameAr: 'السكان والتنمية', nameEn: 'Demographics & Urban', icon: 'fa-users' },
  { id: 'boundaries', nameAr: 'الحدود والمناطق', nameEn: 'Boundaries & Basemaps', icon: 'fa-earth-americas' }
];

const ATLAS_LAYERS = [
  // ==========================================
  // 1. العراق وبلاد الرافدين (Iraq Datasets)
  // ==========================================
  {
    id: 'iraq-archaeology',
    category: 'iraq',
    titleAr: 'المواقع الأثرية والتراث العالمي في العراق (UNESCO & SBAH)',
    titleEn: 'Archaeological & World Heritage Sites of Iraq',
    descriptionAr: 'قاعدة بيانات جغرافية رسمية ومحدثة (2025/2026) تضم مواقع التراث العالمي لليونسكو الـ 6، والقائمة التمهيدية لليونسكو الـ 15 (بما فيها عقرقوف المحدثة 2025)، والمعالم الأثرية المسجلة لدى الهيئة العامة للآثار والتراث (SBAH).',
    descriptionEn: 'Official and updated geospatial registry of UNESCO World Heritage Sites, UNESCO Tentative List, and State Board of Antiquities & Heritage (SBAH) monuments across Iraq.',
    provider: 'UNESCO World Heritage Centre • SBAH Iraq',
    updateFrequency: 'محدث رسمياً (2025/2026)',
    type: 'geojson',
    url: 'local://iraq-archaeology',
    icon: 'fa-monument',
    badge: 'آثار العراق • Official',
    badgeColor: 'amber',
    defaultOpacity: 1.0,
    defaultVisible: false,
    popupTemplate: {
      title: '{nameAr} ({nameEn})',
      content: [
        {
          type: 'fields',
          fieldInfos: [
            { fieldName: 'nameAr', label: 'الموقع الأثري' },
            { fieldName: 'ancientName', label: 'الاسم القديم' },
            { fieldName: 'governorate', label: 'المحافظة' },
            { fieldName: 'civilization', label: 'الحضارة / العصر' },
            { fieldName: 'unescoRef', label: 'رقم تسجيل اليونسكو / SBAH' }
          ]
        }
      ]
    }
  },
  {
    id: 'iraq-governorates',
    category: 'iraq',
    titleAr: 'محافظات جمهورية العراق (الحدود الإدارية الـ 18)',
    titleEn: 'Iraq Governorates (Admin Level 1)',
    descriptionAr: 'الحدود الإدارية الرسمية لجميع محافظات العراق الـ 18 مع أسماء المحافظات باللغة العربية والإنجليزية، والترميز الإداري.',
    descriptionEn: 'Official administrative boundaries for all 18 Iraqi governorates with bilingual names and spatial attributes.',
    provider: 'Team Europe Iraq / ArcGIS Living Atlas',
    updateFrequency: 'محدث رسمياً',
    type: 'feature',
    url: 'https://services-ap1.arcgis.com/dfHeRNZDcoQG1dWP/arcgis/rest/services/Iraq_Administrive_Layers_Simplified/FeatureServer/2',
    icon: 'fa-landmark-flag',
    badge: 'العراق • Iraq',
    badgeColor: 'emerald',
    defaultOpacity: 0.85,
    defaultVisible: false,
    popupTemplate: {
      title: 'محافظة: {ADM1_AR} ({ADM1_EN})',
      content: [
        {
          type: 'fields',
          fieldInfos: [
            { fieldName: 'ADM1_AR', label: 'اسم المحافظة (بالعربية)' },
            { fieldName: 'ADM1_EN', label: 'اسم المحافظة (بالإنجليزية)' },
            { fieldName: 'ADM1_PCODE', label: 'الرمز الإداري (PCODE)' },
            { fieldName: 'ADM0_AR', label: 'الدولة' }
          ]
        }
      ]
    }
  },
  {
    id: 'iraq-boundary',
    category: 'iraq',
    titleAr: 'الحدود السيادية لجمهورية العراق',
    titleEn: 'Republic of Iraq Sovereign Boundary',
    descriptionAr: 'النطاق الجغرافي والحدود الدولية الرسمية لجمهورية العراق.',
    descriptionEn: 'International sovereign boundaries of the Republic of Iraq and national extent.',
    provider: 'Team Europe Iraq / ArcGIS Living Atlas',
    updateFrequency: 'سنوي (Annual)',
    type: 'feature',
    url: 'https://services-ap1.arcgis.com/dfHeRNZDcoQG1dWP/arcgis/rest/services/Iraq_Administrive_Layers_Simplified/FeatureServer/1',
    icon: 'fa-shield-halved',
    badge: 'الحدود • National',
    badgeColor: 'blue',
    defaultOpacity: 0.95,
    defaultVisible: false,
    popupTemplate: {
      title: 'جمهورية العراق - {ADM0_EN}',
      content: [
        {
          type: 'fields',
          fieldInfos: [
            { fieldName: 'ADM0_AR', label: 'الدولة' },
            { fieldName: 'ADM0_EN', label: 'Country Name' },
            { fieldName: 'ADM0_PCODE', label: 'رمز الدولة' }
          ]
        }
      ]
    }
  },

  // ==========================================
  // 2. الكوارث والمخاطر (Hazards & Disasters)
  // ==========================================
  {
    id: 'usgs-earthquakes',
    category: 'hazards',
    titleAr: 'رصد الزلازل المباشر (USGS Live Feed)',
    titleEn: 'Global Earthquakes Live Feed',
    descriptionAr: 'بيانات حية ومباشرة للزلازل المسجلة حول العالم وفي نطاق حزام زاغروس والشرق الأوسط خلال آخر 30 يوماً من هيئة المساحة الجيولوجية الأمريكية (USGS).',
    descriptionEn: 'Real-time seismic events recorded by USGS over the past 30 days with magnitude, depth, and event time.',
    provider: 'USGS / Esri Living Atlas',
    updateFrequency: 'كل 5 دقائق (Live Feed)',
    type: 'feature',
    url: 'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USGS_Seismic_Data_v1/FeatureServer/0',
    icon: 'fa-wave-square',
    badge: 'مباشر • Live',
    badgeColor: 'red',
    defaultOpacity: 0.9,
    defaultVisible: false,
    popupTemplate: {
      title: 'زلزال بقوة {mag} - {place}',
      content: [
        {
          type: 'fields',
          fieldInfos: [
            { fieldName: 'mag', label: 'القوة (Magnitude)', format: { places: 1 } },
            { fieldName: 'depth', label: 'العمق (Depth km)', format: { places: 1 } },
            { fieldName: 'time', label: 'التاريخ والوقت', format: { dateFormat: 'short-date-short-time' } },
            { fieldName: 'felt', label: 'عدد البلاغات عن الشعور به' },
            { fieldName: 'tsunami', label: 'تحذير تسونامي' },
            { fieldName: 'url', label: 'صفحة التفاصيل بـ USGS' }
          ]
        }
      ]
    }
  },
  {
    id: 'nasa-active-fires',
    category: 'hazards',
    titleAr: 'بؤر الحرائق والنشاط الحراري (NASA FIRMS)',
    titleEn: 'Thermal Hotspots & Active Fires',
    descriptionAr: 'بيانات الأقمار الصناعية MODIS و VIIRS التابعة لوكالة ناسا ترصد الشذوذ الحراري وبؤر حرائق الغابات والمنشآت النشطة خلال آخر 48 ساعة.',
    descriptionEn: 'Thermal anomalies and active fire hotspots detected by NASA MODIS and VIIRS satellites worldwide over the past 48 hours.',
    provider: 'NASA FIRMS / Esri Living Atlas',
    updateFrequency: 'كل ساعة (Hourly Live)',
    type: 'feature',
    url: 'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Satellite_Thermal_Hotspots_and_Fire_Activity/FeatureServer/0',
    icon: 'fa-fire-flame-curved',
    badge: 'مباشر • Live',
    badgeColor: 'orange',
    defaultOpacity: 0.85,
    defaultVisible: false,
    popupTemplate: {
      title: 'بؤرة حرارية / حريق نشط - {satellite}',
      content: [
        {
          type: 'fields',
          fieldInfos: [
            { fieldName: 'confidence', label: 'مستوى الثقة (Confidence)' },
            { fieldName: 'brightness', label: 'درجة حرارة السطوع (Kelvin)' },
            { fieldName: 'acq_date', label: 'تاريخ الرصد', format: { dateFormat: 'short-date-short-time' } },
            { fieldName: 'satellite', label: 'القمر الصناعي الراصد' },
            { fieldName: 'frp', label: 'الطاقة الإشعاعية للحرائق (MW)' }
          ]
        }
      ]
    }
  },
  {
    id: 'active-hurricanes',
    category: 'hazards',
    titleAr: 'الأعاصير والعواصف المدارية النشطة (NOAA)',
    titleEn: 'Active Hurricanes & Cyclones',
    descriptionAr: 'مسارات وتنبؤات العواصف والأعاصير المدارية النشطة حالياً في محيطات وبحار العالم مقدمة من المركز الوطني الأمريكي للأعاصير وNOAA.',
    descriptionEn: 'Current tracks and forecasted paths for active tropical storms, cyclones, and hurricanes worldwide from NOAA / NHC.',
    provider: 'NOAA / NHC',
    updateFrequency: 'كل 6 ساعات',
    type: 'feature',
    url: 'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Active_Hurricanes_v1/FeatureServer/0',
    icon: 'fa-tornado',
    badge: 'مخاطر • Hazard',
    badgeColor: 'purple',
    defaultOpacity: 0.9,
    defaultVisible: false,
    popupTemplate: {
      title: 'العاصفة / الإعصار: {STORMNAME}',
      content: [
        {
          type: 'fields',
          fieldInfos: [
            { fieldName: 'STORMTYPE', label: 'نوع العاصفة' },
            { fieldName: 'INTENSITY', label: 'الشدة وسرعة الرياح (عقدة)' },
            { fieldName: 'PRESSURE', label: 'الضغط الجوي (mb)' },
            { fieldName: 'BASIN', label: 'الحوض المحيطي' },
            { fieldName: 'ADVDATE', label: 'تاريخ التحديث' }
          ]
        }
      ]
    }
  },

  // ==========================================
  // 3. البيئة والمناخ (Environment & Climate)
  // ==========================================
  {
    id: 'noaa-metar-weather',
    category: 'environment',
    titleAr: 'محطات الرصد الجوي وسرعة الرياح (NOAA METAR)',
    titleEn: 'METAR Weather Stations & Wind Data',
    descriptionAr: 'قراءات محطات الرصد الجوي في مطارات العراق والعالم تتضمن سرعة الرياح واتجاهها، درجات الحرارة، والرطوبة المحدثة لحظياً.',
    descriptionEn: 'Airport weather station observations worldwide with wind speed, direction, temperature, and atmospheric pressure.',
    provider: 'NOAA National Weather Service',
    updateFrequency: 'مباشر (كل ساعة)',
    type: 'feature',
    url: 'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NOAA_METAR_current_wind_speed_direction_v1/FeatureServer/0',
    icon: 'fa-wind',
    badge: 'طقس • Weather',
    badgeColor: 'blue',
    defaultOpacity: 0.85,
    defaultVisible: false,
    popupTemplate: {
      title: 'محطة الرصد: {station_name} ({icao_id})',
      content: [
        {
          type: 'fields',
          fieldInfos: [
            { fieldName: 'temp_c', label: 'درجة الحرارة (°C)' },
            { fieldName: 'wind_speed_kt', label: 'سرعة الرياح (عقدة)' },
            { fieldName: 'wind_dir_degrees', label: 'اتجاه الرياح (درجة)' },
            { fieldName: 'visibility_statute_mi', label: 'مدى الرؤية (ميل)' },
            { fieldName: 'altim_in_hg', label: 'الضغط الجوي (inHg)' },
            { fieldName: 'observation_time', label: 'وقت الرصد' }
          ]
        }
      ]
    }
  }
];

const ATLAS_BOOKMARKS = [
  {
    id: 'iraq-national',
    nameAr: 'جمهورية العراق (كامل النطاق الوطني)',
    nameEn: 'Republic of Iraq - National Extent',
    center: [43.68, 33.22],
    zoom: 6.2
  },
  {
    id: 'iraq-baghdad',
    nameAr: 'بغداد (العاصمة)',
    nameEn: 'Baghdad (Capital City)',
    center: [44.36, 33.31],
    zoom: 11
  },
  {
    id: 'iraq-basra',
    nameAr: 'البصرة وشط العرب والخليج العربي',
    nameEn: 'Basra & Shatt al-Arab',
    center: [47.81, 30.51],
    zoom: 11
  },
  {
    id: 'iraq-erbil',
    nameAr: 'أربيل وإقليم كوردستان',
    nameEn: 'Erbil & Kurdistan Region',
    center: [44.01, 36.19],
    zoom: 11
  },
  {
    id: 'iraq-nineveh',
    nameAr: 'نينوى والموصل والحدود الشمالية',
    nameEn: 'Nineveh & Mosul',
    center: [43.13, 36.34],
    zoom: 11
  },
  {
    id: 'iraq-euphrates',
    nameAr: 'الفرات الأوسط (كربلاء والنجف وبابل)',
    nameEn: 'Middle Euphrates (Karbala, Najaf, Babylon)',
    center: [44.15, 32.20],
    zoom: 10
  },
  {
    id: 'arab-world',
    nameAr: 'الشرق الأوسط والوطن العربي',
    nameEn: 'Middle East & Arab World',
    center: [42.0, 26.0],
    zoom: 4
  },
  {
    id: 'global-view',
    nameAr: 'عرض الكرة الأرضية (عالمي)',
    nameEn: 'Global World View',
    center: [20.0, 20.0],
    zoom: 2
  }
];

// Dual export: window global for direct file:// browser opening + ES module export
if (typeof window !== 'undefined') {
  window.ATLAS_CATEGORIES = ATLAS_CATEGORIES;
  window.ATLAS_LAYERS = ATLAS_LAYERS;
  window.ATLAS_BOOKMARKS = ATLAS_BOOKMARKS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ATLAS_CATEGORIES, ATLAS_LAYERS, ATLAS_BOOKMARKS };
}
