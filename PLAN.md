# PathMemory Application Execution Plan

Status: `ACTIVE`

Owner: `Bảo Anh — Software/Product Owner`

Branch: `codex/application-vertical-slice`

Last updated: `2026-09-22`

## 1. Objective

Xây dựng một vertical slice có thể demo cho Stage 4 workplace onboarding:

```text
Day 1
Blind/low-vision employee + buddy discover stable landmarks
→ Express stores selected candidates as AI_DRAFT
→ admin reviews landmarks and directed relative cues
→ admin publishes a bounded landmark graph

Day 2+
employee selects origin and reachable destination with a screen reader
→ Express computes a deterministic path
→ camera confirms the selected origin and each expected landmark
→ mobile speaks the next human-reviewed cue
→ destination match completes the journey
```

Success means both demo journeys run end-to-end twice consecutively:

1. `Reception → Elevator Level 2 → Meeting Room A`
2. `Reception → Elevator Level 2 → Restroom Level 2`

The product provides landmark memory and orientation cues. It does not detect obstacles, assert that movement is safe or replace a cane, guide dog or orientation-and-mobility skills.

## 2. Source-of-truth hierarchy

Implementation must follow, in order:

1. `AGENTS.md`
2. `docs/SOLUTION_SCOPE.md`
3. `contracts/product-api.openapi.yaml` v2.0.0
4. `contracts/ai-service.openapi.yaml` v1.1.0
5. `docs/TECHNICAL_FLOW.md`
6. `contracts/examples/`
7. This `PLAN.md`

If this plan conflicts with a contract or confirmed scope, the plan must be corrected; the implementation must not silently change the contract.

## 3. Ownership boundary

### Bảo Anh owns in this repository

- npm workspace and application scaffolding
- Express/TypeScript Product API v2
- runtime request/response validation
- deterministic graph validation, reachability and BFS
- navigation-session state machine and landmark matching policy
- mock/live FastAPI adapter, timeout and error mapping
- PostgreSQL/Prisma schema, migrations and persistence
- accessible React/Vite admin web
- accessible Expo/React Native employee mobile app
- application tests, deployment, fallback and demo reliability

### Hồng Phúc owns outside this track

- FastAPI application and `/internal/v1/perception`
- provider/model selection and credentials
- image preprocessing, prompt, parsing and Pydantic validation
- AI evaluation, provider latency/cost and failure analysis
- FastAPI deployment and health endpoint

### Shared boundary

- `contracts/ai-service.openapi.yaml` and `contracts/examples/ai-*.json`
- Any semantic or breaking AI-contract change requires both owners to agree and update OpenAPI, examples and tests together.
- FastAPI never queries the application database or computes navigation paths.

## 4. Locked product and brand decisions

- Product name: `PathMemory`
- Tagline: `Verified landmarks. Familiar journeys.`
- Primary client: Expo mobile
- Secondary client: minimal React admin web
- Primary color: teal `#006D77`
- Main text: navy `#102A43`
- Canvas: `#F7FAFC`
- Surface: `#FFFFFF`
- Focus accent: `#FFD166`
- Success: `#087F5B`
- Error: `#B42318`
- Logo direction: landmark nodes connected as a path/P shape with a small speech-wave endpoint
- Logo and visual polish do not block the golden path; wordmark text is sufficient until Phase 7.

## 5. Technical baseline

Planned application structure:

```text
package.json                 npm workspaces and shared commands
apps/
  api/                       Express + TypeScript + Zod + Prisma
  web/                       React + Vite + TypeScript
  mobile/                    Expo + React Native + TypeScript
packages/
  api-client/                shared Product API client/types when useful
contracts/                   canonical OpenAPI and fixtures; already present
```

Planned deployment boundary:

```text
Expo mobile / React web
          ↓ HTTPS
Express Product API
    ├── PostgreSQL
    ↓ internal HTTPS
FastAPI perception service
```

Implementation principles:

