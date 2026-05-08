// ══════════════════════════════════════════════════════════════
// ALBA CRM — MAPA UNIFICADO
// Propiedades + Captaciones en un solo mapa con capas
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { B, AG } from "../data/constants.js";

const ARBA_URL = "https://carto.arba.gov.ar/cartoArba/";

const CAT_COLOR = {
  destacada: "#E8A830",  // dorado
  hon3:      "#4A7A3A",  // verde militar
  hon6:      "#1A3A6A",  // azul marino
  colega:    "#CC2233",  // rojo navideño
  normal:    "#4A8ABE",  // azul neutro
};

const TIPO_ICONO = {
  "Departamento": "🏢",
  "Casa":         "🏠",
  "PH":           "🏡",
  "Dúplex":       "🏘",
  "Local":        "🏪",
  "Terreno":      "📐",
};

// ── Pin con emoji de tipo y borde de categoría ──────────────
function makeAlbaPin(color, icono, retasado = false) {
  return `<div style="position:relative;display:inline-flex;flex-direction:column;align-items:center">
    <div style="
      background:white;
      border:3px solid ${color};
      border-radius:50%;
      width:36px;height:36px;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
      box-shadow:0 3px 10px rgba(0,0,0,0.4);
      position:relative;
    ">
      ${icono}
      ${retasado ? `<div style="position:absolute;top:-5px;right:-5px;background:#E8A830;color:white;font-size:8px;font-weight:700;padding:1px 4px;border-radius:4px">↓</div>` : ""}
    </div>
    <div style="width:2px;height:8px;background:${color};margin-top:-1px"></div>
    <div style="width:6px;height:6px;background:${color};border-radius:50%;margin-top:-1px;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>
  </div>`;
}

function makeCaptacionPin() {
  return `<div style="display:inline-flex;flex-direction:column;align-items:center">
    <div style="
      background:white;
      border:3px solid #CC2233;
      border-radius:50%;
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
      box-shadow:0 3px 10px rgba(0,0,0,0.4);
      border-style:dashed;
    ">🎅</div>
    <div style="width:2px;height:7px;background:#CC2233;margin-top:-1px"></div>
    <div style="width:5px;height:5px;background:#CC2233;border-radius:50%;margin-top:-1px"></div>
  </div>`;
}

