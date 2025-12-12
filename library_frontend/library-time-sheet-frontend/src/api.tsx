const API_BASE = process.env.REACT_APP_API_BASE || "/api";
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
