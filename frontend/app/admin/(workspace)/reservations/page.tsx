import { requireAdmin } from "@/lib/cinema-server";
import Operations from "../../components/Operations";
export default async function ReservationsPage() { const session = await requireAdmin(); return <Operations session={session} view="reservations" />; }
