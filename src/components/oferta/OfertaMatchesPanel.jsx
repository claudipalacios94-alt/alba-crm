import React, { useMemo } from "react";
import { B } from "../../data/constants.js";
import { getMatchingLeads, generarMensajeLeadOferta, formatTelefonoWA } from "../../domain/oferta.js";

const ETAPA_COLOR = {
  "Negociación":   "#7c5cc4",
  "Visita":        "#d99a22",
  "Calificado":    "#3a8bc4",
  "Contacto":      B.muted,
  "Nuevo Contacto":B.dim,
};

function formatPresup(n) {
  if (!n) return "Sin presup.";
  return "USD " + Number(n).toLocaleString("es-AR");
}

export default function OfertaMatchesPanel({ item, leads, onClose }) {
  const matches = useMemo(() => getMatchingLeads(item, leads), [item, leads]);

  function abrirWALead(lead) {
    const phone = formatTelefonoWA(lead.tel);
    if (!phone) return;
    const msg = generarMensajeLeadOferta(lead, item);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function copiarMsgLead(lead) {
    const msg = generarMensajeLeadOferta(lead, item);
    navigator.clipboard.writeText(msg).catch(() => {});
  }

  const titulo = [item.tipo, item.zona].filter(Boolean).join(" · ") || "Propiedad";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.65)",
          zIndex: 1100,
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(600px, 94vw)",
        maxHeight: "80vh",
        background: B.card,
        border: `1px solid ${B.border}`,
        borderRadius: 14,
        display: "flex",
        flexDirection: "column",
        zIndex: 1101,
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${B.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: B.text }}>
              Leads compatibles
            </div>
            <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
              {titulo}
              {item.precio ? ` · USD ${Number(item.precio).toLocaleString("es-AR")}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              background: `${B.accentL}22`, color: B.accentL,
              fontSize: 12, fontWeight: 700,
              padding: "3px 10px", borderRadius: 6,
              border: `1px solid ${B.accentL}44`,
            }}>{matches.length} match{matches.length !== 1 ? "es" : ""}</span>
            <button onClick={onClose} style={{
              background: B.surface, border: `1px solid ${B.border}`,
              color: B.muted, borderRadius: 6,
              width: 28, height: 28, cursor: "pointer",
              fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        </div>

        {/* Lead list */}
        <div style={{ overflowY: "auto", flex: 1, scrollbarWidth: "thin" }}>
          {matches.length === 0 ? (
            <div style={{
              padding: "40px 24px", textAlign: "center",
              color: B.muted, fontSize: 13,
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
              <div style={{ fontWeight: 600, color: B.text, marginBottom: 4 }}>Sin matches activos</div>
              <div style={{ fontSize: 12 }}>
                No hay leads en etapa activa que coincidan con esta propiedad.
              </div>
            </div>
          ) : (
            matches.map((lead, i) => {
              const etapaColor = ETAPA_COLOR[lead.etapa] || B.dim;
              const tieneWA    = !!formatTelefonoWA(lead.tel);
              return (
                <div key={lead.id} style={{
                  padding: "12px 18px",
                  borderBottom: i < matches.length - 1 ? `1px solid ${B.surface}` : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}>
                  {/* Info lead */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: B.text }}>
                        {lead.nombre || "Sin nombre"}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        color: etapaColor,
                        background: etapaColor + "22",
                        border: `1px solid ${etapaColor}44`,
                        padding: "1px 6px", borderRadius: 4,
                      }}>{lead.etapa || "—"}</span>
                    </div>
                    <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                      {[lead.zona, lead.tipo].filter(Boolean).join(" · ") || "Sin datos"}
                    </div>
                    <div style={{ fontSize: 11, color: B.accentL, fontWeight: 600, marginTop: 1 }}>
                      {formatPresup(lead.presup)}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {tieneWA ? (
                      <button
                        onClick={() => abrirWALead(lead)}
                        title="Abrir WhatsApp con mensaje"
                        style={{
                          padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                          background: `${B.ok}18`, border: `1px solid ${B.ok}55`,
                          color: B.ok, fontSize: 11, fontWeight: 700,
                          fontFamily: "'DM Sans', sans-serif",
                        }}>💬 WA</button>
                    ) : (
                      <button
                        onClick={() => copiarMsgLead(lead)}
                        title="Copiar mensaje"
                        style={{
                          padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                          background: B.surface, border: `1px solid ${B.border}`,
                          color: B.muted, fontSize: 11, fontWeight: 600,
                          fontFamily: "'DM Sans', sans-serif",
                        }}>📋 Copiar</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 18px",
          borderTop: `1px solid ${B.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: B.dim }}>
            Solo leads activos · sin Cerrado ni Perdido
          </span>
          <button onClick={onClose} style={{
            padding: "6px 14px", borderRadius: 6, cursor: "pointer",
            background: B.surface, border: `1px solid ${B.border}`,
            color: B.muted, fontSize: 11, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
          }}>Cerrar</button>
        </div>
      </div>
    </>
  );
}
