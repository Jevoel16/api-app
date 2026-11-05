import type { IntegrationRequest, IntegrationResponse, Site } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

type ValidationIssue = { msg?: string; loc?: (string | number)[] };

/** Turn a FastAPI error body ({detail: string | ValidationIssue[]}) into one readable line. */
export function errorMessage(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return (detail as ValidationIssue[])
      .map((d) => {
        const msg = (d.msg ?? "Invalid value").replace(/^Value error, /, "");
        const field = d.loc?.filter((p) => p !== "body").join(".");
        return field ? `${field}: ${msg}` : msg;
      })
      .join("; ");
  }
  return `Request failed with HTTP ${status}`;
}

async function request<T>(path: string, init: RequestInit = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(`Cannot reach the backend at ${API_URL}. Is FastAPI running?`);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(errorMessage(res.status, body), res.status);
  return body as T;
}

export function fetchSites(fetchImpl?: typeof fetch): Promise<Site[]> {
  return request<Site[]>("/api/sites", {}, fetchImpl);
}

export function integrate(req: IntegrationRequest, fetchImpl?: typeof fetch): Promise<IntegrationResponse> {
  return request<IntegrationResponse>(
    "/api/integrate",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) },
    fetchImpl,
  );
}
