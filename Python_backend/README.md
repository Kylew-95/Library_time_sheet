# Library_time_sheet
This is a simple library time sheet management system built with Python and Flask.

## Running locally
```bash
cd Python_backend
pip install -r requirements.txt
python library_excel.py
```
The app starts a Flask server, initializes `staff.db` (SQLite) if it does not exist, and exposes endpoints such as `/staff`, `/profiles`, and `/generate-timesheet`.

## Deploying
Deploy to any host that can run a persistent Python web service (e.g., Render, Railway, Fly.io, or a small VPS). A typical start command for production is:
```bash
gunicorn library_excel:app
```
For step-by-step guidance (including a Render example) see the repository root `DEPLOYMENT.md`.