async function nominatim(dir) {
  if (!dir) return null;
  const query = encodeURIComponent(dir + ", Mar del Plata, Buenos Aires, Argentina");
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=ar`,
      { headers: { "Accept-Language": "es" } }
    );
    const d = await r.json();
    if (d.length > 0) {
      const lat = parseFloat(d[0].lat), lng = parseFloat(d[0].lon);
      if (lat > -38.15 && lat < -37.85 && lng > -57.75 && lng < -57.40) return { lat, lng };
    }
  } catch(e) {}
  return null;
}

export default function Mapa({ properties, updateProperty, supabase }) {
  const mapRef   = useRef(null);
  const leafRef  = useRef(null);
  const marksRef = useRef([]);

  const [loaded,      setLoaded]      = useState(false);
  const [captaciones, setCaptaciones] = useState([]);
  const [coords,      setCoords]      = useState({});
  const [geocoding,   setGeocoding]   = useState(false);
  const [geoStatus,   setGeoStatus]   = useState({ done: 0, total: 0, failed: [] });
  const [q,           setQ]           = useState("");
  const [sel,         setSel]         = useState(null);
  const [capas,       setCapas]       = useState({ propiedades: true, captaciones: true });
  const [filtroTipo,  setFiltroTipo]  = useState("Todos");

  // ── Cargar captaciones ─────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    supabase.from("captaciones").select("*").eq("convertida", false)
      .then(({ data }) => setCaptaciones(data || []));
  }, []);

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

  useEffect(() => {
    if (!loaded || !mapRef.current || leafRef.current) return;
    const map = window.L.map(mapRef.current, { center: [-38.002, -57.555], zoom: 13 });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    leafRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, [loaded]);

  // ── Geocodificar propiedades sin coords ────────────────────
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
        if (updateProperty) updateProperty(p.id, { lat: result.lat, lng: result.lng }).catch(() => {});
      } else failed.push(p.dir);
      setGeoStatus({ done: i + 1, total: sinCoords.length, failed });
      if (i < sinCoords.length - 1) await new Promise(r => setTimeout(r, 1100));
    }
    setGeocoding(false);
  }

  useEffect(() => { if (properties.length > 0) geocodificarTodas(); }, []);

  const withCoords = (p) => {
    const local = coords[p.id];
    return { ...p, lat: local?.lat || p.lat, lng: local?.lng || p.lng };
  };

  // ── Actualizar markers ─────────────────────────────────────
  useEffect(() => {
    if (!loaded || !leafRef.current) return;
    const L = window.L;
    const map = leafRef.current;
    marksRef.current.forEach(m => map.removeLayer(m));
    marksRef.current = [];

    const tipos = ["Todos", ...new Set(properties.map(p => p.tipo).filter(Boolean))];
    const propsFiltered = properties
      .filter(p => filtroTipo === "Todos" || p.tipo === filtroTipo)
      .filter(p => !q || ((p.dir || "") + (p.zona || "")).toLowerCase().includes(q.toLowerCase()))
      .map(withCoords)
      .filter(p => p.lat && p.lng);

    // Pins propiedades
    if (capas.propiedades) {
      propsFiltered.forEach(prop => {
        const catColor = CAT_COLOR[prop.categoria || "normal"];
        const icono = TIPO_ICONO[prop.tipo] || "🏠";
        const retasado = prop.precio_original && prop.precio && prop.precio < prop.precio_original;
        const icon = L.divIcon({
          className: "",
          html: makeAlbaPin(catColor, icono, retasado),
          iconAnchor: [18, 50],
          iconSize: [36, 50],
        });
        const marker = L.marker([prop.lat, prop.lng], { icon })
          .addTo(map)
          .on("click", () => setSel({ ...prop, _tipo: "propiedad" }));
        marksRef.current.push(marker);
      });
    }

    // Pins captaciones
    if (capas.captaciones) {
      captaciones.filter(c => c.lat && c.lng).forEach(cap => {
        const icon = L.divIcon({
          className: "",
          html: makeCaptacionPin(),
          iconAnchor: [16, 44],
          iconSize: [32, 44],
        });
        const marker = L.marker([cap.lat, cap.lng], { icon })
          .addTo(map)
          .on("click", () => setSel({ ...cap, _tipo: "captacion" }));
        marksRef.current.push(marker);
      });
    }

    // Fit bounds
    const allCoords = [
      ...(capas.propiedades ? propsFiltered : []),
      ...(capas.captaciones ? captaciones.filter(c => c.lat && c.lng) : []),
    ].map(p => [p.lat, p.lng]);

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [loaded, properties, captaciones, coords, capas, filtroTipo, q]);

  const tipos = ["Todos", ...new Set(properties.map(p => p.tipo).filter(Boolean))];
  const conCoords = properties.map(withCoords).filter(p => p.lat && p.lng).length;
  const capConCoords = captaciones.filter(c => c.lat && c.lng).length;

  const chip = act => ({
    padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer",
    border: `1px solid ${act ? B.accentL : B.border}`,
    background: act ? B.accentL + "18" : "transparent",
    color: act ? B.accentL : "#8AAECC",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: B.text, margin: 0, fontFamily: "Georgia,serif" }}>Mapa Alba</h1>
          <p style={{ fontSize: 12, color: "#8AAECC", margin: "3px 0 0" }}>
            {conCoords} propiedades · {capConCoords} captaciones · Mar del Plata
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar dirección, zona..."
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid " + B.border,
              background: B.card, color: B.text, fontSize: 12, outline: "none", width: 190 }} />
          {geocoding && (
            <div style={{ fontSize: 11, color: B.accentL, background: B.accentL + "15",
              border: "1px solid " + B.accentL + "40", borderRadius: 8, padding: "5px 10px" }}>
              Geocodificando {geoStatus.done}/{geoStatus.total}...
            </div>
          )}
        </div>
      </div>

      {/* Capas + filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, flexShrink: 0, alignItems: "center" }}>
        {/* Toggle capas */}
        <button onClick={() => setCapas(c => ({ ...c, propiedades: !c.propiedades }))}
          style={{ ...chip(capas.propiedades), display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: capas.propiedades ? B.accentL : "#4A6A90" }} />
          Propiedades ({conCoords})
        </button>
        <button onClick={() => setCapas(c => ({ ...c, captaciones: !c.captaciones }))}
          style={{ ...chip(capas.captaciones), display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: capas.captaciones ? "#E8A830" : "#4A6A90" }} />
          Captaciones ({capConCoords})
        </button>

        <div style={{ width: 1, height: 16, background: B.border, margin: "0 4px" }} />

        {/* Filtro tipo */}
        {tipos.map(t => <button key={t} onClick={() => setFiltroTipo(t)} style={chip(filtroTipo === t)}>{t}</button>)}
      </div>

      {/* Leyenda */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
        {Object.entries(CAT_COLOR).map(([k, c]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
            <span style={{ fontSize: 11, color: "#8AAECC" }}>
              {k === "hon3" ? "Hon. 3%" : k === "hon6" ? "Hon. 6%" : k === "normal" ? "Cartera" : k.charAt(0).toUpperCase() + k.slice(1)}
            </span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#E8A830", border: "2px dashed #E8A830", background: "transparent", borderRadius: "50%" }} />
          <span style={{ fontSize: 11, color: "#8AAECC" }}>Captación</span>
        </div>
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
        <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6,
          overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: `${B.border} transparent` }}>

          {capas.propiedades && properties.map(withCoords).filter(p => p.lat && p.lng)
            .filter(p => filtroTipo === "Todos" || p.tipo === filtroTipo)
            .filter(p => !q || ((p.dir || "") + (p.zona || "")).toLowerCase().includes(q.toLowerCase()))
            .map(p => {
              const catColor = CAT_COLOR[p.categoria || "normal"];
              const isSel = sel?.id === p.id && sel?._tipo === "propiedad";
              return (
                <div key={p.id} onClick={() => { setSel({ ...p, _tipo: "propiedad" }); leafRef.current?.setView([p.lat, p.lng], 16); }}
                  style={{ background: isSel ? B.accent + "18" : B.card,
                    border: `1.5px solid ${isSel ? B.accentL : B.border}`,
                    borderLeft: `3px solid ${catColor}`, borderRadius: 9, padding: "9px 11px", cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: B.text }}>{p.tipo}</div>
                  <div style={{ fontSize: 11, color: "#8AAECC" }}>{p.zona}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif", marginTop: 2 }}>
                    {p.precio ? "USD " + Number(p.precio).toLocaleString() : "—"}
                  </div>
                </div>
              );
            })}

          {capas.captaciones && captaciones.filter(c => c.lat && c.lng).map(cap => {
            const isSel = sel?.id === cap.id && sel?._tipo === "captacion";
            return (
              <div key={cap.id} onClick={() => { setSel({ ...cap, _tipo: "captacion" }); leafRef.current?.setView([cap.lat, cap.lng], 16); }}
                style={{ background: isSel ? "#E8A83018" : B.card,
                  border: `1.5px solid ${isSel ? "#E8A830" : B.border}`,
                  borderLeft: "3px solid #E8A830", borderRadius: 9, padding: "9px 11px",
                  cursor: "pointer", flexShrink: 0, borderStyle: "dashed" }}>
                <div style={{ fontSize: 11, color: "#E8A830", fontWeight: 600 }}>📌 Captación</div>
                <div style={{ fontSize: 11, color: "#8AAECC" }}>{cap.zona || cap.direccion || "Sin dirección"}</div>
                {cap.precio && <div style={{ fontSize: 13, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif", marginTop: 2 }}>USD {Number(cap.precio).toLocaleString()}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Popup */}
      {sel && (
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#0B1628", border: `1px solid ${sel._tipo === "captacion" ? "#E8A830" : B.accentL}50`,
          borderRadius: 14, padding: "14px 20px", zIndex: 1000,
          display: "flex", alignItems: "center", gap: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.7)", maxWidth: 500, width: "90%" }}>
          <div style={{ width: 3, alignSelf: "stretch",
            background: sel._tipo === "captacion" ? "#E8A830" : CAT_COLOR[sel.categoria || "normal"],
            borderRadius: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {sel._tipo === "propiedad" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: B.text }}>{sel.tipo}</span>
                  <span style={{ fontSize: 11, color: "#8AAECC" }}>{sel.zona}</span>
                  {sel.ag && AG[sel.ag] && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: AG[sel.ag].bg, color: AG[sel.ag].c, fontWeight: 700 }}>{AG[sel.ag].n}</span>}
                </div>
                <div style={{ fontSize: 12, color: "#8AAECC", marginBottom: 6 }}>{sel.dir}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif" }}>
                    {sel.precio ? "USD " + Number(sel.precio).toLocaleString() : "A consultar"}
                  </span>
                  {sel.m2tot && <span style={{ fontSize: 11, color: "#8AAECC" }}>{sel.m2tot}m²</span>}
                  {sel.precio_original && sel.precio < sel.precio_original && (
                    <span style={{ fontSize: 11, background: "#E8A83020", color: "#E8A830", padding: "1px 7px", borderRadius: 8, fontWeight: 700 }}>RETASADO</span>
                  )}
                </div>
                {sel.info && <div style={{ fontSize: 11, color: "#6A8AAE", marginTop: 4, fontStyle: "italic" }}>{sel.info}</div>}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <a href={ARBA_URL} target="_blank" rel="noreferrer"
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, textDecoration: "none",
                      background: "rgba(42,91,173,0.15)", border: "1px solid rgba(42,91,173,0.3)", color: "#8AAECC" }}>
                    🗺 ARBA
                  </a>
                  {sel.lat && (
                    <button onClick={() => { navigator.clipboard.writeText(sel.lat + ", " + sel.lng); }}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                        background: "rgba(46,158,106,0.12)", border: "1px solid rgba(46,158,106,0.3)", color: "#2E9E6A" }}>
                      📋 Coords
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8A830", marginBottom: 3 }}>📌 Captación pendiente</div>
                <div style={{ fontSize: 12, color: "#8AAECC", marginBottom: 4 }}>{sel.zona}{sel.direccion ? " · " + sel.direccion : ""}</div>
                {sel.precio && <div style={{ fontSize: 15, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif" }}>USD {Number(sel.precio).toLocaleString()}</div>}
                {sel.tipo && <div style={{ fontSize: 11, color: "#8AAECC", marginTop: 2 }}>{sel.tipo}</div>}
                {sel.nota && <div style={{ fontSize: 11, color: "#6A8AAE", fontStyle: "italic", marginTop: 4 }}>{sel.nota}</div>}
              </>
            )}
          </div>
          <button onClick={() => setSel(null)}
            style={{ background: "transparent", border: "none", color: "#8AAECC",
              fontSize: 20, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>×</button>
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
