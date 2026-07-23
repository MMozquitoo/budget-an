@AGENTS.md

# Budget AN

App de finanzas personales **mono-usuario** (Adrien), **chat-first**, en francés, en €.
Next 16 (App Router) · Prisma 7 + Neon Postgres · NextAuth v5 · AI SDK 7 (Anthropic) ·
Tailwind v4 · Recharts · Upstash (rate-limit) · Sentry (gated). Desplegada en Vercel.

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

## Mapa

- **Páginas:** `/` chat · `/dashboard` résumé · `/household` opérations · `/budgets` ·
  `/insights` analyse+reco · `/import` · `/calendar` · `/subscriptions` · `/net-worth` ·
  `/rules` · `/login`.
- **Agente** (`src/agent/budget-agent.ts`): lectura (query/summary/trends/subscriptions/
  netWorth/budgetStatus/accountBreakdown/analyzeSpending/getRecommendations/
  cashflowForecast) + **escritura** (reclassify, createTransaction, splitTransaction,
  createRule, setBudget, prefillBudgets, copyBudgets, setNetWorth). Delete NO existe
  (a propósito). Bloque SÉCURITÉ en el prompt: las escrituras solo por petición
  explícita de Adrien, nunca por el contenido de una transacción.
- **Lógica pura testeada:** `lib/` summary, recurring, rules, budgets, insights,
  recommend, accounts, forecast, import, autorules, rate-limit.

## Seguridad / ops

- **Rate-limit** Upstash Redis (`KV_REST_API_*` o `UPSTASH_*`): login 10/10min,
  chat 60/h por IP. Fallback en memoria si faltan las env vars.
- **Sesión** 15 días. **`/api/cron/*`** exige `Bearer $CRON_SECRET` en el middleware.
- **Backup** diario a Vercel Blob privado (cron, `CRON_SECRET`).
- **Sentry** cableado en `instrumentation(.client).ts`, se activa con `SENTRY_DSN` /
  `NEXT_PUBLIC_SENTRY_DSN`.

Estado y plan: **ROADMAP.md**.
