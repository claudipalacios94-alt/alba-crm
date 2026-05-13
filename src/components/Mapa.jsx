// ══════════════════════════════════════════════════════════════
// ALBA CRM — MAPA UNIFICADO
// Propiedades + Captaciones en un solo mapa con capas
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { B, AG } from "../data/constants.js";

const ARBA_URL = "https://carto.arba.gov.ar/cartoArba/";

function matchLeadsParaProp(prop, leads) {
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  return activos.filter(lead => {
    const zona  = (lead.zona  || "").toLowerCase();
    const tipo  = (lead.tipo  || "").toLowerCase().replace("departamento","depto");
    const presup = Number(lead.presup) || 0;
    const pZona  = (prop.zona || prop.direccion || "").toLowerCase();
    const pTipo  = (prop.tipo || "").toLowerCase().replace("departamento","depto");
    const pPrecio = Number(prop.precio) || 0;
    const zonas = zona.split(/[,\/]|\s+y\s+/).map(z => z.trim()).filter(Boolean);
    const zonaOk = zonas.some(z => pZona.includes(z) || z.includes(pZona));
    if (!zonaOk) return false;
    if (presup > 0 && pPrecio > 0 && pPrecio > presup * 1.20) return false;
    if (tipo && pTipo) {
      const tiposLead = tipo.split(/[\/,]|\s+y\s+/).map(t => t.trim());
      if (!tiposLead.some(t => pTipo.includes(t) || t.includes(pTipo))) return false;
    }
    return true;
  });
}

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

const TC_PIN = {
  colega:     "#CC2233",
  honorarios: "#2E9E6A",
  propia:     "#E8A830",
};

