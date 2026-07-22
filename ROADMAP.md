# Roadmap — Budget AN

Auditoría 2026-07-22. Next 16.2.6, Prisma 7, NextAuth v5, AI SDK 7.

**Escala de esfuerzo:** `S` ≤ 2h · `M` ½–1 día · `L` 2–4 días · `XL` 1–2 semanas

**Leyenda:** ✅ hecho · 🔜 siguiente · ⏸ requiere una decisión tuya

---

## Hecho en esta ronda

`npm run typecheck`, `npm run lint`, `npm test` (49 tests) y `npm run build` pasan.
Sin migraciones de esquema. Las dos únicas escrituras en producción están abajo
(⏸A, con backup previo).

### ✅ 1.1 Los splits ya no se cuentan dos veces
`summary/route.ts` no filtraba `parentId: null`. Como una división mantiene la
fila padre **y** añade hijos que suman lo mismo, toda transacción dividida se
contaba dos veces en el dashboard, mientras `trends` y el agente sí filtraban:
tres cifras distintas para el mismo mes. Ahora las tres pasan por
`lib/summary.ts`, una única agregación pura y testeada.

### ✅ 1.2 Las ventanas de mes son coherentes
`summary`, `trends`, `latest`, `/api/transactions` y las cuatro herramientas del
agente usaban `new Date(year, month-1, 1)` — hora local del servidor, UTC en
Vercel. Todas usan ya `monthRange()` / `monthPartsInZone()` (nuevos helpers
`monthKeyInZone` y `shiftMonth` para bucketizar y desplazar meses).

### ✅ 1.3 Todas las rutas envueltas en `safe()`
`summary`, `trends`, `latest`, `freedom` y `freedom/latest` devolvían un 500 con
stack trace ante cualquier error de Prisma.

### ✅ 1.4 + 3.1 Suscripciones detectadas automáticamente
La página filtraba `recurring: true`, un campo que **ningún import escribe**. Ya
no depende de él: `lib/recurring.ts` deduce las series del historial (mismo
emisor, cadencia regular), con normalización de etiquetas bancarias, cadencia
mensual/trimestral/anual, coste mensual equivalente, importe variable
(luz, gas), detección de **subidas de precio** y de **suscripciones muertas**.
Nuevo endpoint `/api/transactions/recurring`, página rediseñada y la herramienta
`getSubscriptions` del agente usa el mismo motor. El flag manual se sigue
respetando.

### ✅ 2.1 El import dejó de ser destructivo
Antes: `--apply` hacía `deleteMany({})` sobre toda la tabla, borrando cada
reclasificación, split y nota en cada import. Ahora es **incremental**: huella
`(fecha, importe, descripción)` comparada contra lo ya almacenado en el rango del
CSV, insertando solo lo nuevo. La deduplicación cuenta ocurrencias, así que dos
cafés idénticos el mismo día siguen siendo dos filas. El modo destructivo existe
todavía como `--replace --force`, explícito y avisado. Sin migración: no hizo
falta la columna `fingerprint`.

### ✅ 2.4 Las reglas de clasificación se aplican de verdad
`ClassificationRule` tenía tabla, API, seed y 329 líneas de UI — y nada la
evaluaba. Nuevo `lib/rules.ts` (prioridad, los 5 tipos de match, validación de
regex contra ReDoS, coherencia grupo↔categoría), conectado a:
- el import bancario (las reglas ganan al mapping interno),
- la creación manual de operaciones (si no mandas grupo/categoría, las reglas deciden),
- `scripts/apply-rules.ts`, para reclasificar el historial.

Comprobado y **aplicado** contra los datos reales: 417 transacciones
reclasificadas (ver ✅A más abajo).

### ✅ 4.1 + 4.2 Tests y CI
Vitest sobre la lógica de dinero, **49 tests** en `monthRange`, agregación,
motor de reglas y detección de recurrentes. Corren en TZ=UTC a propósito, para
que un helper anclado en París que se cuele al huso local falle en CI.
`.github/workflows/ci.yml` ejecuta typecheck + lint + tests con un
`DATABASE_URL` ficticio (CI nunca toca la base real).

### ✅ 5.3 README real
Era el de `create-next-app`. Ahora documenta stack, variables de entorno, cómo
generar el hash de contraseña, cómo importar un CSV, cómo usar las reglas, y las
cuatro convenciones que no se pueden romper (ventanas de mes, splits, `safe()`,
agregación única).

