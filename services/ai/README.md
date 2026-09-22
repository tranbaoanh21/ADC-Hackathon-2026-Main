# PathMemory FastAPI perception service

Owner: **Hồng Phúc**

Canonical interface: `contracts/ai-service.openapi.yaml` v1.1.0

Read `AGENTS.md` first. This service is an internal perception boundary consumed only by Express.

## Start here for an agent

```text
Read AGENTS.md, this README, contracts/ai-service.openapi.yaml and
contracts/examples/ai-*.json. Check git status and branch.

Implement or refine only services/ai and evals. Preserve AI-service v1.1.
FastAPI may interpret frames and return structured landmark evidence, but it
must not use PostgreSQL, build graph edges, run BFS, infer left/right/straight,
write user navigation sentences, advance sessions or make safety decisions.
Run Ruff and pytest. Report contract impact, model/config tested, eval evidence,
latency, limitations and changed files.
```

## Boundary

FastAPI may:

- validate multipart metadata and JPEG/PNG bytes;
- check frame quality;
- apply EXIF orientation, RGB conversion, resize and in-memory encoding;
- ask Gemini for structured visible text, scene context, landmark candidates, stable features and uncertainty;
- return stable validation/provider/timeout errors.

FastAPI must not:

- access application PostgreSQL;
- deduplicate, approve or publish landmarks;
- infer graph connectivity or edge maneuvers;
- run BFS/DFS/Dijkstra;
- manage navigation sessions or expected-landmark transitions;
- produce user-facing route narration;
- assert obstacle detection or safety.

The application uses explicit, screen-reader-triggered capture with at most one request in flight. AI-service v1.1 still accepts one to three frames for one observation. Raw frames are request-local and are not stored or logged by application code.

## Endpoints

- `GET /health` returns service status without calling Gemini.
- `POST /internal/v1/perception` requires a bearer internal token and multipart fields defined by the canonical OpenAPI.

Current error policy:

- invalid/missing metadata or frame → `422 VALIDATION_ERROR`;
- per-frame or request size limit exceeded → `413 PAYLOAD_TOO_LARGE`;
- bad/missing internal token → `401`;
- provider unavailable/error → stable provider envelope;
- provider timeout → `504 PROVIDER_TIMEOUT`.

## Environment

| Variable | Default/requirement |
|---|---|
| `INTERNAL_SERVICE_TOKEN` | Required for perception; shared server-side with Express |
| `MAX_FRAME_BYTES` | `5242880` |
| `MAX_REQUEST_BYTES` | `16777216` |
| `PROVIDER_TIMEOUT_SECONDS` | `30` |
| `AI_PROVIDER` | `mock`; set `gemini` for live provider |
| `GEMINI_API_KEY` | Required only for Gemini; never commit/log |
| `GEMINI_MODEL` | Explicit vision-capable model ID; no production default |
| `DEMO_ALLOW_MOVABLE_LANDMARKS` | `true` for the current stage-demo build; selects one prominent prop such as a chair or bag |

Express `AI_TIMEOUT_MS` must be longer than the provider timeout so FastAPI can return its stable timeout envelope first. Repository examples use 35 seconds for Express and 30 seconds for FastAPI; mobile waits 40 seconds so it can receive that structured response instead of aborting first.

`DEMO_ALLOW_MOVABLE_LANDMARKS=true` selects the short
`landmark-perception-v5-demo-prop` prompt. It permits one visually dominant prop
as a temporary candidate while preserving JSON validation, human confirmation
and all route/safety boundaries. This repository currently defaults to `true`
for the stage demonstration. Set it to `false` when evaluating production
workplace landmark rules.

## Local setup

macOS/Linux from `services/ai/`:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
cp .env.example .env
set -a
source .env
set +a
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

FastAPI does not load `services/ai/.env` automatically. Source it as shown
above every time the service starts, and restart the process after changing
model or timeout values.

PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
$env:INTERNAL_SERVICE_TOKEN = "<local-secret>"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Mock is the default. To run Gemini, set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL` and the internal token in the server environment. Never paste secrets into source, command history, screenshots, logs or chat.

## Verification

```bash
.venv/bin/python -m ruff check .
.venv/bin/python -m ruff format --check .
.venv/bin/python -m pytest
```

Use the equivalent `.venv\Scripts\python.exe` commands on Windows.

For one permission-safe smoke request:

```bash
curl -X POST http://127.0.0.1:8000/internal/v1/perception \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -F requestId=local-smoke-001 \
  -F locale=vi-VN \
  -F analysisMode=LANDMARK_DISCOVERY \
  -F 'frames=@/path/to/permission-safe-frame.png;type=image/png'
```

One smoke proves connectivity/schema only, not model accuracy.

## Implementation map

- `app/providers/base.py` — provider-neutral interface.
- `app/providers/prompt.py` — versioned perception prompt.
- `app/services/perception.py` — timeout and strict output validation.
- Gemini adapter — official async client and structured JSON output.
- `tests/` — request validation, provider mapping and service behavior.
- `scripts/visual_eval.py` — fixed image/video observation runner.
- `scripts/trigger_keyframes.py` — optional offline trigger-window frame selection experiment; not Product API behavior.

FastAPI-generated OpenAPI/docs remain disabled to avoid a second drifting contract. Update the repository OpenAPI, examples, Pydantic models and both producer/consumer tests together for any agreed change.

## Evidence and next work

Prior local verification recorded 53 pytest cases with Ruff/format passing. A permission-approved pilot using one PNG and five sampled video observations returned six schema-valid results that passed their case-specific semantic expectations. FastAPI-side latency was P50 3064 ms, P95 11741 ms and max 13989 ms.

This is a small pilot, not a general accuracy, reliability, cost, end-to-end latency or deployment claim.

Next priorities:

1. expand to 10–20 representative positive and negative cases;
2. record failures and conservative uncertainty behavior;
3. deploy FastAPI with server-side secrets;
4. run Express → FastAPI mock and Gemini smoke;
5. measure end-to-end latency and estimated cost.
