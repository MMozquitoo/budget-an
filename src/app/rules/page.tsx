import { prisma } from "@/lib/prisma";
import { suggestRules } from "@/lib/autorules";
import { getTaxonomy } from "@/lib/taxonomy";
import RulesClient from "./RulesClient";

// No searchParams here to signal per-request rendering to Next — same fix
// as /net-worth.
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const [rules, manual, allRules, taxonomy] = await Promise.all([
    prisma.classificationRule.findMany({ orderBy: { priority: "desc" } }),
    prisma.personalTransaction.findMany({
      where: { manuallyClassified: true, parentId: null },
      select: { description: true, notes: true, group: true, category: true },
    }),
    prisma.classificationRule.findMany(),
    getTaxonomy(),
  ]);

  const suggestions = suggestRules(
    manual.map((t) => ({
      description: t.description,
      notes: t.notes,
      group: t.group,
      category: t.category,
    })),
    allRules,
    taxonomy.categoriesByGroup
  );

  return <RulesClient rules={rules} suggestions={suggestions} taxonomy={taxonomy} />;
}
