import { prisma } from "@/lib/prisma";
import { safe } from "@/lib/api";
import { suggestRules } from "@/lib/autorules";

// GET /api/rules/suggestions — rules mined from repeated manual classifications.
export const GET = safe(async () => {
  const [manual, rules] = await Promise.all([
    prisma.personalTransaction.findMany({
      where: { manuallyClassified: true, parentId: null },
      select: { description: true, notes: true, group: true, category: true },
    }),
    prisma.classificationRule.findMany(),
  ]);

  const suggestions = suggestRules(
    manual.map((t) => ({
      description: t.description,
      notes: t.notes,
      group: t.group,
      category: t.category,
    })),
    rules
  );

  return Response.json({ suggestions });
});
