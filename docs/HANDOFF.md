# Team Handoff

Current state: Product API v2, Prisma/PostgreSQL persistence, React admin review console, Expo mobile Learn/Navigate flows, the Express live FastAPI adapter and code/browser accessibility checks are implemented. Device/screen-reader QA, deployment and one real live AI smoke remain pending. FastAPI implementation remains owned by Hồng Phúc.

Application execution is tracked in root `PLAN.md` on branch `codex/application-vertical-slice`. Bảo Anh's implementation order is deterministic domain/API mock first, then PostgreSQL, admin web, mobile and live FastAPI integration. Hồng Phúc's AI-service boundary remains unchanged.

Application progress on 2026-09-22: the graph/BFS/session kernel, every Product API v2 endpoint, in-memory/Prisma repositories, migration/seed, AI mock/live adapters, React admin review/publish UI and Expo Learn/Navigate camera flows are implemented. API/database/adapter tests, an Edge accessibility-tree/browser smoke, mobile unit tests and Android bundle export pass. Actual VoiceOver/TalkBack, physical-camera E2E, deployment and a real FastAPI/provider smoke remain pending. This progress does not change either shared OpenAPI contract.

## Current integration boundary

- Product contract: `contracts/product-api.openapi.yaml` v2.0.0
- AI-service contract: `contracts/ai-service.openapi.yaml` v1.1.0
- Examples: `contracts/examples/`
- Technical flow: `docs/TECHNICAL_FLOW.md`
- Express Product API v2: implemented and tested against in-memory repositories
- Mock/live providers: deterministic mock and HTTP FastAPI adapter implemented; real FastAPI/provider smoke pending
- Database schema: Prisma 7.10 schema, migration, constraints, seed and runtime adapter implemented and verified
- Admin web: opens the mobile-created draft by Route ID, reloads newly stored candidates, then supports landmark review, directed-edge editing, cue replay, publish/outdated and accessible error/status behavior; web does not create a parallel graph
- Expo mobile: explicit per-scan camera, Day-1 draft/save, screen-reader origin/destination selection, stale-response suppression, TTS/screen-reader coordination, replay, safety copy and route completion implemented
- Accessibility evidence: executable palette contrast checks, Edge accessibility-tree/layout smoke and manual device matrices recorded in `docs/ACCESSIBILITY_QA.md`; physical screen-reader runs remain pending
- Deployment: not started

## Latest context handoff

```text
Date/time: 2026-09-21
From: Bảo Anh / product-scope thread
To: Bảo Anh, Hồng Phúc and both coding-agent threads
Branch/commit: codex/pathmemory-scope-contracts / 4e72a76
Task objective: Replace fixed-route replay with a bounded, human-reviewed landmark graph while preserving the perception-only AI boundary.

Confirmed product:
- Day 1: a blind/low-vision employee explores a bounded office area with a human buddy. AI proposes structured candidates; Express stores explicitly accepted candidates as AI_DRAFT in PostgreSQL.
- Mobile Learn creates the only Day-1 draft graph and shows its Route ID. Admin web opens that same ID and reloads the stored drafts; it does not receive realtime push or create a parallel graph. Admin edits/verifies landmarks, creates directed from/to edges, chooses a relative maneuver, edits the spoken cue and publishes the graph.
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
- Complete accessibility/device QA and deployment preparation; run the live integration smoke immediately after Hồng Phúc supplies the FastAPI URL/token.

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
