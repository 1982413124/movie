import { isDateId } from "@/lib/cinemaDate.mjs";
import { movieDetail } from "@/lib/seatSelection.mjs";
import { loadScreeningSchedule } from "@/lib/screeningScheduleApi.mjs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const dateId = params.get("date") || undefined;
  const movieId = params.get("movieId") || movieDetail.id;
  if ((dateId && !isDateId(dateId)) || !/^[A-Za-z0-9_-]{1,100}$/.test(movieId)) {
    return Response.json({ message: "指定された作品または日付を確認してください。" }, { status: 400 });
  }
  try {
    const schedule = await loadScreeningSchedule({ movieId, dateId, signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]) });
    return Response.json(schedule, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (cause instanceof Error && "status" in cause && cause.status === 404) return Response.json({ message: "作品が見つかりません。" }, { status: 404 });
    return Response.json({ message: "上映スケジュールを取得できませんでした。" }, { status: 503 });
  }
}
