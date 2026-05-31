import { NextRequest, NextResponse } from "next/server";
import { getScan, updateScanDoctorNotes, deleteScan } from "@/lib/db";

// GET /api/scans/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scan = getScan(id);
  if (!scan) return NextResponse.json({ success: false, error: "Scan not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password");

  if (!password) {
    // Return restricted non-sensitive info when locked
    return NextResponse.json({
      success: true,
      scan: {
        scanId: scan.scanId,
        timestamp: scan.timestamp,
        isLocked: true,
      },
    });
  }

  if (password === scan.patientPassword) {
    return NextResponse.json({
      success: true,
      scan: {
        ...scan,
        isLocked: false,
      },
    });
  }

  return NextResponse.json(
    { success: false, error: "رمز فك التشفير خاطئ" },
    { status: 401 }
  );
}

// PATCH /api/scans/[id]  — update doctor notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = updateScanDoctorNotes(id, body.doctorNotes || "", body.doctorSignedBy);
  if (!updated) return NextResponse.json({ success: false, error: "Scan not found" }, { status: 404 });
  return NextResponse.json({ success: true, scan: updated });
}

// DELETE /api/scans/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteScan(id);
  if (!ok) return NextResponse.json({ success: false, error: "Scan not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
