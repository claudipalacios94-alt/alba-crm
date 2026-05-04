// ══════════════════════════════════════════════════════════════
// ALBA CRM — MODAL CARGA RÁPIDA DE PROPIEDAD
// Geocodificación manual con verificación antes de guardar
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG, TIPOS_PROP_VENTA, ESTADOS_PROP } from "../data/constants.js";
 
const GOOGLE_KEY = "AIzaSyD2ZKp0GLdu7rUTD2DWrOrpCy8LHeulGZM";
 
const inp = {
  width:"100%", background:"#0F1E35", border:"1px solid #1A2F50",
  borderRadius:8, padding:"9px 12px", color:"#E8EEF8",
  fontSize:13, outline:"none", boxSizing:"border-box",
  fontFamily:"'Trebuchet MS',sans-serif",
};
 
function Field({ label, required, half, children }) {
  return (
    <div style={{ marginBottom:12, flex: half ? "1 1 calc(50% - 6px)" : "1 1 100%", minWidth: half ? 160 : 0 }}>
      <label style={{ fontSize:10, color:"#7A96B8", letterSpacing:"0.8px", textTransform:"uppercase", display:"block", marginBottom:5 }}>
        {label}{required && <span style={{ color:"#E85D30", marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
 
function Section({ n, title }) {
  return (
    <>
      <div style={{ height:1, background:"#1A2F50", margin:"14px 0 12px" }} />
      <div style={{ fontSize:11, color:"#4A8AE8", fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>
        {n} {title}
      </div>
    </>
  );
}
 
async function geocodificar(dir) {
  if (!dir) return null;
  const inMDP = (lat, lng) => lat > -38.15 && lat < -37.85 && lng > -57.75 && lng < -57.40;
  try {
    const r = await fetch(
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
      encodeURIComponent(dir + ", Mar del Plata, Buenos Aires, Argentina") +
      "&key=" + GOOGLE_KEY
    );
    const d = await r.json();
    if (d.status === "OK" && d.results.length > 0) {
      const loc = d.results[0].geometry.location;
      if (inMDP(loc.lat, loc.lng)) {
        return { lat: loc.lat, lng: loc.lng, formatted: d.results[0].formatted_address };
      }
      return { lat: loc.lat, lng: loc.lng, formatted: d.results[0].formatted_address, warning: true };
    }
  } catch(e) {}
  return null;
}
 
export default function QuickAddProp({ onClose, onAdd }) {
  const [f, setF] = useState({
    tipo:"Departamento", zona:"", dir:"", estado:"Buen Estado",
    m2tot:"", m2cub:"", precio:"",
    ambientes:"", cochera:"", balcon:"", antiguedad:"",
    caracts:"", info:"", ag:"",
    urgencia:"🟡 Media", negociable:"", permuta:"No", condicion:"",
  });
  const [coords,    setCoords]    = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [err,       setErr]       = useState({});
 
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
 
  async function verificarDireccion() {
    if (!f.dir.trim()) return;
    setGeocoding(true);
    setCoords(null);
    const result = await geocodificar(f.dir.trim());
    setCoords(result);
    setGeocoding(false);
  }
 
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
          {err.zona && <div style={{ fontSize:10, color:B.hot, marginTop:3 }}>{err.zona}</div>}
        </Field>
        <Field label="Dirección" required>
          <div style={{ display:"flex", gap:6 }}>
            <input
              style={{ ...inp, ...(err.dir ? { borderColor: B.hot } : {}), flex:1 }}
              value={f.dir}
              onChange={e => { set("dir")(e); setCoords(null); }}
              placeholder="ej: Bolivar 2379"
              onBlur={verificarDireccion}
            />
            <button onClick={verificarDireccion} disabled={geocoding || !f.dir.trim()}
              style={{ padding:"9px 12px", borderRadius:8, cursor:"pointer",
                background: B.accentL + "18", border:"1px solid " + B.accentL + "50",
                color:B.accentL, fontSize:11, fontWeight:700, whiteSpace:"nowrap",
                opacity: (!f.dir.trim() || geocoding) ? 0.5 : 1 }}>
              {geocoding ? "..." : "📍 Verificar"}
            </button>
          </div>
          {err.dir && <div style={{ fontSize:10, color:B.hot, marginTop:3 }}>{err.dir}</div>}
          {coords && !coords.warning && (
            <div style={{ fontSize:9, color:B.ok, marginTop:4 }}>
              ✅ Ubicada: {coords.formatted}
            </div>
          )}
          {coords && coords.warning && (
            <div style={{ fontSize:9, color:B.warm, marginTop:4 }}>
              ⚠️ Encontrada fuera de MDP: {coords.formatted} — verificá la dirección
            </div>
          )}
          {coords === null && !geocoding && f.dir && (
            <div style={{ fontSize:9, color:B.dim, marginTop:4 }}>
              Apretá "Verificar" para confirmar la ubicación en el mapa
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
          {err.precio && <div style={{ fontSize:10, color:B.hot, marginTop:3 }}>{err.precio}</div>}
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
            border:"1px solid " + B.border, color:B.muted, fontSize:13, cursor:"pointer" }}>
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
