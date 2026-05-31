"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/constants";
import { UploadState, UploadedFile } from "@/lib/types";

interface UploadZoneProps {
  onFileAccepted: (file: UploadedFile) => void;
  onAnalyze: () => void;
  uploadState: UploadState;
  uploadedFile: UploadedFile | null;
  errorMessage?: string;
  patientName: string;
  setPatientName: (name: string) => void;
  patientNameError: boolean;
  setPatientNameError: (err: boolean) => void;
}

// ── SVG Icons ──────────────────────────────────────────────
const EyeIcon = () => (
  <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
    <circle cx="34" cy="34" r="32" stroke="url(#eyeGrad)" strokeWidth="1" strokeDasharray="4 5" opacity="0.35" />
    <ellipse cx="34" cy="34" rx="22" ry="15" stroke="url(#eyeGrad)" strokeWidth="1.5" />
    <circle cx="34" cy="34" r="9" stroke="url(#eyeGrad)" strokeWidth="1.5" />
    <circle cx="34" cy="34" r="3.5" fill="url(#eyeGrad)" />
    <circle cx="30.5" cy="30.5" r="1.8" fill="white" opacity="0.5" />
    <line x1="25" y1="34" x2="43" y2="34" stroke="rgba(0,212,255,0.4)" strokeWidth="0.8" />
    <line x1="34" y1="25" x2="34" y2="43" stroke="rgba(0,212,255,0.4)" strokeWidth="0.8" />
    <defs>
      <linearGradient id="eyeGrad" x1="0" y1="0" x2="68" y2="68" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00D4FF" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
  </svg>
);

const CheckIcon = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
    <circle cx="28" cy="28" r="26" fill="rgba(0,201,167,0.12)" stroke="#00C9A7" strokeWidth="1.5" />
    <path d="M16 28L23 35L40 18" stroke="#00C9A7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertIcon = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
    <circle cx="28" cy="28" r="26" fill="rgba(255,71,87,0.12)" stroke="#FF4757" strokeWidth="1.5" />
    <path d="M28 16L28 30" stroke="#FF4757" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="28" cy="38" r="2.5" fill="#FF4757" />
  </svg>
);

// ── Progress Ring ───────────────────────────────────────────
function ProgressRing({ progress, size = 100 }: { progress: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="absolute inset-0 m-auto">
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={radius}
        stroke="rgba(255,255,255,0.05)" strokeWidth="5" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="url(#ringGrad)" strokeWidth="5" fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="progress-ring-circle"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
    </svg>
  );
}

// ── Scan Steps ─────────────────────────────────────────────
const STEPS = [
  { label: "Feature Extraction",    labelAr: "استخراج الخصائص" },
  { label: "Retinal Layer Analysis", labelAr: "تحليل طبقات الشبكية" },
  { label: "Anomaly Detection",      labelAr: "كشف الأنماط الشاذة" },
  { label: "Classification & Report",labelAr: "التصنيف والتقرير" },
];

