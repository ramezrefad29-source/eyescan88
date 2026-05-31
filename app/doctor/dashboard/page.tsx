"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { AnalysisResult } from "@/lib/types";
import { SEVERITY_CONFIG } from "@/lib/constants";
import RetinalFundusHeatmap from "@/components/results/RetinalFundusHeatmap";
import dynamic from "next/dynamic";

const Eye3D = dynamic(() => import("@/components/ui/Eye3D"), {
  ssr: false,
});

interface ScanRecord extends AnalysisResult {
  doctorNotes?: string;
  doctorSignedOff?: boolean;
  doctorSignedBy?: string;
  doctorSignedAt?: string;
}

// ── Severity Badge ────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG["Normal"];
  return (
    <span
      className="badge text-xs font-bold"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        padding: "4px 12px",
      }}
    >
      <span
        style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: cfg.color, display: "inline-block",
          boxShadow: `0 0 6px ${cfg.color}`,
        }}
        className="ml-1.5"
      />
      {cfg.label}
    </span>
  );
}

// ── Stat Card ────────────────────────────────────────────
function StatCard({ icon, value, label, color, percentage }: { icon: string; value: string | number; label: string; color: string; percentage?: number }) {
  return (
    <div className="glass-strong rounded-2xl p-6 border border-white/5 relative overflow-hidden flex items-center justify-between flex-row-reverse text-right card-lift">
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/10" />
      
      {/* Icon or Progress ring - Enlarged for mobile */}
      {percentage !== undefined ? (
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.03)" strokeWidth="4.5" fill="transparent" />
            <circle cx="32" cy="32" r="26" stroke={color} strokeWidth="4.5" fill="transparent"
              strokeDasharray={2 * Math.PI * 26}
              strokeDashoffset={2 * Math.PI * 26 * (1 - percentage / 100)}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono text-white">
            {percentage}%
          </div>
        </div>
      ) : (
        <span className="text-4xl p-3.5 rounded-xl bg-white/5 flex-shrink-0" style={{ boxShadow: `0 0 15px ${color}15` }}>{icon}</span>
      )}

      <div className="space-y-1.5 text-right">
        <div className="text-xs sm:text-sm text-slate-400 font-medium">{label}</div>
        <div className="font-display font-bold text-2xl sm:text-3xl font-mono" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}

