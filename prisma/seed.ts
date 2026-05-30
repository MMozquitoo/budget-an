import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
});

async function main() {
  const businessLines = [
    { id: "gtm-advisory", name: "GTM Advisory", color: "#6366f1" },
    { id: "events", name: "Events", color: "#f59e0b" },
    { id: "media", name: "Media", color: "#ec4899" },
    { id: "community", name: "Community", color: "#14b8a6" },
    { id: "speaking", name: "Speaking", color: "#8b5cf6" },
    { id: "partnerships", name: "Partnerships", color: "#f97316" },
  ];

  console.log("Seeding business lines...");

  for (const line of businessLines) {
    await prisma.businessLine.upsert({
      where: { id: line.id },
      update: {},
      create: line,
    });
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
