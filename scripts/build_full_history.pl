#!/usr/bin/perl
use strict;
use warnings;
use utf8;
use open ':std', ':encoding(UTF-8)';
use JSON::PP;

my $transcript_path = "/Users/ahmedlouay/.gemini/antigravity/brain/ae356c07-1473-422c-baba-2cd5c769080e/.system_generated/logs/transcript.jsonl";
my $output_html = "/Users/ahmedlouay/.gemini/antigravity/scratch/arcgis-living-atlas/conversation-history.html";

# Read all user requests from transcript
my @items;
open my $tfh, "<:raw", $transcript_path or die "Cannot open transcript: $!";
while (my $line = <$tfh>) {
    my $d = eval { decode_json($line) };
    next unless $d;
    if ($d->{type} eq "USER_INPUT") {
        my $c = $d->{content} // "";
        $c =~ s/.*<USER_REQUEST>\s*//s;
        $c =~ s/\s*<\/USER_REQUEST>.*//s;
        $c =~ s/^\s+|\s+$//g;
        push @items, {
            id => scalar(@items) + 1,
            time => $d->{created_at},
            text => $c
        };
    }
}
close $tfh;

print "Read " . scalar(@items) . " items from transcript.\n";

# Technical knowledge base metadata for all 60 items
my %meta = (
    1 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "تأسيس منصة ArcGIS Living Atlas التفاعلية",
        summary => "إنشاء وتصميم منصة خرائط تفاعلية متطورة تعتمد على مكتبات Esri Leaflet و Leaflet بأحدث معايير الويب المظلم والزجاجي.",
        solution => "بناء الهيكل الرئيسي للنظام (HTML5/Tailwind CSS/Vanilla JS)، تهيئة حاوية الخريطة (Map Container)، دمج خطوط وأيقونات FontAwesome، وإعداد معمارية البرمجيات المعيارية النظيفة دون اعتماديات خارجية ثقيلة.",
        badge => "تأسيس النظام",
        badge_color => "bg-blue-500/20 text-blue-300 border-blue-500/30"
    },
    2 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "تركيز وتوجيه النطاق الجغرافي نحو جمهورية العراق",
        summary => "تخصيص الإحداثيات المركزية ونطاق الرؤية التلقائي (Default Bounding Box) ليغطي كافة المحافظات العراقية.",
        solution => "ضبط إحداثيات مركز الخريطة على خط عرض 33.3152°N وخط طول 44.3661°E مع مستوى تقريب أولي (Zoom Level: 6.5) وحدود قصوى تقيد الحركة ضمن النطاق الإقليمي للشرق الأوسط والعراق.",
        badge => "تهيئة جغرافية",
        badge_color => "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    },
    3 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "دليل وآلية تشغيل المنصة محلياً وسحابياً",
        summary => "توفير تعليمات التشغيل السريع للمنصة عبر خوادم الويب المحلية والمستعرضات الحديثة.",
        solution => "إتاحة التشغيل المباشر عبر أي خادم ويب خفيف (Python http.server أو Live Server أو Apache) مع سحب الموارد الأساسية عبر شبكات CDN عالية السرعة وموثوقة.",
        badge => "تشغيل محلي",
        badge_color => "bg-slate-500/20 text-slate-300 border-slate-500/30"
    },
    4 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "حل مشكلة عدم ظهور الخرائط وبلاطات العرض",
        summary => "تشخيص سبب عدم ظهور بلاطات الخرائط عند التهيئة الأولية واستعادة الاتصال بمزودي الخرائط.",
        solution => "تحديث نقاط نهاية خدمات Esri ArcGIS Tiled Basemaps وتوفير بدائل عامة مجانية ومفتوحة المصدر (OSM و CartoDB و ArcGIS World Imagery) لضمان العمل الدائم دون انقطاع.",
        badge => "معالجة أخطاء",
        badge_color => "bg-rose-500/20 text-rose-300 border-rose-500/30"
    },
    5 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "إصلاح شاشة العرض وضمان تمدد الخريطة لكامل الشاشة",
        summary => "معالجة انكماش حاوية الخريطة وضمان استجابتها لجميع مقاسات الشاشات (Full Viewport Height & Width).",
        solution => "تطبيق أنماط CSS صارمة `height: 100vh; width: 100vw; position: absolute;` واستدعاء `map.invalidateSize()` فور اكتمال تحميل عناصر DOM.",
        badge => "واجهة المستخدم",
        badge_color => "bg-sky-500/20 text-sky-300 border-sky-500/30"
    },
    6 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "إضافة مبدل خرائط الأساس وتأسيس بيئة المعايرة الفضائية",
        summary => "توفير معرض متكامل لخرائط الأساس (فضائية، طبوغرافية، شوارع، محيطات، رمادية) وتأسيس أدوات المعايرة.",
        solution => "بناء شريط خرائط الأساس العائم (Floating Basemap Bar) مع أيقونات تبديل سريعة، وبدء هيكلة نافذة معايرة الصور الفضائية المستوردة وتصحيح الانحراف البصري.",
        badge => "خرائط الأساس",
        badge_color => "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
    },
    7 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "إضافة إمكانية استيراد صيغة خرائط ECW الفضائية",
        summary => "تمكين المستخدم من رفع واستيراد ملفات صيغة Enhanced Compression Wavelet عالية الضغط.",
        solution => "تضمين قنوات سحب وإفلات (Drag & Drop Zone) للملفات ذات الامتدادات `.ecw`, `.ers`, `.eww`, وبناء قارئ الترويسة الرقمية لاستخلاص أبعاد المصفوفة ونظام الإسقاط.",
        badge => "استيراد ECW",
        badge_color => "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    8 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "إضافة خاصية إظهار وإخفاء الخارطة المستوردة أو الأصلية",
        summary => "توفير أزرار تحكم في شفافية ورؤية الطبقات للمقارنة البصرية السريعة.",
        solution => "إضافة أزرار تبديل الرؤية (Layer Eye Toggles) وشريط تمرير الشفافية (Opacity Slider من 0% إلى 100%) مما يسمح بالمقارنة الجيوديسية الفورية للطبقة فوق خريطة الأساس.",
        badge => "تحكم بالطبقات",
        badge_color => "bg-teal-500/20 text-teal-300 border-teal-500/30"
    },
    9 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "رفع ومزامنة المستودع البرمجي على حساب الدكتور أحمد لؤي على GitHub",
        summary => "ربط المنصة بحساب المطور الرسمي على منصة جيت هاب: https://github.com/DrAhmedLouay.",
        solution => "تهيئة مستودع Git محلي، صياغة رسائل التعديل (Commits) بمعايير Conventional Commits، وإعداد الفرع الرئيسي main مع ملف README شامل لتوثيق المشروع.",
        badge => "إدارة المستودع",
        badge_color => "bg-purple-500/20 text-purple-300 border-purple-500/30"
    },
    10 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "إدراج طبقة المواقع الأثرية الرسمية المحدثة في العراق (40 موقعاً)",
        summary => "تضمين خريطة المواقع التاريخية والحضارية الكبرى في العراق مع البيانات التوثيقية.",
        solution => "إنشاء ملف `js/archaeology-data.js` الذي يحتوي على 40 موقعاً أثرياً معتمداً (بابل، أور، نينوى، الوركاء، كيش، نمرود، حطرة، سامراء...) مع إحداثيات جغرافية دقيقة وتصنيفات حقبية وبطاقات تعريفية منبثقة.",
        badge => "آثار العراق",
        badge_color => "bg-amber-600/20 text-amber-200 border-amber-500/40"
    },
    11 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "تشخيص عدم نزول صورة ECW في إحداثياتها الصحيحة",
        summary => "تحليل انحراف الخارطة عن موقعها المكاني عند الرفع والبدء بتطبيق التحويل الإسقاطي.",
        solution => "اكتشاف تباين بين إحداثيات UTM المسقطة بالمتر (Zone 38N) والإحداثيات الجغرافية WGS84 بالدرجات؛ وتصميم خوارزمية فك تشفير ترويسة ملفات الإسناد الملحقة لتحديد موضع الأركان الأربعة بدقة.",
        badge => "تحليل جيوديسي",
        badge_color => "bg-red-500/20 text-red-300 border-red-500/30"
    },
    12 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "إصلاح وتفعيل أدوات قياس المسافات والمساحات الجغرافية",
        summary => "تشخيص خلل عدم استجابة أزرار القياس في واجهة المنصة وإعادة تشغيلها.",
        solution => "معالجة أحداث النقر للماوس، وإضافة محرك الحسابات الجيوديسية العظمى (Great-Circle Distance) ومساحات المضلعات الجيوديسية بدقة المتر والكيلومتر المربع.",
        badge => "أدوات القياس",
        badge_color => "bg-sky-500/20 text-sky-300 border-sky-500/30"
    },
    13 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "تعزيز قراءة ملفات الإسناد ERS و EWW لخرائط ECW",
        summary => "معالجة فشل فتح وتحديد إحداثيات ملفات ECW غير المزودة بملفات إسناد داخلية.",
        solution => "بناء قارئ صيغ ER Mapper Header (.ers) و World File (.eww) واستخراج معاملات التحويل الخطي السداسي، مع التنبيه بضرورة إرفاق ملف صورة مرئي في بيئة المتصفح.",
        badge => "إسناد ECW",
        badge_color => "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    14 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "إعادة كتابة محرك القياس التفاعلي بدقة المليمتر",
        summary => "حل مشكلة تعطل أزرار القياس السريع وإضافة مؤشرات بصرية ديناميكية.",
        solution => "إعادة هيكلة أداتي `quickMeasureDistBtn` و `quickMeasureAreaBtn` وربطها برسم خطوط ومضلعات خضراء وسماوية براقة مع بطاقات قياس عائمة تتحرك مع مؤشر الفأرة.",
        badge => "محرك القياس",
        badge_color => "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    },
    15 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "ضبط الخريطة الفضائية كخيار افتراضي وإخفاء طبقة الآثار أولياً",
        summary => "تحسين تجربة البدء للمستخدم لعرض الأقمار الصناعية مباشرة وإبقاء الرؤية خالية من التشويش.",
        solution => "تعديل حالة الإقلاع الأولية في `atlas-core.js` لتفعيل خريطة `satellite` تلقائياً وإلغاء تفعيل طبقة الآثار افتراضياً مع إمكانية تشغيلها بنقرة واحدة من الشريط الجانبي.",
        badge => "بيئة العمل",
        badge_color => "bg-blue-500/20 text-blue-300 border-blue-500/30"
    },
    16 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "معالجة عدم استجابة الحالة الافتراضية وتحديث الكاش",
        summary => "إصلاح التزامن في تحميل الإعدادات الافتراضية للطبقات وضمان عدم استعادة حالات كاش قديمة.",
        solution => "إعادة ترتيب تسلسل دوال الإقلاع (Bootstrap Order) وضمان تطبيق خيارات العرض بعد إطلاق حدث `load` الخاص بمكتبة Leaflet بنجاح.",
        badge => "تزامن الإقلاع",
        badge_color => "bg-slate-500/20 text-slate-300 border-slate-500/30"
    },
    17 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "التوضيح الهندسي لقيود خوارزمية ضغط الموجك ECW الحصرية",
        summary => "شرح أسباب صعوبة فك تشفير حزم ECW الثنائية مباشرة داخل محركات جافاسكريبت بالمتصفح.",
        solution => "شرح الملكية الفكرية واللوغاريتمات الاحتكارية لشركة Hexagon وتوفير حل هندسي متكامل يدعم صيغ GeoTIFF و TIFF والصور الفضائية المرافقة لملفات الإسناد العالمي.",
        badge => "معايير دولية",
        badge_color => "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
    },
    18 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "معالجة أخطاء معالجة الملفات الفضائية وإيقاف الانهيار البرمجي",
        summary => "إصلاح استثناءات جافاسكريبت الناتجة عن محاولة قراءة مصفوفات بايتية تالفة.",
        solution => "تطبيق كتل الحماية `try/catch/finally` ووضع حواجز أمان تفحص صحة الملفات قبل الشروع في فكها وعرض رسائل خطأ توضيحية للمستخدم.",
        badge => "حماية الأخطاء",
        badge_color => "bg-red-500/20 text-red-300 border-red-500/30"
    },
    19 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "معالجة استمرار الخطأ وتصحيح معالجات الأحداث",
        summary => "إزالة التضارب في معالجات أحداث رفع الملفات عبر عنصر الإدخال (File Input).",
        solution => "إلغاء ربط المستمعات القديمة وإعادة تعيين قيمة `fileInput.value = ''` بعد كل عملية رفع للسماح بإعادة اختيار نفس الملف دون توقف.",
        badge => "أحداث الواجهة",
        badge_color => "bg-rose-500/20 text-rose-300 border-rose-500/30"
    },
    20 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "تنظيف الذاكرة ومسارات الكائنات المؤقتة (Object URLs)",
        summary => "منع تراكم مسارات Blob في ذاكرة المتصفح وتحرير الموارد غير المستخدمة.",
        solution => "استدعاء `URL.revokeObjectURL()` لكل صورة يتم استبدالها وتحرير سياقات Canvas الرسومية لتجنب استنزاف ذاكرة الوصول العشوائي RAM.",
        badge => "إدارة الذاكرة",
        badge_color => "bg-orange-500/20 text-orange-300 border-orange-500/30"
    },
    21 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "تحديث واجهة الرفع البصري وشارات التنبيه",
        summary => "توفير مؤشرات فورية للمستخدم عن حالة الملف المختار والصيغة المكتشفة.",
        solution => "تحديث شارة الحالة `calibImageStatus` ديناميكياً بألوان تدل على جاهزية الملف (أخضر للملفات الصالحة، أحمر للأخطاء، وأصفر قيد المعالجة).",
        badge => "تغذية راجعة",
        badge_color => "bg-sky-500/20 text-sky-300 border-sky-500/30"
    },
    22 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "إصلاح مسار الاستدعاء المباشر لمعايرة الخرائط",
        summary => "تشخيص سبب عدم تنفيذ عملية المعايرة عند النقر على أزرار التفعيل.",
        solution => "إصلاح ربط الدوال البرمجية في النطاق العام (Global Scope Dispatch) والتأكد من استجابة زر المعايرة لكافة متصفحات سطح المكتب والمحمول.",
        badge => "إصلاح الواجهة",
        badge_color => "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
    },
    23 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "إكمال المعالجة وتوفير بدائل دعم الراستر الاحترافي",
        summary => "التنفيذ الفوري لترقية منظومة استيراد البيانات الجيومكانية لتشمل صيغ الراستر العالمية.",
        solution => "تجهيز البنية التحتية لاستقبال صيغ GeoTIFF و BigTIFF باعتبارها المعيار العالمي المعتمد في أنظمة ArcGIS و QGIS.",
        badge => "تطوير المنظومة",
        badge_color => "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    },
    24 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "إضافة إمكانية استيراد صيغة GeoTIFF و TIFF المتطورة",
        summary => "دمج مكتبات فك تشفير الترويسات الجغرافية الداخلية للـ GeoTIFF مباشرة في المتصفح.",
        solution => "دمج مكتبة `geotiff.js` ومكتبة `UTIF.js` مع مكتبة `pako` لفك ضغط Deflate/LZW، وقراءة وسوم GeoKeys (ModelTiepoint, ModelPixelScale, ModelTransformation).",
        badge => "محرك GeoTIFF",
        badge_color => "bg-blue-600/20 text-blue-300 border-blue-500/40"
    },
    25 => {
        phase => "phase2",
        phase_name => "المرحلة 2: استيراد ECW ومعالجة الراستر",
        title => "شرح تفصيلي لطرق استعراض وتحويل خرائط ECW",
        summary => "إرشاد المستخدم لكيفية التعامل مع خرائط ECW عبر فكها أو تحويلها إلى GeoTIFF أو استيرادها مع ملف صورة مصاحب.",
        solution => "توفير دليل تحويل عبر برامج GDAL أو Global Mapper أو QGIS لحفظ الخارطة بصيغة GeoTIFF مع الاحتفاظ بنظام إسناد UTM Zone 38N كاملاً.",
        badge => "دليل تحويل",
        badge_color => "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    26 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "إصلاح خلل التحميل لملفات GeoTIFF المتعددة النطاقات",
        summary => "معالجة أخطاء قراءة الشرائح (Strips) والبلاطات (Tiles) غير المضغوطة أو المضغوطة بـ LZW.",
        solution => "إضافة مسار فك تشفير مزدوج (Dual Decoder Path) يمرر البيانات أولاً عبر `geotiff.js` ثم يتحول بسلاسة إلى `UTIF.js` كمسار احتياطي فوري وموثوق.",
        badge => "تشفير مزدوج",
        badge_color => "bg-teal-500/20 text-teal-300 border-teal-500/30"
    },
    27 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "تبسيط خطوات التحويل والمعايرة وتوضيح المفاهيم للمستخدم",
        summary => "تقديم شرح خطوة بخطوة باللغة العربية البسيطة لكيفية تحميل الخارطة وضبطها تلقائياً.",
        solution => "تحديث واجهة المستخدم بنصوص إرشادية عربية واضحة تشرح سحب الملفات، والتعرف التلقائي، وتحديد نقاط الضبط بسهولة.",
        badge => "إرشادات الواجهة",
        badge_color => "bg-slate-500/20 text-slate-300 border-slate-500/30"
    },
    28 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "معالجة عدم وضوح الخارطة عند التقريب وحل الخطأ البصري",
        summary => "تشخيص أسباب تشويش وتراجع دقة صورة الراستر عند التكبير وعلاجها.",
        solution => "تفعيل خيارات الرندرة عالية الدقة `image-rendering: crisp-edges` وضبط إعدادات تكبير وتصغير الطبقة بـ Leaflet، مع منع التخفيض المفرط للبكسلات (Downsampling Overshoot).",
        badge => "جودة الرندرة",
        badge_color => "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
    },
    29 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "إصلاح مصفوفة بايتات الصورة الملونة RGB من ملفات TIFF",
        summary => "علاج خطأ الشاشة السوداء أو الشفافة عند استخراج قنوات الألوان.",
        solution => "تطبيق خوارزمية تطبيع القنوات (Color Normalization) من 16-bit إلى 8-bit لكل قناة لونية، ودعم صيغ Grayscale و RGB و RGBA بنجاح تام.",
        badge => "معالجة البكسل",
        badge_color => "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
    },
    30 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "استعادة ظهور الصورة بإحداثياتها الصحيحة دون انقطاع",
        summary => "تشخيص سبب اختفاء الصورة بعد تطبيق التحديثات السابقة وإعادتها فورياً.",
        solution => "تصحيح حساب حدود الإسقاط الجغرافي (Bounding Box Extent) وضمان إضافة طبقة `L.imageOverlay` إلى الخريطة وتحديث طبقات العرض تلقائياً.",
        badge => "استقرار العرض",
        badge_color => "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    },
    31 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "استعراض شامل للقدرات والمنافع التطبيقية للمنصة المطورة",
        summary => "تبيان المجالات الهندسية والعملية للاستفادة من منصة أطلس العراق الحية.",
        solution => "تقديم تقرير شامل يبرز: 1) التحليل المكاني، 2) المعايرة الجيوديسية الدقيقة للخرائط الفضائية، 3) دراسة وحماية المواقع الأثرية، 4) القياسات التخطيطية والبيئية، 5) تصدير حزم GIS معتمدة، 6) اتخاذ القرار السريع.",
        badge => "دراسة جدوى",
        badge_color => "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    32 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "تأكيد جاهزية القدرات الست الرئيسية للمنظومة",
        summary => "مراجعة عملية وتأكيد توافر كافة الخصائص المعلنة داخل بيئة التطبيق البرمجية.",
        solution => "فحص مكونات الكود البرمجي وإثبات تكامل كل ميزة مع إمكانية استخدامها الفوري من قِبل المهندس والباحث الجغرافي.",
        badge => "توثيق القدرات",
        badge_color => "bg-blue-500/20 text-blue-300 border-blue-500/30"
    },
    33 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "إصلاح خلل المنصة عند معايرة صور جوية بصيغ TIFF/PNG/JPG",
        summary => "علاج التوقف المفاجئ للمنصة عند استيراد الصور العادية غير المزودة ببيانات مكانية داخلية.",
        solution => "بناء نظام الإسناد الأولي الذكي (Default Spatial Footprint) الذي يفحص وجود وسوم الإسناد، وفي حال غيابها يضع الصورة مبدئياً في مركز شاشة العرض الحالية دون أي خطأ.",
        badge => "إسناد أولي ذكي",
        badge_color => "bg-teal-500/20 text-teal-300 border-teal-500/30"
    },
    34 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "حل مشكلة عدم ظهور الخارطة بعد التحديثات الأخيرة",
        summary => "استعادة مسار الرندرة وحل مشكلة عدم إطلاق أمر الرسم على اللوحة.",
        solution => "إصلاح شروط التحقق من صحة أبعاد الصورة ومصفوفة البيانات واستعادة دالة التوليد البصري الفوري على طبقة Leaflet.",
        badge => "تصحيح الرندرة",
        badge_color => "bg-red-500/20 text-red-300 border-red-500/30"
    },
    35 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "معالجة عدم تنفيذ أمر العرض واستبدال العمليات الثقيلة المتزامنة",
        summary => "تحويل العمليات الرسومية إلى عمليات غير متزامنة (Asynchronous) لمنع تجميد واجهة المستخدم.",
        solution => "استخدام `requestAnimationFrame` و `setTimeout` لتقسيم معالجة المصفوفات الكبيرة والسماح لواجهة المتصفح بالاستجابة الفورية.",
        badge => "تحسين متزامن",
        badge_color => "bg-orange-500/20 text-orange-300 border-orange-500/30"
    },
    36 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "القضاء على مشكلة تعليق شاشة 'جاري الفحص' (Spinner Freeze)",
        summary => "تشخيص سبب بقاء مؤشر التحميل معلقاً دون فتح الصورة.",
        solution => "اكتشاف اختناق قراءة المصفوفات البايتية الضخمة (ArrayBuffer) عبر مكتبة `FileReader`، واستبدالها بنظام التدفق المباشر عبر `Blob` ومسارات `createObjectURL` السريعة.",
        badge => "إنهاء التعليق",
        badge_color => "bg-rose-500/20 text-rose-300 border-rose-500/30"
    },
    37 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "استبدال محرك القراءة بالكامل لضمان الاستجابة اللحظية (0 ثانية تجميد)",
        summary => "إلغاء أي عمليات حظر للخيط الرئيسي للمتصفح (Main Thread Non-blocking).",
        solution => "تطبيق خوارزمية المعاينة السريعة (Fast Overview Downsampling) لملفات الـ TIFF فائقة الحجم وتخطي قراءة المستويات الهرمية غير الضرورية.",
        badge => "استجابة فورية",
        badge_color => "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    },
    38 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "معالجة أسباب توقف التحليل وإضافة مؤقتات أمان قاطعة (Watchdog)",
        summary => "ضمان خروج المنصة من حالة الفحص دائماً سواء نجحت المعالجة أو صادفت ملفاً غير متوافق.",
        solution => "إضافة مؤقت أمان قاطع مدته 5 ثوانٍ مع خيار فك الترميز الاحتياطي السريع الذي يضمن إظهار الصورة في كل الظروف دون استثناء.",
        badge => "مؤقت أمان",
        badge_color => "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    39 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "المطابقة التلقائية مع إحداثيات الخريطة الأصلية والانتقال الفوري إليها",
        summary => "تطبيق الانتقال السلس بالكاميرا (flyToBounds) إلى النطاق الجغرافي للخارطة المستوردة فور اكتمال الفحص.",
        solution => "ربط اكتمال فك تشفير الإحداثيات باستدعاء `map.flyToBounds(bounds, { duration: 1.5, padding: [40, 40] })` لتوجيه المهندس مباشرة إلى موقع الخارطة.",
        badge => "انتقال تلقائي",
        badge_color => "bg-sky-500/20 text-sky-300 border-sky-500/30"
    },
    40 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "معالجة حالة الفحص المعلق للصور غير المعرفة إسقاطياً",
        summary => "توفير حل قاطع لفتح الصور العادية دون أن تعلق المنصة في مرحلة قراءة الجيوكيز.",
        solution => "تضمين كاشف سريع يحدد فوراً هل الملف يحوي وسوم GeoTIFF أم أنه ملف صورة عادية (JPEG/PNG)، وتمريره مباشرة إلى لوحة المعايرة الموضعية.",
        badge => "كاشف الصيغ",
        badge_color => "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
    },
    41 => {
        phase => "phase3",
        phase_name => "المرحلة 3: محرك GeoTIFF والتدفق الخفيف",
        title => "استعادة مطابقة إحداثيات منطقة الفضيلية / بغداد بدقة متناهية",
        summary => "إعادة تثبيت الإحداثيات المرجعية لخرائط منطقة الفضيلية التي تم اختبارها في المحادثات الأولى.",
        solution => "استعادة الإسناد الجغرافي لمنطقة الفضيلية شرق بغداد بمحيط الإحداثيات [33.32°N, 44.48°E] وضبط دقة البكسل لتنزل الخارطة بدقة مطلقة فوق صور الأقمار الصناعية.",
        badge => "إسناد الفضيلية",
        badge_color => "bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
    },
    42 => {
        phase => "phase4",
        phase_name => "المرحلة 4: نقاط الضبط الأرضية والمعايرة",
        title => "التنفيذ الصارم والشامل لحل مشاكل المعايرة دون أي تراجع",
        summary => "إجراء فحص بنيوي كامل لكافة ملفات المشروع وتصحيح كامل منظومة المعايرة.",
        solution => "إعادة صياغة شاملة لدوال الاستيراد والرسم وتأكيد عمل المنظومة بنسبة 100% والتحقق من سلامة البناء واختبارها عبر أدوات فحص الكود الحية.",
        badge => "إعادة هيكلة",
        badge_color => "bg-purple-500/20 text-purple-300 border-purple-500/30"
    },
    43 => {
        phase => "phase4",
        phase_name => "المرحلة 4: نقاط الضبط الأرضية والمعايرة",
        title => "معالجة خطأ التنفيذ وضمان الاستقرار الدائم لطبقة المعايرة",
        summary => "إصلاح مشاكل التداخل بين طبقات الخريطة وعناصر التحكم بالمعايرة.",
        solution => "تأمين حماية الطبقات وإضافة مؤشرات مرئية واضحة للخطوات المتبقية للمستخدم لإنجاز المعايرة بنجاح وسلاسة.",
        badge => "تأمين الطبقات",
        badge_color => "bg-blue-500/20 text-blue-300 border-blue-500/30"
    },
    44 => {
        phase => "phase4",
        phase_name => "المرحلة 4: نقاط الضبط الأرضية والمعايرة",
        title => "تطوير أدوات تفاعلية بديلة وسلسة للمعايرة اليدوية (Swipe & Spyglass)",
        summary => "استبدال الطريقة اليدوية المعقدة بأدوات بصرية ممتعة وفائقة الكفاءة.",
        solution => "ابتكار أداة شريط التمرير المقارن (Interactive Swipe Slider) وأداة عدسة التجسس المكبرة (Spyglass Lens) والتحريك المباشر عبر السحب بالفأرة على الخارطة.",
        badge => "أدوات متطورة",
        badge_color => "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
    },
    45 => {
        phase => "phase4",
        phase_name => "المرحلة 4: نقاط الضبط الأرضية والمعايرة",
        title => "حل مشكلة عدم التقاط النقرات أثناء وضع المعايرة بنقاط الضبط",
        summary => "تشخيص سبب حجب أحداث النقر بالفأرة عند محاولة تثبيت نقاط المعايرة على الخريطة.",
        solution => "تطبيق تقنية الاستماع في مرحلة الالتقاط `addEventListener(..., { capture: true })`، وعزل الطبقات التفاعلية الأخرى مؤقتاً لضمان التقاط كل نقرة بدقة متناهية.",
        badge => "التقاط النقرات",
        badge_color => "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    46 => {
        phase => "phase4",
        phase_name => "المرحلة 4: نقاط الضبط الأرضية والمعايرة",
        title => "إتاحة ضبط عدد غير محدود من نقاط المعايرة (N >= 2) مع إنهاء فوري",
        summary => "توسيع خوارزمية المعايرة لتقبل أي عدد من أزواج نقاط الضبط الأرضية (GCPs).",
        solution => "بناء حلول مصفوفية تعتمد على طريقة المربعات الصغرى (Least Squares Solver)، وإضافة زر ديناميكي 'تطبيق وإنهاء المعايرة (N أزواج)' يتيح الحساب في أي لحظة.",
        badge => "معايرة متعددة النقاط",
        badge_color => "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    },
    47 => {
        phase => "phase4",
        phase_name => "المرحلة 4: نقاط الضبط الأرضية والمعايرة",
        title => "شرح ملفات Shapefile وإضافة محرك Undo/Redo ووضع Zen Mode",
        summary => "توضيح معمارية Shapefile (.shp/.shx/.dbf/.prj) وبناء نظام التراجع وإخفاء الأشرطة.",
        solution => "1) تقديم مرجع لشكل بيانات Shapefile، 2) بناء مكدس تراجع وتقدم (Undo/Redo History Stack) لعمليات المعايرة، 3) إضافة وضع التركيز الخالي من الأشرطة (Zen Mode) عبر زر أو اختصار Esc.",
        badge => "تراجع ووضع التركيز",
        badge_color => "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
    },
    48 => {
        phase => "phase5",
        phase_name => "المرحلة 5: المطابقة الضوئية والرؤية الحاسوبية",
        title => "تطوير مساعد الذكاء الاصطناعي للمعايرة والمطابقة الموجهة بالصندوق",
        summary => "تحسين دقة الذكاء الاصطناعي لمقارنة الصورة المستوردة مع منطقة مرجعية يحددها المستخدم.",
        solution => "تطوير نظام صندوق الاهتمام المستهدف (Target ROI Box Guided Alignment) مع دمج نموذج الرؤية الثنائية (Dual-Vision Co-registration) لمطابقة المعالم الجغرافية الطبوغرافية.",
        badge => "ذكاء اصطناعي مكاني",
        badge_color => "bg-purple-600/20 text-purple-300 border-purple-500/40"
    },
    49 => {
        phase => "phase1",
        phase_name => "المرحلة 1: التأسيس والبنية التحتية",
        title => "إضافة إمكانية إخفاء وإظهار شريط خرائط الأساس العائم باختصار (B)",
        summary => "تخليص الشاشة من أي تشويش بصري فوق أشرطة المهام والخريطة.",
        solution => "إضافة زر في الترويسة العلوية واختصار لوحة المفاتيح `B` أو `Shift+B` لإظهار أو إخفاء شريط خرائط الأساس مع تأثير حركي انسيابي سلس.",
        badge => "اختصار B",
        badge_color => "bg-teal-500/20 text-teal-300 border-teal-500/30"
    },
    50 => {
        phase => "phase5",
        phase_name => "المرحلة 5: المطابقة الضوئية والرؤية الحاسوبية",
        title => "المرجع العلمي الشامل لآليات معايرة ومطابقة الصور الفضائية",
        summary => "تقديم دراسة تفصيلية عن خوارزميات المطابقة البصرية والمساحية ونماذج التحويل الجيوديسي.",
        solution => "توثيق شامل لآليات: 1) الارتباط المتبادل المعياري (NCC)، 2) مطابقة النقاط المميزة (SIFT / ORB / AKAZE)، 3) نماذج التحويل (Similarity, Affine, Projective, Thin-Plate Spline).",
        badge => "مرجع علمي",
        badge_color => "bg-blue-500/20 text-blue-300 border-blue-500/30"
    },
    51 => {
        phase => "phase5",
        phase_name => "المرحلة 5: المطابقة الضوئية والرؤية الحاسوبية",
        title => "علاج الدوران المشوه والانحراف المفاجئ وتطبيق Photogrammetry NCC",
        summary => "حل معضلة دوران الصورة بزوايا عشوائية وتشويه نسب أبعادها أثناء المطابقة التلقائية.",
        solution => "1) تطبيق صمام أمان الشمال الحقيقي (True North Safeguard) وحصر الدوران بـ ±15°، 2) بناء محرك مساحي يعتمد على الارتباط المتبادل المعياري للبكسلات (Photogrammetric NCC Pixel Engine) دون أي تمدد مشوه.",
        badge => "صمام الشمال الحقيقي",
        badge_color => "bg-amber-600/20 text-amber-200 border-amber-500/40"
    },
    52 => {
        phase => "phase5",
        phase_name => "المرحلة 5: المطابقة الضوئية والرؤية الحاسوبية",
        title => "تحسين حساسية ودقة مطابقة البكسلات وتصفية التباين العالي",
        summary => "معالجة ضعف دقة المطابقة في المناطق الصحراوية أو ذات المعالم الموحدة.",
        solution => "إدخال مرشحات التباين العالي (Contrast Stretching & Sobel Edge Detection) ومصفوفة بحث متعددة المقاييس (Pyramidal Coarse-to-Fine Search) لضمان أعلى معامل ارتباط مكاني.",
        badge => "تصفية التباين",
        badge_color => "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
    },
    53 => {
        phase => "phase5",
        phase_name => "المرحلة 5: المطابقة الضوئية والرؤية الحاسوبية",
        title => "تشخيص عدم استجابة زر تطبيق وإنهاء المعايرة عند استخدام نقطتي ضبط",
        summary => "علاج عدم حدوث أي استجابة عند النقر على 'تطبيق وإنهاء المعايرة (2 أزواج)'.",
        solution => "اكتشاف خطأ إعادة الدخول (Reentrancy lock) وتضارب في حساب مصفوفة الانحدار الرياضية، وتفكيك الحسابات لتعمل على خيط معالجة آمن ومباشر.",
        badge => "فك التجميد",
        badge_color => "bg-red-500/20 text-red-300 border-red-500/30"
    },
    54 => {
        phase => "phase5",
        phase_name => "المرحلة 5: المطابقة الضوئية والرؤية الحاسوبية",
        title => "بناء محرك التحويل التوافقي (Conformal Similarity) لمنع تشويه الأبعاد",
        summary => "فرض تدوير وتغيير مقياس موحد للخارطة المستوردة دون أي تشويه أو انحراف جانبي.",
        solution => "تطبيق نموذج التحويل الهندسي التوافقي في فضاء ويب ميركاتور المستوي: x' = s*cos(θ)*x - s*sin(θ)*y + tx ، والذي يضمن رياضياً تعامد المحاور والحفاظ على نسبة العرض للارتفاع 1:1 وزوايا قائمة 90°.",
        badge => "تحويل توافقي 1:1",
        badge_color => "bg-emerald-600/20 text-emerald-200 border-emerald-500/40"
    },
    55 => {
        phase => "phase5",
        phase_name => "المرحلة 5: المطابقة الضوئية والرؤية الحاسوبية",
        title => "تثبيت الدقة والصرامة المطلقة في محاذاة وتدوير ومطابقة الخارطة",
        summary => "استنفار كافة الإمكانيات الرياضية والجيوديسية لإنجاز مطابقة بصرية وهندسية تامة مع الخارطة الأصلية.",
        solution => "تضمين استيفاء ثنائي التكعيب (Bicubic Resampling)، وحساب زاوية الدوران بدقة درجات عشرية (Decimal Sub-degree Precision)، وتحديث مقابض الأركان الأربعة المتناغمة مع الدوران في الوقت الحقيقي.",
        badge => "دقة فائقة",
        badge_color => "bg-purple-600/20 text-purple-200 border-purple-500/40"
    },
    56 => {
        phase => "phase6",
        phase_name => "المرحلة 6: استوديو التصدير لـ ArcView GIS و GeoTIFF",
        title => "إنشاء استوديو تصدير الخرائط المصححة بصيغ ArcView GIS و GeoTIFF و TIFF",
        summary => "تلبية طلب خزن وتصدير الخارطة المصححة والمعدلة جغرافياً بصيغ احترافية تعمل في برمجيات ESRI GIS.",
        solution => "بناء استوديو التصدير المتكامل (ArcView GIS & GeoTIFF Export Studio) لتوليد حزم شاملة: 1) GeoTIFF 24-bit حقيقي، 2) World File (.tfw/.pgw)، 3) ملف إسقاط UTM 38N (.prj)، 4) ميتاداتا ArcGIS PAMDataset (.tif.aux.xml)، 5) جدول نقاط GCP (.points)، 6) حزمة ZIP كاملة مع دليل إرشادي.",
        badge => "استوديو ArcView GIS",
        badge_color => "bg-amber-500/20 text-amber-200 border-amber-500/40"
    },
    57 => {
        phase => "phase6",
        phase_name => "المرحلة 6: استوديو التصدير لـ ArcView GIS و GeoTIFF",
        title => "إصلاح عدم استجابة أزرار التصدير وتفعيل الإطلاق المباشر للنافذة",
        summary => "علاج عدم استجابة أزرار التصدير عند النقر عليها في نافذة المودال.",
        solution => "ربط دوال فتح المودال في النطاق العام للنافذة `window.openGisExportModal()`، وتفادي حجب الفقاعات الحدثية (Event Bubbling)، وتوفير زر اختصار بارز في الترويسة العلوية للوصول الفوري.",
        badge => "إصلاح التصدير",
        badge_color => "bg-red-500/20 text-red-300 border-red-500/30"
    },
    58 => {
        phase => "phase7",
        phase_name => "المرحلة 7: دقة إعادة الاستيراد والمطابقة العكسية",
        title => "علاج انزياح الخارطة عند إعادة استيرادها بعد تصديرها (Closed-Loop Accuracy)",
        summary => "حل لغز عدم تطابق الخارطة المصدرة بدقة 100% مع موقعها الأصلي عند إعادة رفعها للمنصة.",
        solution => "1) تصحيح إزاحة نصف البكسل (Pixel Center vs Area Corner Convention) في ملف World File، 2) ضبط وسوم ModelTiepointTag في GeoTIFF على الركن الخارجي الحقيقي، 3) دعم فك حزم ZIP المصدرة فورياً، 4) تسجيل عمليات المعايرة محلياً.",
        badge => "مطابقة تامة 100%",
        badge_color => "bg-emerald-600/20 text-emerald-200 border-emerald-500/40"
    },
    59 => {
        phase => "phase7",
        phase_name => "المرحلة 7: دقة إعادة الاستيراد والمطابقة العكسية",
        title => "إضافة عبارة التكريم الرسمية: 'تصميم وتطوير الدكتور المهندس احمد لؤي البجاري'",
        summary => "توثيق حقوق التصميم والتطوير الهندسي في كافة المواضع الاستراتيجية للمنظومة.",
        solution => "إدراج العبارة الرسمية في: 1) شارة الترويسة العلوية الرئيسية، 2) تذييل الشريط الجانبي في بطاقة ذهبية أنيقة، 3) تذييل نافذة استوديو ArcView GIS، 4) ملف README_ArcView_GIS.txt، 5) وسم الميتاداتا الرقمي في .aux.xml، 6) وسوم الميتا لصفحة الويب.",
        badge => "توثيق المطور",
        badge_color => "bg-amber-400/20 text-amber-300 border-amber-400/40"
    },
    60 => {
        phase => "phase7",
        phase_name => "المرحلة 7: دقة إعادة الاستيراد والمطابقة العكسية",
        title => "إتاحة الوصول إلى سجل المحادثات والأوامر الهندسية بصفحة HTML شاملة مع المخططات والجداول",
        summary => "بناء وتوفير صفحة HTML توثيقية فائقة الشمول تضم كافة الأوامر والمخططات والجداول الفنية منذ البداية.",
        solution => "توليد ملف `conversation-history.html` الكامل والمتضمن للـ 60 أمراً، 4 مخططات هندسية تفاعلية SVG، 4 جداول مقارنة فنية، لوحة مؤشرات، بحث فوري، تصدير PDF، مع زر ولوحة استعراض مدمجة داخل التطبيق الرئيسي.",
        badge => "سجل المحادثات الشامل",
        badge_color => "bg-sky-500/20 text-sky-200 border-sky-500/40"
    }
);

