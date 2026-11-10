import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminSession } from "./cinema-types";

export function backendUrl() {
  return process.env.API_INTERNAL_URL ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
}

export async function requireAdmin(): Promise<AdminSession> {
  const cookie = (await cookies()).get("cinema_admin_session");
  if (!cookie) redirect("/admin/login");
  let response: Response;
  try {
    response = await fetch(`${backendUrl()}/api/admin/session`, {
      headers: { Cookie: `cinema_admin_session=${cookie.value}` },
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
  } catch {
    redirect("/admin/login?reason=unavailable");
  }
  if (!response.ok) redirect(`/admin/login?reason=${response.status === 503 ? "unavailable" : "expired"}`);
  return response.json();
}
