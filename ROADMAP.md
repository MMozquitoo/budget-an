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
| **Server Components (RSC)** | Las 8 páginas (`/subscriptions`, `/calendar`, `/insights`, `/net-worth`, `/dashboard`, `/household`, `/budgets`, `/rules`) migradas de `"use client"` + `useEffect`/`fetch` a Server Components, con islas cliente (`router.push`/`router.refresh`) solo donde hace falta interacción real. Sin cascadas de spinners. Nuevos módulos compartidos `lib/recurring-data.ts` y `lib/dashboard-data.ts`. |
| **Trésorerie court terme** (2026-08-30) | Nuevo onglet `/treasury`: cash disponible (comptes courants + livrets - découverts - encours carte), saisie manual mensual, comparaisons M-1/M-3 en €/%, tendance 3 mois, courbe 6 mois. Distinto de `/net-worth` a propósito (`CashSnapshot`), mismo patrón (formulario, API, tool de chat `setCashSnapshot`/`getTreasury`). **Pendiente:** el snapshot de fin de agosto queda por saisir a mano (no reconstruible desde las transacciones), y la migración `add_cash_snapshots` por desplegar a prod (`prisma migrate deploy`). |

Cobertura: **114 tests** sobre la lógica de dinero/import/reglas/insights/rate-limit/objectifs.

---

## ⏳ En curso — retomar aquí (2026-07-25)

- **Alertes por email** `M` — decisión tomada: **email**, cadencia **semanal
  (lunes por la mañana)**. Contenido: reutilizar `computeInsights()`
  (`lib/insights-data.ts`) tal cual, ya trae recomendaciones + tendencia de
  ahorro + oportunidad total.
  - ✅ Integración **Resend** provisionada vía Vercel Marketplace (plan Free,
    región `us-east-1`), dominio `mail.mallama.co`. `RESEND_API_KEY` /
    `RESEND_EMAIL_DOMAIN` ya en las env vars de Vercel.
  - ⏳ **Verificación DNS pendiente** — el DNS de `mallama.co` es de un
    proveedor externo (no Vercel), así que Vercel no pudo auto-agregar los
    registros. Se generaron y se le pasaron a Adrien en un `.txt`
    (3 registros: TXT DKIM en `resend._domainkey.mail`, MX + TXT SPF en
    `send.mail` — apuntando a `amazonses.com`). Falta que los agregue en su
    proveedor DNS real y confirmar el estado (`GET
    https://api.resend.com/domains/720f37b6-0dce-4a88-88c1-7a0f7d35d444` con
    `RESEND_API_KEY`, o `vercel integration guide resend`).
  - ⏳ **Falta el email destinatario** de Adrien — sin esto no se puede
    escribir el `to:` del envío.
  - ⏳ **Código sin escribir todavía**: `src/app/api/cron/alerts/route.ts`
    (mismo patrón que `src/app/api/cron/backup/route.ts` — `Bearer
    $CRON_SECRET`, dejado pasar por el middleware), entrada en `vercel.json`
    `crons` (`"schedule": "0 8 * * 1"` = lunes 08:00 UTC), plantilla de email
    (HTML simple, en francés, con las recomendaciones + link a `/insights`),
    `npm install resend`.

- **Posibles duplicados en `PersonalTransaction`** — auditoría de datos del
  2026-07-25 encontró 4 pares de transferencias idénticas (misma
  fecha+monto+descripción, mismo `createdAt` de import) que podrían ser
  duplicados reales del CSV fuente, o dos transferencias legítimas el mismo
  día (el dato solo tiene precisión de día, no de hora):
  - 17/12/2024 — "Adrien Naeem Sg Sent From" €5.000 ×2 (cuenta N26)
  - 17/12/2024 — "Eric Popov Sent From" €5.000 ×2 (cuenta N26)
  - 28/03/2025 — "To Adrien Naeem" €5.000 ×2 (cuenta Revolut)
  - 28/03/2025 — "To Adrien Naeem" €15.000 ×2 (cuenta Revolut)

  Pendiente de que Cristian confirme con Adrien cuáles (si alguna) son
  duplicado real. No se toca nada sin esa confirmación explícita, par por par.

- **Hueco de noviembre 2025** en las tablas dormidas (`HouseholdExpense`/
  `BusinessExpense`, no leídas por la app hoy) — documentado, no accionable:
  la fuente (`/Users/cristian/Downloads/BUDGET/...`, un import de siembra de
  una sola vez) ya no existe en disco para re-verificar. Solo relevante si se
  decide activar esas tablas (ver "Suite pro" abajo).

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

- **Sync bancaire automatique** `XL` — abrir cuenta en un agregador europeo
  (GoCardless / Powens) + KYC + claves. La dedup por huella ya está escrita y se
  reutiliza. El de mayor "wow".
- **Suite pro & patrimoine unifiés** `XL` — dar vía de lectura a las 8 tablas de
  negocio dormidas (Revenue, Event, Pipeline, TimeEntry, Decision, WealthSnapshot).
  Casi un segundo producto; decisión estratégica.

---

## 🛠️ Técnico que queda (sin dependencias externas)

Ninguno por ahora — el único pendiente (migración a Server Components) se
completó el 2026-07-25. Ver la fila **Server Components (RSC)** en
"Entregado y en producción" arriba para el detalle página por página
(orden: `/subscriptions` → `/calendar` → `/insights` → `/net-worth` →
`/dashboard` → `/household` → `/budgets` → `/rules`, cada una auditada antes
de mergear). Único hallazgo real de toda la serie: un bug (no de seguridad)
en `/budgets` — `sp.month ? Number(sp.month) : fallback` evaluaba el string
en vez del número, así que `?month=abc` producía `NaN` y reventaba la página
sin capturar (no hay `error.tsx` en la app) — corregido antes de mergear.

---

## Orden recomendado desde aquí

| # | Bloque | Esfuerzo | Por qué |
|---|--------|----------|---------|
| ~~1~~ | ~~Conectar Sentry~~ | `S` | ✅ Hecho 2026-07-24 |
| ~~2~~ | ~~Objectifs d'épargne con fecha~~ | `M` | ✅ Hecho 2026-07-24 |
| ~~3~~ | ~~Server Components, página por página~~ | `L`–`XL` | ✅ Hecho 2026-07-25 (8/8 páginas) |
| 4 | Decidir canal de **Alertes** y activarlo | `M` | El peldaño 4 de la escalera; el motor ya está |
| 5 | (Estratégico) Sync bancario y/o Suite pro | `XL` | Requieren tu decisión/cuenta |
