// src/pages/Reportes.jsx
// Alba CRM — Módulo Reportes v1
// Analizador de oportunidad de inversión para reciclado

import { supabase } from "../hooks/useSupabase.js";
import { useState } from "react";
import { B, AG } from "../data/constants";

const ZONAS_MDP = [
  { label: "La Perla / Playa Grande", min: 1800, max: 2500 },
  { label: "Centro (Arenales/Colón)", min: 1500, max: 2200 },
  { label: "Güemes / Los Troncos",    min: 800,  max: 1400 },
  { label: "Chauvin / San José",      min: 600,  max: 1100 },
  { label: "Otra zona",               min: 800,  max: 1500 },
];

const REFACCION_NIVELES = [
  { label: "Cosmética (pintura, pisos)",        usdM2: 80  },
  { label: "Media (baño + cocina + pintura)",   usdM2: 180 },
  { label: "Integral (todo nuevo)",             usdM2: 320 },
];

const fmt = (n) =>
  n >= 1000
    ? `USD ${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
    : `USD ${Math.round(n)}`;

export default function Reportes() {
  const [form, setForm] = useState({
    direccion: "",
    zona: 0,
    tipo: "Departamento",
    ambientes: 2,
    m2: 50,
    precioCompra: "",
    refaccion: 1,
    descuento: 10,
  });

  const [resultado, setResultado] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [analisisIA, setAnalisisIA] = useState("");
  const [errorIA, setErrorIA]      = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // ── Cálculo local ─────────────────────────────────────────
  const calcular = () => {
    const zona       = ZONAS_MDP[form.zona];
    const refacNivel = REFACCION_NIVELES[form.refaccion];
    const compra     = parseFloat(form.precioCompra) || 0;
    const refacTotal = refacNivel.usdM2 * form.m2;
    const inversion  = compra + refacTotal;
    const precioMedMercado = ((zona.min + zona.max) / 2) * form.m2;
    const precioVenta = precioMedMercado * (1 - form.descuento / 100);
    const ganancia   = precioVenta - inversion;
    const retorno    = inversion > 0 ? (ganancia / inversion) * 100 : 0;
    const mesesEst   = form.refaccion === 0 ? 3 : form.refaccion === 1 ? 6 : 10;

    setResultado({
      compra, refacTotal, inversion,
      precioVenta: Math.round(precioVenta),
      ganancia: Math.round(ganancia),
      retorno: retorno.toFixed(1),
      mesesEst,
      zona: zona.label,
      refacLabel: refacNivel.label,
      viable: ganancia > 0 && retorno > 15,
    });
    setAnalisisIA("");
    setErrorIA("");
  };

  // ── Análisis IA ───────────────────────────────────────────
  const pedirIA = async () => {
    if (!resultado) return;
    setLoading(true);
    setErrorIA("");
    try {
      const prompt = `Sos un asesor inmobiliario experto en Mar del Plata, Argentina. 
Analizá esta oportunidad de inversión para reciclado y dá una opinión profesional breve (máx 5 líneas):

- Propiedad: ${form.tipo}, ${form.ambientes} amb, ${form.m2}m² en ${resultado.zona}
- Dirección: ${form.direccion || "no especificada"}
- Precio de compra: USD ${resultado.compra.toLocaleString()}
- Refacción (${resultado.refacLabel}): USD ${resultado.refacTotal.toLocaleString()}
- Inversión total: USD ${resultado.inversion.toLocaleString()}
- Precio estimado de venta post-reciclado: USD ${resultado.precioVenta.toLocaleString()}
- Ganancia estimada: USD ${resultado.ganancia.toLocaleString()} (${resultado.retorno}% retorno)
- Tiempo estimado: ${resultado.mesesEst} meses

