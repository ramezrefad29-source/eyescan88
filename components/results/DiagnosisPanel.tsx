"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnalysisResult } from "@/lib/types";
import { SEVERITY_CONFIG, getQrCodeUrl } from "@/lib/constants";
import RetinalFundusHeatmap from "./RetinalFundusHeatmap";
import PdfReportBtn from "./PdfReportBtn";
import dynamic from "next/dynamic";

const Eye3D = dynamic(() => import("@/components/ui/Eye3D"), {
  ssr: false,
});

const severityToStage = (sev?: string): number => {
  if (!sev) return 0;
  const s = sev.toLowerCase();
  if (s.includes("normal") || s.includes("healthy")) return 0;
  if (s.includes("mild")) return 1;
  if (s.includes("moderate")) return 2;
  if (s.includes("severe")) return 3;
  if (s.includes("proliferative") || s.includes("critical") || s.includes("urgent")) return 4;
  return 0;
};

interface DiagnosisPanelProps {
  result: AnalysisResult | null;
  isVisible: boolean;
  previewUrl?: string | null;
}

// ── Confidence Meter ───────────────────────────────────────
function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 90 ? "#00C9A7" : pct >= 75 ? "#00D4FF" : "#FF8C42";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: "144px", height: "144px" }}>
        <svg width="144" height="144" className="absolute inset-0">
          <defs>
            <linearGradient id="meterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle cx="72" cy="72" r={radius}
            stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
          {/* Progress arc */}
          <motion.circle
            cx="72" cy="72" r={radius}
            stroke="url(#meterGrad)" strokeWidth="8" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.6, ease: "easeOut", delay: 0.3 }}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-display font-bold"
            style={{ fontSize: "2rem", color, lineHeight: 1 }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
          >
            {pct}%
          </motion.span>
          <span className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>confidence</span>
        </div>
      </div>
      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        Diagnostic Confidence Score
      </p>
    </div>
  );
}

// ── Zone Progress Bar ──────────────────────────────────────
function ZoneBar({ zone, delay }: { zone: AnalysisResult["affectedZones"][0]; delay: number }) {
  const cfg = SEVERITY_CONFIG[zone.severity];
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="space-y-2"
    >
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{zone.name}</span>
        <div className="flex items-center gap-2">
          <span className="badge" style={{
            background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
            padding: "2px 8px", fontSize: "0.6rem",
          }}>
            {SEVERITY_CONFIG[zone.severity].label}
          </span>
          <span className="font-mono font-bold text-xs" style={{ color: cfg.color }}>
            {zone.percentage}%
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${zone.percentage}%` }}
          transition={{ duration: 1.1, ease: "easeOut", delay: delay + 0.15 }}
          style={{
            background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}99)`,
            boxShadow: `0 0 10px ${cfg.color}55`,
          }}
        />
      </div>
    </motion.div>
  );
}

