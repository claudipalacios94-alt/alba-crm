// ══════════════════════════════════════════════════════════════
// ALBA CRM — CONSTANTES Y DATOS
// Editá acá: paleta, agentes, etapas y datos de demo
// ══════════════════════════════════════════════════════════════
 
// ── Paleta de colores ─────────────────────────────────────────
export const B = {
  bg:         "#070E1C",
  sidebar:    "#080F1E",
  card:       "#0F1E35",
  colBg:      "#060C18",
  surface:    "#0A1525",
  border:     "#1E3454",
  accent:     "#2A5BAD",
  accentL:    "#4A8AE8",
  accentGlow: "rgba(42,91,173,0.18)",
  text:       "#EAF0FB",
  muted:      "#7A9EC0",
  dim:        "#4A6A90",
  hot:        "#D94F3D",
  warm:       "#E07B2A",
  ok:         "#2E9E6A",
  aiMsg:      "#0A1525",
  userMsg:    "#0D1829",
};
 
// ── Agentes ───────────────────────────────────────────────────
export const AG = {
  C: { n: "Claudi",    c: "#3A8BC4", bg: "rgba(58,139,196,0.15)"  },
  A: { n: "Alejandra", c: "#9B6DC8", bg: "rgba(155,109,200,0.15)" },
  F: { n: "Flor",      c: "#3EAA72", bg: "rgba(62,170,114,0.15)"  },
  L: { n: "Lucas",     c: "#E4923A", bg: "rgba(228,146,58,0.15)"  },
};
 
// ── Etapas del pipeline ───────────────────────────────────────
export const ETAPAS = [
  "Nuevo Contacto", "Contacto", "Calificado",
  "Visita", "Negociación", "Cerrado", "Perdido",
];
 
export const ECOL = {
  "Nuevo Contacto": "#5A7AB8",
  "Contacto":       "#3A8BC4",
  "Calificado":     "#2A9B8A",
  "Visita":         "#E8A830",
  "Negociación":    "#D4732A",
  "Cerrado":        "#2E9E6A",
  "Perdido":        "#8A6A6A",
};
 
// ── Scoring de lead ───────────────────────────────────────────
export function scoreLead(lead) {
  if (lead.etapa === "Cerrado" || lead.etapa === "Perdido")
    return { label: "⬜", c: "#4A8A5A", bg: "rgba(74,138,90,0.12)" };
  if (lead.dias < 3)
    return { label: "🟢 Caliente", c: B.hot,  bg: "rgba(232,93,48,0.13)"  };
  if (lead.dias <= 7)
    return { label: "🟡 Tibio",    c: B.warm, bg: "rgba(232,168,48,0.13)" };
  return   { label: "🔴 Frío",     c: B.muted,bg: "rgba(122,150,184,0.11)" };
}
 
