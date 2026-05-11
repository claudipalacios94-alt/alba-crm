// ══════════════════════════════════════════════════════════════
// ALBA CRM — GALERÍA DE FLYERS
// Subí flyers de ChatGPT, guardá con nota, organizá por prop
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { B, AG } from "../data/constants.js";

export default function Flyer({ properties, supabase }) {
  const [flyers,      setFlyers]      = useState([]);
  const [loaded,      setLoaded]      = useState(false);
  const [flyerSel,    setFlyerSel]    = useState(null);
  const [subiendo,    setSubiendo]    = useState(false);
  const [form,        setForm]        = useState({ titulo:"", nota:"", propId:"", ag:"" });
  const [preview,     setPreview]     = useState(null);
  const [file,        setFile]        = useState(null);
  const [editando,    setEditando]    = useState(null);
  const [editForm,    setEditForm]    = useState({});
  const [confirmDel,  setConfirmDel]  = useState(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("flyers").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setFlyers(data || []); setLoaded(true); });
  }, []);

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) loadFile(f);
  }

  function onFileInput(e) {
    const f = e.target.files[0];
    if (f) loadFile(f);
  }

  function loadFile(f) {
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
    // Auto-título desde nombre del archivo
    if (!form.titulo) {
      const nombre = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setForm(p => ({ ...p, titulo: nombre }));
    }
  }

  async function guardar() {
    if (!preview || subiendo) return;
    setSubiendo(true);
    try {
      const prop = properties.find(p => p.id === Number(form.propId));
      const titulo = form.titulo.trim() || (prop ? `${prop.tipo} · ${prop.zona}` : "Flyer " + new Date().toLocaleDateString("es-AR"));
      const { data, error } = await supabase.from("flyers").insert([{
        titulo,
        imagen_base64: preview,
        nota: form.nota.trim() || null,
        prop_id: form.propId ? Number(form.propId) : null,
        ag: form.ag || null,
      }]).select().single();
      if (!error && data) {
        setFlyers(p => [data, ...p]);
        setPreview(null); setFile(null);
        setForm({ titulo:"", nota:"", propId:"", ag:"" });
      }
    } catch(e) { console.error(e); }
    setSubiendo(false);
  }

  async function guardarEdit() {
    if (!editando) return;
    await supabase.from("flyers").update({ titulo: editForm.titulo, nota: editForm.nota }).eq("id", editando.id);
    setFlyers(p => p.map(f => f.id===editando.id ? {...f,...editForm} : f));
    if (flyerSel?.id === editando.id) setFlyerSel(f => ({...f,...editForm}));
    setEditando(null);
  }

  async function eliminar(id) {
    await supabase.from("flyers").delete().eq("id", id);
    setFlyers(p => p.filter(f => f.id !== id));
    if (flyerSel?.id === id) setFlyerSel(null);
    setConfirmDel(null);
  }

  const inp = {
    width:"100%", background:B.bg, border:`1px solid ${B.border}`, borderRadius:7,
    padding:"7px 10px", color:B.text, fontSize:12, outline:"none", boxSizing:"border-box",
  };

  const fmtFecha = iso => new Date(iso).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" });

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderBottom:`1px solid ${B.border}`, flexShrink:0 }}>
        <div>
          <span style={{ fontSize:18, fontWeight:700, color:B.text, fontFamily:"Georgia,serif" }}>Galería de Flyers</span>
          <span style={{ fontSize:11, color:"#4A6A90", marginLeft:8 }}>{flyers.length} guardados</span>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Panel izquierdo — subir + grid */}
        <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:14 }}>

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={e=>e.preventDefault()}
            style={{ border:`2px dashed ${preview?B.accentL:B.border}`, borderRadius:12, padding:preview?"0":"32px 16px",
              textAlign:"center", cursor:"pointer", transition:"all 0.2s",
              background: preview?"transparent":"rgba(42,91,173,0.04)", overflow:"hidden" }}>
            {preview ? (
              <div style={{ position:"relative" }}>
                <img src={preview} alt="preview"
                  style={{ width:"100%", maxHeight:300, objectFit:"contain", display:"block" }} />
                <button onClick={()=>{ setPreview(null); setFile(null); }}
                  style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:"50%",
                    background:"rgba(0,0,0,0.7)", border:"none", color:"#fff", cursor:"pointer", fontSize:14 }}>
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize:36, marginBottom:8 }}>📂</div>
                <div style={{ fontSize:13, color:"#8AAECC", fontWeight:600, marginBottom:4 }}>
                  Arrastrá tu flyer acá
                </div>
                <div style={{ fontSize:11, color:"#4A6A90", marginBottom:12 }}>
                  JPG, PNG — los que hacés en ChatGPT
                </div>
                <label style={{ padding:"8px 20px", borderRadius:8, cursor:"pointer",
                  background:B.accent, border:`1px solid ${B.accentL}`, color:"#fff", fontSize:12, fontWeight:600 }}>
                  Elegir archivo
                  <input type="file" accept="image/*" onChange={onFileInput} style={{ display:"none" }} />
                </label>
              </>
            )}
          </div>

          {/* Formulario — solo si hay preview */}
          {preview && (
            <div style={{ background:B.card, border:`1px solid ${B.accentL}40`, borderRadius:12, padding:14, display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:B.accentL, letterSpacing:"0.8px" }}>INFORMACIÓN DEL FLYER</div>
              <div>
                <label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:3 }}>TÍTULO</label>
                <input value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))}
                  placeholder="ej: Depto La Perla 2 amb" style={inp} />
              </div>
              <div>
                <label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:3 }}>NOTA (precio, contacto, detalles)</label>
                <textarea value={form.nota} onChange={e=>setForm(p=>({...p,nota:e.target.value}))}
                  placeholder="ej: USD 76.500 · 2 amb · La Perla · 223 686 7327"
                  rows={3} style={{ ...inp, resize:"none", lineHeight:1.6 }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:3 }}>PROPIEDAD</label>
                  <select value={form.propId} onChange={e=>setForm(p=>({...p,propId:e.target.value}))} style={inp}>
                    <option value="">Sin vincular</option>
                    {properties.map(p=><option key={p.id} value={p.id}>{p.tipo} · {p.zona}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:3 }}>AGENTE</label>
                  <select value={form.ag} onChange={e=>setForm(p=>({...p,ag:e.target.value}))} style={inp}>
                    <option value="">Sin asignar</option>
                    {Object.entries(AG).map(([k,v])=><option key={k} value={k}>{v.n}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={guardar} disabled={subiendo}
                style={{ padding:"10px", borderRadius:9, cursor:subiendo?"default":"pointer",
                  background:subiendo?B.border:"#2E9E6A", border:`1px solid ${subiendo?B.border:"#2E9E6A"}`,
                  color:subiendo?"#8AAECC":"#fff", fontSize:13, fontWeight:700 }}>
                {subiendo ? "Guardando..." : "💾 Guardar flyer"}
              </button>
            </div>
          )}

          {/* Grid de flyers */}
          <div style={{ fontSize:10, color:"#8AAECC", fontWeight:700, letterSpacing:"1px" }}>
            {flyers.length > 0 ? `${flyers.length} FLYERS GUARDADOS` : ""}
          </div>
          {!loaded && <div style={{ textAlign:"center", color:"#4A6A90", fontSize:12 }}>Cargando...</div>}
          {loaded && flyers.length === 0 && !preview && (
            <div style={{ textAlign:"center", padding:"30px 0", color:"#4A6A90", fontSize:12 }}>
              Subí tu primer flyer arriba 👆
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {flyers.map(f => {
              const isSel = flyerSel?.id === f.id;
              return (
                <div key={f.id} onClick={()=>setFlyerSel(isSel?null:f)}
                  style={{ borderRadius:10, overflow:"hidden", cursor:"pointer", transition:"all 0.15s",
                    border:`2px solid ${isSel?B.accentL:B.border}`,
                    boxShadow: isSel?"0 0 20px rgba(58,139,196,0.3)":"none" }}>
                  {f.imagen_base64
                    ? <img src={f.imagen_base64} alt={f.titulo}
                        style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }} />
                    : <div style={{ width:"100%", aspectRatio:"3/4", background:B.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>🖼</div>
                  }
                  <div style={{ padding:"7px 9px", background:"rgba(10,21,37,0.95)" }}>
                    <div style={{ fontSize:11, color:B.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.titulo}</div>
                    <div style={{ fontSize:9, color:"#4A6A90", marginTop:2 }}>{fmtFecha(f.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel derecho — detalle */}
        {flyerSel && (
          <div style={{ width:320, borderLeft:`1px solid ${B.border}`, background:B.card, flexShrink:0, display:"flex", flexDirection:"column", overflowY:"auto" }}>
            <div style={{ padding:"12px 14px", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:700, color:B.text }}>Detalle</span>
              <button onClick={()=>setFlyerSel(null)}
                style={{ background:"transparent", border:"none", color:"#4A6A90", cursor:"pointer", fontSize:14 }}>✕</button>
            </div>

            {flyerSel.imagen_base64 && (
              <img src={flyerSel.imagen_base64} alt={flyerSel.titulo}
                style={{ width:"100%", objectFit:"contain", display:"block" }} />
            )}

            <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:10, flex:1 }}>
              {editando?.id === flyerSel.id ? (
                <>
                  <input value={editForm.titulo} onChange={e=>setEditForm(p=>({...p,titulo:e.target.value}))}
                    style={{ ...inp, fontSize:13, fontWeight:600 }} />
                  <textarea value={editForm.nota||""} onChange={e=>setEditForm(p=>({...p,nota:e.target.value}))}
                    rows={4} placeholder="Nota..." style={{ ...inp, resize:"none", lineHeight:1.6 }} />
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={guardarEdit}
                      style={{ flex:1, padding:"8px", borderRadius:7, cursor:"pointer",
                        background:B.accent, border:`1px solid ${B.accentL}`, color:"#fff", fontSize:12, fontWeight:700 }}>
                      Guardar
                    </button>
                    <button onClick={()=>setEditando(null)}
                      style={{ padding:"8px 12px", borderRadius:7, cursor:"pointer",
                        background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:12 }}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:14, fontWeight:700, color:B.text }}>{flyerSel.titulo}</div>
                  {flyerSel.nota && (
                    <div style={{ fontSize:12, color:"#8AAECC", lineHeight:1.6, background:"rgba(42,91,173,0.08)",
                      borderRadius:8, padding:"8px 10px", borderLeft:`2px solid ${B.accentL}` }}>
                      {flyerSel.nota}
                    </div>
                  )}
                  <div style={{ fontSize:11, color:"#4A6A90" }}>{fmtFecha(flyerSel.created_at)}</div>
                  {flyerSel.prop_id && (
                    <div style={{ fontSize:11, color:"#8AAECC" }}>
                      🏠 {properties.find(p=>p.id===flyerSel.prop_id)?.tipo} · {properties.find(p=>p.id===flyerSel.prop_id)?.zona}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:8, marginTop:4 }}>
                    <a href={flyerSel.imagen_base64} download={flyerSel.titulo+".jpg"}
                      style={{ flex:1, padding:"9px", borderRadius:8, textAlign:"center", cursor:"pointer",
                        background:B.accent, border:`1px solid ${B.accentL}`, color:"#fff",
                        fontSize:12, fontWeight:700, textDecoration:"none" }}>
                      ↓ Descargar
                    </a>
                    <button onClick={()=>{ setEditando(flyerSel); setEditForm({titulo:flyerSel.titulo,nota:flyerSel.nota||""}); }}
                      style={{ padding:"9px 12px", borderRadius:8, cursor:"pointer",
                        background:`${B.accentL}15`, border:`1px solid ${B.accentL}40`,
                        color:B.accentL, fontSize:12 }}>
                      ✏️
                    </button>
                    <button onClick={()=>setConfirmDel(flyerSel)}
                      style={{ padding:"9px 12px", borderRadius:8, cursor:"pointer",
                        background:"transparent", border:`1px solid ${B.hot}40`, color:B.hot, fontSize:12 }}>
                      🗑
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal eliminar */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
          onClick={()=>setConfirmDel(null)}>
          <div style={{ background:B.sidebar, border:`1px solid ${B.hot}50`, borderRadius:14, padding:"24px 28px", maxWidth:320, width:"90%" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:14, fontWeight:700, color:B.text, marginBottom:6 }}>¿Eliminar flyer?</div>
            <div style={{ fontSize:12, color:"#8AAECC", marginBottom:18 }}>"{confirmDel.titulo}"</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setConfirmDel(null)}
                style={{ flex:1, padding:10, borderRadius:8, cursor:"pointer",
                  background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:12 }}>
                Cancelar
              </button>
              <button onClick={()=>eliminar(confirmDel.id)}
                style={{ flex:1, padding:10, borderRadius:8, cursor:"pointer",
                  background:B.hot, border:"none", color:"#fff", fontSize:12, fontWeight:700 }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
