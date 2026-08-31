import { getTreasuryData } from "@/lib/treasury-data";
import TreasuryClient from "./TreasuryClient";

// Same reasoning as /net-worth: no searchParams here, so without this Next
// would prerender once at build time and keep serving a frozen snapshot —
// including right after a mutation (TreasuryClient calls router.refresh()).
export const dynamic = "force-dynamic";

export default async function TreasuryPage() {
  const { snapshots, stats } = await getTreasuryData();
  return <TreasuryClient snapshots={snapshots} stats={stats} />;
}
