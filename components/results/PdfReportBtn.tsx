"use client";

import { useRef, useCallback } from "react";
import { AnalysisResult } from "@/lib/types";
import { SEVERITY_CONFIG } from "@/lib/constants";

interface PdfReportBtnProps {
  result: AnalysisResult;
  previewUrl?: string | null;
}

export default function PdfReportBtn({ result, previewUrl }: PdfReportBtnProps) {
  const generating = useRef(false);

  const handleGenerate = useCallback(async () => {
    if (generating.current) return;
    generating.current = true;

    const cfg = SEVERITY_CONFIG[result.severity];
    const W = 794;   // A4 width at 96dpi
    const H = 1123;  // A4 height at 96dpi
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // ── Background ──
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#0a0e1a");
    bgGrad.addColorStop(1, "#0d1225");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Top accent bar ──
    const barGrad = ctx.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, "#00D4FF");
    barGrad.addColorStop(1, "#7C3AED");
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, W, 6);

    // ── Header ──
    let y = 50;
    ctx.fillStyle = "#00D4FF";
    ctx.font = "bold 28px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("👁 RetinaScan AI", 40, y);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Report ID: #${result.scanId}`, W - 40, y - 8);
    ctx.fillText(
      result.timestamp ? new Date(result.timestamp).toLocaleString("en-US") : new Date().toLocaleString("en-US"),
      W - 40, y + 10
    );

    // ── Divider ──
    y += 30;
    ctx.strokeStyle = "rgba(0,212,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke();

    // ── Title ──
    y += 40;
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Clinical Diagnostic Report", 40, y);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
    y += 22;
    ctx.fillText("AI-Powered Retinal Analysis — For Assistive Purposes Only", 40, y);

    // ── Patient Info Card ──
    y += 40;
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.strokeStyle = "rgba(0,212,255,0.12)";
    roundRect(ctx, 40, y, W - 80, 80, 12, true, true);

    ctx.fillStyle = "rgba(0,212,255,0.6)";
    ctx.font = "bold 10px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("PATIENT", 60, y + 22);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(result.patientName || "N/A", 60, y + 46);

    ctx.fillStyle = "rgba(0,212,255,0.6)";
    ctx.font = "bold 10px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("PASSCODE", 400, y + 22);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillText(result.patientPassword || "—", 400, y + 46);

    ctx.fillStyle = "rgba(0,212,255,0.6)";
    ctx.font = "bold 10px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("MODEL", 600, y + 22);
    ctx.fillStyle = "#00D4FF";
    ctx.font = "bold 14px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(result.modelVersion, 600, y + 46);

    // ── Diagnosis Box ──
    y += 110;
    ctx.fillStyle = hexToRgba(cfg.color, 0.06);
    ctx.strokeStyle = hexToRgba(cfg.color, 0.25);
    roundRect(ctx, 40, y, W - 80, 110, 12, true, true);

    ctx.fillStyle = hexToRgba(cfg.color, 0.7);
    ctx.font = "bold 10px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("DIAGNOSIS", 60, y + 24);

    ctx.fillStyle = cfg.color;
    ctx.font = "bold 24px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(result.diagnosis, 60, y + 56);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "14px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(result.stage, 60, y + 82);

    // Confidence circle
    const cx = W - 110;
    const cy = y + 55;
    ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 6; ctx.stroke();
    const pct = Math.round(result.confidence * 100);
    ctx.beginPath();
    ctx.arc(cx, cy, 34, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
    ctx.strokeStyle = cfg.color; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = cfg.color;
    ctx.font = "bold 20px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${pct}%`, cx, cy + 7);
    ctx.textAlign = "left";

    // ── Retinal Image (if available) ──
    y += 140;
    if (previewUrl) {
      try {
        const img = await loadImage(previewUrl);
        const imgH = 200;
        const imgW = 200;
        ctx.save();
        ctx.beginPath();
        roundRectPath(ctx, 40, y, imgW, imgH, 12);
        ctx.clip();
        ctx.drawImage(img, 40, y, imgW, imgH);
        ctx.restore();
        ctx.strokeStyle = "rgba(0,212,255,0.2)";
        roundRect(ctx, 40, y, imgW, imgH, 12, false, true);

        // Heatmap beside it
        if (result.heatmapBase64) {
          try {
            const heatImg = await loadImage(`data:image/png;base64,${result.heatmapBase64}`);
            ctx.save();
            ctx.beginPath();
            roundRectPath(ctx, 260, y, imgW, imgH, 12);
            ctx.clip();
            ctx.drawImage(heatImg, 260, y, imgW, imgH);
            ctx.restore();
            ctx.strokeStyle = "rgba(255,100,50,0.3)";
            roundRect(ctx, 260, y, imgW, imgH, 12, false, true);

            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.font = "10px 'Segoe UI', system-ui, sans-serif";
            ctx.fillText("Original Fundus", 40, y + imgH + 16);
            ctx.fillText("Grad-CAM Heatmap", 260, y + imgH + 16);
          } catch {}
        }
        y += imgH + 30;
      } catch {
        // skip image if can't load
      }
    }

    // ── Affected Zones ──
    y += 10;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Affected Retinal Zones", 40, y);
    y += 20;

    for (const zone of result.affectedZones) {
      const zCfg = SEVERITY_CONFIG[zone.severity];
      // Bar bg
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      roundRect(ctx, 40, y, W - 80, 28, 6, true, false);
      // Bar fill
      ctx.fillStyle = hexToRgba(zCfg.color, 0.2);
      roundRect(ctx, 40, y, (W - 80) * (zone.percentage / 100), 28, 6, true, false);
      // Text
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(zone.name, 54, y + 18);
      ctx.fillStyle = zCfg.color;
      ctx.font = "bold 12px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${zone.percentage}%  ${zCfg.label}`, W - 54, y + 18);
      ctx.textAlign = "left";
      y += 36;
    }

    // ── Recommendations ──
    y += 15;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Medical Recommendations", 40, y);
    y += 22;

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
    for (const rec of result.recommendations) {
      // Wrap text
      const lines = wrapText(ctx, rec, W - 120);
      for (const line of lines) {
        if (y > H - 80) break;
        ctx.fillStyle = "#00D4FF";
        ctx.fillText("●", 50, y);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(line, 68, y);
        y += 20;
      }
      y += 4;
    }

    // ── Footer ──
    y = H - 50;
    ctx.strokeStyle = "rgba(0,212,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke();
    y += 20;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "10px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("RetinaScan AI © 2026 — For assistive diagnostic purposes only. Not a substitute for professional medical advice.", 40, y);

    // Bottom accent bar
    const btmGrad = ctx.createLinearGradient(0, 0, W, 0);
    btmGrad.addColorStop(0, "#00D4FF");
    btmGrad.addColorStop(1, "#7C3AED");
    ctx.fillStyle = btmGrad;
    ctx.fillRect(0, H - 4, W, 4);

    // ── Download ──
    canvas.toBlob((blob) => {
      if (!blob) { generating.current = false; return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RetinaScan_Report_${result.scanId}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      generating.current = false;
    }, "image/png");
  }, [result, previewUrl]);

  return (
    <button
      className="btn-primary flex-1"
      style={{ fontSize: "0.875rem", padding: "12px 20px" }}
      id="download-report-btn"
      onClick={handleGenerate}
    >
      📄 Download Report
    </button>
  );
}

// ── Helpers ──────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function hexToRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  fill = true, stroke = false
) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
