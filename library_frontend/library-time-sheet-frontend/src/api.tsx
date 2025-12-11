// Prefer the rewrite-friendly /api base, but allow an override for local
// development and fall back to the direct Netlify function path if /api is
// not available.
const PRIMARY_API_BASE = process.env.REACT_APP_API_BASE || "/api";
const FALLBACK_API_BASE =
  PRIMARY_API_BASE === "/api" ? "/.netlify/functions/library_excel" : "/api";

async function request(
  path: string,
  options?: RequestInit,
  parse: "json" | "blob" = "json"
) {
  const endpoints = [PRIMARY_API_BASE, FALLBACK_API_BASE].filter(
    (base, idx, arr) => base && arr.indexOf(base) === idx
  );

  let lastResponse: Response | null = null;

  for (const base of endpoints) {
    const res = await fetch(`${base}${path}`, options);
    lastResponse = res;
    // Try next base only on 404 to recover from missing rewrites
    if (res.status === 404) continue;
    if (!res.ok) {
      throw new Error(parse === "json" ? await res.text() : `${res.status}`);
    }
    return parse === "json" ? res.json() : res;
  }

  if (!lastResponse) {
    throw new Error("No response from API");
  }

  throw new Error(
    `API request failed with status ${lastResponse.status} at both endpoints.`
  );
}
export async function fetchStaff() {
  return request("/staff");
}

export async function addStaff(data: {
  name: string;
  role: string;
  status?: string;
  start_hour?: number;
  end_hour?: number;
  tea_slot?: string;
  status_detail?: string;
}) {
  return request(
    "/staff",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    "json"
  );
}

export async function fetchProfiles() {
  return request("/profiles");
}

export async function addProfile(data: {
  name: string;
  role: string;
  status?: string;
  start_hour?: number;
  end_hour?: number;
  tea_slot?: string;
  status_detail?: string;
}) {
  return request(
    "/profiles",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    "json"
  );
}

export async function deleteProfile(name: string) {
  const encoded = encodeURIComponent(name);
  return request(
    `/profiles/${encoded}`,
    {
      method: "DELETE",
    },
    "json"
  );
}

export async function deleteStaff(name: string) {
  const encoded = encodeURIComponent(name);
  return request(
    `/staff/${encoded}`,
    { method: "DELETE" },
    "json"
  );
}

export async function generateTimesheet(payload: any) {
  const res = (await request(
    "/generate-timesheet",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "blob"
  )) as Response;
  const blob = await res.blob();
  const dispo = res.headers.get("content-disposition") || "";
  const match = dispo.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : "Timesheet.xlsx";
  return { blob, filename };
}
