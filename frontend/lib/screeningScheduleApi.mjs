import { toMovieSchedule } from "./public-movie-catalog.mjs";

/** @param {{ movieId?: string, dateId?: string, now?: Date, apiBaseUrl?: string, fetchImpl?: typeof fetch, signal?: AbortSignal }} options */
export async function loadScreeningSchedule({ movieId = "movie-001", dateId, now = new Date(), apiBaseUrl, fetchImpl = fetch, signal } = {}) {
  const baseUrl = String(apiBaseUrl ?? process.env.API_INTERNAL_URL ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");
  const response = await fetchImpl(`${baseUrl}/api/movies/${encodeURIComponent(movieId)}`, { cache: "no-store", signal });
  if (!response.ok) throw Object.assign(new Error("作品の上映情報を取得できませんでした。"), { status: response.status });
  const detail = await response.json();
  if (detail.movie?.id !== movieId || !Array.isArray(detail.showings)) throw new Error("上映情報の形式を確認してください。");
  return toMovieSchedule(detail, dateId, now);
}
