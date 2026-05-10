// ══════════════════════════════════════════════════════════════
// ALBA CRM — CUADERNO INTELIGENTE
// Grafo visual de notas + Asistente Alba integrado
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from "react";
import { B, AG } from "../data/constants.js";

const TIPOS = {
  idea:      { label:"Idea",      color:"#E8A830", icono:"💡" },
  lead:      { label:"Lead",      color:"#3A8BC4", icono:"👤" },
  barrio:    { label:"Barrio",    color:"#2E9E6A", icono:"📍" },
  propiedad: { label:"Propiedad", color:"#9B6DC8", icono:"🏠" },
  proyecto:  { label:"Proyecto",  color:"#CC2233", icono:"🎯" },
};

// ── Grafo visual con Canvas ───────────────────────────────────
function Grafo({ notas, onSelectNota, selectedId }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const nodesRef  = useRef([]);
  const dragRef   = useRef(null);
  const [hoverId, setHoverId] = useState(null);

  // Inicializar posiciones con física simple
  useEffect(() => {
    if (!notas.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const cx = W / 2, cy = H / 2;

    nodesRef.current = notas.map((n, i) => {
      const existing = nodesRef.current.find(nd => nd.id === n.id);
      if (existing) return { ...existing, nota: n };
      const angle = (i / notas.length) * Math.PI * 2;
      const r = Math.min(W, H) * 0.3;
      return {
        id: n.id, nota: n,
        x: cx + Math.cos(angle) * r * (0.5 + Math.random() * 0.5),
        y: cy + Math.sin(angle) * r * (0.5 + Math.random() * 0.5),
        vx: 0, vy: 0,
        r: n.tipo === "proyecto" ? 36 : 28,
      };
    });
    draw();
  }, [notas]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Fondo sutil
    ctx.fillStyle = "rgba(7,14,28,0)";
    ctx.fillRect(0, 0, W, H);

    const nodes = nodesRef.current;

    // Links
    nodes.forEach(node => {
      const links = node.nota.links || [];
      links.forEach(linkId => {
        const target = nodes.find(n => n.id === linkId);
        if (!target) return;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = "rgba(42,91,173,0.3)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    });

    // Nodos
    nodes.forEach(node => {
      const tipo = TIPOS[node.nota.tipo] || TIPOS.idea;
      const isSelected = node.id === selectedId;
      const isHover = node.id === hoverId;
      const r = node.r;

      // Glow
      if (isSelected || isHover) {
        const grad = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, r * 2);
        grad.addColorStop(0, tipo.color + "40");
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Círculo principal
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? tipo.color : "rgba(15,30,53,0.95)";
      ctx.fill();
      ctx.strokeStyle = tipo.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Icono
      ctx.font = `${r * 0.7}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isSelected ? "#fff" : tipo.color;
      ctx.fillText(tipo.icono, node.x, node.y - 3);

      // Label
      ctx.font = `600 10px -apple-system, sans-serif`;
      ctx.fillStyle = isSelected ? tipo.color : "#8AAECC";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const label = node.nota.titulo.length > 14 ? node.nota.titulo.slice(0, 14) + "…" : node.nota.titulo;
      ctx.fillText(label, node.x, node.y + r + 4);
    });
  }

  // Física simple
  function tick() {
    const nodes = nodesRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !nodes.length) return;
    const W = canvas.width, H = canvas.height;

    nodes.forEach(n => {
      // Repulsión entre nodos
      nodes.forEach(m => {
        if (n.id === m.id) return;
        const dx = n.x - m.x, dy = n.y - m.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const force = Math.min(2000 / (dist * dist), 5);
        n.vx += (dx / dist) * force;
        n.vy += (dy / dist) * force;
      });
      // Atracción al centro
      n.vx += (W/2 - n.x) * 0.002;
      n.vy += (H/2 - n.y) * 0.002;
      // Fricción
      n.vx *= 0.85; n.vy *= 0.85;
      if (dragRef.current?.id !== n.id) {
        n.x += n.vx; n.y += n.vy;
      }
      // Bounds
      n.x = Math.max(n.r + 10, Math.min(W - n.r - 10, n.x));
      n.y = Math.max(n.r + 10, Math.min(H - n.r - 30, n.y));
    });
    draw();
    animRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [notas, selectedId, hoverId]);

  function getNodeAt(x, y) {
    return nodesRef.current.find(n => {
      const dx = n.x - x, dy = n.y - y;
      return Math.sqrt(dx*dx + dy*dy) <= n.r + 5;
    });
  }

  function onMouseMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (dragRef.current) {
      dragRef.current.x = x; dragRef.current.y = y;
    } else {
      const node = getNodeAt(x, y);
      setHoverId(node?.id || null);
      canvasRef.current.style.cursor = node ? "pointer" : "default";
    }
  }

  function onMouseDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const node = getNodeAt(x, y);
    if (node) dragRef.current = node;
  }

  function onMouseUp(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const node = getNodeAt(x, y);
    if (node && !dragRef.current?.moved) onSelectNota(node.nota);
    dragRef.current = null;
  }

  useEffect(() => {
    draw();
  }, [selectedId]);

  return (
    <canvas ref={canvasRef}
      style={{ width:"100%", height:"100%", display:"block" }}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    />
  );
}

// ── Chat Asistente ────────────────────────────────────────────
function AsistenteChat({ leads, properties, supabase, onNotaCreada }) {
  const [mensajes,  setMensajes]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    const hoy = new Date().toISOString().slice(0,10);
    supabase.from("briefing_chat").select("*")
      .gte("created_at", hoy + "T00:00:00")
      .order("created_at", { ascending: true })
      .limit(20)
      .then(({ data }) => {
        if (data?.length) setMensajes(data.map(d => ({ role:d.role, content:d.content })));
      });
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes]);

  function buildContexto() {
    const hoy = new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" });
    const activos = leads.filter(l => l.etapa !== "Cerrado" && l.etapa !== "Perdido");
    const calientes = activos.filter(l => l.dias <= 3).slice(0, 8);
    const negociacion = activos.filter(l => l.etapa === "Negociación");
    return `Hoy es ${hoy}. Sos el asistente de Claudi de Alba Inversiones, Mar del Plata.
Leads negociación: ${negociacion.map(l=>`${l.nombre} ${l.zona} USD${l.presup||"?"}`).join(", ")||"ninguno"}
Leads calientes: ${calientes.map(l=>`${l.nombre}(${l.dias}d,${l.etapa},${l.zona})`).join(" | ")}
Props cartera: ${(properties||[]).length}
REGLAS: Español rioplatense, directo y conciso. Si algo implica modificar datos del CRM, preguntás antes. Si el usuario comparte algo importante (idea, estrategia, info de lead), sugerís guardarlo como nota en el cuaderno escribiendo al final: [NOTA: título | tipo | contenido breve]`;
  }

  async function guardarMensaje(role, content) {
    if (!supabase) return;
    await supabase.from("briefing_chat").insert([{ role, content }]);
  }

  async function enviar(texto) {
    if (!texto.trim() || loading) return;
    const nuevosMensajes = [...mensajes, { role:"user", content:texto }];
    setMensajes(nuevosMensajes);
    setInput("");
    setLoading(true);
    await guardarMensaje("user", texto);

    const historial = nuevosMensajes.slice(-10).map(m => ({ role:m.role, content:m.content }));

    try {
      const res = await fetch("/api/claude", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: buildContexto(),
          messages: historial,
        })
      });
      const data = await res.json();
      const respuesta = data.content?.[0]?.text || "Sin respuesta";

      // Detectar si la IA sugiere crear una nota
      const notaMatch = respuesta.match(/\[NOTA:\s*([^|]+)\|\s*([^|]+)\|\s*([^\]]+)\]/);
      if (notaMatch && onNotaCreada) {
        const [, titulo, tipo, contenido] = notaMatch;
        onNotaCreada({
          titulo: titulo.trim(),
          tipo: tipo.trim().toLowerCase(),
          contenido: contenido.trim(),
        });
      }

      const respuestaLimpia = respuesta.replace(/\[NOTA:[^\]]+\]/g, "").trim();
      setMensajes(p => [...p, { role:"assistant", content:respuestaLimpia }]);
      await guardarMensaje("assistant", respuestaLimpia);
    } catch(e) {
      setMensajes(p => [...p, { role:"assistant", content:"Error al conectar." }]);
    }
    setLoading(false);
  }

  const inp = {
    flex:1, background:"rgba(10,21,37,0.6)", border:`1px solid ${B.border}`,
    borderRadius:8, padding:"8px 12px", color:B.text, fontSize:12, outline:"none",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ fontSize:10, color:B.accentL, fontWeight:700, letterSpacing:"1px", padding:"10px 14px", borderBottom:`1px solid ${B.border}` }}>
        ✨ ASISTENTE ALBA
      </div>
      <div ref={chatRef} style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        {mensajes.length === 0 && (
          <div style={{ fontSize:12, color:"#4A6A90", fontStyle:"italic" }}>
            Contame ideas, pensamientos, novedades de leads... Lo importante lo guardo como nota en el grafo.
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{
              maxWidth:"88%", padding:"7px 11px",
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
            <div style={{ padding:"7px 11px", borderRadius:"12px 12px 12px 2px",
              background:"rgba(42,91,173,0.12)", border:`1px solid ${B.border}`,
              fontSize:12, color:"#4A6A90", fontStyle:"italic" }}>
              Pensando...
            </div>
          </div>
        )}
      </div>
      <div style={{ padding:"10px 14px", borderTop:`1px solid ${B.border}`, display:"flex", gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); enviar(input); } }}
          placeholder="Escribí... (Enter para enviar)"
          style={inp} />
        <button onClick={()=>enviar(input)} disabled={loading||!input.trim()}
          style={{ padding:"8px 14px", borderRadius:8, cursor:loading||!input.trim()?"default":"pointer",
            background:loading||!input.trim()?B.border:B.accent, border:"none",
            color:"#fff", fontSize:13, fontWeight:700 }}>
          →
        </button>
      </div>
    </div>
  );
}

// ── Panel nota seleccionada ───────────────────────────────────
function PanelNota({ nota, supabase, notas, onUpdate, onDelete, onLink }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ titulo:nota.titulo, contenido:nota.contenido||"", tipo:nota.tipo||"idea", tags:"" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ titulo:nota.titulo, contenido:nota.contenido||"", tipo:nota.tipo||"idea", tags:(nota.tags||[]).join(", ") });
    setEditando(false);
  }, [nota.id]);

  const tipo = TIPOS[nota.tipo] || TIPOS.idea;
  const linksNotas = (nota.links||[]).map(id => notas.find(n=>n.id===id)).filter(Boolean);

  async function guardar() {
    setSaving(true);
    const updates = {
      titulo: form.titulo,
      contenido: form.contenido,
      tipo: form.tipo,
      tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean),
    };
    await supabase.from("cuaderno_notas").update(updates).eq("id", nota.id);
    onUpdate(nota.id, updates);
    setEditando(false);
    setSaving(false);
  }

  async function eliminar() {
    if (!confirm("¿Eliminar esta nota?")) return;
    await supabase.from("cuaderno_notas").delete().eq("id", nota.id);
    onDelete(nota.id);
  }

  const inp = { width:"100%", background:"rgba(10,21,37,0.6)", border:`1px solid ${B.border}`, borderRadius:6, padding:"6px 10px", color:B.text, fontSize:12, outline:"none", boxSizing:"border-box" };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflowY:"auto" }}>
      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:16 }}>{tipo.icono}</span>
        <span style={{ fontSize:13, fontWeight:700, color:tipo.color, flex:1 }}>{nota.titulo}</span>
        <button onClick={()=>setEditando(e=>!e)}
          style={{ fontSize:10, padding:"3px 10px", borderRadius:5, cursor:"pointer",
            background:editando?B.accent:"transparent", border:`1px solid ${editando?B.accentL:B.border}`,
            color:editando?"#fff":"#8AAECC" }}>
          {editando?"Cancelar":"Editar"}
        </button>
        <button onClick={eliminar}
          style={{ fontSize:10, padding:"3px 8px", borderRadius:5, cursor:"pointer",
            background:"transparent", border:`1px solid ${B.hot}40`, color:B.hot }}>
          🗑
        </button>
      </div>

      <div style={{ padding:"12px 14px", flex:1, display:"flex", flexDirection:"column", gap:10 }}>
        {editando ? (
          <>
            <div>
              <label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:3 }}>TÍTULO</label>
              <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:3 }}>TIPO</label>
              <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp}>
                {Object.entries(TIPOS).map(([k,v])=><option key={k} value={k}>{v.icono} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:3 }}>CONTENIDO</label>
              <textarea value={form.contenido} onChange={e=>setForm(f=>({...f,contenido:e.target.value}))}
                rows={6} style={{ ...inp, resize:"none", lineHeight:1.6 }} />
            </div>
            <div>
              <label style={{ fontSize:10, color:"#8AAECC", display:"block", marginBottom:3 }}>TAGS (separados por coma)</label>
              <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} style={inp} placeholder="ej: chauvin, agustina, casa" />
            </div>
            <button onClick={guardar} disabled={saving}
              style={{ padding:"8px", borderRadius:7, cursor:saving?"default":"pointer",
                background:saving?B.border:B.accent, border:`1px solid ${saving?B.border:B.accentL}`,
                color:saving?"#8AAECC":"#fff", fontSize:12, fontWeight:700 }}>
              {saving?"Guardando...":"Guardar"}
            </button>
          </>
        ) : (
          <>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, background:tipo.color+"20", color:tipo.color, border:`1px solid ${tipo.color}40` }}>{tipo.icono} {tipo.label}</span>
              {(nota.tags||[]).map(t=><span key={t} style={{ fontSize:10, padding:"2px 8px", borderRadius:10, background:"rgba(42,91,173,0.15)", color:"#8AAECC", border:`1px solid ${B.border}` }}>#{t}</span>)}
            </div>
            {nota.contenido && (
              <div style={{ fontSize:12, color:"#C8D8E8", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{nota.contenido}</div>
            )}
            <div style={{ fontSize:10, color:"#4A6A90" }}>
              {new Date(nota.created_at).toLocaleDateString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
            </div>
          </>
        )}

        {/* Notas conectadas */}
        {linksNotas.length > 0 && (
          <div>
            <div style={{ fontSize:10, color:"#8AAECC", fontWeight:600, letterSpacing:"0.8px", marginBottom:6 }}>CONECTADO CON</div>
            {linksNotas.map(n => {
              const t = TIPOS[n.tipo]||TIPOS.idea;
              return (
                <div key={n.id} style={{ fontSize:11, color:t.color, marginBottom:3 }}>
                  {t.icono} {n.titulo}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Módulo principal ──────────────────────────────────────────
export default function Cuaderno({ leads, properties, supabase }) {
  const [notas,       setNotas]       = useState([]);
  const [loaded,      setLoaded]      = useState(false);
  const [selectedNota,setSelectedNota]= useState(null);
  const [vistaActiva, setVistaActiva] = useState("grafo"); // grafo | asistente | lista
  const [creandoNota, setCreandoNota] = useState(false);
  const [formNota,    setFormNota]    = useState({ titulo:"", tipo:"idea", contenido:"" });
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("cuaderno_notas").select("*").order("created_at", { ascending:false })
      .then(({ data }) => { setNotas(data||[]); setLoaded(true); });
  }, []);

  async function crearNota(data = formNota) {
    if (!data.titulo.trim()) return;
    setSaving(true);
    const { data: nueva } = await supabase.from("cuaderno_notas").insert([{
      titulo:   data.titulo.trim(),
      tipo:     data.tipo || "idea",
      contenido:data.contenido || null,
      tags:     [],
      links:    [],
    }]).select().single();
    if (nueva) {
      setNotas(p => [nueva, ...p]);
      setSelectedNota(nueva);
      setVistaActiva("grafo");
    }
    setCreandoNota(false);
    setFormNota({ titulo:"", tipo:"idea", contenido:"" });
    setSaving(false);
  }

  function updateNota(id, updates) {
    setNotas(p => p.map(n => n.id===id ? {...n,...updates} : n));
    if (selectedNota?.id === id) setSelectedNota(n => ({...n,...updates}));
  }

  function deleteNota(id) {
    setNotas(p => p.filter(n => n.id!==id));
    setSelectedNota(null);
  }

  const inp = { background:"rgba(10,21,37,0.6)", border:`1px solid ${B.border}`, borderRadius:7, padding:"7px 10px", color:B.text, fontSize:12, outline:"none", width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderBottom:`1px solid ${B.border}`, flexShrink:0 }}>
        <div style={{ flex:1 }}>
          <span style={{ fontSize:16, fontWeight:700, color:B.text, fontFamily:"Georgia,serif" }}>Cuaderno</span>
          <span style={{ fontSize:11, color:"#4A6A90", marginLeft:8 }}>{notas.length} notas</span>
        </div>

        {/* Toggle vista */}
        <div style={{ display:"flex", gap:3, background:B.card, borderRadius:8, padding:3, border:`1px solid ${B.border}` }}>
          {[
            { id:"grafo",     label:"🔵 Grafo" },
            { id:"asistente", label:"✨ Asistente" },
            { id:"lista",     label:"📋 Lista" },
          ].map(v => (
            <button key={v.id} onClick={()=>setVistaActiva(v.id)}
              style={{ padding:"4px 12px", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:600, border:"none",
                background:vistaActiva===v.id?B.accent:"transparent",
                color:vistaActiva===v.id?"#fff":"#8AAECC" }}>
              {v.label}
            </button>
          ))}
        </div>

        <button onClick={()=>setCreandoNota(true)}
          style={{ padding:"6px 14px", borderRadius:8, cursor:"pointer",
            background:"#2E9E6A", border:"none", color:"#fff", fontSize:11, fontWeight:700 }}>
          + Nota
        </button>
      </div>

      {/* Modal nueva nota */}
      {creandoNota && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
          onClick={()=>setCreandoNota(false)}>
          <div style={{ background:B.sidebar, border:`1px solid ${B.accentL}40`, borderRadius:14, padding:24, width:400 }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:13, fontWeight:700, color:B.text, marginBottom:16 }}>Nueva nota</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input value={formNota.titulo} onChange={e=>setFormNota(f=>({...f,titulo:e.target.value}))}
                placeholder="Título" autoFocus style={inp} />
              <select value={formNota.tipo} onChange={e=>setFormNota(f=>({...f,tipo:e.target.value}))} style={inp}>
                {Object.entries(TIPOS).map(([k,v])=><option key={k} value={k}>{v.icono} {v.label}</option>)}
              </select>
              <textarea value={formNota.contenido} onChange={e=>setFormNota(f=>({...f,contenido:e.target.value}))}
                placeholder="Contenido (opcional)" rows={4}
                style={{ ...inp, resize:"none", lineHeight:1.6 }} />
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>crearNota()} disabled={saving||!formNota.titulo.trim()}
                  style={{ flex:1, padding:"9px", borderRadius:8, cursor:saving?"default":"pointer",
                    background:saving?B.border:"#2E9E6A", border:"none", color:"#fff", fontSize:12, fontWeight:700 }}>
                  {saving?"Guardando...":"Crear nota"}
                </button>
                <button onClick={()=>setCreandoNota(false)}
                  style={{ padding:"9px 16px", borderRadius:8, cursor:"pointer",
                    background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:12 }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cuerpo principal */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Vista grafo */}
        {vistaActiva === "grafo" && (
          <>
            <div style={{ flex:1, position:"relative", background:"radial-gradient(ellipse at center, rgba(42,91,173,0.05) 0%, transparent 70%)" }}>
              {!loaded && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#4A6A90", fontSize:12 }}>Cargando...</div>}
              {loaded && notas.length === 0 && (
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
                  <div style={{ fontSize:40 }}>🗺</div>
                  <div style={{ fontSize:13, color:"#4A6A90" }}>Tu grafo está vacío</div>
                  <button onClick={()=>setCreandoNota(true)}
                    style={{ padding:"8px 20px", borderRadius:8, cursor:"pointer", background:B.accent, border:`1px solid ${B.accentL}`, color:"#fff", fontSize:12, fontWeight:700 }}>
                    Crear primera nota
                  </button>
                </div>
              )}
              {loaded && notas.length > 0 && (
                <Grafo notas={notas} onSelectNota={setSelectedNota} selectedId={selectedNota?.id} />
              )}
            </div>

            {/* Panel detalle nota */}
            {selectedNota && (
              <div style={{ width:300, borderLeft:`1px solid ${B.border}`, background:B.card, flexShrink:0 }}>
                <PanelNota nota={selectedNota} supabase={supabase} notas={notas}
                  onUpdate={updateNota} onDelete={deleteNota} />
              </div>
            )}
          </>
        )}

        {/* Vista asistente */}
        {vistaActiva === "asistente" && (
          <div style={{ flex:1 }}>
            <AsistenteChat leads={leads} properties={properties} supabase={supabase}
              onNotaCreada={data => crearNota(data)} />
          </div>
        )}

        {/* Vista lista */}
        {vistaActiva === "lista" && (
          <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:8 }}>
            {Object.entries(TIPOS).map(([tipo, info]) => {
              const grupo = notas.filter(n => n.tipo === tipo);
              if (!grupo.length) return null;
              return (
                <div key={tipo}>
                  <div style={{ fontSize:10, color:info.color, fontWeight:700, letterSpacing:"1px", marginBottom:6 }}>
                    {info.icono} {info.label.toUpperCase()} — {grupo.length}
                  </div>
                  {grupo.map(n => (
                    <div key={n.id} onClick={()=>{ setSelectedNota(n); setVistaActiva("grafo"); }}
                      style={{ padding:"9px 12px", borderRadius:8, cursor:"pointer", marginBottom:4,
                        background:B.card, border:`1px solid ${selectedNota?.id===n.id?info.color:B.border}`,
                        borderLeft:`3px solid ${info.color}` }}>
                      <div style={{ fontSize:12, fontWeight:600, color:B.text }}>{n.titulo}</div>
                      {n.contenido && <div style={{ fontSize:11, color:"#6A8AAE", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.contenido}</div>}
                    </div>
                  ))}
                </div>
              );
            })}
            {notas.length === 0 && <div style={{ textAlign:"center", color:"#4A6A90", fontSize:12, paddingTop:40 }}>Sin notas aún</div>}
          </div>
        )}
      </div>
    </div>
  );
}
