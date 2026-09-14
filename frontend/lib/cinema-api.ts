export class CinemaError extends Error {
  constructor(message: string, public status: number, public fields: Record<string, string> = {}) {
    super(message);
  }
}

export async function cinemaApi<T>(path: string, options: RequestInit = {}, csrf?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (csrf) headers.set("X-CSRF-Token", csrf);
  try {
    const response = await fetch(`/api/cinema/${path}`, {
      ...options, headers, credentials: "same-origin", cache: "no-store",
      signal: options.signal ?? AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok) throw new CinemaError(result.message || "操作を完了できませんでした。", response.status, result.errors);
    return result as T;
  } catch (error) {
    if (error instanceof CinemaError) throw error;
    throw new CinemaError("通信に失敗しました。接続を確認して再試行してください。", 0);
  }
}
