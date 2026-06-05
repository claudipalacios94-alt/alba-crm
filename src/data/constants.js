// ALBA CRM — CONSTANTES Y DATOS
// Lógica de negocio → src/domain/lead.js
// Agentes y pipeline → src/config/agents.js

export { AG, ETAPAS, ECOL } from "../config/agents.js";
export { scoreLead, matchLeadProps, genMsgWhatsApp, genMsgBusqueda, getPriorityScore, getRecommendedAction,
  getLeadTemperature, getLeadPriority, getLeadReason } from "../domain/lead.js";

export { B } from "./styles.js";

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
