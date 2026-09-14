import { requireAdmin } from "@/lib/cinema-server";
import MovieLibrary from "../components/MovieLibrary";
export default async function DashboardPage() { const session = await requireAdmin(); return <MovieLibrary session={session} dashboard />; }
