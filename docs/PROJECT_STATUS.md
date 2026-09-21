# Project Status

Last updated: 2026-09-21

Current phase: `SCOPE_CONFIRMED_CONTRACTS_READY_FOR_IMPLEMENTATION`

## Confirmed facts

- Team: Hackathon Conquerors.
- Focus area: Visual Impairment — Blind or Low Vision.
- Selected stage: Stage 4 — workplace onboarding.
- Final submission deadline: Day 3, 23 September 2026, 07:00.
- Official template and submission guides are stored in `ADC-main-submission-template/`.
- The official brief reports that locating workplace facilities can require more time and guided support.
- The brief also states that digital access is the more critical Stage 4 barrier; the physical-orientation MVP is a deliberate narrow team decision that still requires end-user validation.

## Locked product decisions

- Working name: `PathMemory`.
- Primary user: blind or low-vision new employee.
- Primary client: Expo mobile with chest-mounted camera and accessible audio interaction.
- Secondary client: small React web console for a human admin/buddy to review and publish landmark routes.
- Golden path: learn one route on Day 1, verify unique landmarks, connect them with human-reviewed relative directions, then replay the published route from Day 2 onward.
- Demo policy: the first judged route uses three landmarks; Product API and database do not impose a three-landmark ceiling.
- Spatial model: topological order and relative cues only; no exact coordinates.
- AI boundary: perception and draft extraction only; Express owns deterministic route state and persistence.
- Raw image/video retention: none by default.
- QR, SLAM, obstacle detection, RAG and multi-route navigation are out of MVP scope.

## Repository and ownership boundary

- Bảo Anh owns this application repository's mobile, web, Express, PostgreSQL, mock AI adapter and end-to-end integration.
- Hồng Phúc owns the FastAPI runtime/repository, model adapter, prompt, preprocessing, structured output and AI eval.
- This repository's `contracts/ai-service.openapi.yaml` is the canonical Express ↔ FastAPI contract.
- The FastAPI repository URL/path is `TBD` and must be added to `docs/HANDOFF.md` when Hồng Phúc provides it.

## Current active work

| Owner | Branch/repository | Task | Status | Contract impact | Blocker |
|---|---|---|---|---|---|
| Bảo Anh | `codex/pathmemory-scope-contracts` | Lock product scope and scalable landmark/edge contracts | Complete; ready for implementation handoff | Product/AI contracts 1.1.0 at `986c8f6` | None |
| Hồng Phúc | FastAPI repository `TBD` | Implement `POST /internal/v1/perception` and AI eval against v1 contract | Not started | Must remain v1-compatible | Needs to pull the handoff branch/commit |

## Next implementation gate

1. Both owners pull the scope/contract commit and read `docs/TECHNICAL_FLOW.md`.
2. Bảo Anh implements the Express mock adapter and public Product API from `contracts/product-api.openapi.yaml`.
3. Hồng Phúc implements FastAPI from `contracts/ai-service.openapi.yaml` using fixed example payloads.
4. Each repository adds runtime validators matching the shared schemas.
5. Integrate one live perception response as soon as it validates; do not wait for the full AI eval.
6. Build one three-landmark vertical slice before adding web polish or additional sensing.
7. Test uncertainty, timeout, stale response, accessibility and two consecutive golden-path runs.

## Runtime and deployment status

| Component | Owner | Local | Production | URL/identifier |
|---|---|---|---|---|
| Mobile | Bảo Anh | Not scaffolded | Not built | TBD |
| Web review console | Bảo Anh | Not scaffolded | Not deployed | TBD |
| Express API | Bảo Anh | Not scaffolded | Not deployed | TBD |
| PostgreSQL | Bảo Anh | Not configured | Not provisioned | Secret; never record connection string here |
| FastAPI AI service | Hồng Phúc | Not implemented | Not deployed | Repository and URL TBD |
| Hosted vision model | Hồng Phúc | Not integrated | Not verified | Model ID TBD; never record API key here |

## Evidence status

| Evidence | Status |
|---|---|
| Barrier-specific official brief | Received and classified |
| Product scope | Confirmed by team in current thread |
| End-user validation of physical-route priority | Pending Day 2 session |
| Product and AI contracts | Product API 1.1.0 and AI service 1.1.0 documented |
| Working golden path | Not implemented |
| AI evaluation | Not started |
| Accessibility verification | Not started |
| Latency/reliability/cost | Not measured |
| Submission deck/video | Official template available; content not started |
