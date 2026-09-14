import { requireAdmin } from "@/lib/cinema-server";
import AdminShell from "../components/AdminShell";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return <AdminShell session={session}>{children}</AdminShell>;
}
