# Generic Python Backend To Web App Instructions

## 1. Purpose

Use this document as the complete default specification for turning an existing Python backend into a working web application.

The input folder intentionally contains only three files:

```text
input-folder/
├─ <any-backend-name>.py
├─ .env
└─ WEB_APP_BUILD_INSTRUCTIONS.md
```

The Python filename is not fixed. It may be `keyli.py`, `veronica.py`, `main.py`, or any other valid filename. The implementation must discover the filename from the folder rather than assuming a product name.

There is no `mock up` folder and no reference folder. Do not require the user to provide a new UI reference unless they explicitly request a different visual style.

This document is the design, integration, security, and validation contract for the implementation agent.

## 2. User Inputs

The user may provide these short inputs together with the three-file folder:

```text
Color: <preferred primary color>
Port: <optional backend port>
Notes: <optional additional requirements>
```

Examples:

```text
Color: bright green
Port: 8010
Notes: The interface must support multiple image uploads.
```

Rules:

- If `Color` is provided, use it as the primary visual accent.
- If `Color` is omitted, choose a coherent modern accent and state the choice briefly in the final response.
- If `Port` is provided, use it everywhere.
- If `Port` is omitted, use backend port `8000`.
- If `Notes` are provided, apply them unless they conflict with the existing Python API, security, or technical correctness.
- Do not ask for a new reference design when the request is implementable from this document and the supplied Python file.
- Ask a clarifying question only when a missing detail would make the implementation or API contract impossible to determine.

## 3. First Inspection

Before editing anything, inspect only the three input files and determine:

1. The exact Python filename and importable module name.
2. Whether it exposes a FastAPI `app`, an `APIRouter`, Flask routes, or plain Python functions.
3. All HTTP endpoints, methods, path parameters, form fields, file fields, JSON request models, and response shapes.
4. Whether it already loads `.env` or expects environment variables to be present before import.
5. Which imported packages are required at runtime.
6. Whether the backend uses progress polling, long-running extraction, OCR, Gemini, Google Sheets, Google Slides, or another external service.
7. Whether the backend already contains a frontend-facing API or needs a thin adapter.

Do not infer the API contract from the filename. Read the decorators, request models, response construction, and router registration in the Python source.

Form one concrete implementation hypothesis before the first edit. The cheapest check should be a Python syntax check or import check that can disconfirm the hypothesis.

## 4. Output Structure

After implementation, the folder becomes a complete application. The original three input files must remain usable, but generated application files may be added around them.

Use this structure unless the existing project already has an equivalent structure:

```text
project-root/
├─ app/
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ backend/
│  ├─ __init__.py
│  ├─ index.py
│  ├─ <original-backend-name>.py
│  ├─ requirements.txt
│  ├─ .env
│  └─ credential files only when the original backend requires them
├─ public/
├─ .env.local
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ next.config.ts
├─ postcss.config.mjs
├─ eslint.config.mjs
└─ README.md
```

Move or copy the original Python file into `backend/` while preserving its module name and business logic. Copy the supplied `.env` into `backend/.env` when the backend loader expects a local backend env file. Never move secrets into browser-visible files.

If preserving the original three files at the root is important to the user, keep them there and import or wrap them from `backend/index.py` using a deliberate, tested module path. Do not create duplicate modules with ambiguous names.

Do not create or retain `mock up`, `refrence`, `reference`, Naomi, or another old-product folder unless the user explicitly asks for it.

## 5. Backend Entry Point

The required backend entry point is:

```text
backend/index.py
```

It must expose an ASGI object named `app` and work with:

```powershell
py -m uvicorn backend.index:app --host 127.0.0.1 --port 8000
```

Replace `8000` with the requested port when one is provided.

Create `backend/__init__.py` so Python can import the package consistently.

### 5.1 FastAPI backend

If the original module exposes `router`, create a thin entrypoint that:

1. Loads `backend/.env` before importing the original module.
2. Imports the original module using its actual filename.
3. Creates a FastAPI app.
4. Adds CORS for `http://localhost:3000` and `http://127.0.0.1:3000`.
5. Includes the original router.
6. Exposes the app as `app`.

Generic pattern:

```python
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def load_env_file():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.isfile(env_path):
        return
    with open(env_path, encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()

from . import ORIGINAL_MODULE

app = FastAPI(title="Product API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(ORIGINAL_MODULE.router)
```

Replace `ORIGINAL_MODULE` with the actual Python module name. Do not leave placeholder text in the generated file.

### 5.2 Existing FastAPI app

If the original module already exposes `app`, reuse it when possible. Add CORS and env loading at the smallest correct ownership boundary. Avoid wrapping an app inside another app if that would hide routes or change lifespan behavior.

### 5.3 Non-FastAPI backend

If the original file is Flask or plain Python, do not pretend it is a FastAPI router. Either:

- Preserve its existing framework and create the correct ASGI/WSGI entrypoint, or
- Create a thin FastAPI adapter that calls the existing functions without duplicating business logic.

The adapter must preserve the original request and response semantics as far as practical.

## 6. Environment Handling

The supplied `.env` is the source of truth for backend configuration.

Rules:

