import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDashboardData } from "./actions";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  // Fetch initial dashboard data via Drizzle on the server
  const data = await getDashboardData();

  return <AdminDashboardClient initialData={data} />;
}
