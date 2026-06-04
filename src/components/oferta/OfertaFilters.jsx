import React from "react";
import { B } from "../../data/constants.js";

const sel = {
  background: B.surface,
  border: `1px solid ${B.border}`,
  borderRadius: 7,
  padding: "7px 10px",
  fontSize: 12,
  color: B.text,
  cursor: "pointer",
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
};

export default function OfertaFilters({ filters, onChange, mobile }) {
  return (
    <div style={{
      display: "flex",
      gap: 7,
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: 14,
    }}>
      <div style={{ position: "relative", flex: mobile ? "1 1 100%" : "0 0 200px" }}>
        <span style={{
          position: "absolute", left: 9,
          top: "50%", transform: "translateY(-50%)",
          fontSize: 12, color: B.dim, pointerEvents: "none",
        }}>🔍</span>
        <input
          placeholder="Dirección, zona, tipo..."
          value={filters.q}
          onChange={e => onChange({ ...filters, q: e.target.value })}
          style={{ ...sel, paddingLeft: 28, width: "100%" }}
        />
      </div>

      {[
        { key: "zona",   label: "Zona",   opts: ["La Perla","Macrocentro","Chauvin","Bosque Grande","San Juan","Villa Lourdes","Güemes","Centro"] },
        { key: "tipo",   label: "Tipo",   opts: ["Departamento","Casa","PH","Terreno","Local","Dúplex"] },
        { key: "fuente", label: "Fuente", opts: ["Propia","Captación","Colega","Honorarios","Alquiler"] },
      ].map(({ key, label, opts }) => (
        <select
          key={key}
          value={filters[key]}
          onChange={e => onChange({ ...filters, [key]: e.target.value })}
          style={sel}
        >
          <option value="">{label}</option>
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      ))}

      <select value={filters.match} onChange={e => onChange({ ...filters, match: e.target.value })} style={sel}>
        <option value="">Match</option>
        <option value="si">Con match</option>
        <option value="no">Sin match</option>
      </select>

      <select
        value={filters.orden}
        onChange={e => onChange({ ...filters, orden: e.target.value })}
        style={{ ...sel, marginLeft: "auto" }}
      >
        <option value="recientes">Más recientes</option>
        <option value="matches">Más matches</option>
        <option value="precio_asc">Precio ↑</option>
        <option value="precio_desc">Precio ↓</option>
      </select>
    </div>
  );
}
