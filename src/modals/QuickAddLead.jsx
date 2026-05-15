// ══════════════════════════════════════════════════════════════
// ALBA CRM — MODAL CARGA RÁPIDA DE LEAD
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG, ORIGENES, TIPOS_OP, TIPOS_PROP_LEAD, ETAPAS_INIT } from "../data/constants.js";

const inp = {
  width:"100%", background:"#0F1E35", border:`1px solid #1A2F50`,
  borderRadius:8, padding:"9px 12px", color:"#E8EEF8",
  fontSize:13, outline:"none", boxSizing:"border-box",
  fontFamily:"'Trebuchet MS',sans-serif",
};

function Field({ label, required, half, children }) {
  return (
    <div style={{ marginBottom:12, flex: half ? "1 1 calc(50% - 6px)" : "1 1 100%", minWidth: half ? 160 : 0 }}>
      <label style={{ fontSize:12, color:"#9ABCDA", letterSpacing:"0.8px", textTransform:"uppercase", display:"block", marginBottom:5 }}>
        {label}{required && <span style={{ color:"#E85D30", marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ n, title }) {
  return (
    <>
      <div style={{ height:1, background:"#4A6A90", margin:"14px 0 12px" }} />
      <div style={{ fontSize:11, color:"#4A8AE8", fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>
        {n} {title}
      </div>
    </>
  );
}

const TIPOS_PROXACCION = ["Llamar", "WhatsApp", "Email", "Visita", "Enviar opciones", "Otro"];

export default function QuickAddLead({ onClose, onAdd }) {
  const [f, setF] = useState({
    nombre:"", tel:"", origen:"Instagram", etapa:"Nuevo Contacto",
    op:"Compra", tipo:"", presup:"", formaPago:"",
    zonas:"", ambientes:"", cochera:"", balcon:"", patio:"", m2min:"",
    nota:"", proxAccion:"", proxaccionTipo:"", proxaccionFecha:"",
    prob:"", urgencia:"",
    agCapto:"", agSeg:"", notaImp:"",
  });
  const [err, setErr] = useState({});

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  function submit() {
    const e = {};
    if (!f.nombre.trim()) e.nombre = "Obligatorio";
    if (!f.zonas.trim())  e.zonas  = "Obligatorio";
    if (Object.keys(e).length) { setErr(e); return; }

    onAdd({
      nombre: f.nombre.trim(),
      ag:     f.agSeg || f.agCapto || "",
      agCapto: f.agCapto || "",
      etapa:  f.etapa,
      op:     f.op,
      presup: f.presup ? Number(f.presup) : null,
      tipo:   f.tipo,
      zona:   f.zonas.trim(),
      tel:    f.tel.trim(),
      origen: f.origen,
      nota:   [f.nota, f.cochera && "Cochera: "+f.cochera, f.balcon && "Balcón: "+f.balcon, f.patio && "Patio: "+f.patio].filter(Boolean).join(" · "),
      proxAccion: f.proxAccion.trim() || "Calificar y contactar",
      proxaccionTipo:  f.proxaccionTipo  || null,
      proxaccionFecha: f.proxaccionFecha || null,
      prob:   f.prob ? Number(f.prob) : null,
      notaImp: f.notaImp.trim(),
      cochera: f.cochera.toLowerCase().includes("s") ? "si" : f.cochera.toLowerCase().includes("n") ? "no" : "",
      balcon:  f.balcon.toLowerCase().includes("s")  ? "si" : f.balcon.toLowerCase().includes("n")  ? "no" : "",
      patio:   f.patio.toLowerCase().includes("s")   ? "si" : f.patio.toLowerCase().includes("n")   ? "no" : "",
      ambientes: f.ambientes || null,
      m2min:   f.m2min ? Number(f.m2min) : null,
      dias:   0,
    });
  }

  const has = k => err[k] ? { borderColor: B.hot } : {};

  return (
    <div>
      {/* Bloque 1 */}
      <div style={{ fontSize:11, color:B.accentL, fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>① DATOS BÁSICOS</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
        <Field label="Nombre" required half>
          <input style={{ ...inp, ...has("nombre") }} value={f.nombre} onChange={set("nombre")} placeholder="Nombre del contacto" />
          {err.nombre && <div style={{ fontSize:12, color:B.hot, marginTop:3 }}>{err.nombre}</div>}
        </Field>
        <Field label="Teléfono" half>
          <input style={inp} value={f.tel} onChange={set("tel")} placeholder="223-xxx-xxxx" />
        </Field>
        <Field label="Origen" half>
          <select style={inp} value={f.origen} onChange={set("origen")}>
            {ORIGENES.map(o => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Quién captó" half>
          <select style={inp} value={f.agCapto} onChange={set("agCapto")}>
            <option value="">Sin definir</option>
            {Object.entries(AG).map(([k,v]) => <option key={k} value={k}>{v.n}</option>)}
          </select>
        </Field>
        <Field label="Quién hace seguimiento" half>
          <select style={inp} value={f.agSeg} onChange={set("agSeg")}>
            <option value="">Mismo que captó</option>
            {Object.entries(AG).map(([k,v]) => <option key={k} value={k}>{v.n}</option>)}
          </select>
        </Field>
      </div>

      {/* Bloque 2 */}
      <Section n="②" title="¿QUÉ ESTÁ BUSCANDO?" />
      <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
        <Field label="Tipo operación" half>
          <select style={inp} value={f.op} onChange={set("op")}>
            {TIPOS_OP.map(o => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Tipo propiedad" half>
          <select style={inp} value={f.tipo} onChange={set("tipo")}>
            <option value="">Sin definir</option>
            {TIPOS_PROP_LEAD.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Presupuesto USD" half>
          <input style={inp} type="number" value={f.presup} onChange={set("presup")} placeholder="ej: 85000" />
        </Field>
        <Field label="Forma de pago" half>
          <select style={inp} value={f.formaPago} onChange={set("formaPago")}>
            <option value="">Sin definir</option>
            <option>Efectivo</option>
            <option>Crédito</option>
            <option>Mixto</option>
          </select>
        </Field>
        <Field label="Zonas de interés" required>
          <input style={{ ...inp, ...has("zonas") }} value={f.zonas} onChange={set("zonas")} placeholder="ej: La Perla, Chauvin, Centro" />
          {err.zonas && <div style={{ fontSize:12, color:B.hot, marginTop:3 }}>{err.zonas}</div>}
        </Field>
        <Field label="Ambientes" half>
          <input style={inp} value={f.ambientes} onChange={set("ambientes")} placeholder="ej: 2, 3" />
        </Field>
        <Field label="Cochera" half>
          <input style={inp} value={f.cochera} onChange={set("cochera")} placeholder="Sí / No / Indistinto" />
        </Field>
        <Field label="Balcón" half>
          <input style={inp} value={f.balcon} onChange={set("balcon")} placeholder="Sí / No / Indistinto" />
        </Field>
        <Field label="Patio" half>
          <input style={inp} value={f.patio} onChange={set("patio")} placeholder="Sí / No / Indistinto" />
        </Field>
        <Field label="M² mínimos" half>
          <input type="number" style={inp} value={f.m2min} onChange={set("m2min")} placeholder="ej: 50" />
        </Field>
      </div>

      {/* Bloque 3 */}
      <Section n="③" title="NOTA Y PRÓXIMO PASO" />
      <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
        <Field label="Nota rápida">
          <textarea style={{ ...inp, resize:"none", minHeight:72 }} value={f.nota} onChange={set("nota")}
            placeholder="Ej: Viene por Instagram, busca algo cerca del mar, tiene efectivo..." />
        </Field>
        <Field label="Etapa inicial" half>
          <select style={inp} value={f.etapa} onChange={set("etapa")}>
            {ETAPAS_INIT.map(e => <option key={e}>{e}</option>)}
          </select>
        </Field>
        <Field label="Tipo de próxima acción" half>
          <select style={inp} value={f.proxaccionTipo} onChange={set("proxaccionTipo")}>
            <option value="">Sin definir</option>
            {TIPOS_PROXACCION.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Fecha próxima acción" half>
          <input
            type="date"
            style={{ ...inp, colorScheme:"dark" }}
            value={f.proxaccionFecha}
            onChange={set("proxaccionFecha")}
          />
        </Field>
        <Field label="Detalle próxima acción" half>
          <input style={inp} value={f.proxAccion} onChange={set("proxAccion")} placeholder="ej: Llamar, Buscar opciones" />
        </Field>
        <Field label="Probabilidad %" half>
          <input style={inp} type="number" min="0" max="100" value={f.prob} onChange={set("prob")} placeholder="0–100" />
        </Field>
        <Field label="Urgencia" half>
          <select style={inp} value={f.urgencia} onChange={set("urgencia")}>
            <option value="">Sin definir</option>
            <option>🔥 Alta</option>
            <option>🟡 Media</option>
            <option>⚪ Baja</option>
          </select>
        </Field>
        <Field label="Nota importante (aparece destacada)">
          <input style={inp} value={f.notaImp} onChange={set("notaImp")} placeholder="ej: CRÉDITO, cliente clave, viene con precio cerrado..." />
        </Field>
      </div>

      {/* Botones */}
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button onClick={onClose}
          style={{ flex:1, padding:"11px", borderRadius:9, background:"transparent",
            border:`1px solid ${B.border}`, color:"#8AAECC", fontSize:13, cursor:"pointer" }}>
          Cancelar
        </button>
        <button onClick={submit}
          style={{ flex:2, padding:"11px", borderRadius:9, background:B.accent,
            border:`1px solid ${B.accentL}`, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"Georgia,serif" }}>
          Guardar lead
        </button>
      </div>
    </div>
  );
}
