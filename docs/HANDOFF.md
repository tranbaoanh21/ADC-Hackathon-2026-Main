# Team Handoff

Current state: Stage 4 landmark-graph scope and versioned contracts are ready for parallel implementation. No application or FastAPI runtime has been implemented yet.

## Current integration boundary

- Product contract: `contracts/product-api.openapi.yaml` v2.0.0
- AI-service contract: `contracts/ai-service.openapi.yaml` v1.1.0
- Examples: `contracts/examples/`
- Technical flow: `docs/TECHNICAL_FLOW.md`
- Mock/live providers: contract defined, implementation pending
- Database schema: entities/constraints planned, migration not created
- Deployment: not started

## Latest context handoff

```text
Date/time: 2026-09-21
From: Bảo Anh / product-scope thread
To: Bảo Anh, Hồng Phúc and both coding-agent threads
Branch/commit: codex/pathmemory-scope-contracts / 0590445
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
- When Hồng Phúc creates/uses a separate AI repository, record its URL/path and commit in this file.
- If a task is merged, update `docs/PROJECT_STATUS.md` in the same PR or immediately after merge.
