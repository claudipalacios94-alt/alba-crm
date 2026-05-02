// ══════════════════════════════════════════════════════════════
// ALBA CRM — PANTALLA DE LOGIN
// ══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { B } from "../data/constants.js";

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState("claudipalacios94@gmail.com");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError("Email o contraseña incorrectos");
    }
    setLoading(false);
  }

  const inp = {
    width: "100%", background: B.card, border: `1px solid ${B.border}`,
    borderRadius: 9, padding: "12px 14px", color: B.text, fontSize: 14,
    outline: "none", boxSizing: "border-box", fontFamily: "'Trebuchet MS',sans-serif",
  };

  return (
    <div style={{ height: "100vh", background: B.bg, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'Trebuchet MS',sans-serif" }}>

      <div style={{ width: 360, padding: "40px 36px", background: B.sidebar,
        border: `1px solid ${B.border}`, borderRadius: 18,
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg,#0B1E40,#1A3A7A)",
            border: `2px solid ${B.accentL}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, color: B.accentL, fontFamily: "Georgia,serif" }}>A</div>
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16,
              color: B.text, letterSpacing: "2px" }}>ALBA</div>
            <div style={{ fontSize: 10, color: B.muted, letterSpacing: "1px" }}>
              INVERSIONES INMOBILIARIAS · REG 3832
            </div>
          </div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: B.text,
          fontFamily: "Georgia,serif", marginBottom: 6 }}>Bienvenida</div>
        <div style={{ fontSize: 12, color: B.muted, marginBottom: 28 }}>
          Ingresá para acceder al panel
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, color: B.muted, letterSpacing: ".8px",
              textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={inp} placeholder="tu@email.com" />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 10, color: B.muted, letterSpacing: ".8px",
              textTransform: "uppercase", display: "block", marginBottom: 6 }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={inp} placeholder="••••••••" />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: B.hot, marginBottom: 16,
              padding: "8px 12px", background: `${B.hot}12`,
              borderRadius: 7, border: `1px solid ${B.hot}30` }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !email || !password}
            style={{ width: "100%", padding: "13px", borderRadius: 10,
              background: loading ? B.border : B.accent,
              border: `1px solid ${loading ? B.border : B.accentL}`,
              color: loading ? B.muted : "#fff",
              fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer",
              fontFamily: "Georgia,serif", transition: "all .15s" }}>
            {loading ? "Ingresando..." : "Ingresar →"}
          </button>
        </form>
      </div>
    </div>
  );
}
