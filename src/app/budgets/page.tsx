import { getBudgetReport } from "@/lib/dashboard-data";
import BudgetsClient from "./BudgetsClient";
import SavingsGoalsSection from "./SavingsGoalsSection";

// month/year are optional in the URL, so nothing forces dynamic rendering
// on its own — same fix as /dashboard, /net-worth, /household.
export const dynamic = "force-dynamic";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const parsedMonth = sp.month ? Number(sp.month) : NaN;
  const parsedYear = sp.year ? Number(sp.year) : NaN;
  const month = Number.isFinite(parsedMonth) ? parsedMonth : now.getMonth() + 1;
  const year = Number.isFinite(parsedYear) ? parsedYear : now.getFullYear();

  const report = await getBudgetReport(month, year);

  return (
    <>
      <BudgetsClient report={report} month={month} year={year} />
      <SavingsGoalsSection />
    </>
  );
}
