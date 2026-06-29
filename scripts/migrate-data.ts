import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const HOUSEHOLD_TO_GROUP: Record<string, string> = {
  FIXED: "FIXED_EXPENSE",
  VARIABLE: "VARIABLE_EXPENSE",
  FAMILY_TRAVEL: "VARIABLE_EXPENSE",
  NICOLAS: "VARIABLE_EXPENSE",
};

const HOUSEHOLD_TO_CATEGORY: Record<string, string> = {
  FIXED: "RENT",
  VARIABLE: "GROCERIES",
  FAMILY_TRAVEL: "ENTERTAINMENT",
  NICOLAS: "ENTERTAINMENT",
};

const INCOME_SOURCE_MAP: Record<string, string> = {
  salary: "SALARY",
  salario: "SALARY",
  freelance: "FREELANCE",
  unemployment: "AID",
  chomage: "AID",
  other: "OTHER_INCOME",
};

async function main() {
  const existing = await prisma.personalTransaction.count();
  if (existing > 0) {
    console.log(`Already have ${existing} transactions. Skipping migration.`);
    return;
  }

  // Migrate household expenses
  const expenses = await prisma.householdExpense.findMany();
  console.log(`Migrating ${expenses.length} household expenses...`);

  for (const e of expenses) {
    const group = HOUSEHOLD_TO_GROUP[e.category] || "VARIABLE_EXPENSE";
    const category = HOUSEHOLD_TO_CATEGORY[e.category] || "GROCERIES";

    await prisma.personalTransaction.create({
      data: {
        date: e.date,
        amount: e.amount,
        group: group as any,
        category: category as any,
        description: e.description,
        notes: `Migrado de: ${e.category}`,
        createdAt: e.createdAt,
      },
    });
  }

  // Migrate personal income
  const incomes = await prisma.personalIncome.findMany();
  console.log(`Migrating ${incomes.length} personal income records...`);

  for (const i of incomes) {
    const sourceLower = (i.source || "").toLowerCase().trim();
    const category = INCOME_SOURCE_MAP[sourceLower] || "OTHER_INCOME";

    await prisma.personalTransaction.create({
      data: {
        date: i.date,
        amount: i.amount,
        group: "INCOME" as any,
        category: category as any,
        description: i.description || i.source,
        notes: `Migrado de: ${i.source}`,
        createdAt: i.createdAt,
      },
    });
  }

  const total = await prisma.personalTransaction.count();
  console.log(`Done. ${total} transactions in new table.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
