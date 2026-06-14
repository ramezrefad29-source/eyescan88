"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { APP_NAME, MODEL_VERSION, MODEL_ACCURACY } from "@/lib/constants";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/dashboard", label: "🔬 فحص جديد" },
  { href: "/doctor/dashboard", label: "📁 لوحة الطبيب" },
  { href: "/history", label: "📜 السجل المحلي" },
  { href: "/clinics", label: "🏥 أقرب عيادة" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("eyescan_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("eyescan_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass-strong sticky top-0 z-50"
      style={{ borderBottom: "1px solid var(--glass-border)", borderRadius: 0 }}
      id="navbar"
    >
      <div className="max-w-7xl mx-auto px-6" style={{ height: "var(--nav-h)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 group" id="logo-link" style={{ textDecoration: "none" }}>
          <div className="relative" style={{ width: "40px", height: "40px" }}>
            {/* Outer rotating ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "1.5px solid rgba(0,212,255,0.35)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
            />
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(0,212,255,0.12), transparent 70%)" }} />
            {/* Eye SVG */}
            <svg className="absolute inset-0 w-10 h-10" viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00D4FF" />
                  <stop offset="1" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="7.5" stroke="url(#logoGrad)" strokeWidth="1.5" />
              <circle cx="20" cy="20" r="3" fill="url(#logoGrad)" />
              <path d="M4 20C4 20 10 10 20 10C30 10 36 20 36 20C36 20 30 30 20 30C10 30 4 20 4 20Z"
                stroke="url(#logoGrad)" strokeWidth="1.2" opacity="0.65" fill="none" />
              <circle cx="17.5" cy="17.5" r="1.2" fill="white" opacity="0.55" />
            </svg>
          </div>

          <div>
            <div className="font-display font-bold text-base leading-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              {APP_NAME}
            </div>
            <div className="text-xs font-mono" style={{ color: "var(--text-muted)", letterSpacing: "0.03em" }}>
              Medical AI · Eye Diagnostics
            </div>
          </div>
        </Link>

        {/* ── Center Nav Links ── */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link"
              style={{
                color: pathname === link.href ? "var(--cyan)" : undefined,
                background: pathname === link.href ? "var(--cyan-dim)" : undefined,
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Right: Status + CTA ── */}
        <div className="flex items-center gap-4">
          {/* Live model badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.18)" }}>
            <motion.div
              className="rounded-full"
              style={{ width: "6px", height: "6px", background: "var(--success)" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs font-mono" style={{ color: "var(--success)" }}>
              {MODEL_VERSION} · {MODEL_ACCURACY} acc
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border bg-white/[0.02] hover:bg-white/[0.08] active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center text-sm print:hidden"
            style={{
              borderColor: "var(--glass-border)",
              color: "var(--cyan)",
              width: "36px",
              height: "36px"
            }}
            title={theme === "dark" ? "تفعيل الوضع الساطع (Clinical Light Mode)" : "تفعيل الوضع الداكن (Cyberpunk Dark)"}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </motion.div>
          </button>

          <Link
            href="/dashboard"
            className="btn-primary"
            style={{ padding: "10px 20px", fontSize: "0.85rem" }}
            id="start-scan-nav-btn"
          >
            🔬 Start Scan
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
