import { useEffect, useState } from "react";
import {
  fetchStaff,
  addStaff,
  deleteStaff,
  generateTimesheet,
  fetchProfiles,
  addProfile,
  deleteProfile,
} from "./api";
import "./App.css";

type Staff = {
  name: string;
  role: string;
  status?: string;
  start_hour?: number;
  end_hour?: number;
  tea_slot?: string;
  status_detail?: string;
};
type Profile = Staff;

const roleOptions = ["Duty Manager", "Scale 3", "Volunteer"];
const statusOptions = ["Available", "Annual Leave", "Sick", "Other Library"];
const MIN_START_HOUR = 11.5;
const MAX_END_HOUR = 16.25;
const TIME_HELPER_TEXT =
  "Select a time between 11:30 and 16:15 (quarter-hour steps only).";
const TEA_HELPER_TEXT =
  "Select 00, 15, 30, or 45 to set tea at 13:00, 13:15, 13:30, or 13:45.";
const TEA_MINUTE_OPTIONS = ["00", "15", "30", "45"];

const timeOptions = (() => {
  const times: string[] = [];
  let current = MIN_START_HOUR;
  while (current <= MAX_END_HOUR + 0.0001) {
    const hours = Math.floor(current);
    const minutes = Math.round((current - hours) * 60);
    const hh = hours.toString().padStart(2, "0");
    const mm = minutes.toString().padStart(2, "0");
    times.push(`${hh}:${mm}`);
    current += 0.25;
  }
  return times;
})();

function parseTimeToDecimal(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (![0, 15, 30, 45].includes(minutes)) return null;
  return hours + minutes / 60;
}

