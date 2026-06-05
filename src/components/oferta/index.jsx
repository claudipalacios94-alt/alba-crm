import React, { useState, useMemo, useEffect } from "react";
import { B } from "../../data/constants.js";
import {
  filterOfertaItems,
  sortOfertaItems,
  getOfertaActionItems,
} from "../../domain/oferta.js";
import OfertaKPIs       from "./OfertaKPIs.jsx";
import OfertaTabs       from "./OfertaTabs.jsx";
import OfertaFilters    from "./OfertaFilters.jsx";
import OfertaCard       from "./OfertaCard.jsx";
import OfertaMapPreview   from "./OfertaMapPreview.jsx";
import OfertaRecentList   from "./OfertaRecentList.jsx";
import OfertaMatchesPanel from "./OfertaMatchesPanel.jsx";

function useIsMobile(bp = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w < bp;
}

const URGENCIA_COLOR = {
  alta:  { dot: B.hot,     border: B.hot  + "55" },
  media: { dot: "#f97316", border: "#f9731655"    },
};

function actionBtn(variant) {
  const primary = variant === "primary";
  return {
    padding: "7px 14px",
    borderRadius: 7,
    border: primary ? "none" : `1px solid ${B.border}`,
    background: primary ? B.accent : B.surface,
    color: primary ? "#fff" : B.muted,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
  };
}

