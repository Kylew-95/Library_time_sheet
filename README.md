# Library Time Sheet deployment

This repository is set up for a Netlify deployment that serves a React frontend and a Python serverless function.

## Netlify settings
- **Base directory:** repository root (no special base needed)
- **Build command:** `cd library_frontend/library-time-sheet-frontend && npm install && npm run build`
- **Publish directory:** `library_frontend/library-time-sheet-frontend/build`
- **Functions directory:** `python_functions`
- **Environment:** set `PYTHON_VERSION=3.10` so Netlify installs the Python runtime required by the Flask function.

With this configuration, requests to `/api/*` are redirected to the Python function, and everything else is served by the React app.

## Local verification
1. Build the frontend: `cd library_frontend/library-time-sheet-frontend && npm install && npm run build`
2. Test the serverless function locally with the Netlify CLI: `netlify dev --functions python_functions`
3. Confirm `/api/library_excel` responds and the built site loads from `build/`.

Deploying to Netlify with these values should mirror the local results.