function decimalToTime(value: number): string {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

const blankScheduleJson = () =>
  JSON.stringify(
    {
      schedule: [],
    },
    null,
    2
  );

function appendEntryToScheduleJson(
  currentJson: string,
  entry: Partial<Staff>
): string {
  try {
    const data = JSON.parse(currentJson || "{}");
    const schedule = Array.isArray(data.schedule) ? data.schedule : [];
    return JSON.stringify(
      {
        ...data,
        schedule: [...schedule, entry],
      },
      null,
      2
    );
  } catch (e) {
    return JSON.stringify(
      {
        schedule: [entry],
      },
      null,
      2
    );
  }
}

function App() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState(roleOptions[0]);
  const [status, setStatus] = useState(statusOptions[0]);
  const [statusDetail, setStatusDetail] = useState("");
  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");
  const [teaSlot, setTeaSlot] = useState("");

  const [scheduleJson, setScheduleJson] = useState(blankScheduleJson);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const loadStaff = async () => {
    try {
      setError(null);
      const data = await fetchStaff();
      setStaff(data);
    } catch (e: any) {
      setError(e.message || "Failed to load staff");
    }
  };

  const loadProfiles = async () => {
    try {
      setError(null);
      const data = await fetchProfiles();
      setProfiles(data);
    } catch (e: any) {
      setError(e.message || "Failed to load profiles");
    }
  };

  useEffect(() => {
    loadStaff();
    loadProfiles();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const parsedStart =
        startHour.trim() === ""
          ? undefined
          : parseTimeToDecimal(startHour) ?? undefined;
      const parsedEnd =
        endHour.trim() === ""
          ? undefined
          : parseTimeToDecimal(endHour) ?? undefined;

      if (startHour.trim() !== "" && parsedStart === null) {
        setError("Start time must be HH:MM using 00/15/30/45 minutes.");
        return;
      }
      if (endHour.trim() !== "" && parsedEnd === null) {
        setError("End time must be HH:MM using 00/15/30/45 minutes.");
        return;
      }

      if (
        parsedStart !== undefined &&
        (parsedStart < MIN_START_HOUR || parsedStart > MAX_END_HOUR)
      ) {
        setError("Start time must be between 11:30 and 16:15.");
        return;
      }
      if (
        parsedEnd !== undefined &&
        (parsedEnd < MIN_START_HOUR || parsedEnd > MAX_END_HOUR)
      ) {
        setError("End time must be between 11:30 and 16:15.");
        return;
      }
      if (
        parsedStart !== undefined &&
        parsedEnd !== undefined &&
        parsedStart >= parsedEnd
      ) {
        setError("End hour must be after start hour.");
        return;
      }

      const normalizedTeaSlot = teaSlot.trim();
      if (
        normalizedTeaSlot &&
        !["00", "15", "30", "45"].includes(normalizedTeaSlot)
      ) {
        setError("Tea slot must be 00, 15, 30, or 45 (for 13:00 hour).");
        return;
      }

      const scheduleEntry: Partial<Staff> = {
        name,
        role,
        status,
        status_detail: status === "Other Library" ? statusDetail : undefined,
        start_hour: parsedStart,
        end_hour: parsedEnd,
        tea_slot: normalizedTeaSlot ? `13:${normalizedTeaSlot}` : undefined,
      };

      await addStaff(scheduleEntry as any);
      setScheduleJson((prev) => appendEntryToScheduleJson(prev, scheduleEntry));
      await loadStaff();
      setName("");
      setRole(roleOptions[0]);
      setStatus(statusOptions[0]);
      setStatusDetail("");
      setStartHour("");
      setEndHour("");
      setTeaSlot("");
    } catch (e: any) {
      setError(e.message || "Failed to add staff");
    }
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (!name.trim()) {
        setError("Enter a name before saving a profile.");
        return;
      }
      const parsedStart =
        startHour.trim() === ""
          ? undefined
          : parseTimeToDecimal(startHour) ?? undefined;
      const parsedEnd =
        endHour.trim() === ""
          ? undefined
          : parseTimeToDecimal(endHour) ?? undefined;

      if (startHour.trim() !== "" && parsedStart === null) {
        setError("Start time must be HH:MM using 00/15/30/45 minutes.");
        return;
      }
      if (endHour.trim() !== "" && parsedEnd === null) {
        setError("End time must be HH:MM using 00/15/30/45 minutes.");
        return;
      }

      if (
        parsedStart !== undefined &&
        (parsedStart < MIN_START_HOUR || parsedStart > MAX_END_HOUR)
      ) {
        setError("Start time must be between 11:30 and 16:15.");
        return;
      }
      if (
        parsedEnd !== undefined &&
        (parsedEnd < MIN_START_HOUR || parsedEnd > MAX_END_HOUR)
      ) {
        setError("End time must be between 11:30 and 16:15.");
        return;
      }
      if (
        parsedStart !== undefined &&
        parsedEnd !== undefined &&
        parsedStart >= parsedEnd
      ) {
        setError("End hour must be after start hour.");
        return;
      }

      const normalizedTeaSlot = teaSlot.trim();
      if (
        normalizedTeaSlot &&
        !["00", "15", "30", "45"].includes(normalizedTeaSlot)
      ) {
        setError("Tea slot must be 00, 15, 30, or 45 (for 13:00 hour).");
        return;
      }

      const profile: Partial<Profile> = {
        name,
        role,
        status,
        status_detail: status === "Other Library" ? statusDetail : undefined,
        start_hour: parsedStart,
        end_hour: parsedEnd,
        tea_slot: normalizedTeaSlot ? `13:${normalizedTeaSlot}` : undefined,
      };

      await addProfile(profile as any);
      await loadProfiles();
      setName("");
      setRole(roleOptions[0]);
      setStatus(statusOptions[0]);
      setStatusDetail("");
      setStartHour("");
      setEndHour("");
      setTeaSlot("");
    } catch (e: any) {
      setError(e.message || "Failed to save profile");
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = JSON.parse(scheduleJson);
      const scheduleArray = Array.isArray(payload.schedule)
        ? payload.schedule
        : [];
      if (scheduleArray.length === 0) {
        setError("Add at least one staff entry to schedule before generating.");
        setLoading(false);
        return;
      }
      const { blob, filename } = await generateTimesheet(payload);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Failed to generate timesheet");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (staffName: string) => {
    try {
      setError(null);
      await deleteStaff(staffName);
      await loadStaff();
    } catch (e: any) {
      setError(e.message || "Failed to remove staff");
    }
  };

  const handleDeleteProfile = async (profileName: string) => {
    try {
      setError(null);
      await deleteProfile(profileName);
      await loadProfiles();
    } catch (e: any) {
      setError(e.message || "Failed to remove profile");
    }
  };

  const handleApplyProfile = (profile: Profile) => {
    setName(profile.name);
    setRole(profile.role);
    setStatus(profile.status || statusOptions[0]);
    setStatusDetail(profile.status_detail || "");
    setStartHour(profile.start_hour ? decimalToTime(profile.start_hour) : "");
    setEndHour(profile.end_hour ? decimalToTime(profile.end_hour) : "");
    if (profile.tea_slot && profile.tea_slot.startsWith("13:")) {
      setTeaSlot(profile.tea_slot.split(":")[1]);
    } else {
      setTeaSlot("");
    }
  };

  return (
    <div className="container">
      <h1>Library Time Sheet Frontend</h1>
      {error && <div className="error">{error}</div>}

      <section>
        <h2>Add Staff</h2>
        <form onSubmit={handleAddStaff} className="form-grid">
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {roleOptions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              const next = e.target.value;
              setStatus(next);
              if (next !== "Other Library") setStatusDetail("");
            }}
          >
            {statusOptions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {status === "Other Library" && (
            <input
              required
              placeholder="Which library?"
              value={statusDetail}
              onChange={(e) => setStatusDetail(e.target.value)}
            />
          )}
          <select
            value={startHour}
            onChange={(e) => setStartHour(e.target.value)}
          >
            <option value="">Start time</option>
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={endHour} onChange={(e) => setEndHour(e.target.value)}>
            <option value="">End time</option>
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="hint">{TIME_HELPER_TEXT}</div>
          <select value={teaSlot} onChange={(e) => setTeaSlot(e.target.value)}>
            <option value="">Tea slot (optional)</option>
            {TEA_MINUTE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="hint">{TEA_HELPER_TEXT}</div>
          <button type="submit" className="full-width" id="add-button">
            Add
          </button>
        </form>
      </section>

      <section>
        <h2>Profiles</h2>
        <div className="list">
          {profiles.map((p) => (
            <div key={p.name} className="list-row">
              <strong>{p.name}</strong>
              <span>{p.role}</span>
              {p.status && <span>Status: {p.status}</span>}
              {p.start_hour !== undefined && p.end_hour !== undefined && (
                <span>
                  Shift: {decimalToTime(p.start_hour)}-
                  {decimalToTime(p.end_hour)}
                </span>
              )}
              {p.tea_slot && <span>Tea: {p.tea_slot}</span>}
              <div className="actions">
                <button onClick={() => handleApplyProfile(p)}>Use</button>
                <button onClick={() => handleDeleteProfile(p.name)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={handleAddProfile}
          className="form-grid"
          style={{ marginTop: 12 }}
        >
          <h3 style={{ gridColumn: "1 / -1" }}>
            Save current fields as profile
          </h3>
          <button type="submit" className="full-width">
            Save Profile
          </button>
        </form>
      </section>

      <section>
        <h2>Staff List</h2>
        <button onClick={loadStaff} style={{ marginBottom: 8 }}>
          Refresh
        </button>
        <div className="list">
          {staff.map((s) => (
            <div key={s.name} className="list-row">
              <strong>{s.name}</strong>
              <span>{s.role}</span>
              {s.status && <span>Status: {s.status}</span>}
              {s.start_hour !== undefined && s.end_hour !== undefined && (
                <span>
                  Shift: {s.start_hour}-{s.end_hour}
                </span>
              )}
              {s.tea_slot && <span>Tea: {s.tea_slot}</span>}
              <button onClick={() => handleDelete(s.name)}>Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Generate Timesheet</h2>
        <p>Paste or edit the payload (expects key: schedule[]).</p>
        <textarea
          value={scheduleJson}
          onChange={(e) => setScheduleJson(e.target.value)}
          className="editor"
        />
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate & Download"}
        </button>
      </section>
    </div>
  );
}

export default App;
