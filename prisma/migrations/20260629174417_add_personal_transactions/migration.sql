-- CreateEnum
CREATE TYPE "TransactionGroup" AS ENUM ('INCOME', 'FIXED_EXPENSE', 'VARIABLE_EXPENSE', 'SAVINGS', 'DEBT', 'UNEXPECTED');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('SALARY', 'FREELANCE', 'SALES', 'BONUS', 'AID', 'OTHER_INCOME', 'RENT', 'UTILITIES', 'INTERNET_PHONE', 'TRANSPORT_FIXED', 'SUBSCRIPTIONS', 'INSURANCE', 'CREDIT_PAYMENT', 'EDUCATION_FIXED', 'GROCERIES', 'RESTAURANTS', 'TRANSPORT_VARIABLE', 'CLOTHING', 'PHARMACY', 'PETS', 'PERSONAL_CARE', 'ENTERTAINMENT', 'GIFTS', 'REPAIRS', 'GENERAL_SAVINGS', 'EMERGENCY_FUND', 'TRAVEL_FUND', 'EDUCATION_FUND', 'BIG_PURCHASE', 'INVESTMENT', 'CREDIT_CARD', 'PERSONAL_LOAN', 'INSTALLMENT', 'INTEREST', 'PENDING_PAYMENT', 'EMERGENCY', 'HEALTH', 'UNEXPECTED_REPAIR', 'FINE', 'UNPLANNED');

-- CreateTable
CREATE TABLE "personal_transactions" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "group" "TransactionGroup" NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personal_transactions_date_idx" ON "personal_transactions"("date");

-- CreateIndex
CREATE INDEX "personal_transactions_group_idx" ON "personal_transactions"("group");

-- CreateIndex
CREATE INDEX "personal_transactions_category_idx" ON "personal_transactions"("category");