export default function DoctorDashboardPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  // Fetch scans from API
  const fetchScans = useCallback(async () => {
    try {
      const res = await fetch("/api/scans?page=1");
      const data = await res.json();
      if (data.success) {
        setScans(data.scans || []);
      }
    } catch (err) {
      console.error("Failed to fetch scans:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedScan(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Open detail modal
  const openScan = (scan: ScanRecord) => {
    setSelectedScan(scan);
    setNotes(scan.doctorNotes || "");
    setDoctorName(scan.doctorSignedBy || "");
  };

  // Save doctor notes
  const handleSaveNotes = async () => {
    if (!selectedScan) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/scans/${selectedScan.scanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorNotes: notes,
          doctorSignedBy: doctorName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScans((prev) =>
          prev.map((s) => (s.scanId === selectedScan.scanId ? data.scan : s))
        );
        setSelectedScan(data.scan);
      }
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setSaving(false);
    }
  };

  // Delete scan
  const handleDelete = async (scanId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفحص نهائياً من قاعدة البيانات؟")) return;
    try {
      await fetch(`/api/scans/${scanId}`, { method: "DELETE" });
      setScans((prev) => prev.filter((s) => s.scanId !== scanId));
      if (selectedScan?.scanId === scanId) setSelectedScan(null);
    } catch (err) {
      console.error("Failed to delete scan:", err);
    }
  };

  // Filtered scans
  const filteredScans = scans.filter((scan) => {
    const matchesSearch =
      !searchQuery ||
      (scan.patientName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.scanId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = filterSeverity === "all" || scan.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  // ── Stats calculation ─────────────────────────────────────
  const totalScans = scans.length;
  const signedOff = scans.filter((s) => s.doctorSignedOff).length;
  const criticalCount = scans.filter((s) => s.severity === "Severe" || s.severity === "Critical").length;
  const avgConfidence = totalScans > 0 ? Math.round((scans.reduce((a, s) => a + s.confidence, 0) / totalScans) * 100) : 0;
  const signedPercentage = totalScans > 0 ? Math.round((signedOff / totalScans) * 100) : 0;

  // Severity counts
  const severityCounts = {
    Normal: scans.filter((s) => s.severity === "Normal").length,
    Mild: scans.filter((s) => s.severity === "Mild").length,
    Moderate: scans.filter((s) => s.severity === "Moderate").length,
    Severe: scans.filter((s) => s.severity === "Severe").length,
    Critical: scans.filter((s) => s.severity === "Critical").length,
  };

  // Activity over last 7 days
  const getActivityData = () => {
    const data: { label: string; count: number; dateStr: string }[] = [];
    const dateMap: Record<string, number> = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString("ar-EG", { weekday: "short", day: "numeric" });
      dateMap[dateStr] = 0;
      data.push({ label, count: 0, dateStr });
    }

    // Populate with real database records
    scans.forEach((scan) => {
      if (scan.timestamp) {
        const dateStr = scan.timestamp.split("T")[0];
        if (dateMap[dateStr] !== undefined) {
          dateMap[dateStr]++;
        }
      }
    });

    return data.map((item) => ({
      ...item,
      count: dateMap[item.dateStr] || 0,
    }));
  };

  const activityData = getActivityData();
  const maxActivityCount = Math.max(...activityData.map((d) => d.count), 5);

  return (
    <div 
      className="min-h-screen relative overflow-y-auto"
      style={{ 
        WebkitOverflowScrolling: "touch",
        scrollBehavior: "smooth"
      }}
    >
      {/* Hardware-accelerated pointer-events-none backgrounds */}
      <div 
        className="gradient-mesh" 
        style={{ pointerEvents: "none", willChange: "transform", transform: "translateZ(0)" }} 
      />
      <div 
        className="neural-grid" 
        style={{ pointerEvents: "none", willChange: "transform", transform: "translateZ(0)" }} 
      />

      <div className="relative z-10">
        <Navbar />

        {/* ── Header ── */}
        <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: "40px", paddingBottom: "25px" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mt-3 flex-wrap gap-5">
              <div className="text-right w-full md:w-auto">
                <h1
                  className="font-display font-bold text-white flex items-center gap-3 justify-end text-xl sm:text-2xl md:text-3xl"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  <span>🩺 لوحة تحكم الطبيب التحليلية (Analytics Portal)</span>
                </h1>
                <p className="text-sm sm:text-base mt-1.5" style={{ color: "var(--text-muted)" }}>
                  مراقبة إحصائيات الحالات، مراجعة التحليلات المتقدمة والتقارير الطبية للمرضى
                </p>
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
                <Link
                  href="/dashboard"
                  className="px-5 py-3 text-xs sm:text-sm font-bold rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition duration-200 shadow-[0_0_15px_rgba(0,212,255,0.1)]"
                >
                  🔬 فحص جديد
                </Link>
                <Link
                  href="/history"
                  className="px-5 py-3 text-xs sm:text-sm font-bold rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 transition duration-200"
                >
                  📜 السجل المحلي
                </Link>
                <Link
                  href="/clinics"
                  className="px-5 py-3 text-xs sm:text-sm font-bold rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition duration-200"
                >
                  🏥 أقرب عيادة
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Stats Summary Grid ── */}
        <div className="max-w-7xl mx-auto px-6 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📊" value={totalScans} label="إجمالي الفحوصات" color="var(--cyan)" />
            <StatCard icon="✅" value={`${signedOff} / ${totalScans}`} label="معدل التوقيع والاعتماد" color="#00C9A7" percentage={signedPercentage} />
            <StatCard icon="⚠️" value={criticalCount} label="حالات حرجة بحاجة لمتابعة" color="#FF6B6B" />
            <StatCard icon="🎯" value={`${avgConfidence}%`} label="متوسط دقة الثقة للنموذج" color="var(--violet)" />
          </div>
        </div>

        {/* ── World-Class Visual Analytics Charts Hub ── */}
        <div className="max-w-7xl mx-auto px-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Donut Chart for Case Severity */}
            <div className="glass-strong rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center flex-row-reverse border-b border-white/5 pb-3">
                <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-wide">
                  📊 توزيع شدة الحالات (Case Severity Distribution)
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Real-Time</span>
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-4">
                <div className="relative flex-shrink-0" style={{ width: "180px", height: "180px" }}>
                  <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
                    <circle cx="90" cy="90" r="65" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                    {(() => {
                      const total = Object.values(severityCounts).reduce((a, b) => a + b, 0) || 1;
                      let accumulatedPercent = 0;
                      const circumference = 2 * Math.PI * 65;

                      const data = [
                        { key: "Normal", value: severityCounts.Normal, color: "#00C9A7" },
                        { key: "Mild", value: severityCounts.Mild, color: "#00D4FF" },
                        { key: "Moderate", value: severityCounts.Moderate, color: "#FFB03A" },
                        { key: "Severe", value: severityCounts.Severe, color: "#FF6B6B" },
                        { key: "Critical", value: severityCounts.Critical, color: "#FF3366" },
                      ];

                      return data.map((item) => {
                        const percent = item.value / total;
                        if (percent === 0) return null;
                        const strokeDasharray = `${percent * circumference} ${circumference}`;
                        const strokeDashoffset = -accumulatedPercent * circumference;
                        accumulatedPercent += percent;

                        return (
                          <motion.circle
                            key={item.key}
                            cx="90"
                            cy="90"
                            r="65"
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            style={{
                              filter: `drop-shadow(0 0 6px ${item.color}44)`,
                              transformOrigin: "center",
                            }}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center font-display">
                    <span className="text-3xl font-bold text-white font-mono">{totalScans}</span>
                    <span className="text-[10px] text-slate-400">إجمالي الحالات</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-right w-full md:w-auto">
                  {[
                    { label: "Normal (طبيعي)", value: severityCounts.Normal, color: "#00C9A7" },
                    { label: "Mild (خفيف)", value: severityCounts.Mild, color: "#00D4FF" },
                    { label: "Moderate (متوسط)", value: severityCounts.Moderate, color: "#FFB03A" },
                    { label: "Severe (شديد)", value: severityCounts.Severe, color: "#FF6B6B" },
                    { label: "Critical (حرج)", value: severityCounts.Critical, color: "#FF3366" },
                  ].map((item) => {
                    const pct = totalScans > 0 ? Math.round((item.value / totalScans) * 100) : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3 justify-end">
                        <span className="text-xs sm:text-sm text-slate-300 font-medium">
                          {item.label}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-[70px] justify-end text-xs sm:text-sm">
                          <span className="font-bold text-white font-mono">{item.value}</span>
                          <span className="text-[10px] sm:text-xs text-slate-400 font-mono">({pct}%)</span>
                        </div>
                        <span className="w-3 h-3 rounded-full" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chart 2: Weekly Activity Timeline */}
            <div className="glass-strong rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center flex-row-reverse border-b border-white/5 pb-3">
                <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-wide">
                  📈 معدل تشخيص الفحوصات اليومي (Daily Diagnostics Activity)
                </h3>
                <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">7 Days</span>
              </div>

              <div className="pt-4 space-y-4 text-right">
                <div className="h-44 flex items-end gap-3 justify-between border-b border-white/5 pb-2">
                  {activityData.map((d, idx) => {
                    const pct = (d.count / maxActivityCount) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group/bar">
                        <span className="text-[11px] font-mono font-bold text-cyan-400 opacity-0 group-hover/bar:opacity-100 transition duration-200">
                          {d.count}
                        </span>
                        <div className="w-full relative rounded-t-lg overflow-hidden bg-white/5" style={{ height: "120px" }}>
                          <motion.div
                            className="absolute bottom-0 left-0 right-0 rounded-t-lg bg-gradient-to-t"
                            initial={{ height: 0 }}
                            animate={{ height: `${pct}%` }}
                            transition={{ duration: 1.2, delay: idx * 0.04, ease: "easeOut" }}
                            style={{
                              backgroundImage: "linear-gradient(to top, var(--violet), var(--cyan))",
                              boxShadow: "0 0 12px rgba(0, 212, 255, 0.2)",
                            }}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs text-slate-400 font-medium text-center truncate w-full">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Search & Filter ── */}
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="🔍 بحث بالاسم أو رقم الملف أو التشخيص..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl text-sm sm:text-base text-white placeholder-slate-500 font-display transition duration-200"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--glass-border)",
                  outline: "none",
                }}
              />
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-4 rounded-2xl text-sm sm:text-base font-display cursor-pointer transition duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
                outline: "none",
                minWidth: "180px",
              }}
            >
              <option value="all">جميع الحالات</option>
              <option value="Normal">Normal</option>
              <option value="Mild">Mild</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {/* ── Scans Table ── */}
        <div className="max-w-7xl mx-auto px-6" style={{ paddingBottom: "60px" }}>
          {loading ? (
            <div className="glass-strong rounded-3xl py-24 text-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                style={{ fontSize: "2.5rem", display: "inline-block" }}
              >
                ⏳
              </motion.div>
              <p className="text-sm sm:text-base text-slate-400">جاري تحميل بيانات المرضى من قاعدة البيانات...</p>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="glass-strong rounded-3xl py-24 text-center space-y-4 border border-white/5">
              <span className="text-4xl block">📋</span>
              <h3 className="font-display font-semibold text-white text-lg">لا توجد فحوصات مطابقة</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed px-4">
                {totalScans === 0
                  ? "لم يتم تسجيل أي فحص في قاعدة البيانات. اذهب لصفحة الفحص وقم بتحليل أول صورة للبدء."
                  : "جرب تعديل معايير البحث أو التصفية."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredScans.map((scan, i) => {
                const cfg = SEVERITY_CONFIG[scan.severity] || SEVERITY_CONFIG["Normal"];
                const date = scan.timestamp
                  ? new Date(scan.timestamp).toLocaleString("ar-EG", {
                      year: "numeric", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })
                  : "—";

                return (
                  <motion.div
                    key={scan.scanId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center gap-5 card-lift cursor-pointer group border transition duration-200"
                    style={{ borderColor: scan.doctorSignedOff ? "rgba(0,201,167,0.25)" : cfg.border }}
                    onClick={() => openScan(scan)}
                  >
                    {/* Patient info */}
                    <div className="flex-1 min-w-0 text-right w-full lg:w-auto">
                      <div className="flex items-center gap-2 flex-row-reverse mb-1.5 flex-wrap">
                        <span className="font-display font-bold text-white text-lg sm:text-xl truncate">
                          {scan.patientName || "—"}
                        </span>
                        <SeverityBadge severity={scan.severity} />
                        {scan.doctorSignedOff && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            ✓ موقّع
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-400 font-mono">#{scan.scanId}</div>
                    </div>

                    {/* Diagnosis */}
                    <div className="text-right flex-shrink-0 w-full lg:w-48">
                      <span className="text-xs sm:text-sm text-slate-500 block">التشخيص</span>
                      <span className="text-base font-bold" style={{ color: cfg.color }}>
                        {scan.diagnosis}
                      </span>
                    </div>

                    {/* Confidence */}
                    <div className="text-right lg:text-center flex-shrink-0 w-full lg:w-20">
                      <span className="text-xs sm:text-sm text-slate-500 block">الثقة</span>
                      <span className="text-base font-bold font-mono text-cyan-400">
                        {Math.round(scan.confidence * 100)}%
                      </span>
                    </div>

                    {/* Date */}
                    <div className="text-right flex-shrink-0 w-full lg:w-40">
                      <span className="text-xs sm:text-sm text-slate-500 block">التاريخ</span>
                      <span className="text-xs sm:text-sm text-slate-300">{date}</span>
                    </div>

                    {/* Actions - enlarged tap targets */}
                    <div className="flex gap-2.5 flex-shrink-0 w-full lg:w-auto justify-end pt-2 lg:pt-0">
                      <Link
                        href={`/scans/${scan.scanId}`}
                        target="_blank"
                        className="px-4 py-3 rounded-xl text-[11px] sm:text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        👁️ تقرير المريض
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); openScan(scan); }}
                        className="px-4 py-3 rounded-xl text-[11px] sm:text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition"
                      >
                        📝 مراجعة
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(scan.scanId); }}
                        className="px-4 py-3 rounded-xl text-[11px] sm:text-xs font-bold bg-red-500/5 text-red-400 border border-red-500/15 hover:bg-red-500/15 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Advanced Two-Column Review Modal ── */}
        <AnimatePresence>
          {selectedScan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md"
              onClick={() => setSelectedScan(null)}
            >
              {/* Fullscreen Backdrop Close Zone */}
              <div className="absolute inset-0 cursor-default" />

              <motion.div
                initial={{ scale: 0.94, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.94, y: 20 }}
                className="glass-strong rounded-3xl p-6 md:p-8 w-full max-w-4xl relative text-right overflow-y-auto border border-white/10 shadow-2xl flex flex-col gap-6"
                style={{ maxHeight: "90vh", background: "rgba(3, 13, 26, 0.94)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Floating Close Button */}
                <button
                  onClick={() => setSelectedScan(null)}
                  className="absolute left-6 top-6 w-9 h-9 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white flex items-center justify-center text-base transition duration-200 cursor-pointer shadow-lg hover:border-cyan-500/30 hover:shadow-[0_0_12px_rgba(0,212,255,0.2)]"
                  title="إغلاق التقرير (Escape)"
                >
                  ✕
                </button>

                {/* Modal Title */}
                <div className="border-b border-white/5 pb-4">
                  <h3 className="font-display font-bold text-xl sm:text-2xl text-white mb-0.5">
                    🔬 مراجعة الفحص وتوقيع التقرير الطبي
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-mono">File ID: #{selectedScan.scanId}</p>
                </div>

                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  
                  {/* Left Column: Visual Medical Scans */}
                  <div className="space-y-5">
                    {/* Retinal Heatmap */}
                    <div className="glass rounded-2xl p-4.5 border border-white/5 space-y-3">
                      <span className="text-xs font-bold text-cyan-400 block border-b border-white/5 pb-1.5">
                        👁️ خريطة التحليل الحراري الموجه (Grad-CAM Activation Map)
                      </span>
                      <RetinalFundusHeatmap
                        heatmapCoordinates={selectedScan.heatmapCoordinates}
                        heatmapBase64={selectedScan.heatmapBase64}
                        imageBase64={selectedScan.imageBase64}
                        showDetails={false}
                      />
                    </div>

                    {/* 3D Eyeball */}
                    <div className="glass rounded-2xl p-4.5 border border-white/5 space-y-3">
                      <span className="text-xs font-bold text-violet-400 block border-b border-white/5 pb-1.5">
                        🔮 المجسم التشريحي التفاعلي (Interactive 3D Eyeball Model)
                      </span>
                      <div className="relative rounded-xl overflow-hidden border border-white/5 bg-slate-950/40" style={{ height: "200px" }}>
                        <Eye3D severity={selectedScan.severity} interactive={true} />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Patient Information & Signature */}
                  <div className="space-y-5 text-right">
                    {/* Summary Info */}
                    <div className="glass rounded-2xl p-5 border border-white/5 space-y-4">
                      <span className="text-xs font-bold text-slate-400 block border-b border-white/5 pb-1.5">
                        📋 ملخص بيانات المريض والتشخيص الذكي
                      </span>

                      <div className="flex justify-between items-center flex-row-reverse">
                        <div>
                          <span className="text-[11px] text-slate-500 block font-medium">اسم المريض</span>
                          <span className="font-bold text-white text-lg sm:text-xl">{selectedScan.patientName}</span>
                        </div>
                        <SeverityBadge severity={selectedScan.severity} />
                      </div>

                      <div className="flex justify-between items-center flex-row-reverse">
                        <div>
                          <span className="text-[11px] text-slate-500 block font-medium">التشخيص المقترح</span>
                          <span className="text-base font-bold" style={{ color: SEVERITY_CONFIG[selectedScan.severity]?.color || "#fff" }}>
                            {selectedScan.diagnosis}
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-[11px] text-slate-500 block font-medium">ثقة التحليل</span>
                          <span className="text-base font-bold font-mono text-cyan-400">
                            {Math.round(selectedScan.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block font-medium">حالة اعتلال الشبكية</span>
                        <span className="text-xs sm:text-sm text-slate-200 leading-relaxed block mt-1">{selectedScan.stage}</span>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-400 block mb-2">التوصيات الطبية التلقائية</span>
                        <ul className="space-y-2">
                          {selectedScan.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 flex-row-reverse leading-normal">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--cyan)" }} />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Doctor Action Area */}
                    <div className="glass rounded-2xl p-5 border border-white/5 space-y-4">
                      <span className="text-xs font-bold text-cyan-400 block border-b border-white/5 pb-1.5">
                        ✍️ إفادة الملاحظات والاعتماد (Notes & Sign-off)
                      </span>

                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 block">الملاحظات والتشخيص الطبي للملف</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="اكتب التشخيص السريري الفعلي أو الملاحظات الطبية الإضافية هنا..."
                          rows={3}
                          className="w-full px-4 py-3.5 rounded-xl text-sm sm:text-base text-white placeholder-slate-600 font-display resize-none transition duration-200"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--glass-border)",
                            outline: "none",
                            direction: "rtl",
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-slate-400 block font-medium">توقيع اسم الطبيب المعالج</label>
                          <input
                            type="text"
                            value={doctorName}
                            onChange={(e) => setDoctorName(e.target.value)}
                            placeholder="د. أحمد محمد"
                            className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-slate-600 font-display transition duration-200"
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid var(--glass-border)",
                              outline: "none",
                              direction: "rtl",
                            }}
                          />
                        </div>
                        
                        <div className="flex items-end">
                          <button
                            onClick={handleSaveNotes}
                            disabled={saving}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                            style={{ padding: "12px 20px", fontSize: "0.9rem", opacity: saving ? 0.6 : 1 }}
                          >
                            {saving ? "⏳ جاري الحفظ..." : doctorName.trim() ? "✅ توقيع واعتماد" : "💾 حفظ التشخيص"}
                          </button>
                        </div>
                      </div>

                      {selectedScan.doctorSignedOff && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs sm:text-sm text-emerald-400 flex items-start gap-2.5 flex-row-reverse leading-normal">
                          <span>✅</span>
                          <span className="text-right">
                            تم اعتماد هذا الملف وتوقيعه بواسطة الطبيب <strong>{selectedScan.doctorSignedBy}</strong> في{" "}
                            {selectedScan.doctorSignedAt ? new Date(selectedScan.doctorSignedAt).toLocaleString("ar-EG") : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-2 flex-wrap gap-3">
                  <Link
                    href={`/scans/${selectedScan.scanId}`}
                    target="_blank"
                    className="text-xs sm:text-sm text-cyan-400 font-bold hover:underline"
                  >
                    🔗 فتح صفحة التقرير الطبي المستقل في علامة تبويب جديدة
                  </Link>

                  <button
                    onClick={() => setSelectedScan(null)}
                    className="btn-ghost text-xs sm:text-sm"
                    style={{ padding: "8px 20px" }}
                  >
                    إغلاق المراجعة
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer ── */}
        <div className="section-divider" />
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            RetinaScan AI © 2026 — Doctor Portal
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            For authorized medical professionals only.
          </p>
        </div>
      </div>
    </div>
  );
}