// ── Loading skeleton ──────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          background: B.card, border: `1px solid ${B.border}`,
          borderRadius: 10, height: 80,
          animation: "pulse 1.5s ease-in-out infinite",
          opacity: 0.5,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.35} 50%{opacity:.6} }`}</style>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ tab }) {
  const msgs = {
    alquileres: { icon: "🏘", title: "Alquileres próximamente", sub: "Este tab se conectará en la siguiente fase." },
    default:    { icon: "📦", title: "Sin resultados",          sub: "Cambiá los filtros o agregá propiedades y captaciones." },
  };
  const m = msgs[tab] || msgs.default;
  return (
    <div style={{
      background: B.card, border: `1px solid ${B.border}`, borderRadius: 10,
      padding: "36px 24px", textAlign: "center",
    }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>{m.icon}</div>
      <div style={{ fontWeight: 700, color: B.text, fontSize: 14, marginBottom: 4 }}>{m.title}</div>
      <div style={{ fontSize: 12, color: B.muted }}>{m.sub}</div>
    </div>
  );
}

// ── Bloque de inventario ──────────────────────────────────────
const MAX_VISIBLE = 6;

function InventarioBlock({ titulo, items = [], loading = false, onVerMatches, onAnadir, onVerTodas, mobile }) {
  const [expandido, setExpandido] = useState(false);
  const visible = expandido ? items : items.slice(0, MAX_VISIBLE);
  const hayMas  = items.length > MAX_VISIBLE;

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <h2 style={{ margin:0, fontSize:13, fontWeight:700, color:B.text, fontFamily:"'DM Sans', sans-serif" }}>
          {titulo}
        </h2>
        {!loading && (
          <span style={{ background:`${B.accentL}22`, color:B.accentL, fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:4 }}>
            {items.length}
          </span>
        )}
        {onVerTodas && !loading && items.length > 0 && (
          <button onClick={onVerTodas} style={{
            marginLeft:"auto", padding:"3px 9px", borderRadius:5,
            border:`1px solid ${B.border}`, background:"transparent",
            color:B.dim, fontSize:10, cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
          }}>Ver todas →</button>
        )}
      </div>
      {loading ? <LoadingState /> : items.length === 0 ? (
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:10, padding:"16px 20px", color:B.dim, fontSize:11, textAlign:"center" }}>
          Sin disponibles
        </div>
      ) : (
        <>
          <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, minmax(0,1fr))", gap:10 }}>
            {visible.map(item => (
              <OfertaCard key={item.id} item={item} onVerMatches={onVerMatches} onAnadir={onAnadir} />
            ))}
          </div>
          {hayMas && !expandido && (
            <button onClick={() => setExpandido(true)} style={{
              marginTop:8, padding:"5px 12px", borderRadius:6,
              border:`1px solid ${B.border}`, background:"transparent",
              color:B.dim, fontSize:10, cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
            }}>Ver {items.length - MAX_VISIBLE} más</button>
          )}
        </>
      )}
    </div>
  );
}

// ── Módulo principal ──────────────────────────────────────────
export default function OfertaModule({
  items        = [],
  kpis         = {},
  tabCounts    = {},
  loading      = false,
  leads        = [],
  mdlItems     = [],
  mdlLoading   = false,
  onAddMdlItem = null,
}) {
  const mobile = useIsMobile();
  const [tab, setTab]               = useState("todo");
  const [filters, setFilters]       = useState({ q: "", zona: "", tipo: "", fuente: "", match: "", orden: "recientes" });
  const [panelItem, setPanelItem]   = useState(null);

  const filtered = useMemo(() => {
    const byTab = filterOfertaItems(items, tab, filters);
    return sortOfertaItems(byTab, filters.orden);
  }, [items, tab, filters]);

  const paraTrabajar = useMemo(() => getOfertaActionItems(items), [items]);

  // Items para los 3 bloques (tab="todo")
  const albaPropItems = useMemo(
    () => items.filter(i => i.source === "property" && i.estado !== "Inactiva"),
    [items]
  );
  const captacionItems = useMemo(
    () => items.filter(i => i.source === "captacion" && i.estado !== "Convertida" && i.estado !== "Inactiva"),
    [items]
  );

  const showSidePanel = !mobile && tab !== "mapa" && tab !== "zonas";
  const isSpecialTab  = tab === "mapa" || tab === "zonas";
  const cardCols      = showSidePanel ? "repeat(2, minmax(0,1fr))" : "repeat(3, minmax(0,1fr))";

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: B.text }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: 12, marginBottom: 16, flexWrap: mobile ? "wrap" : "nowrap",
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: mobile ? 20 : 24, fontWeight: 800,
            color: B.text, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.1,
          }}>Oferta</h1>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: B.muted }}>
            Propiedades, captaciones y oportunidades para trabajar hoy.
          </p>
        </div>

        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
          {/* Comisión mock — placeholder visual */}
          <div style={{
            background: `${B.ok}14`, border: `1px solid ${B.ok}44`,
            borderRadius: 7, padding: "5px 12px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 8, color: B.ok, fontWeight: 700, letterSpacing: "0.8px" }}>CIERRES MES</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: B.ok, lineHeight: 1 }}>USD 6.300</div>
            </div>
            <div style={{ width: 1, height: 28, background: `${B.ok}33` }} />
            <div>
              <div style={{ fontSize: 8, color: B.dim, fontWeight: 600, letterSpacing: "0.5px" }}>COMISIÓN EST.</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: B.muted, lineHeight: 1 }}>USD —</div>
            </div>
          </div>

          <button style={actionBtn("primary")}>⚡ Captación rápida</button>
          <button style={actionBtn()}>🏠 Propiedad</button>
          {!mobile && <button style={actionBtn()}>🎨 Flyer</button>}
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────── */}
      <OfertaKPIs mobile={mobile} kpis={kpis} />

      {/* ── TABS ────────────────────────────────────────────── */}
      <OfertaTabs activeTab={tab} onTab={setTab} mobile={mobile} counts={tabCounts} />

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      {isSpecialTab ? (
        tab === "mapa" ? <MapaView /> : <ZonasView />
      ) : (
        <>
          {/* ── PARA TRABAJAR HOY ──────────────────────────── */}
          {(paraTrabajar.length > 0 || loading) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <h2 style={{
                  margin: 0, fontSize: 13, fontWeight: 700,
                  color: B.text, fontFamily: "'DM Sans', sans-serif",
                }}>Para trabajar hoy</h2>
                {!loading && (
                  <span style={{
                    background: `${B.hot}22`, color: B.hot,
                    fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                  }}>{paraTrabajar.length}</span>
                )}
              </div>

              {loading ? <LoadingState /> : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: mobile ? "1fr" : "repeat(3, minmax(0,1fr))",
                  gap: 10,
                }}>
                  {paraTrabajar.map(item => {
                    const uc = URGENCIA_COLOR[item.urgencia] || URGENCIA_COLOR.media;
                    return (
                      <div key={item.id} style={{
                        background: B.card,
                        border: `1px solid ${uc.border}`,
                        borderLeft: `3px solid ${uc.dot}`,
                        borderRadius: 10, padding: "12px 14px",
                        display: "flex", flexDirection: "column", gap: 6,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: uc.dot, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: B.text }}>
                            {item.tipo} · {item.zona}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: B.dim }}>
                          {item.direccion}
                          {item.precio ? ` · USD ${item.precio.toLocaleString("es-AR")}` : ""}
                        </div>
                        <div style={{ fontSize: 10, color: B.muted, lineHeight: 1.3 }}>
                          {item.motivo}
                        </div>
                        <button style={{
                          marginTop: 2, padding: "5px 10px", borderRadius: 6,
                          background: `${uc.dot}18`, border: `1px solid ${uc.border}`,
                          color: uc.dot, fontSize: 10, fontWeight: 700, cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif", textAlign: "left",
                        }}>
                          {item.accion}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SEPARADOR ──────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: B.border }} />
            <span style={{ fontSize: 10, color: B.dim, fontWeight: 600, whiteSpace: "nowrap" }}>
              {loading ? "Cargando inventario..." : tab === "todo"
                ? "Inventario disponible"
                : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
            </span>
            <div style={{ flex: 1, height: 1, background: B.border }} />
          </div>

          {tab === "todo" ? (
            // ── VISTA 3 BLOQUES ───────────────────────────
            <>
              <InventarioBlock
                titulo="🏠 Propiedades Alba disponibles"
                items={albaPropItems}
                loading={loading}
                onVerMatches={setPanelItem}
                onVerTodas={() => setTab("propiedades")}
                mobile={mobile}
              />
              <InventarioBlock
                titulo="🔍 Captaciones activas"
                items={captacionItems}
                loading={loading}
                onVerMatches={setPanelItem}
                onVerTodas={() => setTab("captaciones")}
                mobile={mobile}
              />
              <InventarioBlock
                titulo="📡 Disponibles en MDL sin añadir"
                items={mdlItems}
                loading={mdlLoading}
                onAnadir={onAddMdlItem}
                mobile={mobile}
              />
            </>
          ) : (
            // ── VISTA FILTRADA (tabs específicos) ─────────
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <OfertaFilters filters={filters} onChange={setFilters} mobile={mobile} />

                {loading ? <LoadingState /> : filtered.length === 0 ? (
                  <EmptyState tab={tab} />
                ) : (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: mobile ? "1fr" : cardCols,
                    gap: 10,
                  }}>
                    {filtered.map(item => (
                      <OfertaCard
                        key={item.id}
                        item={item}
                        onVerMatches={setPanelItem}
                      />
                    ))}
                  </div>
                )}
              </div>

              {showSidePanel && (
                <div style={{ width: 260, flexShrink: 0 }}>
                  <OfertaMapPreview />
                  <OfertaRecentList />
                </div>
              )}
            </div>
          )}
        </>
      )}
      {/* ── PANEL MATCHES ─────────────────────────────────── */}
      {panelItem && (
        <OfertaMatchesPanel
          item={panelItem}
          leads={leads}
          onClose={() => setPanelItem(null)}
        />
      )}
    </div>
  );
}

// ── Vistas especiales ─────────────────────────────────────────

function MapaView() {
  return (
    <div style={{
      background: B.card, border: `1px solid ${B.border}`, borderRadius: 12,
      padding: 32, textAlign: "center", minHeight: 400,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 10,
    }}>
      <span style={{ fontSize: 48 }}>🗺</span>
      <div style={{ fontWeight: 700, color: B.text, fontSize: 15 }}>Vista Mapa</div>
      <div style={{ fontSize: 12, maxWidth: 360, color: B.muted }}>
        Se integrará Leaflet con toda la oferta pintada por zona, tipo y demanda.
      </div>
      <div style={{
        fontSize: 10, color: B.dim,
        background: B.surface, padding: "4px 12px",
        borderRadius: 6, border: `1px solid ${B.border}`,
      }}>Próxima fase</div>
    </div>
  );
}

function ZonasView() {
  const zonas = [
    { zona: "La Perla",      demanda: 12, oferta: 8,  delta: +4, nivel: "caliente"   },
    { zona: "Güemes",        demanda:  9, oferta: 6,  delta: +3, nivel: "caliente"   },
    { zona: "Bosque Grande", demanda:  7, oferta: 3,  delta: +4, nivel: "caliente"   },
    { zona: "Centro",        demanda:  8, oferta: 12, delta: -4, nivel: "saturado"   },
    { zona: "Chauvin",       demanda:  5, oferta: 4,  delta: +1, nivel: "equilibrio" },
    { zona: "San Juan",      demanda:  4, oferta: 3,  delta: +1, nivel: "equilibrio" },
  ];
  const NIVEL = {
    caliente:   { bg: `${B.hot}18`,      text: B.hot },
    saturado:   { bg: `${B.accentL}18`,  text: B.accentL },
    equilibrio: { bg: `${B.ok}18`,       text: B.ok },
  };
  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 11, color: B.dim }}>
        Demanda vs. oferta por zona · datos de ejemplo — próxima fase: conectar real
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
        {zonas.map(z => {
          const nc = NIVEL[z.nivel];
          return (
            <div key={z.zona} style={{
              background: B.card, border: `1px solid ${B.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: B.text }}>{z.zona}</span>
                <span style={{ fontSize: 8, fontWeight: 700, background: nc.bg, color: nc.text, padding: "2px 7px", borderRadius: 4, textTransform: "uppercase" }}>
                  {z.nivel}
                </span>
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: B.hot }}>{z.demanda}</div>
                  <div style={{ fontSize: 8, color: B.dim }}>demanda</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: B.accentL }}>{z.oferta}</div>
                  <div style={{ fontSize: 8, color: B.dim }}>oferta</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: z.delta > 0 ? B.hot : B.accentL }}>
                    {z.delta > 0 ? "+" : ""}{z.delta}
                  </div>
                  <div style={{ fontSize: 8, color: B.dim }}>brecha</div>
                </div>
              </div>
              {z.nivel === "caliente" && (
                <button style={{
                  marginTop: 10, width: "100%", padding: "5px", borderRadius: 6,
                  background: `${B.hot}18`, border: `1px solid ${B.hot}44`,
                  color: B.hot, fontSize: 10, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>→ Captar aquí</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
