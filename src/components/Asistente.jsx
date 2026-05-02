// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO ASISTENTE IA
// Chat con Claude Opus, contexto real de leads y propiedades
// ══════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect } from "react";
import { B, AG, PROPS_DEMO } from "../data/constants.js";

const SUGERENCIAS = [
  { t:"Susana — prioridad HOY",       p:"Dame un plan de acción para Susana (ID 55) que quiere ver la propiedad de La Perla. Va a piñón fijo." },
  { t:"Agustina Rutia — CALIENTE",    p:"Agustina Rutia busca casa 3 amb con cochera en Chauvin hasta USD 135k. ¿Qué propiedades le muestro?" },
  { t:"Patricia — visita pendiente",  p:"Patricia tiene 55k al contado y la propiedad a ver es 62k. ¿Cómo manejo la diferencia de precio?" },
  { t:"Prioridades del día",          p:"¿A quién llamo primero hoy y por qué? Analizá los leads calientes y tibios." },
  { t:"Distribución del equipo",      p:"¿Cómo reparto los leads sin agente asignado entre Claudi, Alejandra, Flor y Lucas?" },
  { t:"WhatsApp para Susana",         p:"Redactá un WhatsApp de primer contacto para Susana que quiere ver el depto de La Perla USD 85.000." },
  { t:"Leads en Chauvin",             p:"Tengo varios leads buscando en Chauvin. ¿Qué propiedades tengo disponibles y cómo las priorizo?" },
  { t:"Reactivar leads fríos",        p:"¿Cómo reactivaría a los leads que llevan más de 20 días sin responder? Dame una estrategia concreta." },
];

