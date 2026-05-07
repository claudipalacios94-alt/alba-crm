import React, { useState } from "react";

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

  return (
    <div style={{ height:"100vh", background:"#F7F5F0", display:"flex",
      fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        .login-input:focus { border-color: #C4963A !important; outline: none; box-shadow: 0 0 0 3px rgba(196,150,58,0.1); }
        .login-input { transition: border-color .2s, box-shadow .2s; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Panel izquierdo — dark con branding */}
      <div style={{ width:"42%", background:"#1A1714", display:"flex", flexDirection:"column",
        justifyContent:"space-between", padding:"48px 52px", position:"relative", overflow:"hidden" }}>

        {/* Franja dorada */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
          background:"linear-gradient(90deg,#C4963A,#E8C87A,#C4963A)" }} />

        {/* Decoración geométrica */}
        <div style={{ position:"absolute", bottom:-60, right:-60, width:220, height:220,
          borderRadius:"50%", border:"1px solid rgba(196,150,58,0.12)" }} />
        <div style={{ position:"absolute", bottom:-20, right:-20, width:130, height:130,
          borderRadius:"50%", border:"1px solid rgba(196,150,58,0.08)" }} />

        {/* Logo */}
        <div style={{ animation:"fadeUp .6s ease" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:48 }}>
            <div style={{ width:44, height:44, borderRadius:10,
              background:"linear-gradient(135deg,#C4963A,#8A6520)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, fontWeight:700, color:"#FFF8ED",
              fontFamily:"'Cormorant Garamond',serif" }}>A</div>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700,
                fontSize:20, color:"#F5EDD8", letterSpacing:"4px" }}>ALBA</div>
              <div style={{ fontSize:8, color:"#5A4E3A", letterSpacing:"2px", fontWeight:500 }}>
                INVERSIONES INMOBILIARIAS
              </div>
            </div>
          </div>

          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36,
            fontWeight:600, color:"#F5EDD8", lineHeight:1.2, marginBottom:16 }}>
            Tu negocio,<br/>organizado.
          </div>
          <div style={{ fontSize:13, color:"#5A4E3A", lineHeight:1.7, maxWidth:280 }}>
            Panel de gestión para Alba Inversiones. Leads, propiedades y seguimiento en un solo lugar.
          </div>
        </div>

        {/* Footer branding */}
        <div style={{ fontSize:10, color:"#3A3028", letterSpacing:"1px" }}>
          REG 3832 · MAR DEL PLATA
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"48px", background:"#F7F5F0" }}>

        <div style={{ width:"100%", maxWidth:380, animation:"fadeUp .7s ease" }}>

          <div style={{ marginBottom:36 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28,
              fontWeight:600, color:"#1A1714", marginBottom:6 }}>Bienvenida</div>
            <div style={{ fontSize:13, color:"#8A7F72" }}>Ingresá para acceder al panel</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:10, color:"#8A7F72", letterSpacing:"1.2px",
                textTransform:"uppercase", display:"block", marginBottom:7, fontWeight:500 }}>
                Email
              </label>
              <input className="login-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width:"100%", background:"#FFFFFF", border:"1.5px solid #E8E3DA",
                  borderRadius:10, padding:"13px 16px", color:"#1A1714", fontSize:14,
                  fontFamily:"'DM Sans',sans-serif" }}
                placeholder="tu@email.com" />
            </div>

            <div style={{ marginBottom:28 }}>
              <label style={{ fontSize:10, color:"#8A7F72", letterSpacing:"1.2px",
                textTransform:"uppercase", display:"block", marginBottom:7, fontWeight:500 }}>
                Contraseña
              </label>
              <input className="login-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width:"100%", background:"#FFFFFF", border:"1.5px solid #E8E3DA",
                  borderRadius:10, padding:"13px 16px", color:"#1A1714", fontSize:14,
                  fontFamily:"'DM Sans',sans-serif" }}
                placeholder="••••••••" />
            </div>

            {error && (
              <div style={{ fontSize:12, color:"#D94F3D", marginBottom:18,
                padding:"10px 14px", background:"rgba(217,79,61,0.07)",
                borderRadius:8, border:"1px solid rgba(217,79,61,0.2)" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !email || !password}
              style={{ width:"100%", padding:"14px", borderRadius:10,
                background: loading ? "#E8E3DA" : "#1A1714",
                border:"none",
                color: loading ? "#8A7F72" : "#F5EDD8",
                fontSize:14, fontWeight:600, cursor: loading ? "wait" : "pointer",
                fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.3px",
                transition:"all .2s" }}>
              {loading ? "Ingresando..." : "Ingresar →"}
            </button>
          </form>

          <div style={{ marginTop:32, fontSize:10, color:"#C5BDB3", textAlign:"center", letterSpacing:"0.5px" }}>
            Alba Inversiones Inmobiliarias · REG 3832
          </div>
        </div>
      </div>
    </div>
  );
}
