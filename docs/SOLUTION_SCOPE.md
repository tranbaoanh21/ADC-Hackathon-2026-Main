# PathMemory Solution Scope

Status: `CONFIRMED FOR MVP`

Last updated: `2026-09-22`

## Problem framing

### Official evidence

Stage 4 of the competition brief reports that blind or low-vision employees may need more time and guided support to find workplace facilities, while inaccessible internal documents and systems can also affect onboarding and probation. Full source classification remains in `docs/COMPETITION_BRIEF.md`.

### Team decision

PathMemory deliberately addresses a narrow physical-orientation slice of Stage 4:

> A blind or low-vision new employee needs a reusable way to learn familiar indoor workplace journeys after an initial supported walkthrough, without relying on exact indoor coordinates.

This is a product hypothesis, not proof that physical orientation is the highest-priority Stage 4 barrier. End-user validation remains required.

### Primary user and context

- Primary user: a blind or low-vision employee onboarding in a new workplace.
- Day 1 context: the employee explores a bounded area with a colleague or Human Resources representative.
- Day 2+ context: the employee repeats familiar journeys between reviewed points of interest.
- Existing mobility aid: cane, guide dog or orientation-and-mobility skills remain primary for obstacle awareness and safe movement.

## Golden path

### Day 1 — build and review a workplace graph

1. Employee starts Explore mode with a screen reader and stops at a useful, stable location.
2. VoiceOver/TalkBack reads **Capture landmark**; one double tap takes one temporary photo and disables the control until processing finishes.
3. Express sends one to three ephemeral frames to FastAPI.
4. FastAPI/Gemini returns structured landmark perception only.
5. Express validates and returns the strongest candidate to mobile.
6. Mobile announces the candidate and opens an accessible confirmation dialog.
7. Only a confirmed candidate is deduplicated and stored as an `AI_DRAFT` node.
8. Employee explicitly chooses **Finish exploring** when the supported walkthrough is complete.
9. Colleague/HR selects the workplace by recognisable name on web, verifies landmark names and stable descriptions, and creates directed edges using from/to/maneuver.
10. Express validates and publishes the graph. Narration is generated deterministically; no authored spoken cue is stored.

For the controlled stage demo only, the server-side flag
`DEMO_ALLOW_MOVABLE_LANDMARKS=true` permits one visually dominant object such
as a chair as a temporary candidate. Production workplace evaluation keeps the
flag disabled and requires reusable landmark conventions.

### Day 2+ — replay a familiar journey

1. Mobile loads the shared workplace list from Express, exposes only published maps, and the employee chooses one by recognisable name with a screen reader.
2. Employee selects an origin; Express returns only reachable destinations.
3. Employee selects a destination; Express computes deterministic unweighted BFS.
4. Employee stops and explicitly captures an observation to confirm the selected origin before the first instruction.
5. Each later explicit capture is matched only against the next expected landmark.
6. A valid match advances one edge and returns the next EN/VI narration.
7. Insufficient, conflicting or stale evidence returns `STOP_AND_RESCAN` without advancing.
8. Matching the destination completes the journey.

The admin and mobile clients never depend on a fixed demo route ID. Web can review every workplace state; mobile refreshes the same Product API list and exposes only maps whose status is `PUBLISHED`.

## Graph semantics

- A workplace contains many landmark nodes; the demo fixture uses four, but API/database/UI do not impose that limit.
- An edge is directional. `A → B` and `B → A` are separate records.
- Maneuver belongs to the edge: `GO_STRAIGHT`, `TURN_LEFT`, `TURN_RIGHT`, `TAKE_ELEVATOR`, `ENTER_DOOR` or `OTHER`.
- `displayOrder` is system-managed for stable ordering and deterministic BFS tie-breaking; it is not a coordinate or admin concept.
- Equal-length paths are resolved by edge `displayOrder`, then edge ID.
- The result is fewest edges, not shortest physical distance, easiest route or safest route.
- Canonical facing direction and orientation cues are deferred for this MVP.

## AI versus deterministic code

