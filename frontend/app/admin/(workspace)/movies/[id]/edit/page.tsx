import { requireAdmin } from "@/lib/cinema-server";
import MovieForm from "../../../../components/MovieForm";
export default async function EditMoviePage({ params }: { params: Promise<{ id: string }> }) { const session = await requireAdmin(); const { id } = await params; return <MovieForm session={session} movieId={id} />; }