- Use npm workspaces and committed lockfile.
- Use strict TypeScript.
- Keep graph and session rules in pure functions testable without HTTP/database.
- Keep persistence behind repository interfaces so an in-memory implementation can unblock the first slice.
- Mock and live AI adapters return the same validated AI-service shape.
- Mobile/web call Express only.
- No raw frame persistence.
- No secret in `VITE_*`, `EXPO_PUBLIC_*`, Git, fixtures or logs.

## 6. Execution phases

### Phase 0 — Scaffold and quality gates — `COMPLETE`

Deliverables:

- [x] Root npm workspace and lockfile
- [x] Express TypeScript app scaffold
- [x] React/Vite TypeScript web scaffold
- [x] Expo TypeScript mobile scaffold
- [x] Shared commands for format, lint, typecheck, test and build where supported
- [x] `.env.example` files containing placeholders only
- [x] Health endpoint for Express that does not call PostgreSQL or FastAPI

Gate:

- Fresh install succeeds.
- API typecheck/test/build succeeds.
- Web typecheck/build succeeds.
- Mobile TypeScript check succeeds.
- No secret or production URL is committed.

Verification on 2026-09-22:

- `npm run lint` passed.
- API, web and mobile `typecheck` passed.
- API health test passed; Supertest requires local-socket permission in the managed sandbox.
- API and web production builds passed.
- `expo install --check` reported dependencies up to date for Expo SDK 57.
- `npm audit --omit=dev` reported 10 moderate transitive issues in Expo tooling. The suggested automatic fix downgrades Expo to SDK 46, so no destructive/major downgrade was applied; reassess when Expo publishes compatible patched dependencies.

### Phase 1 — Deterministic domain kernel — `COMPLETE`

Deliverables:

- [x] Product/API domain types aligned with Product API v2
- [x] Four-landmark graph fixture aligned with checked-in examples
- [x] Directed-edge validation: endpoint membership, no self-loop, no duplicate pair
- [x] Reachable-destination traversal
- [x] Deterministic unweighted BFS
- [x] Tie-break by edge `displayOrder`, then edge ID
- [x] Navigation-session constructor with `AWAITING_START_CONFIRMATION`
- [x] Session transition functions for start confirmation, next-landmark match, rescan and completion
- [x] Deterministic landmark text normalisation/matching baseline

Required tests:

- [x] Reception reaches Elevator, Meeting Room and Restroom
- [x] Reception → Meeting Room uses the expected two edges
- [x] Reception → Restroom uses the expected two edges
- [x] Reverse travel works only where reverse edges exist
- [x] Unknown/unreachable destination returns `NO_ROUTE_AVAILABLE`
- [x] Origin equal to destination is rejected
- [x] Wrong or unclear origin never returns a movement cue
- [x] Destination match completes the session

Gate:

- Domain tests pass without Express, PostgreSQL or FastAPI.
- No AI-generated field controls pathfinding or session advancement.

Verification on 2026-09-22:

- 22 API/domain tests passed across 5 test files.
- Typed demo fixture is asserted equal to the canonical published-route JSON example.
- Root lint, all workspace typechecks and API/web builds passed.

### Phase 2 — Express Product API v2 with deterministic mock — `COMPLETE`

Priority endpoints:

- [x] `GET /health`
- [x] `GET /api/v2/routes/:routeId`
- [x] `GET /api/v2/routes/:routeId/reachable-destinations`
- [x] `POST /api/v2/routes/:routeId/sessions`
- [x] `POST /api/v2/sessions/:sessionId/observations`

Day-1/admin endpoints:

- [x] `POST /api/v2/routes`
- [x] `POST /api/v2/sessions/:sessionId/landmarks`
- [x] `PATCH /api/v2/routes/:routeId/landmarks/:landmarkId`
- [x] `PUT /api/v2/routes/:routeId/edges`
- [x] `POST /api/v2/routes/:routeId/publish`
- [x] `POST /api/v2/routes/:routeId/mark-outdated`
- [x] `POST /api/v2/sessions/:sessionId/finish`

Infrastructure:

- [x] Zod/runtime validation for client input, AI output and product response
- [x] Stable `ErrorResponse` mapping
- [x] In-memory repositories for the first running slice
- [x] Deterministic AI mock aligned with checked-in `ai-perception-success.json`
- [x] Provider unavailable, timeout, unreadable and stale-response behavior
- [x] Request IDs without private frame/payload logging