// ── Patient Vision Simulator Component ──────────────────────
function VisionSimulator({ severity }: { severity: string }) {
  const [selectedSeverity, setSelectedSeverity] = useState(severity);
  const [selectedScene, setSelectedScene] = useState("snellen");

  const SCENES = [
    { id: "snellen", name: "لوحة فحص النظر" },
    { id: "street", name: "شارع المدينة", url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=600&q=80" },
    { id: "room", name: "غرفة المعيشة", url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80" },
    { id: "book", name: "قراءة كتاب", url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80" },
  ];

  const getFilterStyle = (sev: string) => {
    const s = sev.toLowerCase();
    if (s.includes("normal") || s.includes("healthy")) {
      return { filter: "none", opacity: 1 };
    }
    if (s.includes("mild")) {
      return { filter: "blur(2px) contrast(0.95)", opacity: 0.95 };
    }
    if (s.includes("moderate")) {
      return { filter: "blur(4.5px) contrast(0.85) saturate(0.75)", opacity: 0.9 };
    }
    if (s.includes("severe")) {
      return { filter: "blur(8px) contrast(0.7) saturate(0.6)", opacity: 0.85 };
    }
    if (s.includes("proliferative") || s.includes("critical") || s.includes("urgent") || s.includes("severe dr") || s.includes("critical dr")) {
      return { filter: "blur(14px) contrast(0.55) saturate(0.45)", opacity: 0.75 };
    }
    return { filter: "none", opacity: 1 };
  };

  const getSeverityLabel = (sev: string) => {
    const s = sev.toLowerCase();
    if (s.includes("normal") || s.includes("healthy")) return "سليمة (Normal)";
    if (s.includes("mild")) return "خفيفة (Mild)";
    if (s.includes("moderate")) return "متوسطة (Moderate)";
    if (s.includes("severe")) return "شديدة (Severe)";
    return "حرجة (Critical)";
  };

  return (
    <div className="space-y-4">
      {/* Scene Selector */}
      <div className="flex justify-between items-center text-xs flex-wrap gap-2">
        <span className="text-slate-400 font-semibold">المشهد المحاكى:</span>
        <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
          {SCENES.map((scene) => (
            <button
              key={scene.id}
              onClick={() => setSelectedScene(scene.id)}
              className={`px-2.5 py-1 text-[10px] rounded-md font-bold transition-all duration-150 cursor-pointer ${
                selectedScene === scene.id
                  ? "bg-violet-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {scene.id === "snellen" ? "📋 لوحة النظر" : scene.id === "street" ? "🚦 شارع" : scene.id === "room" ? "🛋️ غرفة" : "📖 كتاب"}
            </button>
          ))}
        </div>
      </div>

      {/* Severity Selector */}
      <div className="flex flex-wrap gap-1 bg-slate-950/60 p-1 rounded-xl justify-center border border-white/5">
        {["Normal", "Mild", "Moderate", "Severe", "Critical"].map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSeverity(s)}
            className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
              selectedSeverity.toLowerCase().includes(s.toLowerCase())
                ? "bg-cyan-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {s === "Normal" ? "سليم" : s === "Mild" ? "خفيف" : s === "Moderate" ? "متوسط" : s === "Severe" ? "شديد" : "حرج"}
          </button>
        ))}
      </div>

      {/* Screen Preview Container */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center h-[200px] w-full">
        {selectedScene === "snellen" ? (
          /* Snellen Eye Chart (crisp SVG/HTML rendering) */
          <div 
            className="text-center font-mono select-none transition-all duration-500 relative w-full h-full flex flex-col justify-center items-center p-6 bg-slate-900" 
            style={getFilterStyle(selectedSeverity)}
          >
            <div className="text-3xl font-bold text-white tracking-widest leading-none mb-1">E</div>
            <div className="text-xl font-bold text-white tracking-widest leading-none mb-1">F P</div>
            <div className="text-base font-bold text-white tracking-widest leading-none mb-1">T O Z</div>
            <div className="text-xs font-bold text-white tracking-widest leading-none mb-1">L P E D</div>
            <div className="text-[10px] font-bold text-white tracking-widest leading-none mb-0.5">P E C F D</div>
            <div className="text-[8px] font-bold text-white tracking-widest leading-none">E D F C Z P</div>

            {/* Red/Green reference bars */}
            <div className="w-24 h-1 bg-red-600 mt-2 rounded-full" />
            <div className="w-24 h-1 bg-emerald-600 mt-1 rounded-full" />
          </div>
        ) : (
          /* Unsplash Image Scenes */
          <img
            src={SCENES.find(s => s.id === selectedScene)?.url}
            alt="Simulated Scene"
            className="w-full h-full object-cover transition-all duration-500"
            style={getFilterStyle(selectedSeverity)}
          />
        )}

        {/* Spot Overlays (Scotomas) & Hemorrhages for severe cases */}
        {(selectedSeverity.toLowerCase().includes("severe") || selectedSeverity.toLowerCase().includes("critical") || selectedSeverity.toLowerCase().includes("proliferative")) && (
          <div className="absolute inset-0 pointer-events-none transition-all duration-500 overflow-hidden">
            {/* Dark blotches representing diabetic retinopathy scotomas */}
            <div className="absolute top-[20%] left-[30%] w-12 h-10 bg-black/90 rounded-full blur-md" />
            <div className="absolute bottom-[25%] right-[20%] w-14 h-12 bg-black/85 rounded-full blur-lg" />
            <div className="absolute top-[45%] left-[45%] w-10 h-10 bg-black/80 rounded-full blur-md" />
            {selectedSeverity.toLowerCase().includes("critical") && (
              <>
                <div className="absolute bottom-[15%] left-[20%] w-16 h-14 bg-black/95 rounded-full blur-xl animate-pulse" />
                <div className="absolute top-[30%] right-[35%] w-12 h-12 bg-red-950/60 rounded-full blur-md" />
                {/* Vitreous Hemorrhage blood splatters */}
                <div className="absolute top-[10%] right-[15%] w-20 h-12 bg-red-800/25 rounded-full blur-lg" />
                <div className="absolute bottom-[20%] left-[35%] w-14 h-10 bg-red-900/30 rounded-full blur-md" />
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-400">
        <span>محاكاة سريرية تقريبية للرؤية</span>
        <span>المستعرض حالياً: <strong style={{ color: "var(--cyan)" }}>{getSeverityLabel(selectedSeverity)}</strong></span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function DiagnosisPanel({ result, isVisible, previewUrl }: DiagnosisPanelProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (!result?.scanId) return;
    
    const generateQr = async () => {
      let origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      
      // If we are running on localhost, try to fetch the local network IP
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        try {
          const res = await fetch("/api/network-ip");
          const data = await res.json();
          if (data.success && data.ip && data.ip !== "localhost") {
            origin = origin.replace("localhost", data.ip).replace("127.0.0.1", data.ip);
          }
        } catch (e) {
          console.error("Failed to fetch network IP:", e);
        }
      }
      
      const scanLink = `${origin}/scans/${result.scanId}?pwd=${result.patientPassword}`;
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(scanLink)}`);
    };

    generateQr();
  }, [result?.scanId]);

  const handleCopyPassword = () => {
    if (!result?.patientPassword) return;
    navigator.clipboard.writeText(result.patientPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!result?.scanId) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    navigator.clipboard.writeText(`${origin}/scans/${result.scanId}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!result) return null;

  const cfg = SEVERITY_CONFIG[result.severity];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="space-y-4"
          id="diagnosis-panel"
        >

          {/* ── Retinal Fundus Scan Heatmap Visualization ── */}
          <div className="glass-strong rounded-2xl p-5 space-y-3.5 relative overflow-hidden" style={{ border: "1px solid rgba(0, 212, 255, 0.2)" }}>
            <h3 className="font-display text-xs font-bold uppercase tracking-widest text-right" style={{ color: "var(--cyan)" }}>
              👁️ خريطة التحليل الحراري المتقدم للشبكية
            </h3>
            <RetinalFundusHeatmap
              previewUrl={previewUrl}
              heatmapCoordinates={result.heatmapCoordinates}
              showDetails={true}
              heatmapBase64={result.heatmapBase64}
              imageBase64={result.imageBase64}
            />
          </div>

          {/* ── 3D Eyeball Pathology Model ── */}
          <div className="glass-strong rounded-2xl p-5 space-y-3.5 relative overflow-hidden" style={{ border: "1px solid rgba(124, 58, 237, 0.2)" }}>
            <div className="flex justify-between items-center flex-row-reverse border-b border-white/5 pb-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-widest text-right" style={{ color: "var(--violet)" }}>
                🔮 نموذج العين ثلاثي الأبعاد والتفاعلي (Interactive 3D Eyeball Model)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Stage {result.severity ? severityToStage(result.severity) : 0} visualization</span>
            </div>
            <div className="relative" style={{ height: "240px" }}>
              <Eye3D severity={result.severity} />
            </div>
            <p className="text-[10.5px] text-slate-400 text-center leading-relaxed">
              نموذج تفاعلي يعرض سرعة دوران متزايدة ووهجاً تحذيرياً بناءً على شدة الإصابة. مرر لتدوير العين، وانقر فوق أزرار التشريح بالأسفل لتركيز العرض.
            </p>
          </div>

          {/* ── Patient Vision Simulator ── */}
          <div className="glass-strong rounded-2xl p-5 space-y-4 relative overflow-hidden" style={{ border: "1px solid rgba(0, 212, 255, 0.2)" }}>
            <h3 className="font-display text-xs font-bold uppercase tracking-widest text-right border-b border-white/5 pb-2.5" style={{ color: "var(--cyan)" }}>
              👁️ محاكي رؤية المريض التفاعلي (Patient Vision Simulator)
            </h3>
            <VisionSimulator severity={result.severity} />
          </div>

          {/* ── Diagnosis Header ── */}
          <div className="glass-strong rounded-2xl p-6 space-y-5" style={{ borderColor: cfg.border }}>
            {/* Top row: badge + scan ID */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <motion.span
                className="badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 280 }}
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  color: cfg.color,
                  boxShadow: cfg.glow,
                }}
              >
                <span style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: cfg.color, display: "inline-block",
                  boxShadow: `0 0 6px ${cfg.color}`,
                }} />
                {cfg.label}
              </motion.span>

              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                  #{result.scanId}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {(result.processingTimeMs / 1000).toFixed(1)}s processing
                </span>
              </div>
            </div>

            {/* Diagnosis name */}
            <div>
              <motion.h2
                className="font-display font-bold"
                style={{ fontSize: "1.5rem", color: cfg.color, letterSpacing: "-0.01em", lineHeight: 1.2 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {result.diagnosis}
              </motion.h2>
              <motion.p
                className="text-sm mt-2 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ color: "var(--text-secondary)" }}
              >
                {result.stage}
              </motion.p>
            </div>

            {/* Confidence meter */}
            <div className="flex justify-center pt-1">
              <ConfidenceMeter value={result.confidence} />
            </div>
          </div>

          {/* ── Patient Access & QR Code Card (World-Class UI) ── */}
          {result.patientName && (
            <div className="glass-strong rounded-2xl p-5 space-y-4 relative overflow-hidden" style={{ border: "1px solid rgba(0, 212, 255, 0.25)" }}>
              {/* Glowing decorative backdrop */}
              <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full pointer-events-none" style={{
                background: "radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)",
                filter: "blur(20px)"
              }} />
              
              <h3 className="font-display text-xs font-bold uppercase tracking-widest text-right" style={{ color: "var(--cyan)" }}>
                بطاقة وصول المريض (Patient Access Card)
              </h3>

              <div className="flex flex-col md:flex-row gap-5 items-center justify-between font-display">
                {/* QR Code Container */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className="relative p-2 bg-white rounded-2xl" style={{ boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)" }}>
                    {qrUrl ? (
                      <img 
                        src={qrUrl} 
                        alt="Scan Patient Report QR Code" 
                        width="130" 
                        height="130"
                        className="rounded-xl block transition-all duration-300"
                      />
                    ) : (
                      <div className="w-[130px] h-[130px] bg-slate-900/60 rounded-xl flex items-center justify-center border border-white/5">
                        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {/* Tiny scan grid overlay */}
                    <div className="absolute inset-2 pointer-events-none border border-cyan-500/10 rounded-xl" />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    مسح الرمز لفتح التقرير الطبي 📱
                  </span>
                </div>

                {/* Patient Access Details */}
                <div className="flex-1 w-full space-y-3.5 text-right">
                  {/* Name field */}
                  <div>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>اسم المريض</span>
                    <p className="text-base font-bold text-white leading-tight font-display">{result.patientName}</p>
                  </div>

                  {/* ID field */}
                  <div className="flex justify-between items-center flex-row-reverse">
                    <div>
                      <span className="text-[11px] block" style={{ color: "var(--text-muted)" }}>رقم الملف (Scan ID)</span>
                      <span className="text-xs font-mono font-bold text-white">{result.scanId}</span>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={`/scans/${result.scanId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all duration-200 flex items-center gap-1 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      >
                        👁️ عرض التقرير
                      </a>
                      <button 
                        onClick={handleCopyLink}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all duration-200"
                        style={{ 
                          borderColor: copiedLink ? "var(--success)" : "rgba(255,255,255,0.08)", 
                          background: copiedLink ? "rgba(0,201,167,0.08)" : "rgba(255,255,255,0.02)",
                          color: copiedLink ? "var(--success)" : "var(--text-secondary)"
                        }}
                      >
                        {copiedLink ? "✓ تم" : "🔗 الرابط"}
                      </button>
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="p-3.5 rounded-xl border relative overflow-hidden flex items-center justify-between flex-row-reverse" style={{ 
                    background: "rgba(0,212,255,0.02)", 
                    borderColor: "rgba(0,212,255,0.18)" 
                  }}>
                    <div className="text-right">
                      <span className="text-[10px] block" style={{ color: "var(--cyan)" }}>كلمة المرور الفريدة (Passcode)</span>
                      <span className="text-lg font-mono font-bold text-white tracking-widest">{result.patientPassword}</span>
                    </div>
                    <button
                      onClick={handleCopyPassword}
                      className="btn-primary"
                      style={{ 
                        padding: "8px 14px", 
                        fontSize: "0.75rem", 
                        borderRadius: "8px",
                        background: copied ? "linear-gradient(135deg, var(--success) 0%, #009e82 100%)" : undefined,
                        boxShadow: copied ? "0 4px 12px rgba(0, 201, 167, 0.3)" : "0 4px 12px rgba(0, 212, 255, 0.2)"
                      }}
                    >
                      {copied ? "✓ تم" : "📋 نسخ"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Affected Zones ── */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}>
                Affected Zones
              </h3>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {result.affectedZones.length} regions
              </span>
            </div>
            <div className="space-y-3.5">
              {result.affectedZones.map((zone, i) => (
                <ZoneBar key={zone.name} zone={zone} delay={0.55 + i * 0.1} />
              ))}
            </div>
          </div>

          {/* ── Recommendations ── */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}>
              Medical Recommendations
            </h3>
            <ul className="space-y-2.5">
              {result.recommendations.map((rec, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-3 text-sm"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                >
                  <span
                    className="mt-1.5 flex-shrink-0 rounded-full"
                    style={{
                      width: "6px", height: "6px",
                      background: "var(--cyan)", boxShadow: "0 0 6px var(--cyan)",
                    }}
                  />
                  <span style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{rec}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* ── Model Info ── */}
          <div className="glass rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "0.85rem" }}>🤖</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Model</span>
            </div>
            <span className="font-mono font-semibold text-xs" style={{ color: "var(--cyan)" }}>
              {result.modelVersion}
            </span>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3">
            <PdfReportBtn result={result} previewUrl={previewUrl} />
            <button
              className="btn-ghost"
              style={{ fontSize: "0.875rem", padding: "12px 20px" }}
              id="new-scan-btn"
              onClick={() => window.location.reload()}
            >
              New Scan
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
