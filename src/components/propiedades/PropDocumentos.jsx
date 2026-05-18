// ══════════════════════════════════════════════════════════════
// ALBA CRM — PropDocumentos
// Subida, listado y eliminación de docs de una propiedad
// ══════════════════════════════════════════════════════════════
import React, { useState, useRef } from "react";
import { B } from "../../data/constants.js";

function docIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "pdf")                          return "📄";
  if (["jpg","jpeg","png","webp"].includes(ext)) return "🖼";
  if (["doc","docx"].includes(ext))           return "📝";
  if (["xls","xlsx"].includes(ext))           return "📊";
  return "📎";
}

export default function PropDocumentos({ propId, supabase, mobile }) {
  const [docs,      setDocs]      = useState([]);
  const [loaded,    setLoaded]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function loadDocs() {
    if (!supabase || loaded) return;
    const { data } = await supabase.storage.from("documentos").list(`prop-${propId}/`);
    setDocs(data || []);
    setLoaded(true);
  }

  // Exponer loadDocs para que PropCard lo llame al abrir
  React.useEffect(() => { loadDocs(); }, []);

  async function uploadDoc(e) {
    const file = e.target.files[0];
    if (!file || !supabase) return;
    setUploading(true);
    const path = `prop-${propId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file);
    if (!error) {
      const { data } = await supabase.storage.from("documentos").list(`prop-${propId}/`);
      setDocs(data || []);
    }
    setUploading(false);
    e.target.value = "";
  }

  async function deleteDoc(name) {
    await supabase.storage.from("documentos").remove([`prop-${propId}/${name}`]);
    setDocs(prev => prev.filter(d => d.name !== name));
  }

  function getUrl(name) {
    return supabase.storage.from("documentos").getPublicUrl(`prop-${propId}/${name}`).data.publicUrl;
  }

  return (
    <div style={{ borderTop: "1px solid " + B.border, paddingTop: mobile ? 12 : 10 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom: mobile ? 8 : 7, flexWrap: mobile ? "wrap" : "nowrap", gap: mobile ? 6 : 0 }}>
        <span style={{ fontSize: mobile ? 12 : 11, color:"#8AAECC", fontWeight:600,
          letterSpacing:"0.8px", textTransform:"uppercase" }}>
          📁 Documentos {docs.length > 0 && `(${docs.length})`}
        </span>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ fontSize: mobile ? 12 : 11, padding: mobile ? "5px 12px" : "3px 10px",
            borderRadius:6, cursor:"pointer", background:B.accent+"22",
            border:"1px solid "+B.accentL+"60", color:B.accentL }}>
          {uploading ? "Subiendo..." : "+ Subir"}
        </button>
        <input ref={fileRef} type="file" style={{ display:"none" }} onChange={uploadDoc} />
      </div>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (!file) return;
          uploadDoc({ target: { files: [file], value: "" } });
        }}
        style={{ display:"flex", flexDirection:"column", gap:5,
          minHeight: docs.length === 0 ? 44 : "auto",
          border: "1.5px dashed " + B.border, borderRadius:8,
          padding: docs.length === 0 ? "10px" : "4px" }}>
        {docs.length === 0 && !uploading && (
          <div style={{ fontSize:11, color:"#4A6A90", textAlign:"center" }}>
            Arrastrá archivos acá o usá + Subir
          </div>
        )}
        {docs.map(doc => (
          <div key={doc.name} style={{ display:"flex", alignItems:"center", gap:8,
            background:B.bg, borderRadius:7, padding:"7px 10px", border:"1px solid "+B.border }}>
            <span style={{ fontSize:14 }}>{docIcon(doc.name)}</span>
            <a href={getUrl(doc.name)} target="_blank" rel="noreferrer"
              style={{ flex:1, fontSize:12, color:B.accentL, textDecoration:"none",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {doc.name.replace(/^\d+-/, "")}
            </a>
            <span style={{ fontSize:10, color:"#4A6A90", flexShrink:0 }}>
              {doc.metadata?.size ? Math.round(doc.metadata.size/1024)+"kb" : ""}
            </span>
            <button onClick={() => deleteDoc(doc.name)}
              style={{ background:"transparent", border:"none", color:B.hot,
                cursor:"pointer", fontSize:13, padding:"0 2px", flexShrink:0 }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}