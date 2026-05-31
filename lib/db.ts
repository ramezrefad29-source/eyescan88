// ============================================================
// RetinaScan AI — High-Performance In-Memory Cached Database Client
// Server-side only (Node.js / Next.js API routes)
// Handles extremely high concurrency, non-blocking asynchronous writes,
// and safe atomic file replacements to prevent database corruption.
// ============================================================

import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { AnalysisResult } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "scans.json");

export interface ScanRecord extends AnalysisResult {
  doctorNotes?: string;
  doctorSignedOff?: boolean;
  doctorSignedBy?: string;
  doctorSignedAt?: string;
}

// ── In-Memory Cache & Safe Async Write Queue ────────────────
let scansCache: ScanRecord[] | null = null;
let isWriting = false;
const writeQueue: { scans: ScanRecord[] }[] = [];

// ── Ensure the data directory and file exist ──────────────
function ensureDb(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ scans: [] }, null, 2), "utf8");
  }
}

// ── Load cache from disk once ─────────────────────────────
function loadCache(): ScanRecord[] {
  if (scansCache !== null) return scansCache;
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    scansCache = parsed.scans || [];
  } catch (err) {
    console.error("Error reading database:", err);
    scansCache = [];
  }
  return scansCache!;
}

// ── Thread-Safe Asynchronous Atomic Write ─────────────────
async function triggerAsyncWrite(data: { scans: ScanRecord[] }): Promise<void> {
  writeQueue.push(data);
  if (isWriting) return;

  isWriting = true;
  while (writeQueue.length > 0) {
    const nextData = writeQueue.shift();
    if (nextData) {
      try {
        const tempPath = `${DB_PATH}.tmp`;
        // Write to temporary file first, then rename atomically to prevent file corruption
        await fsPromises.writeFile(tempPath, JSON.stringify(nextData, null, 2), "utf8");
        await fsPromises.rename(tempPath, DB_PATH);
      } catch (err) {
        console.error("Async database write failed:", err);
      }
    }
  }
  isWriting = false;
}

// ── Save a new scan ───────────────────────────────────────
export function saveScan(scan: ScanRecord): ScanRecord {
  const scans = loadCache();
  // Filter out any duplicates and prepend
  scansCache = scans.filter((s) => s.scanId !== scan.scanId);
  scansCache.unshift(scan); // newest first
  triggerAsyncWrite({ scans: scansCache });
  return scan;
}

// ── Get one scan by ID ────────────────────────────────────
export function getScan(scanId: string): ScanRecord | null {
  const scans = loadCache();
  return scans.find((s) => s.scanId === scanId) ?? null;
}

// ── Update doctor notes / sign-off ────────────────────────
export function updateScanDoctorNotes(
  scanId: string,
  notes: string,
  signedBy?: string
): ScanRecord | null {
  const scans = loadCache();
  const idx = scans.findIndex((s) => s.scanId === scanId);
  if (idx === -1) return null;
  
  scans[idx] = {
    ...scans[idx],
    doctorNotes: notes,
    doctorSignedOff: !!signedBy,
    doctorSignedBy: signedBy,
    doctorSignedAt: new Date().toISOString(),
  };
  triggerAsyncWrite({ scans });
  return scans[idx];
}

// ── Delete a scan ─────────────────────────────────────────
export function deleteScan(scanId: string): boolean {
  const scans = loadCache();
  const prev = scans.length;
  scansCache = scans.filter((s) => s.scanId !== scanId);
  if (scansCache.length === prev) return false;
  triggerAsyncWrite({ scans: scansCache });
  return true;
}

// ── Get all scans (paginated) ─────────────────────────────
export function getAllScans(page = 1, perPage = 20): { scans: ScanRecord[]; total: number; pages: number } {
  const scans = loadCache();
  const total = scans.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const paginatedScans = scans.slice(start, start + perPage);
  return { scans: paginatedScans, total, pages };
}
