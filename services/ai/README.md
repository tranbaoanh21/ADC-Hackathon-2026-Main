# PathMemory internal AI service

FastAPI runtime do **Hồng Phúc** sở hữu và được triển khai trực tiếp trong
`services/ai/` của monorepo này. Canonical interface vẫn là
`contracts/ai-service.openapi.yaml` version `1.1.0`; việc chuyển runtime vào
monorepo không thay đổi contract.

Runtime hỗ trợ deterministic mock và Gemini adapter. Mock không gọi network và
vẫn là provider mặc định. Gemini adapter đã được kiểm tra offline bằng fake
client và có một live smoke schema-valid với `gemini-3.1-flash-lite`. Một smoke
request không phải evidence về AI accuracy, latency distribution hay deployment.

## Boundary

Service chỉ trả perception evidence. Nó không truy cập PostgreSQL, không đọc
graph, không chạy BFS, không quản lý navigation session và không trả route,
movement cue, `shouldAdvance`, `STOP_AND_RESCAN` hay safety decision. Client
không gọi FastAPI trực tiếp; Express giữ vai trò consumer của internal API.

Raw frame chỉ được giữ trong memory hoặc temporary multipart spool trong thời
gian request và không được application lưu hoặc log. Runtime cũng không log
bearer token hay raw provider payload.

## Endpoints

- `GET /health` trả `{"status":"ok","schemaVersion":"1.0"}` và không gọi provider.
- `POST /internal/v1/perception` nhận `multipart/form-data`, bearer token,
  metadata contract và 1–3 JPEG/PNG frames.

Runtime interpretation của contract hiện tại:

- thiếu frame hoặc frame/content type/metadata không hợp lệ → HTTP `422`
  `VALIDATION_ERROR`;
- hơn ba frame, một frame quá giới hạn hoặc toàn request quá giới hạn → HTTP
  `413` `PAYLOAD_TOO_LARGE`.

## Environment

Sao chép giá trị cần thiết từ `.env.example` vào secret/environment manager;
application không tự đọc file `.env`.

| Variable | Required/default | Meaning |
|---|---:|---|
| `INTERNAL_SERVICE_TOKEN` | Required for perception | Opaque server-side token shared only with Express. If unset, every perception request is rejected with 401. |
| `MAX_FRAME_BYTES` | `5242880` | Maximum bytes for each frame (5 MiB). |
| `MAX_REQUEST_BYTES` | `16777216` | Maximum multipart request size (16 MiB). |
| `PROVIDER_TIMEOUT_SECONDS` | `15` | Provider execution timeout. |
| `AI_PROVIDER` | `mock` | Select `mock` or `gemini`. Unknown values map perception calls to provider unavailable. |
| `GEMINI_API_KEY` | Required when `AI_PROVIDER=gemini` | Server-side Gemini credential. Never commit, log or send it to a client. |
| `GEMINI_MODEL` | Required when `AI_PROVIDER=gemini` | Explicit vision-capable Gemini model ID; there is no production default. |

The consuming Express service must set `AI_TIMEOUT_MS` slightly above `PROVIDER_TIMEOUT_SECONDS`. Current repository defaults are 18 seconds for Express and 15 seconds for FastAPI, allowing FastAPI to return its stable `504 PROVIDER_TIMEOUT` envelope before Express aborts the upstream request.

Do not put `INTERNAL_SERVICE_TOKEN` in a `VITE_` or `EXPO_PUBLIC_` variable and
do not commit a real token.

## Local setup

From `services/ai/` on PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
$env:INTERNAL_SERVICE_TOKEN = "<local-secret>"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Mock is selected by default. To select Gemini in the same PowerShell session,
set secrets/config outside the repository before starting Uvicorn:

```powershell
$env:AI_PROVIDER = "gemini"
$env:GEMINI_API_KEY = Read-Host "GEMINI_API_KEY" -MaskInput
$env:GEMINI_MODEL = "<vision-capable-gemini-model-id>"
$env:INTERNAL_SERVICE_TOKEN = Read-Host "INTERNAL_SERVICE_TOKEN" -MaskInput
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second PowerShell, set only the same internal service token and run one
permission-safe smoke request with a local test image:

```powershell
$env:INTERNAL_SERVICE_TOKEN = Read-Host "INTERNAL_SERVICE_TOKEN" -MaskInput
curl.exe -X POST "http://127.0.0.1:8000/internal/v1/perception" `
  -H "Authorization: Bearer $env:INTERNAL_SERVICE_TOKEN" `
  -F "requestId=local-gemini-smoke-001" `
  -F "locale=vi-VN" `
  -F "analysisMode=LANDMARK_DISCOVERY" `
  -F "frames=@C:\path\to\permission-safe-frame.png;type=image/png"
```

Do not paste the API key into the command, source files, output, screenshots or
chat. Record only model ID, input class, schema validity and measured processing
time. One smoke response is connectivity/schema evidence, not an accuracy eval.

Run verification:

```powershell
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m pytest
```

The Docker image starts Uvicorn on `0.0.0.0:$PORT` (default `8000`) without
auto-reload. A dashboard reporting `deployed` is not runtime evidence; verify
health and an authenticated mock request separately.

## Provider extension point

`app/providers/base.py` defines the provider-neutral request/interface.
`app/services/perception.py` applies timeout and validates untrusted provider
output against the same strict Pydantic schema used by both providers. The
Gemini adapter uses the official `google-genai` async client with structured
JSON output, then independently parses and validates the response.

Before a Gemini request, Pillow processing runs in worker threads: EXIF
orientation is applied, frames are converted to RGB, resized to a maximum edge
of 1024 pixels and encoded in-memory as JPEG quality 85. No frame is written to
disk by application code. Provider/API errors are sanitized and never include
raw Gemini output, credentials or frame bytes.

Prompt source is versioned at `app/providers/prompt.py` as
`landmark-perception-v3`. It explicitly prevents the provider from making graph,
navigation, movement or safety decisions and defines conservative behavior for
blurry, dark, obstructed, unreadable or conflicting frames. Runtime validation
rejects blank strings, unsupported landmark candidates and low-quality outputs
that omit uncertainty or still propose a landmark. `GEMINI_MODEL` remains
runtime config.

Pilot evidence on 2026-09-22: one permission-approved local PNG and five sampled
video observations were processed by `gemini-3.1-flash-lite`. All six responses
validated against AI-service v1.1 and passed their defined semantic expectations
after frame-level ground-truth review. FastAPI-side latency was P50 3064 ms, P95
11741 ms and max 13989 ms. This small local set is not a general accuracy,
end-to-end latency, reliability-distribution or deployment claim.
FastAPI-generated OpenAPI/docs are disabled so they cannot become a second,
drifting contract; use the canonical repository OpenAPI file instead.