Gate:

- Supertest integration tests cover both demo paths and critical failures.
- Returned fixtures validate against Product API v2 semantics.
- A wrong-start observation produces `shouldAdvance: false`.

Verification on 2026-09-22:

- 29 API/domain tests passed across 6 test files.
- Supertest covers graph retrieval, reachable destinations, deterministic session planning, both demo routes, wrong-start, unreadable, duplicate/stale request, timeout and the complete Day-1 draft/review/publish flow.
- Client, AI and outgoing product payloads are runtime-validated; invalid AI output is mapped to `AI_INVALID_RESPONSE`.
- Uploaded frame buffers remain request-local and are never written to the repository.
- API lint, typecheck and production build passed.

### Phase 3 — PostgreSQL and Prisma persistence — `COMPLETE`

Entities:

- [x] `Route`
- [x] `Landmark`
- [x] `RouteLandmark`
- [x] `RouteEdge`
- [x] `RouteSession`
- [x] `Observation`
- [x] `LandmarkReview`

Constraints and behavior:

- [x] Unique `(routeId, landmarkId)` graph membership
- [x] Unique `(routeId, fromLandmarkId, toLandmarkId)` directed pair
- [x] No self-loop through application validation and database constraint
- [x] Transactional graph writes/publication
- [x] Published graph requires verified landmarks and valid edges
- [x] No raw images or audio columns
- [x] Seed only the deterministic four-landmark demo fixture
- [x] Production migration command uses `prisma migrate deploy`

Gate:

- API integration tests can run against PostgreSQL.
- Migration and seed are reproducible without deleting existing production data.
- History/session state survives API restart.

Verification on 2026-09-22:

- Prisma 7.10 schema and initial PostgreSQL migration validate successfully.
- Migration deploy and deterministic seed passed against an isolated PostgreSQL 18.4 test cluster.
- 32 tests passed across 7 files, including PostgreSQL persistence, API-through-Prisma and transaction rollback coverage.
- Graph, session and structured observation data survived Prisma client restart; uploaded frame bytes have no database column.
- Runtime selects `memory` or `postgres` explicitly through `PERSISTENCE_MODE`; production PostgreSQL requires `DATABASE_URL`.
- API lint, typecheck and production build passed.
- `npm audit --omit=dev` reports 10 moderate Expo-tooling advisories and 4 high Prisma-CLI transitive advisories. Suggested automatic fixes downgrade Expo or Prisma across major versions, so no force fix was applied; runtime credentials remain server-side and dependency updates require a compatible release/test pass.

### Phase 4 — Accessible admin web — `IMPLEMENTED; SCREEN-READER QA PENDING`

Screens:

- [x] Graph overview
- [x] Landmark draft list
- [x] Landmark review/edit form
- [x] Directed-edge editor
- [x] Publish/outdated confirmation

Required behavior:

- [x] From-landmark, to-landmark and maneuver are explicit labelled controls
- [x] `displayOrder` affects list order only
- [x] Edge cue can be edited and replayed
- [x] Duplicate/self-loop/unverified errors are announced
- [x] Every control has accessible name and visible label
- [x] Keyboard focus order follows semantic DOM order
- [x] Status and validation use text plus color, never color alone
- [x] Text and UI palette targets WCAG AA; critical text uses dark navy/teal

Gate:

- Admin can transform seeded drafts into a published graph without database tools.
- Complete flow works by keyboard and one target screen reader.

Verification on 2026-09-22:

- Web lint, TypeScript check and Vite production build passed.
- Edge browser smoke test loaded the published four-landmark graph through Express with restricted local CORS.
- Browser accessibility tree exposed the page hierarchy, live status, alerts, every form label, directional fieldset and disabled/read-only states.
- UI smoke test created a draft graph and confirmed Publish stays disabled with a textual requirement until two verified landmarks and one saved edge exist.
- Responsive desktop screenshot was visually inspected; no overlap or clipped primary control was observed.
- Actual VoiceOver/NVDA keyboard walkthrough remains required before marking this phase complete.

