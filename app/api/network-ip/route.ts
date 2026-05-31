import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    let localIp = "localhost";
    
    // Find the first non-internal IPv4 address
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (iface) {
        for (const net of iface) {
          if (net.family === "IPv4" && !net.internal) {
            localIp = net.address;
            break;
          }
        }
      }
      if (localIp !== "localhost") break;
    }
    
    return NextResponse.json({ success: true, ip: localIp });
  } catch (err) {
    return NextResponse.json({ success: false, ip: "localhost", error: String(err) });
  }
}
