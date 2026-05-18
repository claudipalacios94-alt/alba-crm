// ══════════════════════════════════════════════════════════════
// ALBA CRM — LeadForm
// Formulario de edición inline de los datos de un lead
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B } from "../../data/constants.js";

const TIPOS_OP   = ["Compra","Alquiler","Inversión","Alquiler / Compra"];
const TIPOS_PROP = ["Depto","Casa","PH","Casa / PH","Dúplex","Local","Terreno","Otro"];

export default function LeadForm({ lead, onGuardar, onCancelar, mobile }) {
  const [data,   setData]   = useState({
    nombre: lead.nombre || "", tel: lead.tel || "", zona: lead.zona || "",
    presup: lead.presup || "", tipo: lead.tipo || "", op: lead.op || "",
    origen: lead.origen || "", proxAccion: lead.proxAccion || "", nota: lead.nota || "",
    cochera: lead.cochera || "", patio: lead.patio || "", credito: lead.credito || "",
    balcon: lead.balcon || "", ambientes: lead.ambientes || "", m2min: lead.m2min || "",
  });
  const [saving, setSaving] = useState(false);

  const inp = {
    width:"100%", background:B.bg, border:`1px solid ${B.border}`,
    borderRadius:6, padding: mobile ? "8px 10px" : "6px 9px",
    color:B.text, fontSize: mobile ? 13 : 11,
    outline:"none", boxSizing:"border-box",
  };

  async function guardar() {
    setSaving(true);
    await onGuardar(lead.id, {
      nombre: data.nombre, tel: data.tel, zona: data.zona,
      presup: data.presup ? Number(data.presup) : null,
      tipo: data.tipo, op: data.op, origen: data.origen,
      proxaccion: data.proxAccion, nota: data.nota,
      cochera: data.cochera || null, patio: data.patio || null,
      credito: data.credito || null, balcon: data.balcon || null,
      ambientes: data.ambientes || null,
      m2min: data.m2min ? Number(data.m2min) : null,
    });
    setSaving(false);
  }

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));

  return (
    <div style={{ paddingTop:12, display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ fontSize:11, fontWeight:700, color:B.accentL }}>✏️ Editando</div>

      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap:8 }}>
        {[
          ["NOMBRE",          "nombre",     "text"],
          ["TELÉFONO",        "tel",        "text"],
          ["ZONA",            "zona",       "text"],
          ["PRESUPUESTO USD", "presup",     "number"],
          ["ORIGEN",          "origen",     "text"],
          ["PRÓXIMA ACCIÓN",  "proxAccion", "text"],
        ].map(([label, key, type]) => (
          <div key={key}>
            <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>{label}</label>
            <input type={type} value={data[key]}
              onChange={e => set(key, e.target.value)} style={inp} />
          </div>
        ))}
        <div>
          <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>TIPO OP.</label>
          <select value={data.op} onChange={e => set("op", e.target.value)} style={inp}>
            {TIPOS_OP.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>TIPO PROP.</label>
          <select value={data.tipo} onChange={e => set("tipo", e.target.value)} style={inp}>
            {TIPOS_PROP.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>NOTA</label>
        <textarea value={data.nota} onChange={e => set("nota", e.target.value)}
          rows={3} style={{ ...inp, resize:"none" }} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap:6 }}>
        {[
          ["COCHERA", "cochera", ["","si","no"], ["Indistinto","Sí","No"]],
          ["PATIO",   "patio",   ["","si","no"], ["Indistinto","Sí","No"]],
          ["CRÉDITO", "credito", ["","si","no"], ["Sin info","Aprobado","No tiene"]],
          ["BALCÓN",  "balcon",  ["","si","no"], ["Indistinto","Sí","No"]],
        ].map(([label, key, vals, labels]) => (
          <div key={key}>
            <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>{label}</label>
            <select value={data[key]||""} onChange={e => set(key, e.target.value)} style={inp}>
              {vals.map((v,i) => <option key={v} value={v}>{labels[i]}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>AMBIENTES</label>
          <input value={data.ambientes||""} onChange={e => set("ambientes", e.target.value)}
            style={inp} placeholder="ej: 2" />
        </div>
        <div>
          <label style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", display:"block", marginBottom:2 }}>M² MÍN.</label>
          <input type="number" value={data.m2min||""} onChange={e => set("m2min", e.target.value)}
            style={inp} placeholder="ej: 50" />
        </div>
      </div>

      <div style={{ display:"flex", gap: mobile ? 10 : 8 }}>
        <button onClick={guardar} disabled={saving}
          style={{ flex:1, padding: mobile ? "10px" : "8px", borderRadius:7, cursor:"pointer",
            background: saving ? B.border : B.accent,
            border:`1px solid ${saving ? B.border : B.accentL}`,
            color: saving ? B.muted : "#fff", fontSize: mobile ? 13 : 12, fontWeight:700 }}>
          {saving ? "Guardando..." : "✓ Guardar"}
        </button>
        <button onClick={onCancelar}
          style={{ padding: mobile ? "10px 16px" : "8px 14px", borderRadius:7, cursor:"pointer",
            background:"transparent", border:`1px solid ${B.border}`, color:"#8AAECC", fontSize: mobile ? 13 : 12 }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}