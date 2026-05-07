// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO CUADERNO DE CAMPO
// Historial de interacciones por lead — persiste en Supabase
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { B, AG, TIPOS_CONTACTO, TIPO_COLOR } from "../data/constants.js";

export default function Cuaderno({ leads, addInteraction, getInteractions, updateLead }) {
  const [entries,  setEntries]  = useState([]);
  const [form,     setForm]     = useState({ leadId:"", tipo:"WhatsApp", nota:"", proxAccion:"", ag:"" });
  const [adding,   setAdding]   = useState(false);
  const [filtro,   setFiltro]   = useState("todos");
  const [loaded,   setLoaded]   = useState(false);
  const [saving,   setSaving]   = useState(false);

  // ── Cargar desde Supabase ─────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const data = await getInteractions();
        setEntries(data.map(e => ({
          id:         String(e.id),
          leadId:     String(e.lead_id),
          leadNom:    e.lead_nom,
          tipo:       e.tipo,
          nota:       e.nota,
          proxAccion: e.prox_accion,
          ag:         e.ag,
          fecha:      e.created_at,
        })));
      } catch (err) {
        console.error("Error cargando interacciones:", err);
      }
      setLoaded(true);
    }
    load();
  }, []);

  async function addEntry() {
    if (!form.leadId || !form.nota.trim() || saving) return;
    setSaving(true);
    const lead = leads.find(l => String(l.id) === String(form.leadId));
    try {
      const saved = await addInteraction({
        leadId:     form.leadId,
        leadNom:    lead?.nombre || "Lead",
        tipo:       form.tipo,
        nota:       form.nota.trim(),
        proxAccion: form.proxAccion.trim(),
        ag:         form.ag,
      });
      // Actualizar last_contact_at y proxaccion en el lead
      const leadUpdates = { last_contact_at: new Date().toISOString() };
      if (form.proxAccion.trim()) leadUpdates.proxaccion = form.proxAccion.trim();
      if (updateLead) await updateLead(Number(form.leadId), leadUpdates);
      const newEntry = {
        id:         String(saved.id),
        leadId:     String(saved.lead_id),
        leadNom:    saved.lead_nom,
        tipo:       saved.tipo,
        nota:       saved.nota,
        proxAccion: saved.prox_accion,
        ag:         saved.ag,
        fecha:      saved.created_at,
      };
      setEntries(p => [newEntry, ...p]);
      setForm({ leadId:"", tipo:"WhatsApp", nota:"", proxAccion:"", ag:"" });
      setAdding(false);
    } catch (err) {
      console.error("Error guardando interacción:", err);
    }
    setSaving(false);
  }

  const filtered = filtro === "todos" ? entries : entries.filter(e => e.leadId === filtro);
  const activos  = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");

  function fmtFecha(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { weekday:"short", day:"numeric", month:"short" })
      + " " + d.toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" });
  }

  const inpS = {
    width:"100%", background:B.card, border:`1px solid ${B.border}`, borderRadius:8,
    padding:"8px 11px", color:B.text, fontSize:12, outline:"none",
    boxSizing:"border-box", fontFamily:"'Trebuchet MS',sans-serif",
  };

  const chipF = id => ({
    padding:"4px 12px", borderRadius:20, cursor:"pointer", fontSize:11,
    border:`1px solid ${filtro === id ? B.accentL : B.border}`,
    background: filtro === id ? `${B.accentL}18` : "transparent",
    color: filtro === id ? B.accentL : B.muted,
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14, marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Cuaderno de campo</h1>
          <p style={{ fontSize:11, color:B.muted, margin:"4px 0 0" }}>
            {entries.length} interacciones registradas · guardado localmente
          </p>
        </div>
        <button onClick={() => setAdding(!adding)}
          style={{ padding:"9px 18px", borderRadius:9, cursor:"pointer",
            background: adding ? "transparent" : B.accent,
            border: `1px solid ${adding ? B.border : B.accentL}`,
            color: adding ? B.muted : "#fff", fontSize:13, fontWeight:700, fontFamily:"Georgia,serif" }}>
          {adding ? "Cancelar" : "+ Anotar interacción"}
        </button>
      </div>

      {/* Formulario */}
      {adding && (
        <div style={{ background:B.card, border:`1px solid ${B.accentL}40`, borderRadius:13, padding:"18px 20px", marginBottom:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:9, color:B.muted, letterSpacing:".8px", textTransform:"uppercase", display:"block", marginBottom:5 }}>Lead *</label>
              <select value={form.leadId} onChange={e => setForm(p => ({ ...p, leadId:e.target.value }))} style={inpS}>
                <option value="">Seleccioná un lead</option>
                {activos.map(l => <option key={l.id} value={String(l.id)}>{l.nombre}{l.zona ? " · " + l.zona : ""}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:9, color:B.muted, letterSpacing:".8px", textTransform:"uppercase", display:"block", marginBottom:5 }}>Tipo de contacto</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo:e.target.value }))} style={inpS}>
                {TIPOS_CONTACTO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:9, color:B.muted, letterSpacing:".8px", textTransform:"uppercase", display:"block", marginBottom:5 }}>¿Qué pasó? *</label>
            <textarea value={form.nota} onChange={e => setForm(p => ({ ...p, nota:e.target.value }))}
              placeholder="Llamé, no atendió... / Le mandé las fotos, le gustó mucho... / Vino a ver la casa, está pensando..."
              rows={3} style={{ ...inpS, resize:"none", lineHeight:1.6 }} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:9, color:B.muted, letterSpacing:".8px", textTransform:"uppercase", display:"block", marginBottom:5 }}>Próxima acción</label>
              <input value={form.proxAccion} onChange={e => setForm(p => ({ ...p, proxAccion:e.target.value }))}
                style={inpS} placeholder="ej: Llamar el jueves, enviar opciones..." />
            </div>
            <div>
              <label style={{ fontSize:9, color:B.muted, letterSpacing:".8px", textTransform:"uppercase", display:"block", marginBottom:5 }}>Agente</label>
              <select value={form.ag} onChange={e => setForm(p => ({ ...p, ag:e.target.value }))} style={inpS}>
                <option value="">Sin especificar</option>
                {Object.entries(AG).map(([k, v]) => <option key={k} value={k}>{v.n}</option>)}
              </select>
            </div>
          </div>

          <button onClick={addEntry} disabled={!form.leadId || !form.nota.trim() || saving}
            style={{ width:"100%", padding:"11px", borderRadius:9,
              cursor: form.leadId && form.nota.trim() && !saving ? "pointer" : "default",
              background: form.leadId && form.nota.trim() ? B.accent : B.border,
              border: `1px solid ${form.leadId && form.nota.trim() ? B.accentL : B.border}`,
              color: form.leadId && form.nota.trim() ? "#fff" : B.muted,
              fontSize:13, fontWeight:700, fontFamily:"Georgia,serif" }}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}

      {/* Filtros por lead */}
      {entries.length > 0 && (
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:16 }}>
          <button onClick={() => setFiltro("todos")} style={chipF("todos")}>Todos</button>
          {[...new Set(entries.map(e => e.leadId))].map(id => {
            const entry = entries.find(x => x.leadId === id);
            return (
              <button key={id} onClick={() => setFiltro(id)} style={chipF(id)}>
                {entry?.leadNom || id}
              </button>
            );
          })}
        </div>
      )}

      {/* Lista de entradas */}
      {!loaded && <div style={{ textAlign:"center", padding:"40px", color:B.dim }}>Cargando...</div>}
      {loaded && filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 20px", color:B.dim }}>
          <div style={{ fontSize:13, color:B.muted, marginBottom:8 }}>Sin interacciones todavía</div>
          <div style={{ fontSize:12, color:B.dim, lineHeight:1.6, maxWidth:320, margin:"0 auto" }}>
            Cada vez que hablás con un lead, anotalo acá. Con el tiempo tenés el historial completo de cada operación.
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
        {filtered.map(entry => {
          const ag = AG[entry.ag];
          const tc = TIPO_COLOR[entry.tipo] || B.muted;
          return (
            <div key={entry.id} style={{ background:B.card, border:`1px solid ${B.border}`,
              borderRadius:11, padding:"13px 15px", borderLeft:`3px solid ${tc}` }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:12,
                    background:`${tc}18`, color:tc, fontWeight:600 }}>{entry.tipo}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:B.text }}>{entry.leadNom}</span>
                  {ag && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:4, background:ag.bg, color:ag.c, fontWeight:600 }}>{ag.n}</span>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:10, color:B.dim, whiteSpace:"nowrap" }}>{fmtFecha(entry.fecha)}</span>
                  <button onClick={() => deleteEntry(entry.id)}
                    style={{ background:"transparent", border:"none", color:B.dim, cursor:"pointer", fontSize:14, padding:"0 2px", lineHeight:1 }}
                    title="Eliminar">×</button>
                </div>
              </div>
              <div style={{ fontSize:13, color:B.text, lineHeight:1.65 }}>{entry.nota}</div>
              {entry.proxAccion && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8, paddingTop:8, borderTop:`1px solid ${B.border}` }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:B.accentL, flexShrink:0 }} />
                  <span style={{ fontSize:11, color:B.accentL }}>Próxima acción: {entry.proxAccion}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
