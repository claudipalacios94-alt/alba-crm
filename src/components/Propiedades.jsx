// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO PROPIEDADES
// Cards expandibles, categorías, edición inline
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG } from "../data/constants.js";

const CATEGORIAS = [
  { key: "destacada", label: "Destacada",        color: "#E8A830" },
  { key: "hon3",      label: "Honorarios 3%",    color: "#2E9E6A" },
  { key: "hon6",      label: "Honorarios 6%",    color: "#3EAA72" },
  { key: "colega",    label: "Colega",            color: "#9B6DC8" },
  { key: "normal",    label: "Sin categoría",     color: "#4A6A90" },
];

const catInfo = key => CATEGORIAS.find(c => c.key === key) || CATEGORIAS[4];

async function geocodeAddress(dir) {
  if (!dir) return null;
  const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const inMDP = (lat, lng) => lat > -38.15 && lat < -37.85 && lng > -57.75 && lng < -57.40;
  try {
    const r1 = await fetch("https://maps.googleapis.com/maps/api/geocode/json?address=" +
      encodeURIComponent(dir) +
      "&components=locality:Mar+del+Plata|administrative_area:Buenos+Aires|country:AR&key=" + KEY);
    const d1 = await r1.json();
    if (d1.status === "OK" && d1.results.length > 0) {
      const loc = d1.results[0].geometry.location;
      if (inMDP(loc.lat, loc.lng)) return { lat: loc.lat, lng: loc.lng };
    }
    const r2 = await fetch("https://maps.googleapis.com/maps/api/geocode/json?address=" +
      encodeURIComponent(dir + ", Mar del Plata, Buenos Aires, Argentina") + "&key=" + KEY);
    const d2 = await r2.json();
    if (d2.status === "OK" && d2.results.length > 0) {
      const loc = d2.results[0].geometry.location;
      if (inMDP(loc.lat, loc.lng)) return { lat: loc.lat, lng: loc.lng };
    }
  } catch(e) {}
  return null;
}