// ── HUD Corner Decorations ─────────────────────────────────
function HUDCorners({ active }: { active: boolean }) {
  const corners = [
    { top: "10px", left: "10px", borderTop: true, borderLeft: true },
    { top: "10px", right: "10px", borderTop: true, borderRight: true },
    { bottom: "10px", left: "10px", borderBottom: true, borderLeft: true },
    { bottom: "10px", right: "10px", borderBottom: true, borderRight: true },
  ];
  return (
    <>
      {corners.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            ...pos, width: "20px", height: "20px",
            borderTop: pos.borderTop ? `1.5px solid rgba(0,212,255,${active ? 0.7 : 0.4})` : undefined,
            borderBottom: pos.borderBottom ? `1.5px solid rgba(0,212,255,${active ? 0.7 : 0.4})` : undefined,
            borderLeft: pos.borderLeft ? `1.5px solid rgba(0,212,255,${active ? 0.7 : 0.4})` : undefined,
            borderRight: pos.borderRight ? `1.5px solid rgba(0,212,255,${active ? 0.7 : 0.4})` : undefined,
            transition: "border-color 0.3s ease",
          }}
          animate={{ opacity: [0.45, 0.85, 0.45] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function UploadZone({
  onFileAccepted,
  onAnalyze,
  uploadState,
  uploadedFile,
  errorMessage,
  patientName,
  setPatientName,
  patientNameError,
  setPatientNameError,
}: UploadZoneProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (uploadState === "processing") {
      setProgress(0);
      setCurrentStep(0);
      let p = 0;
      progressRef.current = setInterval(() => {
        p += Math.random() * 2.8 + 0.8;
        if (p >= 95) {
          p = 95;
          if (progressRef.current) clearInterval(progressRef.current);
        }
        setProgress(Math.min(p, 95));
        setCurrentStep(Math.min(Math.floor(p / 25), 3));
      }, 100);
    } else if (uploadState === "complete") {
      setProgress(100);
      setCurrentStep(3);
      if (progressRef.current) clearInterval(progressRef.current);
    } else if (uploadState === "idle" || uploadState === "hover" || uploadState === "error") {
      setProgress(0);
      setCurrentStep(0);
      if (progressRef.current) clearInterval(progressRef.current);
    }

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [uploadState]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        onFileAccepted({ file, previewUrl: url, width: img.width, height: img.height });
      };
      img.src = url;
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE_BYTES,
    disabled: uploadState === "processing",
  });

  const isInteractive = uploadState === "idle" || uploadState === "hover";

  // ── IDLE STATE ─────────────────────────────────────────
  const IdleState = (
    <motion.div
      key="idle"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full gap-7 text-center"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <div className="absolute inset-0 rounded-full" style={{
          background: "radial-gradient(circle, rgba(0,212,255,0.18) 0%, transparent 70%)",
          filter: "blur(20px)", transform: "scale(1.4)",
        }} />
        <EyeIcon />
      </motion.div>

      <div className="space-y-2">
        <h3 className="font-display text-xl font-bold text-white">
          Drop Retinal Image Here
        </h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          أسقط صورة الشبكية — Supports JPG, PNG, TIFF, BMP up to {MAX_FILE_SIZE_MB}MB
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div style={{ height: "1px", width: "60px", background: "var(--glass-border)" }} />
        <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>or</span>
        <div style={{ height: "1px", width: "60px", background: "var(--glass-border)" }} />
      </div>

      <button className="btn-ghost" type="button" style={{ fontSize: "0.875rem" }}>
        📁 Browse Files
      </button>

      <HUDCorners active={isDragActive} />
    </motion.div>
  );

  // ── READY STATE ─────────────────────────────────────────
  const ReadyState = uploadedFile && (
    <motion.div
      key="ready"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full gap-6"
    >
      {/* Preview */}
      <div className="relative rounded-2xl overflow-hidden" style={{ maxWidth: "260px", width: "100%" }}>
        <div className="absolute inset-0 rounded-2xl z-10" style={{
          border: "1px solid rgba(0,212,255,0.45)",
          boxShadow: "inset 0 0 24px rgba(0,212,255,0.08)",
        }} />
        <img
          src={uploadedFile.previewUrl}
          alt="Retinal Image"
          className="w-full object-cover rounded-2xl"
          style={{ maxHeight: "200px", display: "block" }}
        />
        {/* Subtle scan overlay */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, transparent 30%, rgba(0,212,255,0.04) 50%, transparent 70%)",
        }} />
        {/* HUD corners on image */}
        <HUDCorners active={false} />
      </div>

      {/* File info */}
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-white" style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {uploadedFile.file.name}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {uploadedFile.width} × {uploadedFile.height} px · {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      {/* Patient Name Input */}
      <div className="w-full space-y-1.5 mt-2" style={{ maxWidth: "260px" }}>
        <label className="text-xs font-semibold text-right block" style={{ color: "var(--text-secondary)" }}>
          اسم المريض (Patient Name) <span style={{ color: "var(--cyan)" }}>*</span>
        </label>
        <input
          type="text"
          value={patientName}
          onChange={(e) => {
            setPatientName(e.target.value);
            if (e.target.value.trim()) {
              setPatientNameError(false);
            }
          }}
          placeholder="أدخل اسم المريض..."
          className="w-full text-sm rounded-xl px-4 py-3 text-white border transition-all duration-300 outline-none text-right font-display"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderColor: patientNameError ? "var(--danger)" : "var(--glass-border)",
            boxShadow: patientNameError ? "0 0 10px rgba(255,71,87,0.15)" : "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--cyan)";
            e.currentTarget.style.boxShadow = "0 0 10px var(--cyan-glow)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = patientNameError ? "var(--danger)" : "var(--glass-border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {patientNameError && (
          <p className="text-xs text-right mt-1 font-medium animate-pulse" style={{ color: "var(--danger)" }}>
            يرجى إدخال اسم المريض أولاً لبدء التحليل
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap justify-center mt-3">
        <button
          className="btn-primary"
          style={{ padding: "13px 30px" }}
          onClick={() => {
            if (!patientName.trim()) {
              setPatientNameError(true);
              return;
            }
            onAnalyze();
          }}
          id="analyze-btn"
        >
          🔬 Analyze Image
        </button>
        <button
          className="btn-ghost"
          {...getRootProps()}
          onClick={(e) => e.stopPropagation()}
        >
          Change Image
        </button>
      </div>
    </motion.div>
  );

  // ── PROCESSING STATE ───────────────────────────────────
  const ProcessingState = (
    <motion.div
      key="processing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center h-full gap-8"
    >
      {uploadedFile && (
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/20" style={{ maxWidth: "230px", width: "100%" }}>
          <img
            src={uploadedFile.previewUrl}
            alt="Analyzing"
            className="w-full object-cover rounded-2xl"
            style={{ maxHeight: "170px", filter: "brightness(0.45) saturate(1.4) contrast(1.15)" }}
          />

          {/* Vertical holographic scan line */}
          <motion.div
            className="absolute left-0 right-0 z-25 pointer-events-none"
            style={{
              height: "3px",
              background: "linear-gradient(90deg, transparent, #00D4FF 30%, #7C3AED 70%, transparent)",
              boxShadow: "0 0 15px #00D4FF, 0 0 30px rgba(124,58,237,0.7)",
            }}
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />

          {/* Horizontal holographic scan line */}
          <motion.div
            className="absolute top-0 bottom-0 z-25 pointer-events-none"
            style={{
              width: "3px",
              background: "linear-gradient(180deg, transparent, #00D4FF 30%, #7C3AED 70%, transparent)",
              boxShadow: "0 0 15px #00D4FF, 0 0 30px rgba(0,212,255,0.7)",
            }}
            animate={{ left: ["0%", "100%"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
          />

          {/* Technical Scope Grid */}
          <div className="absolute inset-0 border border-cyan-500/10 pointer-events-none z-10">
            <div className="absolute top-1/4 left-0 right-0 h-px bg-cyan-500/10" />
            <div className="absolute top-2/4 left-0 right-0 h-px bg-cyan-500/15" />
            <div className="absolute top-3/4 left-0 right-0 h-px bg-cyan-500/10" />
            <div className="absolute left-1/4 top-0 bottom-0 w-px bg-cyan-500/10" />
            <div className="absolute left-2/4 top-0 bottom-0 w-px bg-cyan-500/15" />
            <div className="absolute left-3/4 top-0 bottom-0 w-px bg-cyan-500/10" />
            
            {/* Diagnostic Tickers */}
            <div className="absolute top-2 left-2 text-[5px] font-mono text-cyan-400/50">X: 0.42</div>
            <div className="absolute top-2 right-2 text-[5px] font-mono text-cyan-400/50">Y: 0.51</div>
            <div className="absolute bottom-2 left-2 text-[5px] font-mono text-cyan-400/50">CV: DYNAMIC</div>
            <div className="absolute bottom-2 right-2 text-[5px] font-mono text-cyan-400/50">FPS: 60</div>
          </div>

          {/* HUD Target Finder - Center (Macula) */}
          <motion.div
            className="absolute"
            style={{
              width: "60px", height: "60px",
              border: "1px dashed rgba(0,212,255,0.85)",
              borderRadius: "50%",
              top: "30%", left: "37%",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[6px] font-mono text-cyan-400 font-bold tracking-tighter whitespace-nowrap bg-slate-950/80 px-1 rounded border border-cyan-500/10">
              MACULA SEC (98.7%)
            </span>
          </motion.div>

          {/* Optic Nerve Detection Box */}
          <motion.div
            className="absolute"
            style={{
              width: "35px", height: "35px",
              border: "1.2px solid rgba(124,58,237,0.85)",
              borderRadius: "4px",
              top: "20%", left: "15%",
              boxShadow: "0 0 8px rgba(124,58,237,0.3)"
            }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="absolute -bottom-4 left-0 text-[5px] font-mono text-violet-400 font-bold bg-slate-950/80 px-0.5 rounded border border-violet-500/10 whitespace-nowrap">
              OPTIC DISC INDX
            </span>
          </motion.div>

          {/* Simulated Lesion High-Risk Bounding Box A */}
          <motion.div
            className="absolute"
            style={{
              width: "28px", height: "24px",
              border: "1.5px solid #FF4757",
              borderRadius: "2px",
              top: "45%", left: "55%",
              boxShadow: "0 0 10px rgba(255,71,87,0.4)"
            }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          >
            <span className="absolute -top-4 right-0 text-[5px] font-mono text-red-400 font-bold bg-red-950/80 px-0.5 rounded border border-red-500/20 whitespace-nowrap">
              CRD-L1: 96.4%
            </span>
          </motion.div>

          {/* Simulated Lesion High-Risk Bounding Box B */}
          <motion.div
            className="absolute"
            style={{
              width: "20px", height: "20px",
              border: "1.5px solid #FF8C42",
              borderRadius: "2px",
              top: "35%", left: "70%",
              boxShadow: "0 0 10px rgba(255,140,66,0.4)"
            }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.7 }}
          >
            <span className="absolute -bottom-4 right-0 text-[5px] font-mono text-orange-400 font-bold bg-orange-950/80 px-0.5 rounded border border-orange-500/20 whitespace-nowrap">
              CRD-L2: 94.1%
            </span>
          </motion.div>

          {/* Progress ring overlay */}
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(2,8,23,0.4)" }}>
            <div className="relative" style={{ width: "96px", height: "96px" }}>
              <ProgressRing progress={progress} size={96} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display font-bold text-sm tracking-wider text-gradient-cyan">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="w-full space-y-2.5" style={{ maxWidth: "280px" }}>
        {STEPS.map((step, i) => (
          <motion.div
            key={step.label}
            className="flex items-center gap-3 justify-between flex-row-reverse"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: i <= currentStep ? 1 : 0.25, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="flex items-center gap-2.5 flex-row-reverse">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                background: i < currentStep ? "var(--success)" : i === currentStep ? "var(--cyan)" : "var(--glass-border)",
                boxShadow: i === currentStep ? "0 0 8px var(--cyan)" : "none",
                transition: "all 0.3s ease",
              }} />
              <span className="text-xs font-medium" style={{ color: i <= currentStep ? "var(--text-secondary)" : "var(--text-muted)" }}>
                {step.labelAr} ({step.label})
              </span>
            </div>
            
            {i === currentStep && (
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                style={{ color: "var(--cyan)", fontSize: "0.6rem" }}
                className="font-mono text-[9px] uppercase tracking-wider"
              >
                jari...
              </motion.div>
            )}
            {i < currentStep && (
              <span className="text-[10px] font-mono text-emerald-400 font-bold">PASS</span>
            )}
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-center font-mono text-slate-500 tracking-wider">
        ANALYST MODEL: RetinaCRD-v2.1
      </p>
    </motion.div>
  );

  // ── COMPLETE STATE ─────────────────────────────────────
  const CompleteState = (
    <motion.div
      key="complete"
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 190 }}
      className="flex flex-col items-center justify-center h-full gap-5"
    >
      <motion.div
        animate={{ scale: [0, 1.15, 1] }}
        transition={{ duration: 0.65, ease: "backOut" }}
      >
        <CheckIcon />
      </motion.div>

      {/* Confetti-like glow */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 1.5 }}
        style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,201,167,0.08), transparent)" }}
      />

      <div className="text-center space-y-2">
        <p className="font-display font-bold text-white text-lg">Analysis Complete!</p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          اكتمل التحليل — Review results in the panel
        </p>
      </div>
    </motion.div>
  );

  // ── ERROR STATE ─────────────────────────────────────────
  const ErrorState = (
    <motion.div
      key="error"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center h-full gap-5 text-center"
    >
      <AlertIcon />
      <div className="space-y-2">
        <p className="font-display font-semibold" style={{ color: "var(--danger)" }}>
          Analysis Failed
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)", maxWidth: "260px" }}>
          {errorMessage || "Please try again with a different image"}
        </p>
      </div>
      <button className="btn-ghost text-sm" onClick={() => window.location.reload()}>
        🔄 Try Again
      </button>
    </motion.div>
  );

  return (
    <div
      {...(isInteractive ? getRootProps() : {})}
      id="upload-zone"
      className={`
        relative rounded-3xl glass
        ${isDragActive ? "dropzone-hover" : "dropzone-idle"}
        ${isInteractive ? "cursor-pointer" : "cursor-default"}
        transition-all duration-300
      `}
      style={{ minHeight: "440px", display: "flex", flexDirection: "column" }}
    >
      {isInteractive && <input {...getInputProps()} id="file-input" />}

      {/* Drag-active glow ring */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(0,212,255,0.06), transparent)",
              border: "2px solid var(--cyan)",
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 p-8">
        <AnimatePresence mode="wait">
          {uploadState === "idle" && IdleState}
          {(uploadState === "hover" || (uploadedFile && uploadState !== "processing" && uploadState !== "complete" && uploadState !== "error")) && ReadyState}
          {uploadState === "processing" && ProcessingState}
          {uploadState === "complete" && CompleteState}
          {uploadState === "error" && ErrorState}
        </AnimatePresence>
      </div>
    </div>
  );
}
