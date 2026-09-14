export type MovieStatus = "COMING_SOON" | "NOW_SHOWING" | "ENDED" | "UNSCHEDULED";
export type Movie = {
  id: string; title: string; genre: string | null; duration_minutes: number;
  age_rating: string | null; synopsis: string | null; poster_image: string | null;
  release_date: string | null; screening_start: string | null; screening_end: string | null;
  trailer_url: string | null; youtube_id: string | null; status: MovieStatus;
  created_at: string; updated_at: string; showing_count?: number; has_reservations?: boolean;
};
export type MovieInput = {
  title: string; genre: string; duration_minutes: number; age_rating: string;
  synopsis: string; poster_image: string; release_date: string; screening_start: string;
  screening_end: string; trailer_url: string; updated_at?: string;
};
export type AdminSession = { user: { id: number; name: string; email: string; role: "ADMIN" }; csrf_token: string };
export type Showing = {
  id: string; movie_id: string; movie_title: string; screen_id: string; screen_name: string;
  capacity: number; theater_name: string; show_date: string; start_time: string; end_time: string;
  reserved_count: number; has_reservations: boolean;
};
export type Screen = { id: string; name: string; seat_count: number; theater_name: string };
