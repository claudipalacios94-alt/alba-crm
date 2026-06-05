ALBA CRM — MASTER CONTEXT v10
Última actualización: 2026-06-02
Uso: Pegar completo al inicio de cada sesión de trabajo.

1. NEGOCIO
Agencia: Alba Inversiones Inmobiliarias | REG 3832 | Mar del Plata, Argentina
Equipo: C=Claudi #3A8BC4 (owner, activa) · A=Alejandra #9B6DC8 (activa) · F=Flor #3EAA72 (inactiva) · L=Lucas #E4923A (inactivo) · Lu=Luján #2AADA8 (rol a confirmar)
Métricas (mayo 2026): Abril $4.900 (2 ops) / Mayo $6.300 (2 ops) · ~94 leads / ~25 activos · 20 props / 5 alquileres · 5 usuarios Supabase Auth

2. STACK
Capa | Tecnología
Frontend | React + Vite + React Router v7
Estilos | Objeto B en constants.js — NO Tailwind, NO CSS modules
Estado | Zustand (6 stores)
Backend | Supabase PostgreSQL — RLS + policies en todas las tablas
Deploy | Vercel — autodeploy desde main
IA | Anthropic API via /api/claude (50req/h) · /api/analyze (20req/h Edge)
Monitoreo | Sentry — solo PROD

URLs: https://alba-crm.vercel.app · GitHub: claudipalacios94-alt/alba-crm
Modelos (src/config/ai.js): Smart=claude-sonnet-4-20250514 · Fast=claude-haiku-4-5-20251001
⚠️ api/analyze.js hardcodea modelo — intencional (Edge runtime no puede importar desde src/)

3. ARQUITECTURA
src/
  config/     ai.js · agents.js (AG, ETAPAS, ECOL)
  data/       constants.js → barrel: paleta B + re-exports
  domain/     lead.js · nota.js · matching.js · property.js · rental.js · captacion.js · formatting.js · opportunity.js
  store/      useLeadStore.js · usePropertyStore.js · useRentalStore.js
              useCaptacionStore.js · useAIStore.js · useUIStore.js
  hooks/      supabaseClient.js · useAuth.js · useTareas.js · useIncidents.js
              useCaptacionZonaSemana.js · useLeaflet.js
  pages/      Briefing(HOME) · CRMLeads · Propiedades · Kanban · Cuaderno
              Mapa · Flyer · Captaciones · CaptacionZonas · Alquileres · Reportes
  components/ briefing/ · crmleads/ · propiedades/ · layout/
              AIFloatingChat · Captaciones · CaptacionZonas
              Kanban · Mapa · Flyer · Cuaderno · Alquileres · Tareas
  modals/     Modal · QuickAddLead · QuickAddProp
  context/    SupabaseContext → user + agent + authLoading + sinAsignar
  main.jsx    Sentry.init() + ErrorBoundary + BrowserRouter + SupabaseProvider
  App.jsx     12 rutas
api/          claude.js · analyze.js · geocode.js · places.js

Reglas: Pages delgadas → stores Zustand → props a componentes · constants.js barrel puro · Auth proxies requieren Authorization: Bearer <token> · Captaciones/Cuaderno/Tareas usan estado local + supabase directo (intencional)

4. MÓDULOS
Módulo | Ruta | Estado
Inicio (HOME) | / | ✅ fusión Dashboard+Briefing · KPIs + alertas clickeables + EquilibrioBar + OportunidadesCaptacion + llamar hoy + tareas + zonas
Briefing | /briefing | redirige a / con Navigate
CRM Leads | /crm | ✅ REDISEÑADO v10 — ver sección 10
Kanban | /kanban | ✅ 7 etapas · solo compradores · ruta preservada pero oculta del sidebar · integrado como vista en /crm
Propiedades | /propiedades | ✅ categorías + retasadas
Captaciones | /captaciones | ✅ IA extracción + mapa + expiración 21d
Captación Zonas | /zonas | ✅ rotación semanal por barrio
Cuaderno | /cuaderno | ✅ grafo Obsidian + Alba
Mapa | /mapa | ✅ Leaflet · props + captaciones + matches
Flyer | /flyer | ✅ imagen_base64
Buscador | /buscador | ✅ links Argenprop
Alquileres | /alquileres | ✅ oculto en sidebar
Reportes | /reportes | ✅ calculadora inversión + IA

