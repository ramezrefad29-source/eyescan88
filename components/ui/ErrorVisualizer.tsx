"use client";

import React, { useState, useEffect } from "react";

export default function ErrorVisualizer() {
  const [errors, setErrors] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleError = (event: ErrorEvent) => {
      const msg = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
      setErrors((prev) => [...prev, msg]);
      setVisible(true);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = `Unhandled Rejection: ${event.reason?.message || String(event.reason)}`;
      setErrors((prev) => [...prev, msg]);
      setVisible(true);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    // Also hijack console.error to show logs
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" ");
      setErrors((prev) => [...prev, `Console Error: ${msg}`]);
      setVisible(true);
      originalConsoleError.apply(console, args);
    };

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      console.error = originalConsoleError;
    };
  }, []);

  if (!visible || errors.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        right: "20px",
        zIndex: 99999,
        background: "rgba(255, 0, 64, 0.95)",
        color: "#fff",
        padding: "16px",
        borderRadius: "12px",
        fontFamily: "monospace",
        fontSize: "12px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        maxHeight: "50vh",
        overflowY: "auto",
        border: "2px solid #fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontWeight: "bold" }}>
        <span>⚠️ خطأ تشغيل متصفح الجوال (Client-side JS Error):</span>
        <button
          onClick={() => setVisible(false)}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
        >
          إغلاق [X]
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {errors.map((err, i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.3)", paddingBottom: "6px" }}>
            {err}
          </div>
        ))}
      </div>
    </div>
  );
}
