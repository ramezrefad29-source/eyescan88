"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { AnalysisResult } from "@/lib/types";
import { SEVERITY_CONFIG, getQrCodeUrl } from "@/lib/constants";

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

        {/* ── Page Header ── */}
        <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: "40px", paddingBottom: "25px" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mt-3 flex-wrap gap-5 text-right">
              <div className="w-full md:w-auto">
                <h1 className="font-display font-bold text-white flex items-center gap-3 justify-end text-xl sm:text-2xl md:text-3xl"
                  style={{ letterSpacing: "-0.02em" }}>
                  <span>📜 سجل الفحوصات المحلية (Device Scan Log)</span>
                </h1>
                <p className="text-sm sm:text-base mt-1.5" style={{ color: "var(--text-muted)" }}>
                  سجل الفحوصات المخزنة محلياً على هذا الجهاز، مع تفاصيل رموز الـ QR ورموز الوصول
                </p>
              </div>

              {/* Action Buttons with larger tap targets */}
              <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
                <Link
                  href="/dashboard"
                  className="px-5 py-3 text-xs sm:text-sm font-bold rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-white transition duration-200"
                >
                  🔬 إجراء فحص جديد
                </Link>
                <Link
                  href="/doctor/dashboard"
                  className="px-5 py-3 text-xs sm:text-sm font-bold rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition duration-200"
                >
                  📁 لوحة الطبيب (Database)
                </Link>
                {localHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="px-5 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs sm:text-sm font-bold transition duration-200 hover:bg-red-500/15"
                  >
                    🗑️ مسح السجل
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Main Cards Grid ── */}
        <div className="max-w-7xl mx-auto px-6" style={{ paddingBottom: "60px" }}>
          
          {localHistory.length === 0 ? (
            <div className="glass-strong rounded-3xl py-24 text-center space-y-5 border border-white/5">
              <span className="text-5xl block">📜</span>
              <h3 className="font-display font-semibold text-white text-lg">سجل الفحوصات فارغ</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed px-4">
                لم يتم تسجيل أي فحص محلي على هذا الجهاز بعد. ابدأ بتحليل أول صورة للشبكية لتظهر هنا!
              </p>
              <div className="pt-2">
                <Link href="/dashboard" className="btn-primary text-xs sm:text-sm font-bold px-6 py-3">
                  🚀 ابدأ فحصاً جديداً الآن
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <div 
                    key={scan.scanId} 
                    className="glass-strong rounded-2xl p-6 space-y-5 relative card-lift text-right border transition duration-200" 
                    style={{ borderColor: cfg.border }}
                  >
                    {/* Header: Badge & Delete with larger buttons */}
                    <div className="flex items-center justify-between flex-row-reverse">
                      <div className="flex items-center gap-2">
                        <span 
                          className="badge text-xs font-bold" 
                          style={{
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            color: cfg.color,
                            padding: "3px 10px"
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
                        <span className="text-xs text-slate-400 font-mono">#{scan.scanId}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteScan(scan.scanId)}
                        className="text-slate-400 hover:text-red-400 transition text-base p-2 rounded-lg bg-white/5 hover:bg-red-500/10"
                        title="حذف السجل"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Patient Name with larger mobile font */}
                    <div>
                      <span className="text-[11px] text-slate-500 block">اسم المريض</span>
                      <p className="font-bold text-white text-lg sm:text-base leading-tight font-display mt-0.5">{scan.patientName}</p>
                    </div>

                    {/* Access credentials card with larger text and spacing */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 flex-row-reverse text-xs gap-3">
                      <div className="text-right">
                        <span className="text-[10px] block text-cyan-400 font-medium">كلمة المرور (Passcode)</span>
                        <span className="font-mono font-bold tracking-widest text-white text-base block mt-0.5">{scan.patientPassword}</span>
                      </div>
                      <button
                        onClick={() => handleCopyPassword(scan.patientPassword || "")}
                        className="px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-bold transition hover:bg-cyan-500/20 active:scale-95"
                      >
                        {copiedDbPassword === scan.patientPassword ? "✓ تم" : "📋 نسخ"}
                      </button>
                    </div>

                    {/* Footer options: larger text and touch areas */}
                    <div className="flex items-center justify-between flex-row-reverse pt-3.5 border-t border-white/5 text-xs text-slate-400 gap-2">
                      <span>{formattedDate}</span>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSelectedScan(scan)}
                          className="text-cyan-400 font-bold hover:underline py-1"
                        >
                          عرض الـ QR
                        </button>
                        <span className="text-slate-600">·</span>
                        <button
                          onClick={() => handleCopyLink(scan.scanId)}
                          className="text-slate-200 hover:underline py-1"
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
              className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md"
              onClick={() => setSelectedScan(null)}
            >
              {/* Fullscreen Backdrop Zone */}
              <div className="absolute inset-0 cursor-default" />

              <motion.div
                initial={{ scale: 0.93, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.93, y: 15 }}
                className="glass-strong rounded-3xl p-6 md:p-8 w-full max-w-md relative text-right overflow-y-auto"
                style={{ maxHeight: "90vh" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedScan(null)}
                  className="absolute left-6 top-6 w-9 h-9 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white flex items-center justify-center text-base transition duration-200 hover:border-cyan-500/30 shadow-lg cursor-pointer"
                >
                  ✕
                </button>

                <h3 className="font-display font-bold text-lg sm:text-xl text-white mb-4 text-center">
                  تفاصيل ورمز الـ QR الخاص بالمريض
                </h3>

                {/* Patient QR Code details */}
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="p-3.5 bg-white rounded-3xl" style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
                    <img
                      src={getQrCodeUrl(selectedScan.scanId, selectedScan.patientPassword)}
                      alt="Scan report"
                      width="180"
                      height="180"
                      className="rounded-2xl block"
                    />
                  </div>
                  <span className="text-xs text-slate-400 text-center leading-normal">
                    امسح الرمز بواسطة الكاميرا لفتح التقرير الطبي تفاعلياً 📱
                  </span>
                </div>

                <div className="space-y-4 mt-2">
                  {/* Name field */}
                  <div>
                    <span className="text-xs text-slate-500 block">اسم المريض</span>
                    <p className="font-bold text-white text-lg sm:text-xl leading-tight font-display mt-0.5">
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
                  <div className="p-4 rounded-2xl border flex items-center justify-between flex-row-reverse text-sm mt-2" style={{
                    background: "rgba(0, 212, 255, 0.02)",
                    borderColor: "rgba(0, 212, 255, 0.15)",
                  }}>
                    <div>
                      <span className="text-[10px] block text-cyan-400">كلمة المرور المميزة</span>
                      <span className="font-mono font-bold tracking-widest text-white text-lg block mt-0.5">
                        {selectedScan.patientPassword}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyPassword(selectedScan.patientPassword || "")}
                      className="btn-primary"
                      style={{
                        padding: "10px 16px",
                        fontSize: "0.8rem",
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
                      className="btn-primary flex-1 text-xs sm:text-sm font-bold"
                      style={{ padding: "13px 20px" }}
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