// ── Leads demo ────────────────────────────────────────────────
export const LEADS_DEMO = [
  { id:55, nombre:"Susana",          ag:"C", etapa:"Calificado",     op:"Compra",        presup:85000,  tipo:"Depto",   zona:"La Perla",            dias:0,  prob:null, tel:"54 9 2234 22-8040", origen:"ZonaProp", nota:"Contacta por ZonaProp, quiere ver la de La Perla. Mujer insistente.",    proxAccion:"Coordinar visita La Perla",   notaImp:"Va a piñón fijo — prioridad" },
  { id:35, nombre:"Agustina Rutia",  ag:"",  etapa:"Calificado",     op:"Compra",        presup:135000, tipo:"Casa",    zona:"Chauvin, San José",   dias:1,  prob:40,   tel:"2234560497",        origen:"ZonaProp", nota:"3 amb casa con cochera. LEAD CALIENTE. Necesita opciones urgente.",      proxAccion:"Enviar opciones urgente",     notaImp:"Lead caliente con alta probabilidad" },
  { id:17, nombre:"Candela Pla",     ag:"",  etapa:"Calificado",     op:"Compra",        presup:95000,  tipo:"Casa/PH", zona:"Parque Luro",         dias:1,  prob:30,   tel:"34 665 81 75 44",   origen:"Facebook", nota:"Casita con patio. Desde Estrada hasta Los Pinares.",                     proxAccion:"Buscar PH con patio" },
  { id:21, nombre:"Ivan",            ag:"",  etapa:"Calificado",     op:"Compra",        presup:125000, tipo:"Casa",    zona:"Chauvin",             dias:1,  prob:25,   tel:"54 9 2215 02-1190", origen:"Facebook", nota:"Búsqueda activa. Cliente listo para comprar. USD 125k contado.",        proxAccion:"Avanzar opciones Chauvin" },
  { id:54, nombre:"Mauricio Raugh",  ag:"C", etapa:"Calificado",     op:"Compra",        presup:60000,  tipo:"PH",      zona:"Malvinas Argentinas", dias:0,  prob:null, tel:"",                  origen:"Facebook", nota:"Se interesa por la casa de Raugh.",                                      proxAccion:"Buscar opciones",             notaImp:"CRÉDITO" },
  { id:53, nombre:"Mariela Col.",    ag:"C", etapa:"Calificado",     op:"Compra",        presup:100000, tipo:"Casa",    zona:"Colinas Peralta",     dias:1,  prob:null, tel:"+54 9 2235 57-0700",origen:"Facebook", nota:"",                                                                       proxAccion:"Encontrar propiedades",       notaImp:"Acaba de empezar a buscar" },
  { id:7,  nombre:"Patricia",        ag:"",  etapa:"Visita",         op:"Compra",        presup:55000,  tipo:"Depto",   zona:"La Perla",            dias:5,  prob:50,   tel:"54 9 2983 61-9196", origen:"Referido", nota:"ATENCIÓN: Solo tiene 55k al contado. Propiedad a ver es 62k.",          proxAccion:"Confirmar visita fin de mes" },
  { id:33, nombre:"Rubén Inversor",  ag:"",  etapa:"Calificado",     op:"Inversión",     presup:null,   tipo:"Casa/Local",zona:"L'Ombu",            dias:6,  prob:30,   tel:"2235216301",        origen:"Cartel",   nota:"Interesado en casa de L'Ombu, abierto a inversiones rentables.",        proxAccion:"Presentar portafolio inversión" },
  { id:19, nombre:"Verónica Chauvin",ag:"",  etapa:"Calificado",     op:"Compra",        presup:150000, tipo:"Casa",    zona:"Chauvin",             dias:8,  prob:25,   tel:"54 9 11 3950-6600", origen:"Facebook", nota:"Buscando casa zona Chauvin. Le mandamos ofertas pero no cuadra nada.", proxAccion:"Seguir enviando opciones Chauvin" },
  { id:34, nombre:"Marina Arq.",     ag:"",  etapa:"Calificado",     op:"Compra",        presup:120000, tipo:"Depto",   zona:"Abierta",             dias:10, prob:35,   tel:"2234060880",        origen:"Cartel",   nota:"Arquitecta. Muy exigente con calidad.",                                  proxAccion:"Mostrar opciones de calidad" },
  { id:6,  nombre:"Norma",           ag:"",  etapa:"Calificado",     op:"Alquiler/Compra",presup:150000,tipo:"Casa/PH", zona:"Los Troncos",        dias:22, prob:45,   tel:"54 9 11 5099-9587", origen:"Referido", nota:"Propietaria en Aristobulo. Gran potencial.",                             proxAccion:"Mover alquiler / avanzar" },
  { id:16, nombre:"Matias Ramos",    ag:"",  etapa:"Contacto",       op:"Compra",        presup:210000, tipo:"Casa",    zona:"San Carlos, Chauvin", dias:24, prob:20,   tel:"54 9 2235 97-2846", origen:"Instagram",nota:"Jardín excluyente. San Carlos o Chauvin. Pago al contado.",            proxAccion:"Enviar opciones con jardín" },
  { id:50, nombre:"Luciana",         ag:"F", etapa:"Visita",         op:"Compra",        presup:85000,  tipo:"Casa",    zona:"",                    dias:4,  prob:null, tel:"2236682572",        origen:"Facebook", nota:"Casa 3 amb a reciclar USD 85.000. Quiere visitar.",                      proxAccion:"Coordinar visita" },
  { id:5,  nombre:"Hijo de Lusi",    ag:"",  etapa:"Calificado",     op:"Compra",        presup:83000,  tipo:"Depto",   zona:"La Perla",            dias:35, prob:35,   tel:"",                  origen:"Referido", nota:"Quiere ver el del pelado.",                                              proxAccion:"Buscar opciones La Perla" },
  { id:27, nombre:"Nadia",           ag:"",  etapa:"Nuevo Contacto", op:"Compra",        presup:150000, tipo:"Casa",    zona:"Chauvin",             dias:21, prob:15,   tel:"2235331453",        origen:"ZonaProp", nota:"Preguntó por casa de Chauvin marina.",                                   proxAccion:"Contactar y calificar" },
  { id:29, nombre:"Angela (Chauvin)",ag:"",  etapa:"Nuevo Contacto", op:"Compra",        presup:210000, tipo:"Casa",    zona:"Chauvin, Pringles",   dias:17, prob:15,   tel:"2234 24-6323",      origen:"Facebook", nota:"Preguntó por Chauvin y luego por la de Pringles.",                      proxAccion:"Mostrar opciones Chauvin" },
];
 
