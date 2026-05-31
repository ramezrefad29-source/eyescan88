"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { APP_NAME, APP_TAGLINE, MODEL_ACCURACY, MODEL_VERSION } from "@/lib/constants";
import Navbar from "@/components/ui/Navbar";
import dynamic from "next/dynamic";

const Eye3D = dynamic(() => import("@/components/ui/Eye3D"), {
  ssr: false,
});

// ── Before/After Split comparison slider for retina ───────────────────
function PathologyCompareSlider() {
  const [sliderVal, setSliderVal] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateSlider(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateSlider(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updateSlider = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderVal(pct);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="relative w-full aspect-video rounded-2xl overflow-hidden cursor-ew-resize select-none touch-none border border-white/10"
      style={{ minHeight: "260px" }}
    >
      {/* Healthy Retina (Base layer) */}
      <div className="absolute inset-0 w-full h-full bg-slate-950">
        <img
          src="/healthy_retina.png"
          alt="Healthy Retina"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Label Left */}
        <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-cyan-400">
          شبكية سليمة (Healthy Retina)
        </div>
      </div>

      {/* Diseased Retina (Overlay layer, clipped based on sliderVal) */}
      <div
        className="absolute inset-y-0 right-0 left-0 bg-slate-950 transition-all duration-75"
        style={{ clipPath: `polygon(0 0, ${sliderVal}% 0, ${sliderVal}% 100%, 0 100%)` }}
      >
        <img
          src="/diseased_retina.png"
          alt="Diseased Retina with DR"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: containerRef.current?.clientWidth || "100%" }}
        />
        {/* Label Right */}
        <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-red-400">
          اعتلال الشبكية (Diabetic Retinopathy)
        </div>
      </div>

      {/* Slider Line handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none"
        style={{ left: `${sliderVal}%`, boxShadow: "0 0 10px rgba(0, 212, 255, 0.8)" }}
      >
        {/* Handle circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center shadow-lg">
          <span className="text-[10px] text-cyan-400 font-bold">↔</span>
        </div>
      </div>
    </div>
  );
}

// ── 3D Eyeball progression showcase ──────────────────────────────────
function EyeballShowcase() {
  const [stage, setStage] = useState(0);

  const stageConfigs = [
    { label: "سليمة (Healthy)", color: "var(--cyan)", desc: "سليمة تماماً، دوران مستقر ولطيف مع وهج سيان خفيف." },
    { label: "خفيفة (Mild)", color: "#ffaa00", desc: "أعراض مبكرة، دوران أسرع قليلاً، مع ظهور وهج برتقالي خفيف." },
    { label: "متوسطة (Moderate)", color: "#ff7700", desc: "اعتلال متوسط، سرعة دوران متوسطة وتوهج برتقالي واضح." },
    { label: "شديدة (Severe)", color: "#ff0000", desc: "اعتلال شديد، دوران سريع وتوهج أحمر متقطع." },
    { label: "خطيرة (Proliferative)", color: "#ff0033", desc: "حالة حرجة، سرعة عالية مع اهتزاز مجهري وتوهج أحمر نابض." },
  ];

  return (
    <div className="flex flex-col h-full justify-between gap-6">
      {/* 3D Model Render box */}
      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40" style={{ height: "280px" }}>
        <Eye3D stage={stage} interactive={true} />
      </div>

      {/* Slider Controls */}
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-row-reverse">
          <span className="text-xs font-mono font-bold" style={{ color: stageConfigs[stage].color }}>
            Stage {stage}: {stageConfigs[stage].label}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">3D Pathology Preview</span>
        </div>

        {/* Input range slider */}
        <div className="relative pt-1">
          <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={stage}
            onChange={(e) => setStage(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800 outline-none accent-cyan-400"
            style={{
              background: `linear-gradient(to right, var(--cyan) 0%, ${stageConfigs[stage].color} ${stage * 25}%, #1e293b ${stage * 25}%)`
            }}
          />
          {/* Tic marks */}
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1.5 px-0.5">
            <span>S0</span>
            <span>S1</span>
            <span>S2</span>
            <span>S3</span>
            <span>S4</span>
          </div>
        </div>

        {/* Dynamic description */}
        <p className="text-xs text-slate-400 leading-relaxed text-right min-h-[40px]">
          {stageConfigs[stage].desc}
        </p>
      </div>
    </div>
  );
}

