import { requireAdmin } from "@/lib/cinema-server";
import MovieForm from "../../../components/MovieForm";
export default async function NewMoviePage() { const session = await requireAdmin(); return <MovieForm session={session} />; }
