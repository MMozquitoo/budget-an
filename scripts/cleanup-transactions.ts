import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

// Patterns that indicate self-transfers between own bank accounts
const SELF_TRANSFER_PATTERNS = [
  // Outgoing to own accounts
  /pour: adrien naeem/i,
  /pour: naeem adrien/i,
  /pour: rodriguez mora claudia andrea/i,
  // Incoming from own accounts
  /vir inst adrien (imran )?naeem(?! .*(loyer|sent from qonto))/i,
  /vir inst re de: (m\.? )?adrien naeem/i,
  /vir recu de: m\. adrien naeem/i,
  /vir inst naeem ou rodriguez/i,
  /virement instantane vir inst (adrien )?naeem/i,
  /rej vir inst adrien naeem/i,
  // Refunds/bounces between own accounts
  /vir inst flatlooker/i, // will reclassify separately
  // Transfers between own banks (Boursorama, Revolut, SG/Logitel, CIC, N26)
  /adrien naeem.*sent from revolut/i,
  /adrien naeem.*sent from/i,
  /adrien naeem.*boursorama.*sent/i,
  /adrien naeem virement depuis boursobank/i,
  /to adrien naeem sent from/i,
  /adrien naeem.*cic sent from/i,
  /adrien naeem revolut sent from/i,
  /vir inst naeem adrien.*boursobank/i,
  /vir instantane emis logitel pour:.*quirimit/i,
  /naeem ou rodriguez.*virement/i,
  /vir perm pour:.*naeem.*virement cav/i,
  // Spouse transfers (also internal household)
  /claudia.*rodriguez/i,
  /rodriguez.*claudia/i,
  /rodriguez mora/i,
];

// These look like self-transfers but are actually real
const KEEP_PATTERNS = [
  /icon clinical/i,
  /francois gestion/i,
  /squires/i,
  /sent from qonto/i,
  /make commerce/i,
  /isf/i,
  /epargne nicolas/i,
];

// Flatlooker = rent payment service
const FLATLOOKER_PATTERN = /flatlooker/i;

function isSelfTransfer(description: string): boolean {
  const desc = description.toLowerCase();

  // First check if it should be kept (real transactions)
  for (const pat of KEEP_PATTERNS) {
    if (pat.test(desc)) return false;
  }

  // Flatlooker is rent, not a self-transfer
  if (FLATLOOKER_PATTERN.test(desc)) return false;

  // Check self-transfer patterns
  for (const pat of SELF_TRANSFER_PATTERNS) {
    if (pat.test(desc)) return true;
  }

  return false;
}

// Reclassification rules: [descriptionMatch, newGroup, newCategory]
const RECLASSIFY_RULES: [RegExp, string, string][] = [
  // Flatlooker = rent
  [/flatlooker/i, "FIXED_EXPENSE", "RENT"],
  // Prime Video purchases misclassified as clothing
  [/achat prime video/i, "FIXED_EXPENSE", "SUBSCRIPTIONS"],
  // Ville de Meudon = local tax
  [/ville de meudon/i, "DEBT", "PENDING_PAYMENT"],
  // Remitly = international money transfer (sending to family)
  [/remitly/i, "VARIABLE_EXPENSE", "GIFTS"],
  // Make Commerce / Qonto = business income
  [/make commerce/i, "INCOME", "FREELANCE"],
  [/qonto/i, "INCOME", "FREELANCE"],
  // Pole Emploi = unemployment aid
  [/pole emploi/i, "INCOME", "AID"],
  // Icon Clinical Research = salary
  [/icon clinical/i, "INCOME", "SALARY"],
  // Angelique Naeem = family contributions
  [/angelique naeem/i, "INCOME", "AID"],
  // Nicolas Naeem received = family support
  [/vir recu de: m\. nicolas naeem/i, "INCOME", "AID"],
  // Epargne Nicolas = savings for child
  [/epargne nicolas/i, "SAVINGS", "GENERAL_SAVINGS"],
  // Moos = subscription app
  [/^moos$/i, "FIXED_EXPENSE", "SUBSCRIPTIONS"],
  // Fitness = sports/entertainment
  [/fitness/i, "VARIABLE_EXPENSE", "ENTERTAINMENT"],
  // Piscine = sports
  [/piscine/i, "VARIABLE_EXPENSE", "ENTERTAINMENT"],
  // Decathlon = sports clothing
  [/decathlon/i, "VARIABLE_EXPENSE", "CLOTHING"],
  // Navigo = public transport subscription
  [/navigo/i, "FIXED_EXPENSE", "TRANSPORT_FIXED"],
  // Pharmacie = pharmacy
  [/pharmacie/i, "VARIABLE_EXPENSE", "PHARMACY"],
  // Stripe Refund from Flatlooker = rent refund
  [/stripe.*flatlooker/i, "INCOME", "OTHER_INCOME"],
  // Suravenir = life insurance / savings
  [/suravenir/i, "SAVINGS", "INVESTMENT"],
  // Cheque = misc (keep as savings if outgoing)
  [/^cheque$/i, "VARIABLE_EXPENSE", "REPAIRS"],
  // Ad Free Prime Video = subscription
  [/ad free.*primevideo/i, "FIXED_EXPENSE", "SUBSCRIPTIONS"],
  // Florence/Edouard/Pierre Naeem = family contributions
  [/naeem florence/i, "INCOME", "AID"],
  [/naeem edouard/i, "INCOME", "AID"],
  [/vir isf pierre/i, "INCOME", "AID"],
  // Benoît/Falck = family/friends ISF contributions
  [/beno[iî]t.*isf/i, "INCOME", "AID"],
  [/falck.*isf/i, "INCOME", "AID"],
  // Assurance scolaire = insurance
  [/assurance scolaire/i, "FIXED_EXPENSE", "INSURANCE"],
  // April Sante = health insurance
  [/april sante/i, "FIXED_EXPENSE", "INSURANCE"],
  // Gestion Assurances = insurance
  [/gestion assurances/i, "FIXED_EXPENSE", "INSURANCE"],
  // Allianz = insurance
  [/allianz/i, "FIXED_EXPENSE", "INSURANCE"],
  // EDF = electricity
  [/edf/i, "FIXED_EXPENSE", "UTILITIES"],
  // AON = health insurance
  [/aon france/i, "FIXED_EXPENSE", "INSURANCE"],
  // CFF Credit Foncier = mortgage
  [/credit foncier/i, "DEBT", "INSTALLMENT"],
  // Ech Pret = loan payment
  [/ech pret/i, "DEBT", "INSTALLMENT"],
  // Go Membership = subscription
  [/go membership/i, "FIXED_EXPENSE", "SUBSCRIPTIONS"],
];

