"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AnalysisResult, DiagnosisSeverity } from "@/lib/types";
import { SEVERITY_CONFIG } from "@/lib/constants";
import RetinalFundusHeatmap from "@/components/results/RetinalFundusHeatmap";
import dynamic from "next/dynamic";

const Eye3D = dynamic(() => import("@/components/ui/Eye3D"), {
  ssr: false,
});

// ── SVG Lock Icon ───────────────────────────────────────────
const ShieldLockIcon = ({ shake }: { shake: boolean }) => (
  <motion.div
    animate={shake ? { x: [-10, 10, -10, 10, -6, 6, -3, 3, 0] } : { y: [0, -6, 0] }}
    transition={shake ? { duration: 0.5 } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
    className="relative"
  >
    <svg width="84" height="84" viewBox="0 0 84 84" fill="none" className="block mx-auto">
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="84" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="lockRedGrad" x1="0" y1="0" x2="84" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF4757" />
          <stop offset="1" stopColor="#FF0040" />
        </linearGradient>
      </defs>
      {/* Outer shield glow */}
      <circle cx="42" cy="42" r="38" stroke={`url(${shake ? "#lockRedGrad" : "#shieldGrad"})`} strokeWidth="1" strokeDasharray="3 4" opacity="0.3" />
      {/* Main Shield */}
      <path d="M42 12C50 12 56 16 60 22C60 36 54 48 42 58C30 48 24 36 24 22C28 16 34 12 42 12Z" fill="rgba(2,8,23,0.7)" stroke={`url(${shake ? "#lockRedGrad" : "#shieldGrad"})`} strokeWidth="2" />
      {/* Lock Shackle */}
      <path d="M36 36V30C36 26.68 38.68 24 42 24C45.32 24 48 26.68 48 30V36" stroke={shake ? "#FF4757" : "#00D4FF"} strokeWidth="2" strokeLinecap="round" />
      {/* Lock Body */}
      <rect x="32" y="35" width="20" height="14" rx="3" fill={shake ? "#FF4757" : "var(--cyan)"} />
      {/* Keyhole */}
      <circle cx="42" cy="41" r="2" fill="#020817" />
      <path d="M42 43V46" stroke="#020817" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </motion.div>
);

// ── Confidence Meter for Report ─────────────────────────────
function ReportConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 90 ? "#00C9A7" : pct >= 75 ? "#00D4FF" : "#FF8C42";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: "160px", height: "160px" }}>
        <svg width="160" height="160" className="absolute inset-0">
          <defs>
            <linearGradient id="reportMeterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={radius} stroke="rgba(255,255,255,0.04)" strokeWidth="9" fill="none" />
          <motion.circle
            cx="80" cy="80" r={radius}
            stroke="url(#reportMeterGrad)" strokeWidth="9" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-display font-bold text-white"
            style={{ fontSize: "2.5rem", lineHeight: 1 }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
          >
            {pct}%
          </motion.span>
          <span className="text-[10px] mt-1 text-slate-500 uppercase tracking-widest font-semibold">معدل الثقة</span>
        </div>
      </div>
    </div>
  );
}

