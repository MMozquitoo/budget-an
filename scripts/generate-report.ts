import puppeteer from "puppeteer";
import * as path from "path";

const OUTPUT_PATH = path.join(__dirname, "..", "public", "report.pdf");
const OUTPUT_PATH2 = path.join(__dirname, "..", "public", "Budget_AN_Report_Adrien_Naeem.pdf");

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1f2937; line-height: 1.6; padding: 50px 60px; font-size: 10.5pt; }
  h1 { font-size: 28pt; font-weight: 700; color: #312e81; margin-bottom: 4px; }
  h2 { font-size: 15pt; font-weight: 600; color: #4338ca; margin-top: 28px; margin-bottom: 10px; border-bottom: 2px solid #e0e7ff; padding-bottom: 5px; }
  h3 { font-size: 11.5pt; font-weight: 600; color: #1f2937; margin-top: 16px; margin-bottom: 6px; }
  p { margin-bottom: 8px; }
  .subtitle { font-size: 13pt; color: #6b7280; margin-bottom: 24px; }
  .date { font-size: 9.5pt; color: #9ca3af; }
  .highlight { background: #eef2ff; border-left: 4px solid #6366f1; padding: 10px 14px; margin: 12px 0; border-radius: 0 8px 8px 0; }
  .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; margin: 12px 0; border-radius: 0 8px 8px 0; font-size: 10pt; }
  .note-red { background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px 14px; margin: 12px 0; border-radius: 0 8px 8px 0; font-size: 10pt; }
  .kpi-row { display: flex; gap: 12px; margin: 14px 0; }
  .kpi { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; text-align: center; }
  .kpi .value { font-size: 18pt; font-weight: 700; color: #312e81; }
  .kpi .label { font-size: 8.5pt; color: #6b7280; margin-top: 2px; }
  .kpi.green .value { color: #059669; }
  .kpi.red .value { color: #dc2626; }
  .kpi.amber .value { color: #d97706; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9.5pt; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
  td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) td { background: #fafafa; }
  .total-row td { font-weight: 600; border-top: 2px solid #e5e7eb; background: #f9fafb; }
  .partial td { color: #9ca3af; font-style: italic; }
  .question-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 8px 0; font-size: 10pt; }
  .question-box strong { color: #166534; }
  .tab-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin: 8px 0; }
  .tab-name { font-weight: 600; color: #4338ca; font-size: 10.5pt; }
  .tab-desc { color: #6b7280; font-size: 9.5pt; margin-top: 3px; }
  .page-break { page-break-before: always; }
  ul { padding-left: 18px; margin: 6px 0; }
  li { margin-bottom: 4px; }
  .confidence { display: inline-block; border-radius: 4px; padding: 1px 6px; font-size: 8.5pt; font-weight: 500; }
  .confidence.solid { background: #d1fae5; color: #065f46; }
  .confidence.partial { background: #fef3c7; color: #92400e; }
  .confidence.guess { background: #fee2e2; color: #991b1b; }
  .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 8.5pt; color: #9ca3af; text-align: center; }
  tr { page-break-inside: avoid; }
  .kpi-row { page-break-inside: avoid; }
  .question-box { page-break-inside: avoid; }
  .highlight { page-break-inside: avoid; }
  .warning { page-break-inside: avoid; }
  .note-red { page-break-inside: avoid; }
  .tab-card { page-break-inside: avoid; }
  h2, h3 { page-break-after: avoid; }
</style>
</head>
<body>

<h1>Budget AN</h1>
<p class="subtitle">Capital Allocation OS &mdash; Rapport pour Adrien Naeem</p>
<p class="date">Pr&eacute;par&eacute; par Butterfly Agency &mdash; Mai 2026 &mdash; P&eacute;riode import&eacute;e : Janvier&ndash;Octobre 2025</p>

<h2>1. Qu'est-ce que Budget AN ?</h2>
<p>Budget AN est un <strong>syst&egrave;me d'allocation de capital</strong>, pas une simple application de budget. Il r&eacute;pond &agrave; une question centrale :</p>
<div class="highlight">
  <strong>&laquo; Suis-je plus libre aujourd'hui qu'il y a 12 mois ? &raquo;</strong><br>
  Libert&eacute; = runway suffisant + patrimoine en croissance + revenus diversifi&eacute;s + temps bien allou&eacute;
</div>
<p>Le syst&egrave;me est divis&eacute; en <strong>6 onglets</strong> :</p>

<div class="tab-card">
  <span class="tab-name">Freedom</span> &mdash; Tableau de bord strat&eacute;gique 100% calcul&eacute; automatiquement. Runway, concentration clients, patrimoine, revenu/heure par activit&eacute;.
</div>
<div class="tab-card">
  <span class="tab-name">Household</span> &mdash; Suivi du burn rate familial. 4 cat&eacute;gories : Fixes, Variable, Voyages famille, Nicolas.
</div>
<div class="tab-card">
  <span class="tab-name">Butterfly</span> &mdash; Revenus, co&ucirc;ts et marges par ligne d'activit&eacute; + suivi du temps (euro/heure). P&L par &eacute;v&eacute;nement.
</div>
<div class="tab-card">
  <span class="tab-name">Pipeline</span> &mdash; Opportunit&eacute;s en cours avec probabilit&eacute; de closing. Valeur pond&eacute;r&eacute;e = valeur &times; probabilit&eacute;.
</div>
<div class="tab-card">
  <span class="tab-name">Wealth</span> &mdash; Bilan mensuel : Cash + Investissements + Valeur Butterfly &minus; Dettes = Patrimoine net.
</div>
<div class="tab-card">
  <span class="tab-name">Decisions</span> &mdash; Journal de d&eacute;cisions strat&eacute;giques avec rationnel, ROI attendu et r&eacute;sultat r&eacute;el. Seuils : &gt;500&euro; personnel, &gt;2 000&euro; business.
</div>

<div class="page-break"></div>

<h2>2. Vue d'ensemble financi&egrave;re &mdash; Janvier&ndash;Octobre 2025</h2>
<p>Synth&egrave;se de la p&eacute;riode import&eacute;e (10 mois). Les mois de novembre et d&eacute;cembre sont partiellement disponibles et exclus des totaux.</p>

<div class="kpi-row">
  <div class="kpi green"><div class="value">128 710 &euro;</div><div class="label">Revenu total (business + personnel)</div></div>
  <div class="kpi"><div class="value">71 954 &euro;</div><div class="label">Revenu business</div></div>
  <div class="kpi"><div class="value">56 756 &euro;</div><div class="label">Revenu personnel (PE + Salaire)</div></div>
</div>
<div class="kpi-row">
  <div class="kpi red"><div class="value">97 450 &euro;</div><div class="label">D&eacute;penses m&eacute;nage (incl. charges immo)</div></div>
  <div class="kpi"><div class="value">54 381 &euro;</div><div class="label">D&eacute;penses business (hors owner draws)</div></div>
  <div class="kpi green"><div class="value">118 550 &euro;</div><div class="label">Equity immobilier (hors LCL)</div></div>
</div>

<h3>D&eacute;tail mensuel &mdash; p&eacute;riode import&eacute;e uniquement</h3>
<table>
  <tr><th>Mois</th><th>Rev. perso</th><th>Rev. business</th><th>D&eacute;p. m&eacute;nage</th><th>D&eacute;p. biz</th><th>Owner draws</th><th>Solde net</th></tr>
  <tr><td>Janvier</td><td>5 818 &euro;</td><td>3 000 &euro;</td><td>8 633 &euro;</td><td>6 928 &euro;</td><td>0 &euro;</td><td>-6 743 &euro;</td></tr>
  <tr><td>F&eacute;vrier</td><td>5 614 &euro;</td><td>11 029 &euro;</td><td>12 165 &euro;</td><td>3 201 &euro;</td><td>5 838 &euro;</td><td>-4 561 &euro;</td></tr>
  <tr><td>Mars</td><td>6 468 &euro;</td><td>6 000 &euro;</td><td>11 801 &euro;</td><td>10 130 &euro;</td><td>0 &euro;</td><td>-9 463 &euro;</td></tr>
  <tr><td>Avril</td><td>5 896 &euro;</td><td>5 005 &euro;</td><td>12 307 &euro;</td><td>3 771 &euro;</td><td>1 791 &euro;</td><td>-6 968 &euro;</td></tr>
  <tr class="partial"><td>Mai *</td><td>5 785 &euro;</td><td>&mdash;</td><td>8 564 &euro;</td><td>3 280 &euro;</td><td>0 &euro;</td><td>-6 059 &euro;</td></tr>
  <tr><td>Juin</td><td>5 785 &euro;</td><td>20 000 &euro;</td><td>7 645 &euro;</td><td>3 554 &euro;</td><td>0 &euro;</td><td>+14 586 &euro;</td></tr>
  <tr><td>Juillet</td><td>5 914 &euro;</td><td>7 700 &euro;</td><td>8 946 &euro;</td><td>5 630 &euro;</td><td>0 &euro;</td><td>-962 &euro;</td></tr>
  <tr><td>Ao&ucirc;t</td><td>4 926 &euro;</td><td>5 000 &euro;</td><td>6 407 &euro;</td><td>2 813 &euro;</td><td>0 &euro;</td><td>+706 &euro;</td></tr>
  <tr><td>Septembre</td><td>2 211 &euro;</td><td>20 &euro; *</td><td>6 932 &euro;</td><td>5 438 &euro;</td><td>0 &euro;</td><td>-10 139 &euro;</td></tr>
  <tr><td>Octobre</td><td>2 339 &euro;</td><td>14 200 &euro;</td><td>4 956 &euro;</td><td>3 991 &euro;</td><td>1 664 &euro;</td><td>+5 928 &euro;</td></tr>
  <tr class="partial"><td>Nov *</td><td colspan="6" style="text-align:center; color: #9ca3af;">Donn&eacute;es manquantes &mdash; seules les charges immobili&egrave;res (2 147 &euro;) sont pr&eacute;sentes</td></tr>
  <tr class="partial"><td>D&eacute;c *</td><td colspan="6" style="text-align:center; color: #9ca3af;">Donn&eacute;es partielles &mdash; pas de revenu business import&eacute;</td></tr>
  <tr class="total-row"><td>Jan&ndash;Oct</td><td>50 756 &euro;</td><td>71 954 &euro;</td><td>88 356 &euro;</td><td>48 736 &euro;</td><td>9 293 &euro;</td><td>-23 675 &euro;</td></tr>
</table>

<div class="warning">
  <strong>* Mai :</strong> Aucun revenu business import&eacute; pour ce mois (donn&eacute;es partielles).<br>
  <strong>* Septembre :</strong> Le revenu business de 20 &euro; est probablement une erreur de saisie dans le fichier source &mdash; &agrave; confirmer.<br>
  <strong>Note :</strong> Le burn m&eacute;nage inclut les charges immobili&egrave;res (hypoth&egrave;ques, assurances, copropri&eacute;t&eacute;) de ~2 500&ndash;4 600 &euro;/mois. Sans ces charges, le burn courant est de ~4 000&ndash;6 000 &euro;/mois.
</div>

<div class="note-red">
  <strong>Changement majeur :</strong> P&ocirc;le Emploi s'est arr&ecirc;t&eacute; en septembre 2025. Perte de ~3 700 &euro;/mois de revenu r&eacute;current. Le revenu personnel passe de ~5 800 &euro;/mois &agrave; ~2 300 &euro;/mois (salaire Icon uniquement). Cela change fondamentalement l'&eacute;quation financi&egrave;re &agrave; partir d'octobre.
</div>

<h3>Concentration des revenus business</h3>
<table>
  <tr><th>Client</th><th>Revenus</th><th>Part</th></tr>
  <tr><td>Freelance (agr&eacute;g&eacute;)</td><td>41 720 &euro;</td><td>58%</td></tr>
  <tr><td>Street Kred</td><td>22 780 &euro;</td><td>32%</td></tr>
  <tr><td>Newson</td><td>7 200 &euro;</td><td>10%</td></tr>
  <tr><td>Autres</td><td>254 &euro;</td><td>&lt;1%</td></tr>
</table>
<div class="warning">
  <strong>Risque :</strong> 90% des revenus business proviennent de 2 sources principales (Freelance 58% + Street Kred 32%). Newson repr&eacute;sente une troisi&egrave;me source &agrave; 10%. Le syst&egrave;me affiche une alerte lorsqu'un client d&eacute;passe 50% du revenu.
</div>

<h3>Equity immobilier (hors LCL)</h3>
<table>
  <tr><th>Actif</th><th>Valeur</th><th>Dette</th><th>Equity</th></tr>
  <tr><td>SDC Abondant (Maison Historique)</td><td>260 000 &euro;</td><td>171 000 &euro;</td><td>89 000 &euro;</td></tr>
  <tr><td>SCPI Pierre Invt 8</td><td>56 000 &euro;</td><td>31 200 &euro;</td><td>24 800 &euro;</td></tr>
  <tr><td>S&eacute;r&eacute;nipierre (assurance vie)</td><td>4 750 &euro;</td><td>&mdash;</td><td>4 750 &euro;</td></tr>
  <tr class="total-row"><td>Total</td><td>320 750 &euro;</td><td>202 200 &euro;</td><td>118 550 &euro;</td></tr>
</table>
<div class="warning">
  <strong>LCL Appartement exclu :</strong> dette de 102 000 &euro; mais valeur du bien inconnue. Inclure un c&ocirc;t&eacute; sans l'autre fausserait le calcul. &Agrave; int&eacute;grer une fois la valeur estim&eacute;e connue.
</div>

<h3>R&eacute;serve fiscale (placeholder)</h3>
<div class="kpi-row">
  <div class="kpi"><div class="value">71 954 &euro;</div><div class="label">Revenu business brut (Jan&ndash;Oct)</div></div>
  <div class="kpi amber"><div class="value">25 184 &euro;</div><div class="label">R&eacute;serve fiscale (35% placeholder)</div></div>
  <div class="kpi green"><div class="value">46 770 &euro;</div><div class="label">Disponible apr&egrave;s r&eacute;serve</div></div>
</div>
<div class="warning">
  <strong>Le taux de 35% est un placeholder.</strong> Le vrai taux d&eacute;pend de la structure juridique de Make Commerce AN Group et doit &ecirc;tre valid&eacute; par un expert-comptable. Ce chiffre ne constitue pas un calcul fiscal &mdash; c'est une estimation de mise de c&ocirc;t&eacute;.
</div>

<h2>3. Ce que le syst&egrave;me inf&egrave;re aujourd'hui</h2>
<p>Inferences bas&eacute;es exclusivement sur les donn&eacute;es import&eacute;es. Chaque conclusion est accompagn&eacute;e de son niveau de confiance.</p>

<table>
  <tr><th style="width:45%">Inference</th><th style="width:12%">Confiance</th><th>D&eacute;tail</th></tr>
  <tr>
    <td><strong>Revenu total ~128 700 &euro; sur Jan&ndash;Oct</strong></td>
    <td><span class="confidence solid">Solide</span></td>
    <td>56 756 &euro; personnel (PE + Icon, v&eacute;rifi&eacute; contre la Sheet) + 71 954 &euro; business (v&eacute;rifi&eacute; Bankin + Pro Budget). Deux sources crois&eacute;es.</td>
  </tr>
  <tr>
    <td><strong>P&ocirc;le Emploi stopp&eacute; en septembre</strong></td>
    <td><span class="confidence solid">Solide</span></td>
    <td>0 &euro; en sept et oct dans la Sheet. Perte de ~3 700 &euro;/mois. Le revenu personnel passe de ~5 800 &agrave; ~2 300 &euro;/mois. C'est le changement le plus impactant pour la tr&eacute;sorerie &agrave; venir.</td>
  </tr>
  <tr>
    <td><strong>Burn m&eacute;nage moyen ~8 100 &euro;/mois</strong></td>
    <td><span class="confidence partial">Partiel</span></td>
    <td>Fiable pour les mois Bankin (f&eacute;v, avr, oct). Les mois agr&eacute;g&eacute;s capturent les grandes cat&eacute;gories mais pas chaque d&eacute;pense. Inclut ~3 000 &euro;/mois de charges immobili&egrave;res.</td>
  </tr>
  <tr>
    <td><strong>Marge Butterfly ~17 500 &euro; (Jan&ndash;Oct)</strong></td>
    <td><span class="confidence partial">Partiel</span></td>
    <td>Revenu biz 72k &minus; d&eacute;penses r&eacute;elles 54k = 18k. Owner draws (9 293 &euro;) correctement s&eacute;par&eacute;s. Mais les d&eacute;penses biz pour les mois agr&eacute;g&eacute;s peuvent &ecirc;tre incompl&egrave;tes.</td>
  </tr>
  <tr>
    <td><strong>Concentration dangereuse : 90% sur 2 clients</strong></td>
    <td><span class="confidence solid">Solide</span></td>
    <td>Freelance (58%) + Street Kred (32%). Newson (10%) est une source ponctuelle. Vuln&eacute;rabilit&eacute; si l'un des deux s'arr&ecirc;te.</td>
  </tr>
  <tr>
    <td><strong>Equity immobilier : 118 550 &euro;</strong></td>
    <td><span class="confidence partial">Partiel</span></td>
    <td>Valeurs nominales d'achat, pas valeur de march&eacute;. LCL exclu. Le vrai equity d&eacute;pend des &eacute;valuations actuelles et de l'amortissement des pr&ecirc;ts.</td>
  </tr>
  <tr>
    <td><strong>Runway : non calculable</strong></td>
    <td><span class="confidence guess">Donn&eacute;e manquante</span></td>
    <td>Les soldes bancaires r&eacute;els ne sont pas dans le syst&egrave;me. Sans eux, le runway est inconnu. C'est la premi&egrave;re donn&eacute;e &agrave; renseigner.</td>
  </tr>
  <tr>
    <td><strong>Tendance nette : d&eacute;ficitaire structurellement</strong></td>
    <td><span class="confidence partial">Partiel</span></td>
    <td>Solde net Jan&ndash;Oct : -23 675 &euro;. Principalement caus&eacute; par les charges immobili&egrave;res (~30 000 &euro;/an). Hors immobilier, le m&eacute;nage est plus proche de l'&eacute;quilibre. Post-PE, la situation se tend significativement.</td>
  </tr>
</table>

<div class="page-break"></div>

<h2>4. Questions &agrave; clarifier pour aller plus loin</h2>
<p>Ces questions sont n&eacute;cessaires pour que le syst&egrave;me devienne un outil de d&eacute;cision fiable, pas seulement un miroir du pass&eacute;.</p>

<div class="question-box">
  <strong>1. Granularit&eacute; des donn&eacute;es</strong><br>
  Pour les mois sans Bankin (Jan, Mar, Mai&ndash;Sep, D&eacute;c), le d&eacute;tail par cat&eacute;gorie (&laquo; Restaurant : 519 &euro; &raquo;) suffit-il, ou souhaites-tu le d&eacute;tail ligne par ligne (chaque restaurant, chaque course) ?
</div>

<div class="question-box">
  <strong>2. Le revenu de 20 &euro; en septembre</strong><br>
  Le Pro Budget affiche 20 &euro; de revenu freelance en septembre. Est-ce une erreur de saisie ou un micro-paiement r&eacute;el ? Ce chiffre affecte le calcul de concentration.
</div>

<div class="question-box">
  <strong>3. Soldes bancaires r&eacute;els</strong><br>
  Quels sont les soldes actuels de chaque compte ? Boursorama, N26, SG, Make Commerce AN Group, CIC, LCL.<br>
  <em>&rarr; Sans eux, le runway et le patrimoine net r&eacute;el ne sont pas calculables. C'est la priorit&eacute; #1.</em>
</div>

<div class="question-box">
  <strong>4. Structure juridique de Make Commerce AN Group</strong><br>
  SARL, SAS, micro-entreprise, autre ? Le r&eacute;gime d&eacute;termine le taux r&eacute;el de charges sociales et d'imp&ocirc;t qui remplacera le placeholder de 35%.
</div>

<div class="question-box">
  <strong>5. Politique de r&eacute;mun&eacute;ration</strong><br>
  Comment te verses-tu de l'argent depuis Make Commerce ? Montant fixe mensuel, variable, &agrave; la demande ? Les &laquo; owner draws &raquo; identifi&eacute;s (9 293 &euro; sur la p&eacute;riode) sont-ils la totalit&eacute; des pr&eacute;l&egrave;vements personnels ?
</div>

<div class="question-box">
  <strong>6. Valeur de Butterfly / Make Commerce AN Group</strong><br>
  As-tu une estimation de la valeur de l'entreprise ? M&ecirc;me conservatrice (ex. 1&times; revenus annuels = ~85 000 &euro;). Le champ existe dans le syst&egrave;me mais vaut 0 &euro; actuellement.
</div>

<div class="question-box">
  <strong>7. Valeur de l'appartement LCL</strong><br>
  L'appartement financ&eacute; par le pr&ecirc;t LCL (dette 102 000 &euro;) a-t-il une valeur estim&eacute;e ? Actuellement exclu du calcul d'equity car une dette sans actif en face fausserait le bilan.
</div>

<div class="question-box">
  <strong>8. Pipeline actuel</strong><br>
  Quels sont les deals en cours ? Pour chacun : client, montant, probabilit&eacute; (%), date de closing pr&eacute;vue. L'onglet Pipeline est pr&ecirc;t mais vide &mdash; c'est la cl&eacute; pour r&eacute;pondre &agrave; &laquo; comment &ccedil;a se pr&eacute;sente dans 90 jours ? &raquo;
</div>

<div class="question-box">
  <strong>9. Interface quotidienne</strong><br>
  Pr&eacute;f&egrave;res-tu :<br>
  (a) Un chatbot / input conversationnel pour alimenter le syst&egrave;me au jour le jour<br>
  (b) Des alertes automatiques (d&eacute;passement de seuil, runway, concentration)<br>
  (c) Les deux<br>
  (d) Juste le dashboard mensuel tel quel<br>
  <em>La r&eacute;ponse d&eacute;termine si on construit une couche d'IA conversationnelle par-dessus.</em>
</div>

<h2>5. Utilisation recommand&eacute;e</h2>

<h3>Chaque semaine (2 min)</h3>
<ul>
  <li>Ouvrir <strong>Freedom</strong> &mdash; v&eacute;rifier runway et concentration clients</li>
  <li>Logger le temps pass&eacute; dans <strong>Butterfly &rarr; Time Tracking</strong></li>
</ul>

<h3>Chaque mois (10 min)</h3>
<ul>
  <li>Mettre &agrave; jour les soldes bancaires dans <strong>Wealth</strong></li>
  <li>Mettre &agrave; jour le <strong>Pipeline</strong></li>
  <li>V&eacute;rifier le &euro;/heure par activit&eacute; dans <strong>Butterfly</strong></li>
</ul>

<h3>Chaque trimestre (30 min)</h3>
<ul>
  <li>Revoir les <strong>Decisions</strong> &mdash; actualiser les ROI r&eacute;els</li>
  <li>Ajuster la valeur de Butterfly et les estimations immobili&egrave;res dans <strong>Wealth</strong></li>
</ul>

<div class="highlight" style="margin-top: 24px;">
  <strong>Le syst&egrave;me ne demande pas de tout tracker.</strong> Il demande de tracker ce qui compte : o&ugrave; va le temps, d'o&ugrave; vient l'argent, et combien de mois de libert&eacute; restent. Le reste est du bruit.
</div>

<div class="footer">
  Budget AN &mdash; Capital Allocation OS<br>
  Pr&eacute;par&eacute; par Butterfly Agency pour Adrien Naeem &mdash; Mai 2026<br>
  Ce document est confidentiel. P&eacute;riode couverte : Janvier&ndash;Octobre 2025 (donn&eacute;es partielles pour Nov/D&eacute;c).
</div>

</body>
</html>`;

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  const pdfOpts = {
    format: "A4" as const,
    margin: { top: "18mm", bottom: "18mm", left: "14mm", right: "14mm" },
    printBackground: true,
  };
  await page.pdf({ path: OUTPUT_PATH, ...pdfOpts });
  await page.pdf({ path: OUTPUT_PATH2, ...pdfOpts });
  await browser.close();
  console.log(`PDF generated: ${OUTPUT_PATH}`);
  console.log(`PDF generated: ${OUTPUT_PATH2}`);
}

main().catch(console.error);
