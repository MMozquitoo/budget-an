# Roadmap — Budget AN

Actualizado 2026-07-23. Next 16.2.6, Prisma 7, NextAuth v5, AI SDK 7.
Escala de esfuerzo: `S` ≤ 2h · `M` ½–1 día · `L` 2–4 días · `XL` 1–2 semanas.

Este documento recoge **todo lo acordado**: lo entregado, la postura de
seguridad, lo parcado por decisión, y el trabajo técnico que queda.

---

## ✅ Entregado y en producción

Escalera de producto de Adrien — **reporting → analyse → recommandation** (falta
solo *alerting*, parcado) — más la autonomía y la memoria.

| Feature | Qué hace |
|---|---|
| **Budgets par catégorie** | Presupuesto por categoría/mes, pre-relleno 6–9 meses, traspaso mes a mes, objetivos de ahorro mensuales, progresión en `/budgets` y dashboard. API + herramientas de chat. |
| **Analyse** (`/insights`) | Movimientos por categoría vs media móvil, tendencia del taux d'épargne. |
| **Recommandation** | Motor priorizado: dépassements, abos morts, hausses de prix, dépenses atypiques, épargne en baisse — con impacto en €/mes. |
| **Patrimoine détaillé** | Composición apilada de activos, asignación actual, ratio deuda/activos. |
| **Multi-comptes** | Cuenta parseada desde `notes`, desglose por cuenta (`/api/accounts`, tarjeta dashboard, tool de chat). |
| **Auto-règles** | Minador de correcciones manuales repetidas → reglas sugeridas en `/rules`. |
| **Assistant qui agit** | El chat escribe: crear/dividir transacción, crear regla, fijar/pre-rellenar/copiar presupuesto, anotar patrimonio (delete queda fuera, a propósito). |
| **Prévision de trésorerie** | Saldo proyectado a N meses desde el flujo neto medio; alerta de saldo negativo. |
| **Mémoire du chat** | Conversaciones persistidas (esquema + migración), panel "Historique", reanudar/borrar hilos. |
| **Import depuis le navigateur** | Subir CSV → aperçu (nuevas/duplicadas/no mapeadas) → confirmar. Incremental, no destructivo. Motor compartido con el CLI. |
| **Chat UX** | Markdown real (react-markdown), input multilínea (Enter envía / Shift+Enter salto). |
| **Objectifs d'épargne avec date** | Montant cible + fecha límite, seguimiento acumulado (no mensual) derivado de las transacciones de ahorro (categoría elegida o todo el grupo). Sección en `/budgets` + herramientas de chat. |

Cobertura: **114 tests** sobre la lógica de dinero/import/reglas/insights/rate-limit/objectifs.

---

## 🔒 Postura de seguridad (auditoría 2026-07-23)

Hecho:
- **Rate-limit** con **Upstash Redis** (cross-instance): login 10/10 min por IP,
  chat 60/hora por IP (tope de coste). Fallback en memoria si faltan las env vars.
- **Sesión** `maxAge` 15 días.
- **`/api/cron/*`** exige `Bearer $CRON_SECRET` en el edge (no confía solo en la ruta).
- **Import** acotado (2 MB / 20 000 filas). **Conversaciones** acotadas (1000 msg / 100 KB c/u).
- **Anti-inyección** reforzado: las herramientas de escritura del agente solo se
  activan por petición explícita de Adrien, nunca por el contenido de una transacción.

Hecho (2026-07-24):
- **Sentry** — integración nativa de Vercel Marketplace (plan Developer, $0/mes),
  conectada al proyecto. Provisiona `NEXT_PUBLIC_SENTRY_DSN` (no `SENTRY_DSN`
  suelto); `instrumentation.ts` cae a esa var en servidor/edge ya que el DSN no
  es secreto.

---

## ⏸ Parcado — requiere una decisión o cuenta tuya

- **Alertes qui te préviennent** `M` — el motor de recomendaciones ya calcula el
  contenido; falta **elegir canal** (WhatsApp/Telegram/email) + un cron. Cobra
  sentido junto al sync bancario.
- **Sync bancaire automatique** `XL` — abrir cuenta en un agregador europeo
  (GoCardless / Powens) + KYC + claves. La dedup por huella ya está escrita y se
  reutiliza. El de mayor "wow".