// ── Propiedades demo ──────────────────────────────────────────
export const PROPS_DEMO = [
  { id:22, tipo:"Departamento", zona:"Aldrey",     dir:"Lamadrid y Felucho",             precio:55000,  m2tot:28,  m2cub:28,  estado:"Buen Estado",  caracts:"Monoambiente, balcón",              dias:4,  sc:"🟢 OK",      info:"No publicitar. Solo para nuestros clientes.", lat:-38.0083, lng:-57.5423, ag:"F" },
  { id:23, tipo:"Departamento", zona:"Centro",     dir:"Arenales 2496, Est. Terminal",   precio:70000,  m2tot:35,  m2cub:35,  estado:"Excelente",    caracts:"2 amb, nuevo a estrenar, amueblado",dias:2,  sc:"🟢 OK",      info:"Ariel",                                       lat:-38.0057, lng:-57.5487, ag:"A" },
  { id:24, tipo:"Departamento", zona:"Centro",     dir:"Falucho 2394",                   precio:68000,  m2tot:43,  m2cub:24,  estado:"Excelente",    caracts:"Monoambiente, balcón, obra nueva",  dias:2,  sc:"🟢 OK",      info:"Pago honorarios. De Siufi.",                  lat:-38.0015, lng:-57.5479, ag:"C" },
  { id:18, tipo:"Casa",         zona:"La Perla",   dir:"San Martín 2344",                precio:110000, m2tot:212, m2cub:160, estado:"Para Reciclar",caracts:"3 amb, patio. Apto crédito.",       dias:11, sc:"🟢 OK",      info:"",                                            lat:-37.9682, lng:-57.5518, ag:""  },
  { id:19, tipo:"Casa",         zona:"San Carlos", dir:"Pringles 1428",                  precio:135000, m2tot:220, m2cub:170, estado:"Buen Estado",  caracts:"5+ amb, cochera 2 autos, patio",    dias:11, sc:"🟢 OK",      info:"",                                            lat:-38.0385, lng:-57.5742, ag:""  },
  { id:14, tipo:"Casa",         zona:"Chauvin",    dir:"Santiago del Estero 2300",       precio:140000, m2tot:140, m2cub:160, estado:"Buen Estado",  caracts:"3 amb, 2 dorm, 1 baño, cochera",    dias:53, sc:"🟢 OK",      info:"Madrina",                                     lat:-38.0089, lng:-57.5648, ag:""  },
  { id:20, tipo:"Casa",         zona:"Chauvin",    dir:"Bs.As. entre Saavedra y 1ª Junta",precio:350000,m2tot:210, m2cub:435, estado:"Buen Estado",  caracts:"5+ amb, cochera 2 autos, parque",   dias:9,  sc:"🟢 OK",      info:"Casa de alto valor",                          lat:-38.0091, lng:-57.5648, ag:""  },
  { id:15, tipo:"PH",           zona:"Zona Sur",   dir:"Arana y Goiri",                  precio:75000,  m2tot:64,  m2cub:null,estado:"Buen Estado",  caracts:"4 amb, 2 dorm, baño, cochera 2 autos",dias:97,sc:"🔴 Urgente", info:"",                                            lat:-38.0621, lng:-57.5572, ag:""  },
  { id:6,  tipo:"Casa",         zona:"Zona Sur",   dir:"Ruagh 942",                      precio:59000,  m2tot:433, m2cub:178, estado:"Buen Estado",  caracts:"3 amb, 2 dorm, cochera, Quincho",   dias:73, sc:"🟡 Atención",info:"Casa de Walter",                              lat:-38.0591, lng:-57.5554, ag:""  },
  { id:10, tipo:"Departamento", zona:"Centro",     dir:"Av. Colón 1700",                 precio:95000,  m2tot:43,  m2cub:null,estado:"Excelente",    caracts:"2 amb, amueblado, vista al mar",    dias:73, sc:"🟡 Atención",info:"Nuevo a estrenar.",                           lat:-38.0018, lng:-57.5435, ag:""  },
];
 
