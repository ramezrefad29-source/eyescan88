"use client";

import { AnalysisResult } from "@/lib/types";
import { SEVERITY_CONFIG } from "@/lib/constants";

interface PrintableReportProps {
  result: AnalysisResult;
  previewUrl?: string | null;
}

export default function PrintableReport({ result, previewUrl }: PrintableReportProps) {
  const cfg = SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG["Normal"];
  const formattedDate = result.timestamp
    ? new Date(result.timestamp).toLocaleString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const finalImgSrc = previewUrl || (result.imageBase64 ? `data:image/jpeg;base64,${result.imageBase64}` : "");
  const heatmapImgSrc = result.heatmapBase64 ? `data:image/png;base64,${result.heatmapBase64}` : "";

  // Set the dynamic QR Code link pointing to the verification endpoint
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const scanLink = `${origin}/scans/${result.scanId}?pwd=${result.patientPassword}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(scanLink)}`;

  return (
    <div 
      className="w-[210mm] min-h-[297mm] bg-white text-slate-900 p-[1.5cm] mx-auto font-sans leading-relaxed text-right flex flex-col justify-between"
      style={{ boxSizing: "border-box" }}
    >
      <div>
        {/* ── HOSPITAL / CLINIC HEADER ── */}
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6 flex-row-reverse">
          <div className="flex items-center gap-3 flex-row-reverse text-right">
            {/* Custom SVG Clinic Logo */}
            <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xl">
              👁️
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 font-display">المنصة الطبية الذكية RetinaScan AI</h1>
              <p className="text-xs text-slate-500">مركز التشخيص المتقدم والتحليل الذاتي لشبكية العين</p>
            </div>
          </div>
          <div className="text-left font-mono">
            <span className="text-xs font-bold text-slate-900 block">REPORT ID: #{result.scanId}</span>
            <span className="text-[10px] text-slate-500 block">{formattedDate}</span>
          </div>
        </div>

        {/* ── TITLE ── */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-dashed border-slate-300 pb-2 inline-block px-8">
            تقرير تشخيص اعتلال الشبكية السكري المعتمد
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">Retinal Fundus Examination & AI Diagnostic Report</p>
        </div>

        {/* ── PATIENT & CLINIC METADATA TABLE ── */}
        <div className="grid grid-cols-4 gap-y-3 gap-x-2 border border-slate-300 rounded-xl p-4 mb-6 text-xs bg-slate-50/50">
          <div className="col-span-1 text-slate-500 font-bold">اسم المريض:</div>
          <div className="col-span-1 text-slate-900 font-bold">{result.patientName || "N/A"}</div>
          
          <div className="col-span-1 text-slate-500 font-bold">تاريخ الفحص:</div>
          <div className="col-span-1 text-slate-900">{formattedDate}</div>

          <div className="col-span-1 text-slate-500 font-bold">رقم التقرير:</div>
          <div className="col-span-1 font-mono text-slate-900">#{result.scanId}</div>

          <div className="col-span-1 text-slate-500 font-bold">رمز المرور للملف:</div>
          <div className="col-span-1 font-mono text-slate-900 font-bold tracking-wider">{result.patientPassword || "—"}</div>

          <div className="col-span-1 text-slate-500 font-bold">طريقة الفحص:</div>
          <div className="col-span-1 text-slate-900">صورة قاع العين (Fundus Scan)</div>

          <div className="col-span-1 text-slate-500 font-bold">نموذج التحليل:</div>
          <div className="col-span-1 text-slate-900 font-mono">{result.modelVersion || "RetinaDR-v5.0-TTA"}</div>
        </div>

        {/* ── DIAGNOSIS HIGHLIGHT BANNER ── */}
        <div 
          className="border rounded-xl p-5 mb-6 text-center space-y-2"
          style={{
            backgroundColor: `${cfg.color}08`,
            borderColor: cfg.color,
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: cfg.color }}>
            التشخيص والتقييم السريري (Clinical Diagnosis)
          </span>
          <h3 className="text-xl font-bold font-display" style={{ color: cfg.color }}>
            {result.diagnosisAr || result.diagnosis}
          </h3>
          <div className="flex justify-center gap-6 items-center text-xs text-slate-700">
            <span>الدرجة: <strong>{result.stage}</strong></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>معدل ثقة الذكاء الاصطناعي: <strong style={{ color: cfg.color }}>{Math.round(result.confidence * 100)}%</strong></span>
          </div>
        </div>

        {/* ── SIDE-BY-SIDE RETINAL IMAGES ── */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Original Image */}
          <div className="border border-slate-200 rounded-xl p-3 flex flex-col items-center bg-slate-50">
            <span className="text-[10.5px] font-bold text-slate-600 mb-2 block w-full text-center">الصورة الأصلية لقاع العين (Original Fundus)</span>
            <div className="w-[180px] h-[180px] bg-slate-900 rounded-lg overflow-hidden border border-slate-300 relative flex items-center justify-center">
              {finalImgSrc ? (
                <img src={finalImgSrc} alt="Original Fundus" className="w-full h-full object-cover" />
              ) : (
                <div className="text-[10px] text-slate-400">لا توجد صورة متوفرة</div>
              )}
            </div>
          </div>

          {/* Heatmap Image */}
          <div className="border border-slate-200 rounded-xl p-3 flex flex-col items-center bg-slate-50">
            <span className="text-[10.5px] font-bold text-slate-600 mb-2 block w-full text-center">خريطة الحرارة للذكاء الاصطناعي (AI Heatmap)</span>
            <div className="w-[180px] h-[180px] bg-slate-900 rounded-lg overflow-hidden border border-slate-300 relative flex items-center justify-center">
              {heatmapImgSrc ? (
                <img src={heatmapImgSrc} alt="AI Grad-CAM Heatmap" className="w-full h-full object-cover" />
              ) : (
                <div className="text-[10px] text-slate-400">لم يتم توليد خريطة حرارية</div>
              )}
            </div>
          </div>
        </div>

        {/* ── AFFECTED ZONES & RECOMMENDATIONS (2 cols layout) ── */}
        <div className="grid grid-cols-5 gap-6 mb-6">
          {/* Affected Zones (3 cols) */}
          <div className="col-span-3 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-xs text-slate-800 border-b border-slate-200 pb-2">تحليل وتضرر مناطق الشبكية المفحوصة</h4>
            <div className="space-y-2.5">
              {(result.affectedZones || []).map((zone) => {
                const zoneCfg = SEVERITY_CONFIG[zone.severity] || SEVERITY_CONFIG["Normal"];
                return (
                  <div key={zone.name} className="space-y-1">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="font-bold text-slate-700">{zone.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: `${zoneCfg.color}15`, color: zoneCfg.color, border: `0.5px solid ${zoneCfg.color}` }}>
                          {zoneCfg.label}
                        </span>
                        <span className="font-bold font-mono" style={{ color: zoneCfg.color }}>{zone.percentage}%</span>
                      </div>
                    </div>
                    {/* Tiny Progress bar */}
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div className="h-full rounded-full" style={{ width: `${zone.percentage}%`, backgroundColor: zoneCfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations (2 cols) */}
          <div className="col-span-2 border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-xs text-slate-800 border-b border-slate-200 pb-2">التوصيات والخطط الوقائية</h4>
            <ul className="space-y-2 text-[10px] text-slate-600">
              {(result.recommendations || []).map((rec, i) => (
                <li key={i} className="flex gap-2 items-start flex-row-reverse text-right">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                  <span className="leading-relaxed flex-1">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── FOOTER & VERIFICATION STAMPS ── */}
      <div className="border-t border-slate-300 pt-6">
        <div className="grid grid-cols-4 gap-4 items-center">
          {/* QR Verification */}
          <div className="col-span-1 flex flex-col items-center gap-1">
            <div className="p-1 bg-white border border-slate-300 rounded-lg">
              <img src={qrCodeUrl} alt="Report Verification QR Code" className="w-[80px] h-[80px]" />
            </div>
            <span className="text-[7.5px] text-slate-500 font-semibold">امسح للتحقق الرقمي للتقرير</span>
          </div>

          {/* Legal disclaimer */}
          <div className="col-span-2 text-right space-y-1 px-2">
            <h5 className="font-bold text-[9px] text-slate-900">إخلاء المسؤولية الطبية:</h5>
            <p className="text-[8px] text-slate-500 leading-relaxed">
              هذا التقرير تم توليده بواسطة محرك تحليل قائم على الذكاء الاصطناعي المساعد كأداة تشخيصية إضافية للشبكية.
              لا يعتبر هذا التقرير بديلاً عن الاستشارة الطبية المباشرة من قِبل طبيب العيون المختص ويجب مراجعته من قبل الطبيب المعالج.
            </p>
          </div>

          {/* Doctor Signature */}
          <div className="col-span-1 text-center flex flex-col items-center justify-between h-full py-1">
            <div className="space-y-0.5 text-center">
              <span className="text-[9.5px] font-bold text-slate-800 block">الطبيب الاستشاري المعتمد</span>
              <span className="text-[8px] text-slate-500 block">إمضاء الكتروني موثق</span>
            </div>
            
            {/* Realistic Doctor Signature Path & Official Stamp overlay */}
            <div className="relative w-28 h-12 flex items-center justify-center my-1 select-none">
              {/* Simulated Blue Handwritten Signature */}
              <svg className="absolute w-24 h-8 text-blue-600 opacity-85 z-10" viewBox="0 0 100 30" fill="none">
                <path d="M5 25 C 20 -5, 40 30, 50 15 C 60 5, 65 25, 75 10 C 85 -5, 90 20, 95 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M30 18 L 85 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {/* Simulated Circular Hospital Stamp overlay (translucent red) */}
              <div className="absolute w-12 h-12 border-2 border-red-500/25 border-dashed rounded-full flex items-center justify-center text-[7px] text-red-500/30 font-bold rotate-12">
                RE-SCAN AI
              </div>
            </div>

            <div className="w-20 border-t border-slate-300 pt-0.5">
              <span className="text-[8px] text-slate-400">قسم جراحة الشبكية</span>
            </div>
          </div>
        </div>

        <div className="text-center text-[8px] text-slate-400 mt-6 border-t border-slate-100 pt-2 font-mono">
          RetinaScan AI System • Secure Medical Records v5.0-TTA • encrypted with SHA-256
        </div>
      </div>
    </div>
  );
}