5. BASE DE DATOS SUPABASE
leads: id, nombre, ag, ag_capto, etapa, op, presup, tipo, zona, tel, nota, proxaccion, proxaccion_tipo, proxaccion_fecha, prob, nota_imp, cochera, balcon, patio, ambientes, m2min, credito, last_contact_at, inversor(bool), nota_inversor, q_visitas_previas, q_freno, q_tiene_para_vender, q_fecha_limite, created_at

dias calculado en runtime desde last_contact_at ÚNICAMENTE (useLeadStore)
⚠️ last_contact_at null → dias = null (no 0, no created_at como fallback)
nota puede ser string legacy O JSON array de notas tipadas
inversor=true → tab Inversores

captaciones: id, contenido, tipo, zona, direccion, precio, ambientes, cochera, tel, caracts, operacion, ag, lat, lng, convertida, url, nota_interna, tipo_captacion(propia/honorarios/colega), inmobiliaria, nombre_propietario, telefono, expiracion_notificada, created_at

⚠️ convertida=true NO excluye del matching
Expiración: 21d→notificar, 24d→auto-eliminar

properties: id, tipo, zona, dir, precio, precio_original, m2tot, m2cub, estado, caracts, descripcion, fotos, info, lat, lng, ag, activa, categoria, sc, dias, created_at
tareas: id, titulo, prioridad, fecha, completada, ag, created_at, lead_id(bigint), tipo(text)

tipo != null → tarea automática (auto-cierre habilitado)
tipo = null → tarea manual (nunca auto-cerrada)
RLS activo · policies: insert/select/update para authenticated

matches_mostrados: lead_id, prop_id — prop_id numérico (nunca "cap-123")
Otras: rentals, interactions, captacion_zonas, briefing_chat, cuaderno_notas, flyers, agents, rate_limits, usage_log, agent_settings

6. DOMAIN / LEAD (src/domain/lead.js)

scoreLead(lead) → {label, c, bg} — temperatura visual, sin cambios, usado para color de card
computeRanking(lead, matchCount=0) → función principal de ranking — devuelve {prioridad 0-100, confianza "baja/media/alta", dimensiones {calor, viabilidad, matchability, friccion}, tags[], motivos[]}
getPriorityScore(lead, matchCount=0) → wrapper de compatibilidad sobre computeRanking
getQualificationScore(lead) → 0-40 — completitud de calificación, aumenta confianza, NO suma prioridad directamente
getRecommendedAction(lead) → {accion, urgencia, motivo}
detectIncident(lead) → 3 incidents exactos (sin cambios)
computeLeadState(lead) → {score, urgencia, accion, motivo, incident, tipoNota}

Dimensiones de computeRanking:
calor — actividad e interés: días contacto + etapa + tipo nota
viabilidad — posibilidad de cierre: crédito + fecha límite + sin permuta + op Compra
matchability — facilidad de encontrar prop: matchCount real + zona flexible + requisitos duros
friccion — señales que complican: permuta + búsqueda larga + objeciones + días inactivo
confianza — fiabilidad del score: calificación completa + notas recientes (no suma prioridad)

Fórmula: prioridad = calor*0.35 + viabilidad*0.30 + matchability*0.25 - friccion*0.20
Tags automáticos: 🔥 Caliente · ⚡ Resoluble · 💰 Alta viabilidad · ⚠️ Alta fricción · 🏠 Match difícil · ❄️ Frío · 🔄 Necesita vender · 🐌 Decisión lenta — máx 3 visibles

⚠️ dias === null es neutro en todas las funciones: sin bonus de recencia, sin penalización por frío, sin incident automático
⚠️ Bug histórico corregido: "Negociacion" → "Negociación" (con tilde) en detectIncident y getRecommendedAction

