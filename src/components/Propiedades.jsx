// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO PROPIEDADES
// Grid filtrable con edición inline
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG } from "../data/constants.js";

const GOOGLE_KEY = "AIzaSyD2ZKp0GLdu7rUTD2DWrOrpCy8LHeulGZM";

async function geocodeAddress(dir) {
  if (!dir) return null;
  const inMDP = (lat, lng) => lat > -38.15 && lat < -37.85 && lng > -57.75 && lng < -57.40;
  try {
    // Intento 1: componentes estructurados
    const r1 = await fetch("https://maps.googleapis.com/maps/api/geocode/json?address=" +
      encodeURIComponent(dir) +
      "&components=locality:Mar+del+Plata|administrative_area:Buenos+Aires|country:AR&key=" + GOOGLE_KEY);
    const d1 = await r1.json();
    if (d1.status === "OK" && d1.results.length > 0) {
      const loc = d1.results[0].geometry.location;
      if (inMDP(loc.lat, loc.lng)) return { lat: loc.lat, lng: loc.lng };
    }
    // Intento 2: dirección completa
    const r2 = await fetch("https://maps.googleapis.com/maps/api/geocode/json?address=" +
      encodeURIComponent(dir + ", Mar del Plata, Buenos Aires, Argentina") + "&key=" + GOOGLE_KEY);
    const d2 = await r2.json();
    if (d2.status === "OK" && d2.results.length > 0) {
      const loc = d2.results[0].geometry.location;
      if (inMDP(loc.lat, loc.lng)) return { lat: loc.lat, lng: loc.lng };
    }
  } catch(e) {}
  return null;
}

