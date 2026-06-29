-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'EXACT', 'REGEX');

-- AlterTable
ALTER TABLE "personal_transactions" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "classification_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "matchField" TEXT NOT NULL DEFAULT 'description',
    "matchType" "MatchType" NOT NULL DEFAULT 'CONTAINS',
    "matchValue" TEXT NOT NULL,
    "group" "TransactionGroup" NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "net_worth_snapshots" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "cash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "savings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "investments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "property" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "debt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "net_worth_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "classification_rules_active_idx" ON "classification_rules"("active");

-- CreateIndex
CREATE INDEX "classification_rules_priority_idx" ON "classification_rules"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "net_worth_snapshots_month_year_key" ON "net_worth_snapshots"("month", "year");

-- CreateIndex
CREATE INDEX "personal_transactions_parentId_idx" ON "personal_transactions"("parentId");

-- AddForeignKey
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "personal_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