7. DOMAIN / NOTA (src/domain/nota.js)

TIPO_NOTA: interes(✅) · objecion(🚧) · seguimiento(📞) · urgencia(🔥) · cierre(💰)
Cada tipo tiene: emoji, label, color
parsearNotas(nota) → array — compatible con string legacy (→ tipo "seguimiento")
crearNota(texto, tipo) → {id, texto, tipo, createdAt}
serializarNotas(notas) → JSON.stringify — guardar en campo nota
tipoNotaReciente(notas) → tipo más reciente (últimos 14 días)

8. DOMAIN / OPPORTUNITY (src/domain/opportunity.js) — NUEVO v7

computeLeadDemandWeight(lead) → 0-100
  Pondera demanda real por: etapa + dias (null=neutro) + credito + q_fecha_limite + tipo nota + permuta
  NO usa computeRanking — concepto distinto: demanda agregada vs ranking individual

getTopOpportunities(leads, properties, captaciones) → top 3 OfertaCard[]
  Agrupa leads activos por [zona_norm + tipo_norm] (igualdad exacta con normZona)
  Filtro mínimo: ≥3 leads, o exactamente 2 con señal fuerte ambos (≥2 de: credito, etapa Visita/Neg, nota urgencia/cierre, dias≤3)
  Score mínimo: 25 pts para evitar ruido
  Retorna: {id, titulo, motivo, accion, riesgo, score, confidence}
  confidence: "alta" ≥5 leads · "media" ≥3 · "baja" =2 con señal fuerte

computeSupply(properties, captaciones, zonaNorm, tipoNorm)
  Igualdad exacta de zona (===) — no includes() para evitar falsos positivos
  Captaciones sin zona descartadas (TODO: loguear para debug)
  Peso: props activas = 1.0 · captaciones = 0.5

Integrado en HOME entre EquilibrioBar y Requieren Atención
Componente: src/components/briefing/OportunidadesCaptacion.jsx (useMemo, key=op.id)

9. INCIDENTS + TAREAS AUTOMÁTICAS
useIncidents (src/hooks/useIncidents.js):

Corre cuando cambia hash de leads (id+last_contact_at+nota+etapa)
Calcula top 5 por scoreIncident: urgencia+100 · negociacion+70 · interes+50 + bonos días (null=neutro) + prob*0.3
Para leads CON incident: crea tarea si no existe una del mismo tipo hoy
Para leads SIN incident: cierra tareas automáticas pendientes (tipo != null)
Integrado en CRMLeads/index.jsx → useIncidents(leads)

Edge Function process-incidents (Supabase):
Cron process-incidents-daily: 0 11 * * * (8am ARG)
Misma lógica que el hook — corre aunque nadie abra el CRM
pg_cron habilitado en el proyecto

⚠️ Limitación activa: mayoría de leads tienen last_contact_at=NULL → dias=null → incidents no disparan en leads históricos. Se activa naturalmente cuando el equipo use "Contacté hoy".

10. CRM LEADS — v10 (2026-06-02)

Archivos modificados en v10:
  src/components/crmleads/index.jsx — filtros pills → selects, paleta mate
  src/components/crmleads/LeadCardPro.jsx — ficha expandida única (REEMPLAZADA COMPLETA)
  src/components/crmleads/CRMKpiCard.jsx — paleta mate aplicada

PALETA GRIS AZULADA MATE (aplicada en v10):
  Fondo página: #dfe7ef
  Cards / KPIs / toolbars: #f2f6fa
  Hover / secciones internas: #eef4f8
  Bordes: #c7d3df
  Texto principal: #102033
  Texto secundario: #46596d
  Labels: #5a6f84
  Azul ALBA activo: #12355b
  Acento: #3a8bc4
  Match strip: fondo #e4edf6 · borde #c5d8eb · texto #1763d1
  Badges estado (apagados): urgente #dc5050 · alta #e9823a · visita/media #d99a22 · calificado #3a8bc4 · negociación #7c5cc4 · frío #64748b

