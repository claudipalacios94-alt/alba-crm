// ══════════════════════════════════════════════════════════════
// ALBA CRM — BriefingGauge + Collapsible
// Componentes visuales reutilizables del Briefing
// ══════════════════════════════════════════════════════════════
import React from "react";
import { B } from "../../data/constants.js";

export function Gauge({ value, max, label, sublabel, color, prefix = "", suffix = "" }) {
  const canvasRef = React.useRef(null);
  const pct = Math.min(value / (max || 1), 1);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.78;
    const r = W * 0.38;
    const startAngle = Math.PI * 0.85;
    const endAngle   = Math.PI * 2.15;
    const totalArc   = endAngle - startAngle;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = "#0F1E35";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.stroke();
    if (pct > 0) {
      const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      grad.addColorStop(0, color + "66");
      grad.addColorStop(1, color);
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + totalArc * pct);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    const angle = startAngle + totalArc * pct;
    const nx = cx + (r - 3) * Math.cos(angle);
    const ny = cy + (r - 3) * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(nx, ny, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#0F1E35";
    ctx.fill();
  }, [pct, color]);

  const fmt = v => {
    if (prefix === "USD") {
      if (v >= 1000000) return "USD " + (v/1000000).toFixed(1) + "M";
      if (v >= 1000)    return "USD " + (v/1000).toFixed(0) + "k";
      return "USD " + v.toLocaleString();
    }
    return prefix + v + suffix;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1, minWidth:0 }}>
      <canvas ref={canvasRef} width={120} height={80} style={{ width:100, height:68 }} />
      <div style={{ fontSize:18, fontWeight:600, color, fontFamily:"'Cormorant Garamond',Georgia,serif",
        marginTop:-8, letterSpacing:"0.5px", lineHeight:1 }}>{fmt(value)}</div>
      <div style={{ fontSize:11, color:"#A8C8E8", fontWeight:500, marginTop:4, textAlign:"center", lineHeight:1.3 }}>{label}</div>
      {sublabel && <div style={{ fontSize:12, color:"#4A6A9A", marginTop:2 }}>{sublabel}</div>}
    </div>
  );
}

export function Collapsible({ title, badge, summary, children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:10, overflow:"hidden" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px", cursor:"pointer",
          background: open ? "rgba(74,138,232,0.04)" : "transparent", transition:"background 0.2s" }}>
        <span style={{ fontSize:12, fontWeight:600, color:"#C8D8E8", letterSpacing:"0.8px", flex:1 }}>{title}</span>
        {badge > 0 && (
          <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4,
            background:"rgba(204,34,51,0.12)", color:"#CC2233", fontWeight:600 }}>{badge}</span>
        )}
        {summary && !open && <span style={{ fontSize:11, color:"#4A6A90", marginRight:6 }}>{summary}</span>}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ flexShrink:0, transition:"transform 0.25s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M4 6L8 10L12 6" stroke="#4A6A90" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && (
        <div style={{ padding:"0 18px 18px", borderTop:`1px solid ${B.border}` }}>
          <div style={{ paddingTop:16 }}>{children}</div>
        </div>
      )}
    </div>
  );
}