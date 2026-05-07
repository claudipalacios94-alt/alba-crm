// ══════════════════════════════════════════════════════════════
// ALBA CRM — MODAL CARGA RÁPIDA DE PROPIEDAD
// Places Autocomplete via REST API (sin SDK, sin conflicto Leaflet)
// ══════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect } from "react";
import { B, AG, TIPOS_PROP_VENTA, ESTADOS_PROP } from "../data/constants.js";
 
const GOOGLE_KEY = "AIzaSyD2ZKp0GLdu7rUTD2DWrOrpCy8LHeulGZM";
const MDP_CENTER = "point:-38.002,-57.555";
 
const inp = {
  width:"100%", background:"#0F1E35", border:"1px solid #1A2F50",
  borderRadius:8, padding:"9px 12px", color:"#E8EEF8",
  fontSize:13, outline:"none", boxSizing:"border-box",
  fontFamily:"'Trebuchet MS',sans-serif",
};
 
function Field({ label, required, half, children }) {
  return (
    <div style={{ marginBottom:12, flex: half ? "1 1 calc(50% - 6px)" : "1 1 100%", minWidth: half ? 160 : 0 }}>
      <label style={{ fontSize:12, color:"#9ABCDA", letterSpacing:"0.8px", textTransform:"uppercase", display:"block", marginBottom:5 }}>
        {label}{required && <span style={{ color:"#E85D30", marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
 
function Section({ n, title }) {
  return (
    <>
      <div style={{ height:1, background:"#4A6A90", margin:"14px 0 12px" }} />
      <div style={{ fontSize:11, color:"#4A8AE8", fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>
        {n} {title}
      </div>
    </>
  );
}
 
// ── Autocomplete via Places API REST ─────────────────────────
function DireccionField({ value, onChange, onSelect, error }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const timerRef = useRef(null);
 
  async function buscar(texto) {
    if (!texto || texto.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const resp = await fetch(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json?" +
        "input=" + encodeURIComponent(texto) +
        "&components=country:ar" +
        "&location=-38.002,-57.555&radius=20000" +
        "&language=es" +
        "&key=" + GOOGLE_KEY,
        { mode: "cors" }
      );
      const data = await resp.json();
      if (data.predictions?.length) {
        setSuggestions(data.predictions.slice(0, 5));
        setOpen(true);
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    } catch(e) {
      // CORS bloqueado — usar geocoding directo
      setSuggestions([]);
      setOpen(false);
    }
    setLoading(false);
  }
 
  async function seleccionar(prediction) {
    setOpen(false);
    const desc = prediction.structured_formatting?.main_text || prediction.description;
    onChange(desc);
    // Geocodificar el place_id
    try {
      const resp = await fetch(
        "https://maps.googleapis.com/maps/api/place/details/json?" +
        "place_id=" + prediction.place_id +
        "&fields=geometry,name,formatted_address" +
        "&key=" + GOOGLE_KEY
      );
      const data = await resp.json();
      if (data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        onSelect({ dir: desc, lat, lng });
      }
    } catch(e) {}
  }
 
  function handleChange(e) {
    const val = e.target.value;
    onChange(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => buscar(val), 350);
  }
 
  return (
    <div style={{ position:"relative" }}>
      <input
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="ej: Bolivar 2379"
        style={{ ...inp, ...(error ? { borderColor: B.hot } : {}) }}
        autoComplete="off"
      />
      {loading && (
        <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
          width:12, height:12, border:"2px solid " + B.border,
          borderTop:"2px solid " + B.accentL, borderRadius:"50%",
          animation:"spin .7s linear infinite" }} />
      )}
      {open && suggestions.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:9999,
          background:"#0F1E35", border:"1px solid #1A2F50", borderRadius:8,
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)", overflow:"hidden" }}>
          {suggestions.map(s => (
            <div key={s.place_id}
              onMouseDown={() => seleccionar(s)}
              style={{ padding:"9px 12px", cursor:"pointer", fontSize:12, color:"#E8EEF8",
                borderBottom:"1px solid #1A2F50",
                transition:"background .1s" }}
              onMouseEnter={e => e.target.style.background = "#4A6A90"}
              onMouseLeave={e => e.target.style.background = "transparent"}>
              <div style={{ fontWeight:600 }}>{s.structured_formatting?.main_text || s.description}</div>
              <div style={{ fontSize:12, color:"#9ABCDA", marginTop:2 }}>{s.structured_formatting?.secondary_text || ""}</div>
            </div>
          ))}
        </div>
      )}
      {error && <div style={{ fontSize:12, color:B.hot, marginTop:3 }}>{error}</div>}
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
 
export default function QuickAddProp({ onClose, onAdd }) {
  const [f, setF] = useState({
    tipo:"Departamento", zona:"", dir:"", estado:"Buen Estado",
    m2tot:"", m2cub:"", precio:"",
    ambientes:"", cochera:"", balcon:"", antiguedad:"",
    caracts:"", info:"", ag:"",
    urgencia:"🟡 Media", negociable:"", permuta:"No", condicion:"",
  });
  const [coords, setCoords] = useState(null);
  const [err,    setErr]    = useState({});
 
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
 
  function submit() {
    const e = {};
    if (!f.zona.trim()) e.zona   = "Obligatorio";
    if (!f.dir.trim())  e.dir    = "Obligatorio";
    if (!f.precio)      e.precio = "Obligatorio";
    if (Object.keys(e).length) { setErr(e); return; }
 
    const carac = [
      f.ambientes && f.ambientes + " amb",
      f.cochera && "Cochera: " + f.cochera,
      f.balcon && "Balcón/Patio: " + f.balcon,
      f.antiguedad && "Antigüedad: " + f.antiguedad,
      f.caracts,
    ].filter(Boolean).join(", ");
 
    onAdd({
      tipo: f.tipo, zona: f.zona.trim(), dir: f.dir.trim(),
      precio: Number(f.precio),
      m2tot: f.m2tot ? Number(f.m2tot) : null,
      m2cub: f.m2cub ? Number(f.m2cub) : null,
      estado: f.estado, caracts: carac, dias: 0, sc: "🟢 OK",
      info: [f.info, f.condicion, f.negociable && "Negociable: "+f.negociable, f.permuta !== "No" && "Permuta: "+f.permuta].filter(Boolean).join(" · "),
      lat: coords?.lat || null,
      lng: coords?.lng || null,
      ag: f.ag || "",
    });
  }
 
  return (
    <div>
      <div style={{ fontSize:11, color:B.accentL, fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>① IDENTIFICACIÓN</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
        <Field label="Tipo" required half>
          <select style={inp} value={f.tipo} onChange={set("tipo")}>
            {TIPOS_PROP_VENTA.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Estado" half>
          <select style={inp} value={f.estado} onChange={set("estado")}>
            {ESTADOS_PROP.map(e => <option key={e}>{e}</option>)}
          </select>
        </Field>
        <Field label="Zona" required>
          <input style={{ ...inp, ...(err.zona ? { borderColor: B.hot } : {}) }}
            value={f.zona} onChange={set("zona")} placeholder="ej: La Perla, Centro, Chauvin" />
          {err.zona && <div style={{ fontSize:12, color:B.hot, marginTop:3 }}>{err.zona}</div>}
        </Field>
        <Field label="Dirección" required>
          <DireccionField
            value={f.dir}
            onChange={dir => { setF(p => ({...p, dir})); setCoords(null); }}
            onSelect={({ dir, lat, lng }) => { setF(p => ({...p, dir})); setCoords({ lat, lng }); }}
            error={err.dir}
          />
          {coords && (
            <div style={{ fontSize:11, color:B.ok, marginTop:4 }}>
              📍 Ubicación confirmada · {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </div>
          )}
        </Field>
      </div>
 
      <Section n="②" title="SUPERFICIE Y PRECIO" />
      <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
        <Field label="M² totales" half>
          <input style={inp} type="number" value={f.m2tot} onChange={set("m2tot")} placeholder="ej: 65" />
        </Field>
        <Field label="M² cubiertos" half>
          <input style={inp} type="number" value={f.m2cub} onChange={set("m2cub")} placeholder="ej: 55" />
        </Field>
        <Field label="Precio USD" required half>
          <input style={{ ...inp, ...(err.precio ? { borderColor: B.hot } : {}) }}
            type="number" value={f.precio} onChange={set("precio")} placeholder="ej: 115000" />
          {err.precio && <div style={{ fontSize:12, color:B.hot, marginTop:3 }}>{err.precio}</div>}
        </Field>
        {f.precio && f.m2tot && (
          <Field label="Precio/m² (auto)" half>
            <div style={{ ...inp, color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700 }}>
              USD {Math.round(Number(f.precio) / Number(f.m2tot)).toLocaleString()}/m²
            </div>
          </Field>
        )}
      </div>
 
      <Section n="③" title="CARACTERÍSTICAS" />
      <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
        <Field label="Ambientes" half>
          <input style={inp} value={f.ambientes} onChange={set("ambientes")} placeholder="ej: 3" />
        </Field>
        <Field label="Cochera" half>
          <input style={inp} value={f.cochera} onChange={set("cochera")} placeholder="Sí / No" />
        </Field>
        <Field label="Balcón / Patio" half>
          <input style={inp} value={f.balcon} onChange={set("balcon")} placeholder="Sí / No" />
        </Field>
        <Field label="Antigüedad" half>
          <input style={inp} value={f.antiguedad} onChange={set("antiguedad")} placeholder="ej: A estrenar, +20 años" />
        </Field>
        <Field label="Descripción adicional">
          <input style={inp} value={f.caracts} onChange={set("caracts")} placeholder="ej: Luminoso, frente, piso 3°..." />
        </Field>
        <Field label="Información interna">
          <input style={inp} value={f.info} onChange={set("info")} placeholder="ej: Pago honorarios, apto crédito..." />
        </Field>
      </div>
 
      <Section n="④" title="AGENTE Y CONDICIONES" />
      <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
        <Field label="Agente que captó" half>
          <select style={inp} value={f.ag} onChange={set("ag")}>
            <option value="">Sin asignar</option>
            {Object.entries(AG).map(([k,v]) => <option key={k} value={k}>{v.n}</option>)}
          </select>
        </Field>
        <Field label="Urgencia propietario" half>
          <select style={inp} value={f.urgencia} onChange={set("urgencia")}>
            <option>🔥 Alta</option><option>🟡 Media</option><option>⚪ Baja</option>
          </select>
        </Field>
        <Field label="Precio negociable" half>
          <input style={inp} value={f.negociable} onChange={set("negociable")} placeholder="ej: Poco, Sí, No" />
        </Field>
        <Field label="Acepta permuta" half>
          <select style={inp} value={f.permuta} onChange={set("permuta")}>
            {["No","Sí","A evaluar"].map(o => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Condición especial">
          <input style={inp} value={f.condicion} onChange={set("condicion")} placeholder="ej: Exclusiva, pago honorarios..." />
        </Field>
      </div>
 
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button onClick={onClose}
          style={{ flex:1, padding:"11px", borderRadius:9, background:"transparent",
            border:"1px solid " + B.border, color:"#8AAECC", fontSize:13, cursor:"pointer" }}>
          Cancelar
        </button>
        <button onClick={submit}
          style={{ flex:2, padding:"11px", borderRadius:9, background:B.accent,
            border:"1px solid " + B.accentL, color:"#fff", fontSize:13, fontWeight:700,
            cursor:"pointer", fontFamily:"Georgia,serif" }}>
          Guardar propiedad
        </button>
      </div>
    </div>
  );
}
