import { requireAdmin } from "@/lib/cinema-server";
import Operations from "../../components/Operations";
export default async function ScreensPage() { const session = await requireAdmin(); return <Operations session={session} view="screens" />; }
