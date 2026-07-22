import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { classify } from "../src/lib/rules.js";
import type {
  TransactionGroup,
  TransactionCategory,
} from "../src/generated/prisma/enums.js";

/**
 * Re-run the classification rules over transactions already in the database.
 *
 * DRY RUN by default: it prints every change it would make and writes nothing.
 * Only rows the rules would move somewhere else are touched, and split parents
 * and children are left alone so a split never stops reconciling.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const APPLY = process.argv.includes("--apply");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i !== -1 ? Number(process.argv[i + 1]) : undefined;
})();

async function main() {
  const rules = await prisma.classificationRule.findMany({
    where: { active: true },
    orderBy: { priority: "desc" },
  });

  if (rules.length === 0) {
    console.log("No active classification rules — nothing to do.");
    console.log("Create some on the Règles page, or run: npm run rules:seed");
    return;
  }
  console.log(`Loaded ${rules.length} active rules.`);

  const transactions = await prisma.personalTransaction.findMany({
    // Split children inherit their parent's classification by construction;
    // reclassifying them independently would break the reconciliation.
    where: { parentId: null, splits: { none: {} } },
    select: {
      id: true,
      date: true,
      amount: true,
      description: true,
      notes: true,
      group: true,
      category: true,
    },
    orderBy: { date: "desc" },
    ...(LIMIT ? { take: LIMIT } : {}),
  });
  console.log(`Checking ${transactions.length} transactions…\n`);

  const changes: {
    id: string;
    date: Date;
    amount: number;
    description: string;
    from: string;
    to: string;
    rule: string;
    group: string;
    category: string;
  }[] = [];

  for (const t of transactions) {
    const match = classify(rules, { description: t.description, notes: t.notes });
    if (!match) continue;
    if (match.group === t.group && match.category === t.category) continue;

    changes.push({
      id: t.id,
      date: t.date,
      amount: Number(t.amount),
      description: t.description,
      from: `${t.group}/${t.category}`,
      to: `${match.group}/${match.category}`,
      rule: match.ruleName ?? match.ruleId ?? "?",
      group: match.group,
      category: match.category,
    });
  }

  if (changes.length === 0) {
    console.log("Every transaction already matches its rules. Nothing to change.");
    return;
  }

  const byRule = new Map<string, number>();
  for (const c of changes) byRule.set(c.rule, (byRule.get(c.rule) || 0) + 1);

  for (const c of changes.slice(0, 40)) {
    console.log(
      `  ${c.date.toISOString().slice(0, 10)} ${c.amount.toFixed(2).padStart(9)} ` +
      `${c.from} → ${c.to}  [${c.rule}]  ${c.description.slice(0, 45)}`
    );
  }
  if (changes.length > 40) console.log(`  … and ${changes.length - 40} more`);

  console.log(`\n${changes.length} transactions would be reclassified:`);
  for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${rule}`);
  }

  if (!APPLY) {
    console.log("\nDRY RUN — re-run with --apply to write these changes.");
    return;
  }

  // One UPDATE per destination classification rather than one per row: a few
  // hundred individual updates against a pooled remote database blow past
  // Prisma's interactive-transaction timeout long before they finish.
  const byTarget = new Map<string, string[]>();
  for (const c of changes) {
    const target = `${c.group}/${c.category}`;
    const ids = byTarget.get(target);
    if (ids) ids.push(c.id);
    else byTarget.set(target, [c.id]);
  }

  let done = 0;
  for (const [target, ids] of byTarget) {
    const [group, category] = target.split("/");
    const res = await prisma.personalTransaction.updateMany({
      where: { id: { in: ids } },
      data: {
        group: group as TransactionGroup,
        category: category as TransactionCategory,
      },
    });
    done += res.count;
    console.log(`  ${String(res.count).padStart(5)} → ${target}`);
  }
  console.log(`\nReclassified ${done} transactions.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect().catch(() => {}); });
