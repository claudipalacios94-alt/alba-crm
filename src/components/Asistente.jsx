// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO ASISTENTE IA
// Chat con Claude Opus, contexto real de leads y propiedades
// ══════════════════════════════════════════════════════════════
import { AI_MODEL_SMART } from "../config/ai.js";
import React, { useState, useRef, useEffect } from "react";
import { B, AG, PROPS_DEMO } from "../data/constants.js";
 
function useIsMobile(breakpoint = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w < breakpoint;
}
 
const SUGERENCIAS = [
  { t:"Susana — prioridad HOY",       p:"Dame un plan de acción para Susana (ID 55) que quiere ver la propiedad de La Perla. Va a piñón fijo." },
  { t:"Agustina Rutia — CALIENTE",    p:"Agustina Rutia busca casa 3 amb con cochera en Chauvin hasta USD 135k. ¿Qué propiedades le muestro?" },
  { t:"Patricia — visita pendiente",  p:"Patricia tiene 55k al contado y la propiedad a ver es 62k. ¿Cómo manejo la diferencia de precio?" },
  { t:"Prioridades del día",          p:"¿A quién llamo primero hoy y por qué? Analizá los leads calientes y tibios." },
  { t:"Distribución del equipo",      p:"¿Cómo reparto los leads sin agente asignado entre Claudi, Alejandra, Flor, Lucas y Luján?" },
  { t:"WhatsApp para Susana",         p:"Redactá un WhatsApp de primer contacto para Susana que quiere ver el depto de La Perla USD 85.000." },
  { t:"Leads en Chauvin",             p:"Tengo varios leads buscando en Chauvin. ¿Qué propiedades tengo disponibles y cómo las priorizo?" },
  { t:"Reactivar leads fríos",        p:"¿Cómo reactivaría a los leads que llevan más de 20 días sin responder? Dame una estrategia concreta." },
];
 
