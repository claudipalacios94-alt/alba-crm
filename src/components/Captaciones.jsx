// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO CAPTACIÓN RÁPIDA
// Texto libre → IA extrae campos → pide lo que falta → guarda
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { B, AG } from "../data/constants.js";

async function nominatim(dir) {
  if (!dir) return { lat: null, lng: null };
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
  return { lat: null, lng: null };
}

async function analizarConIA(texto) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Sos un asistente de inmobiliaria en Mar del Plata, Argentina. Analizás texto libre (mensajes de WhatsApp, descripciones de portales, notas) y extraés información de propiedades en venta o alquiler.

IMPORTANTE: Si la propiedad está fuera de Mar del Plata, indicalo en el campo "fuera_de_mdp": true.

Respondé SOLO con JSON válido, sin texto adicional, sin backticks:
{
  "nombre_propietario": string o null,
  "telefono": string o null,
  "tipo": "Departamento"|"Casa"|"PH"|"Dúplex"|"Local"|"Terreno"|"Otro" o null,
  "zona": string o null,
  "direccion": string o null,
  "precio": number o null,
  "m2tot": number o null,
  "m2cub": number o null,
  "ambientes": number o null,
  "caracts": string o null,
  "operacion": "venta"|"alquiler" o null,
  "campos_faltantes": array de strings con los campos importantes que no pudiste detectar,
  "fuera_de_mdp": boolean,
  "ciudad_detectada": string o null
}

