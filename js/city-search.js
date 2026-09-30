/**
 * ============================================================================
 * Iraq & Global City and Place Intelligent Search Engine
 * محرك البحث الجغرافي الذكي للمدن والأقضية والمعالم في العراق
 * 
 * Features:
 *  - Instant Offline Gazetteer of All Iraqi Governorates, Major Cities, Districts & Landmarks
 *  - Live Integration with Historical/Archaeological Sites Database (IRAQ_ARCHAEOLOGY_DATA)
 *  - Online Fallback to ESRI World Geocoding & OpenStreetMap Nominatim
 *  - Arabic Phonetic & Orthographic Normalization (إزالة الهمزات والتاء المربوطة وأل التعريف)
 *  - High-Contrast Input with Pure Black Typed Text (#000000)
 *  - Live Interactive Suggestions Dropdown with Keyboard Navigation (Up/Down/Enter/Esc)
 *  - Smooth Fly-To Animation, Location Pulse Beacon Marker, and Detailed Coordinate Popup (WGS84 & UTM)
 *  - Direct Action Shortcuts: [📐 تحديد إطار اللوحة A0-A4] & [✏️ أدوات الرسم والتخطيط]
 * ============================================================================
 */

(function () {
  'use strict';

  // Comprehensive Iraqi Cities, Districts, Towns, and Geographic Gazetteer
  const IRAQI_CITIES_GAZETTEER = [
    // 1. العاصمة والمحافظات الكبرى
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

    // 2. أقضية ومدن رئيسية ومراكز حضرية في نينوى وكردستان وبغداد وباقي المحافظات
    { nameAr: 'تلعفر', nameEn: 'Tal Afar', gov: 'محافظة نينوى', type: 'قضاء غرب الموصل والقلعة', lat: 36.3769, lng: 42.4519, zoom: 14 },
    { nameAr: 'سنجار', nameEn: 'Sinjar', gov: 'محافظة نينوى', type: 'قضاء وجبل سنجار التاريخي', lat: 36.3197, lng: 41.8608, zoom: 14 },
    { nameAr: 'الحمدانية (بغديدا)', nameEn: 'Hamdaniya (Bakhdida)', gov: 'محافظة نينوى', type: 'قضاء سهل نينوى التاريخي', lat: 36.2700, lng: 43.3769, zoom: 14 },
    { nameAr: 'برطلة', nameEn: 'Bartella', gov: 'محافظة نينوى', type: 'ناحية في سهل نينوى', lat: 36.3536, lng: 43.3828, zoom: 14 },
    { nameAr: 'بعشيقة', nameEn: 'Bashiqa', gov: 'محافظة نينوى', type: 'ناحية وبساتين الزيتون والسمسم', lat: 36.4528, lng: 43.3444, zoom: 14 },
    { nameAr: 'تلكيف', nameEn: 'Tel Keppe', gov: 'محافظة نينوى', type: 'قضاء شمال مدينة الموصل', lat: 36.4917, lng: 43.1206, zoom: 14 },
    { nameAr: 'القوش', nameEn: 'Alqosh', gov: 'محافظة نينوى', type: 'بلدة ودير الربان هرمزد وجبل القوش', lat: 36.7328, lng: 43.0931, zoom: 14 },
    { nameAr: 'شيخان (عين سفني)', nameEn: 'Shekhan', gov: 'محافظة نينوى', type: 'قضاء شيخان ومعبد لالش', lat: 36.7167, lng: 43.3500, zoom: 14 },
    { nameAr: 'مخمور', nameEn: 'Makhmur', gov: 'محافظة نينوى / أربيل', type: 'قضاء مخمور وسهل قراج', lat: 35.7744, lng: 43.5878, zoom: 13 },
    { nameAr: 'الحضر', nameEn: 'Hatra City', gov: 'محافظة نينوى', type: 'قضاء الحضر والمدينة الأثرية', lat: 35.5869, lng: 42.7186, zoom: 14 },
    { nameAr: 'الشرقاط', nameEn: 'Shirqat', gov: 'محافظة صلاح الدين', type: 'قضاء الشرقاط وقلعة آشور التاريخية', lat: 35.4950, lng: 43.2439, zoom: 13 },
    { nameAr: 'عقرة', nameEn: 'Akre', gov: 'محافظة دهوك', type: 'قضاء الجبال الخضراء والمدرجات', lat: 36.7461, lng: 43.8936, zoom: 14 },
    { nameAr: 'زاخو', nameEn: 'Zakho', gov: 'محافظة دهوك', type: 'قضاء زاخو وجسر دلال التاريخي', lat: 37.1436, lng: 42.6869, zoom: 13 },
    { nameAr: 'العمادية', nameEn: 'Amadiya', gov: 'محافظة دهوك', type: 'قلعة وحصن أثري فوق قمة الجبل', lat: 37.0911, lng: 43.4878, zoom: 14 },
    { nameAr: 'شقلاوة', nameEn: 'Shaqlawa', gov: 'محافظة أربيل', type: 'مصيف سياحي تحت جبل سفين', lat: 36.4069, lng: 44.3411, zoom: 14 },
    { nameAr: 'راوندوز', nameEn: 'Rawanduz', gov: 'محافظة أربيل', type: 'قضاء وشلالات كلي علي بك', lat: 36.6111, lng: 44.5242, zoom: 14 },
    { nameAr: 'سوران', nameEn: 'Soran', gov: 'محافظة أربيل', type: 'قضاء سوران وديانا', lat: 36.6500, lng: 44.5300, zoom: 13 },
    { nameAr: 'كويسنجق (كويه)', nameEn: 'Koy Sanjaq', gov: 'محافظة أربيل', type: 'قضاء تاريخي وثقافي', lat: 36.0833, lng: 44.6333, zoom: 13 },
    { nameAr: 'رانية', nameEn: 'Ranya', gov: 'محافظة السليمانية', type: 'قضاء وبوابة بحيرة دوكان', lat: 36.2550, lng: 44.8828, zoom: 13 },
    { nameAr: 'دوكان', nameEn: 'Dukan', gov: 'محافظة السليمانية', type: 'قضاء وسد وبحيرة دوكان السياحية', lat: 35.9500, lng: 44.9600, zoom: 14 },
    { nameAr: 'حلبجة', nameEn: 'Halabja', gov: 'محافظة حلبجة', type: 'مركز المحافظة وبساتين الرمان', lat: 35.1778, lng: 45.9861, zoom: 13 },
    { nameAr: 'كلار', nameEn: 'Kalar', gov: 'محافظة السليمانية', type: 'قضاء في منطقة كرميان على نهر سيروان', lat: 34.6256, lng: 45.3164, zoom: 13 },
    { nameAr: 'خانقين', nameEn: 'Khanaqin', gov: 'محافظة ديالى', type: 'قضاء حدودي على نهر الوند وجسر الوند', lat: 34.3575, lng: 45.3853, zoom: 13 },
    { nameAr: 'المقدادية (شهربان)', nameEn: 'Muqdadiyah', gov: 'محافظة ديالى', type: 'قضاء شهربان وبساتين النخيل', lat: 33.9786, lng: 44.9367, zoom: 13 },
    { nameAr: 'بلدروز', nameEn: 'Baladrooz', gov: 'محافظة ديالى', type: 'قضاء بلدروز', lat: 33.6931, lng: 45.0289, zoom: 13 },
    { nameAr: 'الخالص', nameEn: 'Khalis', gov: 'محافظة ديالى', type: 'قضاء الخالص الزراعي', lat: 33.8500, lng: 44.5300, zoom: 13 },

    // 3. أحياء ومناطق عاصمة الرشيد (بغداد)
    { nameAr: 'الكاظمية', nameEn: 'Kadhimiyah', gov: 'محافظة بغداد', type: 'قضاء الكاظمية والروضة الكاظمية المقدسة', lat: 33.3811, lng: 44.3411, zoom: 14 },
    { nameAr: 'الأعظمية', nameEn: 'Adhamiyah', gov: 'محافظة بغداد', type: 'قضاء الأعظمية وجامع الإمام أبي حنيفة', lat: 33.3725, lng: 44.3611, zoom: 14 },
    { nameAr: 'الكرادة', nameEn: 'Karrada', gov: 'محافظة بغداد', type: 'شبه جزيرة الكرادة الشرقية والعرصات', lat: 33.3050, lng: 44.4250, zoom: 14 },
    { nameAr: 'المنصور', nameEn: 'Mansour', gov: 'محافظة بغداد', type: 'قضاء المنصور وشارع الأميرات واليرموك', lat: 33.3100, lng: 44.3450, zoom: 14 },
    { nameAr: 'الرصافة القديمة (شارع الرشيد والشارع النهري)', nameEn: 'Al-Rusafa Al-Qadeema', gov: 'محافظة بغداد', type: 'قلب بغداد التراثي والقشلة وسوق الصفافير', lat: 33.3400, lng: 44.4000, zoom: 15 },
    { nameAr: 'الكرخ (الشواكة والصالحية)', nameEn: 'Karkh', gov: 'محافظة بغداد', type: 'جانب الكرخ التاريخي ومتحف العراق', lat: 33.3250, lng: 44.3800, zoom: 15 },
    { nameAr: 'الفضيلية', nameEn: 'Al-Fadiliyah', gov: 'محافظة بغداد', type: 'ناحية الفضيلية شرق بغداد (نطاق الخارطة المصححة)', lat: 33.3283, lng: 44.4981, zoom: 14 },
    { nameAr: 'أبو غريب', nameEn: 'Abu Ghraib', gov: 'محافظة بغداد', type: 'قضاء غرب بغداد ومحطة أبحاث الزراعة', lat: 33.3061, lng: 44.1783, zoom: 13 },
    { nameAr: 'المدائن (سلمان باك)', nameEn: 'Madaen (Salman Pak)', gov: 'محافظة بغداد', type: 'قضاء جنوب بغداد وموقع طاق كسرى', lat: 33.1000, lng: 44.5833, zoom: 14 },
    { nameAr: 'المحمودية', nameEn: 'Mahmoudiyah', gov: 'محافظة بغداد', type: 'قضاء المحمودية جنوب بغداد', lat: 33.0617, lng: 44.3611, zoom: 13 },
    { nameAr: 'الدورة', nameEn: 'Dora', gov: 'محافظة بغداد', type: 'قضاء الدورة ومصفاة الدورة النفطية', lat: 33.2500, lng: 44.4100, zoom: 14 },
    { nameAr: 'مدينة الصدر', nameEn: 'Sadr City', gov: 'محافظة بغداد', type: 'شرق بغداد وقناة الجيش', lat: 33.3850, lng: 44.4600, zoom: 14 },

    // 4. الفرات الأوسط والجنوب والغرب
    { nameAr: 'الكوفة', nameEn: 'Kufa', gov: 'محافظة النجف', type: 'قضاء الكوفة ومسجد الكوفة المعظم', lat: 32.0300, lng: 44.4000, zoom: 14 },
    { nameAr: 'المناذرة', nameEn: 'Manathera', gov: 'محافظة النجف', type: 'قضاء المناذرة وبساتين الفرات', lat: 31.8500, lng: 44.4833, zoom: 13 },
    { nameAr: 'عين التمر (شثاثا)', nameEn: 'Ain Al-Tamur', gov: 'محافظة كربلاء', type: 'واحة النخيل والعيون الكبريتية الطبيعية', lat: 32.5667, lng: 43.4833, zoom: 14 },
    { nameAr: 'الهندية (طويريج)', nameEn: 'Hindiya (Tuwairij)', gov: 'محافظة كربلاء', type: 'قضاء وسدة الهندية التاريخية على الفرات', lat: 32.5500, lng: 44.2333, zoom: 14 },
    { nameAr: 'المسيب', nameEn: 'Musayyib', gov: 'محافظة بابل', type: 'قضاء المسيب على ضفاف الفرات', lat: 32.7800, lng: 44.2900, zoom: 13 },
    { nameAr: 'المحاويل', nameEn: 'Mahawil', gov: 'محافظة بابل', type: 'قضاء المحاويل شمال مدينة الحلة', lat: 32.6567, lng: 44.4072, zoom: 13 },
    { nameAr: 'الهاشمية', nameEn: 'Hashimiya', gov: 'محافظة بابل', type: 'قضاء الهاشمية جنوب الحلة', lat: 32.3486, lng: 44.6294, zoom: 13 },
    { nameAr: 'هيت', nameEn: 'Hit', gov: 'محافظة الأنبار', type: 'مدينة عيون القير والنواعير التاريخية', lat: 33.6417, lng: 42.8250, zoom: 13 },
    { nameAr: 'حديثة', nameEn: 'Haditha', gov: 'محافظة الأنبار', type: 'قضاء وسد حديثة وبحيرة القادسية', lat: 34.1378, lng: 42.3789, zoom: 13 },
    { nameAr: 'عنه', nameEn: 'Anah', gov: 'محافظة الأنبار', type: 'قضاء وجزيرة عنه ومئذنتها الأثرية', lat: 34.4694, lng: 41.9500, zoom: 13 },
    { nameAr: 'راوة', nameEn: 'Rawa', gov: 'محافظة الأنبار', type: 'قضاء راوة على جرف الفرات', lat: 34.4756, lng: 41.9167, zoom: 13 },
    { nameAr: 'القائم', nameEn: 'Al-Qaim', gov: 'محافظة الأنبار', type: 'قضاء حدودي على مجرى الفرات', lat: 34.3644, lng: 41.0850, zoom: 13 },
    { nameAr: 'الرطبة', nameEn: 'Rutba', gov: 'محافظة الأنبار', type: 'قضاء قلب البادية الغربية', lat: 33.0333, lng: 40.2833, zoom: 13 },
    { nameAr: 'بلد', nameEn: 'Balad', gov: 'محافظة صلاح الدين', type: 'قضاء بلد ومرقد السيد محمد سبع الدجيل', lat: 34.0142, lng: 44.1444, zoom: 13 },
    { nameAr: 'الدجيل', nameEn: 'Dujail', gov: 'محافظة صلاح الدين', type: 'قضاء الدجيل وبساتين النخيل والرمان', lat: 33.8467, lng: 44.2378, zoom: 13 },
    { nameAr: 'بيجي', nameEn: 'Baiji', gov: 'محافظة صلاح الدين', type: 'قضاء ومصفاة بيجي النفطية الكبرى', lat: 34.9300, lng: 43.4900, zoom: 13 },
    { nameAr: 'طوزخورماتو', nameEn: 'Tuz Khurmatu', gov: 'محافظة صلاح الدين', type: 'قضاء طوزخورماتو', lat: 34.8878, lng: 44.6369, zoom: 13 },
    { nameAr: 'الحويجة', nameEn: 'Hawija', gov: 'محافظة كركوك', type: 'قضاء الحويجة وسهل الحويجة الزراعي', lat: 35.3250, lng: 43.7742, zoom: 13 },
    { nameAr: 'داقوق', nameEn: 'Daquq', gov: 'محافظة كركوك', type: 'قضاء داقوق والمنارة الأثرية', lat: 35.0800, lng: 44.4500, zoom: 13 },
    { nameAr: 'القرنة', nameEn: 'Qurna', gov: 'محافظة البصرة', type: 'ملتقى دجلة والفرات لتكوين شط العرب', lat: 31.0156, lng: 47.4319, zoom: 14 },
    { nameAr: 'الزبير', nameEn: 'Zubair', gov: 'محافظة البصرة', type: 'قضاء الزبير وموقع البصرة القديمة', lat: 30.3900, lng: 47.7000, zoom: 13 },
    { nameAr: 'الفاو', nameEn: 'Faw', gov: 'محافظة البصرة', type: 'شبه جزيرة الفاو وميناء الفاو الكبير على الخليج العربي', lat: 29.9742, lng: 48.4731, zoom: 13 },
    { nameAr: 'شط العرب (التنومة)', nameEn: 'Shatt Al-Arab (Tanuma)', gov: 'محافظة البصرة', type: 'قضاء شرق شط العرب', lat: 30.5200, lng: 47.8500, zoom: 13 },
    { nameAr: 'أم قصر', nameEn: 'Umm Qasr', gov: 'محافظة البصرة', type: 'الميناء التجاري العراقي على خور عبد الله', lat: 30.0333, lng: 47.9167, zoom: 13 },
    { nameAr: 'الچبايش', nameEn: 'Chibayish', gov: 'محافظة ذي قار', type: 'قلب الأهوار الوسطى وهور الحمار', lat: 30.9500, lng: 47.0167, zoom: 14 },
    { nameAr: 'سوق الشيوخ', nameEn: 'Suq Al-Shuyukh', gov: 'محافظة ذي قار', type: 'قضاء جنوب الناصرية على الفرات', lat: 30.8833, lng: 46.4667, zoom: 13 },
    { nameAr: 'الشطرة', nameEn: 'Shatrah', gov: 'محافظة ذي قار', type: 'قضاء الشطرة على نهر الغراف', lat: 31.4167, lng: 46.1667, zoom: 13 },
    { nameAr: 'الرفاعي', nameEn: 'Rifaie', gov: 'محافظة ذي قار', type: 'قضاء الرفاعي شمال ذي قار', lat: 31.6200, lng: 46.0600, zoom: 13 },
    { nameAr: 'المجر الكبير', nameEn: 'Al-Majar Al-Kabir', gov: 'محافظة ميسان', type: 'قضاء جنوب العمارة ومداخل الأهوار', lat: 31.5794, lng: 47.1611, zoom: 13 },
    { nameAr: 'علي الغربي', nameEn: 'Ali Al-Gharbi', gov: 'محافظة ميسان', type: 'قضاء شمال العمارة وقرب جبال حمرين', lat: 32.4600, lng: 46.6900, zoom: 13 },
    { nameAr: 'قلعة صالح', nameEn: 'Qalat Saleh', gov: 'محافظة ميسان', type: 'قضاء قلعة صالح على دجلة', lat: 31.5167, lng: 47.2833, zoom: 13 },
    { nameAr: 'الشامية', nameEn: 'Shamiya', gov: 'محافظة القادسية', type: 'قضاء الشامية ومزارع رز العنبر العراقي', lat: 31.9628, lng: 44.6008, zoom: 13 },
    { nameAr: 'عفك', nameEn: 'Afak', gov: 'محافظة القادسية', type: 'قضاء عفك وموقع مدينة نيبور الأثرية', lat: 32.0667, lng: 45.2500, zoom: 13 },
    { nameAr: 'الرميثة', nameEn: 'Rumaitha', gov: 'محافظة المثنى', type: 'قضاء الرميثة ومهد ثورة العشرين', lat: 31.5300, lng: 45.2000, zoom: 13 },
    { nameAr: 'الخضر', nameEn: 'Khidhir', gov: 'محافظة المثنى', type: 'قضاء الخضر على الفرات', lat: 31.1833, lng: 45.5667, zoom: 13 },

    // 5. المعالم والمواقع الأثرية الكبرى لبلاد الرافدين
    { nameAr: 'آثار بابل والمدينة القديمة', nameEn: 'Babylon Ancient City', gov: 'محافظة بابل', type: 'موقع تراث عالمي UNESCO وبوابة عشتار', lat: 32.5422, lng: 44.4211, zoom: 15 },
    { nameAr: 'مدينة أور الأثرية والزقورة', nameEn: 'Ur Ziggurat & Royal Tombs', gov: 'محافظة ذي قار', type: 'موقع تراث عالمي UNESCO وعاصمة السومريين', lat: 30.9622, lng: 46.1031, zoom: 15 },
    { nameAr: 'نينوى الأثرية (تل قوينجق والنبي يونس)', nameEn: 'Nineveh Ancient Capital', gov: 'محافظة نينوى', type: 'عاصمة الإمبراطورية الآشورية وقصور سنحاريب', lat: 36.3589, lng: 43.1517, zoom: 15 },
    { nameAr: 'مملكة الحضر الأثرية', nameEn: 'Hatra World Heritage Site', gov: 'محافظة نينوى', type: 'موقع تراث عالمي UNESCO ومملكة عربايا', lat: 35.5869, lng: 42.7186, zoom: 15 },
    { nameAr: 'نمرود (كالح الآشورية)', nameEn: 'Nimrud (Kalhu)', gov: 'محافظة نينوى', type: 'العاصمة الآشورية وقصر آشور ناصربال الثاني', lat: 36.0986, lng: 43.3308, zoom: 15 },
    { nameAr: 'آشور (قلعة الشرقاط)', nameEn: 'Ashur (Qalat Sherqat)', gov: 'محافظة صلاح الدين', type: 'موقع تراث عالمي UNESCO والمهد الديني لآشور', lat: 35.4567, lng: 43.2611, zoom: 15 },
    { nameAr: 'سامراء والملوية والجامع الكبير', nameEn: 'Samarra Archaeological City', gov: 'محافظة صلاح الدين', type: 'موقع تراث عالمي UNESCO والمئذنة الملوية', lat: 34.2069, lng: 43.8803, zoom: 15 },
    { nameAr: 'طاق كسرى وإيوان المدائن', nameEn: 'Arch of Ctesiphon (Taq Kasra)', gov: 'محافظة بغداد', type: 'أكبر طاق مشيد من الطابوق في العالم القديم', lat: 33.0936, lng: 44.5811, zoom: 15 },
    { nameAr: 'عقرقوف (دور كوريكالزو)', nameEn: 'Aqar Quf (Dur-Kurigalzu)', gov: 'محافظة بغداد', type: 'عاصمة الكاشيين وزقورة عقرقوف الشامخة', lat: 33.3556, lng: 44.2017, zoom: 15 },
    { nameAr: 'إريدو (تل أبو شهرين)', nameEn: 'Eridu', gov: 'محافظة ذي قار', type: 'أقدم مدينة في التاريخ البشري وزقورة إنكي', lat: 30.8167, lng: 45.9972, zoom: 15 },
    { nameAr: 'أوروك (الوركاء)', nameEn: 'Uruk (Warka)', gov: 'محافظة المثنى', type: 'موقع تراث عالمي UNESCO ومهد الكتابة المسمارية وملحمة كلكامش', lat: 31.3222, lng: 45.6361, zoom: 15 },
    { nameAr: 'نيبور (مدينة نَفَّر المقدسة)', nameEn: 'Nippur (Nuffar)', gov: 'محافظة القادسية', type: 'المركز الديني السومري ومعبد الإله إنليل', lat: 32.1256, lng: 45.2306, zoom: 15 },
    { nameAr: 'كيش (تل الأحيمر)', nameEn: 'Kish', gov: 'محافظة بابل', type: 'مدينة كيش أولى ملوك ما بعد الطوفان', lat: 32.5408, lng: 44.6033, zoom: 15 },
    { nameAr: 'خورسباد (دور شروكين)', nameEn: 'Khorsabad (Dur-Sharrukin)', gov: 'محافظة نينوى', type: 'عاصمة الملك الآشوري سرجون الثاني والثيران المجنحة', lat: 36.5097, lng: 43.2272, zoom: 15 },
    { nameAr: 'بورسيبا (تل إبراهيم الخليل)', nameEn: 'Borsippa (Birs Nimrud)', gov: 'محافظة بابل', type: 'زقورة بورسيبا وبرج بابل ومعبد نابو', lat: 32.3917, lng: 44.3417, zoom: 15 },
    { nameAr: 'حصن الأخيضر', nameEn: 'Ukhaidir Fortress', gov: 'محافظة كربلاء', type: 'حصن إسلامي عباسي ضخم في قلب البادية', lat: 32.4419, lng: 43.6022, zoom: 15 }
  ];

  class CitySearchEngine {
    constructor() {
      this.map = null;
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
      // Resolve map — caller may pass null if not yet ready; always refresh from window
      this.map = mapInstance || window.map || window.atlasMap || null;

      // Prevent double-binding events if already initialized
      if (this._initialized) {
        // Just refresh the map reference if it wasn't set before
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
      console.log('🔍 CitySearchEngine: Intelligent Iraqi City & Place Search Engine — ready (map:', this.map ? 'linked' : 'pending', ')');
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
          this.executeSearch(val);
        }, 150);
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
        this.clearBtn.addEventListener('click', () => {
          this.searchInput.value = '';
          this.clearBtn.classList.add('hidden');
          this.closeDropdown();
          this.searchInput.focus();
        });
      }

      // 4. Submit button click
      if (this.submitBtn) {
        this.submitBtn.addEventListener('click', () => {
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

      // 6. Re-focus dropdown on focus if value exists
      this.searchInput.addEventListener('focus', () => {
        if (this.searchInput.value.trim().length >= 1) {
          this.executeSearch(this.searchInput.value.trim());
        }
      });
    }

    /**
     * Arabic Text Normalization for tolerant search
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
        .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Tashkeel / Harakat
        .replace(/^(ال)/, '') // Remove definite article prefix
        .trim();
    }

    /**
     * Search Across Local Gazetteer + Archaeological Database + Online Geocoder
     */
    async executeSearch(query) {
      if (!query || query.length === 0) {
        this.closeDropdown();
        return;
      }

      const normQ = this._normalizeArabic(query);
      const lowerQ = query.toLowerCase();

      // 1. Search in Curated Iraqi Cities Gazetteer
      let matches = [];
      IRAQI_CITIES_GAZETTEER.forEach(item => {
        const normName = this._normalizeArabic(item.nameAr);
        const normGov = this._normalizeArabic(item.gov);
        const engName = (item.nameEn || '').toLowerCase();

        let score = 0;
        if (normName === normQ) score += 100;
        else if (normName.startsWith(normQ)) score += 60;
        else if (normName.includes(normQ)) score += 40;
        else if (normGov.includes(normQ)) score += 20;
        else if (engName.includes(lowerQ)) score += 30;

        if (score > 0) {
          matches.push({
            ...item,
            score,
            source: 'city',
            badge: 'مدينة / قضاء'
          });
        }
      });

      // 2. Search in Curated Archaeological Sites Database
      if (window.IRAQ_ARCHAEOLOGY_DATA && window.IRAQ_ARCHAEOLOGY_DATA.sites) {
        window.IRAQ_ARCHAEOLOGY_DATA.sites.forEach(site => {
          const normSite = this._normalizeArabic(site.name_ar);
          const normGov = this._normalizeArabic(site.governorate);
          const normPeriod = this._normalizeArabic(site.period);
          const engName = (site.name_en || '').toLowerCase();

          let score = 0;
          if (normSite === normQ) score += 95;
          else if (normSite.startsWith(normQ)) score += 55;
          else if (normSite.includes(normQ)) score += 35;
          else if (normGov.includes(normQ)) score += 18;
          else if (normPeriod.includes(normQ)) score += 15;
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
              badge: 'موقع أثري 🏛️'
            });
          }
        });
      }

      // Sort by match relevance score descending
      matches.sort((a, b) => b.score - a.score);
      this.currentResults = matches.slice(0, 8);
      this.selectedIndex = -1;

      // Render Dropdown
      if (this.currentResults.length > 0) {
        this.renderDropdown(this.currentResults, query);
      } else {
        // Query Online Geocoder if local gazetteer yielded no results
        this.renderDropdownLoading();
        this._queryOnlineFallback(query);
      }
    }

    /**
     * Query Online Geocoder (Nominatim / Esri) for places not in offline gazetteer
     */
    async _queryOnlineFallback(query) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=iq&limit=5&accept-language=ar`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('Geocoding network error');
        const data = await res.json();

        if (data && data.length > 0) {
          this.currentResults = data.map(item => ({
            nameAr: item.display_name.split(',')[0],
            nameEn: item.name || '',
            gov: item.display_name.split(',').slice(1, 3).join('، '),
            type: item.type || 'مكان جغرافي',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            zoom: 14,
            source: 'online',
            badge: 'موقع جغرافي 📍'
          }));
          this.renderDropdown(this.currentResults, query);
        } else {
          this.renderDropdownNoResults(query);
        }
      } catch (err) {
        console.warn('CitySearchEngine: Online fallback notice:', err);
        this.renderDropdownNoResults(query);
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
     * Render Suggestions Dropdown
     */
    renderDropdown(results, rawQuery) {
      if (!this.dropdown) return;

      let html = '';
      results.forEach((item, idx) => {
        const isSelected = idx === this.selectedIndex;
        const iconClass = item.source === 'archaeology' 
          ? 'fa-landmark text-amber-500 bg-amber-50' 
          : (item.source === 'city' ? 'fa-city text-sky-600 bg-sky-50' : 'fa-location-dot text-rose-500 bg-rose-50');

        html += `
          <div class="city-search-item px-3.5 py-2.5 flex items-center justify-between gap-3 ${isSelected ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'}" data-index="${idx}">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg ${iconClass} flex items-center justify-center shrink-0 text-sm border border-slate-200 shadow-xs">
                <i class="fa-solid ${item.source === 'archaeology' ? 'fa-landmark' : (item.source === 'city' ? 'fa-city' : 'fa-location-dot')}"></i>
              </div>
              <div class="min-w-0 leading-tight">
                <div class="city-name text-sm font-bold text-black truncate" style="color: #000000 !important;">
                  ${item.nameAr} ${item.nameEn ? `<span class="text-[11px] font-normal text-slate-500 font-sans">(${item.nameEn})</span>` : ''}
                </div>
                <div class="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                  <span class="text-sky-700 font-semibold">${item.gov}</span> • ${item.type}
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${item.source === 'archaeology' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-sky-100 text-sky-800 border border-sky-300'}">
                ${item.badge}
              </span>
              <i class="fa-solid fa-arrow-turn-up text-slate-400 -rotate-90 text-xs"></i>
            </div>
          </div>
        `;
      });

      this.dropdown.innerHTML = html;
      this.dropdown.classList.remove('hidden');

      // Bind click handlers to items
      this.dropdown.querySelectorAll('.city-search-item').forEach(el => {
        el.addEventListener('click', () => {
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
        <div class="p-4 text-center text-slate-600 text-xs flex items-center justify-center gap-2">
          <i class="fa-solid fa-spinner animate-spin text-sky-600"></i>
          <span class="font-semibold text-black">جاري البحث في المعجم والخرائط الجغرافية...</span>
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
        <div class="p-4 text-center text-slate-600 text-xs space-y-1">
          <div class="font-bold text-black">لم يتم العثور على مدينة أو موقع يطابق "${query}"</div>
          <div class="text-[11px] text-slate-500">جرب كتابة اسم المدينة بدون أل التعريف (مثلاً: موصل، بصرة، اربيل، كركوك، بابل)</div>
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
          item.classList.add('bg-slate-100', 'border-r-4', 'border-r-sky-600');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('bg-slate-100', 'border-r-4', 'border-r-sky-600');
        }
      });
    }

    /**
     * Select Result & Fly to Location
     */
    selectResult(item) {
      if (!item) return;

      // Always attempt to refresh map reference at call-time in case it wasn't set at init
      if (!this.map) {
        this.map = window.map || window.atlasMap || null;
      }

      this.closeDropdown();
      this.searchInput.value = item.nameAr;
      if (this.clearBtn) this.clearBtn.classList.remove('hidden');

      const targetLat = item.lat;
      const targetLng = item.lng;
      const targetZoom = item.zoom || 13;

      // 1. Smooth Fly-to Animation (only if map is available)
      if (this.map) {
        this.map.flyTo([targetLat, targetLng], targetZoom, {
          duration: 1.4,
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
              <div class="search-beacon-pin w-9 h-9 rounded-full bg-sky-500/30 border-2 border-sky-400 flex items-center justify-center shadow-2xl">
                <div class="w-4 h-4 rounded-full bg-sky-600 border-2 border-white shadow-md"></div>
              </div>
              <div class="absolute -top-7 px-2 py-0.5 rounded-md bg-slate-950/90 text-white border border-sky-400 text-[10px] font-bold whitespace-nowrap shadow-lg">
                ${item.nameAr}
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        this.searchResultMarker = L.marker([targetLat, targetLng], {
          icon: beaconIcon,
          zIndexOffset: 2000
        }).addTo(this.map);
      }


      // 3. Coordinate Calculations for Display
      const latDms = this._formatDms(targetLat, true);
      const lngDms = this._formatDms(targetLng, false);
      const utmEasting = (targetLng * 111320 * Math.cos(targetLat * Math.PI / 180)).toFixed(0);
      const utmNorthing = (targetLat * 110540).toFixed(0);

      // 4. Detailed Popup with Actions
      const popupContent = `
        <div class="p-2.5 max-w-xs space-y-2 select-none" dir="rtl">
          <div class="border-b border-slate-200 pb-2">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-sm text-slate-900 leading-tight">${item.nameAr}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">${item.badge}</span>
            </div>
            <div class="text-xs text-slate-600 font-medium mt-0.5">
              ${item.gov} • ${item.type}
            </div>
          </div>

          <div class="bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700 space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">WGS84:</span>
              <span class="font-bold text-slate-900">${targetLat.toFixed(5)}°, ${targetLng.toFixed(5)}°</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">DMS:</span>
              <span>${latDms} | ${lngDms}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">UTM (Z38N):</span>
              <span>E: ${utmEasting} | N: ${utmNorthing}</span>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="grid grid-cols-2 gap-1.5 pt-1">
            <button type="button" onclick="window.AtlasLayoutStudio ? window.AtlasLayoutStudio.showSelectionFrame() : null" class="px-2 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer">
              <i class="fa-solid fa-print"></i>
              <span>لوحة A0-A4</span>
            </button>
            <button type="button" onclick="window.setDrawingMode ? window.setDrawingMode('building') : null" class="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer">
              <i class="fa-solid fa-pen-ruler"></i>
              <span>بدء الرسم</span>
            </button>
          </div>
        </div>
      `;

      if (this.searchResultMarker) {
        this.searchResultMarker.bindPopup(popupContent, { maxWidth: 280 }).openPopup();
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

  /**
   * Robust deferred initialization: retries until window.map is available.
   * Solves the race condition where city-search.js loads before atlas-core.js
   * creates the Leaflet map, causing DOMContentLoaded to fire with window.map = undefined.
   */
  function _tryInitCitySearch(attempts) {
    const mapRef = window.map || window.atlasMap;
    if (mapRef) {
      window.AtlasCitySearch.init(mapRef);
      return;
    }
    if (attempts > 0) {
      setTimeout(() => _tryInitCitySearch(attempts - 1), 200);
    } else {
      console.warn('CitySearchEngine: map not available after max retries — will init without map (input events only).');
      window.AtlasCitySearch.init(null);
    }
  }

  // Start polling after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => _tryInitCitySearch(25)); // up to 5 sec
  } else {
    _tryInitCitySearch(25);
  }

  // Global helper
  window.searchCityOrPlace = function (query) {
    if (window.AtlasCitySearch) {
      window.AtlasCitySearch.executeImmediateSearch(query);
    }
  };

})();
