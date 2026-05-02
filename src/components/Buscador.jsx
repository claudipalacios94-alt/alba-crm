// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO BUSCADOR AUTOMÁTICO
// Busca propiedades en portales para cada lead usando IA + web
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG, scoreLead } from "../data/constants.js";

export default function Buscador({ leads }) {
  const [resultados,    setResultados]    = useState({});
  const [buscando,      setBuscando]      = useState({});
  const [expandido,     setExpandido]     = useState(null);
  const [buscandoTodos, setBuscandoTodos] = useState(false);

  const activos = leads
    .filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido" && l.presup && l.zona)
    .sort((a, b) => a.dias - b.dias);

  const calientes = activos.filter(l => l.dias < 3);
  const tibios    = activos.filter(l => l.dias >= 3 && l.dias <= 7);
  const resto     = activos.filter(l => l.dias > 7).slice(0, 8);

  async function buscarParaLead(lead) {
    if (buscando[lead.id]) return;
    setBuscando(p => ({ ...p, [lead.id]: true }));
    setExpandido(lead.id);

    const prompt = `Buscá propiedades en venta en Mar del Plata, Argentina que coincidan con este comprador:

- Nombre: ${lead.nombre}
- Tipo buscado: ${lead.tipo || "cualquiera"}
- Zona preferida: ${lead.zona}
- Presupuesto máximo: USD ${lead.presup?.toLocaleString()}
- Operación: ${lead.op}
${lead.nota ? `- Contexto: ${lead.nota.slice(0, 120)}` : ""}

Buscá en ZonaProp, Argenprop y Mercado Libre Inmuebles.
Para cada propiedad encontrada indicá:
1. Descripción breve
2. Precio en USD
3. Dirección o zona
4. Por qué matchea con este comprador
5. Link directo si existe

Presentá máximo 5 propiedades ordenadas de mejor a peor match. Marcá con ⭐ si algo es especialmente bueno.`;

    try {
      const resp = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 1500,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await resp.json();
      const texto = data.content
        ?.filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n") || "Sin resultados encontrados.";
      setResultados(p => ({ ...p, [lead.id]: { texto, timestamp: new Date() } }));
    } catch {
      setResultados(p => ({ ...p, [lead.id]: { texto: "Error al buscar. Verificá la conexión.", timestamp: new Date() } }));
    }
    setBuscando(p => ({ ...p, [lead.id]: false }));
  }

  async function buscarTodosAhora() {
    setBuscandoTodos(true);
    const cola = [...calientes, ...tibios];
    for (const lead of cola) {
      if (!resultados[lead.id]) await buscarParaLead(lead);
      await new Promise(r => setTimeout(r, 600));
    }
    setBuscandoTodos(false);
  }

  function LeadCard({ lead }) {
    const s    = scoreLead(lead);
    const ag   = AG[lead.ag];
    const res  = resultados[lead.id];
    const busy = buscando[lead.id];
    const open = expandido === lead.id;

    return (
      <div style={{ background:B.card, border:`1px solid ${open ? B.accentL : B.border}`,
        borderRadius:12, overflow:"hidden", marginBottom:10, transition:"border-color .15s" }}>

        {/* Header del lead */}
        <div style={{ padding:"13px 16px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap",
          cursor:"pointer", borderLeft:`3px solid ${s.c}` }}
          onClick={() => setExpandido(open ? null : lead.id)}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
              <span style={{ fontSize:13, fontWeight:600, color:B.text }}>{lead.nombre}</span>
              <span style={{ fontSize:10, padding:"1px 7px", borderRadius:12,
                background:`${s.c}18`, color:s.c }}>{s.label}</span>
              {ag && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:4,
                background:ag.bg, color:ag.c, fontWeight:600 }}>{ag.n}</span>}
            </div>
            <div style={{ fontSize:11, color:B.muted }}>
              {lead.tipo && lead.tipo + " · "}{lead.zona} · USD {lead.presup?.toLocaleString()}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); buscarParaLead(lead); }}
            disabled={busy}
            style={{ padding:"7px 16px", borderRadius:8, cursor: busy ? "wait" : "pointer",
              background: res ? `${B.ok}18` : B.accent,
              border: `1px solid ${res ? B.ok : B.accentL}`,
              color: res ? B.ok : "#fff",
              fontSize:12, fontWeight:700, flexShrink:0,
              display:"flex", alignItems:"center", gap:6 }}>
            {busy ? (
              <>
                <div style={{ width:12, height:12, border:`1.5px solid #fff4`,
                  borderTop:"1.5px solid #fff", borderRadius:"50%",
                  animation:"spin .7s linear infinite" }} />
                Buscando...
              </>
            ) : res ? "↻ Actualizar" : "🔍 Buscar"}
          </button>
        </div>

        {/* Resultados */}
        {open && (
          <div style={{ borderTop:`1px solid ${B.border}`, padding:"14px 16px",
            background:"rgba(10,21,37,0.4)" }}>
            {busy && (
              <div style={{ display:"flex", alignItems:"center", gap:10, color:B.muted, fontSize:13 }}>
                <div style={{ width:16, height:16, border:`2px solid ${B.border}`,
                  borderTop:`2px solid ${B.accentL}`, borderRadius:"50%",
                  animation:"spin .7s linear infinite", flexShrink:0 }} />
                Buscando en ZonaProp, Argenprop, Mercado Libre...
              </div>
            )}
            {!busy && !res && (
              <div style={{ color:B.dim, fontSize:13, textAlign:"center", padding:"20px 0" }}>
                Tocá "Buscar" para ver propiedades en tiempo real
              </div>
            )}
            {!busy && res && (
              <div>
                <div style={{ fontSize:10, color:B.dim, marginBottom:10,
                  display:"flex", justifyContent:"space-between" }}>
                  <span>Búsqueda web en tiempo real</span>
                  <span>{res.timestamp.toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" })}</span>
                </div>
                <div style={{ fontSize:13, color:B.text, lineHeight:1.75,
                  whiteSpace:"pre-wrap", fontFamily:"'Trebuchet MS',sans-serif" }}>
                  {res.texto}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14, marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Buscador automático</h1>
          <p style={{ fontSize:11, color:B.muted, margin:"4px 0 0" }}>
            ZonaProp · Argenprop · Mercado Libre · búsqueda web en tiempo real
          </p>
        </div>
        <button onClick={buscarTodosAhora} disabled={buscandoTodos}
          style={{ padding:"10px 20px", borderRadius:10, cursor: buscandoTodos ? "wait" : "pointer",
            background: buscandoTodos ? B.border : B.accent,
            border: `1px solid ${buscandoTodos ? B.border : B.accentL}`,
            color: buscandoTodos ? B.muted : "#fff", fontSize:13, fontWeight:700,
            fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:8 }}>
          {buscandoTodos ? (
            <><div style={{ width:14, height:14, border:"2px solid #fff4", borderTop:"2px solid #fff", borderRadius:"50%", animation:"spin .7s linear infinite" }} />Buscando todos...</>
          ) : `🔍 Buscar para calientes + tibios (${calientes.length + tibios.length})`}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"flex", gap:10, marginBottom:22, flexWrap:"wrap" }}>
        {[
          { v:calientes.length, l:"Calientes", c:B.hot  },
          { v:tibios.length,    l:"Tibios",    c:B.warm  },
          { v:Object.keys(resultados).length, l:"Ya buscados", c:B.ok },
        ].map(s => (
          <div key={s.l} style={{ background:B.card, border:`1px solid ${s.c}30`,
            borderRadius:10, padding:"8px 16px", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:700, color:s.c, fontFamily:"Georgia,serif", lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:10, color:B.muted, marginTop:3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Calientes */}
      {calientes.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:B.hot }} />
            <span style={{ fontSize:11, fontWeight:600, color:B.hot, letterSpacing:"1px" }}>CALIENTES — BUSCAR HOY</span>
          </div>
          {calientes.map(l => <LeadCard key={l.id} lead={l} />)}
        </div>
      )}

      {/* Tibios */}
      {tibios.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:B.warm }} />
            <span style={{ fontSize:11, fontWeight:600, color:B.warm, letterSpacing:"1px" }}>TIBIOS — BUSCAR ANTES QUE ENFRÍEN</span>
          </div>
          {tibios.map(l => <LeadCard key={l.id} lead={l} />)}
        </div>
      )}

      {/* Resto */}
      {resto.length > 0 && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:B.muted }} />
            <span style={{ fontSize:11, fontWeight:600, color:B.muted, letterSpacing:"1px" }}>OTROS CON ZONA Y PRESUPUESTO</span>
          </div>
          {resto.map(l => <LeadCard key={l.id} lead={l} />)}
        </div>
      )}

      {activos.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px", color:B.dim }}>
          No hay leads activos con zona y presupuesto definidos.
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