campos_faltantes debe incluir solo los que son realmente importantes para una captación: tipo, zona, precio. No incluyas campos opcionales como m2 o ambientes.`,
        messages: [{ role: "user", content: texto }]
      })
    });
    const data = await res.json();
    const content = data.content?.[0]?.text || "{}";
    return JSON.parse(content.replace(/```json|```/g, "").trim());
  } catch(e) {
    console.error("IA error:", e);
    return null;
  }
}

export default function Captaciones({ supabase }) {
  const [items,      setItems]      = useState([]);
  const [input,      setInput]      = useState("");
  const [ag,         setAg]         = useState("");
  const [nota,       setNota]       = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [guardando,  setGuardando]  = useState(false);
  const [campos,     setCampos]     = useState(null);   // resultado IA
  const [pendientes, setPendientes] = useState([]);     // campos que faltan
  const [completos,  setCompletos]  = useState({});     // valores manuales
  const [confirmDel, setConfirmDel] = useState(null);
  const [loaded,     setLoaded]     = useState(false);
  const [mapLoaded,  setMapLoaded]  = useState(false);
  const mapRef   = useRef(null);
  const leafRef  = useRef(null);
  const marksRef = useRef([]);

  // ── Cargar captaciones ──────────────────────────────────────
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

  // ── Leaflet ─────────────────────────────────────────────────
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

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || leafRef.current) return;
    const map = window.L.map(mapRef.current, { center: [-38.002, -57.555], zoom: 13 });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    leafRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !leafRef.current) return;
    const map = leafRef.current;
    marksRef.current.forEach(m => map.removeLayer(m));
    marksRef.current = [];
    items.filter(i => i.lat && i.lng).forEach(item => {
      const icon = window.L.divIcon({
        className: "",
        html: `<div style="background:#0F1E35;border:2.5px solid #E8A830;border-radius:10px 10px 10px 2px;padding:5px 9px;font-size:11px;font-weight:700;color:#E8A830;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.55);cursor:pointer;transform:translateY(-100%)">
          📌 ${item.precio ? "USD " + (item.precio/1000).toFixed(0) + "k" : "Sin precio"}
        </div>`,
        iconAnchor: [0, 0],
      });
      marksRef.current.push(window.L.marker([item.lat, item.lng], { icon }).addTo(map));
    });
    const withCoords = items.filter(i => i.lat && i.lng);
    if (withCoords.length > 0) {
      const bounds = window.L.latLngBounds(withCoords.map(i => [i.lat, i.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [mapLoaded, items]);

  // ── Analizar con IA ─────────────────────────────────────────
  async function analizar() {
    if (!input.trim() || analizando) return;
    setAnalizando(true);
    setCampos(null);
    setPendientes([]);
    setCompletos({});

    const result = await analizarConIA(input);
    if (result) {
      setCampos(result);
      setPendientes(result.campos_faltantes || []);
    } else {
      // Sin créditos IA → modo manual simple
      setCampos({});
      setPendientes(["tipo", "zona", "precio"]);
    }
    setAnalizando(false);
  }

  // ── Guardar ─────────────────────────────────────────────────
  async function guardar() {
    if (guardando) return;
    setGuardando(true);

    const merged = { ...campos, ...completos };
    const dir = merged.direccion || null;
    let lat = null, lng = null;
    if (dir) {
      const coords = await nominatim(dir);
      lat = coords.lat; lng = coords.lng;
    }

    const { data, error } = await supabase.from("captaciones").insert([{
      contenido:          input.trim(),
      tipo:               merged.tipo || null,
      zona:               merged.zona || null,
      direccion:          dir,
      precio:             merged.precio ? Number(merged.precio) : null,
      nombre_propietario: merged.nombre_propietario || null,
      telefono:           merged.telefono || null,
      caracts:            merged.caracts || null,
      m2tot:              merged.m2tot ? Number(merged.m2tot) : null,
      operacion:          merged.operacion || "venta",
      nota:               nota.trim() || null,
      ag:                 ag || null,
      lat, lng,
      convertida: false,
    }]).select().single();

    if (!error && data) {
      setItems(p => [data, ...p]);
      setInput(""); setNota(""); setCampos(null); setPendientes([]); setCompletos({});
    }
    setGuardando(false);
  }

  async function eliminar() {
    if (!confirmDel) return;
    await supabase.from("captaciones").delete().eq("id", confirmDel.id);
    setItems(p => p.filter(i => i.id !== confirmDel.id));
    setConfirmDel(null);
  }

  async function convertir(item) {
    await supabase.from("captaciones").update({ convertida: true }).eq("id", item.id);
    setItems(p => p.filter(i => i.id !== item.id));
  }

  function fmtFecha(iso) {
    return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  const inpS = {
    width: "100%", background: B.card, border: `1px solid ${B.border}`,
    borderRadius: 7, padding: "7px 10px", color: B.text, fontSize: 12,
    outline: "none", boxSizing: "border-box",
  };

  const LABEL_MAP = {
    tipo: "Tipo de propiedad", zona: "Zona/barrio", precio: "Precio USD",
    direccion: "Dirección", nombre_propietario: "Nombre del propietario",
    telefono: "Teléfono", m2tot: "Superficie m²", operacion: "Venta o alquiler",
  };

  return (
    <div style={{ display: "flex", gap: 16, height: "100%", overflow: "hidden" }}>

      {/* Panel izquierdo */}
      <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", paddingRight: 4 }}>

        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: B.text, margin: 0, fontFamily: "Georgia,serif" }}>Captación rápida</h1>
          <p style={{ fontSize: 12, color: "#8AAECC", margin: "3px 0 0" }}>Pegá texto, link o WhatsApp — la IA extrae todo</p>
        </div>

        {/* Textarea */}
        <div style={{ background: B.card, border: `1px solid ${B.accentL}40`, borderRadius: 12, padding: 14 }}>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setCampos(null); setPendientes([]); }}
            placeholder="Pegá acá el texto de WhatsApp, descripción del portal, dirección y precio... lo que tengas"
            rows={5}
            style={{ ...inpS, resize: "none", lineHeight: 1.6, marginBottom: 10 }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 3 }}>AGENTE</label>
              <select value={ag} onChange={e => setAg(e.target.value)} style={inpS}>
                <option value="">Sin especificar</option>
                {Object.entries(AG).map(([k, v]) => <option key={k} value={k}>{v.n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 3 }}>NOTA</label>
              <input value={nota} onChange={e => setNota(e.target.value)} style={inpS} placeholder="ej: paga honorarios" />
            </div>
          </div>
          <button onClick={analizar} disabled={analizando || !input.trim()}
            style={{ width: "100%", padding: 11, borderRadius: 9, cursor: input.trim() && !analizando ? "pointer" : "default",
              background: input.trim() && !analizando ? B.accent : B.border,
              border: `1px solid ${input.trim() && !analizando ? B.accentL : B.border}`,
              color: input.trim() && !analizando ? "#fff" : "#8AAECC",
              fontSize: 13, fontWeight: 700 }}>
            {analizando ? "✨ Analizando..." : "✨ Analizar con IA"}
          </button>
        </div>

        {/* Resultado IA */}
        {campos && (
          <div style={{ background: B.card, border: `1px solid ${B.accentL}40`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.accentL, letterSpacing: "0.8px" }}>DATOS DETECTADOS</div>
            {campos.fuera_de_mdp && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(232,100,80,0.15)",
                border: "1px solid rgba(232,100,80,0.4)", fontSize: 12, color: "#E86450" }}>
                ⚠ Esta propiedad parece ser de <strong>{campos.ciudad_detectada || "otra ciudad"}</strong>, no de Mar del Plata. ¿Querés guardarla igual?
              </div>
            )}

            {/* Campos extraídos */}
            {["tipo","zona","direccion","precio","nombre_propietario","telefono","m2tot","caracts","operacion"].map(k => {
              const val = campos[k];
              if (!val) return null;
              return (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#5A7A9A", fontSize: 11 }}>{LABEL_MAP[k] || k}:</span>
                  <span style={{ color: B.text, fontWeight: 600 }}>{k === "precio" ? "USD " + Number(val).toLocaleString() : String(val)}</span>
                </div>
              );
            })}

            {/* Campos faltantes — pedir manualmente */}
            {pendientes.length > 0 && (
              <div style={{ borderTop: `1px solid ${B.border}`, paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: B.warm, fontWeight: 600, marginBottom: 8 }}>
                  ⚠ Falta completar:
                </div>
                {pendientes.map(k => (
                  <div key={k} style={{ marginBottom: 7 }}>
                    <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 3 }}>{LABEL_MAP[k] || k}</label>
                    {k === "tipo" ? (
                      <select value={completos[k] || ""} onChange={e => setCompletos(p => ({...p, [k]: e.target.value}))} style={inpS}>
                        <option value="">Elegir tipo...</option>
                        {["Departamento","Casa","PH","Dúplex","Local","Terreno","Otro"].map(t => <option key={t}>{t}</option>)}
                      </select>
                    ) : k === "operacion" ? (
                      <select value={completos[k] || ""} onChange={e => setCompletos(p => ({...p, [k]: e.target.value}))} style={inpS}>
                        <option value="">Elegir...</option>
                        <option value="venta">Venta</option>
                        <option value="alquiler">Alquiler</option>
                      </select>
                    ) : (
                      <input
                        value={completos[k] || ""}
                        onChange={e => setCompletos(p => ({...p, [k]: e.target.value}))}
                        style={inpS}
                        placeholder={k === "precio" ? "ej: 85000" : k === "zona" ? "ej: La Perla" : ""}
                        type={["precio","m2tot"].includes(k) ? "number" : "text"}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <button onClick={guardar} disabled={guardando}
              style={{ width: "100%", padding: 10, borderRadius: 9, cursor: guardando ? "default" : "pointer",
                background: guardando ? B.border : "#2E9E6A",
                border: `1px solid ${guardando ? B.border : "#2E9E6A"}`,
                color: guardando ? "#8AAECC" : "#fff", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
              {guardando ? "Guardando..." : "📌 Guardar captación"}
            </button>
          </div>
        )}

        {/* Lista */}
        <div style={{ fontSize: 11, color: "#8AAECC", fontWeight: 600, letterSpacing: "1px" }}>
          {items.length} CAPTACIONES PENDIENTES
        </div>

        {!loaded && <div style={{ textAlign: "center", color: "#8AAECC", fontSize: 12 }}>Cargando...</div>}
        {loaded && items.length === 0 && (
          <div style={{ textAlign: "center", padding: "30px 0", color: "#8AAECC", fontSize: 12 }}>Sin captaciones pendientes</div>
        )}

        {items.map(item => {
          const agObj = AG[item.ag];
          return (
            <div key={item.id} style={{ background: B.card, border: `1px solid ${B.border}`,
              borderRadius: 10, padding: "12px 13px", borderLeft: `3px solid ${item.lat ? B.accentL : "#4A6A90"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                {item.tipo && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 12, background: B.accentL + "18", color: B.accentL }}>{item.tipo}</span>}
                {item.operacion && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 12, background: "#4A6A9020", color: "#8AAECC" }}>{item.operacion}</span>}
                {agObj && <span style={{ fontSize: 11, padding: "1px 5px", borderRadius: 3, background: agObj.bg, color: agObj.c, fontWeight: 600 }}>{agObj.n}</span>}
                {item.lat && <span style={{ fontSize: 11, color: "#2E9E6A" }}>📍</span>}
                <span style={{ fontSize: 11, color: "#4A6A90", marginLeft: "auto" }}>{fmtFecha(item.created_at)}</span>
              </div>

              {(item.zona || item.direccion) && (
                <div style={{ fontSize: 12, color: "#8AAECC", marginBottom: 4 }}>
                  {item.zona}{item.zona && item.direccion ? " · " : ""}{item.direccion}
                </div>
              )}

              {item.precio && (
                <div style={{ fontSize: 15, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif", marginBottom: 4 }}>
                  USD {Number(item.precio).toLocaleString()}
                </div>
              )}

              {item.nombre_propietario && (
                <div style={{ fontSize: 12, color: "#8AAECC", marginBottom: 2 }}>
                  👤 {item.nombre_propietario}{item.telefono ? " · " + item.telefono : ""}
                </div>
              )}

              {item.nota && <div style={{ fontSize: 11, color: "#6A8AAE", fontStyle: "italic", marginBottom: 6 }}>"{item.nota}"</div>}

              <div style={{ fontSize: 11, color: "#4A6A90", lineHeight: 1.4, marginBottom: 8,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {item.contenido}
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                {item.contenido?.startsWith("http") && (
                  <a href={item.contenido.split(" ")[0]} target="_blank" rel="noreferrer"
                    style={{ padding: "4px 10px", borderRadius: 6, background: B.accentL + "18",
                      border: `1px solid ${B.accentL}40`, color: B.accentL, fontSize: 11,
                      textDecoration: "none", fontWeight: 600 }}>
                    Abrir link
                  </a>
                )}
                <button onClick={() => convertir(item)}
                  style={{ padding: "4px 10px", borderRadius: 6, background: "#2E9E6A18",
                    border: "1px solid #2E9E6A40", color: "#2E9E6A", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                  ✓ Convertida
                </button>
                <button onClick={() => setConfirmDel(item)}
                  style={{ padding: "4px 10px", borderRadius: 6, background: B.hot + "12",
                    border: `1px solid ${B.hot}30`, color: B.hot, fontSize: 11,
                    cursor: "pointer", marginLeft: "auto" }}>
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "#8AAECC", marginBottom: 10 }}>
          📌 {items.filter(i => i.lat).length} de {items.length} captaciones en mapa
        </div>
        <div style={{ flex: 1, borderRadius: 12, overflow: "hidden", border: `1px solid ${B.border}`, position: "relative" }}>
          {!mapLoaded && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", background: B.card, zIndex: 10, gap: 10 }}>
              <div style={{ width: 28, height: 28, border: `2px solid ${B.border}`,
                borderTop: `2px solid ${B.accentL}`, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
            </div>
          )}
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      {/* Modal eliminar */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => setConfirmDel(null)}>
          <div style={{ background: B.sidebar, border: `1px solid ${B.hot}50`, borderRadius: 14,
            padding: "28px 32px", maxWidth: 360, width: "90%" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: B.text, marginBottom: 6 }}>¿Eliminar captación?</div>
            <div style={{ fontSize: 12, color: "#8AAECC", marginBottom: 20 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ flex: 1, padding: 10, borderRadius: 8, cursor: "pointer",
                  background: "transparent", border: `1px solid ${B.border}`, color: "#8AAECC", fontSize: 12 }}>
                Cancelar
              </button>
              <button onClick={eliminar}
                style={{ flex: 1, padding: 10, borderRadius: 8, cursor: "pointer",
                  background: B.hot, border: "none", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .leaflet-container { background: ${B.bg} !important; }
        .leaflet-tile { filter: brightness(0.85) saturate(0.7) hue-rotate(200deg); }
        .leaflet-control-zoom a { background: ${B.card} !important; color: ${B.accentL} !important; border-color: ${B.border} !important; }
        .leaflet-control-attribution { background: rgba(7,14,28,0.8) !important; color: #4A6A90 !important; font-size: 9px; }
      `}</style>
    </div>
  );
}