function PropCard({ p, updateProperty, deleteProperty }) {
  const [open,       setOpen]       = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [editData,   setEditData]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [savingCat,  setSavingCat]  = useState(false);
  const [localCat,   setLocalCat]   = useStatelocalCat;

  const scColor = p.sc?.includes("Urgente") ? B.hot : p.sc?.includes("tenci") ? B.warm : B.ok;
  const cat = catInfolocalCat;

  async function changeCategoria(key) {
    setSavingCat(true);
    setLocalCat(key);
    await updateProperty(p.id, { categoria: key });
    setSavingCat(false);
  }

  function startEdit() {
    setEditData({
      tipo: p.tipo || "", zona: p.zona || "", dir: p.dir || "",
      precio: p.precio || "", m2tot: p.m2tot || "", m2cub: p.m2cub || "",
      caracts: p.caracts || "", info: p.info || "", ag: p.ag || "",
      estado: p.estado || "Buen Estado",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      let lat = p.lat, lng = p.lng;
      if (editData.dir !== p.dir && editData.dir) {
        const coords = await geocodeAddress(editData.dir);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      }
      await updateProperty(p.id, {
        tipo: editData.tipo, zona: editData.zona, dir: editData.dir,
        precio: editData.precio ? Number(editData.precio) : null,
        m2tot:  editData.m2tot  ? Number(editData.m2tot)  : null,
        m2cub:  editData.m2cub  ? Number(editData.m2cub)  : null,
        caracts: editData.caracts, info: editData.info,
        ag: editData.ag, estado: editData.estado, lat, lng,
      });
      setEditing(false);
    } catch(e) { console.error(e); }
    setSaving(false);
  }

  const inp = {
    width: "100%", background: B.bg, border: "1px solid " + B.border,
    borderRadius: 6, padding: "6px 9px", color: B.text, fontSize: 12,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ background: B.card, border: "1px solid " + (open ? B.accentL : B.border),
      borderLeft: "3px solid " + cat.color, borderRadius: 12, overflow: "hidden" }}>

      {/* Cabecera */}
      <div onClick={() => !editing && setOpen(o => !o)}
        style={{ padding: "13px 14px", cursor: editing ? "default" : "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: B.text }}>{p.tipo}</span>
              <span style={{ fontSize: 11, color: "#8AAECC" }}>{p.zona}</span>
              {p.ag && AG[p.ag] && (
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3,
                  background: AG[p.ag].bg, color: AG[p.ag].c, fontWeight: 700 }}>
                  {AG[p.ag].n}
                </span>
              )}
              <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10,
                background: cat.color + "20", color: cat.color, fontWeight: 600, border: "1px solid " + cat.color + "40" }}>
                {cat.label}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#6A8AAE" }}>{p.dir} {p.lat ? "📍" : ""}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif" }}>
              {p.precio ? "USD " + Number(p.precio).toLocaleString() : "A consultar"}
            </div>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4,
                background: scColor + "18", color: scColor }}>{p.sc}</span>
              <span style={{ fontSize: 13, color: B.accentL }}>{open ? "▲" : "▼"}</span>
            </div>
          </div>
        </div>
        {!open && p.caracts && (
          <div style={{ fontSize: 11, color: "#6A8AAE", marginTop: 5, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.caracts}</div>
        )}
      </div>

      {/* Panel expandido — info + categoría */}
      {open && !editing && (
        <div style={{ borderTop: "1px solid " + B.border, padding: "12px 14px",
          background: "rgba(10,21,37,0.4)", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Selector categoría */}
          <div>
            <div style={{ fontSize: 11, color: "#5A7A9A", fontWeight: 600, marginBottom: 7, letterSpacing: "0.8px" }}>CATEGORÍA</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIAS.map(c => (
                <button key={c.key} onClick={() => changeCategoria(c.key)} disabled={savingCat}
                  style={{ padding: "5px 12px", borderRadius: 16, fontSize: 11, cursor: "pointer",
                    background: localCat === c.key ? c.color + "25" : "transparent",
                    border: "1px solid " + (localCat === c.key ? c.color : B.border),
                    color: localCat === c.key ? c.color : "#8AAECC",
                    fontWeight: localCat === c.key ? 700 : 400 }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detalles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {p.estado && <div style={{ fontSize: 12 }}><span style={{ color: "#5A7A9A" }}>Estado: </span><span style={{ color: B.text }}>{p.estado}</span></div>}
            {p.m2tot  && <div style={{ fontSize: 12 }}><span style={{ color: "#5A7A9A" }}>Sup.: </span><span style={{ color: B.text }}>{p.m2tot}m²{p.m2cub ? " · " + p.m2cub + "m² cub" : ""}</span></div>}
            {p.precio && p.m2tot && <div style={{ fontSize: 12 }}><span style={{ color: "#5A7A9A" }}>m²: </span><span style={{ color: B.accentL }}>USD {Math.round(p.precio / p.m2tot).toLocaleString()}</span></div>}
            <div style={{ fontSize: 12 }}><span style={{ color: "#5A7A9A" }}>Cartera: </span><span style={{ color: B.text }}>{p.dias}d</span></div>
          </div>
          {p.caracts && <div style={{ fontSize: 12, color: "#8AAECC" }}>{p.caracts}</div>}
          {p.info    && <div style={{ fontSize: 12, color: "#6A8AAE", fontStyle: "italic" }}>{p.info}</div>}

          {/* Acciones */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={startEdit}
              style={{ flex: 1, padding: "7px", borderRadius: 7, cursor: "pointer",
                background: B.accent + "22", border: "1px solid " + B.accentL + "60",
                color: B.accentL, fontSize: 12, fontWeight: 600 }}>
              Editar
            </button>
            {!confirmDel && (
              <button onClick={() => setConfirmDel(true)}
                style={{ padding: "7px 14px", borderRadius: 7, cursor: "pointer",
                  background: "transparent", border: "1px solid " + B.hot + "40",
                  color: B.hot, fontSize: 12 }}>
                Eliminar
              </button>
            )}
          </div>

          {confirmDel && (
            <div style={{ background: B.hot + "15", border: "1px solid " + B.hot + "50",
              borderRadius: 8, padding: "12px" }}>
              <div style={{ fontSize: 13, color: B.text, marginBottom: 8 }}>
                Eliminar <strong>{p.tipo} — {p.dir}</strong>?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => deleteProperty(p.id)}
                  style={{ flex: 1, padding: "7px", borderRadius: 6, cursor: "pointer",
                    background: B.hot, border: "none", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                  Sí
                </button>
                <button onClick={() => setConfirmDel(false)}
                  style={{ flex: 1, padding: "7px", borderRadius: 6, cursor: "pointer",
                    background: "transparent", border: "1px solid " + B.border, color: "#8AAECC", fontSize: 12 }}>
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulario edición */}
      {editing && (
        <div style={{ borderTop: "1px solid " + B.accentL + "40", padding: "12px 14px",
          background: "rgba(10,21,37,0.6)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.accentL }}>Editando</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 2 }}>TIPO</label>
              <select value={editData.tipo} onChange={e => setEditData(d => ({...d, tipo: e.target.value}))} style={inp}>
                {["Departamento","Casa","PH","Local","Terreno","Otro"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 2 }}>ESTADO</label>
              <select value={editData.estado} onChange={e => setEditData(d => ({...d, estado: e.target.value}))} style={inp}>
                {["Excelente","Buen Estado","Para Reciclar","A Refaccionar"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 2 }}>ZONA</label>
            <input value={editData.zona} onChange={e => setEditData(d => ({...d, zona: e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 2 }}>DIRECCIÓN</label>
            <input value={editData.dir} onChange={e => setEditData(d => ({...d, dir: e.target.value}))} style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <div>
              <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 2 }}>PRECIO USD</label>
              <input type="number" value={editData.precio} onChange={e => setEditData(d => ({...d, precio: e.target.value}))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 2 }}>M² TOT</label>
              <input type="number" value={editData.m2tot} onChange={e => setEditData(d => ({...d, m2tot: e.target.value}))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 2 }}>M² CUB</label>
              <input type="number" value={editData.m2cub} onChange={e => setEditData(d => ({...d, m2cub: e.target.value}))} style={inp} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 2 }}>CARACTERÍSTICAS</label>
            <input value={editData.caracts} onChange={e => setEditData(d => ({...d, caracts: e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 2 }}>INFO INTERNA</label>
            <input value={editData.info} onChange={e => setEditData(d => ({...d, info: e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#8AAECC", display: "block", marginBottom: 2 }}>AGENTE</label>
            <select value={editData.ag} onChange={e => setEditData(d => ({...d, ag: e.target.value}))} style={inp}>
              <option value="">Sin asignar</option>
              {Object.entries(AG).map(([k, v]) => <option key={k} value={k}>{v.n}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={saveEdit} disabled={saving}
              style={{ flex: 1, padding: "8px", borderRadius: 7, cursor: "pointer",
                background: saving ? B.border : B.accent,
                border: "1px solid " + (saving ? B.border : B.accentL),
                color: saving ? "#8AAECC" : "#fff", fontSize: 12, fontWeight: 700 }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ padding: "8px 14px", borderRadius: 7, cursor: "pointer",
                background: "transparent", border: "1px solid " + B.border, color: "#8AAECC", fontSize: 12 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Seccion({ titulo, color, props, updateProperty, deleteProperty, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (props.length === 0) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer",
          padding: "6px 0", borderBottom: "1px solid " + color + "30" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
        <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "1px", textTransform: "uppercase" }}>
          {titulo}
        </span>
        <span style={{ fontSize: 12, color: "#4A6A90" }}>({props.length})</span>
        <span style={{ fontSize: 12, color: "#4A6A90", marginLeft: "auto" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
          {props.map(p => (
            <PropCard key={p.id} p={p} updateProperty={updateProperty} deleteProperty={deleteProperty} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Propiedades({ properties, updateProperty, deleteProperty }) {
  const [ft, setFt] = useState("Todos");
  const [q,  setQ]  = useState("");

  const tipos = ["Todos", ...new Set(properties.map(p => p.tipo).filter(Boolean))];

  const filtered = properties.filter(p => {
    if (ft !== "Todos" && p.tipo !== ft) return false;
    if (q && !((p.dir || "") + (p.zona || "") + (p.tipo || "") + (p.caracts || "")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const destacadas = filtered.filter(p => p.categoria === "destacada");
  const hon3       = filtered.filter(p => p.categoria === "hon3");
  const hon6       = filtered.filter(p => p.categoria === "hon6");
  const colegas    = filtered.filter(p => p.categoria === "colega");
  const resto      = filtered.filter(p => !p.categoria || p.categoria === "normal");

  const ch = act => ({
    padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer",
    border: "1px solid " + (act ? B.accentL : B.border),
    background: act ? B.accentL + "18" : "transparent",
    color: act ? B.accentL : "#8AAECC",
  });

  return (
    <div style={{ overflowX: "hidden" }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: B.text, margin: 0, fontFamily: "Georgia,serif" }}>Propiedades en venta</h1>
          <p style={{ fontSize: 12, color: "#8AAECC", margin: "3px 0 0" }}>{filtered.length} de {properties.length} propiedades</p>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..."
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid " + B.border,
            background: B.card, color: B.text, fontSize: 12, outline: "none", width: 180 }} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 20 }}>
        {tipos.map(t => <button key={t} onClick={() => setFt(t)} style={ch(ft === t)}>{t}</button>)}
      </div>

      <Seccion titulo="Destacadas" color="#E8A830" props={destacadas} updateProperty={updateProperty} deleteProperty={deleteProperty} />
      <Seccion titulo="Honorarios 3%" color="#2E9E6A" props={hon3} updateProperty={updateProperty} deleteProperty={deleteProperty} />
      <Seccion titulo="Honorarios 6%" color="#3EAA72" props={hon6} updateProperty={updateProperty} deleteProperty={deleteProperty} />
      <Seccion titulo="Compartidas por colegas" color="#9B6DC8" props={colegas} updateProperty={updateProperty} deleteProperty={deleteProperty} />
      <Seccion titulo="Sin categoría" color="#4A6A90" props={resto} updateProperty={updateProperty} deleteProperty={deleteProperty} />

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#8AAECC" }}>Sin propiedades</div>
      )}
    </div>
  );
}