export default function Asistente({ leads, properties }) {
  const mobile = useIsMobile(768);
  const [msgs,    setMsgs]    = useState([]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showSug, setShowSug] = useState(false);
  const chatRef = useRef(null);
 
  const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
  const allProps = properties?.length ? properties : PROPS_DEMO;
 
  // ── OPTIMIZACIÓN TOKENS ───────────────────────────────────
  // Solo los 12 leads más urgentes (calientes y tibios primero)
  const leadsCtx = [...activos]
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 12);
 
  // Props: solo datos esenciales, sin caracts largas
  const ctxLeads = leadsCtx.map(l =>
    `${l.nombre}|${l.ag||"-"}|${l.etapa}|USD${l.presup||"?"}|${l.zona||"?"}|${l.dias}d${l.notaImp ? "|⚠️"+l.notaImp : ""}`
  ).join("\n");
 
  const ctxProps = allProps.slice(0, 10).map(p =>
    `${p.tipo} ${p.zona} USD${p.precio?.toLocaleString()||"?"}`
  ).join("\n");
 
  const SYSTEM = `Asistente de Alba Inversiones, Mar del Plata. Equipo: Claudi(C) Alejandra(A) Flor(F) Lucas(L) Luján(Lu). Español rioplatense, directo, máx 3 párrafos.
 
LEADS URGENTES (${leadsCtx.length} de ${activos.length} activos):
${ctxLeads}
 
PROPIEDADES (${allProps.length} total):
${ctxProps}`;
 
  useEffect(() => {
    chatRef.current?.scrollTo({ top: 9999, behavior: "smooth" });
  }, [msgs, loading]);
 
  async function send(texto) {
    if (!texto.trim() || loading) return;
    const fullHistory = [...msgs, { role:"user", content:texto }];
    setMsgs(fullHistory);
    setInput("");
    setLoading(true);
    // Solo los últimos 6 mensajes para ahorrar tokens
    const history = fullHistory.slice(-6);
    try {
      const r = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_MODEL_SMART,  
          max_tokens: 800,
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
    <div style={{ display:"flex", height:"100%", gap: mobile ? 0 : 12, overflow:"hidden", flexDirection: mobile ? "column" : "row" }}>
 
      {/* Chat */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:B.card,
        border:`1px solid ${B.border}`, borderRadius: mobile ? 10 : 12, overflow:"hidden", minWidth:0 }}>
 
        {/* Header */}
        <div style={{ padding: mobile ? "10px 12px" : "12px 14px", borderBottom:`1px solid ${B.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap: mobile ? 8 : 9 }}>
            <div style={{ width: mobile ? 28 : 32, height: mobile ? 28 : 32, borderRadius:"50%",
              background:"linear-gradient(135deg,#0B1E40,#1A3A7A)", border:`1px solid ${B.accentL}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize: mobile ? 12 : 13, color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700, flexShrink:0 }}>A</div>
            <div>
              <div style={{ fontSize: mobile ? 12 : 13, fontWeight:600, color:B.text }}>Asistente Alba · Opus 4.6</div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width: mobile ? 4 : 5, height: mobile ? 4 : 5, borderRadius:"50%", background:B.ok }} />
                <span style={{ fontSize: mobile ? 11 : 12, color:B.muted }}>Conoce los {leads.length} leads y {allProps.length} propiedades</span>
              </div>
            </div>
          </div>
          {mobile && msgs.length === 0 && (
            <button onClick={() => setShowSug(s => !s)}
              style={{ padding:"5px 10px", borderRadius:6, cursor:"pointer", fontSize:11,
                background: showSug ? B.accent + "20" : "transparent",
                border:`1px solid ${showSug ? B.accentL : B.border}`, color:B.accentL }}>
              💡 Ideas
            </button>
          )}
        </div>
 
        {/* Mensajes */}
        <div ref={chatRef} style={{ flex:1, overflowY:"auto", padding: mobile ? "10px" : "12px",
          scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent`,
          display:"flex", flexDirection:"column", gap: mobile ? 8 : 9 }}>
          {msgs.length === 0 && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, opacity:.5 }}>
              <div style={{ fontSize: mobile ? 22 : 26, fontFamily:"Georgia,serif", color:B.accentL, fontWeight:700 }}>A</div>
              <div style={{ fontSize: mobile ? 11 : 12, color:"#8AAECC", textAlign:"center", maxWidth: mobile ? 240 : 260, lineHeight:1.6, padding:"0 10px" }}>
                Preguntame cualquier cosa sobre tus leads, propiedades o estrategia del día.
              </div>
            </div>
          )}
          {msgs.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} style={{ display:"flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: mobile ? 6 : 7 }}>
                {!isUser && (
                  <div style={{ width: mobile ? 22 : 24, height: mobile ? 22 : 24, borderRadius:"50%", background:"linear-gradient(135deg,#0B1E40,#1A3A7A)",
                    border:`1px solid ${B.accentL}`, display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize: mobile ? 11 : 12, color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700, flexShrink:0, marginTop:2 }}>A</div>
                )}
                <div style={{ maxWidth: mobile ? "85%" : "76%", padding: mobile ? "8px 11px" : "9px 13px",
                  borderRadius: isUser ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  background: isUser ? B.userMsg : B.aiMsg,
                  border: `1px solid ${isUser ? `${B.accentL}30` : B.border}`,
                  fontSize: mobile ? 13 : 12, color:B.text, lineHeight:1.65, whiteSpace:"pre-wrap" }}>
                  {m.content}
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ display:"flex", gap: mobile ? 6 : 7, alignItems:"flex-start" }}>
              <div style={{ width: mobile ? 22 : 24, height: mobile ? 22 : 24, borderRadius:"50%", background:"linear-gradient(135deg,#0B1E40,#1A3A7A)",
                border:`1px solid ${B.accentL}`, display:"flex", alignItems:"center", justifyContent:"center",
                fontSize: mobile ? 11 : 12, color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700, flexShrink:0 }}>A</div>
              <div style={{ padding: mobile ? "9px 12px" : "10px 14px", borderRadius:"12px 12px 12px 3px",
                background:B.aiMsg, border:`1px solid ${B.border}`, display:"flex", gap:4, alignItems:"center" }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: mobile ? 4 : 5, height: mobile ? 4 : 5, borderRadius:"50%", background:B.accentL,
                    animation:`bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>
 
        {/* Input */}
        <div style={{ padding: mobile ? "8px 10px" : "10px", borderTop:`1px solid ${B.border}`, flexShrink:0, display:"flex", gap: mobile ? 6 : 8, alignItems:"flex-end" }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Preguntá algo... ej: ¿a quién llamo hoy?"
            rows={2}
            style={{ flex:1, background:"transparent", border:`1px solid ${B.border}`, borderRadius:8,
              padding: mobile ? "8px 10px" : "8px 11px", color:B.text, fontSize: mobile ? 13 : 12, outline:"none", resize:"none",
              fontFamily:"'Trebuchet MS',sans-serif", lineHeight:1.5, scrollbarWidth:"none" }} />
          <button onClick={() => send(input)} disabled={loading || !input.trim()}
            style={{ width: mobile ? 40 : 36, height: mobile ? 40 : 36, borderRadius:8, flexShrink:0,
              background: input.trim() && !loading ? B.accent : "transparent",
              border: `1px solid ${input.trim() && !loading ? B.accentL : B.border}`,
              cursor: input.trim() && !loading ? "pointer" : "default",
              display:"flex", alignItems:"center", justifyContent:"center",
              color: input.trim() && !loading ? B.accentL : B.dim, fontSize: mobile ? 16 : 15 }}>↑</button>
        </div>
      </div>
 
      {/* Panel sugerencias */}
      {(!mobile || showSug) && (
        <div style={{ width: mobile ? "100%" : 210, flexShrink:0, display:"flex", flexDirection:"column", gap:10,
          overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent`,
          maxHeight: mobile ? 200 : "none" }}>
          <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius: mobile ? 10 : 12, overflow:"hidden" }}>
            <div style={{ padding: mobile ? "8px 10px 6px" : "10px 12px 8px", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize: mobile ? 11 : 12, fontWeight:600, color:B.text }}>Situaciones del día</div>
                {mobile && <div style={{ fontSize:10, color:"#8AAECC", marginTop:1 }}>Tocá para preguntar</div>}
              </div>
              {mobile && (
                <button onClick={() => setShowSug(false)}
                  style={{ background:"transparent", border:"none", color:B.muted, cursor:"pointer", fontSize:14, padding:"0 4px" }}>✕</button>
              )}
            </div>
            <div style={{ padding: mobile ? "6px" : "7px", display:"flex", flexDirection:"column", gap:5 }}>
              {SUGERENCIAS.map((s, i) => (
                <div key={i} onClick={() => { send(s.p); if (mobile) setShowSug(false); }}
                  style={{ padding: mobile ? "7px 8px" : "8px 10px", borderRadius:7, cursor:"pointer",
                    background:`${B.accentL}07`, border:`1px solid ${B.accentL}20`, transition:"all .12s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${B.accentL}14`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${B.accentL}07`; }}>
                  <div style={{ fontSize: mobile ? 12 : 11, fontWeight:600, color:B.text }}>{s.t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
 
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        textarea::-webkit-scrollbar { display:none }
      `}</style>
    </div>
  );
}
