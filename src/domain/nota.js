// ══════════════════════════════════════════════════════════════
// ALBA CRM — DOMAIN / NOTA
// Modelo de nota tipada. Sin React, sin Supabase.
// ══════════════════════════════════════════════════════════════

export const TIPO_NOTA = {
  interes:     { label: "Interés",     color: "#4A8A5A", emoji: "✅" },
  objecion:    { label: "Objeción",    color: "#E85830", emoji: "🚧" },
  seguimiento: { label: "Seguimiento", color: "#3A8BC4", emoji: "📞" },
  urgencia:    { label: "Urgencia",    color: "#E8A830", emoji: "🔥" },
  cierre:      { label: "Cierre",      color: "#9B6DC8", emoji: "💰" },
};

/**
 * Parsea el campo `nota` del lead.
 * Puede ser: string legacy, JSON array de notas tipadas, o vacío.
 * Siempre devuelve array.
 */
export function parsearNotas(nota) {
  if (!nota) return [];
  if (Array.isArray(nota)) return nota;
  try {
    const parsed = JSON.parse(nota);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  // Legacy: string plano → una nota de tipo seguimiento
  return [{ id: "legacy", texto: nota, tipo: "seguimiento", createdAt: null }];
}

export function serializarNotas(notas) {
  return JSON.stringify(notas);
}

export function crearNota(texto, tipo = "seguimiento") {
  return {
    id: crypto.randomUUID(),
    texto: texto.trim(),
    tipo,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Devuelve el tipo de nota más reciente (últimos 14 días).
 * Usado por scoreLead y getPriorityScore.
 */
export function tipoNotaReciente(notas = []) {
  if (!notas.length) return null;
  const recientes = notas.filter(n => {
    if (!n.createdAt) return true; // legacy sin fecha = incluir
    return (Date.now() - new Date(n.createdAt)) / 86400000 <= 14;
  });
  if (!recientes.length) return null;
  const ultima = [...recientes].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  )[0];
  return ultima.tipo;
}
