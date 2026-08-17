import { prisma } from "@/lib/prisma";
import { safe } from "@/lib/api";
import { suggestRules } from "@/lib/autorules";
import { getTaxonomy } from "@/lib/taxonomy";

// GET /api/rules/suggestions — rules mined from repeated manual classifications.
export const GET = safe(async () => {
  const [manual, rules, taxonomy] = await Promise.all([
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
    rules,
    taxonomy.categoriesByGroup
  );

  return Response.json({ suggestions });
});
