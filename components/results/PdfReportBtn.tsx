"use client";

import { useCallback } from "react";
import { AnalysisResult } from "@/lib/types";

interface PdfReportBtnProps {
  result: AnalysisResult;
  previewUrl?: string | null;
}

export default function PdfReportBtn({ result, previewUrl }: PdfReportBtnProps) {
  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  return (
    <button
      className="btn-primary flex-1"
      style={{ fontSize: "0.875rem", padding: "12px 20px" }}
      id="download-report-btn"
      onClick={handlePrint}
    >
      📄 تصدير تقرير طبي (PDF)
    </button>
  );
}