### Phase 5 — Accessible Expo mobile — `IMPLEMENTED; DEVICE AND SCREEN-READER QA PENDING`

Screens/states:

- [x] Home: Learn workplace / Navigate workplace
- [x] Learn camera state and active-processing announcement
- [x] Candidate landmark review and explicit Save
- [x] Origin picker ordered by `displayOrder`
- [x] Reachable destination picker
- [x] Start-landmark confirmation
- [x] Seeking next landmark
- [x] `STOP_AND_RESCAN`
- [x] Route completed

Required behavior:

- [x] Camera is never silently active
- [ ] Primary controls are operable with VoiceOver/TalkBack
- [x] TTS supports replay and suppresses app TTS when a screen reader is enabled
- [x] Loading, timeout, error, match and completion have accessible live-region output
- [x] Stale response does not update state or speak
- [x] Important controls use large touch targets and scalable text
- [x] Safety copy states that the app does not detect obstacles

Gate:

- Both demo journeys complete against the Express mock.
- Wrong start, unreadable observation and timeout are recoverable without sighted UI dependence.

Verification on 2026-09-22:

- Expo SDK 57 dependency check passed using its local compatibility map; camera, speech and file-system packages match SDK 57.
- Mobile TypeScript check and four pure presentation/stale-response tests passed.
- Android production bundle exported successfully through Metro.
- Camera is opt-in per scan; each temporary camera file is deleted after the upload settles and no URI is persisted in product state.
- App speech stops before each message and delegates announcements to the active screen reader instead of speaking over it.
- Physical-device camera, both complete demo journeys and VoiceOver/TalkBack remain required before this phase can be marked complete.

### Phase 6 — Live FastAPI integration — `ADAPTER IMPLEMENTED; LIVE SMOKE BLOCKED BY FASTAPI HANDOFF`

Dependencies from Hồng Phúc:

- [ ] FastAPI repository URL and commit
- [ ] `GET /health`
- [ ] `POST /internal/v1/perception`
- [ ] Server-side internal token configuration
- [ ] Provider/model ID, prompt version and known limitations

Bảo Anh deliverables:

- [x] Live adapter implementing the same interface as mock adapter
- [x] `AI_SERVICE_URL`, internal token and timeout configuration
- [x] Multipart forwarding with maximum frame count/size
- [x] AI response runtime validation
- [x] Error mapping for 401/413/422/503/504 and invalid schema
- [x] Mock/live mode is explicit in startup logs; fallback is never presented as live inference

Gate:

- One live observation passes Express → FastAPI → provider → Express schema validation.
- Provider failure returns stable accessible product behavior without graph/session corruption.

Verification on 2026-09-22:

- HTTP adapter and runtime-mode tests cover multipart metadata/frame forwarding, bearer authorization, required live configuration, local timeout, invalid JSON and 401/413/422/503/504 mapping.
- Express still validates every successful AI response against `aiPerceptionSchema` before product state can advance or evidence can be saved.
- Express upload and adapter defense-in-depth both enforce one to three JPEG/PNG frames and a three-megabyte per-frame limit.
- `AI_ADAPTER=mock` remains the explicit default for development; `AI_ADAPTER=live` fails fast when URL/token/timeout configuration is invalid.
- No live claim has been made: FastAPI repository, deployed URL, internal token and model/provider evidence are still required from Hồng Phúc for the end-to-end gate.

### Phase 7 — Brand, accessibility and safety polish

- [ ] PathMemory wordmark and simple monochrome app mark
- [ ] Apply locked palette as reusable design tokens
- [ ] Verify normal text ≥ 4.5:1, large text/UI boundaries ≥ 3:1, critical text target ≥ 7:1
- [ ] Visible focus and non-color status indicators
- [ ] Web keyboard/screen-reader checklist
- [ ] Mobile VoiceOver/TalkBack checklist
- [ ] Text scaling and long Vietnamese/English strings
- [ ] Privacy notice, camera-active notice and raw-media retention check
- [ ] Safety wording review: no `safe`, `obstacle-free`, GPS or replacement claims

