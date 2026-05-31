// ============================================================
// RetinaScan AI — Lightweight JSON File Database Client
// Server-side only (Node.js / Next.js API routes)
// ============================================================

import fs from "fs";
import path from "path";
import { AnalysisResult } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "scans.json");

export interface ScanRecord extends AnalysisResult {
  doctorNotes?: string;
  doctorSignedOff?: boolean;
  doctorSignedBy?: string;
  doctorSignedAt?: string;
}

// ── Ensure the data directory and file exist ──────────────
function ensureDb(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ scans: [] }, null, 2), "utf8");
}

// ── Read all scans ────────────────────────────────────────
export function readDb(): { scans: ScanRecord[] } {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { scans: [] };
  }
}

// ── Write full DB ─────────────────────────────────────────
function writeDb(data: { scans: ScanRecord[] }): void {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

// ── Save a new scan ───────────────────────────────────────
export function saveScan(scan: ScanRecord): ScanRecord {
  const db = readDb();
  // Remove any previous scan with same ID to avoid duplicates
  db.scans = db.scans.filter((s) => s.scanId !== scan.scanId);
  db.scans.unshift(scan); // newest first
  writeDb(db);
  return scan;
}

// ── Get one scan by ID ────────────────────────────────────
export function getScan(scanId: string): ScanRecord | null {
  const db = readDb();
  return db.scans.find((s) => s.scanId === scanId) ?? null;
}

// ── Update doctor notes / sign-off ────────────────────────
export function updateScanDoctorNotes(
  scanId: string,
  notes: string,
  signedBy?: string
): ScanRecord | null {
  const db = readDb();
  const idx = db.scans.findIndex((s) => s.scanId === scanId);
  if (idx === -1) return null;
  db.scans[idx] = {
    ...db.scans[idx],
    doctorNotes: notes,
    doctorSignedOff: !!signedBy,
    doctorSignedBy: signedBy,
    doctorSignedAt: new Date().toISOString(),
  };
  writeDb(db);
  return db.scans[idx];
}

// ── Delete a scan ─────────────────────────────────────────
export function deleteScan(scanId: string): boolean {
  const db = readDb();
  const prev = db.scans.length;
  db.scans = db.scans.filter((s) => s.scanId !== scanId);
  if (db.scans.length === prev) return false;
  writeDb(db);
  return true;
}

// ── Get all scans (paginated) ─────────────────────────────
export function getAllScans(page = 1, perPage = 20): { scans: ScanRecord[]; total: number; pages: number } {
  const db = readDb();
  const total = db.scans.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const scans = db.scans.slice(start, start + perPage);
  return { scans, total, pages };
}
