"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import Script from "next/script";

// ── Mock clinic data (Middle East / Jordan focused) ───────
const MOCK_CLINICS = [
  { id: 1, name: "مركز ابن الهيثم لطب العيون", nameEn: "Ibn Al-Haytham Eye Center", lat: 31.9539, lng: 35.9106, phone: "+962-6-5678900", rating: 4.8, specialties: ["Retina", "Glaucoma", "Cornea"], address: "عمان، شارع المدينة المنورة" },
  { id: 2, name: "مستشفى العيون التخصصي", nameEn: "Specialized Eye Hospital", lat: 31.9650, lng: 35.9300, phone: "+962-6-5554321", rating: 4.6, specialties: ["Retina", "Pediatric"], address: "عمان، الدوار السابع" },
  { id: 3, name: "مركز البصيرة للعيون", nameEn: "Al-Baseera Eye Clinic", lat: 31.9400, lng: 35.8900, phone: "+962-6-4443210", rating: 4.9, specialties: ["Retina", "Laser Surgery"], address: "عمان، شارع الجامعة" },
  { id: 4, name: "عيادة النور لطب وجراحة العيون", nameEn: "Al-Noor Eye Surgery", lat: 31.9750, lng: 35.8600, phone: "+962-6-5899876", rating: 4.4, specialties: ["Cataract", "Retina"], address: "عمان، خلدا" },
  { id: 5, name: "مركز الشبكية المتقدم", nameEn: "Advanced Retina Center", lat: 31.9200, lng: 35.9500, phone: "+962-6-5123456", rating: 4.7, specialties: ["Retina", "Diabetic Retinopathy"], address: "عمان، الجبيهة" },
  { id: 6, name: "مستشفى الأردن لطب العيون", nameEn: "Jordan Eye Hospital", lat: 31.9850, lng: 35.8200, phone: "+962-6-5001234", rating: 4.5, specialties: ["Retina", "LASIK", "Cornea"], address: "عمان، عبدون" },
  { id: 7, name: "عيادات رؤية العصرية", nameEn: "Vision Modern Clinics", lat: 32.0500, lng: 36.1000, phone: "+962-5-3901234", rating: 4.3, specialties: ["Retina", "Optometry"], address: "الزرقاء، المركز" },
  { id: 8, name: "مركز النظر الحديث", nameEn: "Modern Sight Center", lat: 32.5500, lng: 35.8500, phone: "+962-2-7201234", rating: 4.6, specialties: ["Retina", "Pediatric Eye"], address: "إربد، شارع الحصن" },
];

interface Clinic {
  id: number;
  name: string;
  nameEn: string;
  lat: number;
  lng: number;
  phone: string;
  rating: number;
  specialties: string[];
  address: string;
  distance?: number;
}