function makeCaptacionPin(tipo, tipoCaptacion) {
  const icono = TIPO_ICONO[tipo] || "📌";
  const color = TC_PIN[tipoCaptacion] || "#CC2233";
  const border = tipoCaptacion === "colega" ? "dashed" : "solid";
  return `<div style="position:relative;display:inline-flex;flex-direction:column;align-items:center">
    <div style="
      background:white;
      border:3px ${border} ${color};
      border-radius:50%;
      width:36px;height:36px;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
      box-shadow:0 3px 10px rgba(0,0,0,0.4);
      position:relative;
    ">
      ${icono}
      <div style="position:absolute;top:-5px;right:-5px;background:${color};color:white;font-size:8px;font-weight:800;padding:1px 4px;border-radius:4px;line-height:1.4">${tipoCaptacion==="colega"?"C":tipoCaptacion==="honorarios"?"H":"★"}</div>
    </div>
    <div style="width:2px;height:8px;background:${color};margin-top:-1px"></div>
    <div style="width:6px;height:6px;background:${color};border-radius:50%;margin-top:-1px;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>
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

// ── Panel de lista (reutilizable en desktop y mobile) ─────────
function PanelLista({ propiedades, captaciones, filtroTipo, q, capas, withCoordsFn, sel, setSel, leafRef }) {
  const propsList = capas.propiedades
    ? propiedades.map(withCoordsFn).filter(p => p.lat && p.lng)
        .filter(p => filtroTipo === "Todos" || p.tipo === filtroTipo)
        .filter(p => !q || ((p.dir || "") + (p.zona || "")).toLowerCase().includes(q.toLowerCase()))
    : [];

  const capsList = capas.captaciones
    ? captaciones.filter(c => c.lat && c.lng)
    : [];

  return (
    <>
      {propsList.map(p => {
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

      {capsList.map(cap => {
        const isSel = sel?.id === cap.id && sel?._tipo === "captacion";
        return (
          <div key={cap.id} onClick={() => { setSel({ ...cap, _tipo: "captacion" }); leafRef.current?.setView([cap.lat, cap.lng], 16); }}
            style={{ background: isSel ? "#CC223318" : B.card,
              border: `1.5px solid ${isSel ? "#CC2233" : B.border}`,
              borderLeft: "3px solid #CC2233", borderRadius: 9, padding: "9px 11px",
              cursor: "pointer", flexShrink: 0, borderStyle: "dashed" }}>
            <div style={{ fontSize: 11, color: "#CC2233", fontWeight: 600 }}>Captacion</div>
            <div style={{ fontSize: 11, color: "#8AAECC" }}>{cap.zona || cap.direccion || "Sin dirección"}</div>
            {cap.precio && <div style={{ fontSize: 13, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif", marginTop: 2 }}>USD {Number(cap.precio).toLocaleString()}</div>}
          </div>
        );
      })}
    </>
  );
}

export default function Mapa({ properties, leads = [], updateProperty, supabase, flyers = [] }) {
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
  const [notaRapida,  setNotaRapida]  = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [mostrados,    setMostrados]    = useState(new Set());
  const [capas,       setCapas]       = useState({ propiedades: true, captaciones: true });
  const [filtroTipo,  setFiltroTipo]  = useState("Todos");
  const [panelOpen,   setPanelOpen]   = useState(false);
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  React.useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const mobile = w < 768;

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

  useEffect(() => {
    if (!supabase) return;
    supabase.from("matches_mostrados").select("lead_id,prop_id")
      .then(({ data }) => {
        if (data) setMostrados(new Set(data.map(r => `${r.lead_id}-${r.prop_id}`)));
      });
  }, []);

  async function toggleMostrado(leadId, propId) {
    const key = `${leadId}-${propId}`;
    if (mostrados.has(key)) {
      await supabase.from("matches_mostrados").delete().match({ lead_id: leadId, prop_id: propId });
      setMostrados(prev => { const s = new Set(prev); s.delete(key); return s; });
    } else {
      await supabase.from("matches_mostrados").insert([{ lead_id: leadId, prop_id: propId }]);
      setMostrados(prev => new Set([...prev, key]));
    }
  }

  async function guardarNota() {
    if (!sel || !notaRapida.trim() || !updateProperty) return;
    setGuardandoNota(true);
    await updateProperty(sel.id, { info: notaRapida.trim() });
    setSel(prev => ({ ...prev, info: notaRapida.trim() }));
    setNotaRapida("");
    setGuardandoNota(false);
  }

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
          .on("click", () => { setSel({ ...prop, _tipo: "propiedad" }); setNotaRapida(""); });
        marksRef.current.push(marker);
      });
    }

    // Pins captaciones
    if (capas.captaciones) {
      captaciones.filter(c => c.lat && c.lng).forEach(cap => {
        const icon = L.divIcon({
          className: "",
          html: makeCaptacionPin(cap.tipo, cap.tipo_captacion),
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
          <h1 style={{ fontSize: mobile ? 16 : 20, fontWeight: 700, color: B.text, margin: 0, fontFamily: "Georgia,serif" }}>Mapa Alba</h1>
          <p style={{ fontSize: mobile ? 10 : 12, color: "#8AAECC", margin: "3px 0 0" }}>
            {conCoords} propiedades · {capConCoords} captaciones
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..."
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid " + B.border,
              background: B.card, color: B.text, fontSize: 12, outline: "none", width: mobile ? 140 : 190 }} />
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
          style={{ ...chip(capas.propiedades), display: "flex", alignItems: "center", gap: 5, fontSize: mobile ? 10 : 11, padding: mobile ? "3px 8px" : "4px 10px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: capas.propiedades ? B.accentL : "#4A6A90" }} />
          Props ({conCoords})
        </button>
        <button onClick={() => setCapas(c => ({ ...c, captaciones: !c.captaciones }))}
          style={{ ...chip(capas.captaciones), display: "flex", alignItems: "center", gap: 5, fontSize: mobile ? 10 : 11, padding: mobile ? "3px 8px" : "4px 10px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: capas.captaciones ? "#CC2233" : "#4A6A90" }} />
          Caps ({capConCoords})
        </button>

        <div style={{ width: 1, height: 16, background: B.border, margin: "0 4px" }} />

        {/* Filtro tipo */}
        {tipos.map(t => <button key={t} onClick={() => setFiltroTipo(t)} style={{ ...chip(filtroTipo === t), fontSize: mobile ? 10 : 11, padding: mobile ? "3px 8px" : "4px 10px" }}>{t}</button>)}
      </div>

      {/* Leyenda — solo desktop */}
      {!mobile && (
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
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:10, color:"#CC2233" }}>Colega</span>
              <span style={{ fontSize:10, color:"#2E9E6A" }}>Honor.</span>
              <span style={{ fontSize:10, color:"#E8A830" }}>Propia</span>
            </div>
          </div>
        </div>
      )}

      {/* Mapa + lista */}
      <div style={{ flex: 1, display: "flex", gap: 12, minHeight: 0, position: "relative" }}>

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

        {/* Boton toggle panel — solo movil */}
        {mobile && (
          <button onClick={() => setPanelOpen(o => !o)}
            style={{ position: "absolute", top: 12, right: 12, zIndex: 50, width: 40, height: 40,
              borderRadius: 10, background: B.card, border: `1px solid ${B.border}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={B.text} strokeWidth="2" strokeLinecap="round">
              {panelOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>
              }
            </svg>
          </button>
        )}

        {/* Panel overlay — solo movil */}
        {mobile && panelOpen && (
          <div style={{ position: "absolute", inset: 0, zIndex: 60, display: "flex", flexDirection: "column",
            background: B.bg }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderBottom: `1px solid ${B.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: B.text, fontWeight: 600 }}>Propiedades y Captaciones</span>
              <button onClick={() => setPanelOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${B.border}`,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8AAECC" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <PanelLista propiedades={properties} captaciones={captaciones} filtroTipo={filtroTipo} q={q}
                capas={capas} withCoordsFn={withCoords} sel={sel} setSel={setSel} leafRef={leafRef} />
            </div>
          </div>
        )}

        {/* Lista lateral — solo desktop */}
        {!mobile && (
          <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6,
            overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: `${B.border} transparent` }}>
            <PanelLista propiedades={properties} captaciones={captaciones} filtroTipo={filtroTipo} q={q}
              capas={capas} withCoordsFn={withCoords} sel={sel} setSel={setSel} leafRef={leafRef} />
          </div>
        )}
      </div>

      {/* Popup */}
      {sel && (
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#0B1628", border: `1px solid ${sel._tipo === "captacion" ? "#CC2233" : B.accentL}50`,
          borderRadius: 14, padding: "14px 20px", zIndex: 1000,
          display: "flex", alignItems: "center", gap: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.7)", maxWidth: 500, width: "90%" }}>
          <div style={{ width: 3, alignSelf: "stretch",
            background: sel._tipo === "captacion" ? "#CC2233" : CAT_COLOR[sel.categoria || "normal"],
            borderRadius: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {sel._tipo === "propiedad" ? (
              <>
                {/* Cabecera */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: B.text }}>{sel.tipo}</span>
                  <span style={{ fontSize: 11, color: "#8AAECC" }}>{sel.zona}</span>
                  {sel.ag && AG[sel.ag] && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: AG[sel.ag].bg, color: AG[sel.ag].c, fontWeight: 700 }}>{AG[sel.ag].n}</span>}
                  {sel.sc && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: (sel.sc.includes("Urgente") ? "#CC223320" : sel.sc.includes("tenci") ? "#E8A83020" : "#2E9E6A20"), color: (sel.sc.includes("Urgente") ? "#CC2233" : sel.sc.includes("tenci") ? "#E8A830" : "#2E9E6A") }}>{sel.sc}</span>}
                </div>

                {/* Dirección */}
                <div style={{ fontSize: 12, color: "#8AAECC", marginBottom: 6 }}>{sel.dir}</div>

                {/* Mini flyer si existe */}
                {(() => {
                  const flyer = flyers.find(f => f.prop_id === sel.id);
                  if (!flyer?.imagen_base64) return null;
                  return (
                    <img src={flyer.imagen_base64} alt={flyer.titulo}
                      style={{ width:80, height:100, objectFit:"cover", borderRadius:6,
                        border:"1px solid rgba(58,139,196,0.3)", marginBottom:6, float:"right", marginLeft:10 }} />
                  );
                })()}

                {/* Precio */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif" }}>
                    {sel.precio ? "USD " + Number(sel.precio).toLocaleString() : "A consultar"}
                  </span>
                  {sel.m2tot && <span style={{ fontSize: 11, color: "#8AAECC" }}>{sel.m2tot}m²</span>}
                  {sel.precio && sel.m2tot && <span style={{ fontSize: 11, color: "#6A8AAE" }}>USD {Math.round(sel.precio/sel.m2tot).toLocaleString()}/m²</span>}
                  {sel.precio_original && Number(sel.precio) < Number(sel.precio_original) && (
                    <span style={{ fontSize: 11, background: "#FF6B3520", color: "#FF6B35", padding: "1px 7px", borderRadius: 8, fontWeight: 700 }}>↓ RETASADO</span>
                  )}
                </div>

                {/* Características */}
                {sel.caracts && <div style={{ fontSize: 11, color: "#8AAECC", marginBottom: 4 }}>{sel.caracts}</div>}

                {/* Info interna */}
                {sel.info && <div style={{ fontSize: 11, color: "#6A8AAE", fontStyle: "italic", marginBottom: 6 }}>"{sel.info}"</div>}

                {/* Nota rápida */}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input
                    value={notaRapida}
                    onChange={e => setNotaRapida(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && guardarNota()}
                    placeholder="Añadir nota rápida..."
                    style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6, padding: "5px 9px", color: B.text, fontSize: 11, outline: "none" }}
                  />
                  <button onClick={guardarNota} disabled={!notaRapida.trim() || guardandoNota}
                    style={{ padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11,
                      background: notaRapida.trim() ? B.accent : "transparent",
                      border: "1px solid " + (notaRapida.trim() ? B.accentL : B.border),
                      color: notaRapida.trim() ? "#fff" : "#8AAECC" }}>
                    {guardandoNota ? "..." : "✓"}
                  </button>
                </div>

                {/* Matches de leads para esta propiedad */}
                {(() => {
                  const matches = matchLeadsParaProp(sel, leads);
                  if (matches.length === 0) return null;
                  return (
                    <div style={{ marginTop:8, background:"rgba(46,158,106,0.06)", border:"1px solid rgba(46,158,106,0.2)", borderRadius:8, padding:"8px 10px", maxHeight:140, overflowY:"auto" }}>
                      <div style={{ fontSize:10, color:"#2E9E6A", fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>
                        {matches.length} lead{matches.length>1?"s":""} interesado{matches.length>1?"s":""}
                      </div>
                      {matches.map(l => {
                        const yaMostrado = mostrados.has(`${l.id}-${sel.id}`);
                        const wa = l.tel ? `https://wa.me/${l.tel.replace(/\D/g,"")}` : null;
                        return (
                          <div key={l.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, opacity: yaMostrado ? 0.45 : 1 }}>
                            <button onClick={() => toggleMostrado(l.id, sel.id)}
                              style={{ width:14, height:14, borderRadius:"50%", border:"1.5px solid",
                                borderColor: yaMostrado ? "#2E9E6A" : "#4A6A90",
                                background: yaMostrado ? "#2E9E6A" : "transparent",
                                cursor:"pointer", flexShrink:0, fontSize:8, color:"white",
                                display:"flex", alignItems:"center", justifyContent:"center" }}>
                              {yaMostrado ? "✓" : ""}
                            </button>
                            <span style={{ flex:1, fontSize:11, color:"#E8F0FA", textDecoration: yaMostrado?"line-through":"none" }}>
                              {l.nombre} <span style={{ color:"#6A8AAE", fontSize:10 }}>USD {(l.presup||0).toLocaleString()}</span>
                            </span>
                            {wa && <a href={wa} target="_blank" rel="noreferrer"
                              style={{ fontSize:10, padding:"2px 6px", borderRadius:4,
                                background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.25)",
                                color:"#25D366", textDecoration:"none" }}>WA</a>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Acciones */}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <a href={ARBA_URL} target="_blank" rel="noreferrer"
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, textDecoration: "none",
                      background: "rgba(42,91,173,0.15)", border: "1px solid rgba(42,91,173,0.3)", color: "#8AAECC" }}>
                    🗺 ARBA
                  </a>
                  {sel.lat && (
                    <button onClick={() => navigator.clipboard.writeText(sel.lat + ", " + sel.lng)}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                        background: "rgba(46,158,106,0.12)", border: "1px solid rgba(46,158,106,0.3)", color: "#2E9E6A" }}>
                      📋 Coords
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Cabecera — igual que propiedad */}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                  <span style={{ fontSize:14, fontWeight:700, color:B.text }}>{sel.tipo || "Captación"}</span>
                  <span style={{ fontSize:11, color:"#8AAECC" }}>{sel.zona}</span>
                  {sel.ag && AG[sel.ag] && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:3, background:AG[sel.ag].bg, color:AG[sel.ag].c, fontWeight:700 }}>{AG[sel.ag].n}</span>}
                  {sel.inmobiliaria && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:10, background:"#9B6DC820", color:"#9B6DC8", border:"1px solid #9B6DC840", fontWeight:600 }}>🤝 {sel.inmobiliaria}</span>}
                  <span style={{ fontSize:10, padding:"1px 6px", borderRadius:4, background:"#E8A83020", color:"#E8A830" }}>📌 Captación</span>
                </div>
                <div style={{ fontSize:12, color:"#8AAECC", marginBottom:6 }}>{sel.direccion}</div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:6 }}>
                  {sel.precio && <span style={{ fontSize:16, fontWeight:700, color:B.accentL, fontFamily:"Georgia,serif" }}>USD {Number(sel.precio).toLocaleString()}</span>}
                  {sel.operacion && <span style={{ fontSize:11, color:"#8AAECC" }}>{sel.operacion}</span>}
                  {sel.nombre_propietario && <span style={{ fontSize:11, color:"#8AAECC" }}>👤 {sel.nombre_propietario}</span>}
                </div>
                {sel.caracts && <div style={{ fontSize:11, color:"#8AAECC", marginBottom:4 }}>{sel.caracts}</div>}
                {sel.nota && <div style={{ fontSize:11, color:"#6A8AAE", fontStyle:"italic", marginBottom:6 }}>"{sel.nota}"</div>}
                {sel.url && (
                  <a href={sel.url} target="_blank" rel="noreferrer"
                    style={{ display:"block", fontSize:11, color:"#4A8ABE", marginBottom:8,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                      padding:"4px 10px", borderRadius:6, background:"rgba(74,138,190,0.1)",
                      border:"1px solid rgba(74,138,190,0.3)", textDecoration:"none" }}>
                    🔗 Ver ficha / portal
                  </a>
                )}
                {/* ARBA */}
                <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                  <a href={ARBA_URL} target="_blank" rel="noreferrer"
                    style={{ padding:"4px 10px", borderRadius:6, fontSize:11, textDecoration:"none",
                      background:"rgba(42,91,173,0.15)", border:"1px solid rgba(42,91,173,0.3)", color:"#8AAECC" }}>
                    🗺 ARBA
                  </a>
                  {sel.lat && <button onClick={() => navigator.clipboard.writeText(sel.lat + ", " + sel.lng)}
                    style={{ padding:"4px 10px", borderRadius:6, fontSize:11, cursor:"pointer",
                      background:"rgba(46,158,106,0.12)", border:"1px solid rgba(46,158,106,0.3)", color:"#2E9E6A" }}>
                    📋 Coords
                  </button>}
                </div>
                {/* Matching con leads */}
                {(() => {
                  const matches = matchLeadsParaProp(sel, leads);
                  if (matches.length === 0) return (
                    <div style={{ fontSize: 11, color: "#CC2233", background: "rgba(204,34,51,0.1)", padding: "6px 10px", borderRadius: 6 }}>
                      Sin leads que encajen con esta captación
                    </div>
                  );
                  return (
                    <div style={{ background: "rgba(46,158,106,0.08)", border: "1px solid rgba(46,158,106,0.25)", borderRadius: 8, padding: "8px 10px", maxHeight: 180, overflowY: "auto" }}>
                      <div style={{ fontSize: 11, color: "#2E9E6A", fontWeight: 600, marginBottom: 6 }}>
                        {matches.length} lead{matches.length > 1 ? "s" : ""} interesado{matches.length > 1 ? "s" : ""}
                      </div>
                      {matches.map(l => {
                        const wa = l.tel ? `https://wa.me/${l.tel.replace(/\D/g,"")}` : null;
                        const yaMostrado = mostrados.has(`${l.id}-${sel.id}`);
                        return (
                          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5,
                            opacity: yaMostrado ? 0.45 : 1 }}>
                            <button onClick={() => toggleMostrado(l.id, sel.id)}
                              title={yaMostrado ? "Marcar como no mostrado" : "Marcar como mostrado"}
                              style={{ width:16, height:16, borderRadius:"50%", border:"1.5px solid",
                                borderColor: yaMostrado ? "#2E9E6A" : "#4A6A90",
                                background: yaMostrado ? "#2E9E6A" : "transparent",
                                cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:9, color:"white" }}>
                              {yaMostrado ? "✓" : ""}
                            </button>
                            <div style={{ flex:1, fontSize: 12, color: "#E8F0FA",
                              textDecoration: yaMostrado ? "line-through" : "none" }}>
                              {l.nombre}
                              <span style={{ fontSize: 10, color: "#6A8AAE", marginLeft: 5 }}>USD {(l.presup||0).toLocaleString()}</span>
                            </div>
                            {wa && <a href={wa} target="_blank" rel="noreferrer"
                              style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5,
                                background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)",
                                color: "#25D366", textDecoration: "none", fontWeight: 600 }}>WA</a>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
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
