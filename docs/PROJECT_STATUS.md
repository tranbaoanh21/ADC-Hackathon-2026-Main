# Project Status

Last updated: 2026-09-21

Current phase: `LANDMARK_GRAPH_SCOPE_CONFIRMED_CONTRACTS_READY`

## Confirmed facts

- Team: Hackathon Conquerors.
- Focus area: Visual Impairment — Blind or Low Vision.
- Selected stage: Stage 4 — workplace onboarding.
- Final submission deadline: Day 3, 23 September 2026, 07:00.
- Official template and submission guides are stored in `ADC-main-submission-template/`.
- The official brief reports that locating workplace facilities can require more time and guided support.
- The brief also states that digital access is the more critical Stage 4 barrier; the physical-orientation MVP is a narrow team decision that still requires end-user validation.

## Locked product decisions

- Working name: `PathMemory`.
- Primary user: blind or low-vision new employee.
- Primary client: Expo mobile with chest-mounted camera and accessible audio interaction.
- Secondary client: small React web console for human admin/buddy review.
- Day 1: guided landmark discovery stores accepted candidates in PostgreSQL as `AI_DRAFT`; admin verifies landmarks, creates directed relative edges/cues and publishes one bounded workplace graph.
- Day 2+: user selects origin and reachable destination with a screen reader; Express computes a deterministic BFS path; camera confirms the origin and later expected landmarks; mobile speaks human-reviewed edge cues.
- Demo graph: Reception, Elevator Level 2, Meeting Room A and Restroom Level 2, with one branch and explicit reverse edges where return travel is supported.
- Spatial model: topological relations only; no exact coordinates, metric distances or safety claims.
- AI boundary: perception/draft extraction only. Express owns database state, graph validation, pathfinding, matching and all user-facing actions.
- Raw image/video retention: none by default.
- Cane/guide dog/O&M remains the primary mobility and obstacle-awareness method.
- QR, SLAM, obstacle detection, RAG, unknown-location rerouting and mapping the whole workplace are out of MVP scope.

## Contract status

- Product API `2.0.0`: breaking change from the linear v1 route model to a bounded directed landmark graph with reachable destinations and navigation session path planning.
- AI service `1.1.0`: unchanged perception boundary; no graph, database or routing responsibility.
- Canonical contracts and examples are in `contracts/`.
- No runtime application or FastAPI implementation exists yet.

## Repository and ownership boundary

- Bảo Anh owns this application repository's mobile, web, Express, PostgreSQL/Prisma, Product API v2, mock/live AI adapter and end-to-end integration.
- Hồng Phúc owns the FastAPI runtime/repository, model adapter, prompt, preprocessing, structured output and AI eval.
- This repository's `contracts/ai-service.openapi.yaml` is the canonical Express ↔ FastAPI contract.
- FastAPI repository URL/path is `TBD` and must be added to `docs/HANDOFF.md` when Hồng Phúc provides it.

## Current active work

| Owner | Branch/repository | Task | Status | Contract impact | Blocker |
|---|---|---|---|---|---|
| Bảo Anh | `codex/pathmemory-scope-contracts` | Lock landmark-graph scope and Product API v2 handoff | Complete at `4e72a76`; ready for teammate pull | Product API 2.0.0 breaking; AI service remains 1.1.0 | None |
| Hồng Phúc | FastAPI repository `TBD` | Implement `POST /internal/v1/perception` and AI eval | Not started | Must remain AI service 1.1-compatible | Needs latest handoff branch/commit |

## Next implementation gate

1. Both owners pull the handoff commit and read `docs/TECHNICAL_FLOW.md`.
2. Bảo Anh implements Product API v2 validators, deterministic BFS and a mock perception adapter.
3. Hồng Phúc implements FastAPI from AI-service v1.1 using the checked-in AI examples.
4. Each repository adds runtime validators matching its owned contract.
5. Integrate one live perception response as soon as it validates.
6. Complete both demo origin/destination journeys before adding sensing or UI breadth.
7. Test wrong-start, unreachable destination, uncertainty, timeout, stale response, accessibility and two consecutive golden-path runs.

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
| Landmark-graph product scope | Confirmed by team in current thread |
| End-user validation of physical-orientation priority | Pending Day 2 session |
| Product and AI contracts | Product API 2.0.0 and AI service 1.1.0 documented |
| Working golden path | Not implemented |
| AI evaluation | Not started |
| Accessibility verification | Not started |
| Latency/reliability/cost | Not measured |
| Submission deck/video | Official template available; content not started |