// ── Unlocked Report View Component ───────────────────────────
function ReportDashboard({ scan }: { scan: AnalysisResult }) {
  const cfg = SEVERITY_CONFIG[scan.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG["Normal"];
  const formattedDate = scan.timestamp
    ? new Date(scan.timestamp).toLocaleString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "غير متوفر";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 max-w-4xl mx-auto w-full"
    >
      {/* 🏥 CLINICAL PRINT-ONLY HEADER */}
      <div className="hidden print:flex justify-between items-center border-b border-slate-300 pb-4 mb-6 text-slate-800 text-right font-display flex-row-reverse w-full">
        <div>
          <h2 className="font-bold text-base">مستشفى العيون التخصصي الرقمي</h2>
          <p className="text-[10px] text-slate-500">Digital Eye Hospital & Research Centre</p>
        </div>
        <div className="text-left font-mono">
          <span className="text-xs font-bold block">REPORT ID: #{scan.scanId}</span>
          <span className="text-[9px] text-slate-500">{formattedDate}</span>
        </div>
      </div>
      {/* 🧾 MEDICAL RECORD HEADER */}
      <div className="glass-strong rounded-3xl p-6 md:p-8 relative overflow-hidden border" style={{ borderColor: cfg.border }}>
        {/* Decorative ambient light */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle at 80% 20%, ${cfg.bg}, transparent 65%)`
        }} />

        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10 text-right">
          
          {/* Diagnostic Badge and details */}
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center justify-end gap-3 flex-wrap">
              <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400">
                #{scan.scanId}
              </span>
              <span className="badge" style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                color: cfg.color,
                boxShadow: cfg.glow,
                padding: "4px 12px",
                fontSize: "0.68rem"
              }}>
                {cfg.label}
              </span>
            </div>

            <h1 className="font-display font-bold text-white leading-tight" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
              تقرير التشخيص الطبي الرقمي
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
              <div>
                <span className="text-xs text-slate-500 block">اسم المريض</span>
                <span className="font-bold text-white font-display text-base">{scan.patientName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">تاريخ الفحص</span>
                <span className="text-slate-300 text-sm">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Hologram Circle */}
          <div className="flex-shrink-0 bg-white/5 p-4 rounded-3xl border border-white/10">
            <span className="text-4xl">👁️</span>
          </div>
        </div>
      </div>

      {/* 📊 MAIN DIAGNOSTIC VISUALIZATION GRID */}
      <div className="grid md:grid-cols-5 gap-6 items-stretch">
        
        {/* Left Column: Core Diagnosis & Affected Zones (3 cols) */}
        <div className="md:col-span-3 space-y-6 flex flex-col justify-between">
          
          {/* Diagnosis Card */}
          <div className="glass rounded-3xl p-6 text-center space-y-5 flex flex-col justify-center relative overflow-hidden">
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">التشخيص الطبي النهائي (Diagnosis)</span>
              <h2 className="font-display font-bold text-xl" style={{ color: cfg.color }}>
                {scan.diagnosis}
              </h2>
              <p className="text-sm font-semibold text-slate-400">
                {scan.stage}
              </p>
            </div>

            <div className="flex justify-center relative z-10">
              <ReportConfidenceMeter value={scan.confidence} />
            </div>
          </div>

          {/* Affected Zones Progress bars */}
          <div className="glass rounded-3xl p-6 space-y-4 text-right flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center flex-row-reverse border-b border-white/5 pb-2.5">
              <h3 className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: "var(--cyan)" }}>
                معدلات تضرر خلايا الشبكية المستهدفة
              </h3>
              <span className="text-xs text-slate-500">
                {(scan.affectedZones || []).length} مناطق مفحوصة
              </span>
            </div>

            <div className="space-y-3.5 pt-1">
              {(scan.affectedZones || []).map((zone, i) => {
                const zoneCfg = SEVERITY_CONFIG[zone.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG["Normal"];
                return (
                  <div key={zone.name} className="space-y-1.5">
                    <div className="flex justify-between items-center flex-row-reverse text-xs">
                      <span className="font-semibold text-slate-300">{zone.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="badge" style={{
                          background: zoneCfg.bg,
                          border: `1px solid ${zoneCfg.border}`,
                          color: zoneCfg.color,
                          padding: "1px 6px",
                          fontSize: "0.58rem"
                        }}>
                          {zoneCfg.label}
                        </span>
                        <span className="font-mono font-bold" style={{ color: zoneCfg.color }}>
                          {zone.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${zone.percentage}%` }}
                        transition={{ duration: 1.4, delay: i * 0.1 }}
                        style={{
                          background: `linear-gradient(90deg, ${zoneCfg.color}, ${zoneCfg.color}bb)`,
                          boxShadow: `0 0 8px ${zoneCfg.color}44`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Dynamic Retinal Fundus & Heatmap Canvas (2 cols) */}
        <div className="md:col-span-2 flex flex-col">
          <div className="glass rounded-3xl p-5 text-right flex flex-col justify-between h-full border relative overflow-hidden" style={{ borderColor: cfg.border }}>
            {/* Ambient background glow matching severity */}
            <div className="absolute -left-12 -top-12 w-28 h-28 rounded-full pointer-events-none" style={{
              background: `radial-gradient(circle, ${cfg.bg} 0%, transparent 70%)`,
              filter: "blur(20px)"
            }} />

            <h3 className="font-display text-xs font-bold uppercase tracking-widest border-b border-white/5 pb-2.5 mb-3 relative z-10" style={{ color: "var(--cyan)" }}>
              خريطة اعتلال الشبكية الرقمية (Heatmap Visualizer)
            </h3>
            
            <div className="flex-1 flex items-center justify-center relative z-10">
              <RetinalFundusHeatmap
                heatmapCoordinates={scan.heatmapCoordinates}
                heatmapBase64={scan.heatmapBase64}
                imageBase64={scan.imageBase64}
                showDetails={true}
              />
            </div>
          </div>
        </div>

      </div>

      {/* 🔮 3D EYE MODEL VIEWER */}
      <div className="glass rounded-3xl p-6 text-right space-y-4 relative overflow-hidden">
        <h3 className="font-display text-xs font-bold uppercase tracking-widest border-b border-white/5 pb-3" style={{ color: "var(--cyan)" }}>
          نموذج العين ثلاثي الأبعاد التفاعلي (3D Eye Model)
        </h3>
        <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40" style={{ height: "320px" }}>
          <Eye3D severity={scan.severity} interactive={true} />
        </div>
        <p className="text-[10px] text-slate-500 text-center">
          اسحب النموذج للتدوير · استخدم الأزرار أدناه لعرض طبقات العين المختلفة
        </p>
      </div>

      {/* 📋 MEDICAL RECOMMENDATIONS */}
      <div className="glass rounded-3xl p-6 text-right space-y-4">
        <h3 className="font-display text-xs font-bold uppercase tracking-widest border-b border-white/5 pb-3" style={{ color: "var(--cyan)" }}>
          التوصيات والخطوات العلاجية الموصى بها
        </h3>
        <ul className="space-y-3">
          {(scan.recommendations || []).map((rec, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-start justify-end gap-3 text-sm text-slate-300 text-right flex-row-reverse"
            >
              {/* Bullet Dot */}
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-cyan-400 shadow-[0_0_6px_var(--cyan)]" />
              <span className="leading-relaxed flex-1">{rec}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* ✍️ DIGITAL SIGNATURE & STAMP (Visible on print only) */}
      <div className="hidden print:block border-t border-slate-300 pt-6 mt-8">
        <div className="flex justify-between items-center flex-row-reverse text-xs text-slate-700">
          <div className="text-right space-y-1">
            <span className="font-bold block">توقيع الطبيب المعالج:</span>
            <div className="h-10" />
            <span className="text-slate-400">________________________</span>
          </div>
          <div className="text-left space-y-1">
            <span className="font-bold block">ختم المستشفى / المركز:</span>
            <div className="w-20 h-20 border border-slate-300 border-dashed rounded-lg flex items-center justify-center text-slate-300 font-bold text-[10px]">
              ختم رسمي
            </div>
          </div>
        </div>
      </div>

      {/* 📑 REPORT FOOTER & PRINT */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center pt-4 border-t border-white/5">
        <p className="text-[10px] text-slate-500 text-center sm:text-left">
          مستند تشخيص ذكاء اصطناعي مساعد طبي غير قابل للتعديل · RetinaScan AI 2026
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="btn-primary font-bold text-xs"
            style={{ padding: "12px 28px", borderRadius: "10px" }}
          >
            🖨️ طباعة أو حفظ التقرير PDF
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page Dynamic Component ─────────────────────────────
export default function ScanReportPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params?.scanId as string;

  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wrongPasswordError, setWrongPasswordError] = useState(false);
  const [scanData, setScanData] = useState<AnalysisResult | null>(null);
  const [checkingPassword, setCheckingPassword] = useState(false);

  // Initial load to see if scanId exists and check lock status
  useEffect(() => {
    if (!scanId) return;

    const loadScanStatus = async () => {
      setLoading(true);
      try {
        // Automatically check if password is in the query params to bypass lock screen
        const urlParams = new URLSearchParams(window.location.search);
        const pwd = urlParams.get("pwd");
        
        let fetchUrl = `/api/scans/${scanId}`;
        if (pwd) {
          fetchUrl += `?password=${pwd}`;
        }

        const res = await fetch(fetchUrl);
        const data = await res.json();
        
        if (!data.success) {
          setError(data.error || "الملف الطبي غير موجود");
        } else {
          // File found! 
          setScanData(data.scan); // Stores the restricted preview data
          if (data.scan && !data.scan.isLocked) {
            setUnlocked(true);
          }
        }
      } catch (err) {
        console.error("Error loading scan:", err);
        setError("حدث خطأ أثناء الاتصال بالخادم طبي");
      } finally {
        setLoading(false);
      }
    };

    loadScanStatus();
  }, [scanId]);

  // Handle password unlocking
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || checkingPassword) return;

    setCheckingPassword(true);
    setWrongPasswordError(false);

    try {
      const res = await fetch(`/api/scans/${scanId}?password=${password.trim()}`);
      const data = await res.json();

      if (data.success && data.scan) {
        // Unlocked!
        setScanData(data.scan);
        setUnlocked(true);
      } else {
        // Wrong password
        setWrongPasswordError(true);
        // Clear passcode field
        setPassword("");
        // Vibration (if mobile)
        if (typeof window !== "undefined" && navigator.vibrate) {
          navigator.vibrate(100);
        }
      }
    } catch (err) {
      console.error("Unlock connection error:", err);
      alert("فشل الاتصال بالخادم للتحقق من كلمة المرور");
    } finally {
      setCheckingPassword(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between">
      <div className="gradient-mesh" />
      <div className="neural-grid" />

      {/* Main Body */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          
          {/* ⏳ 1. LOADING STATE */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4"
            >
              <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-400">جاري فك تشفير الملف الطبي الآمن...</p>
            </motion.div>
          )}

          {/* ❌ 2. ERROR STATE (E.g. Not Found) */}
          {!loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-3xl p-8 max-w-md w-full text-center space-y-6"
            >
              <span className="text-5xl">⚠️</span>
              <div className="space-y-2">
                <h2 className="font-display font-bold text-white text-lg">لم يتم العثور على التقرير</h2>
                <p className="text-sm text-slate-400">{error}</p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="btn-primary w-full text-xs font-bold py-3"
              >
                🏠 العودة للصفحة الرئيسية
              </button>
            </motion.div>
          )}

          {/* 🔒 3. LOCKED LOCK SCREEN STATE */}
          {!loading && !error && !unlocked && (
            <motion.div
              key="locked"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="glass-strong rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-7 relative overflow-hidden border border-white/10"
            >
              {/* Shield Lock Logo */}
              <ShieldLockIcon shake={wrongPasswordError} />

              <div className="space-y-2">
                <h2 className="font-display font-bold text-white text-lg md:text-xl">
                  ملف مريض مشفر وآمن
                </h2>
                <p className="text-xs leading-relaxed text-slate-400" style={{ maxWidth: "300px", margin: "0 auto" }}>
                  الرجاء إدخال كلمة المرور المكونة من 6 أرقام التي زودك بها الطبيب لفتح تقرير فحص الشبكية والتشخيص.
                </p>
              </div>

              {/* Form lock */}
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={6}
                    value={password}
                    onChange={(e) => {
                      // Allow only digits
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setPassword(val);
                      if (wrongPasswordError) setWrongPasswordError(false);
                    }}
                    placeholder="• • • • • •"
                    className="w-full text-center text-xl font-mono tracking-[0.6em] rounded-2xl px-4 py-4 text-white border transition-all duration-300 outline-none bg-slate-950/60"
                    style={{
                      borderColor: wrongPasswordError ? "var(--danger)" : "rgba(255,255,255,0.08)",
                      boxShadow: wrongPasswordError ? "0 0 16px rgba(255,71,87,0.25)" : "none",
                    }}
                  />
                  {wrongPasswordError && (
                    <p className="text-xs text-red-400 mt-2 font-medium">
                      رمز فك التشفير خاطئ. الرجاء المحاولة مرة أخرى.
                    </p>
                  )}
                </div>

                {/* Virtual Glowing Keypad */}
                <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto mt-4 pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        if (password.length < 6) {
                          setPassword(prev => prev + num);
                          if (wrongPasswordError) setWrongPasswordError(false);
                        }
                      }}
                      className="py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-white hover:bg-cyan-500/10 hover:border-cyan-500/30 active:scale-95 transition text-sm font-bold font-mono"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPassword("");
                      if (wrongPasswordError) setWrongPasswordError(false);
                    }}
                    className="py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-red-400 hover:bg-red-500/10 hover:border-red-500/30 active:scale-95 transition text-[10px] font-bold"
                  >
                    مسح
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (password.length < 6) {
                        setPassword(prev => prev + "0");
                        if (wrongPasswordError) setWrongPasswordError(false);
                      }
                    }}
                    className="py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-white hover:bg-cyan-500/10 hover:border-cyan-500/30 active:scale-95 transition text-sm font-bold font-mono"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPassword(prev => prev.slice(0, -1));
                      if (wrongPasswordError) setWrongPasswordError(false);
                    }}
                    className="py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/10 active:scale-95 transition text-[10px] font-bold"
                  >
                    حذف
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={password.length < 6 || checkingPassword}
                  className="btn-primary w-full py-3.5 text-xs font-bold tracking-wide rounded-2xl transition disabled:opacity-30 disabled:pointer-events-none mt-2"
                  style={{
                    background: checkingPassword ? "var(--bg-deep)" : undefined,
                  }}
                >
                  {checkingPassword ? "جاري التحقق..." : "🔓 فك تشفير التقرير"}
                </button>
              </form>

              {/* File summary locked preview */}
              <div className="border-t border-white/5 pt-4 text-right flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono">#{scanId}</span>
                <span>المستند مشفر طبياً بدقة AES-256</span>
              </div>
            </motion.div>
          )}

          {/* 🔓 4. UNLOCKED REPORT VIEW */}
          {!loading && !error && unlocked && scanData && (
            <ReportDashboard scan={scanData} key="report" />
          )}

        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full text-center py-6 border-t border-white/5 text-[10px] text-slate-600 bg-slate-950/20 backdrop-blur-sm">
        نظام تشفير السجلات الطبية الآمن · جميع الحقوق محفوظة لـ RetinaScan AI © 2026
      </div>
    </div>
  );
}
