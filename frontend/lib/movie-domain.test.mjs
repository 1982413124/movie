import assert from "node:assert/strict";
import { test } from "node:test";
import { filterMovies, japanDate, movieStatus, validateImage, validateMovie, validDate, youtubeId } from "./movie-domain.mjs";

test("movie status includes start and end dates and uses Japan time", () => {
  assert.equal(japanDate(new Date("2026-09-09T15:00:00Z")), "2026-09-10");
  assert.equal(movieStatus("2026-09-10", "2026-09-20", "2026-09-09"), "COMING_SOON");
  assert.equal(movieStatus("2026-09-10", "2026-09-20", "2026-09-10"), "NOW_SHOWING");
  assert.equal(movieStatus("2026-09-10", "2026-09-20", "2026-09-20"), "NOW_SHOWING");
  assert.equal(movieStatus("2026-09-10", "2026-09-20", "2026-09-21"), "ENDED");
  assert.equal(movieStatus(null, null), "UNSCHEDULED");
});

test("YouTube parsing supports common formats and rejects unsafe origins", () => {
  for (const url of ["https://youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ", "https://m.youtube.com/shorts/dQw4w9WgXcQ"]) assert.equal(youtubeId(url), "dQw4w9WgXcQ");
  for (const url of ["javascript:alert(1)", "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ", "https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ", "https://user@youtube.com/embed/dQw4w9WgXcQ", "https://youtube.com/watch?v=invalid"]) assert.equal(youtubeId(url), null);
});

test("movie validation catches missing fields, invalid numbers and dates", () => {
  const blank = validateMovie({});
  for (const field of ["title", "poster_image", "duration_minutes", "release_date", "screening_start", "screening_end"]) assert.ok(blank[field]);
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2028-02-29"), true);
  const errors = validateMovie({ title: "作品", genre: "ドラマ", synopsis: "紹介", poster_image: "/image.webp", duration_minutes: 1.5, release_date: "2026-09-10", screening_start: "2026-09-10", screening_end: "2026-09-09", trailer_url: "https://example.com" });
  assert.ok(errors.duration_minutes); assert.ok(errors.screening_end); assert.ok(errors.trailer_url);
});

test("images reject unsupported types, zero length and oversized files", () => {
  assert.equal(validateImage({ type: "image/png", size: 5 * 1024 * 1024 }), "");
  assert.ok(validateImage({ type: "image/svg+xml", size: 30 }));
  assert.ok(validateImage({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 }));
  assert.ok(validateImage({ type: "image/png", size: 0 }));
});

test("optional movie credits and official links accept text but reject unsafe or oversized input", () => {
  for (const url of ["https://example.com/movie/?lang=ja#staff", "http://example.jp", "https://映画.jp/作品"]) {
    assert.equal(validateMovie({ official_site_url: url }).official_site_url, undefined);
  }
  for (const url of ["javascript:alert(1)", "data:text/html,test", "//example.com", "https://user:pass@example.com", "https://example.com\\@evil.test", "https://example.com/\npath", "https:///example.com", "https://", "https://example.com:99999", 123]) {
    assert.ok(validateMovie({ official_site_url: url }).official_site_url, String(url));
  }
  for (const [field, limit] of [["director", 255], ["cast_members", 4000], ["distributor", 255], ["official_site_url", 2000]]) {
    assert.equal(validateMovie({ [field]: "" })[field], undefined);
    assert.equal(validateMovie({})[field], undefined);
    assert.ok(validateMovie({ [field]: "a".repeat(limit + 1) })[field]);
    assert.ok(validateMovie({ [field]: ["invalid"] })[field]);
  }
  assert.equal(validateMovie({ cast_members: "出演者 一\n出演者 二" }).cast_members, undefined);
});

test("50 films can be searched, filtered and sorted without mutating source", () => {
  const movies = Array.from({ length: 50 }, (_, index) => ({ id: String(index), title: `作品 ${index}`, genre: index % 2 ? "ドラマ" : "SF", status: index % 2 ? "COMING_SOON" : "NOW_SHOWING", updated_at: String(index).padStart(2, "0"), screening_start: "2026-09-10" }));
  assert.equal(filterMovies(movies, "ＳＦ", "NOW_SHOWING").length, 25);
  assert.equal(filterMovies(movies, "作品 49", "ALL")[0].id, "49");
  assert.equal(filterMovies(movies, "", "ALL")[0].id, "49");
  assert.equal(movies[0].id, "0");
  assert.equal(filterMovies(movies, "存在しない", "ALL").length, 0);
});