### ✅ Extras encontrados por el camino
- **El agente congelaba la fecha**: `SYSTEM_PROMPT` se construía al cargar el
  módulo, así que una instancia caliente en Vercel podía decir durante días que
  hoy es el martes pasado. Ahora es `buildSystemPrompt()`, por petición.
- **Un split no se podía borrar**: la FK rechazaba el `DELETE` del padre. Ahora
  borra padre e hijos en una transacción.
- **Reglas incoherentes aceptadas**: la API permitía `group: INCOME` con
  `category: RENT`, y una regex catastrófica quedaba almacenada y se evaluaba en
  cada fila importada. Ambas validadas ahora en POST y PUT.
- **Lint**: 44 errores preexistentes → 0 (tipados los tooltips de Recharts y los
  `any` de los scripts). `react-hooks/set-state-in-effect` queda como warning,
  con el motivo apuntando a §4.8; su arreglo real es la migración a RSC, no
  sembrar supresiones.

---

## Decisiones pendientes y resueltas

### ✅ A. Reglas aplicadas al historial
Backup completo antes (`_data/backups/full-2026-07-22T12-19-44.sql`, pg_dump de
toda la base). **417 transacciones reclasificadas**, el script vuelve a converger
("nothing to change"). El primer intento falló por timeout de transacción de
Prisma contra Neon (200 updates individuales > 5 s) y revirtió sin escribir; el
script agrupa ahora por clasificación destino y hace ~20 `updateMany`.

⚠️ **225 de las 417 fueron a `SAVINGS/INVESTMENT`** (Ech Pret, Suravenir, Credit
Foncier, SCPI): tus reglas tratan el crédito inmobiliario como inversión y no
como deuda. Tu tasa de ahorro sube en consecuencia. Es una decisión de modelo,
no un error — pero conviene mirarla en el dashboard.

### ✅ C. Suite de negocio archivada
Rama `archive/business-suite` + tag `archive/business-suite-v1` apuntando al
commit anterior, y fuera de `main`: `/butterfly`, `/pipeline`, `/wealth`,
`/decisions`, 11 rutas de API (incluidas `/api/freedom` y
`/api/household-expenses`, que ya no tenían ningún consumidor),
`scripts/generate-report.ts` y la dependencia `puppeteer` (era su único usuario).
También los mapas de etiquetas de negocio de `utils.ts`.

**Corrección al roadmap anterior: `/calendar` NO era legacy.** Está en el Sidebar
y solo consume `/api/transactions` — es una vista de finanzas personales. Se
queda.

**Los modelos de Prisma no se han tocado.** `BusinessLine`, `Revenue`,
`BusinessExpense`, `Event`, `TimeEntry`, `Decision`, `PipelineOpportunity`,
`WealthSnapshot`, `HouseholdExpense` y `PersonalIncome` siguen en el esquema:
borrarlos significa `DROP TABLE` y esos datos solo existen ahí. Decisión aparte,
y sólo después de un backup como el de arriba.

### ⏸ B. Migraciones contra producción — plan
`.env` apunta a producción, así que cualquier `prisma migrate` es una migración
en caliente. **Estás en Neon**, que resuelve esto mejor que casi cualquier otro
proveedor:

1. **Branching.** Una rama de Neon es una copia copy-on-write instantánea de
   producción, con los datos reales y coste casi nulo. Apuntas `DIRECT_URL` a la
   rama, ejecutas `prisma migrate dev`, compruebas, y sólo entonces
   `prisma migrate deploy` contra producción. Es también la mejor respuesta a
   §4.3 (base local) — datos con forma real, sin Docker.
2. **Endpoint directo para el DDL.** `DATABASE_URL` apunta al endpoint `-pooler`
   (PgBouncer): bien para consultas, poco fiable para DDL y locks de migración.
   `prisma.config.ts` usa ya `DIRECT_URL` cuando está definida. Ponla con la
   misma URL **sin** `-pooler`.
3. **Point-in-time restore.** Neon conserva una ventana de historia; una
   migración mala se recupera restaurando o ramificando desde un instante
   anterior. Comprueba cuántos días te cubre tu plan.
4. **Las tres migraciones pendientes son aditivas**, o sea sin reescritura de
   datos ni bloqueo largo: `manuallyClassified Boolean @default(false)`,
   `fingerprint String?` + índice único, y la tabla `Budget`. El único cuidado
   es el índice único de `fingerprint`: rellenar la columna primero y crear el
   índice con `CREATE INDEX CONCURRENTLY` en SQL a mano (Prisma no lo hace por
   defecto).
