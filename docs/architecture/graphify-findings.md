# Alba CRM — Mapa de Dependencias (madge)

Generado: 2026-06-04
Herramienta: madge v8.0.0
Archivos analizados: 95

---

## Ciclo detectado

```
data/constants.js → domain/lead.js → data/constants.js
```

`lead.js` importa `B` (objeto de estilos) desde `constants.js`.
`constants.js` re-exporta `scoreLead`, `matchLeadProps`, etc. desde `lead.js`.

No rompe el build actual (Vite lo resuelve), pero es riesgo latente:
si alguno de los dos se mueve de archivo, puede aparecer `undefined` en runtime.

**No tocar este ciclo sin un plan claro.**

---

## God Node

| Archivo | Importado por |
|---|---|
| `data/constants.js` | **55 archivos** |

Es el barrel central del proyecto. Re-exporta estilos (`B`), configuración de agentes
(`AG`, `ETAPAS`, `ECOL`) y funciones de dominio (`scoreLead`, `matchLeadProps`, etc.).

**Regla: no modificar `constants.js` sin revisar mapa de impacto completo.**
Ejecutar `npm run graph` y verificar qué 55 archivos pueden verse afectados.

---

## Nodos sensibles (más importados)

| Archivo | Importado por | Riesgo |
|---|---|---|
| `data/constants.js` | 55 | 🔴 Máximo |
| `hooks/supabaseClient.js` | 16 | 🔴 Alto |
| `hooks/useSupabase.js` | 12 | 🟠 Alto |
| `store/useLeadStore.js` | 10 | 🟠 Alto |
| `store/usePropertyStore.js` | 9 | 🟡 Medio |
| `domain/lead.js` | 8 | 🟡 Medio |
| `domain/nota.js` | 6 | Bajo |
| `domain/matching.js` | 5 | Bajo |

---

## LeadCardPro.jsx — crítico por tamaño, bajo acoplamiento externo

- **1361 líneas** — archivo más grande del repo
- Importado por: solo `crmleads/index.jsx`
- Importa: `constants.js`, `domain/lead.js`, `domain/nota.js`, `supabaseClient.js`

El riesgo es interno (lógica acumulada), no de acoplamiento.
Siempre hacer `npm run build` antes de push si se toca este archivo.

---

## Candidatos a código muerto

| Archivo | Estado | Próximo paso |
|---|---|---|
| `store/useUIStore.js` | Nadie lo importa | Verificar si era intencional antes de borrar |
| `domain/captacion.js` | Nadie lo importa | Verificar si `useCaptacionStore` lo necesita |
| `components/Asistente.jsx` | Nadie lo importa | Borrar cuando haya ventana segura |
| `components/Propiedades.jsx` | Nadie lo importa | Legacy, reemplazado por `propiedades/index.jsx` |
| `components/Tareas.jsx` | Nadie lo importa | Legacy |

---

## Componentes Briefing huérfanos

Estaban en `index.jsx.bak` (versión anterior de Home). No están en el Home actual.

```
components/briefing/BriefingLeadCard.jsx
components/briefing/OportunidadesCaptacion.jsx
components/briefing/BriefingMercado.jsx
components/briefing/BriefingCanales.jsx
components/briefing/BriefingCalendario.jsx
components/briefing/BriefingGauge.jsx
components/briefing/BriefingCaptacionZonas.jsx
```

**Revisar antes de borrar**: algunos pueden reintegrarse al Home futuro.

---

## Cómo actualizar este mapa

```bash
# Regenerar grafo JSON (input para futura visualización 3D)
npm run graph

# Detectar ciclos antes de un cambio grande
npm run graph:cycles

# Ver qué depende de un archivo específico
npx madge src/ --extensions js,jsx -d domain/matching.js
```

---

## Reglas operativas

1. Antes de tocar `constants.js`: `npm run graph` y revisar las 55 dependencias.
2. Antes de tocar `domain/lead.js` o `domain/matching.js`: verificar ciclo activo.
3. Antes de push en `LeadCardPro.jsx`: `npm run build`.
4. Al detectar un nuevo huérfano: no borrar sin verificar primero si tiene acceso dinámico o lazy import.
