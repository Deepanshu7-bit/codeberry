import { getDashboardData } from "./actions";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { leads, stats } = await getDashboardData();

  return <DashboardClient initialLeads={leads as any} stats={stats} />;
}