Layout general:
  Fondo #dfe7ef (light theme solo en /crm)
  Wrapper con margin negativo para cubrir padding del Layout: lv=22/14px, lh=26/12px desktop/mobile
  overflowX: hidden + boxSizing: border-box en wrapper raíz
  ⚠️ Si Layout.jsx cambia su padding, actualizar lv/lh en index.jsx líneas ~215-216

Header:
  Título + subtítulo · Buscador (260px) · Archivados · Mail pedidos · Matches nuevos · Fecha

KPIs (5 cards):
  Leads totales · Leads activos · Con matches · Sin contacto +3d (alert si >5) · Acciones hoy
  CRMKpiCard.jsx: icon, value, label, sub, color, sparkline, alert

matchesByLeadId — CACHE CRÍTICO:
  useMemo([leads, todasProps]) → Map<leadId, matches[]>
  matchLeadProps corre UNA sola vez por lead por render (~94 llamadas total)
  Usado en: filtBase sort · matchesNuevos · leadsConMatchNuevo · KPI con matches · LeadCardPro (recibe matches por prop)
  ⚠️ NO agregar dependencias visuales (q, tab, mobile, width) — solo leads y todasProps

Grilla de cards:
  gridTemplateColumns: repeat(3, minmax(0,1fr)) ≥1100px / repeat(2,...) ≥640px / 1fr mobile
  ⚠️ Usar minmax(0,1fr) siempre — 1fr solo puede desbordar con contenido ancho
  alignItems: start

Filtros (v10 — reemplazaron pills):
  <label>Estado: <select> (Todos/Caliente/Tibio/Frío) — lógica fs intacta
  <label>Agente: <select> (Todos/Claudi/Alejandra/Flor/Lucas/Luján/Sin asignar) — lógica fa intacta
  Valores internos iguales a los anteriores — sin romper filtrado

LeadCardPro (card cerrada):
  padding 12/14px · gap 7 · borderRadius 14px · fondo #f2f6fa
  borderLeft: 4px solid sideColor(badge) — línea lateral por estado
  Badge etapa/prioridad (colores apagados) · Nombre · Tipo+zona · Tel+WA · DataPill grid 2 cols · Matches strip · Footer
  isBlurred: opacity 0.38 cuando otra card está expandida
  hasNewMatch: border #3b82f6 + badge "● MATCH NUEVO"
  "Contacté hoy" → updateLead(id, {last_contact_at: new Date().toISOString()})

11. CRM LEADS — FICHA EXPANDIDA ÚNICA (LeadCardPro isOpen — v10)

La expansión ya NO usa LeadCard original. Es una ficha propia completa.
LeadCard.jsx permanece en el proyecto pero NO se renderiza en /crm.

gridColumn: "1 / -1" · maxHeight: 60vh · overflowY: auto · borderLeft: 4px solid sideColor

