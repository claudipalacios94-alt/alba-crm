import React from "react";
import { B } from "../data/constants.js";
import { useAppContext } from "../context/SupabaseContext.jsx";

function MicBtn({ onTranscript }) {
  const [escuchando, setEscuchando] = React.useState(false);
  const [nivel, setNivel] = React.useState([0,0,0,0,0]);
  const reconRef = React.useRef(null);
  const animRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const heights = [14,22,30,22,14];

  function animarOndas() {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const slice = Math.floor(data.length / 5);
      setNivel([0,1,2,3,4].map(i => Math.min(1, data[i*slice] / 128)));
    }
    animRef.current = requestAnimationFrame(animarOndas);
  }

  async function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Usá Chrome para el micrófono."); return; }
    if (escuchando) {
      reconRef.current?.stop();
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t=>t.stop());
      setEscuchando(false); setNivel([0,0,0,0,0]); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      animarOndas();
    } catch(e) {}

    const recon = new SR();
    recon.lang = "es-AR"; recon.continuous = false; recon.interimResults = false;
    recon.onresult = e => { onTranscript(e.results[0][0].transcript); };
    recon.onend = () => {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t=>t.stop());
      setEscuchando(false); setNivel([0,0,0,0,0]);
    };
    recon.onerror = () => {
      cancelAnimationFrame(animRef.current);
      setEscuchando(false); setNivel([0,0,0,0,0]);
    };
    reconRef.current = recon;
    recon.start();
    setEscuchando(true);
  }

  return (
    <button onClick={toggleMic}
      style={{ width:40, height:40, borderRadius:8, cursor:"pointer", flexShrink:0,
        background: escuchando ? "rgba(204,34,51,0.15)" : "rgba(42,91,173,0.12)",
        border: `1px solid ${escuchando?"#CC2233":B.border}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all 0.2s" }}>
      {escuchando ? (
        <div style={{ display:"flex", gap:2, alignItems:"center" }}>
          {nivel.map((n, i) => (
            <div key={i} style={{
              width:3, borderRadius:2,
              height: heights[i] * (0.3 + n * 0.7) + "px",
              background:"#CC2233",
              transition:"height 0.08s ease",
              minHeight:3,
            }} />
          ))}
        </div>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={B.accentL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="1" width="6" height="12" rx="3"/>
          <path d="M5 10a7 7 0 0 0 14 0"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      )}
    </button>
  );
}

export default function AIFloatingChat() {
  const { leads, properties, rentals, captaciones, supabase, agregarConsumo } = useAppContext();
  const [open, setOpen] = React.useState(false);
  const [mensajes, setMensajes] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [iniciado, setIniciado] = React.useState(false);
  const chatRef = React.useRef(null);

  function buildContexto() {
    const hoy = new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" });
    const activos = (leads||[]).filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
    const calientes = activos.filter(l => l.dias <= 3).slice(0, 10);
    const negociacion = activos.filter(l => l.etapa === "Negociación");
    const caps = (captaciones||[]).slice(0, 30);
    const capResumen = caps.map(c => `${c.tipo||"Prop"} ${c.zona||"?"} USD${c.precio||"?"} [${c.tipo_captacion||"?"}]${c.direccion?" dir:"+c.direccion:""}${c.nombre_propietario?" prop:"+c.nombre_propietario:""}`).join(" | ");
    const propsResumen = (properties||[]).slice(0,10).map(p => `${p.tipo||"Prop"} ${p.zona||"?"} USD${p.precio||"?"}`).join(" | ");
    const rentResumen = (rentals||[]).slice(0,5).map(r => `${r.tipo||"Prop"} ${r.zona||"?"} $${r.precio||"?"}/mes`).join(" | ");
    return `Hoy es ${hoy}. Inmobiliaria Alba Inversiones, Mar del Plata. Sos el asistente de Claudi (dueña).
LEADS negociación (${negociacion.length}): ${negociacion.map(l=>`${l.nombre} ${l.zona} USD${l.presup||"?"}`).join(", ")||"ninguno"}
LEADS calientes (${calientes.length}): ${calientes.map(l=>`${l.nombre}(${l.dias}d,${l.etapa},${l.zona},USD${l.presup||"?"})`).join(" | ")}
PROPIEDADES en venta (${(properties||[]).length}): ${propsResumen||"ninguna"}
ALQUILERES (${(rentals||[]).length}): ${rentResumen||"ninguno"}
CAPTACIONES pendientes (${caps.length}): ${capResumen||"ninguna"}
REGLAS: Español rioplatense, directo y conciso. Si algo implica modificar datos del CRM, preguntás antes. Tenés visión completa del mapa, captaciones, propiedades y leads.`;
  }

  // Cargar historial de hoy
  React.useEffect(() => {
    if (!supabase) return;
    const hoy = new Date().toISOString().slice(0,10);
    supabase.from("briefing_chat").select("*")
      .gte("created_at", hoy + "T00:00:00")
      .order("created_at", { ascending: true })
      .limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMensajes(data.map(d => ({ role: d.role, content: d.content, id: d.id })));
          setIniciado(true);
        }
      });
  }, []);

  React.useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes]);

  // Scroll al abrir
  React.useEffect(() => {
    if (open && chatRef.current) {
      const timer = setTimeout(() => {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  async function guardarMensaje(role, content) {
    if (!supabase) return;
    await supabase.from("briefing_chat").insert([{ role, content }]);
  }

  async function enviar(texto) {
    if (!texto.trim() || loading) return;
    const userMsg = { role:"user", content: texto };
    const nuevosMensajes = [...mensajes, userMsg];
    setMensajes(nuevosMensajes);
    setInput("");
    setLoading(true);
    setIniciado(true);
    await guardarMensaje("user", texto);

    const historial = nuevosMensajes.slice(-10).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: buildContexto(),
          messages: historial,
        })
      });
      const data = await res.json();
      const respuesta = data.content?.[0]?.text || "Sin respuesta";
      setMensajes(p => [...p, { role:"assistant", content: respuesta }]);
      await guardarMensaje("assistant", respuesta);
      if (agregarConsumo) agregarConsumo(800, 150);
    } catch(e) {
      setMensajes(p => [...p, { role:"assistant", content: "Error al conectar. Verificá los créditos." }]);
    }
    setLoading(false);
  }

  async function arrancarDia() {
    await enviar("¿Qué hago primero hoy para avanzar en ventas?");
  }

  const [w, setW] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  React.useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const mobile = w < 768;

  return (
    <>
      {/* Botón flotante */}
      <button onClick={() => setOpen(true)}
        style={{ position:"fixed", bottom:20, right:20, width:56, height:56, borderRadius:"50%",
          background:"linear-gradient(135deg,#2A5BAD,#4A8AE8)", border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 4px 16px rgba(42,91,173,0.4)", zIndex:1000,
          transition:"transform 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {/* Panel de chat */}
      {open && (
        <div style={{ position:"fixed", bottom: mobile ? 0 : 88, right: mobile ? 0 : 20,
          width: mobile ? "100%" : 380, height: mobile ? "calc(100vh - 60px)" : 520,
          background:"#0A1525", border:`1px solid ${B.border}`,
          borderRadius: mobile ? 0 : 14,
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          display:"flex", flexDirection:"column", zIndex:1001 }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"14px 16px", borderBottom:`1px solid ${B.border}`, flexShrink:0 }}>
            <span style={{ fontSize:12, color:B.accentL, fontWeight:700, letterSpacing:"0.8px" }}>ASISTENTE ALBA</span>
            <div style={{ display:"flex", gap:8 }}>
              {iniciado && (
                <button onClick={()=>{ setMensajes([]); setIniciado(false); }}
                  style={{ fontSize:10, color:"#4A6A90", background:"transparent", border:"none", cursor:"pointer" }}>
                  Nueva
                </button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ width:28, height:28, borderRadius:6, background:"transparent", border:`1px solid ${B.border}`,
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8AAECC" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Chat area */}
          {!iniciado ? (
            <div style={{ flex:1, padding:24, display:"flex", flexDirection:"column", gap:12, justifyContent:"center" }}>
              <div style={{ fontSize:13, color:"#8AAECC", fontStyle:"italic", textAlign:"center", lineHeight:1.6 }}>
                Contame cómo arrancó el día, qué tenés en mente, o preguntame qué hacer.
              </div>
              <button onClick={arrancarDia}
                style={{ padding:"10px", borderRadius:8, cursor:"pointer",
                  background:B.accent, border:`1px solid ${B.accentL}`,
                  color:"#fff", fontSize:12, fontWeight:700 }}>
                ¿Qué hago hoy?
              </button>
            </div>
          ) : (
            <div ref={chatRef} style={{ flex:1, overflowY:"auto", padding:12, display:"flex", flexDirection:"column", gap:10 }}>
              {mensajes.map((m, i) => (
                <div key={i} style={{
                  display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start"
                }}>
                  <div style={{
                    maxWidth:"85%", padding:"8px 12px",
                    borderRadius: m.role==="user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: m.role==="user" ? B.accent : "rgba(42,91,173,0.12)",
                    border: m.role==="user" ? "none" : `1px solid ${B.border}`,
                    fontSize:12, color: m.role==="user" ? "#fff" : "#C8D8E8",
                    lineHeight:1.6, whiteSpace:"pre-wrap",
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:"flex", justifyContent:"flex-start" }}>
                  <div style={{ padding:"8px 12px", borderRadius:"12px 12px 12px 2px",
                    background:"rgba(42,91,173,0.12)", border:`1px solid ${B.border}`,
                    fontSize:12, color:"#4A6A90", fontStyle:"italic" }}>
                    Pensando...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:"12px 16px", borderTop:`1px solid ${B.border}`, display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey) { e.preventDefault(); enviar(input); } }}
              placeholder={iniciado ? "Escribí o dictá..." : "Preguntame qué hacer hoy..."}
              style={{ flex:1, background:B.bg, border:`1px solid ${B.border}`, borderRadius:8,
                padding:"8px 12px", color:B.text, fontSize:12, outline:"none" }} />
            <MicBtn onTranscript={t=>setInput(p=>p?p+" "+t:t)} />
            {iniciado ? (
              <button onClick={()=>enviar(input)} disabled={loading || !input.trim()}
                style={{ padding:"8px 14px", borderRadius:8, cursor:loading||!input.trim()?"default":"pointer",
                  background:loading||!input.trim()?B.border:B.accent,
                  border:"none", color:"#fff", fontSize:12, fontWeight:700 }}>
                →
              </button>
            ) : (
              <button onClick={arrancarDia}
                style={{ padding:"8px 14px", borderRadius:8, cursor:"pointer",
                  background:B.accent, border:`1px solid ${B.accentL}`,
                  color:"#fff", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>
                ¿Qué hago hoy?
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