async function main() {
  const all = await prisma.personalTransaction.findMany();
  console.log(`Total transactions: ${all.length}`);

  let deleted = 0;
  let reclassified = 0;
  const deleteIds: string[] = [];

  for (const t of all) {
    const desc = t.description;

    // Check if it's a self-transfer
    if (isSelfTransfer(desc)) {
      deleteIds.push(t.id);
      deleted++;
      continue;
    }

    // Check reclassification rules
    for (const [pattern, newGroup, newCategory] of RECLASSIFY_RULES) {
      if (pattern.test(desc)) {
        if (t.group !== newGroup || t.category !== newCategory) {
          await prisma.personalTransaction.update({
            where: { id: t.id },
            data: {
              group: newGroup as any,
              category: newCategory as any,
            },
          });
          reclassified++;
        }
        break;
      }
    }
  }

  // Delete self-transfers
  if (deleteIds.length > 0) {
    await prisma.personalTransaction.deleteMany({
      where: { id: { in: deleteIds } },
    });
  }

  console.log(`\nDeleted ${deleted} internal transfers`);
  console.log(`Reclassified ${reclassified} transactions`);

  // Summary
  const remaining = await prisma.personalTransaction.count();
  console.log(`\nRemaining: ${remaining} transactions`);

  const summary = await prisma.$queryRawUnsafe(`
    SELECT
      EXTRACT(YEAR FROM date)::int as year,
      EXTRACT(MONTH FROM date)::int as month,
      "group",
      COUNT(*)::int as count,
      SUM(amount)::numeric as total
    FROM personal_transactions
    GROUP BY year, month, "group"
    ORDER BY year, month, "group"
  `) as any[];

  console.log("\n=== RESUMEN LIMPIO ===");
  let currentMonth = "";
  for (const r of summary) {
    const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
    if (key !== currentMonth) {
      currentMonth = key;
      const income = summary.filter(s => `${s.year}-${String(s.month).padStart(2, '0')}` === key && s.group === 'INCOME').reduce((a: number, s: any) => a + Number(s.total), 0);
      const expenses = summary.filter(s => `${s.year}-${String(s.month).padStart(2, '0')}` === key && ['FIXED_EXPENSE', 'VARIABLE_EXPENSE', 'UNEXPECTED'].includes(s.group)).reduce((a: number, s: any) => a + Number(s.total), 0);
      console.log(`\n${key} (Balance: ${(income - expenses).toFixed(0)}€):`);
    }
    console.log(`  ${r.group.padEnd(20)} ${String(r.count).padStart(3)} txns  ${Number(r.total).toFixed(0).padStart(8)}€`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
