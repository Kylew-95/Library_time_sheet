import random
import pandas as pd
from flask import Flask, request, send_file, jsonify
from datetime import datetime, timedelta
import sqlite3
import io
from openpyxl.styles import PatternFill
from openpyxl import Workbook
import os

# --- 1. APPLICATION SETUP ---
app = Flask(__name__)
# Ensure the database file is placed in the same directory as the script
DATABASE = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'staff.db')

# --- 2. CONFIGURATION DATA (Verified Constraints) ---

# Role Priority for sorting output
ROLE_PRIORITY = {
    "Duty Manager": 1,
    "Scale 3": 2,
    "Volunteer": 3
}

# Task Configuration: Code (Internal/Logic) and Display Name (Aesthetic)/
TASK_CONFIG = {
    # Tasks with mandatory hourly coverage (Scale 3 only)
    # DISPLAY: SM, GREEN background
    "SM":         {"roles": ["Scale 3"], "mandatory": 1, "full_name": "SM"},
    # DISPLAY: R
    "R":          {"roles": ["Scale 3"], "mandatory": 1, "full_name": "R"},
    # DISPLAY: C (C/AV)
    "C":          {"roles": ["Scale 3"], "mandatory": 0, "full_name": "C (C/AV)"},
    # DISPLAY: C+ (A/T)
    "C+":         {"roles": ["Scale 3"], "mandatory": 0, "full_name": "C+ (A/T)"},

    # Tasks for randomization (Scale 3 and Volunteer)
    "1st":        {"roles": ["Scale 3", "Volunteer"], "mandatory": 0, "full_name": "1st"},
    "Res":        {"roles": ["Scale 3", "Volunteer"], "mandatory": 0, "full_name": "Res"},

    # Fixed 15-minute tasks (handled separately)
    "Set Up":     {"roles": ["Duty Manager"], "mandatory": 0, "full_name": "Set Up"},
    "T":          {"roles": ["Scale 3", "Duty Manager", "Volunteer"], "mandatory": 0, "full_name": "T"}
}
MANDATORY_C_COVERAGE = 2

# Define the green fill style for SM (Used in openpyxl styling)
GREEN_FILL = PatternFill(start_color="92D050",
                         end_color="92D050", fill_type="solid")

# --- 3. DATABASE SETUP AND STAFF MANAGEMENT ---


def init_db():
    """Initializes the SQLite database for staff."""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()


