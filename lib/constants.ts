// ============================================================
// RetinaScan AI — App Constants
// ============================================================

export const APP_NAME = "RetinaScan AI";
export const APP_TAGLINE = "اكتشاف اعتلال الشبكية المخروطي بدقة استثنائية";
export const APP_DESCRIPTION =
  "منصة تشخيص طبي متقدمة تعتمد على الذكاء الاصطناعي لاكتشاف اعتلال الشبكية المخروطي (Cone-Rod Dystrophy) بدقة تتخطى 95%.";

export const MODEL_VERSION = "RetinaDR-v4.0";
export const MODEL_ACCURACY = "64.5%";

export const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/tiff": [".tif", ".tiff"],
  "image/bmp": [".bmp"],
};

export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SEVERITY_CONFIG = {
  Normal: {
    label: "طبيعي",
    color: "#00C9A7",
    glow: "0 0 20px rgba(0,201,167,0.5)",
    bg: "rgba(0,201,167,0.1)",
    border: "rgba(0,201,167,0.3)",
  },
  Mild: {
    label: "خفيف",
    color: "#FFD60A",
    glow: "0 0 20px rgba(255,214,10,0.5)",
    bg: "rgba(255,214,10,0.1)",
    border: "rgba(255,214,10,0.3)",
  },
  Moderate: {
    label: "معتدل",
    color: "#FF8C42",
    glow: "0 0 20px rgba(255,140,66,0.5)",
    bg: "rgba(255,140,66,0.1)",
    border: "rgba(255,140,66,0.3)",
  },
  Severe: {
    label: "شديد",
    color: "#FF4757",
    glow: "0 0 20px rgba(255,71,87,0.5)",
    bg: "rgba(255,71,87,0.1)",
    border: "rgba(255,71,87,0.3)",
  },
  Critical: {
    label: "حرج",
    color: "#FF0040",
    glow: "0 0 30px rgba(255,0,64,0.7)",
    bg: "rgba(255,0,64,0.15)",
    border: "rgba(255,0,64,0.4)",
  },
};

export const SCAN_STEPS = [
  { id: 1, label: "استخراج الخصائص", duration: 800 },
  { id: 2, label: "تحليل الشبكية", duration: 1200 },
  { id: 3, label: "كشف الأنماط", duration: 900 },
  { id: 4, label: "التصنيف النهائي", duration: 600 },
];

// Mock result — replace when real model is ready
export const MOCK_RESULT = {
  diagnosis: "Cone-Rod Dystrophy",
  confidence: 0.943,
  severity: "Moderate" as const,
  stage: "المرحلة الثانية",
  affectedZones: [
    { name: "المنطقة البقعية", severity: "Severe" as const, percentage: 72 },
    { name: "المستقبلات الضوئية", severity: "Moderate" as const, percentage: 58 },
    { name: "الطبقة الحبيبية الخارجية", severity: "Mild" as const, percentage: 34 },
    { name: "النقرة المركزية", severity: "Severe" as const, percentage: 81 },
  ],
  recommendations: [
    "مراجعة طبيب العيون المتخصص فورًا لتقييم شامل",
    "إجراء مخطط كهربي للشبكية (ERG) للتأكيد",
    "فحص جينومي لتحديد الطفرة الجينية المسببة",
    "البدء بمكملات فيتامين A بجرعات علاجية محسوبة",
    "متابعة دورية كل 6 أشهر لرصد التقدم",
  ],
  processingTimeMs: 3420,
  modelVersion: MODEL_VERSION,
  scanId: `CRD-${Date.now()}`,
  heatmapCoordinates: [
    { x: 0.45, y: 0.48, intensity: 0.95, radius: 45 }, // Optic disc area
    { x: 0.58, y: 0.52, intensity: 0.88, radius: 35 }, // Macular area
    { x: 0.65, y: 0.38, intensity: 0.72, radius: 25 }, // Lesion A
    { x: 0.35, y: 0.62, intensity: 0.64, radius: 30 }  // Lesion B
  ]
};

export const ANATOMY_DESCRIPTIONS = {
  all: {
    title: "تشريح العين البشري الكامل",
    titleEn: "Complete Human Eye Anatomy",
    description: "تتكون العين البشرية من نظام بصري معقد يركز الضوء على الشبكية الحساسة للضوء لتحويله إلى نبضات عصبية. حدد أي جزء من أجزاء العين لعرض وظيفته الطبية وتشخيصه الدقيق.",
    metric: "سلامة الهيكل: 100%"
  },
  sclera: {
    title: "صلبة العين (Sclera)",
    titleEn: "Sclera",
    description: "الصلبة هي الطبقة الخارجية البيضاء الحامية للعين، وتتكون من أنسجة ليفية كثيفة تحافظ على شكل العين الدائري وتحمي الهياكل الحيوية الداخلية من الإصابات والضغط الداخلي.",
    metric: "الضغط الداخلي: 14 mmHg (طبيعي)"
  },
  iris: {
    title: "قزحية العين (Iris)",
    titleEn: "Iris",
    description: "القزحية هي الغشاء الملون الدائري خلف القرنية. تحتوي على عضلات لاإرادية تتحكم في فتح وإغلاق بؤبؤ العين لتنظيم كمية الضوء الداخلة حسب مستويات الإضاءة المحيطة.",
    metric: "الاستجابة الحركية: نشطة (طبيعي)"
  },
  pupil: {
    title: "بؤبؤ العين (Pupil)",
    titleEn: "Pupil / Aperture",
    description: "البؤبؤ هو الفتحة المركزية السوداء التي تسمح للضوء بالمرور مباشرة إلى الداخل. يظهر باللون الأسود لأن الضوء الداخل يمتص بالكامل بواسطة أنسجة العين الداخلية.",
    metric: "قطر الفتحة: 3.5 mm (تفاعلي)"
  },
  cornea: {
    title: "قرنية العين (Cornea)",
    titleEn: "Cornea",
    description: "القرنية هي الجزء الأمامي الشفاف المقوس الذي يغطي القزحية وبؤبؤ العين. تعمل كعدسة خارجية ثابتة توفر حوالي ثلثي القوة التركيزية الإجمالية للعين لتجميع الضوء بدقة.",
    metric: "درجة التقوس: 43.5 D (سليم)"
  },
  retina: {
    title: "شبكية العين (Retina)",
    titleEn: "Retina",
    description: "الشبكية هي الغشاء العصبي الداخلي الحساس للضوء. تحتوي على ملايين المستقبلات الضوئية (المخاريط للرؤية الملونة والحدة، والعصي للإضاءة الخافتة) وتصاب باعتلال الخلايا المخروطية (CRD).",
    metric: "مستوى اعتلال المستقبلات: حرج"
  }
};

export function getQrCodeUrl(scanId: string, password?: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  let scanLink = `${origin}/scans/${scanId}`;
  if (password) {
    scanLink += `?pwd=${password}`;
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(scanLink)}`;
}

export function generatePasscode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

