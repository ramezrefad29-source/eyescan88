import { NextRequest, NextResponse } from "next/server";
import { ApiAnalyzeResponse, AnalysisResult } from "@/lib/types";
import { MODEL_VERSION } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 30;

const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || "http://localhost:5000";

export async function POST(req: NextRequest): Promise<NextResponse<ApiAnalyzeResponse>> {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: "لم يتم إرسال أي صورة" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/tiff", "image/bmp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { success: false, error: "نوع الملف غير مدعوم. يُقبل JPG، PNG، TIFF، BMP فقط." },
        { status: 400 }
      );
    }

    // Validate file size (20MB max)
    if (imageFile.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "حجم الملف يتجاوز الحد المسموح (20MB)" },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // Send image to Python Flask prediction server
    // ─────────────────────────────────────────────────────────────
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const pythonFormData = new FormData();
    const blob = new Blob([buffer], { type: imageFile.type });
    pythonFormData.append("image", blob, imageFile.name || "image.jpg");

    let modelResponse: Response;
    try {
      modelResponse = await fetch(`${PYTHON_SERVER_URL}/predict`, {
        method: "POST",
        body: pythonFormData,
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "فشل الاتصال بخادم الذكاء الاصطناعي. تأكد من تشغيل predict_server.py" },
        { status: 503 }
      );
    }

    if (!modelResponse.ok) {
      const errorData = await modelResponse.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: (errorData as Record<string, string>).error || "خطأ من نموذج الذكاء الاصطناعي" },
        { status: 502 }
      );
    }

    const modelData = await modelResponse.json() as Record<string, unknown>;

    const result: AnalysisResult = {
      diagnosis: modelData.diagnosis as string,
      diagnosisAr: modelData.diagnosis_ar as string | undefined,
      confidence: modelData.confidence as number,
      severity: modelData.severity as AnalysisResult["severity"],
      stage: modelData.stage as string,
      affectedZones: (modelData.affected_zones as AnalysisResult["affectedZones"]) || [],
      recommendations: (modelData.recommendations as string[]) || [],
      processingTimeMs: (modelData.processing_time_ms as number) || 0,
      modelVersion: MODEL_VERSION,
      scanId: `CRD-${Date.now()}`,
      heatmapCoordinates: (modelData.heatmap_coordinates as AnalysisResult["heatmapCoordinates"]) || [],
      heatmapBase64: modelData.heatmap_base64 as string | undefined,
      imageBase64: buffer.toString("base64"),
    };

    return NextResponse.json({ success: true, result });

  } catch (error: unknown) {
    console.error("[analyze] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "خطأ غير متوقع في الخادم",
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET(): Promise<NextResponse> {
  // Also check Python server health
  let pythonStatus = "unknown";
  try {
    const res = await fetch(`${PYTHON_SERVER_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      pythonStatus = "ok";
    } else {
      pythonStatus = "error";
    }
  } catch {
    pythonStatus = "offline";
  }

  return NextResponse.json({
    status: "ok",
    model: MODEL_VERSION,
    pythonServer: pythonStatus,
    timestamp: new Date().toISOString(),
  });
}