@app.route('/staff', methods=['GET', 'POST'])
def manage_staff():
    """API to view all staff or manually add a new staff member."""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    if request.method == 'POST':
        data = request.json
        name = data.get('name')
        role = data.get('role')
        if not name or not role:
            return jsonify({"error": "Name and Role are required."}), 400

        try:
            c.execute("INSERT INTO staff (name, role) VALUES (?, ?)",
                      (name, role))
            conn.commit()
            return jsonify({"message": f"Staff member {name} added as {role}."}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": f"Staff member {name} already exists."}), 409

    staff_list = c.execute("SELECT name, role FROM staff").fetchall()
    conn.close()

    return jsonify([{"name": s[0], "role": s[1]} for s in staff_list])

# --- 4. CORE SCHEDULING LOGIC ---


def generate_schedule_data(staff_data, date_str):

    # 1. Setup and Time Range
    all_hours = set()
    for staff in staff_data:
        if staff.get("status", "Available") == "Available":
            for h in range(staff["start_hour"], staff["end_hour"]):
                all_hours.add(h)

    MIN_HOUR = min(all_hours) if all_hours else 9
    MAX_HOUR = max(all_hours) if all_hours else 17

    # Sort staff: 1. Available/Unavailable 2. Role Priority 3. Name
    def sort_key(s):
        availability_priority = 1 if s.get(
            "status", "Available") == "Available" else 2
        role_p = ROLE_PRIORITY.get(s["role"], 99)
        return (availability_priority, role_p, s["name"])

    staff_data.sort(key=sort_key)

    pivot_schedule = {s["name"]: {} for s in staff_data}

    # --- 2. Fixed 15-Minute Assignments (Set Up & Tea) ---
    setup_slot_key = "11:45"
    for staff in staff_data:
        if staff.get("status", "Available") == "Available" and staff["role"] == "Duty Manager" and 11 >= staff["start_hour"] < staff["end_hour"]:
            pivot_schedule[staff["name"]][setup_slot_key] = "Set Up"

    for staff in staff_data:
        tea_slot = staff.get("tea_slot")
        if staff.get("status", "Available") == "Available" and tea_slot and tea_slot.startswith("13:"):
            pivot_schedule[staff["name"]][tea_slot] = "T"

    # --- 3. Process Each Full Hour Block (Mandatory/Random Tasks) ---
    for hour in range(MIN_HOUR, MAX_HOUR):
        current_time_str = f"{hour:02d}:00"

        available_staff_for_hour = []
        for s in staff_data:
            if s.get("status", "Available") != "Available":
                continue

            is_on_shift = s["start_hour"] <= hour < s["end_hour"]
            is_on_break = s.get("tea_slot", "") == current_time_str or s.get(
                "setup_slot", "") == current_time_str

            if is_on_shift and not is_on_break:
                available_staff_for_hour.append(s)

        random.shuffle(available_staff_for_hour)
        tasks_assigned_in_hour = []

        # 3a. Enforce Mandatory Tasks (SM, R, C/C+)
        mandatory_tasks_to_assign = ["SM"] * TASK_CONFIG["SM"]["mandatory"]
        mandatory_tasks_to_assign.extend(["R"] * TASK_CONFIG["R"]["mandatory"])
        mandatory_tasks_to_assign.extend(["C", "C+"][:MANDATORY_C_COVERAGE])

        scale3_staff = [
            s for s in available_staff_for_hour if s["role"] == "Scale 3"]

        for task in mandatory_tasks_to_assign:
            if scale3_staff:
                staff_to_assign = scale3_staff.pop(0)
                pivot_schedule[staff_to_assign["name"]
                               ][current_time_str] = task
                tasks_assigned_in_hour.append(staff_to_assign["name"])

        # 3b. Randomize Remaining Tasks (1st, Res)
        remaining_staff = [
            s for s in available_staff_for_hour if s["name"] not in tasks_assigned_in_hour]
        random_tasks = [t for t in TASK_CONFIG if TASK_CONFIG[t]
                        ["mandatory"] == 0 and t not in ["Set Up", "T", "C", "C+", "R"]]

        for staff in remaining_staff:
            role = staff["role"]
            assignable_tasks = [
                t for t in random_tasks if role in TASK_CONFIG[t]["roles"]]

            if assignable_tasks:
                assigned_task = random.choice(assignable_tasks)
                pivot_schedule[staff["name"]][current_time_str] = assigned_task
                tasks_assigned_in_hour.append(staff["name"])

    # --- 4. Format Output as Pivot Table DataFrame ---

    time_columns = []

    # Generate the time columns including all 15-minute slots
    for h in range(MIN_HOUR, MAX_HOUR):
        if h == 11:
            time_columns.extend([f"11:{m:02d}" for m in [0, 15, 30]])
            time_columns.append("11:45")
        elif h == 13:
            time_columns.extend([f"13:{m:02d}" for m in [0, 15, 30, 45]])
        else:
            time_columns.append(f"{h:02d}:00")

    pivot_df_data = []
    # Map internal code to full display name
    task_code_map = {k: v["full_name"] for k, v in TASK_CONFIG.items()}

    for staff in staff_data:
        row = {"Staff Name": staff["name"], "Role": staff["role"]}

        if staff.get("status", "Available") != "Available":
            # Handle Unavailable Staff (SICK, A/L, Other Location Name)
            status_display = staff.get("status_detail", staff["status"])
            if staff["status"] == "Sick":
                status_display = "SICK"
            elif staff["status"] == "Annual Leave":
                status_display = "A/L"

            for col_time_str in time_columns:
                row[col_time_str] = status_display

        else:
            # Handle Available Staff
            for col_time_str in time_columns:
                task_code = pivot_schedule[staff["name"]].get(col_time_str, "")

                if task_code:
                    display_task = task_code_map.get(task_code, task_code)

                    # FINAL CONSTRAINT: Duty Managers only show 'Set Up' and 'T'.
                    if staff["role"] == "Duty Manager" and task_code not in ["Set Up", "T"]:
                        row[col_time_str] = ""
                    else:
                        row[col_time_str] = display_task
                else:
                    row[col_time_str] = ""

        pivot_df_data.append(row)

    df = pd.DataFrame(pivot_df_data)

    # Rename columns for final output aesthetic (Time Block headers: HH:MM-HH:MM)
    def format_time_header(time_str):
        start_time = datetime.strptime(time_str, '%H:%M')
        end_time = start_time + timedelta(minutes=15)
        return f"{start_time.strftime('%H:%M')}-{end_time.strftime('%H:%M')}"

    formatted_time_cols = [format_time_header(c) for c in time_columns]

    final_columns_names = ["Staff Name", "Role"] + formatted_time_cols
    df.columns = final_columns_names

    return df

# --- 5. EXCEL STYLING AND API ENDPOINT ---


def apply_excel_styling(writer, df):
    """Applies specific styling (like green background for SM) to the Excel sheet."""
    workbook = writer.book
    worksheet = writer.sheets['Timesheet']

    # 1. Apply Green Fill for Stock Movement (SM) cells
    sm_display_name = TASK_CONFIG["SM"]["full_name"]  # Which is "SM"
    start_col_index = 2  # Column C in Excel (after A: Staff Name, B: Role)

    for r_idx, row in df.iterrows():
        for c_idx in range(start_col_index, len(df.columns)):
            cell_value = row.iloc[c_idx]

            if cell_value == sm_display_name:
                excel_row = r_idx + 2  # +1 for 1-based indexing, +1 for skipping header row
                excel_col = c_idx + 1  # +1 for 1-based indexing

                cell = worksheet.cell(row=excel_row, column=excel_col)
                cell.fill = GREEN_FILL

    return workbook


@app.route('/generate-timesheet', methods=['POST'])
def generate_timesheet():
    data = request.json

    staff_data = data.get('schedule', [])
    date_str = data.get('date', datetime.now().strftime("%Y-%m-%d"))

    if not staff_data:
        return jsonify({"error": "No staff data provided for scheduling."}), 400

    try:
        df = generate_schedule_data(staff_data, date_str)

        # Convert DataFrame to an Excel file in memory for styling
        output = io.BytesIO()

        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Timesheet', index=False)

            # Apply custom styling and formatting
            apply_excel_styling(writer, df)

        output.seek(0)

        # Apply user-requested filename format: Day, day, month, year
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        formatted_date = date_obj.strftime("%A, %d %B %Y")
        filename = f"Timesheet_{formatted_date}.xlsx"

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        print(f"Scheduling Error: {e}")
        return jsonify({"error": f"Failed to generate timesheet. Error: {str(e)}"}), 500


if __name__ == '__main__':
    # Initialize the database on startup
    init_db()
    print("\n---------------------------------------------------------")
    print("  Flask App Running. Use /staff to manage staff names.")
    print("  Use /generate-timesheet (POST) to create the schedule.")
    print("---------------------------------------------------------")
    app.run(debug=True)
