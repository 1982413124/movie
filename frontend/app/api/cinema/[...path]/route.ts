import { backendUrl } from "@/lib/cinema-server";

type Context = { params: Promise<{ path: string[] }> };
const MAX_BODY = 5 * 1024 * 1024 + 128 * 1024;

async function forward(request: Request, context: Context) {
  const { path } = await context.params;
  if (!path.length || path.some(part => !/^[A-Za-z0-9_.-]+$/.test(part) || part === "..")) {
    return Response.json({ message: "ページが見つかりません。" }, { status: 404 });
  }
  if (!["admin", "movies", "media", "screenings", "login", "register", "member", "reservations"].includes(path[0])) {
    return Response.json({ message: "ページが見つかりません。" }, { status: 404 });
  }
  const isWrite = !["GET", "HEAD"].includes(request.method);
  let sameOrigin = false;
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    // Next may build request.url from its internal bind address behind a proxy.
    // The browser Host must still match, and Flask checks the deployment allowlist.
    sameOrigin = ["http:", "https:"].includes(origin.protocol)
      && origin.origin === request.headers.get("origin")
      && origin.host === request.headers.get("host");
  } catch { /* Missing or malformed origins cannot perform writes. */ }
  if (isWrite && !sameOrigin) {
    return Response.json({ message: "操作元を確認できません。" }, { status: 403 });
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY) {
    return Response.json({ message: "画像は5MB以下にしてください。" }, { status: 413 });
  }
  try {
    const headers = new Headers();
    for (const name of ["cookie", "content-type", "origin", "x-csrf-token"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    let body: Uint8Array | undefined;
    if (isWrite && request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY) {
          await reader.cancel();
          return Response.json({ message: "画像は5MB以下にしてください。" }, { status: 413 });
        }
        chunks.push(value);
      }
      body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    }
    const upstream = await fetch(`${backendUrl()}/api/${path.join("/")}${new URL(request.url).search}`, {
      method: request.method, headers, body: body as BodyInit | undefined,
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15000),
    });
    const outgoing = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    for (const name of ["content-type", "set-cookie"]) {
      const value = upstream.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    if (path[0] === "media" && upstream.ok) outgoing.set("Cache-Control", "public, max-age=31536000, immutable");
    return new Response(upstream.body, { status: upstream.status, headers: outgoing });
  } catch {
    return Response.json({ message: "サーバーに接続できません。時間をおいて再試行してください。" }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const DELETE = forward;

export const PATCH = forward;
