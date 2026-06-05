import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { B } from "../../data/constants.js";
import {
  generarMensajeOferta,
  generarMensajeContacto,
  formatTelefonoWA,
} from "../../domain/oferta.js";

// Cache en módulo para no re-fetchear entre re-renders
const ogCache = new Map();

// Misma lista que api/og.js — evita requests que van a retornar 400
const OG_ALLOWED_DOMAINS = [
  "zonaprop.com.ar",
  "argenprop.com",
  "mercadolibre.com.ar",
  "inmuebles24.com",
  "properati.com.ar",
  "navent.com",
  "remax.com.ar",
  "century21.com.ar",
];

function isOgAllowed(urlStr) {
  try {
    const host = new URL(urlStr).hostname.replace(/^www\./, "");
    return OG_ALLOWED_DOMAINS.some(d => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

function useOgImage(url) {
  const [image, setImage] = useState(() => ogCache.get(url) ?? null);

  useEffect(() => {
    if (!url) return;
    if (!isOgAllowed(url)) return;           // dominio no permitido → no hacer request
    if (ogCache.has(url)) { setImage(ogCache.get(url)); return; }

    let cancelled = false;
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then(r => r.ok ? r.json() : { image: null })
      .then(data => {
        if (cancelled) return;
        const img = data.image || null;
        ogCache.set(url, img);
        setImage(img);
      })
      .catch(() => { if (!cancelled) setImage(null); });

    return () => { cancelled = true; };
  }, [url]);

  return image;
}

const SOURCE_STYLE = {
  "Propia":     { bg: "#0d2a1a", text: "#4ade80", border: "#166534" },
  "MDL":        { bg: "#0d1535", text: "#60a5fa", border: "#1e3a6a" },
  "Colega":     { bg: "#1e1040", text: "#a78bfa", border: "#5b21b6" },
  "Captación":  { bg: "#2a1800", text: "#fb923c", border: "#92400e" },
  "Honorarios": { bg: "#2a2000", text: "#fbbf24", border: "#92400e" },
  "Alquiler":   { bg: "#0d1e40", text: "#60a5fa", border: "#1e40af" },
};

const TYPE_BG = {
  "Departamento": "linear-gradient(135deg, #0d1e3a 0%, #1a3a6a 100%)",
  "Casa":         "linear-gradient(135deg, #0d2a1a 0%, #1a4a2e 100%)",
  "PH":           "linear-gradient(135deg, #1e0d3a 0%, #3a1a6a 100%)",
  "Terreno":      "linear-gradient(135deg, #1e1400 0%, #3a2800 100%)",
  "Local":        "linear-gradient(135deg, #2a0d0d 0%, #4a1a1a 100%)",
  "Dúplex":       "linear-gradient(135deg, #0d1e2a 0%, #1a3a4a 100%)",
};

const TYPE_ICON = {
  "Departamento": "🏢", "Casa": "🏡", "PH": "🏠",
  "Terreno": "🌿", "Local": "🏪", "Dúplex": "🏘",
};

const ESTADO_BADGE = {
  "Inactiva":     { bg: "rgba(0,0,0,0.65)",    text: B.dim      },
  "Convertida":   { bg: "rgba(13,42,26,0.85)", text: "#4ade80"  },
  "Sin convertir":{ bg: "rgba(0,0,0,0.65)",    text: B.muted    },
  "Vence pronto": { bg: "rgba(180,50,50,0.8)", text: "#fca5a5"  },
  "Honorarios":   { bg: "rgba(42,32,0,0.85)",  text: "#fbbf24"  },
};

function formatPrecio(n) {
  if (!n) return "A consultar";
  return "USD " + Number(n).toLocaleString("es-AR");
}

const btnBase = {
  padding: "3px 8px", borderRadius: 5,
  border: `1px solid ${B.border}`, background: B.surface, color: B.muted,
  fontSize: 10, fontWeight: 600, cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
};

const MAX_CARACTS = 3;

export default function OfertaCard({ item, onVerMatches, onAnadir }) {
  const navigate = useNavigate();
  const [copied, setCopied]           = useState(false);
  const [copiedContact, setCopiedContact] = useState(false);

  // OG image solo para captaciones con URL de portal
  const portalUrl = item.source === "captacion" ? (item.raw?.url || null) : null;
  const ogImage   = useOgImage(portalUrl);

  // Thumbnail final: foto de property > og:image de portal > null (emoji)
  const thumbnail = item.foto || ogImage;

  const esMDL       = item.source === "mdl";
  const src         = SOURCE_STYLE[item.origen] || SOURCE_STYLE["Captación"];
  const estadoBadge = ESTADO_BADGE[item.estado];
  const esConvertible = item.source === "captacion" && !item.raw?.convertida;
  const contactoTel   = item.raw?.telefono || item.raw?.tel || null;
  const tieneWA       = !!formatTelefonoWA(contactoTel);
  const tieneContacto = !!item.contacto;

  // ── 1. WhatsApp / Copiar oferta ───────────────────────────
  function accionWA() {
    const msg = generarMensajeOferta(item);
    if (tieneWA) {
      // Enviar oferta al contacto de la captación
      const phone = formatTelefonoWA(contactoTel);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      // Copiar al portapapeles para pegar en grupo/lead
      navigator.clipboard.writeText(msg).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ── 3. Contactar colega/propietario ───────────────────────
  function accionContactar() {
    const phone = formatTelefonoWA(contactoTel);
    const msg   = generarMensajeContacto(item);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      navigator.clipboard.writeText(msg).catch(() => {});
      setCopiedContact(true);
      setTimeout(() => setCopiedContact(false), 2000);
    }
  }

  // ── 4. Abrir mapa ─────────────────────────────────────────
  function accionMapa() {
    const url = item.lat && item.lng
      ? `https://www.google.com/maps?q=${item.lat},${item.lng}`
      : `https://www.google.com/maps/search/${encodeURIComponent(
          [item.direccion, item.zona, "Mar del Plata Argentina"].filter(Boolean).join(" ")
        )}`;
    window.open(url, "_blank");
  }

  // ── 5. Editar — navegar al módulo original ────────────────
  function accionEditar() {
    if (item.source === "property")  navigate("/propiedades");
    else if (item.source === "captacion") navigate("/captaciones");
    else navigate("/alquileres");
  }

  // Características en una línea
  const chars = [
    item.ambientes ? `${item.ambientes} amb` : null,
    item.m2tot     ? `${item.m2tot} m²`      : null,
    ...(item.caracts || []).slice(0, MAX_CARACTS),
  ].filter(Boolean).join(" · ");

  const extraCaracts = (item.caracts || []).length > MAX_CARACTS
    ? `+${item.caracts.length - MAX_CARACTS}` : null;

  // Label dinámico del botón WA según situación
  const labelWA = copied ? "✓ Copiado" : tieneWA ? "💬 Abrir WA" : "💬 Copiar";

  return (
    <div style={{
      background: B.card,
      border: `1px solid ${item.matches > 5 ? B.accentL + "55" : B.border}`,
      borderRadius: 10, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* FOTO */}
      <div style={{
        height: 110,
        background: TYPE_BG[item.tipo] || "linear-gradient(135deg, #0d1e3a 0%, #1a3a6a 100%)",
        position: "relative", display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
        overflow: "hidden",
      }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={item.direccion || item.tipo}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.target.style.display = "none"; }}
          />
        ) : (
          <span style={{ fontSize: 28, opacity: 0.55 }}>
            {TYPE_ICON[item.tipo] || "🏠"}
          </span>
        )}

        <div style={{
          position: "absolute", top: 6, left: 6,
          background: src.bg, color: src.text,
          fontSize: 8, fontWeight: 700,
          padding: "2px 6px", borderRadius: 4,
          border: `1px solid ${src.border}`, letterSpacing: "0.3px",
        }}>{(item.origen || "—").toUpperCase()}</div>

        {item.matches > 0 && (
          <div style={{
            position: "absolute", top: 6, right: 6,
            background: `${B.accentL}22`, color: B.accentL,
            fontSize: 9, fontWeight: 700,
            padding: "2px 6px", borderRadius: 4,
            border: `1px solid ${B.accentL}55`,
          }}>{item.matches} match{item.matches > 1 ? "es" : ""}</div>
        )}

        {estadoBadge && (
          <div style={{
            position: "absolute", bottom: 6, left: 6,
            background: estadoBadge.bg, color: estadoBadge.text,
            fontSize: 8, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
          }}>{item.estado}</div>
        )}
      </div>

      {/* BODY */}
      <div style={{ padding: "9px 11px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>

        <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
          {item.tipo
            ? <span style={{ fontSize: 11, fontWeight: 700, color: B.text }}>{item.tipo}</span>
            : <span style={{ fontSize: 11, fontWeight: 600, color: B.dim }}>Sin tipo</span>}
          {item.zona && <span style={{ fontSize: 10, color: B.muted }}>· {item.zona}</span>}
        </div>

        {item.direccion && (
          <div style={{ fontSize: 10, color: B.dim, lineHeight: 1.2 }}>{item.direccion}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{
            fontSize: item.precio ? 17 : 12,
            fontWeight: item.precio ? 800 : 500,
            color: item.precio ? B.accentL : B.dim, lineHeight: 1,
          }}>{formatPrecio(item.precio)}</div>
          {item.raw?.precio_original && item.precio &&
           Number(item.raw.precio_original) > Number(item.precio) && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, color: B.dim, textDecoration: "line-through" }}>
                USD {Number(item.raw.precio_original).toLocaleString("es-AR")}
              </span>
              <span style={{
                fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                background: "rgba(255,107,53,0.2)", color: "#FF6B35",
                border: "1px solid rgba(255,107,53,0.4)",
              }}>↓ RETASADO</span>
            </div>
          )}
        </div>

        {chars && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              fontSize: 9, color: B.dim,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
            }}>{chars}</div>
            {extraCaracts && (
              <span style={{
                fontSize: 8, color: B.dim, background: B.surface,
                border: `1px solid ${B.border}`, borderRadius: 3, padding: "1px 4px", flexShrink: 0,
              }}>{extraCaracts}</span>
            )}
          </div>
        )}

        {tieneContacto && (
          <div style={{
            fontSize: 9, color: B.dim,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>📞 {item.contacto}</div>
        )}

        {/* ACTIONS */}
        <div style={{
          display: "flex", gap: 4, marginTop: 2,
          paddingTop: 7, borderTop: `1px solid ${B.border}`, flexWrap: "wrap",
        }}>
          {esMDL ? (
            // ── MDL: Añadir · Copiar · Web · Mapa ────────
            <>
              <button
                onClick={() => onAnadir && onAnadir(item)}
                style={{ ...btnBase, background: "#0d2a1a", color: "#4ade80", border: "1px solid #166534", fontWeight: 700 }}>
                + Añadir
              </button>
              <button onClick={accionWA} style={{
                ...btnBase,
                background: copied ? "#0d2a1a" : B.surface,
                color: copied ? "#4ade80" : B.muted,
              }}>{copied ? "✓ Copiado" : "💬 Copiar"}</button>
              {item.web_url && (
                <button
                  onClick={() => window.open(item.web_url, "_blank")}
                  title="Ver en albapropiedades.com"
                  style={{ ...btnBase, color: B.accentL, border: `1px solid ${B.accentL}44` }}>
                  🌐 Web
                </button>
              )}
              <button onClick={accionMapa} title="Ver en Google Maps" style={btnBase}>🗺</button>
            </>
          ) : (
            // ── CRM: botones existentes (sin cambios) ─────
            <>
              {/* 1. WhatsApp / Copiar */}
              <button onClick={accionWA} style={{
                ...btnBase,
                background: copied ? "#0d2a1a" : B.surface,
                color: copied ? "#4ade80" : B.ok,
                border: `1px solid ${copied ? "#166534" : B.ok + "55"}`,
              }}>{labelWA}</button>

              {/* 2. Ver matches */}
              <button
                onClick={() => onVerMatches && onVerMatches(item)}
                disabled={item.matches === 0}
                style={{
                  ...btnBase,
                  color: item.matches > 0 ? B.accentL : B.dim,
                  border: `1px solid ${item.matches > 0 ? B.accentL + "44" : B.border}`,
                  cursor: item.matches > 0 ? "pointer" : "default",
                  opacity: item.matches > 0 ? 1 : 0.45,
                }}>🎯 {item.matches}</button>

              {/* 4. Mapa */}
              <button onClick={accionMapa} title="Ver en Google Maps" style={btnBase}>🗺</button>

              {/* 5. Editar — navega al módulo original */}
              <button onClick={accionEditar} title="Editar en módulo original" style={btnBase}>✏️</button>

              {/* Convertir (solo captaciones sin convertir) */}
              {esConvertible && (
                <button
                  onClick={() => navigate("/captaciones")}
                  title="Convertir en propiedad"
                  style={{ ...btnBase, color: "#fb923c", border: "1px solid #92400e" }}>⚡</button>
              )}

              {/* 3. Contactar colega/propietario */}
              {tieneContacto && (
                <button
                  onClick={accionContactar}
                  title={copiedContact ? "Mensaje copiado" : tieneWA ? "Abrir WhatsApp" : "Copiar mensaje"}
                  style={{
                    ...btnBase,
                    color: copiedContact ? "#4ade80" : "#a78bfa",
                    border: `1px solid ${copiedContact ? "#166634" : "#5b21b655"}`,
                  }}>
                  {copiedContact ? "✓" : "📞"}
                </button>
              )}

              {/* Ver en web / portal */}
              {(item.web_url || item.raw?.url) && (
                <button
                  onClick={() => window.open(item.web_url || item.raw.url, "_blank")}
                  title={item.web_url ? "Ver en albapropiedades.com" : "Ver publicación en portal"}
                  style={{ ...btnBase, color: B.accentL, border: `1px solid ${B.accentL}44` }}>
                  {item.web_url ? "🌐 Web" : "🔗 Portal"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
