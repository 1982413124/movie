export const STATUS_LABELS = {
  NOW_SHOWING: "上映中", COMING_SOON: "公開予定", ENDED: "上映終了", UNSCHEDULED: "期間未設定",
};

export function japanDate(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function movieStatus(start, end, today = japanDate()) {
  if (!start || !end) return "UNSCHEDULED";
  if (today < start) return "COMING_SOON";
  if (today > end) return "ENDED";
  return "NOW_SHOWING";
}

export function youtubeId(value) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    const parts = url.pathname.replace(/^\/|\/$/g, "").split("/");
    let id = null;
    if (url.hostname === "youtu.be" && parts.length === 1) id = parts[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (parts.length === 2 && ["embed", "shorts"].includes(parts[0])) id = parts[1];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === value && +value.slice(0, 4) >= 1900 && +value.slice(0, 4) <= 2200;
}

export function validateMovie(input) {
  /** @type {Record<string, string>} */
  const errors = {};
  for (const [key, label] of [["title", "タイトル"], ["genre", "ジャンル"], ["synopsis", "あらすじ"], ["poster_image", "サムネイル"]]) {
    if (!String(input[key] ?? "").trim()) errors[key] = `${label}を入力してください。`;
  }
  if ((input.title?.length ?? 0) > 255) errors.title = "255文字以内で入力してください。";
  if (!Number.isInteger(input.duration_minutes) || input.duration_minutes < 1 || input.duration_minutes > 600) errors.duration_minutes = "上映時間は1〜600分の整数で入力してください。";
  for (const key of ["release_date", "screening_start", "screening_end"]) {
    if (!validDate(input[key])) errors[key] = "有効な日付を入力してください。";
  }
  if (!errors.screening_start && !errors.screening_end && input.screening_end < input.screening_start) errors.screening_end = "終了日は開始日以降にしてください。";
  if (input.trailer_url && !youtubeId(input.trailer_url)) errors.trailer_url = "有効なYouTube動画のURLを入力してください。";
  return errors;
}

export function validateImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "JPEG・PNG・WebP画像を選んでください。";
  if (file.size === 0 || file.size > 5 * 1024 * 1024) return "画像は5MB以下にしてください。";
  return "";
}

export function filterMovies(movies, query, status, sort = "updated") {
  const needle = query.trim().normalize("NFKC").toLocaleLowerCase("ja");
  return movies.filter(movie => (!status || status === "ALL" || movie.status === status) &&
    `${movie.title} ${movie.genre ?? ""}`.normalize("NFKC").toLocaleLowerCase("ja").includes(needle))
    .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, "ja") : sort === "start" ? (a.screening_start ?? "9999").localeCompare(b.screening_start ?? "9999") : b.updated_at.localeCompare(a.updated_at));
}
