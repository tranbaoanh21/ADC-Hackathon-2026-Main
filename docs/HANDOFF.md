# Team Handoff

Current state: Stage 4 unique-landmark route scope is confirmed and initial v1 contracts are ready for parallel implementation. No application or FastAPI runtime has been implemented yet.

## Current integration boundary

- Product contract: `contracts/product-api.openapi.yaml`
- AI-service contract: `contracts/ai-service.openapi.yaml`
- Examples: `contracts/examples/`
- Technical flow: `docs/TECHNICAL_FLOW.md`
- Mock provider: contract defined, implementation pending
- Live provider: not integrated
- Database schema: entities planned, migration not created
- Deployment: not started

## Latest context handoff

```text
Date/time: 2026-09-21
From: Bảo Anh / product-scope thread
To: Bảo Anh, Hồng Phúc and both coding-agent threads
Branch/commit: codex/pathmemory-scope-contracts / 27c2af4
Task objective: Lock the Stage 4 unique-landmark MVP, split repository ownership and create versioned Product/AI contracts.

Confirmed product:
- Day 1: blind/low-vision employee explores one route with a human buddy; AI proposes structured context for at most three useful unique landmarks.
- Express validates/deduplicates and stores AI_DRAFT records; AI never writes the database directly.
- Human admin/buddy edits, verifies and publishes the route on an accessible web console.
- Day 2 onward: mobile replays the published route using ordered landmarks and relative cues.
- No exact coordinates, QR, SLAM, obstacle avoidance, RAG, raw image retention or general safety-navigation claim.

Ownership:
- Bảo Anh: Expo mobile, React web, Express, PostgreSQL/Prisma, public API, route state machine, mock/live AI adapter, accessibility and application deployment.
- Hồng Phúc: FastAPI repository/runtime, provider adapter, preprocessing, prompt, structured perception, Pydantic validation, AI eval and AI-service deployment.
- Shared: AI-service contract semantics, examples, integration tests and breaking changes.

Files changed:
- AGENTS.md
- README.md
- docs/SOLUTION_SCOPE.md
- docs/PROJECT_STATUS.md
- docs/TECHNICAL_FLOW.md
- docs/THREAD_STARTER_PROMPTS.md
- docs/HANDOFF.md
- contracts/*.openapi.yaml
- contracts/examples/*.json
- related README files

Contract impact:
- Initial v1 Product API and AI-service contracts; no previous runtime consumer exists.
- Both implementations must use the checked-in examples and stable error envelope.

Not validated yet:
- No end-user validation, AI eval, accessibility test, latency measurement or end-to-end runtime exists.
- FastAPI repository URL/path remains TBD.

Next exact action for Bảo Anh:
- Build Express validators and a deterministic mock adapter from the contracts, then one mobile three-landmark vertical slice.

Next exact action for Hồng Phúc:
- Pull this branch/commit, implement POST /internal/v1/perception in the FastAPI repository, validate the example response and record the AI repository URL/path here.
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

Do not merge a breaking change until both owners have compatible implementations or an agreed version transition.

## Handoff rules

- Reference a branch and commit; do not say only “code mới nhất”.
- State contract impact explicitly.
- Do not report a live-model test as passed without model ID, test input class and result.
- Do not paste token, `.env`, database URL, private frame or unique submission link.
- When Hồng Phúc creates/uses a separate AI repository, record its URL/path and commit in this file.
- If a task is merged, update `docs/PROJECT_STATUS.md` in the same PR or immediately after merge.
