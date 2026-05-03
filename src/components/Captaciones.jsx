// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO CAPTACIÓN RÁPIDA
// Pegás link o texto de WhatsApp → queda guardado y en el mapa
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { B, AG } from "../data/constants.js";

const GOOGLE_KEY = "AIzaSyD2ZKp0GLdu7rUTD2DWrOrpCy8LHeulGZM";

async function geocodeAddress(dir) {
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(dir + ", Mar del Plata, Argentina")}&key=${GOOGLE_KEY}`
    );
    const d = await r.json();
    if (d.status === "OK" && d.results.length > 0) {
      return { lat: d.results[0].geometry.location.lat, lng: d.results[0].geometry.location.lng };
    }
  } catch(e) {}
  return { lat: null, lng: null };
}

function detectarTipo(texto) {
  if (/zonaprop|argenprop|mercadolibre|inmuebles|properati/i.test(texto)) return "link";
  if (/https?:\/\//i.test(texto)) return "link";
  return "texto";
}

function extraerPrecio(texto) {
  const m = texto.match(/USD?\s*[\$]?\s*(\d[\d.,]+)/i);
  if (m) return parseInt(m[1].replace(/[.,]/g, "").slice(0, 7));
  return null;
}

function extraerDireccion(texto) {
  // Busca patrones tipo "Calle 1234" o "Av. Algo 456"
  const m = texto.match(/(?:Av\.|Calle|Bv\.|Dr\.|Gral\.|Ing\.)?\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]+\s+\d{3,4}/);
  if (m) return m[0].trim();
  return null;
}

export default function Captaciones({ supabase }) {
  const [items,         setItems]         = useState([]);
  const [input,         setInput]         = useState("");
  const [ag,            setAg]            = useState("");
  const [nota,          setNota]          = useState("");
  const [guardando,     setGuardando]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loaded,        setLoaded]        = useState(false);
  const [mapLoaded,     setMapLoaded]     = useState(false);
  const mapRef  = useRef(null);
  const leafRef = useRef(null);
  const marksRef = useRef([]);
  const textareaRef = useRef(null);

  // ── Cargar captaciones ──────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("captaciones")
        .select("*")
        .eq("convertida", false)
        .order("created_at", { ascending: false });
      setItems(data || []);
      setLoaded(true);
    }
    load();
  }, []);

  // ── Cargar Leaflet ──────────────────────────────────────
  useEffect(() => {
    if (window.L) { setMapLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // ── Inicializar mapa ────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || leafRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center: [-38.002, -57.555], zoom: 13 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    leafRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, [mapLoaded]);

  // ── Actualizar markers ──────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !leafRef.current) return;
    const L = window.L;
    const map = leafRef.current;
    marksRef.current.forEach(m => map.removeLayer(m));
    marksRef.current = [];

    items.filter(i => i.lat && i.lng).forEach(item => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#0F1E35;border:2.5px solid #E8A830;border-radius:10px 10px 10px 2px;padding:5px 9px;font-family:'Trebuchet MS',sans-serif;font-size:11px;font-weight:700;color:#E8A830;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.55);cursor:pointer;transform:translateY(-100%)">
          📌 ${item.precio ? "USD " + (item.precio/1000).toFixed(0) + "k" : "Sin precio"}
        </div>`,
        iconAnchor: [0, 0],
      });
      const marker = L.marker([item.lat, item.lng], { icon }).addTo(map);
      marksRef.current.push(marker);
    });

    const withCoords = items.filter(i => i.lat && i.lng);
    if (withCoords.length > 0) {
      const bounds = L.latLngBounds(withCoords.map(i => [i.lat, i.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [mapLoaded, items]);

  // ── Guardar captación ───────────────────────────────────
  async function guardar() {
    if (!input.trim() || guardando) return;
    setGuardando(true);

    const tipo      = detectarTipo(input);
    const precio    = extraerPrecio(input);
    const direccion = extraerDireccion(input);
    let lat = null, lng = null;

    if (direccion) {
      const coords = await geocodeAddress(direccion);
      lat = coords.lat;
      lng = coords.lng;
    }

    const { data, error } = await supabase.from("captaciones").insert([{
      contenido: input.trim(),
      tipo,
      direccion: direccion || null,
      precio:    precio    || null,
      nota:      nota.trim() || null,
      ag:        ag        || null,
      lat, lng,
      convertida: false,
    }]).select().single();

    if (!error && data) {
      setItems(p => [data, ...p]);
      setInput("");
      setNota("");
    }
    setGuardando(false);
  }

  // ── Eliminar ────────────────────────────────────────────
  async function eliminar() {
    if (!confirmDelete) return;
    await supabase.from("captaciones").delete().eq("id", confirmDelete.id);
    setItems(p => p.filter(i => i.id !== confirmDelete.id));
    setConfirmDelete(null);
  }

  // ── Marcar como convertida ──────────────────────────────
  async function convertir(item) {
    await supabase.from("captaciones").update({ convertida: true }).eq("id", item.id);
    setItems(p => p.filter(i => i.id !== item.id));
  }

  function fmtFecha(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
  }

  const inpS = {
    width: "100%", background: B.card, border: `1px solid ${B.border}`,
    borderRadius: 8, padding: "8px 11px", color: B.text, fontSize: 12,
    outline: "none", boxSizing: "border-box", fontFamily: "'Trebuchet MS',sans-serif",
  };

  return (
    <div style={{ display:"flex", height:"100%", gap:14, overflow:"hidden" }}>

      {/* Panel izquierdo */}
      <div style={{ width:320, flexShrink:0, display:"flex", flexDirection:"column", gap:12,
        overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent` }}>

        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Captación rápida</h1>
          <p style={{ fontSize:11, color:B.muted, margin:"3px 0 0" }}>
            Pegá link o texto de WhatsApp — queda guardado y en el mapa
          </p>
        </div>

        {/* Input principal */}
        <div style={{ background:B.card, border:`1px solid ${B.accentL}40`, borderRadius:12, padding:"14px" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pegá acá el link de ZonaProp, texto de WhatsApp, dirección y precio... lo que sea"
            rows={5}
            style={{ ...inpS, resize:"none", lineHeight:1.6, marginBottom:10 }}
          />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
            <div>
              <label style={{ fontSize:9, color:B.muted, letterSpacing:".8px", textTransform:"uppercase", display:"block", marginBottom:4 }}>Agente</label>
              <select value={ag} onChange={e => setAg(e.target.value)} style={inpS}>
                <option value="">Sin especificar</option>
                {Object.entries(AG).map(([k,v]) => <option key={k} value={k}>{v.n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:9, color:B.muted, letterSpacing:".8px", textTransform:"uppercase", display:"block", marginBottom:4 }}>Nota rápida</label>
              <input value={nota} onChange={e => setNota(e.target.value)} style={inpS} placeholder="ej: pago honorarios" />
            </div>
          </div>
          <button onClick={guardar} disabled={guardando || !input.trim()}
            style={{ width:"100%", padding:"11px", borderRadius:9, cursor: input.trim() && !guardando ? "pointer" : "default",
              background: input.trim() && !guardando ? B.accent : B.border,
              border: `1px solid ${input.trim() && !guardando ? B.accentL : B.border}`,
              color: input.trim() && !guardando ? "#fff" : B.muted,
              fontSize:13, fontWeight:700, fontFamily:"Georgia,serif" }}>
            {guardando ? "Guardando..." : "📌 Guardar captación"}
          </button>
        </div>

        {/* Lista de captaciones */}
        <div style={{ fontSize:11, color:B.muted, fontWeight:600, letterSpacing:"1px" }}>
          {items.length} CAPTACIONES PENDIENTES
        </div>

        {!loaded && <div style={{ textAlign:"center", color:B.dim, fontSize:12 }}>Cargando...</div>}

        {loaded && items.length === 0 && (
          <div style={{ textAlign:"center", padding:"30px 0", color:B.dim, fontSize:12 }}>
            Sin captaciones pendientes
          </div>
        )}

        {items.map(item => {
          const ag = AG[item.ag];
          return (
            <div key={item.id} style={{ background:B.card, border:`1px solid ${B.border}`,
              borderRadius:10, padding:"12px 13px",
              borderLeft:`3px solid ${item.lat ? B.accentL : B.dim}` }}>

              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                <span style={{ fontSize:9, padding:"1px 7px", borderRadius:12,
                  background: item.tipo === "link" ? `${B.accentL}18` : `${B.warm}18`,
                  color: item.tipo === "link" ? B.accentL : B.warm }}>
                  {item.tipo === "link" ? "🔗 Link" : "💬 Texto"}
                </span>
                {ag && <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:ag.bg, color:ag.c, fontWeight:600 }}>{ag.n}</span>}
                {item.lat && <span style={{ fontSize:9, color:B.ok }}>📍 En mapa</span>}
                <span style={{ fontSize:9, color:B.dim, marginLeft:"auto" }}>{fmtFecha(item.created_at)}</span>
              </div>

              {/* Contenido */}
              <div style={{ fontSize:11, color:B.text, lineHeight:1.5, marginBottom:8,
                wordBreak:"break-all",
                display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                {item.contenido}
              </div>

              {/* Datos detectados */}
              {(item.direccion || item.precio) && (
                <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                  {item.direccion && <span style={{ fontSize:10, color:B.muted }}>📍 {item.direccion}</span>}
                  {item.precio && <span style={{ fontSize:10, color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700 }}>USD {item.precio.toLocaleString()}</span>}
                </div>
              )}

              {item.nota && <div style={{ fontSize:10, color:B.muted, fontStyle:"italic", marginBottom:8 }}>"{item.nota}"</div>}

              {/* Acciones */}
              <div style={{ display:"flex", gap:6 }}>
                {item.contenido.startsWith("http") && (
                  <a href={item.contenido.split(" ")[0]} target="_blank" rel="noreferrer"
                    style={{ padding:"4px 10px", borderRadius:6, background:`${B.accentL}18`,
                      border:`1px solid ${B.accentL}40`, color:B.accentL, fontSize:10,
                      textDecoration:"none", fontWeight:600 }}>
                    Abrir link
                  </a>
                )}
                <button onClick={() => convertir(item)}
                  style={{ padding:"4px 10px", borderRadius:6, background:`${B.ok}18`,
                    border:`1px solid ${B.ok}40`, color:B.ok, fontSize:10,
                    cursor:"pointer", fontWeight:600 }}>
                  ✓ Convertida
                </button>
                <button onClick={() => setConfirmDelete(item)}
                  style={{ padding:"4px 10px", borderRadius:6, background:`${B.hot}12`,
                    border:`1px solid ${B.hot}30`, color:B.hot, fontSize:10,
                    cursor:"pointer", fontWeight:600, marginLeft:"auto" }}>
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mapa */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <div style={{ fontSize:11, color:B.muted, marginBottom:10 }}>
          📌 Captaciones en el mapa · {items.filter(i => i.lat).length} geolocalizadas de {items.length}
        </div>
        <div style={{ flex:1, borderRadius:12, overflow:"hidden", border:`1px solid ${B.border}`, position:"relative" }}>
          {!mapLoaded && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
              background:B.card, zIndex:10, flexDirection:"column", gap:10 }}>
              <div style={{ width:28, height:28, border:`2px solid ${B.border}`,
                borderTop:`2px solid ${B.accentL}`, borderRadius:"50%", animation:"spin .7s linear infinite" }} />
              <span style={{ fontSize:12, color:B.muted }}>Cargando mapa...</span>
            </div>
          )}
          <div ref={mapRef} style={{ width:"100%", height:"100%" }} />
        </div>
      </div>

      {/* Modal confirmación eliminar */}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background:B.sidebar, border:`1px solid ${B.hot}50`, borderRadius:14,
            padding:"28px 32px", maxWidth:380, width:"90%",
            boxShadow:"0 24px 80px rgba(0,0,0,0.8)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:22, marginBottom:12, textAlign:"center" }}>🗑</div>
            <div style={{ fontSize:15, fontWeight:700, color:B.text, fontFamily:"Georgia,serif",
              marginBottom:8, textAlign:"center" }}>¿Eliminar captación?</div>
            <div style={{ fontSize:12, color:B.muted, textAlign:"center", marginBottom:24, lineHeight:1.6 }}>
              Esta acción no se puede deshacer.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
                  background:"transparent", border:`1px solid ${B.border}`,
                  color:B.muted, fontSize:13 }}>Cancelar</button>
              <button onClick={eliminar}
                style={{ flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
                  background:B.hot, border:`1px solid ${B.hot}`,
                  color:"#fff", fontSize:13, fontWeight:700 }}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .leaflet-container { background: ${B.bg} !important; }
        .leaflet-tile { filter: brightness(0.85) saturate(0.7) hue-rotate(200deg); }
        .leaflet-control-zoom a { background: ${B.card} !important; color: ${B.accentL} !important; border-color: ${B.border} !important; }
        .leaflet-control-attribution { background: rgba(7,14,28,0.8) !important; color: ${B.dim} !important; font-size: 9px; }
        textarea::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