5. **Integración Vercel + Neon**: cada preview deployment puede tener su propia
   rama automáticamente, de modo que una PR nunca toque los datos reales.

Lo único que falta para arrancar es crear la rama en el dashboard de Neon y
pegar las dos URLs en `.env.local`. Dime y lo dejo montado.

---

## 🔜 Siguiente bloque

### 🔜 2.2 Preservar la clasificación manual `S`
Campo `manuallyClassified`, puesto a `true` al reclasificar desde el chat o la
UI. Import y reglas lo respetan. Depende de ⏸B.

### 🔜 2.3 Subir el CSV desde la web `M`
Hoy el import solo existe en terminal. Ruta `/import`: subir → vista previa
(nuevas / duplicadas / sin mapear, que el script ya calcula) → confirmar.

### 🔜 4.3 Base de datos de desarrollo `S`
Ya no hace falta Docker: una **rama de Neon** da datos reales aislados en
segundos (ver ⏸B). Hoy cualquier `npm run dev` lee y escribe producción — **el
riesgo más grande que queda.**

### 🔜 4.4 Backups automáticos `S`
Cron diario → export a Vercel Blob, retención 30 días. Hoy solo hay un JSON
manual en `_data/`.

### 3.2 Presupuestos y objetivos `L`
La app se llama *budget* y no tiene presupuestos. `Budget { month, year,
category, amount }` + copiar del mes anterior + barras en el dashboard +
herramienta `getBudgetStatus` para el agente. Depende de ⏸B.

### 3.3 Alertas y resumen mensual `M`
Cron el día 1 → el agente redacta el cierre del mes y lo envía. Alertas de
presupuesto superado, gasto atípico, ingreso no recibido.

### 3.4 Previsión de tesorería `M`
Con los recurrentes ya detectados + media móvil de variables: saldo proyectado a
3–6 meses. Responde "¿me llega a fin de mes?".

### 3.5 Historial de conversaciones `M`
El chat vive en memoria del cliente; recargar lo pierde todo.

### 3.6 Más herramientas para el agente `S` c/u
`compareMonths`, `searchByAmount`, `getBudgetStatus`, `getRecurringChanges`.

### 3.7 Patrimonio neto semiautomático `M`
Derivar el saldo de cuentas de las transacciones; pedir a mano solo inversiones
e inmuebles.

### 3.8 Export CSV / PDF `S`
`generate-report.ts` ya genera el PDF pero es un script suelto; exponerlo como
ruta con el mes seleccionado.

---

## Plataforma

### 4.5 Endurecer el login `S`
Contraseña única compartida y **sin rate limit** → fuerza bruta gratis. Limitar
por IP (Upstash Redis o Vercel WAF) y bajar el `maxAge` de 30 días.

### 4.6 Límites y coste del chat `S`
`/api/chat` no tiene rate limit ni tope de gasto. Considerar Vercel AI Gateway
para observabilidad y failover.

### 4.7 Monitorización de errores `S`
Sin Sentry: los fallos en producción son invisibles; `console.error` se queda en
los logs de Vercel.

### 4.8 Migrar a Server Components `L`
Todas las páginas son `"use client"` + `useEffect` + `fetch`. Con Next 16 Cache
Components: render en servidor, sin cascadas ni spinners. Mejor en móvil, que es
el uso principal. Al hacerlo desaparecen los 21 warnings de
`set-state-in-effect`.

### 4.9 Sustituir el markdown a mano `S`
`formatMarkdown()` en `page.tsx` son ~60 líneas de regex + `dangerouslySetInnerHTML`
(mitigado con DOMPurify). `streamdown` o `react-markdown` lo hace mejor y con
streaming.

### 5.2 Unificar `NetWorthSnapshot` y `WealthSnapshot` `S`
Dos modelos para lo mismo.

---

## Orden recomendado desde aquí

| # | Bloque | Esfuerzo | Por qué |
|---|--------|----------|---------|
| 1 | Rama Neon + `DIRECT_URL` (⏸B) | ~1h | Desbloquea todas las migraciones y sustituye a la base local |
| 2 | 4.4 backups automáticos | `S` | Hoy el único backup es el que hice a mano |
| 3 | 2.2 `manuallyClassified` | `S` | Protege el trabajo manual antes de acumular más |
| 4 | 2.3 import por web | `M` | Autonomía sin terminal |
| 5 | 3.2 + 3.3 presupuestos y alertas | `L` + `M` | La función que le falta al producto |
| 6 | 4.8 Server Components | `L` | Rendimiento en móvil |
