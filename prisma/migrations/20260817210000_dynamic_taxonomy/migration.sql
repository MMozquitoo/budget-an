-- Dynamic taxonomy: replace the fixed TransactionGroup/TransactionCategory
-- enums with two ordinary tables, seeded 1:1 with today's enum values, so
-- Adrien can create new groups/categories at runtime instead of needing a
-- schema migration each time. Not purely additive like earlier migrations —
-- rewrites 4 existing columns from enum to TEXT — but every existing value
-- is guaranteed to already be one of the seeded keys, since the old enum
-- type physically could not have stored anything else.

-- CreateTable
CREATE TABLE "category_groups" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "colorTheme" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "behavior" TEXT NOT NULL DEFAULT 'expense',
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_groups_key_key" ON "category_groups"("key");

-- CreateIndex
CREATE UNIQUE INDEX "categories_key_key" ON "categories"("key");

-- CreateIndex
CREATE INDEX "categories_groupId_idx" ON "categories"("groupId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "category_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed groups (1:1 with today's GROUP_ORDER / GROUP_LABELS / GROUP_COLORS in src/lib/utils.ts)
INSERT INTO "category_groups" ("id", "key", "label", "colorTheme", "order", "behavior", "custom") VALUES
  ('cg_income',    'INCOME',           'Revenus',                 'emerald', 0, 'income',    false),
  ('cg_fixed',     'FIXED_EXPENSE',    'Charges fixes',           'blue',    1, 'expense',   false),
  ('cg_variable',  'VARIABLE_EXPENSE', 'Dépenses variables',      'amber',   2, 'expense',   false),
  ('cg_savings',   'SAVINGS',          'Épargne',                 'violet',  3, 'savings',   false),
  ('cg_debt',      'DEBT',             'Dettes',                  'red',     4, 'debt',      false),
  ('cg_unexpected','UNEXPECTED',       'Imprévus',                'orange',  5, 'expense',   false),
  ('cg_transfer',  'TRANSFER',         'Virements internes',      'slate',   6, 'excluded',  false),
  ('cg_business',  'BUSINESS',         'Compte pro (MCAN)',       'indigo',  7, 'excluded',  false);

-- Seed categories (1:1 with today's CATEGORIES_BY_GROUP / CATEGORY_LABELS)
INSERT INTO "categories" ("id", "key", "label", "order", "groupId") VALUES
  ('c_salary',        'SALARY',                 'Salaire',                      0, 'cg_income'),
  ('c_freelance',     'FREELANCE',               'Freelance',                    1, 'cg_income'),
  ('c_sales',         'SALES',                   'Ventes',                       2, 'cg_income'),
  ('c_bonus',         'BONUS',                   'Primes / Commissions',         3, 'cg_income'),
  ('c_aid',           'AID',                     'Aides / Prêts',                4, 'cg_income'),
  ('c_other_income',  'OTHER_INCOME',            'Autres revenus',               5, 'cg_income'),

  ('c_rent',          'RENT',                    'Loyer / Crédit immo',          0, 'cg_fixed'),
  ('c_utilities',     'UTILITIES',               'Services (eau, élec, gaz)',    1, 'cg_fixed'),
  ('c_internet',      'INTERNET_PHONE',          'Internet / Téléphone',         2, 'cg_fixed'),
  ('c_transport_fix', 'TRANSPORT_FIXED',         'Transport fixe',               3, 'cg_fixed'),
  ('c_subscriptions', 'SUBSCRIPTIONS',           'Abonnements',                  4, 'cg_fixed'),
  ('c_insurance',     'INSURANCE',               'Assurances',                   5, 'cg_fixed'),
  ('c_credit_pay',    'CREDIT_PAYMENT',          'Crédits / Mensualités',        6, 'cg_fixed'),
  ('c_education_fix', 'EDUCATION_FIXED',         'Scolarité / Formation',        7, 'cg_fixed'),
  ('c_fam_claudia',   'FAMILY_SUPPORT_CLAUDIA',  'Famille de Claudia',           8, 'cg_fixed'),
  ('c_fam_father',    'FAMILY_SUPPORT_FATHER',   'Père (ISF)',                   9, 'cg_fixed'),

  ('c_groceries',     'GROCERIES',               'Courses / Alimentation',       0, 'cg_variable'),
  ('c_restaurants',   'RESTAURANTS',              'Restaurants / Livraison',      1, 'cg_variable'),
  ('c_transport_var', 'TRANSPORT_VARIABLE',       'Transport occasionnel',        2, 'cg_variable'),
  ('c_clothing',      'CLOTHING',                 'Vêtements',                    3, 'cg_variable'),
  ('c_pharmacy',      'PHARMACY',                 'Pharmacie',                    4, 'cg_variable'),
  ('c_pets',          'PETS',                     'Animaux',                      5, 'cg_variable'),
  ('c_personal_care', 'PERSONAL_CARE',            'Soins / Beauté',               6, 'cg_variable'),
  ('c_entertainment', 'ENTERTAINMENT',            'Sorties / Loisirs',            7, 'cg_variable'),
  ('c_gifts',         'GIFTS',                    'Cadeaux',                      8, 'cg_variable'),
  ('c_repairs',       'REPAIRS',                  'Réparations',                  9, 'cg_variable'),
  ('c_vacation',      'VACATION',                 'Vacances',                    10, 'cg_variable'),

  ('c_gen_savings',   'GENERAL_SAVINGS',          'Épargne générale',             0, 'cg_savings'),
  ('c_emergency_fund','EMERGENCY_FUND',           'Fonds d''urgence',             1, 'cg_savings'),
  ('c_travel_fund',   'TRAVEL_FUND',               'Voyages',                      2, 'cg_savings'),
  ('c_education_fund','EDUCATION_FUND',           'Études',                       3, 'cg_savings'),
  ('c_big_purchase',  'BIG_PURCHASE',              'Achat important',              4, 'cg_savings'),
  ('c_investment',    'INVESTMENT',                'Investissement',               5, 'cg_savings'),

  ('c_credit_card',   'CREDIT_CARD',               'Carte de crédit',              0, 'cg_debt'),
  ('c_personal_loan', 'PERSONAL_LOAN',             'Prêts personnels',             1, 'cg_debt'),
  ('c_installment',   'INSTALLMENT',               'Mensualités',                  2, 'cg_debt'),
  ('c_interest',      'INTEREST',                  'Intérêts',                     3, 'cg_debt'),
  ('c_pending_pay',   'PENDING_PAYMENT',           'Paiements en attente',         4, 'cg_debt'),

  ('c_emergency',     'EMERGENCY',                 'Urgences',                     0, 'cg_unexpected'),
  ('c_health',        'HEALTH',                    'Santé',                        1, 'cg_unexpected'),
  ('c_unexpected_rep','UNEXPECTED_REPAIR',         'Réparations urgentes',         2, 'cg_unexpected'),
  ('c_fine',          'FINE',                      'Amendes',                      3, 'cg_unexpected'),
  ('c_unplanned',     'UNPLANNED',                 'Dépenses imprévues',           4, 'cg_unexpected'),

  ('c_internal_xfer', 'INTERNAL_TRANSFER',         'Virement interne',             0, 'cg_transfer'),

  ('c_biz_income',    'BUSINESS_INCOME',           'Entrées MCAN',                 0, 'cg_business'),
  ('c_biz_expense',   'BUSINESS_EXPENSE',          'Sorties MCAN',                 1, 'cg_business');

-- Convert enum columns to TEXT (every existing value is one of the keys
-- just seeded above, since the enum type could not have stored anything else)
ALTER TABLE "personal_transactions" ALTER COLUMN "group" TYPE TEXT USING "group"::TEXT;
ALTER TABLE "personal_transactions" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;
ALTER TABLE "classification_rules" ALTER COLUMN "group" TYPE TEXT USING "group"::TEXT;
ALTER TABLE "classification_rules" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;
ALTER TABLE "budgets" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;
ALTER TABLE "savings_goals" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;

-- Referential integrity via plain foreign keys instead of a Postgres enum —
-- a category/group that doesn't exist in the tables above still can't be
-- stored on a transaction, rule, budget or savings goal.
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_group_fkey" FOREIGN KEY ("group") REFERENCES "category_groups"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_category_fkey" FOREIGN KEY ("category") REFERENCES "categories"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "classification_rules" ADD CONSTRAINT "classification_rules_group_fkey" FOREIGN KEY ("group") REFERENCES "category_groups"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "classification_rules" ADD CONSTRAINT "classification_rules_category_fkey" FOREIGN KEY ("category") REFERENCES "categories"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_fkey" FOREIGN KEY ("category") REFERENCES "categories"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_category_fkey" FOREIGN KEY ("category") REFERENCES "categories"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The enums are now unused by every column — drop them.
DROP TYPE "TransactionGroup";
DROP TYPE "TransactionCategory";