// ── Animated Retina Orb ──────────────────────────────────────
function RetinaOrb() {
  return (
    <div className="relative" style={{ width: "340px", height: "340px", margin: "0 auto" }}>
      {/* Outer rings */}
      {[1, 0.78, 0.58].map((scale, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full"
          style={{
            borderColor: i === 0 ? "rgba(0,212,255,0.14)" : i === 1 ? "rgba(124,58,237,0.10)" : "rgba(0,212,255,0.06)",
            transform: `scale(${scale})`,
            transformOrigin: "center",
            borderStyle: i === 1 ? "dashed" : "solid",
            borderWidth: "1px",
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 18 + i * 8, repeat: Infinity, ease: "linear" }}
        />
      ))}

      {/* Glow backdrop */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 40% 40%, rgba(0,212,255,0.18) 0%, rgba(124,58,237,0.12) 40%, transparent 70%)",
          filter: "blur(28px)",
        }}
      />

      {/* Main eye 3D Model */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div style={{ width: "240px", height: "240px" }}>
          <Eye3D />
        </div>
      </motion.div>

      {/* Scanning beam */}
      <motion.div
        className="absolute left-8 right-8 rounded-full"
        style={{
          height: "2px",
          background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.85), transparent)",
          boxShadow: "0 0 24px rgba(0,212,255,0.65)",
        }}
        animate={{ top: ["28%", "72%", "28%"] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Corner HUD brackets */}
      {[
        { top: 0, left: 0, bt: true, bl: true },
        { top: 0, right: 0, bt: true, br: true },
        { bottom: 0, left: 0, bb: true, bl: true },
        { bottom: 0, right: 0, bb: true, br: true },
      ].map((pos, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          top: pos.top !== undefined ? "16px" : undefined,
          bottom: pos.bottom !== undefined ? "16px" : undefined,
          left: pos.left !== undefined ? "16px" : undefined,
          right: pos.right !== undefined ? "16px" : undefined,
          width: "22px", height: "22px",
          borderTop: pos.bt ? "1.5px solid rgba(0,212,255,0.45)" : undefined,
          borderBottom: pos.bb ? "1.5px solid rgba(0,212,255,0.45)" : undefined,
          borderLeft: pos.bl ? "1.5px solid rgba(0,212,255,0.45)" : undefined,
          borderRight: pos.br ? "1.5px solid rgba(0,212,255,0.45)" : undefined,
        }} />
      ))}
    </div>
  );
}

// ── Feature Card ─────────────────────────────────────────────
function FeatureCard({ icon, title, desc, delay, tag }: {
  icon: string; title: string; desc: string; delay: number; tag?: string;
}) {
  return (
    <motion.div
      className="glass card-lift rounded-2xl p-7 space-y-4 group"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
    >
      <div className="flex items-start justify-between">
        <div style={{
          width: "52px", height: "52px", borderRadius: "14px",
          background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.6rem",
        }}>
          {icon}
        </div>
        {tag && (
          <span style={{
            fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em",
            padding: "3px 10px", borderRadius: "20px",
            background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)",
            color: "var(--cyan)", textTransform: "uppercase",
          }}>
            {tag}
          </span>
        )}
      </div>
      <div>
        <h3 className="font-display font-semibold text-white mb-2" style={{ fontSize: "1.05rem" }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
      </div>
    </motion.div>
  );
}

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ value, label, sublabel }: { value: string; label: string; sublabel?: string }) {
  return (
    <div className="text-center space-y-2">
      <div className="stat-value">{value}</div>
      <div className="font-display font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{label}</div>
      {sublabel && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{sublabel}</div>}
    </div>
  );
}