export default function Asistente({ leads, properties }) {
  const [msgs,    setMsgs]    = useState([]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const allProps = properties?.length ? properties : PROPS_DEMO;

  // Contexto para la IA
  const ctxLeads = activos.slice(0, 25).map(l =>
    `- ${l.nombre}|Ag:${l.ag||"Sin asignar"}|Etapa:${l.etapa}|Presup:USD${l.presup||"?"}|Zona:${l.zona||"?"}|Días:${l.dias}|Tel:${l.tel||"-"}${l.notaImp ? "|⚠️:"+l.notaImp : ""}|Nota:${(l.nota||"").slice(0,60)}`
  ).join("\n");

  const ctxProps = allProps.map(p =>
    `- ${p.tipo} ${p.zona} ${p.dir} USD${p.precio?.toLocaleString()||"?"} ${p.m2tot||"?"}m² (${p.dias}d) ${p.caracts}`
  ).join("\n");

  const SYSTEM = `Sos el asistente de IA de Alba Inversiones Inmobiliarias, inmobiliaria en Mar del Plata, Argentina. REG 3832.
Equipo: Claudi (C), Alejandra (A), Flor (F), Lucas (L).
Respondés en español rioplatense, directo y práctico. Máximo 3-4 párrafos salvo que pidan algo largo.
Cuando redactás WhatsApp: mensajes concretos, cortos, cordiales-profesionales.
Cuando analizás leads: priorizá por probabilidad de cierre y días sin contacto.
Cuando matcheás propiedades: zona + presupuesto + tipo + características.

LEADS ACTIVOS (${activos.length} de ${leads.length} totales):
${ctxLeads}

PROPIEDADES EN VENTA (${allProps.length}):
${ctxProps}`;

  useEffect(() => {
    chatRef.current?.scrollTo({ top: 9999, behavior: "smooth" });
  }, [msgs, loading]);

  async function send(texto) {
    if (!texto.trim() || loading) return;
    const history = [...msgs, { role:"user", content:texto }];
    setMsgs(history);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 1200,
          system: SYSTEM,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const d = await r.json();
      const t = d.content?.find(b => b.type === "text")?.text || "Error en la respuesta.";
      setMsgs(p => [...p, { role:"assistant", content:t }]);
    } catch {
      setMsgs(p => [...p, { role:"assistant", content:"Error de conexión. Intentá de nuevo." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display:"flex", height:"100%", gap:12, overflow:"hidden" }}>

      {/* Chat */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:B.card,
        border:`1px solid ${B.border}`, borderRadius:12, overflow:"hidden", minWidth:0 }}>

        {/* Header */}
        <div style={{ padding:"12px 14px", borderBottom:`1px solid ${B.border}`,
          display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:"50%",
            background:"linear-gradient(135deg,#0B1E40,#1A3A7A)", border:`1px solid ${B.accentL}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700, flexShrink:0 }}>A</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:B.text }}>Asistente Alba · Opus 4.6</div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:B.ok }} />
              <span style={{ fontSize:10, color:B.muted }}>Conoce los {leads.length} leads y {allProps.length} propiedades</span>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div ref={chatRef} style={{ flex:1, overflowY:"auto", padding:"12px",
          scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent`,
          display:"flex", flexDirection:"column", gap:9 }}>
          {msgs.length === 0 && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, opacity:.5 }}>
              <div style={{ fontSize:26, fontFamily:"Georgia,serif", color:B.accentL, fontWeight:700 }}>A</div>
              <div style={{ fontSize:12, color:B.muted, textAlign:"center", maxWidth:260, lineHeight:1.6 }}>
                Preguntame cualquier cosa sobre tus leads, propiedades o estrategia del día.
              </div>
            </div>
          )}
          {msgs.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} style={{ display:"flex", justifyContent: isUser ? "flex-end" : "flex-start", gap:7 }}>
                {!isUser && (
                  <div style={{ width:24, height:24, borderRadius:"50%", background:"linear-gradient(135deg,#0B1E40,#1A3A7A)",
                    border:`1px solid ${B.accentL}`, display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700, flexShrink:0, marginTop:2 }}>A</div>
                )}
                <div style={{ maxWidth:"76%", padding:"9px 13px",
                  borderRadius: isUser ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  background: isUser ? B.userMsg : B.aiMsg,
                  border: `1px solid ${isUser ? `${B.accentL}30` : B.border}`,
                  fontSize:12, color:B.text, lineHeight:1.65, whiteSpace:"pre-wrap" }}>
                  {m.content}
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ display:"flex", gap:7, alignItems:"flex-start" }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:"linear-gradient(135deg,#0B1E40,#1A3A7A)",
                border:`1px solid ${B.accentL}`, display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700, flexShrink:0 }}>A</div>
              <div style={{ padding:"10px 14px", borderRadius:"12px 12px 12px 3px",
                background:B.aiMsg, border:`1px solid ${B.border}`, display:"flex", gap:4, alignItems:"center" }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:B.accentL,
                    animation:`bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding:"10px", borderTop:`1px solid ${B.border}`, flexShrink:0, display:"flex", gap:8, alignItems:"flex-end" }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Preguntá algo... ej: ¿a quién llamo hoy? / redactá WhatsApp para Susana"
            rows={2}
            style={{ flex:1, background:"transparent", border:`1px solid ${B.border}`, borderRadius:8,
              padding:"8px 11px", color:B.text, fontSize:12, outline:"none", resize:"none",
              fontFamily:"'Trebuchet MS',sans-serif", lineHeight:1.5, scrollbarWidth:"none" }} />
          <button onClick={() => send(input)} disabled={loading || !input.trim()}
            style={{ width:36, height:36, borderRadius:8, flexShrink:0,
              background: input.trim() && !loading ? B.accent : "transparent",
              border: `1px solid ${input.trim() && !loading ? B.accentL : B.border}`,
              cursor: input.trim() && !loading ? "pointer" : "default",
              display:"flex", alignItems:"center", justifyContent:"center",
              color: input.trim() && !loading ? B.accentL : B.dim, fontSize:15 }}>↑</button>
        </div>
      </div>

      {/* Panel sugerencias */}
      <div style={{ width:210, flexShrink:0, display:"flex", flexDirection:"column", gap:10,
        overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent` }}>
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${B.border}` }}>
            <div style={{ fontSize:12, fontWeight:600, color:B.text }}>Situaciones del día</div>
            <div style={{ fontSize:9, color:B.muted, marginTop:1 }}>Basadas en tus datos reales</div>
          </div>
          <div style={{ padding:"7px", display:"flex", flexDirection:"column", gap:5 }}>
            {SUGERENCIAS.map((s, i) => (
              <div key={i} onClick={() => send(s.p)}
                style={{ padding:"8px 10px", borderRadius:7, cursor:"pointer",
                  background:`${B.accentL}07`, border:`1px solid ${B.accentL}20`, transition:"all .12s" }}
                onMouseEnter={e => { e.currentTarget.style.background = `${B.accentL}14`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${B.accentL}07`; }}>
                <div style={{ fontSize:11, fontWeight:600, color:B.text }}>{s.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        textarea::-webkit-scrollbar { display:none }
      `}</style>
    </div>
  );
}
