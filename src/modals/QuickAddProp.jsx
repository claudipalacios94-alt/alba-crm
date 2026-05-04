// ══════════════════════════════════════════════════════════════
// ALBA CRM — MODAL CARGA RÁPIDA DE PROPIEDAD
// Con Google Places Autocomplete para dirección precisa
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
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
 
// ── Componente de dirección con autocomplete ──────────────────
function DireccionAutocomplete({ value, onChange, onSelect, error }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
 
  useEffect(() => {
    // Cargar Google Maps script si no está
    if (window.google?.maps?.places) { setLoaded(true); return; }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { existing.onload = () => setLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + GOOGLE_KEY + "&libraries=places";
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
 
  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "ar" },
      bounds: new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(-38.15, -57.75), // SW Mar del Plata
        new window.google.maps.LatLng(-37.85, -57.40)  // NE Mar del Plata
      ),
      strictBounds: false,
      fields: ["formatted_address", "geometry", "name"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const dir = place.name || place.formatted_address;
        onSelect({ dir, lat, lng });
      }
    });
    autocompleteRef.current = ac;
  }, [loaded]);
 
  return (
    <div style={{ position:"relative" }}>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Ej: Bolivar 2379"
        style={{ ...inp, ...(error ? { borderColor: B.hot } : {}) }}
        autoComplete="off"
      />
      {error && <div style={{ fontSize:10, color:B.hot, marginTop:3 }}>{error}</div>}
      {value && !loaded && (
        <div style={{ fontSize:9, color:B.muted, marginTop:3 }}>Cargando sugerencias...</div>
      )}
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
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [err, setErr] = useState({});
 
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
 
  function handleDirSelect({ dir, lat, lng }) {
    setF(p => ({ ...p, dir }));
    setCoords({ lat, lng });
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
      estado: f.estado, caracts: carac,
      dias: 0, sc: "🟢 OK",
      info: [f.info, f.condicion, f.negociable && "Negociable: "+f.negociable, f.permuta !== "No" && "Permuta: "+f.permuta].filter(Boolean).join(" · "),
      lat:  coords.lat,
      lng:  coords.lng,
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
          <DireccionAutocomplete
            value={f.dir}
            onChange={dir => setF(p => ({ ...p, dir }))}
            onSelect={handleDirSelect}
            error={err.dir}
          />
          {coords.lat && (
            <div style={{ fontSize:9, color:B.ok, marginTop:3 }}>
              📍 Ubicación confirmada: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
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
            <option>🔥 Alta</option>
            <option>🟡 Media</option>
            <option>⚪ Baja</option>
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