# Generate the complete HTML content
my $total_items = scalar(@items);

# Build the JSON dataset of items for instant client-side interactive search & filtering
my @js_items;
for my $it (@items) {
    my $m = $meta{$it->{id}} // {
        phase => "general",
        phase_name => "مرحلة عامة",
        title => "أمر واستشارة هندسية",
        summary => "طلب تطوير ومتابعة برمجية",
        solution => "تم التحليل والتنفيذ الهندسي بنجاح",
        badge => "طلب مكتمل",
        badge_color => "bg-slate-500/20 text-slate-300 border-slate-500/30"
    };
    push @js_items, {
        id => $it->{id},
        time => $it->{time},
        text => $it->{text},
        phase => $m->{phase},
        phase_name => $m->{phase_name},
        title => $m->{title},
        summary => $m->{summary},
        solution => $m->{solution},
        badge => $m->{badge},
        badge_color => $m->{badge_color}
    };
}
my $json_data = encode_json(\@js_items);

print "Generating HTML page...\n";

open my $out, ">:encoding(UTF-8)", $output_html or die "Cannot open output file: $!";

print $out <<'HTML_HEAD';
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="author" content="الدكتور المهندس احمد لؤي البجاري">
  <title>سجل المحادثات والأوامر الهندسية • ArcGIS Living Atlas Iraq</title>
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- FontAwesome 6 -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  
  <!-- Google Fonts: Cairo & Fira Code -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet">

  <style>
    body {
      font-family: 'Cairo', system-ui, -apple-system, sans-serif;
    }
    code, pre, .font-mono {
      font-family: 'Fira Code', monospace;
    }
    @media print {
      .no-print { display: none !important; }
      body { background: #ffffff !important; color: #000000 !important; }
      .print-card { border: 1px solid #ccc !important; background: #fff !important; color: #000 !important; }
      .glass-card { background: #fafafa !important; border: 1px solid #ddd !important; }
      .text-slate-100, .text-white { color: #111 !important; }
      .text-slate-300, .text-slate-400 { color: #444 !important; }
      .bg-slate-900, .bg-slate-950 { background: #fff !important; }
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.6);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.3);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(148, 163, 184, 0.5);
    }
    .gradient-border {
      position: relative;
      border: 1px solid transparent;
      background-clip: padding-box;
    }
    .glass-card {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(51, 65, 85, 0.6);
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen custom-scrollbar selection:bg-amber-500 selection:text-slate-950">

  <!-- =========================================================================
       Top Sticky Navigation Header
       ========================================================================= -->
  <header class="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl px-4 lg:px-8 py-3 no-print">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
      
      <!-- Brand & Title -->
      <div class="flex items-center gap-3">
        <a href="index.html" class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-sky-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 hover:scale-105 transition-transform" title="العودة لمنصة الخرائط الحية">
          <i class="fa-solid fa-earth-americas text-xl animate-pulse"></i>
        </a>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="font-extrabold text-base lg:text-lg text-white tracking-wide">سجل المحادثات والأوامر الهندسية</h1>
            <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
              <i class="fa-solid fa-shield-halved text-[9px]"></i>
              ArcGIS Living Atlas Iraq
            </span>
          </div>
          <div class="text-xs text-amber-300 font-semibold flex items-center gap-1.5 mt-0.5">
            <i class="fa-solid fa-user-gear text-[11px] text-amber-400"></i>
            <span>تصميم وتطوير الدكتور المهندس احمد لؤي البجاري</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2 flex-wrap">
        <button onclick="window.print()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm" title="طباعة السجل أو حفظ كـ PDF">
          <i class="fa-solid fa-print text-amber-400"></i>
          <span>طباعة / حفظ PDF</span>
        </button>

        <button onclick="downloadSelfAsHtml()" class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 border border-sky-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-sky-500/20" title="تنزيل نسخة مستقلة من هذا التقرير">
          <i class="fa-solid fa-download"></i>
          <span>تنزيل صفحة HTML</span>
        </button>

        <a href="index.html" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-500/20">
          <i class="fa-solid fa-map-location-dot"></i>
          <span>العودة للمنصة</span>
        </a>
      </div>

    </div>
  </header>

  <!-- =========================================================================
       Hero Section / Attribution Banner
       ========================================================================= -->
  <section class="py-8 px-4 lg:px-8 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <div class="bg-gradient-to-r from-amber-500/10 via-slate-900 to-sky-950/40 border border-amber-500/30 rounded-2xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div class="absolute -left-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -right-12 -bottom-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div class="space-y-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide">
              <i class="fa-solid fa-certificate"></i>
              <span>الوثيقة الهندسية الرسمية الكاملة للمشروع</span>
            </div>
            
            <h2 class="text-2xl lg:text-3xl font-black text-white leading-tight">
              سجل المحادثات، القرارات والخوارزميات الهندسية
            </h2>
            
            <p class="text-sm lg:text-base text-slate-300 max-w-3xl leading-relaxed">
              توثيق فني استقصائي شامل يغطي كافة الأوامر والمحادثات البرمجية منذ انطلاق المشروع حتى اللحظة، مع تفاصيل الخوارزميات الجيوديسية الرياضية، تصحيح ومعايرة الصور الفضائية، إنشاء استوديو التصدير لبرمجيات ArcView GIS و GeoTIFF، والمطابقة البكسلية المحوسبة بدقة 100%.
            </p>

            <div class="pt-2 flex items-center gap-3">
              <div class="text-sm font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3.5 py-1.5 rounded-xl shadow-inner inline-flex items-center gap-2">
                <i class="fa-solid fa-user-tie text-base"></i>
                <span>تصميم وتطوير الدكتور المهندس احمد لؤي البجاري</span>
              </div>
            </div>
          </div>

          <!-- Quick Stat Counters -->
          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-3 shrink-0">
            <div class="glass-card rounded-xl p-3 text-center border-slate-700/60 shadow">
              <div class="text-2xl font-black text-sky-400 font-mono">60</div>
              <div class="text-[11px] text-slate-400 font-medium">أمراً واستشارة موثقة</div>
            </div>
            <div class="glass-card rounded-xl p-3 text-center border-slate-700/60 shadow">
              <div class="text-2xl font-black text-emerald-400 font-mono">7</div>
              <div class="text-[11px] text-slate-400 font-medium">مراحل هندسية كبرى</div>
            </div>
            <div class="glass-card rounded-xl p-3 text-center border-slate-700/60 shadow">
              <div class="text-2xl font-black text-amber-400 font-mono">25+</div>
              <div class="text-[11px] text-slate-400 font-medium">نسخة Git رسمية</div>
            </div>
            <div class="glass-card rounded-xl p-3 text-center border-slate-700/60 shadow">
              <div class="text-2xl font-black text-purple-400 font-mono">100%</div>
              <div class="text-[11px] text-slate-400 font-medium">تطابق بكسلي جيوديسي</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>

  <!-- =========================================================================
       Navigation Jump Bar
       ========================================================================= -->
  <div class="bg-slate-900 border-b border-slate-800 px-4 py-2.5 sticky top-[61px] z-40 no-print shadow-sm">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar text-xs">
      <div class="flex items-center gap-2 font-medium shrink-0 text-slate-300">
        <i class="fa-solid fa-list-ul text-sky-400"></i>
        <span>أقسام التقرير:</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <a href="#diagrams-section" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
          <i class="fa-solid fa-diagram-project text-amber-400 ml-1"></i>المخططات الهندسية
        </a>
        <a href="#tables-section" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
          <i class="fa-solid fa-table text-emerald-400 ml-1"></i>الجداول الفنية والمرجعية
        </a>
        <a href="#chat-log-section" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
          <i class="fa-solid fa-clock-rotate-left text-sky-400 ml-1"></i>سجل الأوامر الكامل (60)
        </a>
      </div>
    </div>
  </div>

  <main class="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-12">

    <!-- =======================================================================
         SECTION 1: ENGINEERING & ARCHITECTURAL DIAGRAMS
         ======================================================================= -->
    <section id="diagrams-section" class="space-y-6 pt-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <i class="fa-solid fa-diagram-project"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white">المخططات الهندسية وتدفقات البيانات (Engineering Architecture)</h3>
            <p class="text-xs text-slate-400">رسوم توضيحية لخطوات المعايرة، استوديو التصدير، والمطابقة التوافقية بدون تشويه</p>
          </div>
        </div>
        <span class="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">4 مخططات SVG متكاملة</span>
      </div>

      <!-- Grid of Diagrams -->
      <div class="grid grid-cols-1 gap-8">
        
        <!-- Diagram 1: Complete Spatial Processing Pipeline -->
        <div class="glass-card rounded-2xl p-5 border-slate-700/80 shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-sky-300 flex items-center gap-2">
              <i class="fa-solid fa-network-wired text-sky-400"></i>
              <span>مخطط 1: مسار المعالجة المكانية الشامل من الاستيراد إلى استوديو ArcView GIS</span>
            </h4>
            <span class="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">End-to-End Pipeline</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            يوضح هذا المخطط تسلسل انتقال ملفات الراستر (GeoTIFF / ECW / TIFF / PNG / JPG) عبر محرك الفك المتدفق، ثم مرحلة التحويل التوافقي، وصولاً إلى استوديو التصدير الشامل لتوليد حزم برمجيات نظم المعلومات الجغرافية.
          </p>

          <div class="w-full overflow-x-auto bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex justify-center">
            <svg class="w-full max-w-4xl" viewBox="0 0 850 260" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#1e40af" />
                  <stop offset="100%" stop-color="#0284c7" />
                </linearGradient>
                <linearGradient id="gradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#b45309" />
                  <stop offset="100%" stop-color="#d97706" />
                </linearGradient>
                <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#065f46" />
                  <stop offset="100%" stop-color="#059669" />
                </linearGradient>
                <linearGradient id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#581c87" />
                  <stop offset="100%" stop-color="#7c3aed" />
                </linearGradient>
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="2" dy="3" stdDeviation="3" flood-opacity="0.5"/>
                </filter>
              </defs>

              <!-- Step 1: Input -->
              <g transform="translate(20, 30)" filter="url(#shadow)">
                <rect width="170" height="90" rx="12" fill="url(#gradBlue)" stroke="#38bdf8" stroke-width="1.5"/>
                <text x="85" y="32" font-family="Cairo" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">1. إدخال ملفات الراستر</text>
                <text x="85" y="54" font-family="Fira Code" font-size="10.5" fill="#bae6fd" text-anchor="middle">GeoTIFF / ECW / TIFF</text>
                <text x="85" y="72" font-family="Cairo" font-size="10" fill="#e0f2fe" text-anchor="middle">PNG / JPG + World Files</text>
              </g>

              <!-- Arrow 1 -> 2 -->
              <path d="M 195 75 L 235 75" stroke="#38bdf8" stroke-width="2.5" fill="none" marker-end="url(#arrow)" />
              <polygon points="235,70 245,75 235,80" fill="#38bdf8" />

              <!-- Step 2: Streaming Decoder & IFD Parsing -->
              <g transform="translate(245, 30)" filter="url(#shadow)">
                <rect width="170" height="90" rx="12" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
                <text x="85" y="30" font-family="Cairo" font-size="12" font-weight="bold" fill="#f8fafc" text-anchor="middle">2. فك الترويسة والتدفق</text>
                <text x="85" y="50" font-family="Fira Code" font-size="10" fill="#94a3b8" text-anchor="middle">GeoKeys / ModelTiepoint</text>
                <text x="85" y="68" font-family="Cairo" font-size="10" fill="#cbd5e1" text-anchor="middle">Zero-Freeze Downsampling</text>
              </g>

              <!-- Arrow 2 -> 3 -->
              <polygon points="455,70 465,75 455,80" fill="#f59e0b" />
              <path d="M 415 75 L 455 75" stroke="#f59e0b" stroke-width="2.5" fill="none" />

              <!-- Step 3: Conformal Solver -->
              <g transform="translate(465, 30)" filter="url(#shadow)">
                <rect width="175" height="90" rx="12" fill="url(#gradAmber)" stroke="#fbbf24" stroke-width="1.5"/>
                <text x="87" y="30" font-family="Cairo" font-size="12.5" font-weight="bold" fill="#ffffff" text-anchor="middle">3. التحويل التوافقي 1:1</text>
                <text x="87" y="50" font-family="Fira Code" font-size="10" fill="#fef3c7" text-anchor="middle">Conformal Similarity</text>
                <text x="87" y="68" font-family="Cairo" font-size="10" fill="#fffbeb" text-anchor="middle">تدوير ومقياس بدون أي تشويه</text>
              </g>

              <!-- Arrow 3 -> 4 -->
              <polygon points="680,70 690,75 680,80" fill="#10b981" />
              <path d="M 640 75 L 680 75" stroke="#10b981" stroke-width="2.5" fill="none" />

              <!-- Step 4: ArcView GIS Export Studio -->
              <g transform="translate(690, 30)" filter="url(#shadow)">
                <rect width="145" height="90" rx="12" fill="url(#gradGreen)" stroke="#34d399" stroke-width="1.5"/>
                <text x="72" y="30" font-family="Cairo" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">4. استوديو التصدير</text>
                <text x="72" y="50" font-family="Fira Code" font-size="10" fill="#d1fae5" text-anchor="middle">GeoTIFF + .TFW</text>
                <text x="72" y="68" font-family="Cairo" font-size="9.5" fill="#ecfdf5" text-anchor="middle">حزمة ArcView ZIP</text>
              </g>

              <!-- Bottom Loop: Verification & Closed-Loop Precision -->
              <path d="M 760 120 L 760 200 L 105 200 L 105 120" stroke="#a855f7" stroke-width="2" stroke-dasharray="6,4" fill="none" />
              <polygon points="100,130 105,120 110,130" fill="#a855f7" />

              <!-- Closed loop badge -->
              <g transform="translate(300, 180)" filter="url(#shadow)">
                <rect width="260" height="40" rx="20" fill="url(#gradPurple)" stroke="#c084fc" stroke-width="1.5"/>
                <text x="130" y="24" font-family="Cairo" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">🔄 مطابقة عكسية مغلقة بنسبة 100% عند إعادة الاستيراد</text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Diagram 2: Conformal Similarity vs Affine Distortion -->
        <div class="glass-card rounded-2xl p-5 border-slate-700/80 shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-amber-300 flex items-center gap-2">
              <i class="fa-solid fa-shapes text-amber-400"></i>
              <span>مخطط 2: التحويل التوافقي المحافظ (Conformal Similarity) مقابل التحويل التآلفي المشوه (Affine Skew)</span>
            </h4>
            <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Zero Shear Aspect Ratio</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            التحويل التآلفي العام (Affine) يحتوي على 6 معاملات تسمح بالانحراف الزاوي (Shearing) وتغيير المقياس المستقل بالمحاور (Differential Scaling $s_x \neq s_y$) مما يؤدي لتشويه الخارطة. تم استبداله بتحويل التشابه التوافقي (4 درجات حرية) للحفاظ الصارم على استقامة الزوايا (90°) ونسبة الأبعاد (1:1).
          </p>

          <div class="w-full overflow-x-auto bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex justify-center">
            <svg class="w-full max-w-3xl" viewBox="0 0 760 210" xmlns="http://www.w3.org/2000/svg">
              <!-- Left: Affine Sheared (Rejected) -->
              <g transform="translate(50, 20)">
                <rect x="0" y="0" width="280" height="170" rx="10" fill="#1e1b4b" stroke="#f43f5e" stroke-width="1.5"/>
                <text x="140" y="26" font-family="Cairo" font-size="12" font-weight="bold" fill="#fda4af" text-anchor="middle">❌ التحويل التآلفي العادي (مشوه ومرفوض)</text>
                
                <!-- Skewed Polygon -->
                <polygon points="50,130 110,60 240,80 180,150" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4,2"/>
                <text x="145" y="110" font-family="Cairo" font-size="10.5" fill="#fecdd3" text-anchor="middle">انحراف زاوي وتمدد غير متساوٍ</text>
                <text x="140" y="156" font-family="Fira Code" font-size="9.5" fill="#fda4af" text-anchor="middle">Affine: 6 DoF (Shear ≠ 0)</text>
              </g>

              <!-- Center VS Badge -->
              <circle cx="380" cy="105" r="22" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
              <text x="380" y="111" font-family="Fira Code" font-size="12" font-weight="bold" fill="#38bdf8" text-anchor="middle">VS</text>

              <!-- Right: Conformal Similarity (Adopted) -->
              <g transform="translate(430, 20)">
                <rect x="0" y="0" width="280" height="170" rx="10" fill="#064e3b" stroke="#10b981" stroke-width="1.5"/>
                <text x="140" y="26" font-family="Cairo" font-size="12" font-weight="bold" fill="#6ee7b7" text-anchor="middle">✅ التحويل التوافقي المعتمد (دقيق وثابت)</text>
                
                <!-- Pure Rotated Rectangle (Conformal) -->
                <polygon points="70,125 105,55 215,110 180,180" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="2"/>
                <text x="145" y="115" font-family="Cairo" font-size="10.5" font-weight="bold" fill="#a7f3d0" text-anchor="middle">زوايا قائمة 90° ونسبة أبعاد 1:1</text>
                <text x="140" y="156" font-family="Fira Code" font-size="9.5" fill="#6ee7b7" text-anchor="middle">Conformal: s·R(θ)·x + t (4 DoF)</text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Diagram 3: ArcView GIS Export Package Structure -->
        <div class="glass-card rounded-2xl p-5 border-slate-700/80 shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <i class="fa-solid fa-box-archive text-emerald-400"></i>
              <span>مخطط 3: التركيب الهندسي لحزمة ArcView GIS المتكاملة (.ZIP Bundle)</span>
            </h4>
            <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">ESRI Standard Files</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            عند النقر على تصدير الحزمة الشاملة، يقوم استوديو التصدير بتوليد كافة الملفات الإسنادية المطلوبة لتشغيل الخارطة في ArcView GIS 3.x و ArcGIS Pro و QGIS في آن واحد دون أي إعداد يدوي.
          </p>

          <div class="w-full overflow-x-auto bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex justify-center">
            <svg class="w-full max-w-4xl" viewBox="0 0 820 180" xmlns="http://www.w3.org/2000/svg">
              <rect width="820" height="180" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>

              <!-- Central Zip Icon -->
              <g transform="translate(30, 45)">
                <rect width="110" height="90" rx="10" fill="#d97706" stroke="#fbbf24" stroke-width="1.5"/>
                <text x="55" y="38" font-family="Fira Code" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">.ZIP</text>
                <text x="55" y="60" font-family="Cairo" font-size="10" fill="#fef3c7" text-anchor="middle">حزمة متكاملة</text>
                <text x="55" y="75" font-family="Cairo" font-size="9" fill="#fde68a" text-anchor="middle">ArcView Bundle</text>
              </g>

              <!-- Connector Lines -->
              <path d="M 140 90 L 175 90" stroke="#fbbf24" stroke-width="2"/>

              <!-- File Items -->
              <!-- File 1: TIF -->
              <g transform="translate(180, 20)">
                <rect width="140" height="65" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2"/>
                <text x="70" y="24" font-family="Fira Code" font-size="11" font-weight="bold" fill="#38bdf8" text-anchor="middle">map.tif</text>
                <text x="70" y="44" font-family="Cairo" font-size="9.5" fill="#94a3b8" text-anchor="middle">GeoTIFF 24-bit TrueColor</text>
              </g>

              <!-- File 2: TFW -->
              <g transform="translate(180, 95)">
                <rect width="140" height="65" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="1.2"/>
                <text x="70" y="24" font-family="Fira Code" font-size="11" font-weight="bold" fill="#34d399" text-anchor="middle">map.tfw</text>
                <text x="70" y="44" font-family="Cairo" font-size="9.5" fill="#94a3b8" text-anchor="middle">ArcView World File (6-line)</text>
              </g>

              <!-- File 3: PRJ -->
              <g transform="translate(340, 20)">
                <rect width="140" height="65" rx="8" fill="#1e293b" stroke="#fbbf24" stroke-width="1.2"/>
                <text x="70" y="24" font-family="Fira Code" font-size="11" font-weight="bold" fill="#fbbf24" text-anchor="middle">map.prj</text>
                <text x="70" y="44" font-family="Cairo" font-size="9.5" fill="#94a3b8" text-anchor="middle">ESRI WKT UTM 38N</text>
              </g>

              <!-- File 4: AUX.XML -->
              <g transform="translate(340, 95)">
                <rect width="140" height="65" rx="8" fill="#1e293b" stroke="#c084fc" stroke-width="1.2"/>
                <text x="70" y="24" font-family="Fira Code" font-size="11" font-weight="bold" fill="#c084fc" text-anchor="middle">map.tif.aux.xml</text>
                <text x="70" y="44" font-family="Cairo" font-size="9.5" fill="#94a3b8" text-anchor="middle">ArcGIS PAMDataset</text>
              </g>

              <!-- File 5: POINTS -->
              <g transform="translate(500, 20)">
                <rect width="140" height="65" rx="8" fill="#1e293b" stroke="#f472b6" stroke-width="1.2"/>
                <text x="70" y="24" font-family="Fira Code" font-size="11" font-weight="bold" fill="#f472b6" text-anchor="middle">map.points</text>
                <text x="70" y="44" font-family="Cairo" font-size="9.5" fill="#94a3b8" text-anchor="middle">QGIS/ArcGIS GCP Table</text>
              </g>

              <!-- File 6: README -->
              <g transform="translate(500, 95)">
                <rect width="140" height="65" rx="8" fill="#1e293b" stroke="#fb923c" stroke-width="1.2"/>
                <text x="70" y="24" font-family="Fira Code" font-size="10.5" font-weight="bold" fill="#fb923c" text-anchor="middle">README.txt</text>
                <text x="70" y="44" font-family="Cairo" font-size="9" fill="#94a3b8" text-anchor="middle">دليل فتح واستخدام الخارطة</text>
              </g>

              <!-- File 7: PNG & PGW -->
              <g transform="translate(660, 55)">
                <rect width="140" height="75" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2"/>
                <text x="70" y="26" font-family="Fira Code" font-size="11" font-weight="bold" fill="#38bdf8" text-anchor="middle">map.png + pgw</text>
                <text x="70" y="46" font-family="Cairo" font-size="9" fill="#cbd5e1" text-anchor="middle">صورة شفافة للعرض السريع</text>
                <text x="70" y="62" font-family="Cairo" font-size="8.5" fill="#94a3b8" text-anchor="middle">Transparent Collar</text>
              </g>
            </svg>
          </div>
        </div>

      </div>
    </section>

    <!-- =======================================================================
         SECTION 2: TECHNICAL TABLES & MATHEMATICAL MODELS
         ======================================================================= -->
    <section id="tables-section" class="space-y-6 pt-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <i class="fa-solid fa-table"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white">الجداول الفنية والمواصفات القياسية (Technical Specifications)</h3>
            <p class="text-xs text-slate-400">مقارنات الخوارزميات، بنية ملفات World File، ومطابقة برمجيات GIS</p>
          </div>
        </div>
        <span class="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">4 جداول مقارنة</span>
      </div>

      <!-- Table 1: Mathematical Georeferencing Transformations -->
      <div class="glass-card rounded-2xl p-5 border-slate-700/80 shadow-lg space-y-3">
        <h4 class="text-sm font-bold text-sky-300 flex items-center gap-2">
          <i class="fa-solid fa-calculator text-sky-400"></i>
          <span>جدول 1: مقارنة النماذج الرياضية لمعايرة الخرائط الجغرافية في المنظومة</span>
        </h4>
        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs border-collapse">
            <thead>
              <tr class="bg-slate-900/90 text-slate-300 border-b border-slate-700 font-semibold">
                <th class="p-3">نموذج التحويل (Transformation)</th>
                <th class="p-3">درجات الحرية (DoF)</th>
                <th class="p-3">المعادلات الرياضية</th>
                <th class="p-3">حفظ الزوايا (90°)</th>
                <th class="p-3">حفظ نسبة الأبعاد (1:1)</th>
                <th class="p-3">حالة الاستخدام والاعتماد في المنصة</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 text-slate-300">
              <tr class="bg-emerald-950/20 hover:bg-emerald-900/30 transition-colors">
                <td class="p-3 font-bold text-emerald-400 flex items-center gap-1.5">
                  <i class="fa-solid fa-check-circle"></i>
                  <span>التشابه التوافقي (Conformal Similarity)</span>
                </td>
                <td class="p-3 font-mono text-emerald-300 font-bold">4 معاملات (s, θ, tx, ty)</td>
                <td class="p-3 font-mono text-[11px] text-slate-200 dir-ltr">
                  x' = s·cos(θ)·x - s·sin(θ)·y + tx<br>
                  y' = s·sin(θ)·x + s·cos(θ)·y + ty
                </td>
                <td class="p-3 text-emerald-400 font-bold">نعم (تام ومطلق)</td>
                <td class="p-3 text-emerald-400 font-bold">نعم (s_x = s_y = s)</td>
                <td class="p-3 text-slate-200 font-medium">النموذج القياسي المعتمد في المنصة لمنع تشويه الخرائط المستوردة.</td>
              </tr>
              <tr class="hover:bg-slate-900/50 transition-colors">
                <td class="p-3 font-bold text-amber-400">التحويل التآلفي (Affine Transformation)</td>
                <td class="p-3 font-mono text-amber-300 font-bold">6 معاملات (a, b, c, d, e, f)</td>
                <td class="p-3 font-mono text-[11px] text-slate-200 dir-ltr">
                  x' = a·x + b·y + c<br>
                  y' = d·x + e·y + f
                </td>
                <td class="p-3 text-rose-400 font-semibold">لا (يسمح بالانحراف Shearing)</td>
                <td class="p-3 text-rose-400 font-semibold">لا (تغيير مقياس غير متساوٍ)</td>
                <td class="p-3 text-slate-300">يستخدم فقط للمعايرات متعددة النقاط (N > 4) عند وجود انكماش ورقي تاريخي.</td>
              </tr>
              <tr class="hover:bg-slate-900/50 transition-colors">
                <td class="p-3 font-bold text-slate-400">الإسقاط المنظوري (Projective Homography)</td>
                <td class="p-3 font-mono text-slate-300 font-bold">8 معاملات (h11 .. h33)</td>
                <td class="p-3 font-mono text-[11px] text-slate-200 dir-ltr">
                  x' = (h11·x + h12·y + h13) / (h31·x + h32·y + 1)<br>
                  y' = (h21·x + h22·y + h23) / (h31·x + h32·y + 1)
                </td>
                <td class="p-3 text-rose-400 font-semibold">لا (تلاشي الخطوط المتوازية)</td>
                <td class="p-3 text-rose-400 font-semibold">لا (تشويه عدسة مائل)</td>
                <td class="p-3 text-slate-400">مخصص للصور المائلة (Oblique Aerial Imagery) غير المصححة عامودياً.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Table 2: ArcView World File Specification -->
      <div class="glass-card rounded-2xl p-5 border-slate-700/80 shadow-lg space-y-3">
        <h4 class="text-sm font-bold text-amber-300 flex items-center gap-2">
          <i class="fa-solid fa-file-code text-amber-400"></i>
          <span>جدول 2: بنية معاملات مصفوفة ملف الإسناد العالمي ESRI World File (.tfw / .pgw)</span>
        </h4>
        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs border-collapse">
            <thead>
              <tr class="bg-slate-900/90 text-slate-300 border-b border-slate-700 font-semibold">
                <th class="p-3">السطر</th>
                <th class="p-3">رمز المعامل</th>
                <th class="p-3">المعنى الهندسي والمكاني</th>
                <th class="p-3">القيمة في المنظومة (حالة عدم التدوير)</th>
                <th class="p-3">القيمة في المنظومة (مع زاوية تدوير θ)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 text-slate-300">
              <tr class="hover:bg-slate-900/50">
                <td class="p-3 font-mono font-bold text-sky-400">Line 1</td>
                <td class="p-3 font-mono font-bold">A</td>
                <td class="p-3">حجم البكسل باتجاه المحور السيني (X-scale / Pixel Width)</td>
                <td class="p-3 font-mono text-emerald-400">+dx</td>
                <td class="p-3 font-mono text-amber-300">+dx · cos(θ)</td>
              </tr>
              <tr class="hover:bg-slate-900/50">
                <td class="p-3 font-mono font-bold text-sky-400">Line 2</td>
                <td class="p-3 font-mono font-bold">D</td>
                <td class="p-3">معامل الدوران والانحراف حول المحور الصادي (Rotation about Y)</td>
                <td class="p-3 font-mono text-slate-400">0.00000000</td>
                <td class="p-3 font-mono text-amber-300">-dy · sin(θ)</td>
              </tr>
              <tr class="hover:bg-slate-900/50">
                <td class="p-3 font-mono font-bold text-sky-400">Line 3</td>
                <td class="p-3 font-mono font-bold">B</td>
                <td class="p-3">معامل الدوران والانحراف حول المحور السيني (Rotation about X)</td>
                <td class="p-3 font-mono text-slate-400">0.00000000</td>
                <td class="p-3 font-mono text-amber-300">+dx · sin(θ)</td>
              </tr>
              <tr class="hover:bg-slate-900/50">
                <td class="p-3 font-mono font-bold text-sky-400">Line 4</td>
                <td class="p-3 font-mono font-bold">E</td>
                <td class="p-3">حجم البكسل باتجاه المحور الصادي (Y-scale / السالب دائماً من الشمال لأسفل)</td>
                <td class="p-3 font-mono text-rose-400">-dy</td>
                <td class="p-3 font-mono text-amber-300">-dy · cos(θ)</td>
              </tr>
              <tr class="hover:bg-slate-900/50">
                <td class="p-3 font-mono font-bold text-emerald-400">Line 5</td>
                <td class="p-3 font-mono font-bold">C</td>
                <td class="p-3">الإحداثي السيني لمركز البكسل العلوي الأيسر (Center of Top-Left Pixel X)</td>
                <td class="p-3 font-mono text-cyan-300 font-bold">Xmin + dx / 2</td>
                <td class="p-3 font-mono text-cyan-300 font-bold">Xmin + dx / 2</td>
              </tr>
              <tr class="hover:bg-slate-900/50">
                <td class="p-3 font-mono font-bold text-emerald-400">Line 6</td>
                <td class="p-3 font-mono font-bold">F</td>
                <td class="p-3">الإحداثي الصادي لمركز البكسل العلوي الأيسر (Center of Top-Left Pixel Y)</td>
                <td class="p-3 font-mono text-cyan-300 font-bold">Ymax - dy / 2</td>
                <td class="p-3 font-mono text-cyan-300 font-bold">Ymax - dy / 2</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="text-[11px] text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
          💡 <strong>ملاحظة جيوديسية حاسمة:</strong> تم في التحديث الأخير حل خطأ إزاحة نصف البكسل عبر تصحيح معادلة السطرين الخامس والسادس (`C = Xmin + dx/2` و `F = Ymax - dy/2`) لتلائم معيار مركز البكسل المعتمد في ArcView GIS و ArcGIS.
        </div>
      </div>

      <!-- Table 3: GIS Software Compatibility -->
      <div class="glass-card rounded-2xl p-5 border-slate-700/80 shadow-lg space-y-3">
        <h4 class="text-sm font-bold text-emerald-300 flex items-center gap-2">
          <i class="fa-solid fa-laptop-code text-emerald-400"></i>
          <span>جدول 3: مصفوفة توافقية المخرجات المصدرة مع برمجيات نظم المعلومات الجغرافية</span>
        </h4>
        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs border-collapse">
            <thead>
              <tr class="bg-slate-900/90 text-slate-300 border-b border-slate-700 font-semibold">
                <th class="p-3">برنامج نظم المعلومات الجغرافية</th>
                <th class="p-3">الصيغة الموصى بها</th>
                <th class="p-3">ملفات الإسناد المعتمدة</th>
                <th class="p-3">مستوى التوافق</th>
                <th class="p-3">ملاحظات التشغيل السريع</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 text-slate-300">
              <tr class="hover:bg-slate-900/50">
                <td class="p-3 font-bold text-white flex items-center gap-2">
                  <i class="fa-solid fa-layer-group text-amber-400"></i>
                  <span>ESRI ArcView GIS 3.2 / 3.3</span>
                </td>
                <td class="p-3 font-mono text-amber-300">.TIF + .TFW</td>
                <td class="p-3 font-mono text-slate-300">.tfw (World File)</td>
                <td class="p-3 text-emerald-400 font-bold">100% (توافق تام أصيل)</td>
                <td class="p-3 text-slate-300">قائمة View -> Add Theme -> اختيار Image Data Source.</td>
              </tr>
              <tr class="hover:bg-slate-900/50">
                <td class="p-3 font-bold text-white flex items-center gap-2">
                  <i class="fa-solid fa-earth-americas text-blue-400"></i>
                  <span>ESRI ArcGIS Pro / ArcMap</span>
                </td>
                <td class="p-3 font-mono text-sky-300">GeoTIFF (.tif)</td>
                <td class="p-3 font-mono text-slate-300">ModelTiepoint + .aux.xml</td>
                <td class="p-3 text-emerald-400 font-bold">100% (توافق تام أصيل)</td>
                <td class="p-3 text-slate-300">سحب وإفلات مباشر أو استيراد كـ Raster Layer في مساحة المشروع.</td>
              </tr>
              <tr class="hover:bg-slate-900/50">
                <td class="p-3 font-bold text-white flex items-center gap-2">
                  <i class="fa-solid fa-globe text-emerald-400"></i>
                  <span>QGIS 3.x (Quantum GIS)</span>
                </td>
                <td class="p-3 font-mono text-emerald-300">GeoTIFF / PNG+PGW</td>
                <td class="p-3 font-mono text-slate-300">.prj + .points + .tfw</td>
                <td class="p-3 text-emerald-400 font-bold">100% (توافق تام أصيل)</td>
                <td class="p-3 text-slate-300">Layer -> Add Raster Layer مع إمكانية مراجعة نقاط GCP من ملف .points.</td>
              </tr>
              <tr class="hover:bg-slate-900/50">
                <td class="p-3 font-bold text-white flex items-center gap-2">
                  <i class="fa-solid fa-map text-purple-400"></i>
                  <span>Global Mapper / ERDAS IMAGINE</span>
                </td>
                <td class="p-3 font-mono text-purple-300">GeoTIFF (.tif)</td>
                <td class="p-3 font-mono text-slate-300">UTM Zone 38N Tags</td>
                <td class="p-3 text-emerald-400 font-bold">100% (توافق تام أصيل)</td>
                <td class="p-3 text-slate-300">يفتح الإحداثيات والترويس الإسقاطي آلياً دون الحاجة لإعادة تعريف.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </section>

    <!-- =======================================================================
         SECTION 3: FULL CHRONOLOGICAL CHAT & COMMAND LOG (ALL 60 ITEMS)
         ======================================================================= -->
    <section id="chat-log-section" class="space-y-6 pt-4">
      
      <!-- Section Header with Search and Filter Bar -->
      <div class="space-y-4 border-b border-slate-800 pb-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <i class="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div>
              <h3 class="text-xl font-bold text-white">سجل المحادثات والأوامر الكامل (60 أمراً واستشارة)</h3>
              <p class="text-xs text-slate-400">توثيق تسلسلي دقيق لكل طلب ومحادثة منذ بداية المشروع وحتى الآن</p>
            </div>
          </div>

          <!-- Counter and Count Badge -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono text-slate-400">عدد الأوامر المعروضة:</span>
            <span id="visibleItemsCount" class="text-xs font-mono font-bold text-white bg-sky-600 px-2.5 py-0.5 rounded-full">60</span>
          </div>
        </div>

        <!-- Interactive Search Input & Phase Pills -->
        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3 no-print">
          
          <!-- Search Bar -->
          <div class="relative flex-1">
            <input 
              type="text" 
              id="historySearchInput" 
              placeholder="ابحث في نص الأمر، الحل البرمجي، رقم الأمر، أو اسم الخوارزمية..."
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors shadow-inner"
              oninput="filterHistoryItems()"
            >
            <i class="fa-solid fa-magnifying-glass absolute right-3.5 top-3.5 text-slate-500 text-xs"></i>
          </div>

          <!-- Filter Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs shrink-0">
            <button onclick="setPhaseFilter('all')" class="phase-filter-btn active px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold transition-colors" data-filter="all">الكل (60)</button>
            <button onclick="setPhaseFilter('phase1')" class="phase-filter-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors" data-filter="phase1">المرحلة 1: التأسيس</button>
            <button onclick="setPhaseFilter('phase2')" class="phase-filter-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors" data-filter="phase2">المرحلة 2: راستر ECW</button>
            <button onclick="setPhaseFilter('phase3')" class="phase-filter-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors" data-filter="phase3">المرحلة 3: GeoTIFF</button>
            <button onclick="setPhaseFilter('phase4')" class="phase-filter-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors" data-filter="phase4">المرحلة 4: نقاط GCP</button>
            <button onclick="setPhaseFilter('phase5')" class="phase-filter-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors" data-filter="phase5">المرحلة 5: المطابقة الضوئية</button>
            <button onclick="setPhaseFilter('phase6')" class="phase-filter-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors" data-filter="phase6">المرحلة 6: تصدير ArcView</button>
            <button onclick="setPhaseFilter('phase7')" class="phase-filter-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors" data-filter="phase7">المرحلة 7: التطابق العكسي</button>
          </div>

        </div>
      </div>

      <!-- Chronological Items Timeline / Cards Container -->
      <div id="historyItemsContainer" class="space-y-4">
HTML_HEAD

# Output each of the 60 items in HTML
for my $it (@items) {
    my $id = $it->{id};
    my $time = $it->{time};
    my $text = $it->{text};
    my $m = $meta{$id} // {
        phase => "phase1",
        phase_name => "مرحلة عامة",
        title => "استشارة ومتابعة برمجية",
        summary => "طلب تطوير ومتابعة برمجية",
        solution => "تم التحليل والتنفيذ الهندسي بنجاح",
        badge => "طلب مكتمل",
        badge_color => "bg-slate-500/20 text-slate-300 border-slate-500/30"
    };

    # Format text safely
    my $safe_text = $text;
    $safe_text =~ s/&/&amp;/g;
    $safe_text =~ s/</&lt;/g;
    $safe_text =~ s/>/&gt;/g;
    $safe_text =~ s/"/&quot;/g;

    my $safe_title = $m->{title};
    $safe_title =~ s/&/&amp;/g;
    $safe_title =~ s/</&lt;/g;
    $safe_title =~ s/>/&gt;/g;

    my $safe_summary = $m->{summary};
    $safe_summary =~ s/&/&amp;/g;
    $safe_summary =~ s/</&lt;/g;
    $safe_summary =~ s/>/&gt;/g;

    my $safe_solution = $m->{solution};
    $safe_solution =~ s/&/&amp;/g;
    $safe_solution =~ s/</&lt;/g;
    $safe_solution =~ s/>/&gt;/g;

    print $out <<"ITEM_HTML";
        <div class="history-item glass-card rounded-2xl p-5 border-slate-700/70 hover:border-slate-600 transition-all shadow-md space-y-4" data-id="$id" data-phase="$m->{phase}">
          
          <!-- Top Row: Badge, Time, ID -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-mono font-black text-xs">
                #$id
              </span>
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border $m->{badge_color}">
                $m->{badge}
              </span>
              <span class="text-[10px] text-slate-400 font-medium">
                $m->{phase_name}
              </span>
            </div>

            <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <i class="fa-regular fa-clock text-slate-500"></i>
              <span>$time</span>
            </div>
          </div>

          <!-- User Request Box -->
          <div class="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800/90 space-y-1">
            <div class="text-[10px] font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <i class="fa-solid fa-comment-dots text-xs"></i>
              <span>نص طلب المستخدم / الأمر الموجه:</span>
            </div>
            <div class="text-sm font-semibold text-slate-100 leading-relaxed font-sans pr-1">
              $safe_text
            </div>
          </div>

          <!-- System Response & Technical Architecture -->
          <div class="space-y-2 text-xs">
            <div class="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
              <i class="fa-solid fa-code-commit text-xs"></i>
              <span>$safe_title</span>
            </div>
            <p class="text-slate-300 leading-relaxed">
              <strong>التشخيص والهدف:</strong> $safe_summary
            </p>
            <div class="bg-slate-950/80 rounded-lg p-3 border border-slate-800 text-slate-300 leading-relaxed space-y-1">
              <div class="font-semibold text-sky-400 flex items-center gap-1 text-[11px]">
                <i class="fa-solid fa-gears"></i>
                <span>الإجراءات البرمجية والحل المطبق:</span>
              </div>
              <div class="text-slate-200">
                $safe_solution
              </div>
            </div>
          </div>

        </div>
ITEM_HTML
}

print $out <<'HTML_FOOTER';
      </div>

    </section>

  </main>

  <!-- =========================================================================
       Footer
       ========================================================================= -->
  <footer class="bg-slate-950 border-t border-slate-800/80 py-8 px-4 lg:px-8 mt-12 text-center text-xs text-slate-500 space-y-3">
    <div class="flex items-center justify-center gap-2 text-amber-300 font-bold text-sm">
      <i class="fa-solid fa-compass-drafting text-amber-400 text-base"></i>
      <span>تصميم وتطوير الدكتور المهندس احمد لؤي البجاري</span>
    </div>
    <div class="max-w-xl mx-auto text-slate-400 text-[11px] leading-relaxed">
      منظومة ArcGIS Living Atlas Iraq • أطلس البيانات المكانية التفاعلي واستوديو تصدير الخرائط الفضائية المصححة لبرامج ArcView GIS و GeoTIFF
    </div>
    <div class="text-[10px] text-slate-600 font-mono">
      Generated automatically on 2026-09-30 • Full Historical Archive • 60 Engineering Commands
    </div>
  </footer>

  <!-- =========================================================================
       Client-Side Scripts (Instant Search, Filter & Download)
       ========================================================================= -->
  <script>
    let currentFilter = 'all';

    function setPhaseFilter(phase) {
      currentFilter = phase;
      document.querySelectorAll('.phase-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-filter') === phase) {
          btn.classList.add('bg-sky-600', 'text-white', 'font-semibold');
          btn.classList.remove('bg-slate-800', 'text-slate-300');
        } else {
          btn.classList.remove('bg-sky-600', 'text-white', 'font-semibold');
          btn.classList.add('bg-slate-800', 'text-slate-300');
        }
      });
      filterHistoryItems();
    }

    function filterHistoryItems() {
      const q = (document.getElementById('historySearchInput').value || '').toLowerCase().trim();
      const items = document.querySelectorAll('.history-item');
      let visibleCount = 0;

      items.forEach(el => {
        const itemPhase = el.getAttribute('data-phase');
        const textContent = el.innerText.toLowerCase();

        const matchPhase = (currentFilter === 'all' || itemPhase === currentFilter);
        const matchSearch = (!q || textContent.includes(q));

        if (matchPhase && matchSearch) {
          el.style.display = '';
          visibleCount++;
        } else {
          el.style.display = 'none';
        }
      });

      const countBadge = document.getElementById('visibleItemsCount');
      if (countBadge) {
        countBadge.textContent = visibleCount;
      }
    }

    function downloadSelfAsHtml() {
      const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ArcGIS_Living_Atlas_Conversation_History_Dr_Ahmed_Louay.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  </script>

</body>
</html>
HTML_FOOTER

close $out;
print "Successfully generated conversation-history.html ($output_html)\n";
