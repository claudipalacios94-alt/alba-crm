// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO MAPA
// Leaflet + Nominatim geocoding + ARBA CARTO
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { B, AG } from "../data/constants.js";

const ARBA_URL = "https://carto.arba.gov.ar/cartoArba/";

const CAT_COLOR = {
  destacada: "#E8A830",
  hon3:      "#2E9E6A",
  hon6:      "#3EAA72",
  colega:    "#9B6DC8",
  normal:    "#4A8ABE",
};

const TIPO_ICONO = {
  "Departamento": "🏢", "Casa": "🏠", "PH": "🏡",
  "Dúplex": "🏘", "Local": "🏪", "Terreno": "📐",
};

async function nominatim(dir) {
  // Limpiar dirección y armar query
  const dirLimpia = dir.trim().replace(/,.*/, ''); // sacar todo después de coma
  const queries = [
    dirLimpia + ', Mar del Plata, Buenos Aires, Argentina',
    dirLimpia + ', Mar del Plata, Argentina',
  ];
  for (const q of queries) {
    try {
      const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=3&countrycodes=ar';
      const r = await fetch(url, { headers: { 'Accept-Language': 'es', 'User-Agent': 'AlbaCRM/1.0 (inmobiliaria MDP)' } });
      const d = await r.json();
      for (const res of d) {
        const lat = parseFloat(res.lat);
        const lng = parseFloat(res.lon);
        if (lat > -38.15 && lat < -37.85 && lng > -57.75 && lng < -57.40) {
          return { lat, lng, display: res.display_name };
        }
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 300));
  }
  return null;
}