Gate:

- Accessibility checklist is recorded with device/browser/screen-reader versions.
- Logo never replaces an accessible product name.

### Phase 8 — Deployment and demo evidence

- [ ] Railway PostgreSQL
- [ ] Railway Express with migration deploy
- [ ] Railway FastAPI URL from Hồng Phúc
- [ ] Vercel admin web
- [ ] Expo Go/mobile environment against Express HTTPS
- [ ] Restricted CORS and correct environment ownership
- [ ] Health checks across all layers
- [ ] Warm-up procedure that does not call AI continuously
- [ ] Two consecutive production golden-path runs
- [ ] Recorded fallback video/screenshots and deterministic mock/cached path
- [ ] Latency P50/P95, request success/failure and raw-media audit evidence

Gate:

- Production demo works twice consecutively on the venue network or realistic fallback network.
- Demo operator can switch to clearly labelled fallback without misleading judges.

## 7. API implementation order

To prevent frontend work from waiting on persistence or live AI:

```text
Pure domain functions
→ in-memory repositories
→ Express Product API + deterministic AI mock
→ mobile Navigate happy path
→ admin review/publish
→ Prisma repositories
→ Day-1 Learn capture/save
→ live FastAPI adapter
```

The Product API contract remains the same when the repository implementation changes from memory to Prisma or when AI changes from mock to live.

## 8. Acceptance matrix

| Case | Expected deterministic result |
|---|---|
| Published graph requested | Four-landmark fixture returned |
| Reception selected as origin | Elevator, Meeting Room and Restroom are reachable |
| Reception → Meeting Room | Planned path uses Reception → Elevator → Meeting Room |
| Reception → Restroom | Planned path uses Reception → Elevator → Restroom |
| Origin not confirmed | Remain `AWAITING_START_CONFIRMATION`; no movement cue |
| Origin confirmed | Expect Elevator and speak reviewed Reception → Elevator cue |
| Expected intermediate matched | Increment `currentPathIndex`; speak next reviewed cue |
| Blurry/unreadable frame | `STOP_AND_RESCAN`; no advance |
| Unreachable destination | `NO_ROUTE_AVAILABLE`; no AI call |
| Provider timeout | `AI_TIMEOUT`; retry allowed; no state mutation |
| Destination matched | `ROUTE_COMPLETED` / completed session |
| Graph outdated | New NAVIGATE session rejected |

## 9. Explicit non-goals

- Exact coordinates, metric distance or exact turn angles
- Realtime video streaming to the model
- GPS-like free-form indoor navigation
- Obstacle/hazard detection or `safe to proceed`
- Unknown-location automatic rerouting
- Weighted route optimisation
- QR, SLAM, ARKit/ARCore, BLE or UWB
- RAG/vector database/fine-tuning/self-hosted GPU
- Full HR platform or complex authentication
- Raw image/video retention
- Multiple workplace graphs in the judged demo

## 10. Stop rules

Stop adding features and move to reliability/accessibility when any condition is true:

- either demo path does not run end-to-end;
- Product API or AI-service contract is still changing;
- live integration has no validated response;
- fallback has not been tested;
- wrong-start or unreadable input can advance a session;
- deployment or submission deadline is at risk.

## 11. Current blockers and TBDs

- FastAPI repository URL/commit: `TBD — Hồng Phúc`
- FastAPI deployed URL/internal credential: `TBD — Hồng Phúc`
- Selected provider/model ID: `TBD_AFTER_EVAL — Hồng Phúc`
- End-user validation of physical-orientation priority: `Pending`
- Railway/Vercel project URLs: `Not created`
- Actual accessibility devices/screen readers used for recorded test: `TBD`

None of these blocks Phases 0–5 because application development uses the deterministic AI mock and checked-in contract fixtures.

## 12. Progress reporting rule

At every completed phase:

1. update the checkboxes in this file;
2. update `docs/PROJECT_STATUS.md` and `docs/HANDOFF.md` when teammate-visible state changes;
3. record contract impact, tests run, tests not run and known limitations;
4. commit one coherent milestone;
5. keep the branch buildable and demoable.
