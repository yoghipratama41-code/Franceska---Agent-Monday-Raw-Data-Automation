# Franceska Web App

Franceska runs the existing Google Sheets cleaning workflow and monitors both sessions from a browser workspace.

## Run locally

Backend:

```powershell
py -m uvicorn backend.index:app --host 127.0.0.1 --port 8010
```

Frontend:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000` after starting both services.

The backend requires the supplied environment values, a `backend/gns_gcp_account.json` service-account file, Google Sheets access, Chrome, and network access to the GNS Data Cleaner pipeline.