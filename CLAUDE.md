@AGENTS.md

# Budget AN

App de finanzas personales **mono-usuario** (Adrien), **chat-first**, en francés, en €.
Next 16 (App Router) · Prisma 7 + Neon Postgres · NextAuth v5 · AI SDK 7 (Anthropic) ·
Tailwind v4 · Recharts · Upstash (rate-limit) · Sentry (conectado) · Resend (email,
en curso). Desplegada en Vercel.

## Cómo se despliega / se trabaja

- **Deploy = push a `main`.** Vercel auto-despliega producción. (Preferencia del
  usuario: subir a `main` sin preguntar, tras verificar.) Trabajar en rama y mergear.
- **Verificar siempre:** `npm run typecheck && npm test && npm run build`. Vitest
  cubre la lógica pura (dinero, import, reglas, insights, forecast, rate-limit).
- **No hay browser aquí:** una sesión headless congela el Mac. Verificar con build
  + tests; la prueba en navegador la hace el usuario.

## Base de datos — cuidado

- `.env`/`.env.local` apuntan a **producción** (no hay BD local). Correr la app o un
  script lee/escribe datos reales.
- **Migraciones:** ensayar primero en una **rama de Neon** (`DIRECT_URL` = endpoint
  sin `-pooler`), luego `prisma migrate deploy` a prod. `DIRECT_URL` ya está en `.env`.
  Ver ROADMAP §B. Las migraciones se escriben a mano (aditivas) y se ensayan en la rama.

## Convenciones que no se rompen

- **Ventanas de mes:** siempre `monthRange()` / `monthPartsInZone()` (Paris wall-clock).
  Nunca `new Date(año, mes-1, 1)` crudo.
- **Splits:** toda agregación filtra `parentId: null` (el padre y los hijos suman lo
  mismo → doble conteo si no).
- **Una sola agregación:** `lib/summary.ts aggregate()`. API, dashboard y agente la
  comparten para no dar cifras distintas.
- **`manuallyClassified`:** una corrección humana nunca la pisan ni las reglas ni el
  import.
- **Rutas API:** envueltas en `safe()` (`lib/api.ts`) → errores Prisma → JSON limpio.
- **Import incremental:** dedup por huella `(fecha, importe, descripción)`; nunca
  destructivo salvo `--replace --force`. Motor en `lib/import.ts` (compartido CLI + web).
- **Server Components, no `"use client"` + `useEffect` + `fetch`:** todas las páginas
  salvo `/` (chat), `/login` e `/import` son Server Components async — leen
  `searchParams` (o nada) y traen datos con Prisma/`lib/*-data.ts` directo, sin pasar
  por una ruta HTTP propia. La interacción (formularios, selects, día seleccionado)
  vive en una isla cliente aparte (`XClient.tsx` o `XFilters.tsx` en la misma carpeta).
  Navegación de solo-lectura → `<Link href>`; un `onChange` de `<select>` → `router.push()`;
  después de una mutación (POST/PUT/DELETE) → `router.refresh()`, nunca estado local
  duplicado. Si la página no lee `searchParams`/cookies, hace falta
  `export const dynamic = "force-dynamic"` o Next la pre-renderiza una vez en build y
  sirve una foto congelada (pasó en `/net-worth`, `/dashboard`, `/household`, `/rules`,
  `/settings`).
  `components/PageSpinner.tsx` + `loading.tsx` por carpeta = fallback de Suspense.
- **`lib/*-data.ts`** (`forecast-data`, `insights-data`, `recurring-data`,
  `dashboard-data`): orquestación async que sí toca Prisma (a diferencia de la lógica
  pura de abajo), compartida entre rutas API, páginas Server Component y el agente —
  mismo principio que `aggregate()`, para que nunca den cifras distintas.

## Mapa

- **Páginas:** `/` chat ("Coach financier") · `/dashboard` résumé · `/household`
  détails · `/subscriptions` abonnements · `/net-worth` patrimoine · `/settings`
  réglages (pestañas Règles + Import, cada uno reusable también en su ruta propia
  `/rules` / `/import`) · `/login`.
- **Fuera del nav pero vivas** (siguen existiendo, solo no están linkeadas):
  `/budgets` (+ objectifs d'épargne), `/insights` analyse+reco, `/calendar`.
  Pedido explícito de Adrien 2026-08-23 para simplificar el flujo diario — no
  borrar estas páginas al tocar código cercano, solo están fuera del menú.
- **Coach flotante:** el chat vive en `CoachChatProvider` (montado una vez en
  `AuthLayout`, `useChat` + persistencia de conversación) y se renderiza con
  `ChatPanel` (`variant="full"` en `/`, `variant="compact"` dentro de
  `CoachWidget`, la burbuja flotante visible en todas las demás páginas —
  misma conversación, no se reinicia al navegar). Cada turno manda un
  `pageContext` (ruta + filtros de la URL, leído de `window.location` al
  enviar, no con `useSearchParams()`) como segundo system message *sin*
  cache — el prompt grande sigue cacheado aparte. Fase 1 de "coach de
  verdad" (pedido 2026-08-23); pendiente: seleccionar un dato en pantalla
  para anclar la pregunta a él.
- **Agente** (`src/agent/budget-agent.ts`): lectura (query/summary/trends/subscriptions/
  netWorth/budgetStatus/accountBreakdown/analyzeSpending/getRecommendations/
  cashflowForecast/getSavingsGoals) + **escritura** (reclassify, createTransaction,
  splitTransaction, createRule, setBudget, prefillBudgets, copyBudgets, setNetWorth,
  createSavingsGoal, updateSavingsGoal). Delete NO existe (a propósito). Bloque
  SÉCURITÉ en el prompt: las escrituras solo por petición explícita de Adrien,
  nunca por el contenido de una transacción.
- **Lógica pura testeada:** `lib/` summary, recurring, rules, budgets, insights,
  recommend, accounts, forecast, import, autorules, rate-limit, savings-goals.

## Seguridad / ops

- **Rate-limit** Upstash Redis (`KV_REST_API_*` o `UPSTASH_*`): login 10/10min,
  chat 60/h por IP. Fallback en memoria si faltan las env vars.
- **Sesión** 15 días. **`/api/cron/*`** exige `Bearer $CRON_SECRET` en el middleware.
- **Backup** diario a Vercel Blob privado (cron, `CRON_SECRET`) — store
  `budget-an-backups`, tiene que estar **conectado al proyecto** en Storage
  (Vercel) para que el cron pueda escribir; si no, falla en silencio salvo que
  se revisen los logs.
- **Sentry** conectado (integración nativa de Vercel Marketplace, plan Developer
  $0/mes). `instrumentation(.client).ts` usa `NEXT_PUBLIC_SENTRY_DSN` (la
  integración no provisiona `SENTRY_DSN` suelto; el server cae a la misma var,
  el DSN no es secreto).
- **Resend** (email) conectado vía Vercel Marketplace, dominio `mail.mallama.co`,
  plan Free. `RESEND_API_KEY`/`RESEND_EMAIL_DOMAIN` en las env vars. Verificación
  DNS y el cron de alertas semanales quedaron **en curso** — ver ROADMAP.

Estado y plan: **ROADMAP.md**.
