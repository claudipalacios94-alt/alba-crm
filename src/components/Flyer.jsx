// ══════════════════════════════════════════════════════════════
// ALBA CRM — MÓDULO GENERADOR DE FLYER
// Canvas API, 1080px, descarga PNG lista para Instagram/WA
// ══════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect } from "react";
import { B } from "../data/constants.js";

export default function Flyer({ properties }) {
  const [propId,   setPropId]   = useState(properties[0]?.id);
  const [fotos,    setFotos]    = useState([]);
  const [formato,  setFormato]  = useState("cuadrado");
  const [fotoSel,  setFotoSel]  = useState(0);
  const [texto,    setTexto]    = useState("");
  const [generando,setGenerando]= useState(false);

  const canvasRef = useRef(null);
  const dropRef   = useRef(null);

  const DIM   = formato === "cuadrado" ? { w:1080, h:1080 } : { w:1080, h:1350 };
  const SCALE = 0.42;
  const prop  = properties.find(p => p.id === propId) || properties[0];

  // ── Manejo de fotos ───────────────────────────────────────
  function onDrop(e) {
    e.preventDefault();
    loadFiles([...e.dataTransfer.files].filter(f => f.type.startsWith("image/")));
  }
  function onFileInput(e) { loadFiles([...e.target.files]); }
  function loadFiles(files) {
    const readers = files.slice(0, 6 - fotos.length).map(f =>
      new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result); r.readAsDataURL(f); })
    );
    Promise.all(readers).then(urls => setFotos(p => [...p, ...urls]));
  }
  function removePhoto(i) {
    setFotos(p => p.filter((_, idx) => idx !== i));
    if (fotoSel >= fotos.length - 1) setFotoSel(Math.max(0, fotos.length - 2));
  }

  // ── Generar canvas ────────────────────────────────────────
  function generarFlyer(download = false) {
    if (!prop || !canvasRef.current) return;
    setGenerando(true);
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const W = DIM.w, H = DIM.h;
    canvas.width  = W;
    canvas.height = H;

    function roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x+r, y); c.lineTo(x+w-r, y); c.quadraticCurveTo(x+w, y, x+w, y+r);
      c.lineTo(x+w, y+h-r); c.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
      c.lineTo(x+r, y+h); c.quadraticCurveTo(x, y+h, x, y+h-r);
      c.lineTo(x, y+r); c.quadraticCurveTo(x, y, x+r, y);
      c.closePath();
    }

    // Fondo
    ctx.fillStyle = "#070E1C";
    ctx.fillRect(0, 0, W, H);
    // Grid sutil
    ctx.strokeStyle = "rgba(42,91,173,0.05)"; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    function drawTextos(imgH) {
      const infoY = imgH ? imgH - 20 : H * 0.42;
      const pad   = 52;

      ctx.fillStyle = "#4A8AE8"; ctx.fillRect(pad, infoY, 56, 3);
      ctx.fillStyle = "#9ABCDA"; ctx.font = `500 ${W * 0.028}px Georgia,serif`;
      ctx.textAlign = "left";
      ctx.fillText(`${(prop.tipo || "").toUpperCase()}  ·  ${(prop.zona || "").toUpperCase()}`, pad, infoY + W * 0.045);

      ctx.fillStyle = "#E8EEF8"; ctx.font = `700 ${W * 0.048}px Georgia,serif`;
      ctx.fillText((prop.dir || "").slice(0, 40), pad, infoY + W * 0.098);

      ctx.fillStyle = "#4A8AE8"; ctx.font = `700 ${W * 0.068}px Georgia,serif`;
      ctx.fillText(prop.precio ? `USD ${prop.precio.toLocaleString()}` : "A consultar", pad, infoY + W * 0.172);

      if (prop.m2tot) {
        ctx.fillStyle = "#3D5A7A"; ctx.font = `400 ${W * 0.025}px Trebuchet MS,sans-serif`;
        ctx.fillText(`${prop.m2tot} m²${prop.precio ? `  ·  USD ${Math.round(prop.precio / prop.m2tot).toLocaleString()}/m²` : ""}`, pad, infoY + W * 0.207);
      }
      if (texto.trim()) {
        ctx.fillStyle = "#9ABCDA"; ctx.font = `400 italic ${W * 0.024}px Georgia,serif`;
        ctx.fillText(texto.trim().slice(0, 80), pad, infoY + W * 0.24);
      }

      // Separador
      ctx.strokeStyle = "rgba(26,47,80,0.8)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, H - W * 0.105); ctx.lineTo(W - pad, H - W * 0.105); ctx.stroke();

      // Logo Alba
      ctx.save();
      ctx.beginPath(); ctx.arc(pad + 24, pad + 24, 28, 0, Math.PI * 2);
      ctx.fillStyle = "#0B1628"; ctx.fill();
      ctx.strokeStyle = "#2A5BAD"; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#4A8AE8"; ctx.font = `700 32px Georgia,serif`;
      ctx.textAlign = "center"; ctx.fillText("A", pad + 24, pad + 34);

      ctx.fillStyle = "#E8EEF8"; ctx.font = `700 ${W * 0.027}px Georgia,serif`;
      ctx.textAlign = "left"; ctx.fillText("ALBA", pad + 62, pad + 22);
      ctx.fillStyle = "#3D5A7A"; ctx.font = `400 ${W * 0.017}px Trebuchet MS,sans-serif`;
      ctx.fillText("INVERSIONES INMOBILIARIAS · REG 3832", pad + 62, pad + 41);

      // Contacto
      ctx.fillStyle = "#3D5A7A"; ctx.font = `400 ${W * 0.022}px Trebuchet MS,sans-serif`;
      ctx.textAlign = "right"; ctx.fillText("alba@inversiones.com  |  223-XXX-XXXX", W - pad, H - W * 0.038);

      // Borde exterior
      ctx.strokeStyle = "rgba(42,91,173,0.2)"; ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

      setGenerando(false);
      if (download) {
        const a = document.createElement("a");
        a.download = `alba-flyer-${prop.id}-${formato}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      }
    }

    // Con foto o sin foto
    const mainFoto = fotos[fotoSel] || null;
    if (!mainFoto) { drawTextos(null); return; }

    const img   = new Image();
    img.onload  = () => {
      const imgH = formato === "cuadrado" ? H * 0.62 : H * 0.58;
      const ratio = img.width / img.height;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (ratio > W / imgH) { sw = sh * (W / imgH); sx = (img.width - sw) / 2; }
      else                  { sh = sw / (W / imgH); sy = (img.height - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, imgH);

      const gTop = ctx.createLinearGradient(0, 0, 0, imgH * 0.4);
      gTop.addColorStop(0, "rgba(7,14,28,0.7)"); gTop.addColorStop(1, "rgba(7,14,28,0)");
      ctx.fillStyle = gTop; ctx.fillRect(0, 0, W, imgH * 0.4);

      const gBot = ctx.createLinearGradient(0, imgH * 0.45, 0, imgH);
      gBot.addColorStop(0, "rgba(7,14,28,0)"); gBot.addColorStop(1, "rgba(7,14,28,1)");
      ctx.fillStyle = gBot; ctx.fillRect(0, imgH * 0.45, W, imgH * 0.55);

      drawTextos(imgH);
    };
    img.onerror = () => drawTextos(null);
    img.src = mainFoto;
  }

  useEffect(() => { generarFlyer(false); }, [prop, fotos, fotoSel, formato, texto]);

  const chip = act => ({
    padding:"5px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
    border:`1px solid ${act ? B.accentL : B.border}`,
    background: act ? `${B.accentL}18` : "transparent",
    color: act ? B.accentL : B.muted,
  });

  return (
    <div style={{ display:"flex", gap:20, height:"100%", overflow:"hidden" }}>

      {/* Panel de control */}
      <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column", gap:12,
        overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent` }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:B.text, margin:0, fontFamily:"Georgia,serif" }}>Generador Flyer</h1>
          <p style={{ fontSize:11, color:"#8AAECC", margin:"3px 0 0" }}>Publicaciones estilo Alba</p>
        </div>

        {/* Selector propiedad */}
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12, padding:"13px 15px" }}>
          <div style={{ fontSize:12, color:"#8AAECC", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Propiedad</div>
          <select value={propId} onChange={e => setPropId(Number(e.target.value))}
            style={{ width:"100%", background:B.bg, border:`1px solid ${B.border}`, borderRadius:7,
              padding:"8px 10px", color:B.text, fontSize:12, outline:"none", cursor:"pointer" }}>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.tipo} · {p.dir?.slice(0, 35)} · {p.precio ? "USD "+p.precio.toLocaleString() : "?"}</option>
            ))}
          </select>
          {prop && (
            <div style={{ marginTop:8, padding:"7px 10px", background:B.bg, borderRadius:7, border:`1px solid ${B.border}` }}>
              {prop.precio && <div style={{ fontSize:11, color:B.accentL, fontFamily:"Georgia,serif", fontWeight:700 }}>USD {prop.precio.toLocaleString()}</div>}
              <div style={{ fontSize:12, color:"#8AAECC", marginTop:1 }}>{prop.zona} · {(prop.caracts || "").slice(0, 40)}</div>
            </div>
          )}
        </div>

        {/* Formato */}
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12, padding:"13px 15px" }}>
          <div style={{ fontSize:12, color:"#8AAECC", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Formato</div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setFormato("cuadrado")} style={chip(formato === "cuadrado")}>Cuadrado</button>
            <button onClick={() => setFormato("vertical")} style={chip(formato === "vertical")}>Vertical</button>
          </div>
        </div>

        {/* Fotos */}
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12, padding:"13px 15px" }}>
          <div style={{ fontSize:12, color:"#8AAECC", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Fotos ({fotos.length}/6)</div>
          {fotos.length < 6 && (
            <div ref={dropRef} onDrop={onDrop} onDragOver={e => e.preventDefault()}
              style={{ border:`1.5px dashed ${B.border}`, borderRadius:9, padding:"16px", textAlign:"center",
                cursor:"pointer", marginBottom: fotos.length > 0 ? 10 : 0 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = B.accentL}
              onMouseLeave={e => e.currentTarget.style.borderColor = B.border}
              onClick={() => document.getElementById("file-inp").click()}>
              <div style={{ fontSize:20, marginBottom:5 }}>📸</div>
              <div style={{ fontSize:12, color:B.muted }}>Arrastrá fotos o tocá para subir</div>
              <input id="file-inp" type="file" accept="image/*" multiple style={{ display:"none" }} onChange={onFileInput} />
            </div>
          )}
          {fotos.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
              {fotos.map((f, i) => (
                <div key={i} style={{ position:"relative", cursor:"pointer", borderRadius:7, overflow:"hidden",
                  border:`2px solid ${fotoSel === i ? B.accentL : B.border}`, aspectRatio:"1" }}
                  onClick={() => setFotoSel(i)}>
                  <img src={f} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                  {fotoSel === i && <div style={{ position:"absolute", top:3, left:3, background:B.accentL, borderRadius:4, padding:"1px 5px", fontSize:8, color:"#fff", fontWeight:700 }}>PRINCIPAL</div>}
                  <button onClick={e => { e.stopPropagation(); removePhoto(i); }}
                    style={{ position:"absolute", top:3, right:3, background:"rgba(7,14,28,0.8)", border:"none", borderRadius:"50%", width:16, height:16, cursor:"pointer", color:"#8AAECC", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Texto adicional */}
        <div style={{ background:B.card, border:`1px solid ${B.border}`, borderRadius:12, padding:"13px 15px" }}>
          <div style={{ fontSize:12, color:"#8AAECC", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Texto adicional</div>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
            placeholder="Ej: Piso 3°, luminoso, entrega inmediata..."
            style={{ width:"100%", background:"transparent", border:`1px solid ${B.border}`, borderRadius:7,
              padding:"8px 10px", color:B.text, fontSize:12, outline:"none", resize:"none",
              fontFamily:"'Trebuchet MS',sans-serif", boxSizing:"border-box", scrollbarWidth:"none" }} />
        </div>

        {/* Botón descargar */}
        <button onClick={() => generarFlyer(true)} disabled={generando}
          style={{ padding:"13px", borderRadius:10, cursor: generando ? "wait" : "pointer",
            background: generando ? B.border : B.accent,
            border:`1px solid ${generando ? B.border : B.accentL}`,
            color: generando ? B.muted : "#fff", fontSize:13, fontWeight:700,
            fontFamily:"Georgia,serif", flexShrink:0 }}>
          {generando ? "Generando..." : "↓ Descargar PNG"}
        </button>
        <div style={{ fontSize:12, color:B.dim, textAlign:"center" }}>1080×1080px · listo para Instagram y WhatsApp</div>
      </div>

      {/* Preview */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"flex-start", overflow:"auto", paddingTop:4,
        scrollbarWidth:"thin", scrollbarColor:`${B.border} transparent` }}>
        <div style={{ fontSize:11, color:B.dim, marginBottom:12, letterSpacing:"0.5px" }}>
          PREVIEW — {DIM.w}×{DIM.h}px
        </div>
        <div style={{ position:"relative", flexShrink:0,
          boxShadow:"0 12px 60px rgba(0,0,0,0.7)", borderRadius:8, overflow:"hidden",
          border:`1px solid ${B.border}`,
          width:Math.round(DIM.w * SCALE), height:Math.round(DIM.h * SCALE) }}>
          <canvas ref={canvasRef}
            style={{ width:Math.round(DIM.w * SCALE), height:Math.round(DIM.h * SCALE), display:"block" }} />
          {generando && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(7,14,28,0.6)" }}>
              <div style={{ width:28, height:28, border:`2px solid ${B.border}`, borderTop:`2px solid ${B.accentL}`, borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
            </div>
          )}
        </div>
        {fotos.length > 1 && (
          <div style={{ display:"flex", gap:6, marginTop:14 }}>
            {fotos.map((_, i) => (
              <div key={i} onClick={() => setFotoSel(i)}
                style={{ width: fotoSel === i ? 20 : 7, height:7, borderRadius:4, cursor:"pointer",
                  background: fotoSel === i ? B.accentL : B.border, transition:"all .2s" }} />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } } textarea::-webkit-scrollbar { display: none }`}</style>
    </div>
  );
}
