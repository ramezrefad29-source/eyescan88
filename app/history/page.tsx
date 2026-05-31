"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { AnalysisResult } from "@/lib/types";
import { SEVERITY_CONFIG, getQrCodeUrl } from "@/lib/constants";

// ── Patient History Page Component ─────────────────────────────
export default function HistoryPage() {
  const [localHistory, setLocalHistory] = useState<AnalysisResult[]>([]);
  const [selectedScan, setSelectedScan] = useState<AnalysisResult | null>(null);

  // Copy checks
  const [copiedDbPassword, setCopiedDbPassword] = useState<string | null>(null);
  const [copiedDbLink, setCopiedDbLink] = useState<string | null>(null);

  // Fetch local storage history on mount
  useEffect(() => {
    const historyData = localStorage.getItem("eyescan_history");
    if (historyData) {
      try {
        setLocalHistory(JSON.parse(historyData));
      } catch (err) {
        console.error("Error parsing local history:", err);
      }
    }
  }, []);

  // Copy passcode
  const handleCopyPassword = (pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedDbPassword(pass);
    setTimeout(() => setCopiedDbPassword(null), 2000);
  };

  // Copy link
  const handleCopyLink = (id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const link = `${origin}/scans/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedDbLink(id);
    setTimeout(() => setCopiedDbLink(null), 2000);
  };

  // Delete specific scan
  const handleDeleteScan = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الفحص من السجل المحلي؟")) {
      const updated = localHistory.filter((scan) => scan.scanId !== id);
      localStorage.setItem("eyescan_history", JSON.stringify(updated));
      setLocalHistory(updated);
    }
  };

  // Clear all history
  const handleClearHistory = () => {
    if (confirm("هل أنت متأكد من رغبتك في مسح السجل بالكامل؟")) {
      localStorage.removeItem("eyescan_history");
      setLocalHistory([]);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="gradient-mesh" />
      <div className="neural-grid" />

      <div className="relative z-10">
        <Navbar />

        {/* ── Page Header ── */}
        <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: "40px", paddingBottom: "20px" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mt-3 flex-wrap gap-4">
              <div>
                <h1 className="font-display font-bold text-white flex items-center gap-3"
                  style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", letterSpacing: "-0.02em" }}>
                  <span>📜 سجل الفحوصات المحلية (Device Scan Log)</span>
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  سجل الفحوصات التي قمت بإنشائها على هذا الجهاز، مع تفاصيل رموز الـ QR وكلمات مرور الوصول
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-white transition"
                >
                  🔬 إجراء فحص جديد
                </Link>
                <Link
                  href="/doctor/dashboard"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition"
                >
                  📁 لوحة الطبيب (Database)
                </Link>
                {localHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold transition hover:bg-red-500/15"
                  >
                    🗑️ مسح السجل بالكامل
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Main Cards Grid ── */}
        <div className="max-w-7xl mx-auto px-6" style={{ paddingBottom: "60px" }}>
          
          {localHistory.length === 0 ? (
            <div className="glass rounded-3xl py-24 text-center space-y-4">
              <span className="text-4xl block">📜</span>
              <h3 className="font-display font-semibold text-white text-base">سجل الفحوصات فارغ</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                لم يتم تسجيل أي فحص محلي على هذا الجهاز بعد. اذهب لصفحة الفحص وقم بتحليل أول صورة للبدء!
              </p>
              <div className="pt-2">
                <Link href="/dashboard" className="btn-primary text-xs font-bold">
                  🚀 ابدأ فحصاً جديداً الآن
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {localHistory.map((scan) => {
                const cfg = SEVERITY_CONFIG[scan.severity || "Normal"];
                const formattedDate = scan.timestamp
                  ? new Date(scan.timestamp).toLocaleString("ar-EG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "غير متوفر";

                return (
                  <div key={scan.scanId} className="glass rounded-2xl p-5 space-y-4 relative card-lift text-right" style={{ border: `1px solid ${cfg.border}` }}>
                    
                    {/* Header: Badge & Delete */}
                    <div className="flex items-center justify-between flex-row-reverse">
                      <div className="flex items-center gap-2">
                        <span className="badge" style={{
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          color: cfg.color,
                          fontSize: "0.62rem"
                        }}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">#{scan.scanId}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteScan(scan.scanId)}
                        className="text-slate-500 hover:text-red-400 transition text-xs p-1"
                        title="حذف السجل"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Patient Name */}
                    <div>
                      <span className="text-[10px] text-slate-500 block">اسم المريض</span>
                      <p className="font-bold text-white text-base leading-tight font-display">{scan.patientName}</p>
                    </div>

                    {/* Access credentials card */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 flex-row-reverse text-xs">
                      <div className="text-right">
                        <span className="text-[9px] block text-cyan-400">كلمة المرور المميزة (Passcode)</span>
                        <span className="font-mono font-bold tracking-widest text-slate-200 text-sm">{scan.patientPassword}</span>
                      </div>
                      <button
                        onClick={() => handleCopyPassword(scan.patientPassword || "")}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-[10px] font-bold transition hover:bg-cyan-500/20"
                      >
                        {copiedDbPassword === scan.patientPassword ? "✓ تم" : "📋 نسخ"}
                      </button>
                    </div>

                    {/* Footer options */}
                    <div className="flex items-center justify-between flex-row-reverse pt-2 border-t border-white/5 text-[11px] text-slate-500">
                      <span>{formattedDate}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedScan(scan)}
                          className="text-cyan-400 font-bold hover:underline"
                        >
                          عرض الـ QR
                        </button>
                        <span>·</span>
                        <button
                          onClick={() => handleCopyLink(scan.scanId)}
                          className="text-slate-300 hover:underline"
                        >
                          {copiedDbLink === scan.scanId ? "✓ تم" : "نسخ الرابط"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* ── Modal overlay for viewing QR Code and details ── */}
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
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="glass-strong rounded-3xl p-6 w-full max-w-md relative text-right"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedScan(null)}
                  className="absolute left-6 top-6 w-8 h-8 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
                >
                  ✕
                </button>

                <h3 className="font-display font-bold text-lg text-white mb-4 text-center">
                  تفاصيل ورمز الـ QR الخاص بالمريض
                </h3>

                {/* Patient QR Code details */}
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="p-3 bg-white rounded-3xl" style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
                    <img
                      src={getQrCodeUrl(selectedScan.scanId, selectedScan.patientPassword)}
                      alt="Scan report"
                      width="160"
                      height="160"
                      className="rounded-2xl block"
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    امسح الرمز بواسطة الجوال لفتح التقرير الطبي تفاعلياً 📱
                  </span>
                </div>

                <div className="space-y-4 mt-2">
                  {/* Name field */}
                  <div>
                    <span className="text-xs text-slate-500 block">اسم المريض</span>
                    <p className="font-bold text-white text-base leading-tight font-display">
                      {selectedScan.patientName}
                    </p>
                  </div>

                  {/* ID & Date */}
                  <div className="flex justify-between items-center flex-row-reverse border-t border-white/5 pt-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">كود الفحص (ID)</span>
                      <span className="font-mono text-xs font-bold text-slate-300">
                        #{selectedScan.scanId}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block text-left">التاريخ</span>
                      <span className="text-xs text-slate-300">
                        {selectedScan.timestamp ? new Date(selectedScan.timestamp).toLocaleDateString("ar-EG") : ""}
                      </span>
                    </div>
                  </div>

                  {/* Passcode Copy Card */}
                  <div className="p-3.5 rounded-2xl border flex items-center justify-between flex-row-reverse text-sm mt-2" style={{
                    background: "rgba(0, 212, 255, 0.02)",
                    borderColor: "rgba(0, 212, 255, 0.15)",
                  }}>
                    <div>
                      <span className="text-[10px] block text-cyan-400">كلمة المرور المميزة</span>
                      <span className="font-mono font-bold tracking-widest text-white text-lg">
                        {selectedScan.patientPassword}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyPassword(selectedScan.patientPassword || "")}
                      className="btn-primary"
                      style={{
                        padding: "8px 14px",
                        fontSize: "0.75rem",
                        borderRadius: "8px",
                      }}
                    >
                      {copiedDbPassword === selectedScan.patientPassword ? "✓ تم" : "📋 نسخ"}
                    </button>
                  </div>

                  {/* Share Link Copy */}
                  <div className="flex gap-2.5 mt-4">
                    <button
                      onClick={() => handleCopyLink(selectedScan.scanId)}
                      className="btn-primary flex-1 text-xs"
                      style={{ padding: "12px 16px" }}
                    >
                      {copiedDbLink === selectedScan.scanId ? "✓ تم نسخ رابط الوصول" : "🔗 نسخ رابط الوصول الفوري"}
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
            RetinaScan AI © 2026 — For assistive diagnostic purposes only.
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Not a substitute for professional medical consultation.
          </p>
        </div>
      </div>
    </div>
  );
}