// ── Alquileres demo ───────────────────────────────────────────
export const ALQUILERES_DEMO = [
  { id:2, nombre:"Natalia Tortolisi", tipo:"PH",    zona:"Villa Primera", precioARS:1100, estado:"Disponible", tipoAlq:"Anual",    info:"" },
  { id:3, nombre:"Silvia",            tipo:"PH",    zona:"Villa Lourdes", precioARS:400,  estado:"Disponible", tipoAlq:"Anual",    info:"Madre de Alejandra" },
  { id:4, nombre:"Juan Chavez",       tipo:"Depto", zona:"Güemes",        precioARS:500,  estado:"Disponible", tipoAlq:"Anual",    info:"Falucho y Alsina" },
  { id:5, nombre:"Papa Gisell",       tipo:"Local", zona:"A confirmar",   precioARS:250,  estado:"Disponible", tipoAlq:"Anual",    info:"" },
  { id:6, nombre:"Ana",               tipo:"Depto", zona:"Playa Grande",  precioARS:null, estado:"Disponible", tipoAlq:"Temporal", info:"Propietaria de 7° Aristobulo" },
];
 
// ── Selects para formularios ──────────────────────────────────
export const ORIGENES = ["Instagram","Facebook","WhatsApp","ZonaProp","Referido","Cartel","Llamada","Portal Web","Otro"];
export const TIPOS_OP = ["Compra","Alquiler","Alquiler / Compra","Inversión"];
export const TIPOS_PROP_LEAD = ["Depto","Casa","PH","Casa / PH","Dúplex","Local","Terreno","Otro"];
export const TIPOS_PROP_VENTA = ["Departamento","Casa","PH","Dúplex","Local","Terreno"];
export const ESTADOS_PROP = ["Excelente","Buen Estado","Para Reciclar","A Refaccionar"];
export const ETAPAS_INIT = ["Nuevo Contacto","Contacto","Calificado","Visita","Negociación"];
export const TIPOS_CONTACTO = ["Llamada","WhatsApp","Visita","Email","Sin respuesta","Otro"];
export const TIPO_COLOR = {
  Llamada:"#3A8BC4", WhatsApp:"#3EAA72", Visita:"#E8A830",
  Email:"#9B6DC8", "Sin respuesta":"#E85D30", Otro:"#7A96B8",
};
 
