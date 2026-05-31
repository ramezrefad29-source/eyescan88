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
      className="badge"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: "0.62rem",
      }}
    >
      <span
        style={{
          width: "5px", height: "5px", borderRadius: "50%",
          background: cfg.color, display: "inline-block",
          boxShadow: `0 0 4px ${cfg.color}`,
        }}
      />
      {cfg.label}
    </span>
  );
}

// ── Stats Card ────────────────────────────────────────────
function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-2 text-center">
      <span style={{ fontSize: "1.5rem" }}>{icon}</span>
      <div className="font-display font-bold text-2xl" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

// ── Main Doctor Dashboard ─────────────────────────────────
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

  // Stats
  const totalScans = scans.length;
  const signedOff = scans.filter((s) => s.doctorSignedOff).length;
  const criticalCount = scans.filter((s) => s.severity === "Severe" || s.severity === "Critical").length;
  const avgConfidence = totalScans > 0 ? Math.round((scans.reduce((a, s) => a + s.confidence, 0) / totalScans) * 100) : 0;

  return (
    <div className="min-h-screen relative">
      <div className="gradient-mesh" />
      <div className="neural-grid" />

      <div className="relative z-10">
        <Navbar />

        {/* ── Header ── */}
        <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: "40px", paddingBottom: "20px" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mt-3 flex-wrap gap-4">
              <div>
                <h1
                  className="font-display font-bold text-white flex items-center gap-3"
                  style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", letterSpacing: "-0.02em" }}
                >
                  <span>🩺 لوحة تحكم الطبيب (Doctor Portal)</span>
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  مراجعة الفحوصات وإضافة الملاحظات الطبية والتوقيع على التقارير
                </p>
              </div>

              <div className="flex gap-2.5">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition"
                >
                  🔬 فحص جديد
                </Link>
                <Link
                  href="/history"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 transition"
                >
                  📜 السجل المحلي
                </Link>
                <Link
                  href="/clinics"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition"
                >
                  🏥 أقرب عيادة
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Stats Row ── */}
        <div className="max-w-7xl mx-auto px-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="📊" value={totalScans} label="إجمالي الفحوصات" color="var(--cyan)" />
            <StatCard icon="✅" value={signedOff} label="تم التوقيع" color="#00C9A7" />
            <StatCard icon="⚠️" value={criticalCount} label="حالات حرجة" color="#FF6B6B" />
            <StatCard icon="🎯" value={`${avgConfidence}%`} label="متوسط الثقة" color="#7C3AED" />
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
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 font-display"
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
              className="px-4 py-3 rounded-xl text-sm font-display"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
                outline: "none",
                minWidth: "160px",
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
            <div className="glass rounded-3xl py-24 text-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                style={{ fontSize: "2.5rem", display: "inline-block" }}
              >
                ⏳
              </motion.div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>جاري تحميل بيانات المرضى...</p>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="glass rounded-3xl py-24 text-center space-y-4">
              <span className="text-4xl block">📋</span>
              <h3 className="font-display font-semibold text-white text-base">لا توجد فحوصات مطابقة</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                {totalScans === 0
                  ? "لم يتم تسجيل أي فحص في قاعدة البيانات. اذهب لصفحة الفحص وقم بتحليل صورة للبدء."
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
                    className="glass rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4 card-lift cursor-pointer group"
                    style={{ border: `1px solid ${scan.doctorSignedOff ? "rgba(0,201,167,0.2)" : cfg.border}` }}
                    onClick={() => openScan(scan)}
                  >
                    {/* Patient info */}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center gap-2 flex-row-reverse mb-1">
                        <span className="font-display font-bold text-white text-base truncate">
                          {scan.patientName || "—"}
                        </span>
                        <SeverityBadge severity={scan.severity} />
                        {scan.doctorSignedOff && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            ✓ موقّع
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">#{scan.scanId}</div>
                    </div>

                    {/* Diagnosis */}
                    <div className="text-right flex-shrink-0 md:w-48">
                      <span className="text-xs text-slate-500 block">التشخيص</span>
                      <span className="text-sm font-semibold" style={{ color: cfg.color }}>
                        {scan.diagnosis}
                      </span>
                    </div>

                    {/* Confidence */}
                    <div className="text-center flex-shrink-0 md:w-20">
                      <span className="text-xs text-slate-500 block">الثقة</span>
                      <span className="text-sm font-bold font-mono" style={{ color: "var(--cyan)" }}>
                        {Math.round(scan.confidence * 100)}%
                      </span>
                    </div>

                    {/* Date */}
                    <div className="text-right flex-shrink-0 md:w-40">
                      <span className="text-xs text-slate-500 block">التاريخ</span>
                      <span className="text-xs text-slate-300">{date}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Link
                        href={`/scans/${scan.scanId}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        👁️ تقرير المريض
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); openScan(scan); }}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition"
                      >
                        📝 مراجعة
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(scan.scanId); }}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/5 text-red-400 border border-red-500/15 hover:bg-red-500/15 transition"
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

        {/* ── Detail / Notes Modal ── */}
        <AnimatePresence>
          {selectedScan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md"
              onClick={() => setSelectedScan(null)}
            >
              <motion.div
                initial={{ scale: 0.92, y: 24 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 24 }}
                className="glass-strong rounded-3xl p-6 w-full max-w-lg relative text-right overflow-y-auto"
                style={{ maxHeight: "90vh" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close */}
                <button
                  onClick={() => setSelectedScan(null)}
                  className="absolute left-5 top-5 w-8 h-8 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
                >
                  ✕
                </button>

                {/* Header */}
                <h3 className="font-display font-bold text-lg text-white mb-1">
                  مراجعة الفحص الطبي
                </h3>
                <p className="text-xs text-slate-500 mb-5">#{selectedScan.scanId}</p>

                {/* Patient summary */}
                <div className="space-y-4 mb-5">
                  <div className="flex justify-between items-center flex-row-reverse">
                    <div>
                      <span className="text-[10px] text-slate-500 block">المريض</span>
                      <span className="font-bold text-white">{selectedScan.patientName}</span>
                    </div>
                    <SeverityBadge severity={selectedScan.severity} />
                  </div>

                  <div className="flex justify-between flex-row-reverse">
                    <div>
                      <span className="text-[10px] text-slate-500 block">التشخيص</span>
                      <span className="text-sm font-semibold" style={{ color: SEVERITY_CONFIG[selectedScan.severity]?.color || "#fff" }}>
                        {selectedScan.diagnosis}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-500 block">الثقة</span>
                      <span className="text-sm font-bold font-mono" style={{ color: "var(--cyan)" }}>
                        {Math.round(selectedScan.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">المرحلة</span>
                    <span className="text-xs text-slate-300">{selectedScan.stage}</span>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-2">التوصيات</span>
                    <ul className="space-y-1.5">
                      {selectedScan.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300 flex-row-reverse">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--cyan)" }} />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Heatmap & 3D eye model */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-right">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-500 block">خريطة الحرارة المقارنة</span>
                      <RetinalFundusHeatmap
                        heatmapCoordinates={selectedScan.heatmapCoordinates}
                        heatmapBase64={selectedScan.heatmapBase64}
                        imageBase64={selectedScan.imageBase64}
                        showDetails={false}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-500 block">النموذج ثلاثي الأبعاد</span>
                      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40" style={{ height: "180px" }}>
                        <Eye3D severity={selectedScan.severity} interactive={true} />
                      </div>
                    </div>
                  </div>

                  {/* Link to Report */}
                  <div className="flex justify-start mt-3">
                    <Link
                      href={`/scans/${selectedScan.scanId}`}
                      target="_blank"
                      className="text-xs text-cyan-400 font-bold hover:underline"
                    >
                      👁️ فتح صفحة التقرير الكاملة للمريض
                    </Link>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px w-full my-5" style={{ background: "var(--glass-border)" }} />

                {/* Doctor Notes Section */}
                <div className="space-y-4">
                  <h4 className="font-display font-bold text-sm text-white flex items-center gap-2 flex-row-reverse">
                    <span>📝</span> ملاحظات الطبيب (Doctor Notes)
                  </h4>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="اكتب ملاحظاتك الطبية هنا..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 font-display resize-none"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--glass-border)",
                      outline: "none",
                      direction: "rtl",
                    }}
                  />

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">اسم الطبيب (للتوقيع)</label>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="د. أحمد محمد"
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 font-display"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--glass-border)",
                        outline: "none",
                        direction: "rtl",
                      }}
                    />
                  </div>

                  {selectedScan.doctorSignedOff && (
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-emerald-400 flex items-center gap-2 flex-row-reverse">
                      <span>✅</span>
                      <span>
                        تم التوقيع بواسطة: <strong>{selectedScan.doctorSignedBy}</strong> —{" "}
                        {selectedScan.doctorSignedAt ? new Date(selectedScan.doctorSignedAt).toLocaleString("ar-EG") : ""}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveNotes}
                      disabled={saving}
                      className="btn-primary flex-1"
                      style={{ padding: "12px 20px", fontSize: "0.875rem", opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? "⏳ جاري الحفظ..." : doctorName.trim() ? "✅ حفظ وتوقيع" : "💾 حفظ الملاحظات"}
                    </button>
                    <button
                      onClick={() => setSelectedScan(null)}
                      className="btn-ghost"
                      style={{ padding: "12px 20px", fontSize: "0.875rem" }}
                    >
                      إغلاق
                    </button>
                  </div>
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
