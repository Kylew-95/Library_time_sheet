# Deployment Notes

The `netlify.toml` in this repository is configured only to build and host the React frontend from `library_frontend/library-time-sheet-frontend`.

## Will Netlify run the Python backend or database?
Netlify does **not** execute the Python backend under `Python_backend/`, nor does it run a database. Netlify hosts static assets and serverless functions; long-running application servers and databases must be deployed elsewhere (e.g., Render, Railway, Fly.io, or a VPS) and connected to the frontend via API URLs.

## Suggested approach
1. Deploy the Python backend to a service that supports persistent processes and your chosen database.
2. Configure the backend's public URL and any API keys as environment variables for the Netlify site so the frontend can reach the backend.
3. Ensure CORS and authentication settings on the backend allow requests from the Netlify domain.

Keeping the backend and database on a compatible host will ensure your API runs correctly while Netlify serves the frontend build.

## Where to host the Python backend
Any host that can run a long-lived Python process and expose HTTP will work. Popular choices:
- **Render / Railway:** Create a “Web Service” pointing at the `Python_backend` folder. Set build command to `pip install -r requirements.txt` and start command to `gunicorn library_excel:app` (or `python library_excel.py` for quick tests). Render automatically sets `PORT`, so avoid hard-coding a port.
- **Fly.io / DigitalOcean / AWS EC2:** Provision a small VM or container, install Python 3.11+, copy the `Python_backend` folder, install requirements, and run the same start command behind a reverse proxy.
- **Heroku-compatible platforms:** Use a `Procfile` like `web: gunicorn library_excel:app` and deploy from the repo root or the `Python_backend` subdirectory.

### Minimal Render example
1. Push this repo to GitHub (or a private Git provider Render can access).
2. In Render, choose **New > Web Service** and select the repo.
3. Set **Root Directory** to `Python_backend`.
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `gunicorn library_excel:app`
6. Click **Advanced** and add environment variables as needed (e.g., `FLASK_ENV=production`).
7. Deploy. Render will provide a public URL like `https://your-app.onrender.com`.
8. In Netlify, add an environment variable (e.g., `VITE_API_BASE_URL`) pointing to that URL so the React app calls the deployed backend.

The Flask app initializes its SQLite database automatically on first run (`staff.db` alongside `library_excel.py`), but for production you should add backups or switch to a managed database your host supports.