export default function Mapa({ properties, updateProperty }) {
  const mapRef   = useRef(null);
  const leafRef  = useRef(null);
  const marksRef = useRef([]);

  const [sel,        setSel]        = useState(null);
  const [filtro,     setFiltro]     = useState("Todos");
  const [loaded,     setLoaded]     = useState(false);
  const [geocoding,  setGeocoding]  = useState(false);
  const [geoStatus,  setGeoStatus]  = useState({ done: 0, total: 0, failed: [] });
  const [coords,     setCoords]     = useState({}); // id → {lat, lng}

  const tipos = ["Todos", ...new Set(properties.map(p => p.tipo).filter(Boolean))];
  const lista = filtro === "Todos" ? properties : properties.filter(p => p.tipo === filtro);

  // Combinar coords guardadas en Supabase con las geocodificadas en sesión
  const withCoords = (p) => {
    const local = coords[p.id];
    return { ...p, lat: local?.lat || p.lat, lng: local?.lng || p.lng };
  };

  // ── Cargar Leaflet ─────────────────────────────────────────
  useEffect(() => {
    if (window.L) { setLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  // ── Inicializar mapa ───────────────────────────────────────
  useEffect(() => {
    if (!loaded || !mapRef.current || leafRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center: [-38.002, -57.555], zoom: 13 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    leafRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, [loaded]);

  // ── Geocodificar todas al abrir ────────────────────────────
  async function geocodificarTodas() {
    const sinCoords = properties.filter(p => !p.lat && !p.lng && p.dir);
    if (sinCoords.length === 0) return;
    setGeocoding(true);
    setGeoStatus({ done: 0, total: sinCoords.length, failed: [] });
    const failed = [];
    for (let i = 0; i < sinCoords.length; i++) {
      const p = sinCoords[i];
      const result = await nominatim(p.dir);
      if (result) {
        setCoords(prev => ({ ...prev, [p.id]: result }));
        // Guardar en Supabase si tenemos updateProperty
        if (updateProperty) {
          updateProperty(p.id, { lat: result.lat, lng: result.lng }).catch(() => {});
        }
      } else {
        failed.push(p.dir);
      }
      setGeoStatus({ done: i + 1, total: sinCoords.length, failed });
      // Pausa para no saturar Nominatim (máx 1 req/seg)
      if (i < sinCoords.length - 1) await new Promise(r => setTimeout(r, 1100));
    }
    setGeocoding(false);
  }

  // Geocodificar automáticamente al montar
  useEffect(() => {
    if (properties.length > 0) geocodificarTodas();
  }, []);

  // ── Actualizar markers ─────────────────────────────────────
  useEffect(() => {
    if (!loaded || !leafRef.current) return;
    const L = window.L;
    const map = leafRef.current;
    marksRef.current.forEach(m => map.removeLayer(m));
    marksRef.current = [];

    const listaConCoords = lista.map(withCoords).filter(p => p.lat && p.lng);

    listaConCoords.forEach(prop => {
      const catColor = CAT_COLOR[prop.categoria || "normal"];
      const icono = TIPO_ICONO[prop.tipo] || "📍";
      const icon = window.L.divIcon({
        className: "",
        html: `<div style="background:#0B1628;border:2px solid ${catColor};border-radius:10px 10px 10px 2px;padding:5px 9px;font-size:11px;font-weight:700;color:${catColor};white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.6);cursor:pointer;display:flex;align-items:center;gap:4px;transform:translateY(-100%)">
          <span style="font-size:13px">${icono}</span>
          <span style="color:#C8E0FA">${prop.precio ? "USD " + Math.round(prop.precio/1000) + "k" : "?"}</span>
        </div>`,
        iconAnchor: [0, 0],
      });
      const marker = L.marker([prop.lat, prop.lng], { icon })
        .addTo(map)
        .on("click", () => setSel(prop));
      marksRef.current.push(marker);
    });

    if (listaConCoords.length > 0) {
      const bounds = L.latLngBounds(listaConCoords.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [loaded, lista, coords]);

  const chip = act => ({
    padding: "4px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
    border: `1px solid ${act ? B.accentL : B.border}`,
    background: act ? `${B.accentL}18` : "transparent",
    color: act ? B.accentL : "#8AAECC",
  });

  const conCoords = lista.map(withCoords).filter(p => p.lat && p.lng).length;
  const sinCoords = lista.filter(p => !p.lat && !p.lng);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: B.text, margin: 0, fontFamily: "Georgia,serif" }}>Mapa de propiedades</h1>
          <p style={{ fontSize: 12, color: "#8AAECC", margin: "3px 0 0" }}>
            {conCoords} en mapa · {sinCoords.length} sin ubicación · Mar del Plata
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {geocoding && (
            <div style={{ fontSize: 11, color: B.accentL, background: B.accentL + "15",
              border: "1px solid " + B.accentL + "40", borderRadius: 8, padding: "5px 12px" }}>
              Geocodificando {geoStatus.done}/{geoStatus.total}...
            </div>
          )}
          {!geocoding && geoStatus.total > 0 && (
            <div style={{ fontSize: 11, color: "#2E9E6A", background: "#2E9E6A15",
              border: "1px solid #2E9E6A40", borderRadius: 8, padding: "5px 12px" }}>
              ✓ {geoStatus.done - geoStatus.failed.length} ubicadas
              {geoStatus.failed.length > 0 && ` · ${geoStatus.failed.length} no encontradas`}
            </div>
          )}
          <button onClick={geocodificarTodas} disabled={geocoding}
            style={{ padding: "6px 12px", borderRadius: 8, cursor: geocoding ? "default" : "pointer",
              background: "transparent", border: "1px solid " + B.border,
              color: "#8AAECC", fontSize: 11 }}>
            Re-geocodificar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10, flexShrink: 0 }}>
        {tipos.map(t => <button key={t} onClick={() => { setFiltro(t); setSel(null); }} style={chip(filtro === t)}>{t}</button>)}
      </div>

      {/* Leyenda categorías */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexShrink: 0, flexWrap: "wrap" }}>
        {Object.entries(CAT_COLOR).map(([k, c]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
            <span style={{ fontSize: 11, color: "#8AAECC", textTransform: "capitalize" }}>{k === "hon3" ? "Hon. 3%" : k === "hon6" ? "Hon. 6%" : k}</span>
          </div>
        ))}
      </div>

      {/* Mapa + lista */}
      <div style={{ flex: 1, display: "flex", gap: 12, minHeight: 0 }}>

        {/* Mapa */}
        <div style={{ flex: 1, borderRadius: 12, overflow: "hidden", border: `1px solid ${B.border}`, position: "relative" }}>
          {!loaded && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", background: B.card, zIndex: 10, flexDirection: "column", gap: 10 }}>
              <div style={{ width: 32, height: 32, border: `2px solid ${B.border}`,
                borderTop: `2px solid ${B.accentL}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 12, color: "#8AAECC" }}>Cargando mapa...</span>
            </div>
          )}
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {/* Lista lateral */}
        <div style={{ width: 230, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8,
          overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: `${B.border} transparent` }}>
          {lista.map(p => {
            const pw = withCoords(p);
            const isSel = sel?.id === p.id;
            const catColor = CAT_COLOR[p.categoria || "normal"];
            return (
              <div key={p.id}
                onClick={() => {
                  setSel(isSel ? null : pw);
                  if (pw.lat && leafRef.current) leafRef.current.setView([pw.lat, pw.lng], 15);
                }}
                style={{ background: isSel ? `${B.accent}18` : B.card,
                  border: `1.5px solid ${isSel ? B.accentL : B.border}`,
                  borderLeft: `3px solid ${catColor}`, borderRadius: 10, padding: "11px 12px",
                  cursor: "pointer", opacity: pw.lat ? 1 : 0.5, flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: B.text }}>{p.tipo}</div>
                    <div style={{ fontSize: 11, color: "#8AAECC" }}>{p.zona}</div>
                  </div>
                  {!pw.lat && <span style={{ fontSize: 10, color: B.warm }}>Sin pin</span>}
                </div>
                <div style={{ fontSize: 11, color: "#6A8AAE", marginBottom: 6,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.dir}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif" }}>
                  {p.precio ? `USD ${Number(p.precio).toLocaleString()}` : "A consultar"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popup selección */}
      {sel && (
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#0B1628", border: `1px solid ${B.accentL}50`, borderRadius: 14,
          padding: "14px 20px", zIndex: 1000, display: "flex", alignItems: "center", gap: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.7)", maxWidth: 500, width: "90%" }}>
          <div style={{ width: 3, alignSelf: "stretch", background: CAT_COLOR[sel.categoria || "normal"], borderRadius: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: B.text }}>{sel.tipo}</span>
              <span style={{ fontSize: 11, color: "#8AAECC" }}>{sel.zona}</span>
              {sel.ag && AG[sel.ag] && (
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3,
                  background: AG[sel.ag].bg, color: AG[sel.ag].c, fontWeight: 700 }}>{AG[sel.ag].n}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#8AAECC", marginBottom: 6 }}>{sel.dir}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif" }}>
                {sel.precio ? `USD ${Number(sel.precio).toLocaleString()}` : "A consultar"}
              </span>
              {sel.m2tot && <span style={{ fontSize: 11, color: "#8AAECC" }}>{sel.m2tot}m²</span>}
              {sel.caracts && <span style={{ fontSize: 11, color: "#6A8AAE" }}>{sel.caracts}</span>}
            </div>
            {sel.info && <div style={{ fontSize: 11, color: "#6A8AAE", marginTop: 5, fontStyle: "italic" }}>{sel.info}</div>}
            {/* Botón ARBA */}
<div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <a href={ARBA_URL} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 7, fontSize: 11, textDecoration: "none",
                  background: "rgba(42,91,173,0.2)", border: "1px solid rgba(42,91,173,0.4)",
                  color: "#8AAECC", fontWeight: 600 }}>
                🗺 Abrir ARBA CARTO
              </a>
              {sel.lat && (
                <button onClick={() => {
                  navigator.clipboard.writeText(sel.lat + ", " + sel.lng);
                  alert("Coordenadas copiadas: " + sel.lat + ", " + sel.lng + "\nPegalas en el buscador de ARBA");
                }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 7, fontSize: 11, cursor: "pointer",
                    background: "rgba(46,158,106,0.15)", border: "1px solid rgba(46,158,106,0.4)",
                    color: "#2E9E6A", fontWeight: 600 }}>
                  📋 Copiar coords
                </button>
              )}
            </div>
          </div>
          <button onClick={() => setSel(null)}
            style={{ background: "transparent", border: "none", color: "#8AAECC",
              fontSize: 20, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* Sin coordenadas */}
      {!geocoding && geoStatus.failed.length > 0 && (
        <div style={{ marginTop: 10, padding: "10px 14px", background: B.warm + "12",
          border: "1px solid " + B.warm + "40", borderRadius: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: B.warm, fontWeight: 600, marginBottom: 4 }}>
            No se encontraron estas direcciones — revisá el formato:
          </div>
          {geoStatus.failed.map((d, i) => (
            <div key={i} style={{ fontSize: 11, color: "#8AAECC" }}>· {d}</div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .leaflet-container { background: ${B.bg} !important; font-family: 'Trebuchet MS', sans-serif; }
        .leaflet-tile { filter: brightness(0.85) saturate(0.7) hue-rotate(200deg); }
        .leaflet-control-zoom a { background: ${B.card} !important; color: ${B.accentL} !important; border-color: ${B.border} !important; }
        .leaflet-control-attribution { background: rgba(7,14,28,0.8) !important; color: #4A6A90 !important; font-size: 9px; }
      `}</style>
    </div>
  );
}
