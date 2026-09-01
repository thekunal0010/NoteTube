/** Base URL of the backend API.
 *
 * `NEXT_PUBLIC_API_URL` wins when set, which is how a deployed frontend reaches
 * a backend on a different host — the fallback below derives the host from the
 * page, so it can only ever find a backend sitting on the same machine.
 *
 * The fallback is kept so local development works with no configuration: it
 * resolves to localhost:5000 when browsing locally, and to the LAN address when
 * testing from another device on the network.
 */
export function getBackendUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configured) return configured.replace(/\/+$/, "")

  if (typeof window === "undefined") return ""
  return `http://${window.location.hostname}:5000`
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function clearSessionAndRedirect() {
  if (typeof window === "undefined") return
  localStorage.removeItem("token")
  localStorage.removeItem("name")
  localStorage.removeItem("email")
  if (window.location.pathname !== "/login") {
    window.location.href = "/login"
  }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/**
 * Calls the backend directly (not through the Next.js `/api` rewrite - the
 * dev proxy occasionally drops long-running requests like /summary with a
 * "socket hang up"), attaching the stored JWT as a Bearer token. On a 401 it
 * clears the session and bounces to /login, since that means the token is
 * missing or expired.
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()

  const headers: Record<string, string> = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${getBackendUrl()}${path}`, { ...options, headers })

  if (response.status === 401) {
    clearSessionAndRedirect()
    throw new ApiError("Session expired, please log in again", 401)
  }

  let data: any = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new ApiError(data?.message || "Something went wrong", response.status)
  }

  return data
}

export function apiGet(path: string) {
  return apiFetch(path, { method: "GET" })
}

export function apiPost(path: string, body?: unknown) {
  return apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined })
}

export function apiPut(path: string, body?: unknown) {
  return apiFetch(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined })
}

export function apiDelete(path: string) {
  return apiFetch(path, { method: "DELETE" })
}
