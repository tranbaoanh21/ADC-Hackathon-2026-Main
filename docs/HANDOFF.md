# Team Handoff

Current state: Stage 4 landmark-graph scope and versioned contracts are ready for parallel implementation. The FastAPI vertical slice in `services/ai/` includes deterministic mock, a Gemini adapter and a permission-approved six-observation visual run for `landmark-perception-v3`; application integration remains pending.

## Current integration boundary

- Product contract: `contracts/product-api.openapi.yaml` v2.0.0
- AI-service contract: `contracts/ai-service.openapi.yaml` v1.1.0
- Examples: `contracts/examples/`
- Technical flow: `docs/TECHNICAL_FLOW.md`
- Mock/live providers: deterministic mock and Gemini adapter implemented; one local Gemini smoke passed
- Database schema: entities/constraints planned, migration not created
- Deployment: not started

## FastAPI monorepo handoff

```text
Date/time: 2026-09-22
From: Hồng Phúc / AI-model track
To: Bảo Anh and integration track
Branch/path: feat/fastapi-perception / services/ai/
Implementation commit: bd3b4f8 (`feat(ai): add landmark perception service`)
Task objective: Implement the smallest AI-service v1.1 FastAPI vertical slice with deterministic mock and a swappable Gemini adapter.

Decision:
- FastAPI remains in this monorepo under services/ai/; no separate repository will be created.
- Owner remains Hồng Phúc.
- Canonical contract remains contracts/ai-service.openapi.yaml v1.1.0.
- This repository-location decision is not a breaking contract change.

Runtime scope:
- GET /health without a provider call.
- Authenticated multipart POST /internal/v1/perception.
- Strict request/frame limits and JPEG/PNG byte validation.
- Strict Pydantic success/error schemas and deterministic mock provider.
- Gemini adapter with structured output, in-memory image preparation and sanitized provider errors.
- No PostgreSQL, graph, BFS, session, movement cue or safety decision.

Evidence boundary:
- Gemini adapter is tested with fake clients and a permission-approved live
  `gemini-3.1-flash-lite` run over one PNG and five sampled video frames.
- All six responses were schema-valid and passed their defined semantic
  expectations after frame-level ground-truth review. This is a small pilot set,
  not a general accuracy claim.
- FastAPI-side latency for that run was P50 3064 ms, P95 11741 ms and max
  13989 ms. It is not end-to-end latency; the high outlier remains unresolved.
- No deployment, end-to-end latency, reliability-distribution or cost claim
  exists yet.
- Mock output is development/integration evidence only, not AI-quality evidence.

Contract impact: none.
Local verification: Python 3.13.9; Ruff lint/format passed; 48 pytest cases passed; local Uvicorn health and authenticated mock perception returned 200. The visual eval runner extracted five ordered frames from a local video, sent them with one local PNG through `gemini-3.1-flash-lite`, validated AI-service v1.1 output and recorded only structured JSONL under the ignored `evals/runs/` directory. Raw media remains ignored. No API key was printed or recorded in repository documentation.

Files for Bảo Anh:
- Canonical interface: `contracts/ai-service.openapi.yaml` v1.1.0.
- Product-safe example response: `contracts/examples/ai-perception-success.json`.
- FastAPI setup and environment: `services/ai/README.md` and `services/ai/.env.example`.
- Fixed local visual manifest: `evals/cases/visual-local.json`.
- Live/local eval command: `services/ai/scripts/run_live_visual_eval.ps1`.

Integration action for Bảo Anh:
1. Keep mobile/web calling Express only; do not call FastAPI directly.
2. Configure Express with the FastAPI base URL and matching internal bearer token.
3. Send one-to-three ephemeral JPEG/PNG frames plus `requestId`, `locale` and `analysisMode` as multipart data.
4. Validate the response against AI-service v1.1 before storing any field.
5. Store an explicitly accepted candidate as `AI_DRAFT`; FastAPI must not write PostgreSQL or approve the landmark.
6. Map timeout/provider/schema errors without advancing a route or navigation session.

Known follow-up work for Hồng Phúc:
- Expand the fixed visual set from 6 observations to 10-20 representative positive and negative cases.
- Deploy FastAPI and record its production identifier without recording secrets.
- Measure end-to-end latency and cost with the Express integration; current latency is FastAPI-side only.
```