// ── How It Works Step ────────────────────────────────────────
function StepCard({ num, icon, title, desc, delay }: {
  num: string; icon: string; title: string; desc: string; delay: number;
}) {
  return (
    <motion.div
      className="flex flex-col items-center text-center gap-4"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
    >
      <div className="relative">
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "rgba(0,212,255,0.06)",
          border: "1px solid rgba(0,212,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.9rem",
        }}>
          {icon}
        </div>
        <div style={{
          position: "absolute", top: "-6px", right: "-6px",
          width: "22px", height: "22px", borderRadius: "50%",
          background: "var(--cyan)", color: "var(--bg-void)",
          fontSize: "0.65rem", fontWeight: 800, fontFamily: "var(--font-display)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {num}
        </div>
      </div>
      <div>
        <h4 className="font-display font-semibold text-white mb-2">{title}</h4>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "200px", margin: "0 auto" }}>{desc}</p>
      </div>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen relative">
      <div className="gradient-mesh" />
      <div className="neural-grid" />

      <div className="relative z-10">
        <Navbar />

        {/* ══════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════ */}
        <section
          className="max-w-7xl mx-auto px-6"
          style={{ paddingTop: "80px", paddingBottom: "100px" }}
          id="hero-section"
        >
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Left: Text */}
            <div className="flex-1 space-y-8 text-center lg:text-right order-2 lg:order-1">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: "rgba(0,212,255,0.07)",
                  border: "1px solid rgba(0,212,255,0.18)",
                }}
              >
                <span className="w-2 h-2 rounded-full animate-blink" style={{ background: "var(--cyan)" }} />
                <span className="text-xs font-mono" style={{ color: "var(--cyan)", letterSpacing: "0.04em" }}>
                  {MODEL_VERSION} — {MODEL_ACCURACY} Diagnostic Accuracy
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="font-display font-bold leading-tight"
                style={{ fontSize: "clamp(2.4rem, 5vw, 4.2rem)", letterSpacing: "-0.02em" }}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
              >
                <span className="text-gradient-cyan">تشخيص</span>
                <br />
                <span style={{ color: "var(--text-primary)" }}>اعتلال الشبكية</span>
                <br />
                <span style={{ color: "var(--text-secondary)", fontSize: "0.62em", fontWeight: 600 }}>
                  Cone-Rod Dystrophy · AI Powered
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-lg leading-relaxed"
                style={{ color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.75 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {APP_TAGLINE}. أسقط صورة الشبكية للحصول على تشخيص دقيق في ثوانٍ — مع تحديد المناطق المتأثرة وتوصيات طبية مفصّلة.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-end"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
              >
                <Link href="/dashboard" className="btn-primary" id="hero-cta-btn"
                  style={{ padding: "15px 36px", fontSize: "1rem" }}>
                  🔬 Start Free Scan
                </Link>
                <a href="#how-it-works" className="btn-ghost" id="learn-more-btn">
                  Learn More ↓
                </a>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                className="flex flex-wrap items-center gap-4 justify-center lg:justify-end"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.85 }}
              >
                {["No registration required", "Results in &lt;4 seconds", "Privacy-first"].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--success)" }}>✓</span>
                    {t}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Retina Orb */}
            <motion.div
              className="flex-1 flex justify-center order-1 lg:order-2"
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.85, ease: "easeOut" }}
            >
              <RetinaOrb />
            </motion.div>
          </div>
        </section>

        {/* ── Stats Band ── */}
        <div className="section-divider" />
        <section className="glass-strong py-14" id="stats-section">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              <StatCard value="96.4%" label="Diagnostic Accuracy" sublabel="On benchmark dataset" />
              <StatCard value="&lt;4s"  label="Processing Time"    sublabel="Per retinal image" />
              <StatCard value="50K+"  label="Training Images"    sublabel="Annotated medical data" />
              <StatCard value="5"     label="Detectable Stages"  sublabel="Normal → Critical" />
            </div>
          </div>
        </section>
        <div className="section-divider" />

        {/* ══════════════════════════════════════
            PATHOLOGY SHOWCASE SECTION
        ══════════════════════════════════════ */}
        <section
          className="max-w-7xl mx-auto px-6 py-20"
          id="pathology-showcase"
        >
          <motion.div
            className="text-center mb-16 space-y-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--cyan)" }}>
              التشخيص البصري التفاعلي
            </div>
            <h2 className="font-display font-bold text-white" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
              Interactive Pathology Showcase
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "580px", margin: "0 auto", fontSize: "0.95rem" }}>
              شاهد كيف يؤثر اعتلال الشبكية السكري على بنية العين والشبكية من خلال النموذج ثلاثي الأبعاد التفاعلي وصور الفحص الحقيقية
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-stretch">
            {/* Left: 3D model slider */}
            <div className="glass-strong rounded-3xl p-6 md:p-8 flex flex-col justify-between border border-cyan-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full filter blur-xl pointer-events-none" />
              <div className="space-y-4">
                <h3 className="font-display font-bold text-white text-lg flex items-center justify-end gap-2 flex-row-reverse">
                  <span>🔮 نموذج العين ثلاثي الأبعاد والتفاعلي</span>
                </h3>
                <p className="text-xs text-slate-400 text-right leading-relaxed">
                  تحكّم في شدة الإصابة باستخدام شريط التمرير لمشاهدة التغيرات الهيكلية في سرعة الدوران والوهج التحذيري.
                </p>
              </div>
              <div className="mt-6 flex-1">
                <EyeballShowcase />
              </div>
            </div>

            {/* Right: before/after split image comparison slider */}
            <div className="glass-strong rounded-3xl p-6 md:p-8 flex flex-col justify-between border border-violet-500/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-24 h-24 bg-violet-500/5 rounded-full filter blur-xl pointer-events-none" />
              <div className="space-y-4">
                <h3 className="font-display font-bold text-white text-lg flex items-center justify-end gap-2 flex-row-reverse">
                  <span>📸 مقارنة صور الشبكية الحقيقية</span>
                </h3>
                <p className="text-xs text-slate-400 text-right leading-relaxed">
                  اسحب المقبض في المنتصف لمقارنة فحص شبكية عين سليمة تماماً مقابل شبكية مصابة بالاعتلال السكري بشكل تفاعلي.
                </p>
              </div>
              <div className="mt-6 flex-1 flex flex-col justify-center">
                <PathologyCompareSlider />
              </div>
            </div>
          </div>
        </section>
        <div className="section-divider" />

        {/* ══════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════ */}
        <section
          className="max-w-6xl mx-auto px-6"
          style={{ paddingTop: "var(--section-gap)", paddingBottom: "var(--section-gap)" }}
          id="how-it-works"
        >
          <motion.div
            className="text-center mb-16 space-y-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--cyan)" }}>
              Simple Process
            </div>
            <h2 className="font-display font-bold" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", color: "var(--text-primary)" }}>
              How It Works
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto" }}>
              From upload to diagnosis in three simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-9 left-1/6 right-1/6 h-px"
              style={{ background: "linear-gradient(90deg, transparent, var(--glass-border), var(--glass-border), transparent)" }} />

            <StepCard num="1" icon="📤" delay={0.1}
              title="Upload Image"
              desc="Drop any retinal fundus or OCT image. Supports JPG, PNG, TIFF, BMP up to 20MB." />
            <StepCard num="2" icon="🧠" delay={0.25}
              title="AI Analysis"
              desc="Our deep learning model analyzes retinal layers and detects anomalies in under 4 seconds." />
            <StepCard num="3" icon="📋" delay={0.4}
              title="Get Report"
              desc="Receive a detailed diagnosis with affected zones map, confidence score, and medical recommendations." />
          </div>
        </section>

        <div className="section-divider" />

        {/* ══════════════════════════════════════
            FEATURES
        ══════════════════════════════════════ */}
        <section
          className="max-w-7xl mx-auto px-6"
          style={{ paddingTop: "var(--section-gap)", paddingBottom: "var(--section-gap)" }}
          id="features-section"
        >
          <motion.div
            className="text-center mb-16 space-y-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--violet)" }}>
              Capabilities
            </div>
            <h2 className="font-display font-bold" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
              <span style={{ color: "var(--text-primary)" }}>Medical AI from </span>
              <span className="text-gradient-violet">the Future</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto" }}>
              Built on the latest deep learning architectures for retinal analysis
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon="🎯" tag="Core" delay={0.1}
              title="استثنائية دقة"
              desc="نموذج مدرّب على آلاف الصور الطبية المشروحة لاكتشاف Cone-Rod Dystrophy بدقة تتجاوز 96%." />
            <FeatureCard icon="⚡" tag="Speed" delay={0.15}
              title="Instant Analysis"
              desc="Full diagnostic report generated in under 4 seconds using optimized GPU inference pipeline." />
            <FeatureCard icon="🔒" tag="Privacy" delay={0.2}
              title="Zero Data Retention"
              desc="Images processed locally and never stored on any server. Your medical data stays private." />
            <FeatureCard icon="🗺️" tag="Spatial" delay={0.25}
              title="Zone Mapping"
              desc="Precise identification of affected retinal areas with percentage damage scores for each zone." />
            <FeatureCard icon="📋" tag="Report" delay={0.3}
              title="Complete Medical Report"
              desc="Personalized recommendations, disease stage, confidence level — all in a printable report." />
            <FeatureCard icon="🔬" tag="Staging" delay={0.35}
              title="5-Stage Detection"
              desc="Detects disease from Stage I (Mild) to Stage V (Critical) with fine-grained differentiation." />
          </div>
        </section>

        <div className="section-divider" />

        {/* ══════════════════════════════════════
            CTA BAND
        ══════════════════════════════════════ */}
        <section
          className="relative overflow-hidden"
          style={{ paddingTop: "var(--section-gap)", paddingBottom: "var(--section-gap)" }}
          id="cta-section"
        >
          <div className="absolute inset-0" style={{
            background: "linear-gradient(135deg, rgba(0,212,255,0.04) 0%, rgba(124,58,237,0.07) 100%)",
          }} />
          <div className="relative max-w-3xl mx-auto px-6 text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-xs font-mono uppercase tracking-widest mb-5" style={{ color: "var(--cyan)" }}>
                Ready to Start?
              </div>
              <h2 className="font-display font-bold" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", letterSpacing: "-0.02em" }}>
                <span className="text-gradient-cyan">Diagnose Now</span>
                <br />
                <span style={{ color: "var(--text-primary)" }}>Completely Free</span>
              </h2>
            </motion.div>

            <motion.p
              style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: 1.75 }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              No registration or subscription needed. Drop your retinal image and get your diagnosis instantly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/dashboard" className="btn-primary" id="final-cta-btn"
                style={{ padding: "16px 44px", fontSize: "1.05rem" }}>
                🚀 Start Free — No Sign Up
              </Link>
              <a href="#features-section" className="btn-ghost">
                Explore Features
              </a>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FOOTER
        ══════════════════════════════════════ */}
        <div className="section-divider" />
        <footer className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div style={{
                width: "30px", height: "30px", borderRadius: "50%",
                background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem",
              }}>👁</div>
              <div>
                <div className="font-display font-bold text-sm" style={{ color: "var(--text-primary)" }}>{APP_NAME}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>Medical AI Platform</div>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              {["Home", "Dashboard", "Privacy", "About"].map((l) => (
                <a key={l} href="#" className="text-xs transition-colors"
                  style={{ color: "var(--text-muted)", textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  {l}
                </a>
              ))}
            </div>

            {/* Copyright */}
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              © 2026 {APP_NAME} · For assistive diagnostic purposes only.<br />
              Not a substitute for professional medical advice.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
