import { describe, expect, it, vi } from "vitest";
import { API_URL, ApiError, errorMessage, fetchSites, integrate } from "./api";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("errorMessage", () => {
  it("passes a string detail through", () => {
    expect(errorMessage(422, { detail: "Unknown site(s): Atlantis" })).toBe("Unknown site(s): Atlantis");
  });

  it("joins FastAPI validation issues and strips the 'Value error' prefix", () => {
    const body = {
      detail: [
        { loc: ["body"], msg: "Value error, start_date must be on or before end_date" },
        { loc: ["body", "start_date"], msg: "Input should be a valid date" },
      ],
    };
    expect(errorMessage(422, body)).toBe(
      "start_date must be on or before end_date; start_date: Input should be a valid date",
    );
  });

  it("falls back to the status code", () => {
    expect(errorMessage(500, null)).toBe("Request failed with HTTP 500");
  });
});

describe("requests", () => {
  it("fetchSites calls /api/sites", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, [{ site: "Valencia", lat: 7.9, lon: 125.09 }]));
    const sites = await fetchSites(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(`${API_URL}/api/sites`, {});
    expect(sites[0].site).toBe("Valencia");
  });

  it("integrate POSTs JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { daily: [] }));
    const req = { sites: ["Valencia"], start_date: "2025-01-01", end_date: "2025-01-31" };
    await integrate(req, fetchImpl);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/integrate`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(req);
  });

  it("raises ApiError with the backend's message and status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(502, { detail: "Upstream API error: HTTP 503" }));
    const err = await integrate({ sites: ["x"], start_date: "", end_date: "" }, fetchImpl).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
    expect(err.message).toBe("Upstream API error: HTTP 503");
  });

  it("explains a network failure", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchSites(fetchImpl)).rejects.toThrow(/Cannot reach the backend/);
  });
});
