// ══════════════════════════════════════════════════════════════
// ALBA CRM — LeadCard
// Card expandible de un lead: etapa, agente, tags, notas, matches
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG, ETAPAS, ECOL, scoreLead, matchLeadProps } from "../../data/constants.js";
import LeadForm     from "./LeadForm.jsx";
import LeadMatches  from "./LeadMatches.jsx";
import LeadAcciones from "./LeadAcciones.jsx";
import InversorNota from "./InversorNota.jsx";
import { BuscadorPanel } from "../Buscador.jsx";

export default function LeadCard({
  lead, mobile, open, onToggle,
  properties, captaciones, mostrados, toggleMostrado,
  updateLead, deleteLead,
  setEtapa, setAgente, setModalPerdido, setConfirmDelete,
}) {
  const [editing,    setEditing]    = useState(false);
  const [notaVal,    setNotaVal]    = useState("");
  const [buscandoId, setBuscandoId] = useState(null);

  const s   = scoreLead(lead);
  const ag  = AG[lead.ag];
  const ec  = ECOL[lead.etapa] || B.dim;
  const stars = Math.round((lead.prob || 0) / 20);

  async function setScore(n) {
    await updateLead(lead.id, { prob: n * 20 });
  }

  async function guardarNota() {
    const nueva = notaVal.trim();
    if (!nueva) return;
    const ts = new Date().toLocaleDateString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
    await updateLead(lead.id, { nota: `[${ts}] ${nueva}${lead.nota ? "\n"+lead.nota : ""}` });
    setNotaVal("");
  }

  async function toggleInversor() {
    await updateLead(lead.id, { inversor: !lead.inversor });
  }

  async function guardarNotaInversor(l, nota) {
    await updateLead(l.id, { nota_inversor: nota });
  }

  async function handleGuardarEdicion(id, data) {
    await updateLead(id, data);
    setEditing(false);
  }

  return (
    <div style={{ background:B.card,
      border:`1px solid ${open ? B.accent : B.border}`,
      borderLeft:`3px solid ${s.c}`,
      borderRadius:12, overflow:"hidden", transition:"border-color .15s" }}>

      {/* ── Cabecera ── */}
      <div style={{ display:"flex", alignItems:"center", gap: mobile ? 8 : 10,
        padding: mobile ? "14px 16px" : "12px 16px", cursor:"pointer",
        flexWrap: mobile ? "wrap" : "nowrap" }}
        onClick={onToggle}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
            <span style={{ fontSize: mobile ? 14 : 13, fontWeight:700, color:B.text }}>{lead.nombre}</span>
            {lead.inversor && (
              <span style={{ fontSize: mobile ? 12 : 11, padding:"1px 6px", borderRadius:10,
                background:"#9B6DC822", color:"#9B6DC8", fontWeight:700 }}>💼 INV</span>
            )}
            {ag && (
              <span style={{ fontSize: mobile ? 12 : 11, padding:"1px 5px", borderRadius:3,
                background:ag.bg||"#4A6A90", color:ag.c, fontWeight:700 }}>{ag.n}</span>
            )}
          </div>
          <div style={{ fontSize: mobile ? 13 : 12, color:"#8AAECC", display:"flex", gap:10, flexWrap:"wrap" }}>
            {lead.zona   && <span>📍 {lead.zona}</span>}
            {lead.tipo   && <span>{lead.tipo}</span>}
            {lead.presup && (
              <span style={{ color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700 }}>
                USD {Number(lead.presup).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
          <div style={{ display:"flex", gap:2 }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} onClick={e => { e.stopPropagation(); setScore(n); }}
                style={{ cursor:"pointer", fontSize: mobile ? 15 : 13, color:n<=stars?"#F4C642":B.dim }}>★</span>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize: mobile ? 12 : 11, padding: mobile ? "3px 9px" : "2px 8px",
              borderRadius:4, background:`${ec}18`, color:ec }}>{lead.etapa}</span>
            <span style={{ fontSize: mobile ? 12 : 11, padding: mobile ? "3px 9px" : "2px 8px",
              borderRadius:4, background:s.bg, color:s.c }}>{s.label}</span>
            <span style={{ fontSize: mobile ? 12 : 11,
              color:lead.dias>7?B.hot:lead.dias>3?B.warm:B.ok }}>{lead.dias}d</span>
          </div>
        </div>
      </div>

      {/* ── Panel expandido ── */}
      {open && (
        <div style={{ padding: mobile ? "0 14px 14px" : "0 16px 16px", borderTop:`1px solid ${B.border}` }}>
          {editing ? (
            <LeadForm lead={lead} mobile={mobile}
              onGuardar={handleGuardarEdicion}
              onCancelar={() => setEditing(false)} />
          ) : (
            <div style={{ paddingTop:12 }}>
              {/* ── Resumen rápido ── */}
              {(() => {
                const partes = [];
                if (lead.dias > 7) partes.push({ text: `🔴 ${lead.dias}d sin contacto`, color: "#E85D30" });
                else if (lead.dias > 3) partes.push({ text: `🟡 ${lead.dias}d sin contacto`, color: "#E8A830" });
                else partes.push({ text: `🟢 ${lead.dias}d sin contacto`, color: "#2E9E6A" });
                const normZ = z => (z||"").toLowerCase().replace(/^(la|el|los|las)\s+/i,"").trim();
                const lz = normZ(lead.zona);
                const mProps = (properties||[]).filter(p => p.activa && normZ(p.zona).includes(lz) && lz.length > 2).length;
                const mCaps = (captaciones||[]).filter(c => normZ(c.zona).includes(lz) && lz.length > 2).length;
                const matches = mProps + mCaps;
                if (matches > 0) partes.push({ text: `🏠 ${matches} match${matches > 1 ? "es" : ""}`, color: "#4A8ABE" });
                else partes.push({ text: "Sin matches en zona", color: "#7A96B8" });
                if (lead.nota) {
                  const ultima = lead.nota.split("\n")[0].replace(/\[.*?\]\s*/, "").slice(0, 40);
                  partes.push({ text: `💬 ${ultima}${ultima.length >= 40 ? "…" : ""}`, color: "#8AAECC" });
                }
                return (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12,
                    padding:"8px 10px", borderRadius:8, background:"rgba(42,91,173,0.07)",
                    border:"1px solid rgba(42,91,173,0.15)" }}>
                    {partes.map((p, i) => (
                      <span key={i} style={{ fontSize:11, color:p.color, fontWeight:500 }}>
                        {i > 0 && <span style={{ color:"#2A3A5A", marginRight:6 }}>·</span>}
                        {p.text}
                      </span>
                    ))}
                  </div>
                );
              })()}


              {/* Etapa */}
              <div style={{ display:"flex", gap: mobile ? 6 : 5, flexWrap:"wrap", marginBottom: mobile ? 12 : 10 }}>
                <span style={{ fontSize: mobile ? 12 : 11, color:B.dim, alignSelf:"center" }}>ETAPA</span>
                {ETAPAS.map(e => (
                  <button key={e} onClick={() => setEtapa(lead.id, e)}
                    style={{ padding: mobile ? "5px 11px" : "3px 9px", borderRadius:12, cursor:"pointer",
                      fontSize: mobile ? 13 : 12,
                      border:`1px solid ${lead.etapa===e?(ECOL[e]||B.dim):B.border}`,
                      background: lead.etapa===e ? `${ECOL[e]||B.dim}22` : "transparent",
                      color: lead.etapa===e ? (ECOL[e]||B.dim) : B.muted,
                      fontWeight: lead.etapa===e ? 700 : 400 }}>
                    {e}
                  </button>
                ))}
              </div>

              {/* Agente */}
              <div style={{ display:"flex", gap: mobile ? 6 : 5, flexWrap:"wrap", marginBottom: mobile ? 12 : 10 }}>
                <span style={{ fontSize: mobile ? 12 : 11, color:B.dim, alignSelf:"center" }}>AGENTE</span>
                {Object.entries(AG).map(([k,v]) => (
                  <button key={k} onClick={() => setAgente(lead.id, k)}
                    style={{ padding: mobile ? "5px 11px" : "3px 9px", borderRadius:12, cursor:"pointer",
                      fontSize: mobile ? 13 : 12,
                      border:`1px solid ${lead.ag===k?v.c:B.border}`,
                      background: lead.ag===k ? `${v.c}22` : "transparent",
                      color: lead.ag===k ? v.c : B.muted,
                      fontWeight: lead.ag===k ? 700 : 400 }}>
                    {v.n}
                  </button>
                ))}
              </div>

              {/* Tags */}
              {(() => {
                const tags = [
                  lead.credito==="si" && { label:"✅ Crédito aprobado", color:"#2E9E6A" },
                  lead.cochera==="si" && { label:"🚗 Con cochera",      color:"#4A8ABE" },
                  lead.cochera==="no" && { label:"❌ Sin cochera",       color:"#8AAECC" },
                  lead.patio==="si"   && { label:"🌿 Con patio",         color:"#4A8ABE" },
                  lead.balcon==="si"  && { label:"🏙 Con balcón",        color:"#4A8ABE" },
                  lead.ambientes      && { label:`${lead.ambientes} amb.`,color:"#8AAECC" },
                  lead.m2min          && { label:`Mín. ${lead.m2min}m²`, color:"#8AAECC" },
                  lead.op==="Inversor"&& { label:"📈 Inversor",          color:"#E8A830" },
                ].filter(Boolean);
                if (!tags.length) return null;
                return (
                  <div style={{ display:"flex", flexWrap:"wrap", gap: mobile ? 6 : 5, marginBottom: mobile ? 12 : 10 }}>
                    {tags.map((tag,i) => (
                      <span key={i} style={{ fontSize: mobile ? 12 : 11, padding: mobile ? "4px 10px" : "3px 9px",
                        borderRadius:10, background:tag.color+"18", color:tag.color,
                        border:`1px solid ${tag.color}40`, fontWeight:500 }}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                );
              })()}

              {/* Nota */}
              {lead.nota && (
                <div style={{ fontSize: mobile ? 12 : 11, color:B.dim, background:B.bg, borderRadius:6,
                  padding: mobile ? "10px 12px" : "8px 10px", marginBottom: mobile ? 12 : 10,
                  lineHeight:1.6, whiteSpace:"pre-wrap", maxHeight:80, overflow:"auto" }}>
                  {lead.nota}
                </div>
              )}

              {/* Nueva nota */}
              <div style={{ display:"flex", gap: mobile ? 8 : 6, marginBottom: mobile ? 12 : 10,
                flexDirection: mobile ? "column" : "row" }}>
                <input placeholder="Nota rápida... (Enter para guardar)"
                  value={notaVal}
                  onChange={e => setNotaVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && guardarNota()}
                  style={{ flex:1, background:B.bg, border:`1px solid ${B.border}`,
                    borderRadius:6, padding: mobile ? "8px 12px" : "6px 10px",
                    color:B.text, fontSize: mobile ? 13 : 11, outline:"none" }} />
                <button onClick={guardarNota}
                  style={{ padding: mobile ? "8px 14px" : "6px 12px", borderRadius:6,
                    background:`${B.accentL}18`, border:`1px solid ${B.accentL}40`,
                    color:B.accentL, fontSize: mobile ? 13 : 11, cursor:"pointer" }}>
                  + Nota
                </button>
              </div>

              {/* Matches */}
              <LeadMatches lead={lead} properties={properties} captaciones={captaciones}
                mostrados={mostrados} toggleMostrado={toggleMostrado} />

              {/* Buscador inline */}
              {buscandoId === lead.id && (
                <div style={{ marginBottom:10 }}>
                  <BuscadorPanel lead={lead} />
                </div>
              )}

              {/* Switch Inversor */}
              <div style={{ display:"flex", alignItems:"center", gap: mobile ? 10 : 8,
                marginBottom: mobile ? 10 : 8, padding: mobile ? "9px 12px" : "7px 10px",
                borderRadius:8,
                background: lead.inversor ? "rgba(155,109,200,0.1)" : "rgba(42,91,173,0.05)",
                border:`1px solid ${lead.inversor ? "#9B6DC840" : B.border}` }}>
                <button onClick={toggleInversor}
                  style={{ width: mobile ? 42 : 36, height: mobile ? 24 : 20,
                    borderRadius: mobile ? 12 : 10, cursor:"pointer", border:"none",
                    position:"relative", flexShrink:0,
                    background: lead.inversor ? "#9B6DC8" : "#2A3A5A" }}>
                  <div style={{ position:"absolute", top: mobile ? 3 : 2,
                    left: lead.inversor ? (mobile ? 22 : 18) : 2,
                    width: mobile ? 18 : 16, height: mobile ? 18 : 16,
                    borderRadius:"50%", background:"#fff",
                    transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }} />
                </button>
                <span style={{ fontSize: mobile ? 12 : 11,
                  color: lead.inversor ? "#9B6DC8" : "#8AAECC", fontWeight:600 }}>
                  💼 Inversor
                </span>
                {lead.inversor && (
                  <InversorNota lead={lead} onGuardar={guardarNotaInversor} />
                )}
              </div>

              {/* Acciones */}
              <LeadAcciones
                lead={lead} mobile={mobile} updateLead={updateLead}
                onEditar={() => setEditing(true)}
                onEliminar={() => setConfirmDelete(lead)}
                buscandoId={buscandoId} setBuscandoId={setBuscandoId}
                toggleInversor={toggleInversor}
                guardarNotaInversor={guardarNotaInversor}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}