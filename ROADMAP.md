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

Cobertura: **102 tests** sobre la lógica de dinero/import/reglas/insights/rate-limit.

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

Pendiente:
- **Sentry** — código cableado y *gated por DSN*; falta **crear el proyecto Sentry
  y añadir `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`** (como se hizo con Upstash). `S`

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

1. **Objectifs d'épargne con fecha** `M` — hoy el objetivo es mensual por
   categoría; falta la variante acumulada *"juntar 10k para diciembre"* con
   seguimiento a la meta (esquema `SavingsGoal` + migración + UI + tool de chat).
2. **Migrar a Server Components** `L`–`XL` — todas las páginas son
   `"use client"` + `useEffect` + `fetch`. Migrarlas a RSC (con islas cliente
   para la interacción) quita las cascadas de spinners y los ~21 warnings de
   `set-state-in-effect`. Es el refactor más grande y con más riesgo; conviene
   hacerlo **página por página**, no de golpe. En una app mono-usuario que ya
   funciona, es polish de rendimiento, no bloqueante.

---

## Orden recomendado desde aquí

| # | Bloque | Esfuerzo | Por qué |
|---|--------|----------|---------|
| 1 | Conectar Sentry (crear proyecto + DSN) | `S` | Visibilidad de errores en prod, ahora que el agente escribe |
| 2 | Objectifs d'épargne con fecha | `M` | Cierra la feature de ahorro |
| 3 | Server Components, página por página | `L`–`XL` | Rendimiento en móvil; hacerlo incremental |
| 4 | Decidir canal de **Alertes** y activarlo | `M` | El peldaño 4 de la escalera; el motor ya está |
| 5 | (Estratégico) Sync bancario y/o Suite pro | `XL` | Requieren tu decisión/cuenta |
