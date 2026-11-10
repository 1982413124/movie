"use client";

import { useEffect, useState } from "react";
import { cinemaApi } from "./cinema-api";
import { useToastError } from "./use-toast-error";
import { toMovieCard } from "./public-movie-catalog.mjs";
import type { Movie, Showing } from "./cinema-types";
import type { MovieCardData } from "@/app/data/movieCatalog";

let pending: Promise<MovieCardData[]> | null = null;

function loadCatalog() {
  if (!pending) {
    pending = cinemaApi<Movie[]>("movies").then(async movies => {
      const cards: MovieCardData[] = [];
      // Only films with registered showings need the schedule lookup.
      let cursor = 0;
      await Promise.all(Array.from({ length: Math.min(4, movies.length) }, async () => {
        while (cursor < movies.length) {
          const index = cursor++;
          const movie = movies[index];
          const detail = movie.showing_count ? await cinemaApi<{ showings: Showing[] }>(`movies/${encodeURIComponent(movie.id)}`) : null;
          cards[index] = toMovieCard(movie, detail?.showings ?? []);
        }
      }));
      return cards;
    }).finally(() => { pending = null; });
  }
  return pending;
}

export function useMovieCatalog() {
  const [movies, setMovies] = useState<MovieCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useToastError(error);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void loadCatalog().then(result => {
        if (active) { setMovies(result); setError(""); }
      }).catch((cause: Error) => {
        if (active) setError(cause.message);
      }).finally(() => { if (active) setLoading(false); });
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [attempt]);
  return { movies, loading, error, reload: () => setAttempt(value => value + 1) };
}
