-- CreateEnum
CREATE TYPE "HouseholdCategory" AS ENUM ('FIXED', 'VARIABLE', 'FAMILY_TRAVEL', 'NICOLAS');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "TimeEntryType" AS ENUM ('SALES', 'DELIVERY', 'CONTENT', 'ADMIN', 'EVENT_PREP', 'NETWORKING', 'STRATEGY');

-- CreateEnum
CREATE TYPE "DecisionScope" AS ENUM ('PERSONAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "DecisionCategory" AS ENUM ('HIRE', 'EVENT', 'TRAVEL', 'TOOL', 'PROJECT', 'PARTNERSHIP', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('PLANNED', 'APPROVED', 'DONE', 'ABANDONED');

-- CreateTable
CREATE TABLE "household_expenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" "HouseholdCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_lines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',

    CONSTRAINT "business_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenues" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "client" TEXT,
    "businessLineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_expenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "businessLineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "businessLineId" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_opportunities" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "probability" INTEGER NOT NULL,
    "closeDate" TIMESTAMP(3) NOT NULL,
    "owner" TEXT,
    "businessLineId" TEXT NOT NULL,
    "status" "PipelineStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_snapshots" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "cashPersonal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashBusiness" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "emergencyFund" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "investments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "debt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "butterflyValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wealth_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(6,1) NOT NULL,
    "type" "TimeEntryType" NOT NULL,
    "businessLineId" TEXT NOT NULL,
    "eventId" TEXT,
    "projectName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "scope" "DecisionScope" NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "thresholdTriggered" BOOLEAN NOT NULL DEFAULT false,
    "category" "DecisionCategory" NOT NULL,
    "businessLineId" TEXT,
    "eventId" TEXT,
    "rationale" TEXT,
    "expectedROI" TEXT,
    "actualROI" TEXT,
    "status" "DecisionStatus" NOT NULL DEFAULT 'PLANNED',
    "reviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "household_expenses_date_idx" ON "household_expenses"("date");

-- CreateIndex
CREATE UNIQUE INDEX "business_lines_name_key" ON "business_lines"("name");

-- CreateIndex
CREATE INDEX "revenues_date_idx" ON "revenues"("date");

-- CreateIndex
CREATE INDEX "revenues_businessLineId_idx" ON "revenues"("businessLineId");

-- CreateIndex
CREATE INDEX "business_expenses_date_idx" ON "business_expenses"("date");

-- CreateIndex
CREATE INDEX "business_expenses_businessLineId_idx" ON "business_expenses"("businessLineId");

-- CreateIndex
CREATE INDEX "pipeline_opportunities_closeDate_idx" ON "pipeline_opportunities"("closeDate");

-- CreateIndex
CREATE INDEX "pipeline_opportunities_status_idx" ON "pipeline_opportunities"("status");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_snapshots_month_year_key" ON "wealth_snapshots"("month", "year");

-- CreateIndex
CREATE INDEX "time_entries_date_idx" ON "time_entries"("date");

-- CreateIndex
CREATE INDEX "time_entries_businessLineId_idx" ON "time_entries"("businessLineId");

-- CreateIndex
CREATE INDEX "decisions_date_idx" ON "decisions"("date");

-- CreateIndex
CREATE INDEX "decisions_status_idx" ON "decisions"("status");

-- AddForeignKey
ALTER TABLE "revenues" ADD CONSTRAINT "revenues_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "business_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "business_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "business_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_opportunities" ADD CONSTRAINT "pipeline_opportunities_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "business_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "business_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "business_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