| Layer | Responsibility |
|---|---|
| FastAPI/Gemini | Frame quality, visible text, scene interpretation, structured landmark candidates, uncertainty |
| Express | Validation, IDs, deduplication, persistence, review/publish policy, graph validation, BFS, expected-landmark matching, session state, EN/VI narration |
| PostgreSQL | Structured workplaces, landmarks, directed edges, observations, sessions and review metadata |
| Mobile/web | Accessible explore, review, selection and guidance UI; clients call Express only |

AI does not decide connectivity, maneuver, route, advancement or safety. Raw provider output is untrusted until validated.

## Failure safeguards

- Unreadable, low-quality, conflicting or mismatched evidence never advances a journey.
- Origin must be confirmed before the first movement instruction.
- Stale responses are ignored.
- Every reusable landmark and edge is human-reviewed before publication.
- Raw images/video are not retained by default.
- The product never claims obstacle detection, safe passage or replacement of mobility aids.

## MVP and non-goals

### Must have

- Accessible EN/VI Expo Explore and Navigate flows.
- Controlled automatic camera capture and explicit Finish Exploring action.
- React colleague/HR review by workplace name.
- Human verification of landmarks and directed structured maneuvers.
- PostgreSQL persistence and Product API v3.1.
- FastAPI AI-service v1.1 with mock/live-compatible schema.
- Reachability, deterministic BFS, origin confirmation and `STOP_AND_RESCAN`.
- Loading, timeout, retry and accessible status/error behavior.

### Non-goals

- Exact indoor coordinates, distances, angles, heading degrees or sensor fusion.
- GPS-like free-form navigation or rerouting from an unknown location.
- QR/AprilTag, SLAM, ARKit/ARCore, BLE or UWB.
- Obstacle/hazard detection or safety guarantee.
- Automatically inferred edges or maneuvers.
- Raw-media retention, RAG/vector database, fine-tuning or self-hosted GPU.
- Full HR platform or complex authentication.

## Success metrics

Targets remain hypotheses until measured.

| Metric | Target | Evidence |
|---|---:|---|
| Demo journey task success | Both fixed journeys complete without colleague/HR intervention during replay | Physical-device run |
| BFS path correctness | 100% of defined graph fixtures | Unit/integration tests |
| Wrong/unclear origin safety | 100% do not emit first movement cue | Negative tests |
| AI schema validity | 100% of recorded eval cases | Fixed eval set |
| Critical landmark extraction | At least 9/10 controlled cases | Ground-truth review |
| Safe uncertainty | 100% of defined ambiguous cases do not advance | Negative cases |
| Accessibility | Core flows operable with screen reader and maximum text size | Recorded checklist |
| End-to-end latency | P95 ≤ 5 seconds in demo conditions | Instrumented runs |
| Reliability | Two consecutive complete production runs | Smoke test |
| Raw-media retention | Zero retained frames/videos | Code/storage/log review |

## Universal Design review

The seven principles remain product review questions, not automatic compliance claims:

| Principle | PathMemory application |
|---|---|
| Equitable Use | Screen-reader-first controls; essential status is not visual-only |
| Flexibility in Use | EN/VI, screen reader and optional app speech cooperate |
| Simple and Intuitive | One narrow Explore flow and one Navigate flow |
| Perceptible Information | Spoken, textual and state feedback communicate the same outcome |
| Tolerance for Error | Human review, start confirmation and stop-and-rescan prevent unsafe advancement |
| Low Physical Effort | One large, screen-reader-labelled capture action replaces continuous handling and repeated background requests |
| Size and Space for Approach and Use | Large touch targets and scalable layouts support low vision and one-handed setup |

## Contracts and ownership

- Product API: `contracts/product-api.openapi.yaml` v3.1.0 on `/api/v2`.
- AI service: `contracts/ai-service.openapi.yaml` v1.1.0.
- Bảo Anh owns clients, Express, database, product rules and integration.
- Hồng Phúc owns FastAPI, provider/model pipeline and AI eval.
- Both owners approve changes to the AI boundary.
