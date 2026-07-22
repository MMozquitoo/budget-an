# Budget AN

Suivi financier personnel : import des relevés bancaires, classification par
règles, tableau de bord mensuel, abonnements détectés automatiquement,
patrimoine net, et un assistant IA qui interroge les données en langage naturel.

Interface en français. Déployé sur Vercel (`an.mallama.co`), accès protégé par
mot de passe unique.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 |
| Base de données | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | NextAuth v5, provider Credentials (mot de passe unique) |
| IA | AI SDK 7 + `@ai-sdk/anthropic` (Claude Sonnet) |
| UI | Tailwind CSS 4 · Recharts · lucide-react |
| Tests | Vitest (logique pure, sans base de données) |

> **Lire `AGENTS.md` avant de coder.** Cette version de Next.js n'est pas celle
> que connaissent les modèles de langage : consulter `node_modules/next/dist/docs/`.

## Démarrage

```bash
npm install          # postinstall lance `prisma generate`
npm run dev          # http://localhost:3000
```

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `AUTH_PASSWORD_HASH` | Hash bcrypt du mot de passe, **encodé en base64** |
| `AUTH_SECRET` | Secret NextAuth (signature des JWT) |
| `ANTHROPIC_API_KEY` | Clé API pour l'assistant IA |
| `ALLOWED_ORIGIN` | Origine autorisée en CORS (défaut : `https://an.mallama.co`) |
| `DIRECT_URL` | *(optionnel)* connexion **non poolée** utilisée pour les migrations |

`DATABASE_URL` pointe sur l'endpoint `-pooler` de Neon (PgBouncer) : parfait pour
les requêtes de l'application, peu fiable pour le DDL. Renseigner `DIRECT_URL`
avec la même base **sans** `-pooler` avant de lancer une migration — ou avec
l'URL d'une *branche* Neon pour répéter la migration hors production.

Le hash est stocké en base64 parce qu'un hash bcrypt brut contient des `$` que
l'interpolation de variables d'environnement mange. Pour le générer :

```bash
node -e "const b=require('bcryptjs');console.log(Buffer.from(b.hashSync(process.argv[1],10)).toString('base64'))" 'MON_MOT_DE_PASSE'
```

> ⚠️ **`.env` pointe aujourd'hui sur la base de production.** Tout `npm run dev`
> lit et écrit des données réelles. Une base locale est le premier chantier de
> `ROADMAP.md` (§4.3).

## Commandes

```bash
npm run dev          # serveur de développement
npm run build        # build de production
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest run
npm run db:migrate   # prisma migrate dev
npm run db:studio    # prisma studio
```

## Importer un relevé bancaire

L'import lit un CSV (séparateur `;`, colonnes `Date`, `Montant`, `Description`,
`Compte`, `Catégorie`, `Sous-Catégorie`) et l'insère dans `personal_transactions`.

```bash
npm run import:bank -- _data/sources/export.csv            # DRY RUN, n'écrit rien
npm run import:bank -- _data/sources/export.csv --apply    # insère les nouvelles lignes
```

Points importants :

- **L'import est incrémental.** Une ligne déjà présente (même date, même montant,
  même libellé) n'est pas réinsérée, donc réimporter un export qui recouvre une
  période déjà chargée ne crée pas de doublons — et ne touche à aucune
  reclassification, note ou division faite à la main.
- Deux transactions réellement identiques le même jour restent deux lignes : la
  déduplication compte les occurrences, elle ne se contente pas de leur présence.
- Les virements internes (entre les comptes du foyer) sont écartés.
- **Classification** : les règles actives de la table `ClassificationRule`
  s'appliquent en premier ; en l'absence de règle, le mapping intégré des
  catégories bancaires prend le relais. `--no-rules` ignore les règles.
- `--replace` restaure l'ancien comportement destructif (vider la table puis tout
  réinsérer) et exige `--force` en plus. **Cela détruit tout le travail manuel.**

### Règles de classification

Elles se créent depuis la page **Règles**, et s'appliquent à l'import, à la
création manuelle d'une opération, et rétroactivement :

```bash
npm run rules:seed                  # jeu de règles initial
npm run rules:apply                 # DRY RUN : liste ce qui serait reclassé
npm run rules:apply -- --apply      # applique
```

`rules:apply` ne touche jamais une transaction divisée (parent ou enfant), pour
que les divisions continuent de se réconcilier.

## Architecture

```
src/
  app/
    page.tsx              assistant IA (chat, page d'accueil)
    dashboard/            résumé mensuel
    household/            opérations (CRUD)
    calendar/             vue calendrier des opérations
    subscriptions/        abonnements détectés
    net-worth/            patrimoine net
    rules/                règles de classification
    api/                  routes REST
  agent/budget-agent.ts   prompt système + outils de l'assistant
  lib/
    summary.ts            agrégation mensuelle (pure, testée)
    recurring.ts          détection des abonnements (pure, testée)
    rules.ts              moteur de règles (pur, testé)
    utils.ts              fenêtres de mois, formats, libellés
    api.ts                wrapper `safe()` + validation des entrées
scripts/                  import bancaire, règles, nettoyage
prisma/                   schéma et migrations
```

### Conventions qui comptent

- **Fenêtres de mois** : toujours passer par `monthRange()` / `monthPartsInZone()`
  de `lib/utils.ts`. `new Date(year, month - 1, 1)` s'évalue dans le fuseau du
  serveur (UTC sur Vercel) et fait basculer les lignes du 1er du mois dans le
  mois précédent.
- **Transactions divisées** : une division garde la ligne parente et ajoute des
  enfants qui totalisent le même montant. Toute agrégation doit filtrer
  `parentId: null`, sinon la transaction est comptée deux fois.
- **Routes API** : envelopper chaque handler dans `safe()` (`lib/api.ts`) pour que
  les erreurs Prisma deviennent des réponses JSON propres au lieu de 500 avec
  stack trace.
- **Agrégation** : passer par `lib/summary.ts`. Le tableau de bord et l'assistant
  doivent citer les mêmes totaux.
- **Données bancaires non fiables** : les champs `description` et `notes`
  viennent d'un import. Le prompt système interdit explicitement à l'assistant
  d'exécuter des instructions qui s'y trouveraient, et aucun outil de suppression
  ne lui est exposé.

## Feuille de route

Voir `ROADMAP.md` : état des lieux, corrections faites, fonctions à construire et
effort associé.