## Original scope handoff (historical snapshot)

The packet below records the state before the FastAPI implementation. The
current FastAPI status and verification evidence in the section above supersede
its pending-runtime notes.

```text
Date/time: 2026-09-21
From: Bảo Anh / product-scope thread
To: Bảo Anh, Hồng Phúc and both coding-agent threads
Branch/commit: codex/pathmemory-scope-contracts / 4e72a76
Task objective: Replace fixed-route replay with a bounded, human-reviewed landmark graph while preserving the perception-only AI boundary.

Confirmed product:
- Day 1: a blind/low-vision employee explores a bounded office area with a human buddy. AI proposes structured candidates; Express stores explicitly accepted candidates as AI_DRAFT in PostgreSQL.
- Admin web lists the stored drafts. Admin edits/verifies landmarks, creates directed from/to edges, chooses a relative maneuver, edits the spoken cue and publishes the graph.
- Day 2+: the employee uses a screen reader to select an origin and a destination reachable through published directed edges.
- Express computes a deterministic FEWEST_EDGES path with BFS and starts in AWAITING_START_CONFIRMATION.
- Camera perception must confirm the selected origin before Express returns the first movement cue. Later matches advance only along plannedPath.
- The app provides workplace-memory/orientation speech. It does not detect obstacles, assert safety or replace a cane/guide dog/O&M skills.
- No exact coordinates, GPS-like navigation, QR, SLAM, RAG or raw-image retention.

Demo graph:
- Reception
- Elevator Level 2
- Meeting Room A
- Restroom Level 2
- One branch and explicit reverse edges for supported return travel.

Ownership:
- Bảo Anh: Expo mobile, React web, Express, PostgreSQL/Prisma, Product API v2, graph validation, BFS, session FSM, mock/live AI adapter, accessibility and application deployment.
- Hồng Phúc: FastAPI repository/runtime, AI-service v1.1, provider adapter, preprocessing, prompt, structured perception, Pydantic validation, AI eval and AI-service deployment.
- Shared: AI-service semantics, examples, integration tests and breaking changes.

Contract impact:
- Product API 2.0.0 is breaking: /api/v2 paths, graph semantics, displayOrder, reachable destinations, origin/destination session request, plannedPath and start confirmation.
- AI-service 1.1.0 is unchanged. FastAPI still implements POST /internal/v1/perception and never computes product routes.
- Mock and live AI responses must validate against the same AI-service schema.

Not validated yet:
- No end-user validation, runtime, AI eval, accessibility test, latency measurement or end-to-end demo exists.
- FastAPI repository URL/path remains TBD.

Next exact action for Bảo Anh:
- Implement Product API v2 runtime validators, the four-landmark graph fixture, deterministic BFS/session logic and mock perception adapter before UI breadth.

Next exact action for Hồng Phúc:
- Pull this branch/commit; implement POST /internal/v1/perception from AI-service v1.1 and ai-* examples; record the AI repository URL/path and commit here.
```

## Contract change rule

Before changing `contracts/ai-service.openapi.yaml`, state:

```text
Field/endpoint being changed
Reason
Additive or breaking
Express consumer impact
FastAPI producer impact
Example/test updates
```

Do not merge a breaking AI-boundary change until both owners have compatible implementations or an agreed transition. Product API v2 changes do not require FastAPI to implement graph/path behavior.

## Handoff rules

- Reference a branch and commit; do not say only “code mới nhất”.
- State contract impact explicitly.
- Do not report a live-model test as passed without model ID, test input class and result.
- Do not paste token, `.env`, database URL, private frame or unique submission link.
- FastAPI changes must reference the monorepo branch/commit and `services/ai/` path in this file.
- If a task is merged, update `docs/PROJECT_STATUS.md` in the same PR or immediately after merge.
