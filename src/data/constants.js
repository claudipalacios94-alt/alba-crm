// ALBA CRM — CONSTANTES Y DATOS
// Lógica de negocio → src/domain/lead.js
// Agentes y pipeline → src/config/agents.js

export { AG, ETAPAS, ECOL } from "../config/agents.js";
export { scoreLead, matchLeadProps, genMsgWhatsApp, genMsgBusqueda } from "../domain/lead.js";

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

export const LEADS_DEMO = [];
export const PROPS_DEMO = [];
export const ALQUILERES_DEMO = [];
