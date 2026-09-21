# Project Status

Last updated: 2026-09-22

Current phase: `DEPLOYMENT_PREPARATION_NEXT; DEVICE_AND_LIVE_AI_QA_BLOCKED`

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
- Mobile Learn is the sole creator of the Day-1 draft graph. Web opens the same graph by Route ID and reloads stored candidates; no realtime push or second web-created graph is in MVP scope.
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
- A FastAPI AI-service v1.1 vertical slice now exists in `services/ai/` with a
  deterministic mock and a Gemini adapter. Prompt `landmark-perception-v3` has
  one permission-approved local visual run over one PNG and five sampled video
  frames; all six responses were schema-valid and passed their defined semantic
  expectations after frame-level ground-truth review. Express Product API v2
  runs against deterministic in-memory/Prisma repositories and its live adapter
  has passed a local Express-to-FastAPI mock integration smoke. A real
  end-to-end Gemini smoke remains pending.

## Repository and ownership boundary

- Bảo Anh owns this application repository's mobile, web, Express, PostgreSQL/Prisma, Product API v2, mock/live AI adapter and end-to-end integration.
- Hồng Phúc owns the FastAPI runtime in this monorepo at `services/ai/`, model adapter, prompt, preprocessing, structured output and AI eval.
- This repository's `contracts/ai-service.openapi.yaml` is the canonical Express ↔ FastAPI contract.
- Moving the FastAPI runtime into this monorepo is not a contract change; the canonical AI-service version remains `1.1.0`.

## Current active work

| Owner | Branch/repository | Task | Status | Contract impact | Blocker |
|---|---|---|---|---|---|
| Bảo Anh | `codex/integrate-fastapi-perception` | Integrate application commit `f06ead3` with FastAPI commit `7dac78d`; align timeout/error mapping and verify all gates | In progress; local Express-to-FastAPI mock smoke passed | No contract change | Real Gemini key and deployment/device access needed for later gates |
| Hồng Phúc | `feat/fastapi-perception`, `services/ai/` | Implement perception plus trigger-aware video keyframe preprocessing | Perception implemented at `bd3b4f8`; trigger selector at `6efe2a8`; Ruff/format and 53 tests pass; local visual run has 6/6 schema-valid and defined semantic-expectation passes | None; remains AI service 1.1-compatible | Product trigger integration, deployment and expansion to 10–20 fixed cases remain follow-up work |

## Next implementation gate

1. Complete the integration branch with aligned Express/FastAPI timeout and error mapping.
2. Run Node and Python gates plus one local Express-to-FastAPI mock smoke.
3. Run one permission-safe end-to-end Gemini smoke with model ID and latency recorded.
4. Complete web/mobile device and screen-reader QA and prepare deployment configuration.
5. Expand AI eval to 10–20 representative positive and negative cases.
6. Complete both demo origin/destination journeys before adding sensing or UI breadth.
7. Test wrong-start, unreachable destination, uncertainty, timeout, stale response, accessibility and two consecutive golden-path runs.

## Runtime and deployment status

| Component | Owner | Local | Production | URL/identifier |
|---|---|---|---|---|
| Mobile | Bảo Anh | Learn/Navigate camera flow implemented; typecheck, 11 state/contrast tests and Android production bundle pass; device/VoiceOver/TalkBack QA pending | Not deployed | TBD |
| Web review console | Bảo Anh | Mobile-created Route ID load/refresh plus review/edit edges/publish/outdated UI implemented; Edge AX-tree smoke and build pass; actual screen-reader QA pending | Not deployed | TBD |
| Express API | Bảo Anh | Product API v2 with graph/BFS/session policy, in-memory/Prisma persistence, deterministic mock and contract-compatible live FastAPI adapter; local Express-to-FastAPI mock smoke passed | Not deployed | TBD |
| PostgreSQL | Bảo Anh | Prisma schema/migration/seed and repository verified on isolated PostgreSQL; 32 total tests pass | Not provisioned | Secret; never record connection string here |
| FastAPI AI service | Hồng Phúc | Mock and Gemini adapter plus trigger-aware temporary-video keyframe selector in `services/ai/`; 53 tests plus local health/authenticated mock and visual eval pass on Python 3.13.9 | Not deployed | Monorepo path confirmed; production URL TBD |
| Hosted vision model | Hồng Phúc | `gemini-3.1-flash-lite` with `landmark-perception-v3` returned 6/6 schema-valid and defined semantic-expectation passes on one PNG plus five sampled video frames | Not deployed | Small permission-approved local set only; FastAPI-side P50 3064 ms, P95 11741 ms, max 13989 ms; not end-to-end latency or a general accuracy claim |

## Evidence status

| Evidence | Status |
|---|---|
| Barrier-specific official brief | Received and classified |
| Landmark-graph product scope | Confirmed by team in current thread |
| End-user validation of physical-orientation priority | Pending Day 2 session |
| Product and AI contracts | Product API 2.0.0 and AI service 1.1.0 documented |
| Working golden path | Both routes pass API-level mock tests; Product API also passes through PostgreSQL; Express-to-FastAPI mock integration passes; web/mobile physical-device E2E is pending |
| AI evaluation | Pilot visual eval started: 6 observations, 6/6 schema-valid and defined semantic-expectation passes after frame-level ground-truth review; expand to 10–20 representative positive/negative cases before a quality claim |
| Accessibility verification | Contrast tests and Edge accessibility-tree/layout smoke pass; physical VoiceOver/TalkBack, maximum text-size and camera flow remain pending in `docs/ACCESSIBILITY_QA.md` |
| Latency/reliability/cost | One six-observation local AI-service run measured P50 3064 ms, P95 11741 ms and max 13989 ms; end-to-end latency, reliability distribution and cost remain unmeasured |
| Submission deck/video | Official template available; content not started |