- Preserve existing environment variable names.
- Do not invent replacement credential names when an existing variable already serves the purpose.
- Load the env file before importing code that reads environment variables at module import time.
- Keep secrets in `backend/.env` or the exact location required by the original backend.
- Never put secret values in `NEXT_PUBLIC_*` variables.
- Never print secret values in terminal output, screenshots, documentation, or final responses.
- Do not commit service-account JSON or OAuth secrets.
- If a credential path points to an old project directory, update it to a valid path inside the new project only when the credential file is actually available.
- If the credential file is not available, report it as a prerequisite instead of fabricating one.

Frontend `.env.local` should normally contain only:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

When another port is selected, update the URL accordingly.

## 7. Frontend Technology

Use the existing frontend stack when one exists. For a new frontend, use:

- Next.js App Router.
- TypeScript.
- Tailwind CSS when already installed or easy to configure consistently.
- A client component only where browser interaction is required.

Do not add unnecessary dependencies. Use the existing package manager and scripts when present.

## 8. Frontend API Integration

Build the first screen as the actual operational workflow, not a marketing landing page.

Read the Python source and align the UI exactly with the backend contract:

1. Match endpoint paths and HTTP methods.
2. Match field names in `Form`, `File`, and JSON request models.
3. Match whether the backend expects one file or multiple files.
4. Match response keys instead of inventing frontend names.
5. Match the sync payload exactly.
6. Generate a client ID only when the backend supports progress tracking or benefits from it.
7. Poll `/progress/{client_id}` only when that endpoint exists.
8. Show progress messages returned by the backend.
9. Render extraction results in a readable review state before sync when the workflow has a sync step.
10. Display backend error messages in a clear error state.
11. Allow a reset or new-batch action.
12. Disable duplicate submits while a request is active.

Do not assume the frontend should use fields such as `images`, `mode`, `tier`, `vehicle`, `items`, or `data`. Derive them from the actual Python file.

## 9. Visual Design

When no reference is supplied, create a polished operational workspace:

- Use a dark, focused background with a subtle grid, texture, or restrained atmosphere.
- Use the requested color as the primary accent across action buttons, progress, focus, and status elements.
- Use lighter and darker shades for contrast; do not make the entire interface one flat hue.
- Use purposeful panels for upload, progress, review, and success states.
- Keep spacing, contrast, and typography readable on desktop and mobile.
- Add only a few meaningful transitions or progress animations.
- Keep controls stable in size so changing text does not shift the layout.
- Use familiar icons inside action buttons when an icon library is already available.
- Avoid oversized marketing copy when the product is an operational tool.
- Avoid nested decorative cards and unnecessary gradients.
- Avoid default purple-on-white styling unless the user specifically requests it.
- Preserve the user's requested color direction even when the initial Python file has no visual information.

If the user says `green` or `hijau`, choose a fresh emerald, green, or lime accent. If the user says `cyan`, use cyan. Translate casual color descriptions into a coherent accessible palette.

Never allow encoding artifacts such as `Â·`, `Ã`, `â`, or similar mojibake to appear in UI text. Prefer ASCII separators such as `-` when encoding is uncertain.

## 10. Port Rules

Port selection is global:

- Explicit user port wins.
- Otherwise use `8000`.
- Use the same port in the Uvicorn command, `.env.local`, frontend fallback URL, README, and any task configuration.
- Do not use a known occupied port supplied by the user.
- Search active source files for stale port values before completion.
- Ignore generated `.next` output when checking source consistency.

Required default command:

```powershell
py -m uvicorn backend.index:app --host 127.0.0.1 --port 8000
```

Frontend command:

```powershell
npm run dev
```

## 11. Dependencies

Inspect imports in the supplied Python file and include only required packages in `backend/requirements.txt`.

Common packages may include:

```text
fastapi
uvicorn[standard]
python-multipart
numpy
pandas
Pillow
easyocr
gspread
google-generativeai
google-api-python-client
google-auth
google-auth-oauthlib
```

Do not add a package solely because it appeared in another project. Do not silently replace a deprecated package unless the change is required and tested.

## 12. Validation

Run validation from the project root.

### Python syntax

```powershell
py -3 -m py_compile backend/index.py backend/<original-backend-name>.py
```

### Backend import

```powershell
py -3 -c "import backend.index; print(backend.index.app.title)"
```

### Frontend

```powershell
npm install
npm run lint
npm run build
```

### Optional API smoke check

After starting the backend, verify the health or progress endpoint if one exists. Do not call external Google, Gemini, or OCR services merely to prove that the server imports unless the user specifically requests an end-to-end test.

A successful import must use the same module path used by Uvicorn. Warnings from optional libraries are acceptable only when import succeeds and there are no missing dependencies or syntax errors.

## 13. Final Response

Keep the final response concise but include:

1. The generated project structure.
2. The selected color and port.
3. The backend command.
4. The frontend command.
5. Validation results.
6. Any missing prerequisite, especially credentials or required external services.

Do not include secrets or full env values.

Example:

```text
Backend:
py -m uvicorn backend.index:app --host 127.0.0.1 --port 8000

Frontend:
npm run dev
```

## 14. Additional Notes

The supplied Python file is the authority for backend behavior. This document is the authority for project setup, frontend integration, visual defaults, security boundaries, port selection, and validation.

Preserve working business logic. Make the smallest focused changes needed to expose it safely through the web app. Do not fix unrelated bugs unless they block startup, API integration, security, or the requested workflow.
