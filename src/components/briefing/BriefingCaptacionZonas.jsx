// ══════════════════════════════════════════════════════════════
// ALBA CRM — BriefingCaptacionZonas
// Resumen de zona activa de la semana. Query via hook.
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B } from "../../data/constants.js";
import { useCaptacionZonaSemana } from "../../hooks/useCaptacionZonaSemana.js";

const ACCIONES = [
  { key:"contactos", dia:"Lunes",     label:"5 propietarios en ZonaProp" },
  { key:"recorrida", dia:"Miercoles", label:"Recorrida del barrio" },
  { key:"contenido", dia:"Viernes",   label:"Carrusel Instagram" },
];

export default function BriefingCaptacionZonas() {
  const { semana, loading } = useCaptacionZonaSemana();

  if (loading) return null;

  return (
    <div>
      <div style={{ fontSize:11, color:"#8AAECC", fontWeight:600, letterSpacing:"1px", marginBottom:12 }}>
        CAPTACION DE ZONAS — ESTA SEMANA
      </div>
      {!semana ? (
        <div style={{ textAlign:"center", padding:"12px 0", color:"#4A6A90", fontSize:12 }}>
          Sin barrio activo esta semana —{" "}
          <span style={{ color:B.accentL, cursor:"pointer" }}
            onClick={() => window.dispatchEvent(new CustomEvent("alba-nav", { detail:"zonas" }))}>
            Ir a Captación zonas →
          </span>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <span style={{ fontSize:16, fontWeight:700, color:B.text, fontFamily:"Georgia,serif" }}>{semana.barrio}</span>
              <span style={{ fontSize:11, color:"#8AAECC", marginLeft:8 }}>barrio activo</span>
            </div>
            <div style={{ display:"flex", gap:12 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, color:B.accentL }}>{semana.propietarios_contactados || 0}</div>
                <div style={{ fontSize:9, color:"#8AAECC" }}>contactados</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, color:"#2E9E6A" }}>{semana.propiedades_captadas || 0}</div>
                <div style={{ fontSize:9, color:"#8AAECC" }}>captadas</div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {ACCIONES.map(a => {
              const done = (semana.acciones_completadas || {})[a.key];
              return (
                <div key={a.key} style={{ flex:1, padding:"6px 8px", borderRadius:7, textAlign:"center",
                  background: done ? "rgba(46,158,106,0.1)" : "rgba(42,91,173,0.08)",
                  border:`1px solid ${done ? "#2E9E6A40" : B.border}` }}>
                  <div style={{ fontSize:11, color: done ? "#2E9E6A" : "#8AAECC", fontWeight:600 }}>
                    {done ? "Completada" : a.dia}
                  </div>
                  <div style={{ fontSize:10, color:"#6A8AAE", marginTop:2 }}>{a.label}</div>
                </div>
              );
            })}
          </div>
          {semana.nota && (
            <div style={{ fontSize:11, color:"#6A8AAE", fontStyle:"italic",
              borderLeft:`2px solid ${B.border}`, paddingLeft:8 }}>
              {semana.nota}
            </div>
          )}
        </div>
      )}
    </div>
  );
}