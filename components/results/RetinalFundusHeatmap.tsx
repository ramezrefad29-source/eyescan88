"use client";

import React, { useRef, useEffect, useState } from "react";
import { HeatmapCoordinate } from "@/lib/types";

interface RetinalFundusHeatmapProps {
  previewUrl?: string | null;
  heatmapCoordinates?: HeatmapCoordinate[];
  className?: string;
  showDetails?: boolean;
  heatmapBase64?: string;
  imageBase64?: string;
}

export default function RetinalFundusHeatmap({
  previewUrl,
  heatmapCoordinates = [],
  className = "",
  showDetails = true,
  heatmapBase64,
  imageBase64,
}: RetinalFundusHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 340, height: 340 });
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100
  const [isDragging, setIsDragging] = useState(false);

  // States to hold loaded images
  const [originalImg, setOriginalImg] = useState<HTMLImageElement | null>(null);
  const [heatmapImg, setHeatmapImg] = useState<HTMLImageElement | null>(null);

  // Handle responsiveness (updates canvas size but layout is handled by CSS aspect-ratio)
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setDimensions({ width: w, height: w });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, []);

  // Load original image
  useEffect(() => {
    const originalUrl = imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : previewUrl;
    if (originalUrl) {
      const img = new Image();
      img.onload = () => setOriginalImg(img);
      img.src = originalUrl;
    } else {
      setOriginalImg(null);
    }
  }, [imageBase64, previewUrl]);

  // Load heatmap image
  useEffect(() => {
    if (heatmapBase64) {
      const img = new Image();
      img.onload = () => setHeatmapImg(img);
      img.src = `data:image/jpeg;base64,${heatmapBase64}`;
    } else {
      setHeatmapImg(null);
    }
  }, [heatmapBase64]);

  // Draw on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = "#020817";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const retinaRadius = Math.min(width, height) * 0.44;

    const drawClinicalOverlay = (
      c: CanvasRenderingContext2D,
      cx: number, cy: number, r: number,
      w: number, h: number
    ) => {
      c.strokeStyle = "rgba(0, 212, 255, 0.25)";
      c.lineWidth = w * 0.0035;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.stroke();

      c.save();
      c.strokeStyle = "rgba(0, 212, 255, 0.12)";
      c.setLineDash([4, 6]);
      c.beginPath();
      c.arc(cx, cy, r + 8, 0, Math.PI * 2);
      c.stroke();
      c.restore();

      c.strokeStyle = "rgba(0, 212, 255, 0.1)";
      c.lineWidth = 1;
      
      c.beginPath();
      c.moveTo(cx - r, cy);
      c.lineTo(cx + r, cy);
      c.stroke();
      
      c.beginPath();
      c.moveTo(cx, cy - r);
      c.lineTo(cx, cy + r);
      c.stroke();

      c.save();
      c.strokeStyle = "rgba(124, 58, 237, 0.18)";
      c.setLineDash([2, 3]);
      c.beginPath();
      c.arc(cx + r * 0.15, cy - r * 0.02, r * 0.35, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    };

    const drawHeatmapLayer = (c: CanvasRenderingContext2D, w: number, h: number) => {
      if (!heatmapCoordinates || heatmapCoordinates.length === 0) return;

      heatmapCoordinates.forEach(coord => {
        const px = coord.x * w;
        const py = coord.y * h;
        const pr = coord.radius * (w / 340);
        const intensity = coord.intensity;

        c.save();
        c.globalCompositeOperation = "screen";

        const heatGrad = c.createRadialGradient(px, py, 1, px, py, pr);
        
        if (intensity >= 0.85) {
          heatGrad.addColorStop(0, `rgba(255, 0, 64, ${0.85 * intensity})`);
          heatGrad.addColorStop(0.25, `rgba(255, 60, 0, ${0.65 * intensity})`);
          heatGrad.addColorStop(0.55, `rgba(255, 180, 0, ${0.45 * intensity})`);
          heatGrad.addColorStop(1, "rgba(255, 180, 0, 0)");
        } else if (intensity >= 0.7) {
          heatGrad.addColorStop(0, `rgba(255, 120, 0, ${0.8 * intensity})`);
          heatGrad.addColorStop(0.4, `rgba(255, 200, 0, ${0.5 * intensity})`);
          heatGrad.addColorStop(0.75, `rgba(0, 212, 255, ${0.2 * intensity})`);
          heatGrad.addColorStop(1, "rgba(0, 212, 255, 0)");
        } else {
          heatGrad.addColorStop(0, `rgba(255, 214, 10, ${0.7 * intensity})`);
          heatGrad.addColorStop(0.4, `rgba(0, 212, 255, ${0.35 * intensity})`);
          heatGrad.addColorStop(1, "rgba(0, 212, 255, 0)");
        }

        c.fillStyle = heatGrad;
        c.beginPath();
        c.arc(px, py, pr, 0, Math.PI * 2);
        c.fill();

        if (showDetails) {
          c.strokeStyle = intensity >= 0.85 ? "rgba(255, 0, 64, 0.45)" : "rgba(255, 140, 66, 0.35)";
          c.lineWidth = 1.2;
          const boxSize = pr * 0.9;
          c.strokeRect(px - boxSize / 2, py - boxSize / 2, boxSize, boxSize);
          
          c.fillStyle = intensity >= 0.85 ? "#ff0040" : "#ff8c42";
          c.font = `bold ${Math.max(7, w * 0.02)}px monospace`;
          c.textAlign = "center";
          c.fillText(`CRD [${Math.round(intensity * 100)}%]`, px, py - boxSize / 2 - 4);
        }

        c.restore();
      });
    };

    // ─── 1. Draw original retina image (or procedural fallback) on the left (and full background) ───
    if (originalImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, retinaRadius, 0, Math.PI * 2);
      ctx.clip();

      const imgAspect = originalImg.width / originalImg.height;
      const canvasAspect = width / height;
      let drawWidth, drawHeight, xStart, yStart;

      if (imgAspect > canvasAspect) {
        drawHeight = height;
        drawWidth = height * imgAspect;
        xStart = (width - drawWidth) / 2;
        yStart = 0;
      } else {
        drawWidth = width;
        drawHeight = width / imgAspect;
        xStart = 0;
        yStart = (height - drawHeight) / 2;
      }

      ctx.drawImage(originalImg, xStart, yStart, drawWidth, drawHeight);
      ctx.restore();
    } else {
      // Procedural healthy retina background fallback
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, retinaRadius, 0, Math.PI * 2);
      ctx.clip();

      const bgGrad = ctx.createRadialGradient(
        centerX + retinaRadius * 0.15,
        centerY - retinaRadius * 0.05,
        retinaRadius * 0.2,
        centerX,
        centerY,
        retinaRadius
      );
      bgGrad.addColorStop(0, "#ff5e36");
      bgGrad.addColorStop(0.35, "#e03e1b");
      bgGrad.addColorStop(0.75, "#b51c02");
      bgGrad.addColorStop(1, "#360500");
      
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Optic Disc
      const opticX = centerX - retinaRadius * 0.45;
      const opticY = centerY + retinaRadius * 0.05;
      const opticRadius = retinaRadius * 0.16;

      const opticGrad = ctx.createRadialGradient(
        opticX, opticY, opticRadius * 0.2,
        opticX, opticY, opticRadius
      );
      opticGrad.addColorStop(0, "#ffffff");
      opticGrad.addColorStop(0.2, "#fff2b3");
      opticGrad.addColorStop(0.6, "#ffd480");
      opticGrad.addColorStop(0.9, "#e68a00");
      opticGrad.addColorStop(1, "rgba(230, 138, 0, 0)");
      
      ctx.fillStyle = opticGrad;
      ctx.beginPath();
      ctx.arc(opticX, opticY, opticRadius, 0, Math.PI * 2);
      ctx.fill();

      // Blood vessels
      ctx.strokeStyle = "rgba(168, 12, 12, 0.9)";
      ctx.lineWidth = width * 0.005;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const drawVein = (sx: number, sy: number, cx1: number, cy1: number, cx2: number, cy2: number, ex: number, ey: number) => {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey);
        ctx.stroke();
      };
      
      drawVein(opticX, opticY, opticX + retinaRadius * 0.2, opticY - retinaRadius * 0.6, centerX + retinaRadius * 0.2, centerY - retinaRadius * 0.5, centerX + retinaRadius * 0.6, centerY - retinaRadius * 0.1);
      drawVein(opticX, opticY, opticX + retinaRadius * 0.2, opticY + retinaRadius * 0.6, centerX + retinaRadius * 0.2, centerY + retinaRadius * 0.5, centerX + retinaRadius * 0.6, centerY + retinaRadius * 0.15);
      
      ctx.restore();
    }

    // ─── 2. Draw Heatmap (real image or procedural coordinate overlay) on the right of the slider ───
    if (heatmapImg || (originalImg && heatmapCoordinates.length > 0)) {
      ctx.save();
      // Clip to retina circle and also to the right of the sliderPos
      ctx.beginPath();
      ctx.arc(centerX, centerY, retinaRadius, 0, Math.PI * 2);
      ctx.clip();

      ctx.beginPath();
      const sliderX = (sliderPos / 100) * width;
      ctx.rect(sliderX, 0, width - sliderX, height);
      ctx.clip();

      const targetImg = heatmapImg || originalImg;
      if (targetImg) {
        const imgAspect = targetImg.width / targetImg.height;
        const canvasAspect = width / height;
        let drawWidth, drawHeight, xStart, yStart;

        if (imgAspect > canvasAspect) {
          drawHeight = height;
          drawWidth = height * imgAspect;
          xStart = (width - drawWidth) / 2;
          yStart = 0;
        } else {
          drawWidth = width;
          drawHeight = width / imgAspect;
          xStart = 0;
          yStart = (height - drawHeight) / 2;
        }

        ctx.drawImage(targetImg, xStart, yStart, drawWidth, drawHeight);
      }

      // If we don't have a Grad-CAM pre-baked image but have coordinates, overlay them
      if (!heatmapImg && heatmapCoordinates && heatmapCoordinates.length > 0) {
        drawHeatmapLayer(ctx, width, height);
      }

      ctx.restore();
    }

    // Draw clinical grids
    drawClinicalOverlay(ctx, centerX, centerY, retinaRadius, width, height);

    // Draw the Slider Line and Handle
    const sX = (sliderPos / 100) * width;
    ctx.save();
    ctx.strokeStyle = "rgba(0, 212, 255, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(0, 212, 255, 0.4)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(sX, centerY - retinaRadius);
    ctx.lineTo(sX, centerY + retinaRadius);
    ctx.stroke();

    // Handle Circle
    ctx.fillStyle = "#020817";
    ctx.strokeStyle = "rgba(0, 212, 255, 0.85)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(sX, centerY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Handle inner arrow icons (double side arrows ↔)
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0, 212, 255, 0.95)";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("↔", sX, centerY);
    ctx.restore();
  }, [dimensions, originalImg, heatmapImg, heatmapCoordinates, sliderPos, showDetails]);

  const handlePointerDown = () => {
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`relative w-full overflow-hidden rounded-3xl glass p-2 flex flex-col items-center justify-center select-none touch-none cursor-ew-resize ${className}`}
      style={{ background: "rgba(3, 13, 26, 0.4)", border: "1px solid rgba(0, 212, 255, 0.15)", aspectRatio: "1/1" }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <canvas ref={canvasRef} className="rounded-2xl block w-full h-full object-cover" />
        
        {/* Futuristic calibration marks */}
        <div className="absolute top-4 left-4 text-[8px] font-mono text-cyan-400/60 leading-none">
          SYS: ACTIVE<br/>CAL: OK
        </div>
        <div className="absolute top-4 right-4 text-[8px] font-mono text-cyan-400/60 leading-none text-right">
          RETINA SCAN<br/>HEATMAP MODE
        </div>
        <div className="absolute bottom-4 left-4 text-[8px] font-mono text-cyan-400/60 leading-none">
          RES: {dimensions.width}x{dimensions.width}<br/>ACC: 96.4%
        </div>
        <div className="absolute bottom-4 right-4 text-[8px] font-mono text-cyan-400/60 leading-none text-right">
          MODEL: v2.1<br/>MODE: CV_LOBE
        </div>
      </div>
      
      {showDetails && (previewUrl || heatmapBase64 || imageBase64) && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-sm text-right px-4 py-2 border-t border-white/5 flex justify-between items-center flex-row-reverse text-[10px] text-slate-400 rounded-b-2xl">
          <span className="font-mono text-cyan-400">↔ اسحب لمقارنة الصورة الأصلية بخريطة الحرارة</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-[0_0_6px_var(--cyan)]" />
            تحليل تفاعلي
          </span>
        </div>
      )}
    </div>
  );
}
