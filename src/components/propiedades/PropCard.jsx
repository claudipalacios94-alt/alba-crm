// ══════════════════════════════════════════════════════════════
// ALBA CRM — PropCard
// Card expandible de una propiedad: detalle, edición, matches
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG } from "../../data/constants.js";
import { getCategoriaInfo, CATEGORIAS_PROP, colorStockCritico } from "../../domain/property.js";
import { matchPropLeads } from "../../domain/matching.js";
import { geocodeNominatim } from "../../hooks/useLeaflet.js";
import PropDocumentos from "./PropDocumentos.jsx";

const TIPOS_PROP = ["Departamento","Casa","PH","Local","Terreno","Otro"];
const ESTADOS    = ["Excelente","Buen Estado","Para Reciclar","A Refaccionar"];

export default function PropCard({ p, leads, supabase, updateProperty, deleteProperty, mobile }) {
  const [open,       setOpen]       = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [editData,   setEditData]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [savingCat,  setSavingCat]  = useState(false);
  const [localCat,   setLocalCat]   = useState(p.categoria || "normal");

  const cat      = getCategoriaInfo(localCat);
  const scColor  = colorStockCritico(p.sc, { hot: B.hot, warm: B.warm, ok: B.ok });
  const matches  = open ? matchPropLeads(p, leads) : [];

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
      precio_original: p.precio_original || p.precio || "",
      descripcion: p.descripcion || "", fotos: p.fotos || "",
      estado: p.estado || "Buen Estado",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      let lat = p.lat, lng = p.lng;
      if (editData.dir !== p.dir && editData.dir) {
        const coords = await geocodeNominatim(editData.dir);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      }
      const nuevoP = editData.precio ? Number(editData.precio) : null;
      const origP  = p.precio_original || p.precio;
      await updateProperty(p.id, {
        tipo: editData.tipo, zona: editData.zona, dir: editData.dir,
        precio: nuevoP,
        precio_original: nuevoP && origP && nuevoP < origP ? origP : (nuevoP > origP ? nuevoP : origP),
        m2tot:  editData.m2tot  ? Number(editData.m2tot)  : null,
        m2cub:  editData.m2cub  ? Number(editData.m2cub)  : null,
        caracts: editData.caracts, info: editData.info,
        ag: editData.ag, estado: editData.estado, lat, lng,
        descripcion: editData.descripcion || null,
        fotos: editData.fotos || null,
      });
      setEditing(false);
    } catch(e) { console.error(e); }
    setSaving(false);
  }

  const inp = {
    width:"100%", background:B.bg, border:"1px solid "+B.border, borderRadius:6,
    padding: mobile ? "8px 10px" : "6px 9px", color:B.text,
    fontSize: mobile ? 13 : 12, outline:"none", boxSizing:"border-box",
  };

  return (
    <div style={{ background:B.card, border:"1px solid "+(open ? B.accentL : B.border),
      borderLeft:"3px solid "+cat.color, borderRadius:12, overflow:"hidden" }}>

      {/* ── Header clickeable ── */}
      <div onClick={() => { if (!editing) setOpen(o => !o); }}
        style={{ padding: mobile ? "14px" : "13px 14px", cursor: editing ? "default" : "pointer" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, flexWrap: mobile ? "wrap" : "nowrap" }}>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:3 }}>
              <span style={{ fontSize: mobile ? 14 : 13, fontWeight:700, color:B.text }}>{p.tipo}</span>
              <span style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC" }}>{p.zona}</span>
              {p.ag && AG[p.ag] && (
                <span style={{ fontSize: mobile ? 11 : 10, padding: mobile ? "2px 7px" : "1px 6px",
                  borderRadius:3, background:AG[p.ag].bg, color:AG[p.ag].c, fontWeight:700 }}>
                  {AG[p.ag].n}
                </span>
              )}
              <span style={{ fontSize: mobile ? 11 : 10, padding: mobile ? "2px 8px" : "1px 7px",
                borderRadius:10, background:cat.color+"20", color:cat.color,
                fontWeight:600, border:"1px solid "+cat.color+"40" }}>
                {cat.label}
              </span>
            </div>
            <div style={{ fontSize: mobile ? 12 : 11, color:"#6A8AAE" }}>{p.dir} {p.lat ? "📍" : ""}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
            <div style={{ fontSize: mobile ? 16 : 15, fontWeight:700, color:B.accentL, fontFamily:"Georgia,serif" }}>
              {p.precio ? "USD "+Number(p.precio).toLocaleString() : "A consultar"}
            </div>
            {p.precio_original && p.precio && Number(p.precio) < Number(p.precio_original) && (
              <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                <span style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", textDecoration:"line-through" }}>
                  USD {Number(p.precio_original).toLocaleString()}
                </span>
                <span style={{ fontSize: mobile ? 12 : 11, padding: mobile ? "3px 9px" : "2px 8px",
                  borderRadius:8, background:"rgba(255,107,53,0.2)", color:"#FF6B35",
                  fontWeight:700, border:"1px solid rgba(255,107,53,0.5)" }}>↓ RETASADO</span>
                <span style={{ fontSize: mobile ? 11 : 10, color:"#FF6B35" }}>
                  -{Math.round((1 - Number(p.precio)/Number(p.precio_original))*100)}%
                </span>
              </div>
            )}
            <div style={{ display:"flex", gap:5, alignItems:"center" }}>
              <span style={{ fontSize: mobile ? 11 : 10, padding: mobile ? "3px 7px" : "2px 6px",
                borderRadius:4, background:scColor+"18", color:scColor }}>{p.sc}</span>
              <span style={{ fontSize: mobile ? 14 : 13, color:B.accentL }}>{open ? "▲" : "▼"}</span>
            </div>
          </div>
        </div>
        {!open && p.caracts && (
          <div style={{ fontSize: mobile ? 12 : 11, color:"#6A8AAE", marginTop:5,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.caracts}</div>
        )}
      </div>

      {/* ── Detalle expandido ── */}
      {open && !editing && (
        <div style={{ borderTop:"1px solid "+B.border, padding: mobile ? "14px" : "12px 14px",
          background:"rgba(10,21,37,0.4)", display:"flex", flexDirection:"column", gap: mobile ? 14 : 12 }}>

          {/* Matches */}
          {matches.length === 0 ? (
            <div style={{ padding: mobile ? "10px 14px" : "8px 12px", borderRadius:8,
              background:"rgba(204,34,51,0.1)", border:"1px solid rgba(204,34,51,0.3)" }}>
              <div style={{ fontSize: mobile ? 12 : 11, color:"#CC2233", fontWeight:600, marginBottom:2 }}>Sin leads interesados</div>
              <div style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC" }}>Ningún lead activo matchea esta propiedad. Considerá retasar o ampliar la búsqueda.</div>
            </div>
          ) : (
            <div style={{ padding: mobile ? "10px 14px" : "8px 12px", borderRadius:8,
              background:"rgba(46,158,106,0.08)", border:"1px solid rgba(46,158,106,0.25)" }}>
              <div style={{ fontSize: mobile ? 12 : 11, color:"#2E9E6A", fontWeight:600, marginBottom:6 }}>
                {matches.length} lead{matches.length > 1 ? "s" : ""} interesado{matches.length > 1 ? "s" : ""}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap: mobile ? 6 : 4 }}>
                {matches.map(lead => {
                  const waLink = lead.tel ? "https://wa.me/"+lead.tel.replace(/\D/g,"") : null;
                  return (
                    <div key={lead.id} style={{ display:"flex", alignItems:"center", gap:8,
                      justifyContent:"space-between", flexWrap: mobile ? "wrap" : "nowrap" }}>
                      <div>
                        <span style={{ fontSize: mobile ? 13 : 12, color:"#E8F0FA", fontWeight:500 }}>{lead.nombre}</span>
                        <span style={{ fontSize: mobile ? 12 : 11, color:"#6A8AAE", marginLeft:6 }}>
                          {lead.tipo} · {lead.zona} · USD {lead.presup?.toLocaleString()}
                        </span>
                      </div>
                      {waLink && (
                        <a href={waLink} target="_blank" rel="noreferrer"
                          style={{ fontSize: mobile ? 11 : 10, padding: mobile ? "4px 10px" : "2px 8px",
                            borderRadius:6, background:"rgba(37,211,102,0.12)",
                            border:"1px solid rgba(37,211,102,0.3)", color:"#25D366",
                            textDecoration:"none", fontWeight:600, flexShrink:0 }}>WA</a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categoría */}
          <div>
            <div style={{ fontSize: mobile ? 12 : 11, color:"#5A7A9A", fontWeight:600,
              marginBottom: mobile ? 8 : 7, letterSpacing:"0.8px" }}>CATEGORÍA</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap: mobile ? 8 : 6 }}>
              {CATEGORIAS_PROP.map(c => (
                <button key={c.key} onClick={() => changeCategoria(c.key)} disabled={savingCat}
                  style={{ padding: mobile ? "6px 14px" : "5px 12px", borderRadius:16,
                    fontSize: mobile ? 12 : 11, cursor:"pointer",
                    background: localCat === c.key ? c.color+"25" : "transparent",
                    border:"1px solid "+(localCat === c.key ? c.color : B.border),
                    color: localCat === c.key ? c.color : "#8AAECC",
                    fontWeight: localCat === c.key ? 700 : 400 }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 6 }}>
            {p.estado && <div style={{ fontSize: mobile ? 13 : 12 }}><span style={{ color:"#5A7A9A" }}>Estado: </span><span style={{ color:B.text }}>{p.estado}</span></div>}
            {p.m2tot  && <div style={{ fontSize: mobile ? 13 : 12 }}><span style={{ color:"#5A7A9A" }}>Sup.: </span><span style={{ color:B.text }}>{p.m2tot}m²{p.m2cub ? " · "+p.m2cub+"m² cub" : ""}</span></div>}
            {p.precio && p.m2tot && <div style={{ fontSize: mobile ? 13 : 12 }}><span style={{ color:"#5A7A9A" }}>m²: </span><span style={{ color:B.accentL }}>USD {Math.round(p.precio/p.m2tot).toLocaleString()}</span></div>}
            <div style={{ fontSize: mobile ? 13 : 12 }}><span style={{ color:"#5A7A9A" }}>Cartera: </span><span style={{ color:B.text }}>{p.dias}d</span></div>
          </div>

          {p.caracts    && <div style={{ fontSize: mobile ? 13 : 12, color:"#8AAECC" }}>{p.caracts}</div>}
          {p.descripcion && <div style={{ fontSize: mobile ? 13 : 12, color:"#8AAECC", lineHeight:1.6, fontStyle:"italic" }}>{p.descripcion}</div>}
          {p.info        && <div style={{ fontSize: mobile ? 13 : 12, color:"#6A8AAE", fontStyle:"italic" }}>{p.info}</div>}

          {/* Fotos */}
          {p.fotos && (
            <div style={{ display:"flex", flexWrap:"wrap", gap: mobile ? 8 : 6 }}>
              {p.fotos.split("\n").filter(Boolean).map((url, i) => (
                <a key={i} href={url.trim()} target="_blank" rel="noreferrer"
                  style={{ display:"block", width: mobile ? 72 : 64, height: mobile ? 72 : 64,
                    borderRadius:6, overflow:"hidden", border:`1px solid ${B.border}`, flexShrink:0 }}>
                  <img src={url.trim()} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                    onError={e => { e.target.style.display="none"; }} />
                </a>
              ))}
            </div>
          )}

          {/* Links mapa */}
          <div style={{ display:"flex", gap: mobile ? 8 : 6, flexWrap:"wrap" }}>
            <a href={"https://www.openstreetmap.org/search?query="+encodeURIComponent((p.dir||"")+", Mar del Plata, Argentina")}
              target="_blank" rel="noreferrer"
              style={{ fontSize: mobile ? 12 : 11, padding: mobile ? "6px 12px" : "4px 10px", borderRadius:6,
                textDecoration:"none", background:"rgba(100,160,220,0.12)",
                border:"1px solid rgba(100,160,220,0.3)", color:"#8AAECC" }}>🗺 Ver en OSM</a>
            <a href={"https://maps.google.com/?q="+encodeURIComponent((p.dir||"")+", Mar del Plata, Argentina")}
              target="_blank" rel="noreferrer"
              style={{ fontSize: mobile ? 12 : 11, padding: mobile ? "6px 12px" : "4px 10px", borderRadius:6,
                textDecoration:"none", background:"rgba(66,133,244,0.12)",
                border:"1px solid rgba(66,133,244,0.3)", color:"#8AAECC" }}>📍 Google Maps</a>
          </div>

          {/* Documentos */}
          <PropDocumentos propId={p.id} supabase={supabase} mobile={mobile} />

          {/* Acciones */}
          <div style={{ display:"flex", gap: mobile ? 10 : 8 }}>
            <button onClick={startEdit}
              style={{ flex:1, padding: mobile ? "9px" : "7px", borderRadius:7, cursor:"pointer",
                background:B.accent+"22", border:"1px solid "+B.accentL+"60",
                color:B.accentL, fontSize: mobile ? 13 : 12, fontWeight:600 }}>Editar</button>
            {!confirmDel && (
              <button onClick={() => setConfirmDel(true)}
                style={{ padding: mobile ? "9px 16px" : "7px 14px", borderRadius:7, cursor:"pointer",
                  background:"transparent", border:"1px solid "+B.hot+"40",
                  color:B.hot, fontSize: mobile ? 13 : 12 }}>Eliminar</button>
            )}
          </div>

          {confirmDel && (
            <div style={{ background:B.hot+"15", border:"1px solid "+B.hot+"50", borderRadius:8, padding: mobile ? "14px" : "12px" }}>
              <div style={{ fontSize: mobile ? 14 : 13, color:B.text, marginBottom: mobile ? 10 : 8 }}>
                Eliminar <strong>{p.tipo} — {p.dir}</strong>?
              </div>
              <div style={{ display:"flex", gap: mobile ? 10 : 8 }}>
                <button onClick={() => deleteProperty(p.id)}
                  style={{ flex:1, padding: mobile ? "9px" : "7px", borderRadius:6, cursor:"pointer",
                    background:B.hot, border:"none", color:"#fff", fontSize: mobile ? 13 : 12, fontWeight:700 }}>Sí</button>
                <button onClick={() => setConfirmDel(false)}
                  style={{ flex:1, padding: mobile ? "9px" : "7px", borderRadius:6, cursor:"pointer",
                    background:"transparent", border:"1px solid "+B.border, color:"#8AAECC", fontSize: mobile ? 13 : 12 }}>No</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Formulario edición ── */}
      {editing && (
        <div style={{ borderTop:"1px solid "+B.accentL+"40", padding: mobile ? "14px" : "12px 14px",
          background:"rgba(10,21,37,0.6)", display:"flex", flexDirection:"column", gap: mobile ? 10 : 8 }}>
          <div style={{ fontSize: mobile ? 12 : 11, fontWeight:700, color:B.accentL }}>Editando</div>
          <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 8 : 6 }}>
            <div>
              <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>TIPO</label>
              <select value={editData.tipo} onChange={e => setEditData(d=>({...d,tipo:e.target.value}))} style={inp}>
                {TIPOS_PROP.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>ESTADO</label>
              <select value={editData.estado} onChange={e => setEditData(d=>({...d,estado:e.target.value}))} style={inp}>
                {ESTADOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>ZONA</label>
            <input value={editData.zona} onChange={e => setEditData(d=>({...d,zona:e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>DIRECCIÓN</label>
            <input value={editData.dir} onChange={e => setEditData(d=>({...d,dir:e.target.value}))} style={inp} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: mobile ? 8 : 6 }}>
            <div>
              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>PRECIO USD</label>
              <input type="number" value={editData.precio} onChange={e => setEditData(d=>({...d,precio:e.target.value}))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>M² TOT</label>
              <input type="number" value={editData.m2tot} onChange={e => setEditData(d=>({...d,m2tot:e.target.value}))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>M² CUB</label>
              <input type="number" value={editData.m2cub} onChange={e => setEditData(d=>({...d,m2cub:e.target.value}))} style={inp} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>CARACTERÍSTICAS</label>
            <input value={editData.caracts} onChange={e => setEditData(d=>({...d,caracts:e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>DESCRIPCIÓN DE MARKETING</label>
            <textarea value={editData.descripcion} onChange={e => setEditData(d=>({...d,descripcion:e.target.value}))}
              rows={3} placeholder="Texto para flyer, portales, WA..."
              style={{ ...inp, resize:"vertical", lineHeight:1.5 }} />
          </div>
          <div>
            <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>FOTOS (una URL por línea)</label>
            <textarea value={editData.fotos} onChange={e => setEditData(d=>({...d,fotos:e.target.value}))}
              rows={3} placeholder={"https://...\nhttps://..."}
              style={{ ...inp, resize:"vertical", lineHeight:1.6, fontFamily:"monospace", fontSize: mobile ? 12 : 11 }} />
          </div>
          <div>
            <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>INFO INTERNA</label>
            <input value={editData.info} onChange={e => setEditData(d=>({...d,info:e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>AGENTE</label>
            <select value={editData.ag} onChange={e => setEditData(d=>({...d,ag:e.target.value}))} style={inp}>
              <option value="">Sin asignar</option>
              {Object.entries(AG).map(([k,v]) => <option key={k} value={k}>{v.n}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap: mobile ? 10 : 8, marginTop:4 }}>
            <button onClick={saveEdit} disabled={saving}
              style={{ flex:1, padding: mobile ? "10px" : "8px", borderRadius:7, cursor:"pointer",
                background: saving ? B.border : B.accent,
                border:"1px solid "+(saving ? B.border : B.accentL),
                color: saving ? "#8AAECC" : "#fff", fontSize: mobile ? 13 : 12, fontWeight:700 }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ padding: mobile ? "10px 16px" : "8px 14px", borderRadius:7, cursor:"pointer",
                background:"transparent", border:"1px solid "+B.border, color:"#8AAECC", fontSize: mobile ? 13 : 12 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
