// Cookies stay on the same origin through the Next.js proxy. Tokens are never persisted in storage.
function apiUrl(path, apiBaseUrl) {
  const root = apiBaseUrl ? `${String(apiBaseUrl).replace(/\/$/, "")}/api` : "/api/cinema";
  return `${root}/${path}`;
}

export class MemberApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "MemberApiError";
    this.status = status;
  }
}

export function isMemberAuthError(error) {
  return error instanceof MemberApiError && error.status === 401;
}

export async function readMemberSession({ apiBaseUrl, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(apiUrl("member/session", apiBaseUrl), {
    credentials: "same-origin", cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new MemberApiError(payload.message ?? "ログイン情報を確認できません。", response.status);
  return payload;
}

export async function memberFetch(path, init = {}, { apiBaseUrl, fetchImpl = fetch, optional = false } = {}) {
  const headers = new Headers(init.headers);
  if (!["GET", "HEAD"].includes(init.method ?? "GET")) {
    try {
      const session = await readMemberSession({ apiBaseUrl, fetchImpl });
      headers.set("X-CSRF-Token", session.csrf_token);
    } catch (error) {
      if (!optional || !isMemberAuthError(error)) throw error;
    }
  }
  return fetchImpl(apiUrl(path, apiBaseUrl), {
    ...init, headers, credentials: "same-origin", cache: "no-store",
  });
}

export async function signOutMember(options) {
  try {
    const response = await memberFetch("member/logout", { method: "POST" }, options);
    if (!response.ok) {
      const payload = await response.json();
      throw new MemberApiError(payload.message ?? "ログアウトできませんでした。", response.status);
    }
  } catch (error) {
    // An expired/revoked session is already signed out. Connection failures must remain visible.
    if (!isMemberAuthError(error)) throw error;
  }
}
