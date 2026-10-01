/**
 * ============================================================================
 * Iraq & Global City and Place Intelligent Search Engine
 * محرك البحث الجغرافي الذكي للمدن والأقضية والأحياء والمعالم في العراق
 * 
 * تصميم وتطوير الدكتور المهندس احمد لؤي البجاري
 * 
 * Features:
 *  - Massive Offline Gazetteer of all 19 Iraqi Governorates, 100+ Districts, 100+ Urban Neighborhoods & Landmarks
 *  - Integration with Official Archaeological Database (IRAQ_ARCHAEOLOGY_DATA)
 *  - High-Speed Online Geocoder via Official ArcGIS World Geocoding Service (replacing blocked Nominatim)
 *  - Instant Quick-Access Suggestions on Focus (بغداد، الموصل، البصرة، أربيل، كركوك...)
 *  - Arabic Phonetic & Orthographic Normalization (همزات، تاء مربوطة، أل التعريف)
 *  - High-Contrast Pure Black Text (#000000) with High Elevation Z-Index (Z: 99999)
 *  - Smooth Fly-To Animation, Location Pulse Beacon Marker & UTM/DMS Coordinates Popup
 * ============================================================================
 */

(function () {
  'use strict';

  // Comprehensive Iraqi Cities, Districts, Towns, Neighborhoods & Geographic Gazetteer
  const IRAQI_CITIES_GAZETTEER = [
    // 1. مراكز المحافظات الكبرى (19 محافظة)
    { nameAr: 'بغداد', nameEn: 'Baghdad', gov: 'محافظة بغداد', type: 'عاصمة جمهورية العراق', lat: 33.3152, lng: 44.3661, zoom: 12 },
    { nameAr: 'الموصل', nameEn: 'Mosul', gov: 'محافظة نينوى', type: 'مركز المحافظة ومدينة أم الربيعين', lat: 36.3400, lng: 43.1300, zoom: 13 },
    { nameAr: 'البصرة', nameEn: 'Basra', gov: 'محافظة البصرة', type: 'ميناء العراق الفيحاء ومركز المحافظة', lat: 30.5081, lng: 47.8188, zoom: 13 },
    { nameAr: 'أربيل', nameEn: 'Erbil (Hewler)', gov: 'محافظة أربيل', type: 'عاصمة إقليم كردستان والقلعة التاريخية', lat: 36.1911, lng: 44.0091, zoom: 13 },
    { nameAr: 'كركوك', nameEn: 'Kirkuk', gov: 'محافظة كركوك', type: 'مدينة الذهب الأسود والقلعة', lat: 35.4681, lng: 44.3922, zoom: 13 },
    { nameAr: 'النجف الأشرف', nameEn: 'Najaf', gov: 'محافظة النجف', type: 'مركز المحافظة ومدينة مقدسة', lat: 32.0000, lng: 44.3333, zoom: 13 },
    { nameAr: 'كربلاء المقدسة', nameEn: 'Karbala', gov: 'محافظة كربلاء', type: 'مركز المحافظة ومدينة مقدسة', lat: 32.6160, lng: 44.0249, zoom: 13 },
    { nameAr: 'السليمانية', nameEn: 'Sulaymaniyah', gov: 'محافظة السليمانية', type: 'عاصمة الثقافة في إقليم كردستان', lat: 35.5606, lng: 45.4347, zoom: 13 },
    { nameAr: 'دهوك', nameEn: 'Duhok', gov: 'محافظة دهوك', type: 'مركز المحافظة وبوابة كردستان الشمالية', lat: 36.8679, lng: 42.9886, zoom: 13 },
    { nameAr: 'الحلة', nameEn: 'Hillah', gov: 'محافظة بابل', type: 'مركز المحافظة ومجاورة لآثار بابل', lat: 32.4833, lng: 44.4333, zoom: 13 },
    { nameAr: 'الرمادي', nameEn: 'Ramadi', gov: 'محافظة الأنبار', type: 'مركز المحافظة على نهر الفرات', lat: 33.4244, lng: 43.3000, zoom: 13 },
    { nameAr: 'الفلوجة', nameEn: 'Fallujah', gov: 'محافظة الأنبار', type: 'قضاء الفلوجة ومدينة المساجد', lat: 33.3500, lng: 43.7833, zoom: 13 },
    { nameAr: 'الكوت', nameEn: 'Kut', gov: 'محافظة واسط', type: 'مركز المحافظة وسدة الكوت على دجلة', lat: 32.5167, lng: 45.8333, zoom: 13 },
    { nameAr: 'العمارة', nameEn: 'Amarah', gov: 'محافظة ميسان', type: 'مركز المحافظة وعاصمة الأهوار', lat: 31.8333, lng: 47.1500, zoom: 13 },
    { nameAr: 'الناصرية', nameEn: 'Nasiriyah', gov: 'محافظة ذي قار', type: 'مركز المحافظة وقرب زقورة أور', lat: 31.0500, lng: 46.2572, zoom: 13 },
    { nameAr: 'الديوانية', nameEn: 'Diwaniyah', gov: 'محافظة القادسية', type: 'مركز المحافظة الخصبة', lat: 31.9878, lng: 44.9250, zoom: 13 },
    { nameAr: 'تكريت', nameEn: 'Tikrit', gov: 'محافظة صلاح الدين', type: 'مركز المحافظة على دجلة', lat: 34.6000, lng: 43.6833, zoom: 13 },
    { nameAr: 'سامراء', nameEn: 'Samarra', gov: 'محافظة صلاح الدين', type: 'عاصمة العباسيين والمئذنة الملوية', lat: 34.2000, lng: 43.8833, zoom: 13 },
    { nameAr: 'بعقوبة', nameEn: 'Baqubah', gov: 'محافظة ديالى', type: 'مركز المحافظة ومدينة البرتقال', lat: 33.7500, lng: 44.6333, zoom: 13 },
    { nameAr: 'السماوة', nameEn: 'Samawah', gov: 'محافظة المثنى', type: 'مركز المحافظة ونهر الفرات وبحيرة ساوة', lat: 31.3167, lng: 45.2833, zoom: 13 },
    { nameAr: 'حلبجة', nameEn: 'Halabja', gov: 'محافظة حلبجة', type: 'مركز المحافظة وبساتين الرمان', lat: 35.1778, lng: 45.9861, zoom: 13 },

    // 2. أحياء ومناطق العاصمة بغداد (رصافة وكرخ)
    { nameAr: 'الكرادة', nameEn: 'Karrada', gov: 'محافظة بغداد', type: 'شبه جزيرة الكرادة داخل وخارج والعرصات', lat: 33.3050, lng: 44.4250, zoom: 14 },
    { nameAr: 'الجادرية', nameEn: 'Jadriya', gov: 'محافظة بغداد', type: 'حي الجادرية وجامعة بغداد وجسر الجادرية', lat: 33.2750, lng: 44.3850, zoom: 14 },
    { nameAr: 'المنصور', nameEn: 'Mansour', gov: 'محافظة بغداد', type: 'قضاء المنصور وشارع الأميرات ونادي الصيد', lat: 33.3100, lng: 44.3450, zoom: 14 },
    { nameAr: 'اليرموك', nameEn: 'Yarmouk', gov: 'محافظة بغداد', type: 'حي اليرموك ومستشفى اليرموك التعليمي', lat: 33.3000, lng: 44.3350, zoom: 14 },
    { nameAr: 'الحارثية', nameEn: 'Harthiya', gov: 'محافظة بغداد', type: 'حي الحارثية ومجمع العيادات ومول بغداد', lat: 33.3120, lng: 44.3600, zoom: 14 },
    { nameAr: 'الكاظمية', nameEn: 'Kadhimiyah', gov: 'محافظة بغداد', type: 'قضاء الكاظمية والروضة الكاظمية المقدسة', lat: 33.3811, lng: 44.3411, zoom: 14 },
    { nameAr: 'الأعظمية', nameEn: 'Adhamiyah', gov: 'محافظة بغداد', type: 'قضاء الأعظمية وجامع الإمام أبي حنيفة النعمان', lat: 33.3725, lng: 44.3611, zoom: 14 },
    { nameAr: 'الزعفرانية', nameEn: 'Zafaraniyah', gov: 'محافظة بغداد', type: 'ناحية الزعفرانية ومعهد التكنولوجيا وملتقى ديالى بدجلة', lat: 33.2500, lng: 44.4830, zoom: 14 },
    { nameAr: 'الدورة', nameEn: 'Dora', gov: 'محافظة بغداد', type: 'قضاء الدورة ومصفاة الدورة وحي الآثوريين', lat: 33.2500, lng: 44.4100, zoom: 14 },
    { nameAr: 'السيدية', nameEn: 'Saydiyah', gov: 'محافظة بغداد', type: 'حي السيدية وشارع الخيزران وشارع التجاري', lat: 33.2650, lng: 44.3450, zoom: 14 },
    { nameAr: 'البياع', nameEn: 'Bayaa', gov: 'محافظة بغداد', type: 'حي البياع وسوق البياع وشارع عشرين', lat: 33.2750, lng: 44.3350, zoom: 14 },
    { nameAr: 'حي العامل', nameEn: 'Hayy Al-Amil', gov: 'محافظة بغداد', type: 'حي العامل وشارع 84', lat: 33.2850, lng: 44.3200, zoom: 14 },
    { nameAr: 'حي الجهاد', nameEn: 'Hayy Al-Jihad', gov: 'محافظة بغداد', type: 'حي الجهاد قرب مطار بغداد الدولي', lat: 33.2750, lng: 44.2900, zoom: 14 },
    { nameAr: 'حي الجامعة', nameEn: 'Hayy Al-Jami\'a', gov: 'محافظة بغداد', type: 'حي الجامعة وشارع الربيع ومحيط الكرخ', lat: 33.3250, lng: 44.3100, zoom: 14 },
    { nameAr: 'الغزالية', nameEn: 'Ghazaliya', gov: 'محافظة بغداد', type: 'حي الغزالية وشارع المشجر', lat: 33.3450, lng: 44.2700, zoom: 14 },
    { nameAr: 'العامرية', nameEn: 'Amiriya', gov: 'محافظة بغداد', type: 'حي العامرية وشارع المنظمة وشارع العسل', lat: 33.3150, lng: 44.2850, zoom: 14 },
    { nameAr: 'حي الخضراء', nameEn: 'Hayy Al-Khadra', gov: 'محافظة بغداد', type: 'حي الخضراء ومجاور للعامرية والغزالية', lat: 33.3300, lng: 44.2800, zoom: 14 },
    { nameAr: 'الشعلة', nameEn: 'Shu\'ala', gov: 'محافظة بغداد', type: 'مدينة الشعلة وقرب جسر الغزالية', lat: 33.3750, lng: 44.2750, zoom: 14 },
    { nameAr: 'الحرية', nameEn: 'Hurriya', gov: 'محافظة بغداد', type: 'مدينة الحرية ودولعي والحرية الأولى والثانية', lat: 33.3600, lng: 44.3150, zoom: 14 },
    { nameAr: 'الكريعات', nameEn: 'Kurei\'at', gov: 'محافظة بغداد', type: 'حي الكريعات على ضفة دجلة مقابل الكاظمية', lat: 33.3900, lng: 44.3550, zoom: 14 },
    { nameAr: 'الصليخ', nameEn: 'Slaikh', gov: 'محافظة بغداد', type: 'حي الصليخ والصليخ الجديد وسبع ابكار', lat: 33.3850, lng: 44.3750, zoom: 14 },
    { nameAr: 'شارع فلسطين', nameEn: 'Palestine Street', gov: 'محافظة بغداد', type: 'محور شارع فلسطين وساحة بيروت وساحة المستنصرية', lat: 33.3550, lng: 44.4250, zoom: 14 },
    { nameAr: 'زيونة', nameEn: 'Zayouna', gov: 'محافظة بغداد', type: 'حي زيونة وشارع الربيعي ومول زيونة', lat: 33.3300, lng: 44.4500, zoom: 14 },
    { nameAr: 'الغدير', nameEn: 'Ghadir', gov: 'محافظة بغداد', type: 'حي الغدير وساحة ميسلون', lat: 33.3200, lng: 44.4600, zoom: 14 },
    { nameAr: 'بغداد الجديدة', nameEn: 'Baghdad Al-Jadida', gov: 'محافظة بغداد', type: 'منطقة بغداد الجديدة وسوق بغداد الجديدة', lat: 33.3100, lng: 44.4750, zoom: 14 },
    { nameAr: 'المشتل', nameEn: 'Mashtal', gov: 'محافظة بغداد', type: 'حي المشتل وساحة الفلقة', lat: 33.3250, lng: 44.4850, zoom: 14 },
    { nameAr: 'الفضيلية', nameEn: 'Al-Fadiliyah', gov: 'محافظة بغداد', type: 'ناحية الفضيلية شرق بغداد (نطاق الخارطة المصححة)', lat: 33.3283, lng: 44.4981, zoom: 14 },
    { nameAr: 'مدينة الصدر', nameEn: 'Sadr City', gov: 'محافظة بغداد', type: 'مدينة الصدر وقطاعاتها وقناة الجيش', lat: 33.3850, lng: 44.4600, zoom: 14 },
    { nameAr: 'الشعب', nameEn: 'Sha\'ab', gov: 'محافظة بغداد', type: 'حي الشعب وسوق 4000 وبوابة بغداد الشمالية', lat: 33.4150, lng: 44.4100, zoom: 14 },
    { nameAr: 'حي البنوك', nameEn: 'Hayy Al-Bunuk', gov: 'محافظة بغداد', type: 'حي البنوك ومجاور لشارع فلسطين والشعب', lat: 33.3950, lng: 44.4150, zoom: 14 },
    { nameAr: 'القاهرة', nameEn: 'Qahira', gov: 'محافظة بغداد', type: 'حي القاهرة وقرب نفق النداء', lat: 33.3800, lng: 44.3900, zoom: 14 },
    { nameAr: 'شارع الرشيد', nameEn: 'Al-Rasheed Street', gov: 'محافظة بغداد', type: 'شارع الرشيد التاريخي والميدان والحافظ القاضي', lat: 33.3400, lng: 44.3950, zoom: 15 },
    { nameAr: 'شارع المتنبي', nameEn: 'Al-Mutanabbi Street', gov: 'محافظة بغداد', type: 'سوق الكتب التراثي والقشلة والمركز الثقافي البغدادي', lat: 33.3395, lng: 44.3885, zoom: 16 },
    { nameAr: 'الشورجة', nameEn: 'Shorja', gov: 'محافظة بغداد', type: 'سوق الشورجة التجاري التراثي الكبير وجامع الخلفاء', lat: 33.3380, lng: 44.3980, zoom: 15 },
    { nameAr: 'ساحة التحرير', nameEn: 'Tahrir Square', gov: 'محافظة بغداد', type: 'قلب بغداد ونصب الحرية لجواد سليم وحديقة الأمة', lat: 33.3275, lng: 44.4078, zoom: 16 },
    { nameAr: 'المنطقة الخضراء', nameEn: 'Green Zone', gov: 'محافظة بغداد', type: 'كرادة مريم والمجمع الحكومي وقصر المؤتمرات', lat: 33.3080, lng: 44.3850, zoom: 14 },
    { nameAr: 'أبو غريب', nameEn: 'Abu Ghraib', gov: 'محافظة بغداد', type: 'قضاء غرب بغداد ومحطة أبحاث الزراعة', lat: 33.3061, lng: 44.1783, zoom: 13 },
    { nameAr: 'المدائن (سلمان باك)', nameEn: 'Madaen (Salman Pak)', gov: 'محافظة بغداد', type: 'قضاء جنوب بغداد وموقع طاق كسرى التاريخي', lat: 33.1000, lng: 44.5833, zoom: 14 },
    { nameAr: 'المحمودية', nameEn: 'Mahmoudiyah', gov: 'محافظة بغداد', type: 'قضاء المحمودية جنوب العاصمة', lat: 33.0617, lng: 44.3611, zoom: 13 },
    { nameAr: 'التاجي', nameEn: 'Taji', gov: 'محافظة بغداد', type: 'ناحية التاجي شمال بغداد على طريق الموصل', lat: 33.5200, lng: 44.2500, zoom: 13 },
    { nameAr: 'الطارمية', nameEn: 'Tarmiyah', gov: 'محافظة بغداد', type: 'قضاء الطارمية شمال بغداد وبساتين النخيل والحمضيات', lat: 33.6700, lng: 44.3800, zoom: 13 },

    // 3. أقضية ومدن نينوى والشمال
    { nameAr: 'تلعفر', nameEn: 'Tal Afar', gov: 'محافظة نينوى', type: 'قضاء غرب الموصل والقلعة التاريخية', lat: 36.3769, lng: 42.4519, zoom: 13 },
    { nameAr: 'سنجار', nameEn: 'Sinjar', gov: 'محافظة نينوى', type: 'قضاء وجبل سنجار التاريخي', lat: 36.3197, lng: 41.8608, zoom: 13 },
    { nameAr: 'الحمدانية (بغديدا)', nameEn: 'Hamdaniya (Bakhdida)', gov: 'محافظة نينوى', type: 'قضاء سهل نينوى التاريخي', lat: 36.2700, lng: 43.3769, zoom: 14 },
    { nameAr: 'برطلة', nameEn: 'Bartella', gov: 'محافظة نينوى', type: 'ناحية في سهل نينوى', lat: 36.3536, lng: 43.3828, zoom: 14 },
    { nameAr: 'بعشيقة', nameEn: 'Bashiqa', gov: 'محافظة نينوى', type: 'ناحية وبساتين الزيتون والسمسم وجبل بعشيقة', lat: 36.4528, lng: 43.3444, zoom: 14 },
    { nameAr: 'تلكيف', nameEn: 'Tel Keppe', gov: 'محافظة نينوى', type: 'قضاء شمال مدينة الموصل', lat: 36.4917, lng: 43.1206, zoom: 14 },
    { nameAr: 'القوش', nameEn: 'Alqosh', gov: 'محافظة نينوى', type: 'بلدة ودير الربان هرمزد وجبل القوش', lat: 36.7328, lng: 43.0931, zoom: 14 },
    { nameAr: 'شيخان (عين سفني)', nameEn: 'Shekhan', gov: 'محافظة نينوى', type: 'قضاء شيخان ومعبد لالش المقدس', lat: 36.7167, lng: 43.3500, zoom: 14 },
    { nameAr: 'مخمور', nameEn: 'Makhmur', gov: 'محافظة نينوى / أربيل', type: 'قضاء مخمور وسهل قراج', lat: 35.7744, lng: 43.5878, zoom: 13 },
    { nameAr: 'الحضر', nameEn: 'Hatra City', gov: 'محافظة نينوى', type: 'قضاء الحضر ومملكة الحضر الأثرية الشمسية', lat: 35.5869, lng: 42.7186, zoom: 14 },
    { nameAr: 'زمار', nameEn: 'Zumar', gov: 'محافظة نينوى', type: 'ناحية زمار وبحيرة سد الموصل', lat: 36.6500, lng: 42.6000, zoom: 13 },
    { nameAr: 'ربيعة', nameEn: 'Rabia', gov: 'محافظة نينوى', type: 'ناحية ربيعة والمنفذ الحدودي', lat: 36.8000, lng: 42.1000, zoom: 13 },
    { nameAr: 'سد الموصل', nameEn: 'Mosul Dam', gov: 'محافظة نينوى', type: 'سد الموصل والبحيرة الكبرى على نهر دجلة', lat: 36.6300, lng: 42.8200, zoom: 13 },

    // 4. إقليم كردستان (أربيل، السليمانية، دهوك)
    { nameAr: 'شقلاوة', nameEn: 'Shaqlawa', gov: 'محافظة أربيل', type: 'مصيف سياحي تحت جبل سفين', lat: 36.4069, lng: 44.3411, zoom: 14 },
    { nameAr: 'راوندوز', nameEn: 'Rawanduz', gov: 'محافظة أربيل', type: 'قضاء وشلالات كلي علي بك ووادي رواندوز', lat: 36.6111, lng: 44.5242, zoom: 14 },
    { nameAr: 'سوران', nameEn: 'Soran', gov: 'محافظة أربيل', type: 'قضاء سوران وبوابة جبال قنديل وحاج عمران', lat: 36.6500, lng: 44.5300, zoom: 13 },
    { nameAr: 'كويسنجق (كويه)', nameEn: 'Koy Sanjaq', gov: 'محافظة أربيل', type: 'قضاء كويه التاريخي والثقافي', lat: 36.0833, lng: 44.6333, zoom: 13 },
    { nameAr: 'عينكاوة', nameEn: 'Ankawa', gov: 'محافظة أربيل', type: 'ناحية عينكاوة التراثية شمال غرب أربيل', lat: 36.2300, lng: 43.9900, zoom: 14 },
    { nameAr: 'زاخو', nameEn: 'Zakho', gov: 'محافظة دهوك', type: 'قضاء زاخو وجسر دلال التاريخي على الخابور', lat: 37.1436, lng: 42.6869, zoom: 13 },
    { nameAr: 'العمادية', nameEn: 'Amadiya', gov: 'محافظة دهوك', type: 'قلعة وحصن أثري فوق قمة الجبل ومصيف سولاف', lat: 37.0911, lng: 43.4878, zoom: 14 },
    { nameAr: 'عقرة', nameEn: 'Akre', gov: 'محافظة دهوك', type: 'قضاء الجبال الخضراء واحتفالات نوروز', lat: 36.7461, lng: 43.8936, zoom: 14 },
    { nameAr: 'سرسنك', nameEn: 'Sarsink', gov: 'محافظة دهوك', type: 'مصيف سياحي تحت جبل كاره', lat: 37.0300, lng: 43.3400, zoom: 14 },
    { nameAr: 'سميل', nameEn: 'Semel', gov: 'محافظة دهوك', type: 'قضاء سميل غرب مدينة دهوك', lat: 36.8500, lng: 42.8500, zoom: 13 },
    { nameAr: 'دوكان', nameEn: 'Dukan', gov: 'محافظة السليمانية', type: 'سد وبحيرة دوكان السياحية وقضاء دوكان', lat: 35.9500, lng: 44.9600, zoom: 14 },
    { nameAr: 'رانية', nameEn: 'Ranya', gov: 'محافظة السليمانية', type: 'قضاء رانية وبوابة بحيرة دوكان', lat: 36.2550, lng: 44.8828, zoom: 13 },
    { nameAr: 'قلعة دزة', nameEn: 'Qalat Dizah', gov: 'محافظة السليمانية', type: 'قضاء بيشدر شرق السليمانية', lat: 36.1800, lng: 45.1200, zoom: 13 },
    { nameAr: 'كلار', nameEn: 'Kalar', gov: 'محافظة السليمانية', type: 'مركز منطقة كرميان على نهر سيروان وقلعة شيروانة', lat: 34.6256, lng: 45.3164, zoom: 13 },
    { nameAr: 'دربنديخان', nameEn: 'Darbandikhan', gov: 'محافظة السليمانية', type: 'سد وبحيرة دربنديخان ومضيق الجبال', lat: 35.1100, lng: 45.7000, zoom: 13 },
    { nameAr: 'بنجوين', nameEn: 'Penjwen', gov: 'محافظة السليمانية', type: 'قضاء حدودي جبلي عالي الارتفاع', lat: 35.6200, lng: 45.9500, zoom: 13 },
    { nameAr: 'جمجمال', nameEn: 'Chamchamal', gov: 'محافظة السليمانية', type: 'قضاء جمجمال وموقع جرمو الأثري الأول للزراعة', lat: 35.5300, lng: 44.8300, zoom: 13 },

    // 5. أقضية ومناطق البصرة والجنوب والأهوار
    { nameAr: 'القرنة', nameEn: 'Qurna', gov: 'محافظة البصرة', type: 'ملتقى نهري دجلة والفرات لتكوين شط العرب وشجرة آدم', lat: 31.0156, lng: 47.4319, zoom: 14 },
    { nameAr: 'الزبير', nameEn: 'Zubair', gov: 'محافظة البصرة', type: 'قضاء الزبير وجامع خطوة الإمام علي وموقع البصرة القديمة', lat: 30.3900, lng: 47.7000, zoom: 13 },
    { nameAr: 'الفاو', nameEn: 'Faw', gov: 'محافظة البصرة', type: 'شبه جزيرة الفاو وميناء الفاو الكبير على الخليج العربي', lat: 29.9742, lng: 48.4731, zoom: 13 },
    { nameAr: 'شط العرب (التنومة)', nameEn: 'Shatt Al-Arab (Tanuma)', gov: 'محافظة البصرة', type: 'قضاء التنومة شرق نهر شط العرب وجامعة البصرة باب الزبير', lat: 30.5200, lng: 47.8500, zoom: 13 },
    { nameAr: 'أم قصر', nameEn: 'Umm Qasr', gov: 'محافظة البصرة', type: 'ميناء أم قصر التجاري العراقي على خور الزبير وعبد الله', lat: 30.0333, lng: 47.9167, zoom: 13 },
    { nameAr: 'الهارثة', nameEn: 'Hartha', gov: 'محافظة البصرة', type: 'ناحية الهارثة ومحطة الكهرباء الحرارية شمال البصرة', lat: 30.6300, lng: 47.7500, zoom: 13 },
    { nameAr: 'المدينة', nameEn: 'Al-Madina', gov: 'محافظة البصرة', type: 'قضاء المدينة شمال البصرة وأهوار القرنة', lat: 30.9300, lng: 47.2600, zoom: 13 },
    { nameAr: 'سوق الشيوخ', nameEn: 'Suq Al-Shuyukh', gov: 'محافظة ذي قار', type: 'قضاء جنوب الناصرية على الفرات ومداخل هور الحمار', lat: 30.8833, lng: 46.4667, zoom: 13 },
    { nameAr: 'الچبايش', nameEn: 'Chibayish', gov: 'محافظة ذي قار', type: 'عاصمة أهوار العراق الوسطى ومسار المشاحيف وهور الحمار', lat: 30.9500, lng: 47.0167, zoom: 14 },
    { nameAr: 'الشطرة', nameEn: 'Shatrah', gov: 'محافظة ذي قار', type: 'قضاء الشطرة على نهر الغراف', lat: 31.4167, lng: 46.1667, zoom: 13 },
    { nameAr: 'الرفاعي', nameEn: 'Rifaie', gov: 'محافظة ذي قار', type: 'قضاء الرفاعي وجامعة سومر شمال ذي قار', lat: 31.6200, lng: 46.0600, zoom: 13 },
    { nameAr: 'المجر الكبير', nameEn: 'Al-Majar Al-Kabir', gov: 'محافظة ميسان', type: 'قضاء جنوب العمارة وبوابة هور الحويزة', lat: 31.5794, lng: 47.1611, zoom: 13 },
    { nameAr: 'علي الغربي', nameEn: 'Ali Al-Gharbi', gov: 'محافظة ميسan', type: 'قضاء شمال العمارة قرب سلسلة جبال حمرين', lat: 32.4600, lng: 46.6900, zoom: 13 },
    { nameAr: 'قلعة صالح', nameEn: 'Qalat Saleh', gov: 'محافظة ميسان', type: 'قضاء قلعة صالح على دجلة وصناعة الفضة والمشاحيف', lat: 31.5167, lng: 47.2833, zoom: 13 },
    { nameAr: 'الميمونة', nameEn: 'Maymouna', gov: 'محافظة ميسان', type: 'قضاء الميمونة غرب العمارة', lat: 31.7000, lng: 46.9500, zoom: 13 },
    { nameAr: 'الرميثة', nameEn: 'Rumaitha', gov: 'محافظة المثنى', type: 'قضاء الرميثة ومهد ثورة العشرين الخالدة', lat: 31.5300, lng: 45.2000, zoom: 13 },
    { nameAr: 'الخضر', nameEn: 'Khidhir', gov: 'محافظة المثنى', type: 'قضاء الخضر على ضفاف نهر الفرات', lat: 31.1833, lng: 45.5667, zoom: 13 },
    { nameAr: 'السلمان', nameEn: 'Salman', gov: 'محافظة المثنى', type: 'قضاء السلمان وقلب بادية السماوة الجنوبية', lat: 30.5000, lng: 44.5500, zoom: 13 },

    // 6. الفرات الأوسط (النجف، كربلاء، بابل، القادسية)
    { nameAr: 'الكوفة', nameEn: 'Kufa', gov: 'محافظة النجف', type: 'قضاء الكوفة التاريخي ومسجد الكوفة المعظم ونهر الفرات', lat: 32.0300, lng: 44.4000, zoom: 14 },
    { nameAr: 'المناذرة', nameEn: 'Manathera', gov: 'محافظة النجف', type: 'قضاء المناذرة ومزارع الشلب والرز العنبر', lat: 31.8500, lng: 44.4833, zoom: 13 },
    { nameAr: 'المشخاب', nameEn: 'Mishkhab', gov: 'محافظة النجف', type: 'قضاء المشخاب وعاصمة عنبر العراق على الفرات', lat: 31.8000, lng: 44.5000, zoom: 13 },
    { nameAr: 'الحيرة', nameEn: 'Hira', gov: 'محافظة النجف', type: 'مملكة الحيرة التاريخية وقصور الخورنق والسدير', lat: 31.8800, lng: 44.4700, zoom: 14 },
    { nameAr: 'الهندية (طويريج)', nameEn: 'Hindiya (Tuwairij)', gov: 'محافظة كربلاء', type: 'قضاء الهندية وسدة الهندية التاريخية على الفرات', lat: 32.5500, lng: 44.2333, zoom: 14 },
    { nameAr: 'عين التمر (شثاثا)', nameEn: 'Ain Al-Tamur', gov: 'محافظة كربلاء', type: 'واحة النخيل والعيون الكبريتية وبحيرة الرزازة', lat: 32.5667, lng: 43.4833, zoom: 14 },
    { nameAr: 'المسيب', nameEn: 'Musayyib', gov: 'محافظة بابل', type: 'قضاء المسيب على مجرى الفرات وجسر المسيب', lat: 32.7800, lng: 44.2900, zoom: 13 },
    { nameAr: 'المحاويل', nameEn: 'Mahawil', gov: 'محافظة بابل', type: 'قضاء المحاويل شمال مدينة الحلة وبابل الأثرية', lat: 32.6567, lng: 44.4072, zoom: 13 },
    { nameAr: 'الهاشمية', nameEn: 'Hashimiya', gov: 'محافظة بابل', type: 'قضاء الهاشمية جنوب الحلة', lat: 32.3486, lng: 44.6294, zoom: 13 },
    { nameAr: 'القاسم', nameEn: 'Qasim', gov: 'محافظة بابل', type: 'قضاء القاسم ومرقد القاسم بن الإمام الكاظم', lat: 32.2900, lng: 44.6800, zoom: 13 },
    { nameAr: 'الشامية', nameEn: 'Shamiya', gov: 'محافظة القادسية', type: 'قضاء الشامية وشط الشامية وحقول العنبر', lat: 31.9628, lng: 44.6008, zoom: 13 },
    { nameAr: 'عفك', nameEn: 'Afak', gov: 'محافظة القادسية', type: 'قضاء عفك وموقع مدينة نيبور الدينية السومرية', lat: 32.0667, lng: 45.2500, zoom: 13 },
    { nameAr: 'الحمزة الشرقي', nameEn: 'Hamza', gov: 'محافظة القادسية', type: 'قضاء الحمزة الشرقي جنوب الديوانية', lat: 31.7300, lng: 44.9800, zoom: 13 },

    // 7. الأنبار وصلاح الدين وديالى وواسط
    { nameAr: 'هيت', nameEn: 'Hit', gov: 'محافظة الأنبار', type: 'مدينة عيون القير والنواعير التاريخية على الفرات', lat: 33.6417, lng: 42.8250, zoom: 13 },
    { nameAr: 'حديثة', nameEn: 'Haditha', gov: 'محافظة الأنبار', type: 'قضاء وسد حديثة وبحيرة القادسية وبساتين الفرات', lat: 34.1378, lng: 42.3789, zoom: 13 },
    { nameAr: 'عنه', nameEn: 'Anah', gov: 'محافظة الأنبار', type: 'قضاء وجزيرة عنه ومئذنتها الأثرية الثمانية', lat: 34.4694, lng: 41.9500, zoom: 13 },
    { nameAr: 'راوة', nameEn: 'Rawa', gov: 'محافظة الأنبار', type: 'قضاء راوة على جرف الفرات المقابل لعنة', lat: 34.4756, lng: 41.9167, zoom: 13 },
    { nameAr: 'القائم', nameEn: 'Al-Qaim', gov: 'محافظة الأنبار', type: 'قضاء حدودي على مجرى الفرات وحصيبة', lat: 34.3644, lng: 41.0850, zoom: 13 },
    { nameAr: 'الرطبة', nameEn: 'Rutba', gov: 'محافظة الأنبار', type: 'قضاء قلب البادية الغربية ومفرق الطرق الدولية', lat: 33.0333, lng: 40.2833, zoom: 13 },
    { nameAr: 'الحبانية', nameEn: 'Habbaniyah', gov: 'محافظة الأنبار', type: 'مدينة سياحية وبحيرة الحبانية وسدة المجرة', lat: 33.3700, lng: 43.5800, zoom: 13 },
    { nameAr: 'بلد', nameEn: 'Balad', gov: 'محافظة صلاح الدين', type: 'قضاء بلد ومرقد السيد محمد سبع الدجيل وبساتين العنب', lat: 34.0142, lng: 44.1444, zoom: 13 },
    { nameAr: 'الدجيل', nameEn: 'Dujail', gov: 'محافظة صلاح الدين', type: 'قضاء الدجيل وبساتين الرمان والنخيل', lat: 33.8467, lng: 44.2378, zoom: 13 },
    { nameAr: 'بيجي', nameEn: 'Baiji', gov: 'محافظة صلاح الدين', type: 'قضاء ومصفاة بيجي النفطية الكبرى وتقاطع دجلة', lat: 34.9300, lng: 43.4900, zoom: 13 },
    { nameAr: 'الشرقاط', nameEn: 'Shirqat', gov: 'محافظة صلاح الدين', type: 'قضاء الشرقاط وقلعة آشور عاصمة الآشوريين الأولى', lat: 35.4950, lng: 43.2439, zoom: 13 },
    { nameAr: 'طوزخورماتو', nameEn: 'Tuz Khurmatu', gov: 'محافظة صلاح الدين', type: 'قضاء طوزخورماتو وتلال حمرين', lat: 34.8878, lng: 44.6369, zoom: 13 },
    { nameAr: 'الدور', nameEn: 'Al-Dour', gov: 'محافظة صلاح الدين', type: 'قضاء الدور على نهر دجلة', lat: 34.4500, lng: 43.8000, zoom: 13 },
    { nameAr: 'المقدادية (شهربان)', nameEn: 'Muqdadiyah', gov: 'محافظة ديالى', type: 'قضاء شهربان وبساتين النخيل والبرتقال', lat: 33.9786, lng: 44.9367, zoom: 13 },
    { nameAr: 'الخالص', nameEn: 'Khalis', gov: 'محافظة ديالى', type: 'قضاء الخالص الزراعي شمال بعقوبة', lat: 33.8500, lng: 44.5300, zoom: 13 },
    { nameAr: 'خانقين', nameEn: 'Khanaqin', gov: 'محافظة ديالى', type: 'قضاء حدودي على نهر الوند وجسر الوند الحجري', lat: 34.3575, lng: 45.3853, zoom: 13 },
    { nameAr: 'بلدروز', nameEn: 'Baladrooz', gov: 'محافظة ديالى', type: 'قضاء بلدروز وشرق نهر ديالى', lat: 33.6931, lng: 45.0289, zoom: 13 },
    { nameAr: 'مندلي', nameEn: 'Mandali', gov: 'محافظة ديالى', type: 'قضاء مندلي التاريخي وبساتين النخيل والرمان', lat: 33.7500, lng: 45.5500, zoom: 13 },
    { nameAr: 'الصويرة', nameEn: 'Suwaira', gov: 'محافظة واسط', type: 'قضاء الصويرة شمال واسط وقاعدة الصويرة الجوية', lat: 32.9200, lng: 44.7700, zoom: 13 },
    { nameAr: 'النعمانية', nameEn: 'Numaniyah', gov: 'محافظة واسط', type: 'قضاء النعمانية وضريح الشاعر المتنبي على دجلة', lat: 32.5500, lng: 45.4100, zoom: 13 },
    { nameAr: 'الحي', nameEn: 'Al-Hayy', gov: 'محافظة واسط', type: 'قضاء الحي على نهر الغراف وضريح التابعي سعيد بن جبير', lat: 32.1700, lng: 46.0400, zoom: 13 },
    { nameAr: 'العزيزية', nameEn: 'Aziziyah', gov: 'محافظة واسط', type: 'قضاء العزيزية على طريق بغداد - الكوت', lat: 32.9000, lng: 45.0600, zoom: 13 },
    { nameAr: 'بدرة', nameEn: 'Badra', gov: 'محافظة واسط', type: 'قضاء بدرة وجصان شرق واسط', lat: 33.1100, lng: 45.9600, zoom: 13 },

    // 8. المعالم والمواقع الأثرية الكبرى
    { nameAr: 'آثار بابل والمدينة القديمة', nameEn: 'Babylon Ancient City', gov: 'محافظة بابل', type: 'موقع تراث عالمي UNESCO وبوابة عشتار', lat: 32.5422, lng: 44.4211, zoom: 15 },
    { nameAr: 'زقورة أور ومسقط رأس النبي إبراهيم', nameEn: 'Ziggurat of Ur', gov: 'محافظة ذي قار', type: 'أقدم المعابد السومرية وموقع تراث عالمي UNESCO', lat: 30.9625, lng: 46.1033, zoom: 15 },
    { nameAr: 'مملكة الحضر الأثرية', nameEn: 'Hatra World Heritage', gov: 'محافظة نينوى', type: 'أول موقع مسجل على لائحة التراث العالمي في العراق UNESCO', lat: 35.5869, lng: 42.7186, zoom: 15 },
    { nameAr: 'قلعة أربيل التاريخية', nameEn: 'Erbil Citadel', gov: 'محافظة أربيل', type: 'أقدم مستوطنة بشرية مأهولة باستمرار في العالم UNESCO', lat: 36.1911, lng: 44.0091, zoom: 16 },
    { nameAr: 'المدينة الأثرية في سامراء والمئذنة الملوية', nameEn: 'Samarra Malwiya Minaret', gov: 'محافظة صلاح الدين', type: 'عاصمة الخلافة العباسية وموقع تراث عالمي UNESCO', lat: 34.2064, lng: 43.8744, zoom: 16 },
    { nameAr: 'قلعة آشور (الشرقاط)', nameEn: 'Ashur (Qalat Sherqat)', gov: 'محافظة صلاح الدين', type: 'عاصمة الإمبراطورية الآشورية الدينية UNESCO', lat: 35.4564, lng: 43.2608, zoom: 15 },
    { nameAr: 'طاق كسرى وإيوان المدائن', nameEn: 'Taq Kasra (Ctesiphon)', gov: 'محافظة بغداد', type: 'أكبر قوس طابوق منفرد في العالم القديم', lat: 33.0936, lng: 44.5811, zoom: 16 },
    { nameAr: 'آثار النمرود (كالح)', nameEn: 'Nimrud Ancient City', gov: 'محافظة نينوى', type: 'عاصمة الملك الآشوري آشور ناصربال الثاني', lat: 35.9989, lng: 43.3289, zoom: 15 },
    { nameAr: 'آثار خورساباد (دور شروكين)', nameEn: 'Khorsabad (Dur-Sharrukin)', gov: 'محافظة نينوى', type: 'عاصمة الملك الآشوري سرجون الثاني الثور المجنح', lat: 36.5097, lng: 43.2294, zoom: 15 },
    { nameAr: 'أهوار جنوب العراق وهور الحمار', nameEn: 'Iraqi Marshlands (Ahwar)', gov: 'البصرة / ذي قار / ميسان', type: 'موقع تراث طبيعي وثقافي عالمي مختلط UNESCO', lat: 31.0000, lng: 47.0500, zoom: 12 },
    { nameAr: 'بحيرة ساوة الطبيعية', nameEn: 'Lake Sawa', gov: 'محافظة المثنى', type: 'بحيرة طبيعية كلسية مغلقة في بادية السماوة', lat: 31.3122, lng: 45.0069, zoom: 14 }
  ];

  class CitySearchEngine {
    constructor() {
      this.map = null;
      this._initialized = false;
      this.searchInput = null;
      this.dropdown = null;
      this.clearBtn = null;
      this.submitBtn = null;
      this.searchResultMarker = null;
      this.debounceTimer = null;
      this.selectedIndex = -1;
      this.currentResults = [];
    }

    /**
     * Initialize City Search Engine
     */
    init(mapInstance) {
      this.map = mapInstance || window.map || window.atlasMap || null;

      if (this._initialized) {
        if (!this.map) {
          this.map = window.map || window.atlasMap || null;
        }
        return;
      }

      this.searchInput = document.getElementById('cityPlaceSearchInput');
      this.dropdown = document.getElementById('citySearchResultsDropdown');
      this.clearBtn = document.getElementById('clearSearchInputBtn');
      this.submitBtn = document.getElementById('submitSearchInputBtn');

      if (!this.searchInput) {
        console.warn('CitySearchEngine: #cityPlaceSearchInput not found in DOM.');
        return;
      }

      this._initialized = true;
      this._bindEvents();
      console.log('🔍 CitySearchEngine: Iraqi Cities, Places & ArcGIS Geocoder — ready.');
    }

    /**
     * Bind UI & Map Events
     */
    _bindEvents() {
      // 1. Text input handler with real-time suggestions
      this.searchInput.addEventListener('input', () => {
        const val = this.searchInput.value.trim();
        if (this.clearBtn) {
          if (val.length > 0) {
            this.clearBtn.classList.remove('hidden');
          } else {
            this.clearBtn.classList.add('hidden');
          }
        }

        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          if (val.length === 0) {
            this.renderQuickCitySuggestions();
          } else {
            this.executeSearch(val);
          }
        }, 120);
      });

      // 2. Keyboard Navigation (Arrow Down, Up, Enter, Esc)
      this.searchInput.addEventListener('keydown', (e) => {
        if (!this.dropdown || this.dropdown.classList.contains('hidden') || this.currentResults.length === 0) {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.executeImmediateSearch(this.searchInput.value.trim());
          }
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectedIndex = (this.selectedIndex + 1) % this.currentResults.length;
          this._updateActiveSuggestionItem();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.selectedIndex = (this.selectedIndex - 1 + this.currentResults.length) % this.currentResults.length;
          this._updateActiveSuggestionItem();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (this.selectedIndex >= 0 && this.selectedIndex < this.currentResults.length) {
            this.selectResult(this.currentResults[this.selectedIndex]);
          } else {
            this.executeImmediateSearch(this.searchInput.value.trim());
          }
        } else if (e.key === 'Escape') {
          this.closeDropdown();
        }
      });

      // 3. Clear button click
      if (this.clearBtn) {
        this.clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.searchInput.value = '';
          this.clearBtn.classList.add('hidden');
          this.renderQuickCitySuggestions();
          this.searchInput.focus();
        });
      }

      // 4. Submit button click
      if (this.submitBtn) {
        this.submitBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.executeImmediateSearch(this.searchInput.value.trim());
        });
      }

      // 5. Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        const container = document.getElementById('geosearchContainer');
        if (container && !container.contains(e.target)) {
          this.closeDropdown();
        }
      });

      // 6. On focus: if empty, show quick suggestions immediately! If not empty, search!
      this.searchInput.addEventListener('focus', () => {
        const val = this.searchInput.value.trim();
        if (val.length >= 1) {
          this.executeSearch(val);
        } else {
          this.renderQuickCitySuggestions();
        }
      });
    }

    /**
     * Arabic Text Normalization for tolerant matching
     */
    _normalizeArabic(text) {
      if (!text) return '';
      return text
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/ئ/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Tashkeel
        .replace(/^(ال)/, '') // Remove definite article prefix
        .trim();
    }

    /**
     * Render Quick Popular Iraqi Cities on Focus (0ms Response)
     */
    renderQuickCitySuggestions() {
      if (!this.dropdown) return;

      const popular = [
        IRAQI_CITIES_GAZETTEER[0], // بغداد
        IRAQI_CITIES_GAZETTEER[1], // الموصل
        IRAQI_CITIES_GAZETTEER[2], // البصرة
        IRAQI_CITIES_GAZETTEER[3], // أربيل
        IRAQI_CITIES_GAZETTEER[4], // كركوك
        IRAQI_CITIES_GAZETTEER[5], // النجف
        IRAQI_CITIES_GAZETTEER[6], // كربلاء
        IRAQI_CITIES_GAZETTEER[7], // السليمانية
        IRAQI_CITIES_GAZETTEER[21], // الكرادة
        IRAQI_CITIES_GAZETTEER[23], // المنصور
        IRAQI_CITIES_GAZETTEER[28]  // الزعفرانية
      ];

      this.currentResults = popular;
      this.selectedIndex = -1;

      let html = `
        <div class="px-3.5 py-2 bg-gradient-to-r from-sky-50 to-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-700">
          <span class="text-xs font-bold flex items-center gap-1.5 text-sky-800">
            <i class="fa-solid fa-map-pin text-sky-600"></i>
            <span>مدن ومعالم العراق للوصول السريع:</span>
          </span>
          <span class="text-[10px] text-slate-400 font-medium">انقر للانتقال الفوري</span>
        </div>
      `;

      popular.forEach((item, idx) => {
        html += `
          <div class="city-search-item px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white hover:bg-sky-50 cursor-pointer transition-colors" data-index="${idx}">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 text-sm border border-sky-200">
                <i class="fa-solid fa-city"></i>
              </div>
              <div class="min-w-0 leading-tight">
                <div class="city-name text-sm font-bold text-black truncate" style="color: #000000 !important;">
                  ${item.nameAr}
                </div>
                <div class="text-[11px] text-slate-600 truncate mt-0.5">
                  <span class="text-sky-700 font-semibold">${item.gov}</span> • ${item.type}
                </div>
              </div>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 border border-sky-300 shrink-0">
              انتقال 📍
            </span>
          </div>
        `;
      });

      this.dropdown.innerHTML = html;
      this.dropdown.classList.remove('hidden');

      this.dropdown.querySelectorAll('.city-search-item').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(el.dataset.index, 10);
          if (this.currentResults[index]) {
            this.selectResult(this.currentResults[index]);
          }
        });
      });
    }

    /**
     * Search Across Local Gazetteer + Archaeological Database + ArcGIS World Geocoder
     */
    async executeSearch(query) {
      if (!query || query.length === 0) {
        this.renderQuickCitySuggestions();
        return;
      }

      const normQ = this._normalizeArabic(query);
      const lowerQ = query.toLowerCase();

      // 1. Search in Local Gazetteer
      let matches = [];
      IRAQI_CITIES_GAZETTEER.forEach(item => {
        const normName = this._normalizeArabic(item.nameAr);
        const normGov = this._normalizeArabic(item.gov);
        const engName = (item.nameEn || '').toLowerCase();

        let score = 0;
        if (normName === normQ) score += 100;
        else if (normName.startsWith(normQ)) score += 65;
        else if (normName.includes(normQ)) score += 45;
        else if (normGov.includes(normQ)) score += 20;
        else if (engName.includes(lowerQ)) score += 30;

        if (score > 0) {
          matches.push({
            ...item,
            score,
            source: 'city',
            badge: item.type.includes('حي') || item.type.includes('شارع') ? 'حي / منطقة 🏘️' : 'مدينة / قضاء 🏛️'
          });
        }
      });

      // 2. Search in Curated Archaeological Sites Database
      if (window.IRAQ_ARCHAEOLOGY_DATA && window.IRAQ_ARCHAEOLOGY_DATA.sites) {
        window.IRAQ_ARCHAEOLOGY_DATA.sites.forEach(site => {
          const normSite = this._normalizeArabic(site.name_ar);
          const normGov = this._normalizeArabic(site.governorate);
          const engName = (site.name_en || '').toLowerCase();

          let score = 0;
          if (normSite === normQ) score += 95;
          else if (normSite.startsWith(normQ)) score += 60;
          else if (normSite.includes(normQ)) score += 40;
          else if (normGov.includes(normQ)) score += 15;
          else if (engName.includes(lowerQ)) score += 25;

          if (score > 0) {
            matches.push({
              nameAr: site.name_ar,
              nameEn: site.name_en,
              gov: site.governorate,
              type: `موقع أثري (${site.period}) - ${site.significance || ''}`,
              lat: site.lat,
              lng: site.lng,
              zoom: 15,
              score,
              source: 'archaeology',
              badge: 'موقع أثري 🏺'
            });
          }
        });
      }

      matches.sort((a, b) => b.score - a.score);
      this.currentResults = matches.slice(0, 10);
      this.selectedIndex = -1;

      if (this.currentResults.length > 0) {
        this.renderDropdown(this.currentResults, query);
      }

      // If few or no results, query official ArcGIS World Geocoding Server
      if (this.currentResults.length < 4 && query.length >= 2) {
        if (this.currentResults.length === 0) {
          this.renderDropdownLoading();
        }
        this._queryArcGisGeocoder(query, matches);
      }
    }

    /**
     * Query Official ArcGIS World Geocoding Server (Reliable, No 403, Full Iraq Coverage)
     */
    async _queryArcGisGeocoder(query, existingMatches) {
      try {
        const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?singleLine=${encodeURIComponent(query)}&sourceCountry=IRQ&f=json&maxLocations=6&outFields=Match_addr,Addr_type`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('ArcGIS HTTP ' + res.status);
        const data = await res.json();

        if (data && data.candidates && data.candidates.length > 0) {
          const onlineResults = data.candidates
            .filter(c => c.location && (c.score >= 40 || !c.score))
            .map(c => {
              const parts = c.address.split(',').map(s => s.trim());
              const nameAr = parts[0] || c.address;
              const gov = parts.slice(1).join('، ') || 'جمهورية العراق';
              return {
                nameAr,
                nameEn: '',
                gov,
                type: 'معلم وموقع جغرافي (ArcGIS Maps)',
                lat: c.location.y,
                lng: c.location.x,
                zoom: 14,
                source: 'arcgis',
                badge: 'ArcGIS 📍'
              };
            });

          // Deduplicate against existing matches
          const combined = [...(existingMatches || [])];
          onlineResults.forEach(onl => {
            const exists = combined.some(m => Math.abs(m.lat - onl.lat) < 0.005 && Math.abs(m.lng - onl.lng) < 0.005);
            if (!exists) combined.push(onl);
          });

          this.currentResults = combined.slice(0, 10);
          this.renderDropdown(this.currentResults, query);
          return;
        }

        if (!existingMatches || existingMatches.length === 0) {
          this.renderDropdownNoResults(query);
        }
      } catch (err) {
        console.warn('ArcGIS Geocoder notice:', err);
        if (!existingMatches || existingMatches.length === 0) {
          this.renderDropdownNoResults(query);
        }
      }
    }

    /**
     * Execute Immediate Search on Enter
     */
    executeImmediateSearch(query) {
      if (!query || query.length === 0) return;
      if (this.currentResults.length > 0) {
        this.selectResult(this.currentResults[0]);
      } else {
        this.executeSearch(query);
      }
    }

    /**
     * Render Suggestions Dropdown with Pure Black Text and Badges
     */
    renderDropdown(results, rawQuery) {
      if (!this.dropdown) return;

      let html = `
        <div class="px-3.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
          <span>نتائج البحث عن: <strong class="text-sky-700 font-bold">"${rawQuery}"</strong></span>
          <span>${results.length} نتيجة</span>
        </div>
      `;

      results.forEach((item, idx) => {
        const isSelected = idx === this.selectedIndex;
        const iconClass = item.source === 'archaeology' 
          ? 'fa-landmark text-amber-600 bg-amber-100 border-amber-300' 
          : (item.source === 'arcgis' ? 'fa-location-dot text-emerald-600 bg-emerald-100 border-emerald-300' : 'fa-city text-sky-700 bg-sky-100 border-sky-300');

        html += `
          <div class="city-search-item px-3.5 py-2.5 flex items-center justify-between gap-3 ${isSelected ? 'bg-sky-50' : 'bg-white hover:bg-sky-50'} cursor-pointer transition-colors" data-index="${idx}">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg ${iconClass} flex items-center justify-center shrink-0 text-sm border shadow-xs">
                <i class="fa-solid ${item.source === 'archaeology' ? 'fa-landmark' : (item.source === 'arcgis' ? 'fa-location-dot' : 'fa-city')}"></i>
              </div>
              <div class="min-w-0 leading-tight">
                <div class="city-name text-sm font-bold text-black truncate" style="color: #000000 !important; font-weight: 800 !important;">
                  ${item.nameAr} ${item.nameEn ? `<span class="text-[11px] font-normal text-slate-500 font-sans">(${item.nameEn})</span>` : ''}
                </div>
                <div class="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                  <span class="text-sky-800 font-bold">${item.gov}</span> • ${item.type}
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${item.source === 'archaeology' ? 'bg-amber-100 text-amber-900 border border-amber-300' : (item.source === 'arcgis' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-sky-100 text-sky-900 border border-sky-300')}">
                ${item.badge}
              </span>
              <i class="fa-solid fa-arrow-turn-up text-slate-400 -rotate-90 text-xs"></i>
            </div>
          </div>
        `;
      });

      this.dropdown.innerHTML = html;
      this.dropdown.classList.remove('hidden');

      this.dropdown.querySelectorAll('.city-search-item').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(el.dataset.index, 10);
          if (this.currentResults[index]) {
            this.selectResult(this.currentResults[index]);
          }
        });
      });
    }

    /**
     * Render Loading in Dropdown
     */
    renderDropdownLoading() {
      if (!this.dropdown) return;
      this.dropdown.innerHTML = `
        <div class="p-4 text-center text-slate-700 text-xs flex items-center justify-center gap-2">
          <i class="fa-solid fa-spinner animate-spin text-sky-600 text-base"></i>
          <span class="font-bold text-black">جارٍ البحث في معجم المدن وخوادم ArcGIS...</span>
        </div>
      `;
      this.dropdown.classList.remove('hidden');
    }

    /**
     * Render No Results
     */
    renderDropdownNoResults(query) {
      if (!this.dropdown) return;
      this.dropdown.innerHTML = `
        <div class="p-4 text-center text-slate-700 text-xs space-y-1.5">
          <div class="font-black text-black text-sm">لم يتم العثور على موقع يطابق "${query}"</div>
          <div class="text-[11px] text-slate-500">جرب كتابة اسم المدينة بدون أل التعريف (مثلاً: موصل، بصرة، اربيل، كركوك، بابل، الكرادة، الزعفرانية)</div>
        </div>
      `;
      this.dropdown.classList.remove('hidden');
    }

    /**
     * Update Active Item during Keyboard Navigation
     */
    _updateActiveSuggestionItem() {
      if (!this.dropdown) return;
      const items = this.dropdown.querySelectorAll('.city-search-item');
      items.forEach((item, idx) => {
        if (idx === this.selectedIndex) {
          item.classList.add('bg-sky-100', 'border-r-4', 'border-r-sky-600');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('bg-sky-100', 'border-r-4', 'border-r-sky-600');
        }
      });
    }

    /**
     * Select Result & Fly to Location
     */
    selectResult(item) {
      if (!item) return;

      this.map = this.map || window.map || window.atlasMap || null;

      this.closeDropdown();
      this.searchInput.value = item.nameAr;
      if (this.clearBtn) this.clearBtn.classList.remove('hidden');

      const targetLat = item.lat;
      const targetLng = item.lng;
      const targetZoom = item.zoom || 14;

      // 1. Smooth Fly-to Animation
      if (this.map) {
        this.map.flyTo([targetLat, targetLng], targetZoom, {
          duration: 1.3,
          easeLinearity: 0.25
        });
      }

      // 2. High-Contrast Animated Pulse Beacon Pin
      if (this.searchResultMarker && this.map) {
        this.map.removeLayer(this.searchResultMarker);
        this.searchResultMarker = null;
      }

      if (this.map) {
        const beaconIcon = L.divIcon({
          className: 'custom-search-beacon-icon',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="search-beacon-pin w-10 h-10 rounded-full bg-sky-500/35 border-2 border-sky-400 flex items-center justify-center shadow-2xl">
                <div class="w-4 h-4 rounded-full bg-sky-600 border-2 border-white shadow-md"></div>
              </div>
              <div class="absolute -top-7 px-2.5 py-0.5 rounded-lg bg-slate-950/95 text-white border border-sky-400 text-[11px] font-bold whitespace-nowrap shadow-xl">
                ${item.nameAr}
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        this.searchResultMarker = L.marker([targetLat, targetLng], {
          icon: beaconIcon,
          zIndexOffset: 3000
        }).addTo(this.map);
      }

      // 3. Coordinate Calculations
      const latDms = this._formatDms(targetLat, true);
      const lngDms = this._formatDms(targetLng, false);
      const utmEasting = (targetLng * 111320 * Math.cos(targetLat * Math.PI / 180)).toFixed(0);
      const utmNorthing = (targetLat * 110540).toFixed(0);

      // 4. Detailed Popup with Actions
      const popupContent = `
        <div class="p-2.5 max-w-xs space-y-2 select-none text-right font-sans" dir="rtl">
          <div class="border-b border-slate-200 pb-2">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-sm text-black flex items-center gap-1.5" style="color:#000!important">
                <i class="fa-solid fa-location-dot text-sky-600"></i>
                <span>${item.nameAr}</span>
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 border border-sky-300">
                ${item.badge}
              </span>
            </div>
            <div class="text-xs text-slate-600 mt-0.5 font-medium">${item.gov} &bull; ${item.type}</div>
          </div>

          <div class="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px] font-mono space-y-1">
            <div class="flex justify-between">
              <span class="text-slate-500">إحداثيات WGS84:</span>
              <span class="text-black font-bold">${targetLat.toFixed(5)}, ${targetLng.toFixed(5)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">درجات ودقائق (DMS):</span>
              <span class="text-sky-800 font-bold">${latDms}, ${lngDms}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">إسقاط UTM 38N:</span>
              <span class="text-emerald-800 font-bold">E:${utmEasting} N:${utmNorthing}</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 pt-1">
            <button type="button" onclick="window.AtlasDrawingEngine && window.AtlasDrawingEngine.setMode('building')" class="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-sm">
              <i class="fa-solid fa-pen-ruler text-[10px]"></i>
              <span>رسم هنا</span>
            </button>
            <button type="button" onclick="window.openMapLayoutStudio && window.openMapLayoutStudio()" class="flex-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-sm">
              <i class="fa-solid fa-print text-[10px]"></i>
              <span>لوحة طباعة</span>
            </button>
          </div>
        </div>
      `;

      if (this.searchResultMarker) {
        this.searchResultMarker.bindPopup(popupContent, {
          maxWidth: 320,
          className: 'search-result-popup',
          offset: [0, -10]
        }).openPopup();
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`🎯 تم الانتقال إلى: ${item.nameAr} (${item.gov})`, 'success');
      }
    }

    /**
     * Format Coordinate to DMS
     */
    _formatDms(val, isLat) {
      const d = Math.floor(Math.abs(val));
      const m = Math.floor((Math.abs(val) - d) * 60);
      const s = Math.round(((Math.abs(val) - d) * 60 - m) * 60);
      const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
      return `${d}°${m}'${s}"${dir}`;
    }

    /**
     * Close Dropdown
     */
    closeDropdown() {
      if (this.dropdown) {
        this.dropdown.classList.add('hidden');
        this.dropdown.innerHTML = '';
      }
      this.selectedIndex = -1;
    }
  }

  // Instantiate and expose globally
  window.AtlasCitySearch = new CitySearchEngine();

  function _tryInitCitySearch(attempts) {
    const mapRef = window.map || window.atlasMap;
    if (mapRef) {
      window.AtlasCitySearch.init(mapRef);
      return;
    }
    if (attempts > 0) {
      setTimeout(() => _tryInitCitySearch(attempts - 1), 200);
    } else {
      window.AtlasCitySearch.init(null);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => _tryInitCitySearch(30));
  } else {
    _tryInitCitySearch(30);
  }

  window.searchCityOrPlace = function (query) {
    if (window.AtlasCitySearch) {
      window.AtlasCitySearch.executeImmediateSearch(query);
    }
  };

})();