export default function Propiedades({ properties, updateProperty }) {
  const [ft,       setFt]       = useState("Todos");
  const [fs,       setFs]       = useState("Todos");
  const [editing,  setEditing]  = useState(null);
  const [editData, setEditData] = useState({});
  const [saving,   setSaving]   = useState(false);

  const tipos = ["Todos", ...new Set(properties.map(p => p.tipo).filter(Boolean))];
  const list  = properties.filter(p =>
    (ft === "Todos" || p.tipo === ft) &&
    (fs === "Todos"
      || (fs === "Urgente"  && p.sc?.includes("Urgente"))
      || (fs === "Atención" && p.sc?.includes("Atención"))
      || (fs === "OK"       && p.sc?.includes("OK")))
  );

  const ch = act => ({
    padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer",
    border: "1px solid " + (act ? B.accentL : B.border),
    background: act ? B.accentL + "18" : "transparent",
    color: act ? B.accentL : B.muted,
  });

  const scColor = p =>
    p.sc?.includes("Urgente")  ? B.hot  :
    p.sc?.includes("Atención") ? B.warm : B.ok;

  function startEdit(p) {
    setEditing(p.id);
    setEditData({
      tipo: p.tipo || "", zona: p.zona || "", dir: p.dir || "",
      precio: p.precio || "", m2tot: p.m2tot || "", m2cub: p.m2cub || "",
      caracts: p.caracts || "", info: p.info || "", ag: p.ag || "",
      lat: p.lat || "", lng: p.lng || "",
    });
  }

  async function saveEdit(id) {
    setSaving(true);
    try {
      let lat = editData.lat ? Number(editData.lat) : null;
      let lng = editData.lng ? Number(editData.lng) : null;
      const original = properties.find(p => p.id === id);
      if (editData.dir !== original?.dir && editData.dir) {
        const coords = await geocodeAddress(editData.dir);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      }
      await updateProperty(id, {
        tipo: editData.tipo, zona: editData.zona, dir: editData.dir,
        precio: editData.precio ? Number(editData.precio) : null,
        m2tot:  editData.m2tot  ? Number(editData.m2tot)  : null,
        m2cub:  editData.m2cub  ? Number(editData.m2cub)  : null,
        caracts: editData.caracts, info: editData.info, ag: editData.ag,
        lat, lng,
      });
      setEditing(null);
    } catch(e) { console.error(e); }
    setSaving(false);
  }

  const inp = {
    width: "100%", background: B.bg, border: "1px solid " + B.border,
    borderRadius: 6, padding: "6px 9px", color: B.text, fontSize: 11,
    outline: "none", boxSizing: "border-box", fontFamily: "'Trebuchet MS',sans-serif",
  };

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Propiedades en venta</h1>
        <p style={{ fontSize:11, color:B.muted, margin:"3px 0 0" }}>{list.length} de {properties.length} propiedades</p>
      </div>

      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
        {tipos.map(t => <button key={t} onClick={() => setFt(t)} style={ch(ft === t)}>{t}</button>)}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:18 }}>
        {["Todos","OK","Atención","Urgente"].map(s => (
          <button key={s} onClick={() => setFs(s)}
            style={{ ...ch(fs === s),
              borderColor: fs === s ? (s === "Urgente" ? B.hot : s === "Atención" ? B.warm : B.accentL) : B.border,
              color: fs === s ? (s === "Urgente" ? B.hot : s === "Atención" ? B.warm : B.accentL) : B.muted }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
        {list.map(p => {
          const c    = scColor(p);
          const isEd = editing === p.id;
          return (
            <div key={p.id} style={{ background:B.card, border:"1px solid " + (isEd ? B.accentL : B.border),
              borderRadius:12, padding:"14px", borderLeft:"3px solid " + c }}>

              {isEd ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:B.accentL }}>✏️ Editando</div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    <div>
                      <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>TIPO</label>
                      <select value={editData.tipo} onChange={e => setEditData(d => ({...d, tipo:e.target.value}))} style={inp}>
                        {["Departamento","Casa","PH","Dúplex","Local","Terreno","Otro"].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>AGENTE</label>
                      <select value={editData.ag} onChange={e => setEditData(d => ({...d, ag:e.target.value}))} style={inp}>
                        <option value="">Sin asignar</option>
                        {Object.entries(AG).map(([k,v]) => <option key={k} value={k}>{v.n}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>ZONA</label>
                    <input value={editData.zona} onChange={e => setEditData(d => ({...d, zona:e.target.value}))} style={inp} />
                  </div>

                  <div>
                    <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>DIRECCIÓN (se geocodifica sola)</label>
                    <input value={editData.dir} onChange={e => setEditData(d => ({...d, dir:e.target.value}))} style={inp} placeholder="Ej: Bolivar 2379" />
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                    <div>
                      <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>PRECIO USD</label>
                      <input type="number" value={editData.precio} onChange={e => setEditData(d => ({...d, precio:e.target.value}))} style={inp} />
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>M² TOT</label>
                      <input type="number" value={editData.m2tot} onChange={e => setEditData(d => ({...d, m2tot:e.target.value}))} style={inp} />
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>M² CUB</label>
                      <input type="number" value={editData.m2cub} onChange={e => setEditData(d => ({...d, m2cub:e.target.value}))} style={inp} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>CARACTERÍSTICAS</label>
                    <input value={editData.caracts} onChange={e => setEditData(d => ({...d, caracts:e.target.value}))} style={inp} />
                  </div>

                  <div>
                    <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>INFO INTERNA</label>
                    <input value={editData.info} onChange={e => setEditData(d => ({...d, info:e.target.value}))} style={inp} />
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    <div>
                      <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>LAT (manual)</label>
                      <input value={editData.lat} onChange={e => setEditData(d => ({...d, lat:e.target.value}))} style={inp} placeholder="-38.002" />
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:B.muted, display:"block", marginBottom:2 }}>LNG (manual)</label>
                      <input value={editData.lng} onChange={e => setEditData(d => ({...d, lng:e.target.value}))} style={inp} placeholder="-57.555" />
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:8, marginTop:4 }}>
                    <button onClick={() => saveEdit(p.id)} disabled={saving}
                      style={{ flex:1, padding:"8px", borderRadius:7, cursor:"pointer",
                        background: saving ? B.border : B.accent,
                        border:"1px solid " + (saving ? B.border : B.accentL),
                        color: saving ? B.muted : "#fff", fontSize:12, fontWeight:700 }}>
                      {saving ? "Guardando..." : "✓ Guardar"}
                    </button>
                    <button onClick={() => setEditing(null)}
                      style={{ padding:"8px 14px", borderRadius:7, cursor:"pointer",
                        background:"transparent", border:"1px solid " + B.border,
                        color:B.muted, fontSize:12 }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:B.text }}>{p.tipo}</div>
                      <div style={{ fontSize:10, color:B.muted, marginTop:1 }}>{p.zona}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                      <div style={{ fontSize:9, padding:"2px 7px", borderRadius:4, background:c+"18", color:c }}>{p.sc}</div>
                      {p.ag && AG[p.ag] && (
                        <div style={{ fontSize:9, padding:"1px 5px", borderRadius:3,
                          background:AG[p.ag].bg, color:AG[p.ag].c, fontWeight:700 }}>
                          {AG[p.ag].n}
                        </div>
                      )}
                      <button onClick={() => startEdit(p)}
                        style={{ background:"transparent", border:"1px solid " + B.border,
                          borderRadius:5, padding:"2px 8px", cursor:"pointer",
                          color:B.muted, fontSize:10 }}>
                        ✏️ Editar
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize:11, color:B.muted, marginBottom:7 }}>
                    {p.dir} {p.lat ? "📍" : ""}
                  </div>
                  <div style={{ fontSize:11, color:B.dim, marginBottom:9 }}>{p.caracts}</div>

                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontSize:15, fontWeight:700, color:B.accentL, fontFamily:"Georgia,serif" }}>
                      {p.precio ? "USD " + p.precio.toLocaleString() : "A consultar"}
                    </div>
                    <div style={{ fontSize:10, color:B.dim }}>{p.dias}d en cartera</div>
                  </div>

                  {p.m2tot && (
                    <div style={{ fontSize:10, color:B.muted, marginTop:4 }}>
                      {p.m2tot}m² tot
                      {p.m2cub ? " · " + p.m2cub + "m² cub" : ""}
                      {p.precio && p.m2tot ? " · USD " + Math.round(p.precio / p.m2tot).toLocaleString() + "/m²" : ""}
                    </div>
                  )}

                  {p.info && (
                    <div style={{ fontSize:10, color:B.dim, marginTop:5, fontStyle:"italic" }}>{p.info}</div>
                  )}
                </>
              )}
            </div>
          );
        })}
        {list.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"40px", color:B.muted }}>Sin propiedades</div>
        )}
      </div>
    </div>
  );
}
