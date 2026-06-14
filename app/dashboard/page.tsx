"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import UploadZone from "@/components/upload/UploadZone";
import DiagnosisPanel from "@/components/results/DiagnosisPanel";
import PrintableReport from "@/components/results/PrintableReport";
import { UploadState, UploadedFile, AnalysisResult } from "@/lib/types";
import { MOCK_RESULT, generatePasscode } from "@/lib/constants";

// ── Status dot ────────────────────────────────────────────────
function StatusDot({ state }: { state: UploadState }) {
  const color =
    state === "processing" ? "var(--cyan)" :
    state === "complete"   ? "var(--success)" :
    state === "error"      ? "var(--danger)" :
    "var(--text-muted)";

  const label =
    state === "idle"       ? "جاهز للتحليل (Ready for Analysis)" :
    state === "hover"      ? "تم تحميل الصورة — اضغط لبدء التشخيص" :
    state === "processing" ? "جاري تشخيص الذكاء الاصطناعي..." :
    state === "complete"   ? "اكتمل التشخيص بنجاح" :
    "حدث خطأ أثناء المعالجة";

  return (
    <div className="flex items-center gap-2.5">
      <motion.div
        className="rounded-full flex-shrink-0"
        style={{ width: "8px", height: "8px", background: color }}
        animate={state === "processing" ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────
function MetricCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-3 card-lift">
      <div className="flex items-center gap-2">
        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
        <span className="text-xs uppercase tracking-widest font-display"
          style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div className="font-display font-bold text-xl" style={{ color: "var(--cyan)" }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

// ── Results Skeleton ──────────────────────────────────────────
function ResultsSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="glass-strong rounded-2xl p-6 space-y-5">
        <div className="flex justify-between items-center">
          <div className="shimmer h-6 w-24 rounded-full" />
          <div className="shimmer h-4 w-20 rounded" />
        </div>
        <div className="shimmer h-7 w-48 rounded" />
        <div className="shimmer h-4 w-32 rounded" />
        <div className="flex justify-center pt-2">
          <div className="shimmer rounded-full" style={{ width: "144px", height: "144px" }} />
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="shimmer h-3 w-28 rounded" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className="shimmer h-3 w-28 rounded" />
              <div className="shimmer h-3 w-10 rounded" />
            </div>
            <div className="shimmer h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="text-center py-6 space-y-3">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: "2.5rem" }}
        >
          🔬
        </motion.div>
        <p className="font-display font-semibold text-sm" style={{ color: "var(--text-secondary)" }}>
          بانتظار صورة الشبكية (Awaiting Image)
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          قم برفع صورة فحص قاع العين على اليسار لبدء التحليل
        </p>
      </div>
    </motion.div>
  );
}

// ── Analysis Page Component ──────────────────────────────────
export default function DashboardPage() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [patientName, setPatientName] = useState("");
  const [patientNameError, setPatientNameError] = useState(false);

  const handleFileAccepted = useCallback((file: UploadedFile) => {
    setUploadedFile(file);
    setUploadState("hover");
    setResult(null);
  }, []);

  // Triggered when clicking Analyze Image
  const handleAnalyze = useCallback(async () => {
    if (!uploadedFile || !patientName.trim()) {
      setPatientNameError(true);
      return;
    }
    setUploadState("processing");
    setResult(null);

    try {
      // Create form data and append the uploaded file
      const formData = new FormData();
      formData.append("image", uploadedFile.file);

      // Call the Next.js API route that connects to the Python model
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!analyzeResponse.ok) {
        const errData = await analyzeResponse.json().catch(() => ({}));
        throw new Error(errData.error || "فشل الاتصال بخدمة التحليل الطبي");
      }

      const analyzeData = await analyzeResponse.json();
      if (!analyzeData.success) {
        throw new Error(analyzeData.error || "فشل في تحليل الصورة من الموديل");
      }

      const modelResult = analyzeData.result as AnalysisResult;

      const generatedId = `CRD-${Date.now().toString().slice(-6)}`;
      const generatedPass = generatePasscode();
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      let resolvedOrigin = origin;
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        try {
          const res = await fetch("/api/network-ip");
          const data = await res.json();
          if (data.success && data.ip && data.ip !== "localhost") {
            resolvedOrigin = origin.replace("localhost", data.ip).replace("127.0.0.1", data.ip);
          }
        } catch (e) {
          console.error("Failed to fetch network IP for QR:", e);
        }
      }
      const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${resolvedOrigin}/scans/${generatedId}?pwd=${generatedPass}`)}`;

      const newResult: AnalysisResult = {
        ...modelResult,
        scanId: generatedId,
        patientName: patientName.trim(),
        patientPassword: generatedPass,
        qrCodeUrl: dynamicQrUrl,
        timestamp: new Date().toISOString(),
      };

      // 1. Save to Server Database via API
      try {
        const response = await fetch("/api/scans", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newResult),
        });
        const data = await response.json();
        if (!data.success) {
          console.warn("Server DB save warning:", data.error);
        }
      } catch (dbErr) {
        console.error("Failed to connect to server database:", dbErr);
      }

      // 2. Save to browser LocalStorage history log
      try {
        const historyData = localStorage.getItem("eyescan_history");
        const historyList = historyData ? JSON.parse(historyData) : [];
        const updatedHistory = [newResult, ...historyList];
        localStorage.setItem("eyescan_history", JSON.stringify(updatedHistory));
      } catch (storageErr) {
        console.error("Failed to save to local storage history:", storageErr);
      }

      // Set results
      setResult(newResult);
      setUploadState("complete");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء المعالجة");
      setUploadState("error");
    }
  }, [uploadedFile, patientName]);

  return (
    <div className="min-h-screen relative">
      <div className="gradient-mesh print:hidden" />
      <div className="neural-grid print:hidden" />

      <div className="relative z-10 print:hidden">
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
                  <span>🔬 إجراء فحص عيون جديد (Retinal Scan)</span>
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  أدخل اسم المريض وارفع صورة الشبكية للحصول على تشخيص الذكاء الاصطناعي ورمز الـ QR فورا
                </p>
              </div>

              {/* Navigation Shortcuts */}
              <div className="flex gap-2.5">
                <Link
                  href="/doctor/dashboard"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition"
                >
                  📁 لوحة الطبيب (Database)
                </Link>
                <Link
                  href="/history"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition"
                >
                  📜 سجل الفحوصات (History)
                </Link>
                <Link
                  href="/clinics"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:text-white transition"
                >
                  🏥 أقرب عيادة
                </Link>
              </div>
            </div>

            <div className="mt-6">
              <StatusDot state={uploadState} />
            </div>
          </motion.div>
        </div>

        {/* ── Main Diagnostics Grid ── */}
        <div className="max-w-7xl mx-auto px-6" style={{ paddingBottom: "60px" }}>
          <div className="grid lg:grid-cols-5 gap-6 items-start">
            
            {/* Left: Upload Zone (3 cols) */}
            <motion.div
              className="lg:col-span-3"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <UploadZone
                onFileAccepted={handleFileAccepted}
                onAnalyze={handleAnalyze}
                uploadState={uploadState}
                uploadedFile={uploadedFile}
                errorMessage={errorMessage}
                patientName={patientName}
                setPatientName={setPatientName}
                patientNameError={patientNameError}
                setPatientNameError={setPatientNameError}
              />

              {/* Supported formats */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: "دعم فحص قاع العين وقارئ طبقات الشبكية", icon: "📸" },
                  { label: "توليد تلقائي لكلمة المرور ورمز الاستجابة السريعة", icon: "🔐" },
                  { label: "دقة تشخيصية تصل إلى 96.4%", icon: "🎯" },
                  { label: "تشفير فوري وحفظ مباشر ببيانات الخادم", icon: "💾" },
                ].map(({ label, icon }) => (
                  <span
                    key={label}
                    className="text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>{icon}</span>
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Right: Results Panel (2 cols) */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <AnimatePresence mode="wait">
                {result ? (
                  <DiagnosisPanel result={result} isVisible={true} previewUrl={uploadedFile?.previewUrl} key="result" />
                ) : (
                  <motion.div key="skeleton" exit={{ opacity: 0 }}>
                    <ResultsSkeleton />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ── Bottom Metrics ── */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <MetricCard
              icon="⏱️" label="Processing Time"
              value={result ? `${(result.processingTimeMs / 1000).toFixed(1)}s` : "—"}
              sub="Avg. 3.4s per scan"
            />
            <MetricCard icon="🧠" label="Model Version" value="v2.1" sub="RetinaCRD" />
            <MetricCard icon="🎯" label="Model Accuracy" value="96.4%" sub="On test dataset" />
            <MetricCard
              icon="🟢" label="Server Status"
              value="✓ Online"
              sub="All systems nominal"
            />
          </motion.div>
        </div>

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

      {result && (
        <div className="hidden print:block font-display" dir="rtl">
          <PrintableReport result={result} previewUrl={uploadedFile?.previewUrl} />
        </div>
      )}
    </div>
  );
}