- **Suite pro & patrimoine unifiés** `XL` — dar vía de lectura a las 8 tablas de
  negocio dormidas (Revenue, Event, Pipeline, TimeEntry, Decision, WealthSnapshot).
  Casi un segundo producto; decisión estratégica.

---

## 🛠️ Técnico que queda (sin dependencias externas)

1. **Migrar a Server Components** `L`–`XL` — todas las páginas son
   `"use client"` + `useEffect` + `fetch`. Migrarlas a RSC (con islas cliente
   para la interacción) quita las cascadas de spinners y los ~21 warnings de
   `set-state-in-effect`. Es el refactor más grande y con más riesgo; se hace
   **página por página**, no de golpe.
   - ✅ `/subscriptions` (2026-07-24) — primera página, la de menor riesgo
     (una sola lectura, sin formularios; el toggle "mostrar inactivos" pasó a
     ser un `<Link>` por query-string). Lógica compartida extraída a
     `lib/recurring-data.ts` (mismo patrón que `forecast-data.ts`/
     `insights-data.ts`). Spinner compartido en `components/PageSpinner.tsx`
     + `loading.tsx` para el fallback de Suspense.
   - ✅ `/calendar` (2026-07-25) — segunda página; introduce el patrón que
     faltaba: RSC shell (navegación de mes por `<Link>`, `searchParams`) +
     **isla cliente** (`CalendarClient.tsx`) para la selección de día, que
     necesita estado real pero cero fetch extra (las transacciones del mes ya
     llegan por props).
   - ✅ `/insights` (2026-07-25) — tercera página, la más simple (puro
     display, sin estado por ítem); usa `computeInsights()` ya existente en
     `lib/insights-data.ts`, sin extraer nada nuevo. Introduce el sub-patrón
     de filtro por `router.push()` (`InsightsFilters.tsx`) para el `<select>`/
     `<input>` de mes-año, distinto de `<Link>` porque un `onChange` no es un
     clic.
   - ✅ `/net-worth` (2026-07-25) — cuarta página, primera con mutaciones
     reales (agregar/borrar snapshot) y con un gráfico Recharts (necesita
     cliente por el DOM). `NetWorthClient.tsx` cambia el viejo
     `fetchData()` tras cada mutación por `router.refresh()` — el server
     vuelve a renderizar con datos frescos, sin estado local duplicado.
     Encontrado en verificación: sin `searchParams` no había señal de
     per-request para Next, así que la página se pre-renderizaba en build
     (`○`) y habría servido una foto congelada; `export const dynamic =
     "force-dynamic"` lo corrigió (confirmado `○` → `ƒ` en el build).
   - ✅ `/dashboard` (2026-07-25) — quinta y más grande: la página más tres
     cards (`BudgetProgressCard`, `AccountBreakdownCard`, `ForecastCard`) que
     cada una hacía su propio fetch — la cascada de spinners literal que
     motivó este ítem del roadmap. Nuevo `lib/dashboard-data.ts` extrae 5
     funciones (`getLatestMonth`/`getMonthSummary`/`getMonthlyTrends`/
     `getBudgetReport`/`getAccountBreakdown`) de sus rutas API respectivas
     (mismo patrón que `forecast-data.ts`), ahora todo se resuelve en un solo
     `Promise.all` server-side. Las 3 cards perdieron `"use client"` del
     todo (no tenían ninguna interacción propia). También `force-dynamic`
     (mismo motivo que `/net-worth`).
   - Quedan las de CRUD inline (`/household`, `/budgets`, `/rules`) — las
     de mayor riesgo, al final a propósito.
   En una app mono-usuario que ya funciona, es polish de rendimiento, no
   bloqueante.

---

## Orden recomendado desde aquí

| # | Bloque | Esfuerzo | Por qué |
|---|--------|----------|---------|
| ~~1~~ | ~~Conectar Sentry~~ | `S` | ✅ Hecho 2026-07-24 |
| ~~2~~ | ~~Objectifs d'épargne con fecha~~ | `M` | ✅ Hecho 2026-07-24 |
| 3 | Server Components, página por página | `L`–`XL` | Rendimiento en móvil; hacerlo incremental |
| 4 | Decidir canal de **Alertes** y activarlo | `M` | El peldaño 4 de la escalera; el motor ya está |
| 5 | (Estratégico) Sync bancario y/o Suite pro | `XL` | Requieren tu decisión/cuenta |