// ── Distance calculator (Haversine) ───────────────────────
function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Clinic Card ───────────────────────────────────────────
function ClinicCard({ clinic, selected, onClick }: { clinic: Clinic; selected: boolean; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className={`glass rounded-2xl p-4 space-y-3 cursor-pointer transition-all duration-300 card-lift text-right ${
        selected ? "ring-1 ring-cyan-500/40" : ""
      }`}
      style={{
        border: selected ? "1px solid rgba(0,212,255,0.35)" : "1px solid var(--glass-border)",
        background: selected ? "rgba(0,212,255,0.04)" : undefined,
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between flex-row-reverse">
        <div className="flex-1">
          <h3 className="font-display font-bold text-white text-sm leading-tight">{clinic.name}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{clinic.nameEn}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-yellow-400 text-xs">★</span>
          <span className="text-xs font-bold text-white">{clinic.rating}</span>
        </div>
      </div>

      <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-row-reverse">
        <span>📍</span>
        <span>{clinic.address}</span>
      </div>

      {clinic.distance !== undefined && (
        <div className="text-xs font-mono font-bold" style={{ color: "var(--cyan)" }}>
          📏 {clinic.distance.toFixed(1)} كم
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 flex-row-reverse">
        {clinic.specialties.map((s) => (
          <span
            key={s}
            className="text-[9px] px-2 py-0.5 rounded-full font-bold"
            style={{
              background: s === "Retina" ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.04)",
              border: s === "Retina" ? "1px solid rgba(0,212,255,0.2)" : "1px solid var(--glass-border)",
              color: s === "Retina" ? "var(--cyan)" : "var(--text-secondary)",
            }}
          >
            {s}
          </span>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <a
          href={`tel:${clinic.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center px-3 py-2 rounded-xl text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition"
        >
          📞 اتصال
        </a>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center px-3 py-2 rounded-xl text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition"
        >
          🗺️ الاتجاهات
        </a>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>(MOCK_CLINICS);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Get user location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        // Sort clinics by distance
        const sorted = MOCK_CLINICS.map((c) => ({
          ...c,
          distance: calcDistance(loc.lat, loc.lng, c.lat, c.lng),
        })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setClinics(sorted);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Initialize Leaflet map when script loads
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const center = userLocation || { lat: 31.95, lng: 35.91 };
    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add user marker
    if (userLocation) {
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:var(--cyan,#00D4FF);border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(0,212,255,0.6);"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("<b>📍 موقعك الحالي</b>");
    }

    // Add clinic markers
    const markers: any[] = [];
    clinics.forEach((clinic) => {
      const clinicIcon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#7C3AED,#00D4FF);border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🏥</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([clinic.lat, clinic.lng], { icon: clinicIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:system-ui;direction:rtl;text-align:right;min-width:180px;">
            <b style="font-size:13px;">${clinic.name}</b><br/>
            <span style="font-size:11px;color:#666;">${clinic.address}</span><br/>
            <span style="font-size:11px;">⭐ ${clinic.rating} · 📞 ${clinic.phone}</span><br/>
            ${clinic.distance !== undefined ? `<span style="font-size:11px;color:#00D4FF;font-weight:bold;">📏 ${clinic.distance.toFixed(1)} كم</span>` : ""}
          </div>
        `);
      markers.push(marker);
    });

    markersRef.current = markers;
    mapInstanceRef.current = map;

    // Fit bounds
    if (clinics.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }, [clinics, userLocation]);

  useEffect(() => {
    if (leafletLoaded) {
      // Small delay so DOM is ready
      setTimeout(initMap, 100);
    }
  }, [leafletLoaded, initMap]);

  // Handle clinic selection — fly to it on map
  const handleSelectClinic = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([clinic.lat, clinic.lng], 14, { duration: 1 });
      // Open the popup
      const idx = clinics.findIndex((c) => c.id === clinic.id);
      if (idx >= 0 && markersRef.current[idx]) {
        markersRef.current[idx].openPopup();
      }
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="gradient-mesh" />
      <div className="neural-grid" />

      {/* Leaflet CSS & JS via CDN */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        strategy="afterInteractive"
        onLoad={() => setLeafletLoaded(true)}
      />

      <div className="relative z-10">
        <Navbar />

        {/* ── Header ── */}
        <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: "40px", paddingBottom: "20px" }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mt-3 flex-wrap gap-4">
              <div>
                <h1
                  className="font-display font-bold text-white flex items-center gap-3"
                  style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", letterSpacing: "-0.02em" }}
                >
                  <span>🏥 أقرب عيادات العيون (Clinic Locator)</span>
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  ابحث عن أقرب عيادات ومراكز طب العيون المتخصصة في الشبكية بناءً على موقعك الجغرافي
                </p>
              </div>

              <div className="flex gap-2.5">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition"
                >
                  🔬 فحص جديد
                </Link>
                <Link
                  href="/doctor/dashboard"
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 transition"
                >
                  🩺 لوحة الطبيب
                </Link>
                <button
                  onClick={requestLocation}
                  disabled={locating}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                >
                  {locating ? "⏳ جاري التحديد..." : "📍 تحديث الموقع"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Main Content: Map + List ── */}
        <div className="max-w-7xl mx-auto px-6" style={{ paddingBottom: "60px" }}>
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Map (3 cols) */}
            <div className="lg:col-span-3">
              <div
                ref={mapRef}
                className="rounded-2xl overflow-hidden"
                style={{
                  height: "520px",
                  border: "1px solid var(--glass-border)",
                  background: "rgba(10,14,26,0.9)",
                }}
              >
                {!leafletLoaded && (
                  <div className="w-full h-full flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      style={{ fontSize: "2rem" }}
                    >
                      🌍
                    </motion.div>
                    <span className="text-sm text-slate-400 ml-3">جاري تحميل الخريطة...</span>
                  </div>
                )}
              </div>

              {userLocation && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 flex-row-reverse">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>
                    موقعك: {userLocation.lat.toFixed(4)}°N, {userLocation.lng.toFixed(4)}°E
                  </span>
                </div>
              )}
            </div>

            {/* Clinic List (2 cols) */}
            <div className="lg:col-span-2 space-y-3 overflow-y-auto" style={{ maxHeight: "560px" }}>
              <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                {clinics.length} عيادات متاحة
              </div>
              {clinics.map((clinic) => (
                <ClinicCard
                  key={clinic.id}
                  clinic={clinic}
                  selected={selectedClinic?.id === clinic.id}
                  onClick={() => handleSelectClinic(clinic)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="section-divider" />
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            RetinaScan AI © 2026 — Clinic Locator
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            بيانات العيادات للأغراض التوضيحية فقط.
          </p>
        </div>
      </div>
    </div>
  );
}