// ── Matching engine ───────────────────────────────────────────
export function matchLeadProps(lead, properties) {
  if (!lead || !properties?.length) return [];
  const zona  = (lead.zona  || "").toLowerCase();
  const tipo  = (lead.tipo  || "").toLowerCase();
  const presup = Number(lead.presup) || 0;
  const op     = (lead.op   || "").toLowerCase();
 
  // No matchear alquileres con propiedades en venta
  if (op === "alquiler") return [];
 
  const zonas = zona.split(/[,\/]|(?:\s+y\s+)/).map(z => z.trim()).filter(Boolean);
 
  return properties
    .filter(p => p.activa !== false)
    .map(p => {
      let score = 0;
      const pZona    = (p.zona    || "").toLowerCase();
      const pTipo    = (p.tipo    || "").toLowerCase();
      const pPrecio  = Number(p.precio) || 0;
      const pCaracts = (p.caracts || "").toLowerCase();
 
      // Zona (peso 40)
      const zonaMatch = zonas.some(z => pZona.includes(z) || z.includes(pZona));
      if (zonaMatch) score += 40;
      else return null; // zona obligatoria
 
      // Presupuesto (peso 30)
      if (presup > 0 && pPrecio > 0) {
        if (pPrecio <= presup)        score += 30;
        else if (pPrecio <= presup * 1.10) score += 18;
        else if (pPrecio <= presup * 1.20) score += 8;
        else return null; // muy caro
      }
 
      // Tipo (excluyente)
      if (tipo && pTipo) {
        // Normalizar variantes
        const normLead = tipo.replace("departamento", "depto");
        const normProp = pTipo.replace("departamento", "depto");

        // Tipos simples del lead (ej: "casa / ph" → ["casa", "ph"])
        const tiposLead = normLead.split(/[\/,]|\s+y\s+/).map(t => t.trim()).filter(Boolean);

        // Si el lead tiene tipo definido y ninguno matchea con la propiedad → excluir
        const tipoOk = tiposLead.some(t =>
          normProp.includes(t) || t.includes(normProp)
        );
        if (!tipoOk) return null;
        score += 20;
      }
 
      // Características extra (peso 10)
      if ((lead.zona || "").toLowerCase().includes("cochera") && pCaracts.includes("cochera")) score += 5;
      if ((lead.zona || "").toLowerCase().includes("balcon")  && pCaracts.includes("balc"))    score += 5;
 
      return { ...p, _score: score, _zonaMatch: zonaMatch };
    })
    .filter(Boolean)
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);
}
 
export function genMsgWhatsApp(lead, prop) {
  const precio = prop.precio ? `USD ${Number(prop.precio).toLocaleString()}` : "a consultar";
  const m2 = prop.m2tot ? ` · ${prop.m2tot}m²` : "";
  return `Hola ${lead.nombre}! Tenemos una opción que creo que te puede interesar:\n\n` +
    `🏠 ${prop.tipo} en ${prop.zona}\n` +
    `📍 ${prop.dir || prop.zona}\n` +
    `💰 ${precio}${m2}\n` +
    (prop.caracts ? `✅ ${prop.caracts}\n` : "") +
    `\n¿Te parece si coordinamos para verla? 🙂`;
}

export function genMsgBusqueda(lead) {
  const stars = Math.round((lead.prob || 0) / 20);

  const encabezado = stars >= 5
    ? "🔴 PEDIDO URGENTE — CIERRE RÁPIDO"
    : stars >= 4
    ? "🟠 PEDIDO ACTIVO — MUY INTERESADO"
    : stars >= 3
    ? "🟡 BÚSQUEDA EN CURSO"
    : "🔵 PEDIDO DE BÚSQUEDA";

  const partes = [lead.tipo || "Propiedad"];
  if (lead.ambientes) partes.push(`${lead.ambientes} amb`);
  if (lead.zona) partes.push(lead.zona);
  const linea1 = partes.join(", ");

  const linea2 = lead.presup ? `USD ${Number(lead.presup).toLocaleString()}` : null;

  const detalles = [
    lead.credito === "si"  && "✅ Crédito aprobado",
    lead.cochera === "si"  && "🚗 Cochera",
    lead.cochera === "no"  && "❌ Sin cochera",
    lead.balcon  === "si"  && "🏙 Balcón",
    lead.patio   === "si"  && "🌿 Patio",
    lead.m2min             && `📐 Mín. ${lead.m2min}m²`,
    lead.op === "Inversor" && "📈 Inversor",
    stars >= 4             && "⚡ Prioridad alta",
  ].filter(Boolean);

  return [
    encabezado,
    linea2 ? `${linea1} · ${linea2}` : linea1,
    detalles.length > 0 ? detalles.join(" · ") : null,
    "Alba Inversiones · REG 3832",
  ].filter(l => l !== null).join("\n").trim();
}