Incluí: si el precio de compra parece bien negociado, si la zona es buena para este perfil, y un veredicto claro (recomendás o no). Usá español rioplatense, tono directo y profesional.`;

      const res = await fetch("/api/claude", {
        method: "POST",
headers: { 
  "Content-Type": "application/json",
  "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
},        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      setAnalisisIA(data.content?.[0]?.text || "Sin respuesta.");
    } catch (e) {
      setErrorIA("Error al consultar a Alba. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ── Estilos inline (sistema B del CRM) ───────────────────
  const s = {
    page: {
      padding: "24px",
      maxWidth: 700,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: B?.text || "#1a1a1a",
    },
    header: { marginBottom: 24 },
    title: { fontSize: 22, fontWeight: 600, margin: "0 0 4px", color: "#1a1a1a" },
    subtitle: { fontSize: 14, color: "#666", margin: 0 },
    card: {
      background: "#fff",
      border: "1px solid #e8e8e8",
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
    },
    sectionTitle: { fontSize: 13, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 14px" },
    row: { display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" },
    field: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 140 },
    label: { fontSize: 12, color: "#666", fontWeight: 500 },
    input: {
      padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd",
      fontSize: 14, outline: "none", background: "#fafafa",
    },
    select: {
      padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd",
      fontSize: 14, background: "#fafafa", outline: "none",
    },
    btnCalc: {
      width: "100%", padding: "12px", borderRadius: 10,
      background: "#3A8BC4", color: "#fff", border: "none",
      fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 4,
    },
    metricRow: { display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" },
    metric: (color) => ({
      flex: 1, minWidth: 120,
      background: color + "12",
      border: `1px solid ${color}30`,
      borderRadius: 10, padding: "12px 14px",
    }),
    metricLabel: { fontSize: 11, color: "#888", marginBottom: 2 },
    metricValue: (color) => ({ fontSize: 20, fontWeight: 700, color }),
    badge: (ok) => ({
      display: "inline-block", padding: "4px 12px", borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      background: ok ? "#e6f7ef" : "#fde8e8",
      color: ok ? "#1a7a4a" : "#c0392b",
      marginBottom: 12,
    }),
    iaBox: {
      background: "#f0f7ff", border: "1px solid #b3d4f5",
      borderRadius: 10, padding: 16, marginTop: 12,
      fontSize: 14, lineHeight: 1.65, color: "#1a3a55",
      whiteSpace: "pre-wrap",
    },
    btnIA: {
      padding: "10px 18px", borderRadius: 8,
      background: loading ? "#aaa" : "#1a3a55",
      color: "#fff", border: "none", fontSize: 13,
      fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
      marginTop: 8,
    },
    divider: { height: 1, background: "#f0f0f0", margin: "16px 0" },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Análisis de oportunidad</h1>
        <p style={s.subtitle}>Evaluá si una propiedad para reciclar tiene sentido financiero</p>
      </div>

      {/* ── Formulario ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Datos de la propiedad</div>

        <div style={s.row}>
          <div style={{ ...s.field, flex: 2 }}>
            <label style={s.label}>Dirección (opcional)</label>
            <input style={s.input} placeholder="Ej: Alberti 1234" value={form.direccion} onChange={e => set("direccion", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Tipo</label>
            <select style={s.select} value={form.tipo} onChange={e => set("tipo", e.target.value)}>
              {["Departamento","Casa","PH","Local"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={s.row}>
          <div style={s.field}>
            <label style={s.label}>Zona</label>
            <select style={s.select} value={form.zona} onChange={e => set("zona", parseInt(e.target.value))}>
              {ZONAS_MDP.map((z, i) => <option key={i} value={i}>{z.label}</option>)}
            </select>
          </div>
          <div style={{ ...s.field, maxWidth: 90 }}>
            <label style={s.label}>Amb.</label>
            <input style={s.input} type="number" min={1} max={6} value={form.ambientes} onChange={e => set("ambientes", parseInt(e.target.value))} />
          </div>
          <div style={{ ...s.field, maxWidth: 90 }}>
            <label style={s.label}>m²</label>
            <input style={s.input} type="number" min={20} max={500} value={form.m2} onChange={e => set("m2", parseInt(e.target.value))} />
          </div>
        </div>

        <div style={s.divider} />
        <div style={s.sectionTitle}>Números</div>

        <div style={s.row}>
          <div style={s.field}>
            <label style={s.label}>Precio de compra (USD)</label>
            <input style={s.input} type="number" placeholder="Ej: 45000" value={form.precioCompra} onChange={e => set("precioCompra", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Nivel de refacción</label>
            <select style={s.select} value={form.refaccion} onChange={e => set("refaccion", parseInt(e.target.value))}>
              {REFACCION_NIVELES.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ ...s.row, alignItems: "center" }}>
          <div style={s.field}>
            <label style={s.label}>Descuento de venta vs precio mercado: {form.descuento}%</label>
            <input type="range" min={0} max={25} step={1} value={form.descuento} onChange={e => set("descuento", parseInt(e.target.value))} style={{ width: "100%" }} />
          </div>
        </div>

        <button style={s.btnCalc} onClick={calcular}>Calcular</button>
      </div>

      {/* ── Resultado ── */}
      {resultado && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Resultado</div>
          <span style={s.badge(resultado.viable)}>
            {resultado.viable ? "✓ Oportunidad viable" : "✗ Retorno bajo — revisar precio"}
          </span>

          <div style={s.metricRow}>
            <div style={s.metric("#3A8BC4")}>
              <div style={s.metricLabel}>Inversión total</div>
              <div style={s.metricValue("#3A8BC4")}>{fmt(resultado.inversion)}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                Compra {fmt(resultado.compra)} + Refac. {fmt(resultado.refacTotal)}
              </div>
            </div>
            <div style={s.metric("#1a7a4a")}>
              <div style={s.metricLabel}>Precio venta est.</div>
              <div style={s.metricValue("#1a7a4a")}>{fmt(resultado.precioVenta)}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                Zona {resultado.zona.split(" ")[0]}
              </div>
            </div>
          </div>

          <div style={s.metricRow}>
            <div style={s.metric(resultado.ganancia > 0 ? "#1a7a4a" : "#c0392b")}>
              <div style={s.metricLabel}>Ganancia neta est.</div>
              <div style={s.metricValue(resultado.ganancia > 0 ? "#1a7a4a" : "#c0392b")}>
                {fmt(resultado.ganancia)}
              </div>
            </div>
            <div style={s.metric("#9B6DC8")}>
              <div style={s.metricLabel}>Retorno</div>
              <div style={s.metricValue("#9B6DC8")}>{resultado.retorno}%</div>
            </div>
            <div style={s.metric("#E4923A")}>
              <div style={s.metricLabel}>Tiempo est.</div>
              <div style={s.metricValue("#E4923A")}>{resultado.mesesEst} meses</div>
            </div>
          </div>

          <div style={s.divider} />

          <button style={s.btnIA} onClick={pedirIA} disabled={loading}>
            {loading ? "Consultando a Alba..." : "✦ Pedir análisis a Alba"}
          </button>

          {errorIA && <p style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{errorIA}</p>}

          {analisisIA && (
            <div style={s.iaBox}>
              <strong style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#3A8BC4" }}>
                ALBA — ANÁLISIS
              </strong>
              {analisisIA}
            </div>
          )}
        </div>
      )}
    </div>
  );
}