HEADER OPERATIVO (fondo #eef4f8, borde #c7d3df):
  badge · nombre · 🏠/💼 tipo · zona · tel · WA · Contacté hoy · Copiar pedido · Cerrar

BODY (3 cols desktop / 1 col mobile, gap 12):

COL 1 — Brief comercial:
  getRecommendedAction(lead) → accion + urgencia + motivo
  último contacto (diasColor/diasLabel)
  proxaccion + proxaccion_tipo + proxaccion_fecha (formateado)
  nota_imp si existe (rojo #dc5050)
  + Gestión: select Etapa (ETAPAS completo) + select Agente (AG keys)

COL 2 — Datos del pedido:
  presup · tipo · op · ambientes · zona · m2min
  cochera · balcon · patio · credito (solo si === "si")
  etapa · agente — grid 2 cols, sin campos vacíos

COL 3 — Pedido para grupos WA:
  generarPedido(lead, formato) → texto listo para copiar
  Formato "formal": BUSCO para cliente activo / tipo·amb / Zona / Presup / Requisitos
  Formato "discreto": Estoy buscando para un cliente activo: ...
  Formato "colegas": Tengo cliente activo buscando... + 📍💰✅ + "Comparto honorarios"
  Botones: Pedido · Discreto · Colegas — navigator.clipboard.writeText · feedback "✓ Copiado" 2s
  ⚠️ Solo copia al portapapeles, no envía

ROW 2 — Matches (max 4):
  usa prop matches ya calculada (NO llama matchLeadProps)
  tipo · zona · precio · dirección · badge "captación"/"colega" si esCap
  botón Marcar/✓ Visto → toggleMostrado(lead.id, m.id)
  "+N más compatibles" si hay más de 4

ROW 3 — Notas + Calificación (2 cols / 1 col mobile):
  Notas: parsearNotas(lead.nota).slice(-3).reverse() — solo lectura
    cada nota: borderLeft 3px solid TIPO_NOTA[tipo].color · emoji · label · fecha · texto
  Comprador: Calificación solo lectura (q_visitas_previas, q_freno, q_tiene_para_vender, q_fecha_limite)
  Inversor: Perfil inversor (nota_inversor + presup/tipo/zona/op)

ROW 4 — Más acciones (fondo #eef4f8):
  [Marcar perdido → setModalPerdido(lead)] [Eliminar → setConfirmDelete(lead)]
  "Edición de notas · próxima versión" (texto informativo)

PENDIENTE en ficha expandida:
  Editor notas tipadas inline (no duplicar NotaLead)
  Editor calificación inline (no duplicar LeadQualification)
  Editor datos del lead (no duplicar LeadForm — updateLead disponible cuando se retome)
  Perfil inversor editable (no duplicar InversorNota)
  Timeline de actividad (requiere más datos)

12. CRM LEADS — COMPONENTES DE SOPORTE (SIN CAMBIOS EN v10)

LeadCard.jsx — componente legacy. Existe en el proyecto, NO se renderiza en /crm.
  Contiene: etapa/agente · notas tipadas · matches · calificación · perfil inversor · más acciones
  Preservado para referencia y posible reintegración parcial.

NotaLead.jsx — selector de tipo (5) + input + historial + borrar
  onGuardar(lead, notaSerializada) → guarda en campo nota
  ⚠️ No duplicar en ficha expandida — usarlo cuando se integre edición de notas

LeadQualification.jsx — 4 señales con onUpdate(lead.id, {campo}) del padre
  ⚠️ No duplicar en ficha expandida — usarlo cuando se integre calificación editable

LeadForm.jsx — formulario inline: nombre/tel/zona/presup/tipo/op/cochera/balcon/patio/credito/ambientes/m2min/proxaccion/nota
  onGuardar(lead.id, data) — compatible con updateLead directamente
  ⚠️ No duplicar en ficha expandida — integrar cuando se retome edición de datos

InversorNota.jsx — edición inline de nota_inversor
  onGuardar(lead, val) — guarda nota_inversor
  ⚠️ No duplicar en ficha expandida — integrar cuando se retome perfil inversor editable

BriefingLeadCard.jsx — simplificado para HOME: cabecera + barra calificación + WA
  dias === null → "Sin registro" en color B.muted

api/analyze.js — recibe {notas:[{texto,tipo}], leadInfo}, devuelve {status, nextAction, reason, source}

13. LÓGICA DE MATCHING
Función | Archivo | Tolerancia
matchLeadProps | domain/matching.js | 20% sobre presupuesto
matchPropLeads | domain/matching.js | 20%
matchLeadsParaProp | Mapa.jsx inline | 20%

normZona(): quita artículos + tildes. Captaciones normalizadas como {id:"cap-"+c.id, ..., _esCaptacion:true}.
opportunity.js usa igualdad exacta (===) sobre normZona() — más estricto que matching de leads.

14. HOME (src/components/briefing/index.jsx) — v8 REDISEÑO COMPLETO
Ruta /. /briefing redirige acá. maxWidth 1480, paddingTop 16, todo visible sin scroll de página.
Estructura:
  Header: "RESUMEN DEL NEGOCIO" uppercase + "Actualizado ahora" + punto verde
  FranjaKPIs (6 KPIs full-width con sparklines reales)
  Row A (2 cols, maxH 280px): Operaciones en riesgo | Llama hoy
  Row B (3 cols, maxH 220px): Alertas | Oferta por zona | Hoy

Componentes briefing (src/components/briefing/):
  FranjaKPIs.jsx — 6 KPIs: fontSize 34, icono 32px, sparkline 54px, padding 14/16/12
    weeklyBuckets(items,8) para sparklines · vsAnterior() retorna "—" si cur=0 o prev=0
    Facturación: sub="Pendiente conectar operaciones", compLabel="sin histórico"
  OperacionesRiesgo.jsx — filas por grupo (Negociación/#FF8C42, Visita/#E8A830, Calificado/#4A8ABE), MAX_VISIBLE=4
  LlamaHoyCard.jsx — Top 5. Click en nota → panel inline expandible con historial+agregar+borrar. Guarda directo a Supabase.
  AlertasHome.jsx — Solo 2 tipos: negociaciones paradas +48hs, leads sin calificar +6hs
  OfertaHome.jsx — Zone cards 2×2 con compradores/propiedades/badge estado + "Ver todas las zonas ›"
  HoyHome.jsx — Conteos (Vencidas/Hoy/Visitas/Pendientes) + input nueva tarea

ETAPA_RANK para LLAMA HOY (sin scoring opaco):
  { "Negociación":0, "Visita":1, "Calificado":2, "Contacto":3, "Nuevo Contacto":4 }
  Orden: etapa rank ASC, luego días DESC, null al final del grupo.

Sidebar: "Inicio" apunta a / · localStorage alba_nav reseteable con localStorage.removeItem("alba_nav")

15. ASISTENTE ALBA
Instancia | Componente | Modelo | Persiste
HOME/Briefing | briefing/index.jsx | Sonnet | briefing_chat
Chat flotante | AIFloatingChat.jsx | Haiku ⚠️hardcodeado | briefing_chat
Cuaderno | Cuaderno.jsx | Sonnet | No
Reportes | Reportes.jsx | Haiku ⚠️hardcodeado | No

Micrófono: Web Speech API es-AR. Sin memoria entre sesiones.

16. ISSUES ACTIVOS
# | Issue | Urgencia
1 | Modelo hardcodeado AIFloatingChat + Reportes | Baja
2 | Tokens falsos AIFloatingChat | Baja
3 | useAIStore.j typo | Baja
4 | Agent login UI | Media
5 | matches vistos en localStorage | Baja
6 | last_contact_at vacío → dias=null → incidents no disparan en leads históricos ⚠️ comportamiento correcto, se activa con uso | Baja (ya no es bug)
7 | Logs debug en useIncidents.js | Baja
8 | Sección "Por qué está aquí" en LeadCard — implementada en código, no aplicada | Baja
9 | BriefingMercado + BriefingCanales pendiente mover a Reportes | Baja
10 | captaciones sin zona no cuentan en computeSupply — TODO loguear para debug | Baja
11 | proxaccion_fecha en ficha expandida muestra ISO raw si no es fecha DD/MMM — formatFecha() ya aplicado, verificar formatos | Baja

Huérfanos para borrar (quedan): useLeads.js, useProperties.js, useRentals.js, Asistente.jsx
⚠️ useLeads/useProperties/useRentals referenciados en useSupabase.js — no borrar sin auditar primero

Eliminados en v7: Dashboard.jsx · DashboardAIResumen.jsx · DashboardPage.jsx
Desacoplados en v10: LeadCard.jsx (sigue en proyecto, no se renderiza en /crm)

17. PRÓXIMOS PASOS ACORDADOS
# | Qué | Por qué
1 | Reportes para inversores | Bloquea conversaciones comerciales — máxima prioridad
2 | Edición de notas inline en ficha expandida | NotaLead ya existe, integrar sin duplicar
3 | Edición de calificación inline | LeadQualification ya existe, integrar sin duplicar
4 | Edición de datos del lead inline | LeadForm ya existe, updateLead disponible — pendiente integración
5 | Agent login UI | Cuando Flor o Lucas vuelvan activos
6 | BriefingMercado + BriefingCanales → Reportes | Analítica semanal, no diaria
7 | Módulo Oferta (Propiedades + Captaciones + Zonas unificados) | Diferido ~1 mes — necesita más datos y uso real primero
8 | ~~Kanban como view toggle dentro de CRM Leads~~ | ✅ HECHO — switch Lista/Kanban en header de /crm, sidebar limpio
9 | ~~CRM Leads rediseño visual~~ | ✅ HECHO v9 — LeadCardPro, KPIs, grilla 3 cols, matchesByLeadId cache
10 | ~~CRM acabado visual gris azulado mate~~ | ✅ HECHO v10 — paleta #dfe7ef/#f2f6fa, línea lateral, selects filtro
11 | ~~Ficha expandida única sin LeadCard~~ | ✅ HECHO v10 — brief+datos+grupos WA+matches+notas+calificación+acciones

18. MERCADO MDP
Zona | USD/m²
Playa Grande | 2.200–3.200
Güemes / Los Troncos | 1.900–2.800
La Perla | 1.700–2.300
Centro | 1.500–2.200
Chauvin | 1.000–1.600
San José | 800–1.300

Captar: precio ±10% + leads activos en zona + propietario flexible.
No captar: 20%+ sobre mercado / sin leads / múltiples inmobiliarias.
Descuento real: 8–15%.

19. COMUNICACIÓN
WA match: [tipo] en [zona]\n[dir]\n[precio]-[m2]\n[caracts]\n[url]
Lead frío: Hola [nombre], ¿cómo andás? Te escribo porque [novedad]. ¿Seguís buscando en [zona]?
Captación: Hola, vi tu propiedad en [portal]. Tenemos compradores en [zona] con USD [rango]. ¿Tenés unos minutos?
Reglas: máx 5 líneas · una prop por mensaje · siempre terminar con pregunta · portales <2hs

Pedido para grupos (generado por LeadCardPro — 3 formatos):
  Formal: "BUSCO para cliente activo / [tipo]·[amb] / Zona: [zona] / Presupuesto: hasta USD [presup] / Requisitos: [reqs]"
  Discreto: "Estoy buscando para un cliente activo: [tipo], [amb], zona [zona], hasta USD [presup]. Ideal con [reqs]."
  Colegas: "Tengo cliente activo buscando [tipo]·[amb] / 📍[zona] / 💰[presup] / ✅[reqs] / Comparto honorarios."

20. RUTINA COMERCIAL
Prioridades: 1.Negociación activa · 2.Visita sin cierre +48hs · 3.Match nuevo · 4.Lead caliente +3d · 5.Lead nuevo sin calificar
30 min diarios: HOME → Alertas → WA con prop · Lead nuevo → calificar <2hs · Post-visita → seguimiento <48hs

21. PWA — FIX SERVICE WORKER
vite-plugin-pwa genera sw.js que cachea assets con hash. Cuando se deploya versión nueva el SW viejo puede interceptar requests y devolver HTML (error MIME type).
Fixes aplicados (permanentes):
  vite.config.js: workbox.skipWaiting=true + workbox.clientsClaim=true → nuevo SW toma control inmediato
  main.jsx: navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())) → limpia SWs viejos en cada carga
Si vuelve a pasar: F12 → Application → Service Workers → Unregister → F5

22. DEPLOY — REGLAS CRÍTICAS
⚠️ Verificar línea 1 en VS Code antes de push — Claude puede agregar texto que rompe el build
Editar desde terminal: python3 con heredoc — nunca sed en zsh
Correr git status antes de asumir que el cambio está en disco
Push a main = producción inmediata
Error Unexpected "." = .order().then() duplicado
Token GitHub expira — regenerar en https://github.com/settings/tokens/new (sin expiración, scope: repo)
Import duplicado → "symbol already declared" en build — verificar con grep antes de push

23. DECISIONES TÉCNICAS
Decisión | Motivo
Zustand sobre Context | Context re-renderizaba con 91+ leads
Domain layer separado | Lógica testeable sin Supabase ni React
constants.js como barrel | Compatibilidad migración gradual
normZona() en matching.js | "La Perla" causaba 0 matches
Precio matching 20% | 5% generaba 0 matches
toLowerCase() en pTipo | "Departamento" no matcheaba "depto"
python3 para editar JSX | sed en zsh falla con caracteres especiales
Auth Bearer en proxies | Sin token → 401 silencioso
Sentry solo PROD | enabled: import.meta.env.PROD
Notas tipadas en campo nota JSON | Sin migración de schema, compatible legacy
Incidents limitados a 3 | Más genera ruido inutilizable
Top 5 por score | Evita 25+ tareas automáticas
Edge Function cron diario | No depende de que alguien abra el CRM
tipo=null protege tareas manuales | Auto-cierre no toca tareas manuales
computeRanking multidimensional | Estrellas/prob no reflejaban operatividad real · 4 dimensiones + confianza separada
matchCount como parámetro externo | domain/lead.js puro — no importa properties, recibe matchCount del componente
LeadQualification sin Supabase directo | onUpdate del padre — componente desacoplado
Fondo CRM #dfe7ef (gris azulado mate) | antes #f4f7fb celeste claro — más integrado con sidebar azul ALBA
Paleta mate en /crm (#f2f6fa cards, #c7d3df bordes) | menos brillo, más descanso visual, coherente con #12355b azul ALBA
Línea lateral 4px en LeadCardPro | señal visual rápida de estado al ver "Todos" sin leer el badge
Filtros pills → selects | 11 pills en 2 filas → 2 selects compactos, misma lógica fs/fa
Ficha expandida única sin LeadCard | LeadCard demasiado oscuro, duplicaba información, no integraba con paleta mate
generarPedido(lead, formato) en LeadCardPro | texto listo para grupos WA generado desde datos reales del lead — 3 formatos
Calificación solo lectura en ficha expandida | LeadQualification pendiente integración — evitar duplicación hasta tener diseño definitivo
Acciones peligrosas abajo en ficha | Perdido/Eliminar en row final, no en header — evitar clics accidentales
Focus mode en LeadCardPro | opacity 0.38 en cards no activas — concentración operativa
HOME = Briefing fusionado | Dashboard duplicaba métricas y alertas — una sola pantalla de entrada
Home V8 sin scroll de página | maxHeight por sección + scroll interno — todo visible en viewport
vsAnterior retorna "—" si cur=0 | evita -100% engañoso cuando no hay actividad este mes
Kanban integrado en CRM | no es data distinta, es vista distinta — sidebar más limpio
loadNav filtra items obsoletos | parsed.filter(n => validIds.has(n.id)) — sin huecos si alguien tenía kanban guardado
LlamaHoyCard notas inline | panel expandible con CRUD completo, guarda directo a Supabase sin prop callback
skipWaiting+clientsClaim en PWA | nuevo SW toma control inmediato sin esperar cierre de tabs
computeLeadDemandWeight separado de computeRanking | ranking individual ≠ demanda agregada de mercado
Igualdad exacta en computeSupply | includes() generaba falsos positivos entre barrios distintos
last_contact_at null → dias null | dato faltante ≠ dato malo — no penalizar ni inflar leads históricos
"Negociacion" → "Negociación" corregido | bug histórico: detectIncident y getRecommendedAction nunca matcheaban etapa real
Módulo Oferta diferido | necesita más datos reales y validación de Oportunidades primero
matchesByLeadId memoizado | matchLeadProps era ~1080 calls/render → ahora ~94 (1 por lead) — Map reutilizado en sort, KPIs, leadsConMatchNuevo, LeadCardPro
minmax(0,1fr) en grid CRM | 1fr equivale a minmax(auto,1fr) y puede desbordar — 0 como mínimo previene overflow
