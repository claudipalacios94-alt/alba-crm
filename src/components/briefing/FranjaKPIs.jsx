// ══════════════════════════════════════════════════════════════
// ALBA CRM — FranjaKPIs v2
// Réplica fiel de la referencia: número grande, sparkline con
// eje Y, dots visibles, grid line, comparativa mes/semana.
// ══════════════════════════════════════════════════════════════
import React, { useMemo, useState, useEffect } from "react";

// ── Responsive ────────────────────────────────────────────────
function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w < 640 ? "mobile" : w < 1080 ? "tablet" : "desktop";
}

// ── Sparkline con eje Y y dots ────────────────────────────────
function Sparkline({ data, color, id }) {
  const max = Math.max(...(data || []), 1);
  const mid = Math.round(max / 2);

  if (!data || data.length < 2 || max === 0) {
    return (
      <div style={{ display: "flex", gap: 4, height: 68, alignItems: "center" }}>
        <div style={{ width: 22, flexShrink: 0 }} />
        <div style={{ flex: 1, height: 1, background: color + "30", borderRadius: 1 }} />
      </div>
    );
  }

  const W = 180, H = 52;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - (v / max) * (H - 4) - 2,
  ]);
  const line = pts.map((p, i) =>
    `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`
  ).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const midY  = H - (mid / max) * (H - 4) - 2;
  const gid   = `kpi2-${id}`;

  return (
    <div style={{ display: "flex", gap: 4, height: 68, alignItems: "stretch" }}>
      {/* Eje Y */}
      <div style={{
        width: 22, flexShrink: 0,
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        paddingTop: 2, paddingBottom: 2,
      }}>
        {[max, mid, 0].map(v => (
          <span key={v} style={{
            fontSize: 9, color: "#475569",
            textAlign: "right", display: "block", lineHeight: 1,
            fontFamily: "monospace",
          }}>{v}</span>
        ))}
      </div>

      {/* Gráfico */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg width="100%" height="68" viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid line en el medio */}
          <line x1="0" y1={midY} x2={W} y2={midY}
            stroke="#1E293B" strokeWidth="0.8" />

          {/* Área */}
          <path d={area} fill={`url(#${gid})`} />

          {/* Línea */}
          <path d={line} stroke={color} strokeWidth="1.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots */}
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.8"
              fill={color} stroke="#0F172A" strokeWidth="1.5" />
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────
const S = { viewBox:"0 0 24 24", fill:"none", stroke:"currentColor",
            strokeWidth:"2", strokeLinecap:"round", strokeLinejoin:"round" };

const IcoUsers    = () => <svg {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoCalendar = () => <svg {...S}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoHandshake= () => <svg {...S}><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l8.19 8.19 8.19-8.19a5.4 5.4 0 0 0 .46-7.65z"/></svg>;
const IcoHome     = () => <svg {...S}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoDollar   = () => <svg {...S}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IcoUserPlus = () => <svg {...S}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;

// ── KPI Card ──────────────────────────────────────────────────
function KPICard({ icon, color, valor, label, sub, subDir, sparkData, compPeriodo, compLabel, compDir }) {
  const subColor  = subDir === "up" ? color : subDir === "down" ? "#EF4444" : "#4B5563";
  const compColor = compDir === "up" ? "#22C55E" : compDir === "down" ? "#EF4444" : "#4B5563";

  return (
    <div style={{
      background: "#0C1527",
      border: "1px solid #1E293B",
      borderRadius: 14,
      padding: "20px 20px 16px",
      display: "flex", flexDirection: "column",
      minWidth: 0, overflow: "hidden",
    }}>
      {/* Icono */}
      <div style={{
        width: 38, height: 38, borderRadius: "50%",
        background: color + "18", border: `1px solid ${color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color, marginBottom: 16, flexShrink: 0,
      }}>
        <div style={{ width: 18, height: 18, display: "flex" }}>{icon}</div>
      </div>

      {/* Número */}
      <div style={{
        fontSize: 44, fontWeight: 800, color: "#F1F5F9",
        fontFamily: "Georgia,serif", lineHeight: 1, marginBottom: 5,
        letterSpacing: "-1px",
      }}>
        {valor}
      </div>

      {/* Label */}
      <div style={{
        fontSize: 11, fontWeight: 600, color: "#64748B",
        letterSpacing: "0.03em", marginBottom: 4,
      }}>
        {label}
      </div>

      {/* Línea secundaria */}
      <div style={{
        fontSize: 11, fontWeight: 600, color: subColor,
        marginBottom: 12, minHeight: 14,
      }}>
        {sub}
      </div>

      {/* Sparkline */}
      <div style={{ marginLeft: -2, marginRight: -2, marginBottom: 10 }}>
        <Sparkline data={sparkData} color={color} id={label.replace(/\s+/g,"_")} />
      </div>

      {/* Comparativa */}
      <div style={{
        borderTop: "1px solid #1E293B", paddingTop: 10,
        fontSize: 11, display: "flex", gap: 4, alignItems: "center",
      }}>
        <span style={{ color: "#374151" }}>vs. {compPeriodo}</span>
        <span style={{ color: compColor, fontWeight: 700 }}>{compLabel}</span>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function weeklyBuckets(items, weeks = 8, field = "created_at") {
  const now = Date.now();
  const MS  = 7 * 24 * 3600 * 1000;
  const b   = Array(weeks).fill(0);
  (items || []).forEach(x => {
    if (!x[field]) return;
    const i = Math.floor((now - new Date(x[field]).getTime()) / MS);
    if (i >= 0 && i < weeks) b[weeks - 1 - i]++;
  });
  return b;
}

function vsAnterior(items, field = "created_at") {
  const now = new Date();
  const ini    = new Date(now.getFullYear(), now.getMonth(), 1);
  const iniAnt = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const cur  = (items || []).filter(x => x[field] && new Date(x[field]) >= ini).length;
  const prev = (items || []).filter(x => {
    const d = x[field] && new Date(x[field]);
    return d && d >= iniAnt && d < ini;
  }).length;
  if (prev === 0) return { label: cur > 0 ? "primer mes" : "—", dir: "neutral" };
  if (cur === 0)  return { label: "—", dir: "neutral" };
  const p = Math.round(((cur - prev) / prev) * 100);
  return {
    label: p > 0 ? `+${p}%` : p < 0 ? `${p}%` : "0%",
    dir:   p > 0 ? "up" : p < 0 ? "down" : "neutral",
  };
}

// ── Componente principal ──────────────────────────────────────
export default function FranjaKPIs({ leads, activos, captaciones }) {
  const bp   = useBreakpoint();
  const cols = bp === "mobile" ? 2 : bp === "tablet" ? 3 : 6;

  const stats = useMemo(() => {
    const now       = new Date();
    const ini       = new Date(now.getFullYear(), now.getMonth(), 1);
    const iniSemana = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const nuevosMes = (leads || []).filter(l => l.created_at && new Date(l.created_at) >= ini).length;
    const visitasSem = activos.filter(l =>
      l.etapa === "Visita" &&
      l.last_contact_at && new Date(l.last_contact_at) >= iniSemana
    ).length;
    return {
      activos:       activos.length,
      visitas:       activos.filter(l => l.etapa === "Visita").length,
      visitasSem,
      negociaciones: activos.filter(l => l.etapa === "Negociación").length,
      captMes:       (captaciones || []).filter(c => c.created_at && new Date(c.created_at) >= ini).length,
      nuevosMes,
    };
  }, [leads, activos, captaciones]);

  const sparkLeads = useMemo(() => weeklyBuckets(leads, 8), [leads]);
  const sparkCapt  = useMemo(() => weeklyBuckets(captaciones, 8), [captaciones]);
  const flat       = v => [...Array(7).fill(v), v];

  const pLeads = useMemo(() => vsAnterior(leads), [leads]);
  const pCapt  = useMemo(() => vsAnterior(captaciones), [captaciones]);

  const kpis = [
    {
      icon: <IcoUsers />, color: "#3B82F6",
      valor: stats.activos, label: "Leads activos",
      sub:      stats.nuevosMes > 0 ? `↑ ${stats.nuevosMes} nuevos este mes` : "Sin altas este mes",
      subDir:   stats.nuevosMes > 0 ? "up" : "neutral",
      sparkData: sparkLeads,
      compPeriodo: "mes anterior", compLabel: pLeads.label, compDir: pLeads.dir,
    },
    {
      icon: <IcoCalendar />, color: "#22C55E",
      valor: stats.visitas, label: "Visitas activas",
      sub:      stats.visitasSem > 0 ? `↑ ${stats.visitasSem} esta semana` : "— sin cambios",
      subDir:   stats.visitasSem > 0 ? "up" : "neutral",
      sparkData: flat(stats.visitas),
      compPeriodo: "semana anterior", compLabel: "—", compDir: "neutral",
    },
    {
      icon: <IcoHandshake />, color: "#F97316",
      valor: stats.negociaciones, label: "Negociaciones",
      sub:      stats.negociaciones > 0 ? `↑ ${stats.negociaciones} en curso` : "— 0 sin cambios",
      subDir:   stats.negociaciones > 0 ? "up" : "neutral",
      sparkData: flat(stats.negociaciones),
      compPeriodo: "semana anterior", compLabel: "—", compDir: "neutral",
    },
    {
      icon: <IcoHome />, color: "#A855F7",
      valor: stats.captMes, label: "Captaciones",
      sub:      stats.captMes > 0 ? `↑ ${stats.captMes} este mes` : "Sin captaciones aún",
      subDir:   stats.captMes > 0 ? "up" : "neutral",
      sparkData: sparkCapt,
      compPeriodo: "mes anterior", compLabel: pCapt.label, compDir: pCapt.dir,
    },
    {
      icon: <IcoDollar />, color: "#06B6D4",
      valor: "$0", label: "Facturación mes",
      sub:      "— sin datos aún",
      subDir:   "neutral",
      sparkData: flat(0),
      compPeriodo: "mes anterior", compLabel: "—", compDir: "neutral",
    },
    {
      icon: <IcoUserPlus />, color: "#60A5FA",
      valor: stats.nuevosMes, label: "Leads nuevos",
      sub:      stats.nuevosMes > 0 ? `↑ ${stats.nuevosMes} este mes` : "Sin altas este mes",
      subDir:   stats.nuevosMes > 0 ? "up" : "neutral",
      sparkData: sparkLeads,
      compPeriodo: "mes anterior", compLabel: pLeads.label, compDir: pLeads.dir,
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 12,
    }}>
      {kpis.map(k => <KPICard key={k.label} {...k} />)}
    </div>
  );
}
