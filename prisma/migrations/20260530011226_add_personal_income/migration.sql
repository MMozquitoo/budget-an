-- CreateTable
CREATE TABLE "personal_income" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_income_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personal_income_date_idx" ON "personal_income"("date");
