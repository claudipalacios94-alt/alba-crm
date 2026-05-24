// ══════════════════════════════════════════════════════════════
// ALBA CRM — MODAL CARGA RÁPIDA DE LEAD
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B, AG, ORIGENES, TIPOS_OP, TIPOS_PROP_LEAD, ETAPAS_INIT } from "../data/constants.js";

const TIPOS_PROXACCION = ["Llamar", "WhatsApp", "Email", "Visita", "Enviar opciones", "Otro"];

export default function QuickAddLead({ onClose, onAdd }) {
  const [f, setF] = useState({
    nombre:"", tel:"", origen:"Instagram", etapa:"Nuevo Contacto",
    op:"Compra", tipo:"", presup:"", zonas:"", ambientes:"",
    cochera:"", balcon:"", patio:"", m2min:"",
    nota:"", proxAccion:"", proxaccionTipo:"", proxaccionFecha:"",
    prob:"", agCapto:"", agSeg:"", notaImp:"",
  });
  const [err, setErr] = useState({});

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const inp = {
    width:"100%", background:B.bg, border:`1px solid ${B.border}`,
    borderRadius:6, padding:"6px 9px", color:B.text, fontSize:11,
    outline:"none", boxSizing:"border-box",
  };

  const label = (txt, required) => (
    <label style={{ fontSize:11, color:"#8AAECC", display:"block", marginBottom:2 }}>
      {txt}{required && <span style={{ color:"#E85D30", marginLeft:2 }}>*</span>}
    </label>
  );

  const divider = (n, txt) => (
    <div style={{ marginTop:14, marginBottom:10 }}>
      <div style={{ fontSize:10, color:B.accentL, fontWeight:700, letterSpacing:"1px" }}>{n} {txt}</div>
      <div style={{ height:1, background:B.border, marginTop:4 }} />
    </div>
  );

  function submit() {
    const e = {};
    if (!f.nombre.trim()) e.nombre = "Obligatorio";
    if (!f.zonas.trim())  e.zonas  = "Obligatorio";
    if (Object.keys(e).length) { setErr(e); return; }

    onAdd({
      nombre:          f.nombre.trim(),
      ag:              f.agSeg || f.agCapto || "",
      agCapto:         f.agCapto || "",
      etapa:           f.etapa,
      op:              f.op,
      presup:          f.presup ? Number(f.presup) : null,
      tipo:            f.tipo,
      zona:            f.zonas.trim(),
      tel:             f.tel.trim(),
      origen:          f.origen,
      nota:            f.nota,
      proxAccion:      f.proxAccion.trim() || "Calificar y contactar",
      proxaccionTipo:  f.proxaccionTipo  || null,
      proxaccionFecha: f.proxaccionFecha || null,
      prob:            f.prob ? Number(f.prob) : null,
      notaImp:         f.notaImp.trim(),
      cochera:         f.cochera || null,
      balcon:          f.balcon  || null,
      patio:           f.patio   || null,
      ambientes:       f.ambientes || null,
      m2min:           f.m2min ? Number(f.m2min) : null,
      dias:            0,
    });
  }

  const has = k => err[k] ? { borderColor:"#E85D30" } : {};
  const grid2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 };
  const grid3 = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 };

  return (
    <div style={{ paddingTop:4, display:"flex", flexDirection:"column", gap:2 }}>

      {/* ① DATOS BÁSICOS */}
      {divider("①", "DATOS BÁSICOS")}
      <div style={grid2}>
        <div>
          {label("NOMBRE", true)}
          <input style={{ ...inp, ...has("nombre") }} value={f.nombre}
            onChange={e => set("nombre", e.target.value)} placeholder="Nombre del contacto" />
          {err.nombre && <div style={{ fontSize:10, color:"#E85D30", marginTop:2 }}>{err.nombre}</div>}
        </div>
        <div>
          {label("TELÉFONO")}
          <input style={inp} value={f.tel}
            onChange={e => set("tel", e.target.value)} placeholder="223-xxx-xxxx" />
        </div>
        <div>
          {label("ORIGEN")}
          <select style={inp} value={f.origen} onChange={e => set("origen", e.target.value)}>
            {ORIGENES.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          {label("QUIÉN CAPTÓ")}
          <select style={inp} value={f.agCapto} onChange={e => set("agCapto", e.target.value)}>
            <option value="">Sin definir</option>
            {Object.entries(AG).map(([k,v]) => <option key={k} value={k}>{v.n}</option>)}
          </select>
        </div>
        <div>
          {label("SEGUIMIENTO")}
          <select style={inp} value={f.agSeg} onChange={e => set("agSeg", e.target.value)}>
            <option value="">Mismo que captó</option>
            {Object.entries(AG).map(([k,v]) => <option key={k} value={k}>{v.n}</option>)}
          </select>
        </div>
        <div>
          {label("ETAPA INICIAL")}
          <select style={inp} value={f.etapa} onChange={e => set("etapa", e.target.value)}>
            {ETAPAS_INIT.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* ② QUÉ BUSCA */}
      {divider("②", "¿QUÉ ESTÁ BUSCANDO?")}
      <div style={grid2}>
        <div>
          {label("TIPO OP.")}
          <select style={inp} value={f.op} onChange={e => set("op", e.target.value)}>
            {TIPOS_OP.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          {label("TIPO PROP.")}
          <select style={inp} value={f.tipo} onChange={e => set("tipo", e.target.value)}>
            <option value="">Sin definir</option>
            {TIPOS_PROP_LEAD.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          {label("PRESUPUESTO USD")}
          <input type="number" style={inp} value={f.presup}
            onChange={e => set("presup", e.target.value)} placeholder="ej: 85000" />
        </div>
        <div>
          {label("ZONAS DE INTERÉS", true)}
          <input style={{ ...inp, ...has("zonas") }} value={f.zonas}
            onChange={e => set("zonas", e.target.value)} placeholder="ej: La Perla, Centro" />
          {err.zonas && <div style={{ fontSize:10, color:"#E85D30", marginTop:2 }}>{err.zonas}</div>}
        </div>
      </div>

      <div style={{ ...grid3, marginTop:6 }}>
        {[
          ["COCHERA", "cochera", ["","si","no"], ["Indistinto","Sí","No"]],
          ["PATIO",   "patio",   ["","si","no"], ["Indistinto","Sí","No"]],
          ["BALCÓN",  "balcon",  ["","si","no"], ["Indistinto","Sí","No"]],
        ].map(([lbl, key, vals, labels]) => (
          <div key={key}>
            {label(lbl)}
            <select style={inp} value={f[key]||""} onChange={e => set(key, e.target.value)}>
              {vals.map((v,i) => <option key={v} value={v}>{labels[i]}</option>)}
            </select>
          </div>
        ))}
        <div>
          {label("AMBIENTES")}
          <input style={inp} value={f.ambientes}
            onChange={e => set("ambientes", e.target.value)} placeholder="ej: 2" />
        </div>
        <div>
          {label("M² MÍN.")}
          <input type="number" style={inp} value={f.m2min}
            onChange={e => set("m2min", e.target.value)} placeholder="ej: 50" />
        </div>
      </div>

      {/* ③ NOTA Y PRÓXIMO PASO */}
      {divider("③", "NOTA Y PRÓXIMO PASO")}
      <div>
        {label("NOTA")}
        <textarea value={f.nota} onChange={e => set("nota", e.target.value)}
          rows={3} style={{ ...inp, resize:"none" }}
          placeholder="Ej: viene por Instagram, busca cerca del mar, tiene efectivo..." />
      </div>

      <div style={{ ...grid2, marginTop:6 }}>
        <div>
          {label("TIPO PRÓXIMA ACCIÓN")}
          <select style={inp} value={f.proxaccionTipo} onChange={e => set("proxaccionTipo", e.target.value)}>
            <option value="">Sin definir</option>
            {TIPOS_PROXACCION.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          {label("FECHA PRÓXIMA ACCIÓN")}
          <input type="date" style={{ ...inp, colorScheme:"dark" }}
            value={f.proxaccionFecha} onChange={e => set("proxaccionFecha", e.target.value)} />
        </div>
        <div>
          {label("DETALLE PRÓXIMA ACCIÓN")}
          <input style={inp} value={f.proxAccion}
            onChange={e => set("proxAccion", e.target.value)} placeholder="ej: Llamar, Buscar opciones" />
        </div>
        <div>
          {label("PROBABILIDAD %")}
          <input type="number" min="0" max="100" style={inp} value={f.prob}
            onChange={e => set("prob", e.target.value)} placeholder="0–100" />
        </div>
      </div>

      <div style={{ marginTop:6 }}>
        {label("NOTA IMPORTANTE (aparece destacada)")}
        <input style={inp} value={f.notaImp}
          onChange={e => set("notaImp", e.target.value)}
          placeholder="ej: CRÉDITO, cliente clave, viene con precio cerrado..." />
      </div>

      {/* Botones */}
      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        <button onClick={onClose}
          style={{ flex:1, padding:"8px", borderRadius:7, cursor:"pointer",
            background:"transparent", border:`1px solid ${B.border}`,
            color:"#8AAECC", fontSize:12 }}>
          Cancelar
        </button>
        <button onClick={submit}
          style={{ flex:2, padding:"8px", borderRadius:7, cursor:"pointer",
            background:B.accent, border:`1px solid ${B.accentL}`,
            color:"#fff", fontSize:12, fontWeight:700 }}>
          ✓ Guardar lead
        </button>
      </div>
    </div>
  );
}