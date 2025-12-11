const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:5000";
export async function fetchStaff() {
  const res = await fetch(`${API_BASE}/staff`);
  if (!res.ok) throw new Error(`Staff fetch failed: ${res.status}`);
  return res.json();
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
  const res = await fetch(`${API_BASE}/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchProfiles() {
  const res = await fetch(`${API_BASE}/profiles`);
  if (!res.ok) throw new Error(`Profiles fetch failed: ${res.status}`);
  return res.json();
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
  const res = await fetch(`${API_BASE}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteProfile(name: string) {
  const encoded = encodeURIComponent(name);
  const res = await fetch(`${API_BASE}/profiles/${encoded}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteStaff(name: string) {
  const encoded = encodeURIComponent(name);
  const res = await fetch(`${API_BASE}/staff/${encoded}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateTimesheet(payload: any) {
  const res = await fetch(`${API_BASE}/generate-timesheet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const dispo = res.headers.get("content-disposition") || "";
  const match = dispo.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : "Timesheet.xlsx";
  return { blob, filename };
}
