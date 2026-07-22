import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import type { TransactionGroup, TransactionCategory, MatchType } from "../src/generated/prisma/enums.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const RULES = [
  { name: "Flatlooker → Alquiler", matchValue: "flatlooker", group: "FIXED_EXPENSE", category: "RENT" },
  { name: "Prime Video → Suscripciones", matchValue: "achat prime video", group: "FIXED_EXPENSE", category: "SUBSCRIPTIONS" },
  { name: "Ville de Meudon → Impuestos", matchValue: "ville de meudon", group: "DEBT", category: "PENDING_PAYMENT" },
  { name: "Remitly → Envíos familia", matchValue: "remitly", group: "VARIABLE_EXPENSE", category: "GIFTS" },
  { name: "Make Commerce → Freelance", matchValue: "make commerce", group: "INCOME", category: "FREELANCE" },
  { name: "Qonto → Freelance", matchValue: "qonto", group: "INCOME", category: "FREELANCE" },
  { name: "Pole Emploi → Ayudas", matchValue: "pole emploi", group: "INCOME", category: "AID" },
  { name: "Icon Clinical → Salario", matchValue: "icon clinical", group: "INCOME", category: "SALARY" },
  { name: "Angelique Naeem → Ayudas", matchValue: "angelique naeem", group: "INCOME", category: "AID" },
  { name: "Nicolas Naeem → Ayudas", matchValue: "nicolas naeem", group: "INCOME", category: "AID" },
  { name: "Epargne Nicolas → Ahorro", matchValue: "epargne nicolas", group: "SAVINGS", category: "GENERAL_SAVINGS" },
  { name: "Moos → Suscripciones", matchValue: "moos", group: "FIXED_EXPENSE", category: "SUBSCRIPTIONS", matchType: "EXACT" as const },
  { name: "Fitness → Entretenimiento", matchValue: "fitness", group: "VARIABLE_EXPENSE", category: "ENTERTAINMENT" },
  { name: "Piscine → Entretenimiento", matchValue: "piscine", group: "VARIABLE_EXPENSE", category: "ENTERTAINMENT" },
  { name: "Decathlon → Ropa", matchValue: "decathlon", group: "VARIABLE_EXPENSE", category: "CLOTHING" },
  { name: "Navigo → Transporte fijo", matchValue: "navigo", group: "FIXED_EXPENSE", category: "TRANSPORT_FIXED" },
  { name: "Pharmacie → Farmacia", matchValue: "pharmacie", group: "VARIABLE_EXPENSE", category: "PHARMACY" },
  { name: "Suravenir → Inversiones", matchValue: "suravenir", group: "SAVINGS", category: "INVESTMENT" },
  { name: "Ad Free Prime → Suscripciones", matchValue: "primevideo", group: "FIXED_EXPENSE", category: "SUBSCRIPTIONS" },
  { name: "April Sante → Seguros", matchValue: "april sante", group: "FIXED_EXPENSE", category: "INSURANCE" },
  { name: "Allianz → Seguros", matchValue: "allianz", group: "FIXED_EXPENSE", category: "INSURANCE" },
  { name: "EDF → Servicios", matchValue: "edf", group: "FIXED_EXPENSE", category: "UTILITIES" },
  { name: "AON France → Seguros", matchValue: "aon france", group: "FIXED_EXPENSE", category: "INSURANCE" },
  { name: "Credit Foncier → Crédito", matchValue: "credit foncier", group: "DEBT", category: "INSTALLMENT" },
  { name: "Ech Pret → Crédito", matchValue: "ech pret", group: "DEBT", category: "INSTALLMENT" },
  { name: "Go Membership → Suscripciones", matchValue: "go membership", group: "FIXED_EXPENSE", category: "SUBSCRIPTIONS" },
];

async function main() {
  let created = 0;
  for (let i = 0; i < RULES.length; i++) {
    const r = RULES[i];
    const existing = await prisma.classificationRule.findFirst({
      where: { matchValue: r.matchValue },
    });
    if (existing) {
      console.log(`  skip: ${r.name} (already exists)`);
      continue;
    }
    await prisma.classificationRule.create({
      data: {
        name: r.name,
        priority: RULES.length - i,
        matchField: "description",
        matchType: ("matchType" in r ? (r.matchType as MatchType) : "CONTAINS"),
        matchValue: r.matchValue,
        group: r.group as TransactionGroup,
        category: r.category as TransactionCategory,
        active: true,
      },
    });
    created++;
    console.log(`  + ${r.name}`);
  }
  console.log(`\nCreated ${created} rules`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
