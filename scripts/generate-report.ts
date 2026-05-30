import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_PATH = path.join(__dirname, "..", "public", "Budget_AN_Report_Adrien_Naeem.pdf");

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1f2937; line-height: 1.6; padding: 50px 60px; font-size: 11pt; }
  h1 { font-size: 28pt; font-weight: 700; color: #312e81; margin-bottom: 4px; }
  h2 { font-size: 16pt; font-weight: 600; color: #4338ca; margin-top: 32px; margin-bottom: 12px; border-bottom: 2px solid #e0e7ff; padding-bottom: 6px; }
  h3 { font-size: 12pt; font-weight: 600; color: #1f2937; margin-top: 18px; margin-bottom: 8px; }
  p { margin-bottom: 10px; }
  .subtitle { font-size: 13pt; color: #6b7280; margin-bottom: 30px; }
  .date { font-size: 10pt; color: #9ca3af; }
  .highlight { background: #eef2ff; border-left: 4px solid #6366f1; padding: 12px 16px; margin: 14px 0; border-radius: 0 8px 8px 0; }
  .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 14px 0; border-radius: 0 8px 8px 0; }
  .kpi-row { display: flex; gap: 16px; margin: 16px 0; }
  .kpi { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center; }
  .kpi .value { font-size: 20pt; font-weight: 700; color: #312e81; }
  .kpi .label { font-size: 9pt; color: #6b7280; margin-top: 2px; }
  .kpi.green .value { color: #059669; }
  .kpi.red .value { color: #dc2626; }
  .kpi.amber .value { color: #d97706; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
  td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) td { background: #fafafa; }
  .total-row td { font-weight: 600; border-top: 2px solid #e5e7eb; background: #f9fafb; }
  .question-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin: 10px 0; }
  .question-box strong { color: #166534; }
  .tab-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 10px 0; }
  .tab-name { font-weight: 600; color: #4338ca; font-size: 11pt; }
  .tab-desc { color: #6b7280; font-size: 10pt; margin-top: 4px; }
  .page-break { page-break-before: always; }
  ul { padding-left: 20px; margin: 8px 0; }
  li { margin-bottom: 5px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #9ca3af; text-align: center; }
</style>
</head>
<body>

<h1>Budget AN</h1>
<p class="subtitle">Capital Allocation OS — Rapport pour Adrien Naeem</p>
<p class="date">Préparé par Butterfly Agency — Mai 2026</p>

<h2>1. Qu'est-ce que Budget AN ?</h2>
<p>Budget AN est un <strong>système d'allocation de capital</strong>, pas une simple application de budget. Il est conçu pour répondre à une question centrale :</p>
<div class="highlight">
  <strong>« Suis-je plus libre aujourd'hui qu'il y a 12 mois ? »</strong><br>
  Liberté = runway suffisant + patrimoine en croissance + revenus diversifiés + temps bien alloué
</div>
<p>Le système est divisé en <strong>6 onglets</strong>, chacun avec un rôle précis :</p>

<div class="tab-card">
  <span class="tab-name">✦ Freedom</span> — Page d'accueil
  <p class="tab-desc">Tableau de bord stratégique 100% calculé automatiquement. Runway personnel et business, concentration clients, patrimoine net, revenu/heure par activité, pipeline. Aucune saisie manuelle — tout vient des autres onglets.</p>
</div>
<div class="tab-card">
  <span class="tab-name">🏠 Household</span> — Coût de la vie
  <p class="tab-desc">Suivi simple du burn rate familial. 4 catégories : Charges fixes, Variable, Voyages famille, Nicolas. Une seule question : « Notre coût de vie est-il compatible avec la liberté qu'on veut ? »</p>
</div>
<div class="tab-card">
  <span class="tab-name">💼 Butterfly</span> — Finances business
  <p class="tab-desc">Revenus, coûts et marges par ligne d'activité (GTM Advisory, Events, Media, Community, Speaking, Partnerships). Inclut le suivi du temps pour calculer le €/heure par activité. P&L par événement.</p>
</div>
<div class="tab-card">
  <span class="tab-name">🔀 Pipeline</span> — Revenus futurs
  <p class="tab-desc">Opportunités en cours avec probabilité de closing. Répond à : « Comment ça se présente dans 90 jours ? » Valeur pondérée = valeur × probabilité.</p>
</div>
<div class="tab-card">
  <span class="tab-name">📈 Wealth</span> — Patrimoine
  <p class="tab-desc">Bilan mensuel : Cash personnel + Cash business + Épargne + Investissements + Valeur Butterfly − Dettes = Patrimoine net. C'est le scoreboard.</p>
</div>
<div class="tab-card">
  <span class="tab-name">⚖️ Decisions</span> — Journal de décisions
  <p class="tab-desc">Chaque décision stratégique (embauche, événement, projet, partenariat) avec le rationnel, le ROI attendu et le résultat réel. Seuils : >500€ personnel, >2 000€ business.</p>
</div>

<div class="page-break"></div>

<h2>2. Vue d'ensemble financière — Janvier à Décembre 2025</h2>
<p>Voici une synthèse de l'ensemble de l'année basée sur les données importées depuis Bankin et les fichiers de suivi existants.</p>

<div class="kpi-row">
  <div class="kpi green"><div class="value">71 954 €</div><div class="label">Revenus business (total)</div></div>
  <div class="kpi red"><div class="value">54 381 €</div><div class="label">Dépenses business (hors owner draws)</div></div>
  <div class="kpi"><div class="value">17 573 €</div><div class="label">Marge Butterfly</div></div>
</div>
<div class="kpi-row">
  <div class="kpi red"><div class="value">97 450 €</div><div class="label">Burn household (total)</div></div>
  <div class="kpi amber"><div class="value">~8 100 €</div><div class="label">Burn household mensuel moyen</div></div>
  <div class="kpi"><div class="value">16 550 €</div><div class="label">Patrimoine net (immobilier)</div></div>
</div>

<h3>Revenus par mois</h3>
<table>
  <tr><th>Mois</th><th>Revenus</th><th>Dépenses biz</th><th>Owner draws</th><th>Burn ménage</th><th>Solde net</th></tr>
  <tr><td>Janvier</td><td>3 000 €</td><td>6 928 €</td><td>0 €</td><td>8 633 €</td><td>-12 561 €</td></tr>
  <tr><td>Février</td><td>11 029 €</td><td>3 201 €</td><td>5 838 €</td><td>12 165 €</td><td>-10 175 €</td></tr>
  <tr><td>Mars</td><td>6 000 €</td><td>10 130 €</td><td>0 €</td><td>11 801 €</td><td>-15 931 €</td></tr>
  <tr><td>Avril</td><td>5 005 €</td><td>3 771 €</td><td>1 791 €</td><td>12 307 €</td><td>-12 864 €</td></tr>
  <tr><td>Mai</td><td>—</td><td>3 280 €</td><td>0 €</td><td>8 564 €</td><td>-11 844 €</td></tr>
  <tr><td>Juin</td><td>20 000 €</td><td>3 554 €</td><td>0 €</td><td>7 645 €</td><td>+8 801 €</td></tr>
  <tr><td>Juillet</td><td>7 700 €</td><td>5 630 €</td><td>0 €</td><td>8 946 €</td><td>-6 876 €</td></tr>
  <tr><td>Août</td><td>5 000 €</td><td>2 813 €</td><td>0 €</td><td>6 407 €</td><td>-4 220 €</td></tr>
  <tr><td>Septembre</td><td>20 €</td><td>5 438 €</td><td>0 €</td><td>6 932 €</td><td>-12 350 €</td></tr>
  <tr><td>Octobre</td><td>14 200 €</td><td>3 991 €</td><td>1 664 €</td><td>4 956 €</td><td>+3 589 €</td></tr>
  <tr><td>Décembre</td><td>—</td><td>5 643 €</td><td>0 €</td><td>6 946 €</td><td>-12 589 €</td></tr>
  <tr class="total-row"><td>Total</td><td>71 954 €</td><td>54 381 €</td><td>9 293 €</td><td>97 450 €</td><td>-89 170 €</td></tr>
</table>

<div class="warning">
  <strong>Note importante :</strong> Le solde net négatif s'explique principalement par les charges immobilières (hypothèques, assurances, charges de copropriété) de ~2 500-4 600€/mois incluses dans le burn ménage, ainsi que par les revenus personnels (salaire Icon, Pôle Emploi) qui ne sont pas comptés ici car ce tableau ne montre que les revenus business. Le vrai solde mensuel est significativement meilleur.
</div>

<h3>Concentration des revenus</h3>
<table>
  <tr><th>Client</th><th>Revenus</th><th>Part</th></tr>
  <tr><td>Freelance (agrégé)</td><td>41 720 €</td><td>58%</td></tr>
  <tr><td>Street Kred</td><td>22 780 €</td><td>32%</td></tr>
  <tr><td>Newson</td><td>7 200 €</td><td>10%</td></tr>
  <tr><td>Autres</td><td>254 €</td><td>&lt;1%</td></tr>
</table>

<div class="warning">
  <strong>Risque :</strong> 90% des revenus viennent de 2 sources (Freelance + Street Kred). Le système affiche une alerte quand un client dépasse 50% du revenu.
</div>

<h3>Patrimoine immobilier</h3>
<table>
  <tr><th>Actif</th><th>Valeur</th><th>Dette</th><th>Equity</th></tr>
  <tr><td>SDC Abondant (Maison Historique)</td><td>260 000 €</td><td>171 000 €</td><td>89 000 €</td></tr>
  <tr><td>SCPI Pierre Invt 8</td><td>56 000 €</td><td>31 200 €</td><td>24 800 €</td></tr>
  <tr><td>Sérénipierre (assurance vie)</td><td>4 750 €</td><td>—</td><td>4 750 €</td></tr>
  <tr><td>LCL Appartement</td><td>—</td><td>102 000 €</td><td>-102 000 €</td></tr>
  <tr class="total-row"><td>Total</td><td>320 750 €</td><td>304 200 €</td><td>16 550 €</td></tr>
</table>

<div class="page-break"></div>

<h2>3. Ce qui fonctionne déjà</h2>
<ul>
  <li><strong>Données réelles importées</strong> — 542 dépenses ménage, 14 revenus, 238 dépenses business, 11 snapshots patrimoine</li>
  <li><strong>Owner draws séparés</strong> — Les achats personnels payés via la carte business (9 293€) sont identifiés et exclus de la marge Butterfly</li>
  <li><strong>Réserve fiscale</strong> — Un taux placeholder de 35% montre combien mettre de côté (⚠️ doit être validé par un expert-comptable)</li>
  <li><strong>Runway en moyenne glissante</strong> — Utilise les 3 derniers mois au lieu d'un seul, pour un chiffre stable</li>
  <li><strong>Patrimoine immobilier</strong> — Actifs et dettes immobilières intégrés dans le calcul du patrimoine net</li>
  <li><strong>Pipeline</strong> — Prêt à recevoir des opportunités pour prévoir les 90 prochains jours</li>
  <li><strong>Suivi du temps</strong> — Modèle TimeEntry en place pour calculer le €/heure par ligne d'activité</li>
</ul>

<h2>4. Questions pour compléter le système</h2>
<p>Pour que Budget AN devienne un vrai outil de décision, j'ai besoin de quelques informations :</p>

<div class="question-box">
  <strong>Q1 — Soldes bancaires réels</strong><br>
  Quel est le solde actuel de chaque compte ? (Boursorama, N26, SG, LCL, CIC, Make Commerce AN Group)<br>
  <em>→ Nécessaire pour calculer le runway et le patrimoine net réel.</em>
</div>

<div class="question-box">
  <strong>Q2 — Structure juridique de l'activité pro</strong><br>
  Make Commerce AN Group est-il une SARL, SAS, micro-entreprise, autre ?<br>
  <em>→ Détermine le taux de charges sociales et d'impôt pour la réserve fiscale. Le 35% actuel est un placeholder.</em>
</div>

<div class="question-box">
  <strong>Q3 — Revenus personnels</strong><br>
  Quel est le montant mensuel du salaire (Icon Clinical Research) et de l'allocation Pôle Emploi / France Travail ?<br>
  <em>→ Ces revenus personnels ne sont pas dans le système actuellement. Ils sont essentiels pour le vrai burn net.</em>
</div>

<div class="question-box">
  <strong>Q4 — Politique de rémunération</strong><br>
  Comment te verses-tu de l'argent depuis Make Commerce AN Group ? Montant fixe mensuel ? Variable ? À la demande ?<br>
  <em>→ Permet de modéliser les owner draws de manière prévisionnelle.</em>
</div>

<div class="question-box">
  <strong>Q5 — Valeur de Butterfly / Make Commerce AN Group</strong><br>
  As-tu une estimation de la valeur de l'entreprise ? Même conservatrice (1x revenus annuels, par exemple).<br>
  <em>→ Le champ existe dans le système mais vaut 0€ actuellement.</em>
</div>

<div class="question-box">
  <strong>Q6 — Pipeline actuel</strong><br>
  Quels sont les deals en cours ? Pour chacun : client, montant, probabilité (%), date de closing prévue.<br>
  <em>→ L'onglet Pipeline est prêt mais vide. C'est la clé pour répondre à « Comment ça se présente dans 90 jours ? »</em>
</div>

<div class="question-box">
  <strong>Q7 — Objectifs financiers</strong><br>
  Quels sont tes 3 objectifs financiers prioritaires pour les 2 prochaines années ?<br>
  <em>→ Permet de calibrer les alertes et les seuils du système.</em>
</div>

<div class="question-box">
  <strong>Q8 — L'appartement LCL</strong><br>
  L'appartement LCL (dette 102 000€) — est-ce ta résidence principale ou un investissement locatif ? Quelle est sa valeur estimée ?<br>
  <em>→ Il apparaît comme dette pure dans le patrimoine. Si c'est un bien qui a une valeur, le patrimoine net est sous-estimé.</em>
</div>

<div class="page-break"></div>

<h2>5. Comment utiliser le système au quotidien</h2>

<h3>Chaque jour (30 secondes)</h3>
<p>Rien à faire. Les données bancaires seront importées périodiquement.</p>

<h3>Chaque semaine (2 minutes)</h3>
<ul>
  <li>Ouvrir <strong>Freedom</strong> — vérifier le runway et la concentration clients</li>
  <li>Logger le temps passé dans <strong>Butterfly → Time Tracking</strong> (par activité)</li>
</ul>

<h3>Chaque mois (10 minutes)</h3>
<ul>
  <li>Mettre à jour les soldes bancaires réels dans <strong>Wealth</strong></li>
  <li>Mettre à jour le <strong>Pipeline</strong> (nouvelles opportunités, deals gagnés/perdus)</li>
  <li>Vérifier le €/heure par activité dans <strong>Butterfly</strong></li>
</ul>

<h3>Chaque trimestre (30 minutes)</h3>
<ul>
  <li>Revoir les <strong>Decisions</strong> — mettre à jour les ROI réels</li>
  <li>Ajuster la valeur de Butterfly dans <strong>Wealth</strong></li>
  <li>Comparer le patrimoine net trimestre par trimestre</li>
</ul>

<h2>6. Prochaines étapes recommandées</h2>
<ol>
  <li><strong>Renseigner les soldes bancaires réels</strong> dans Wealth pour débloquer le runway</li>
  <li><strong>Renseigner le pipeline</strong> — même 3-4 opportunités donnent de la visibilité</li>
  <li><strong>Commencer le time tracking</strong> — 1 semaine suffit pour voir les premiers €/heure</li>
  <li><strong>Valider le taux fiscal</strong> avec un expert-comptable</li>
  <li><strong>Estimer la valeur de Butterfly</strong> — même conservativement</li>
</ol>

<div class="highlight" style="margin-top: 30px;">
  <strong>Le système ne demande pas de tout tracker.</strong><br>
  Il demande de tracker ce qui compte : où va le temps, d'où vient l'argent, et combien de mois de liberté restent. Le reste est du bruit.
</div>

<div class="footer">
  Budget AN — Capital Allocation OS<br>
  Préparé par Butterfly Agency pour Adrien Naeem — Mai 2026<br>
  Ce document est confidentiel.
</div>

</body>
</html>`;

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: OUTPUT_PATH,
    format: "A4",
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    printBackground: true,
  });
  await browser.close();
  console.log(`PDF generated: ${OUTPUT_PATH}`);
}

main().catch(console.error);
