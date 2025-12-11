# Library Time Sheet deployment

This repository is set up for a Netlify deployment that serves a React frontend and a Python serverless function.

## Netlify settings
- **Base directory:** repository root (no special base needed)
- **Build command:** `cd library_frontend/library-time-sheet-frontend && npm install && npm run build`
- **Publish directory:** `library_frontend/library-time-sheet-frontend/build`
- **Functions directory:** `python_functions`
- **Environment:** set `PYTHON_VERSION=3.10` so Netlify installs the Python runtime required by the Flask function.

With this configuration, requests to `/api/*` are redirected to the Python function (`/.netlify/functions/library_excel`), and everything else is served by the React app. The frontend defaults to using the relative `/api` base at runtime.

## Local verification
1. Build the frontend: `cd library_frontend/library-time-sheet-frontend && npm install && npm run build`
2. Test the serverless function locally with the Netlify CLI: `netlify dev --functions python_functions`
3. Confirm `/api` endpoints respond (e.g., `/api/staff`, `/api/profiles`, `/api/generate-timesheet`) and the built site loads from `build/`.
   - When running the Flask app directly instead of Netlify, set `REACT_APP_API_BASE=http://127.0.0.1:5000` so the frontend points to your local server instead of the Netlify function path.

Deploying to Netlify with these values should mirror the local results.
