import { requireAdmin } from "@/lib/cinema-server";
import MovieDetail from "../../../components/MovieDetail";
export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) { await requireAdmin(); const { id } = await params; return <MovieDetail id={id} />; }
