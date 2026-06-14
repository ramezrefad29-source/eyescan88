// ============================================================
// RetinaScan AI — Core Type Definitions
// ============================================================

export type UploadState = "idle" | "hover" | "uploading" | "processing" | "complete" | "error";

export type DiagnosisSeverity = "Normal" | "Mild" | "Moderate" | "Severe" | "Critical";

export interface AnalysisResult {
  diagnosis: string;
  diagnosisAr?: string;
  confidence: number; // 0–1
  severity: DiagnosisSeverity;
  stage: string;
  affectedZones: AffectedZone[];
  recommendations: string[];
  processingTimeMs: number;
  modelVersion: string;
  scanId: string;
  patientName?: string;
  patientPassword?: string;
  qrCodeUrl?: string;
  timestamp?: string;
  heatmapCoordinates?: HeatmapCoordinate[];
  heatmapBase64?: string;
  imageBase64?: string;
}

export interface HeatmapCoordinate {
  x: number;          // 0 to 1 ratio relative to image width
  y: number;          // 0 to 1 ratio relative to image height
  intensity: number;  // 0 to 1
  radius: number;     // in pixels
}

export interface AffectedZone {
  name: string;
  severity: DiagnosisSeverity;
  percentage: number; // 0–100 area affected
}

export interface UploadedFile {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

export interface ApiAnalyzeRequest {
  imageBase64: string;
  imageType: string;
}

export interface ApiAnalyzeResponse {
  success: boolean;
  result?: AnalysisResult;
  error?: string;
}
