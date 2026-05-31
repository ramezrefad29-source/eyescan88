import { NextRequest, NextResponse } from "next/server";
import { saveScan, getAllScans } from "@/lib/db";
import { ScanRecord } from "@/lib/db";

// GET /api/scans?page=1
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "1000", 10);
    const result = getAllScans(page, limit);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// POST /api/scans  — body: ScanRecord JSON
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScanRecord;
    if (!body.scanId) {
      return NextResponse.json({ success: false, error: "Missing scanId" }, { status: 400 });
    }
    const saved = saveScan(body);
    return NextResponse.json({ success: true, scan: saved });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
