const API_BASE = process.env.REACT_APP_API_BASE || "/api";

type ResponseType = "json" | "text" | "blob" | "response";

async function request(
  path: string,
  options: RequestInit = {},
  responseType: ResponseType = "json"
) {
  const response = await fetch(`${API_BASE}${path}`, options);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.text();
      if (errorBody) {
        message = `${message}: ${errorBody}`;
      }
    } catch (_error) {
      // Ignore body parsing errors and use default message.
    }
    throw new Error(message);
  }

  switch (responseType) {
    case "text":
      return response.text();
    case "blob":
    case "response":
      return response;
    default:
      return response.json();
  }
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
