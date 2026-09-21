# Solution Scope

Status: `CONFIRMED — STAGE_4_LANDMARK_GRAPH_MVP`

Last updated: `2026-09-21`

## Decision classification

### Official or brief-reported evidence

- Stage 4 includes the difficulty of locating offices, canteens and restrooms during workplace onboarding.
- Guided physical orientation and buddy systems are not standard practice in every organisation.
- The brief identifies digital access as the more critical Stage 4 barrier. Choosing physical orientation is a deliberate narrow team decision, not a claim that it is the largest Stage 4 barrier.

### Team decision

- Primary product: Expo mobile application for a blind or low-vision new employee.
- Secondary product: small accessible React web console for a human admin/buddy.
- Day 1 creates a bounded workplace landmark graph from a guided walk with a buddy.
- AI proposes landmark drafts. Express validates and stores each accepted proposal immediately as `AI_DRAFT`; admin approval is a later state transition, not the first database write.
- Admin/buddy edits and verifies landmarks, then creates directed `RouteEdge` records with a relative maneuver and spoken cue before publishing the graph.
- Day 2 onward, the employee uses a screen reader to select a published origin landmark and a reachable destination landmark. Express computes a deterministic path over the published graph.
- The mobile camera must confirm the selected origin before the first movement cue is announced. Later observations confirm progress at the next expected landmark.
- Landmark position is topological only. No exact indoor coordinate, metric distance or angle is stored.
- The cane, guide dog or orientation-and-mobility technique remains the user's safety and obstacle-awareness tool. PathMemory supplies workplace memory and orientation cues only.

### Assumptions requiring validation

- A verified landmark graph will reduce repeated dependence on a colleague for familiar short workplace journeys.
- A chest-mounted phone can capture sufficiently readable signs for the controlled demo.
- Users can identify or confirm an origin landmark before starting a navigation session.
- A human reviewer is available during onboarding to correct landmark names and relative cues.
- An unweighted fewest-edge path is understandable and useful for the bounded demo graph; it is not yet evidence of the easiest or safest physical path.

## Problem

- Primary user: a blind or low-vision employee during the first days in a new workplace.
- Workplace context: learning and later repeating short indoor journeys among stable places such as reception, an elevator area, a meeting room and a restroom.
- Specific barrier: visual landmarks and relative turns used by sighted colleagues are not independently available to the employee as persistent, accessible workplace knowledge.
- Existing workaround: a colleague repeatedly guides the employee or verbally explains each journey from memory.
- Product gap: generic scene description can describe what is visible now, but it does not create a human-verified, reusable relationship between workplace landmarks.

## Proposed outcome

After one guided onboarding walk, the workplace has a small published graph of stable landmarks and reviewed relative cues. On later days, the employee can select where they are and where they want to go, confirm the starting landmark with the camera, and receive speech for each verified graph edge until the chosen destination is reached.

This is not free-form indoor navigation. It is repeatable orientation within a bounded, previously reviewed graph.

## Golden path

### Day 1 — Learn, review and publish

```text
Employee and human buddy start a LEARN session
→ chest-mounted mobile camera sends a small sampled-frame observation
→ FastAPI returns structured perception and landmark candidates
→ employee/buddy explicitly saves only a useful, stable candidate
→ Express validates, deduplicates and stores an AI_DRAFT in PostgreSQL
→ repeat for the bounded demo area
→ accessible admin web lists the stored drafts
→ admin edits and marks each accepted landmark BUDDY_VERIFIED
→ admin creates directed edges using from-landmark, to-landmark,
  maneuver dropdown and editable spoken cue
→ Express validates graph references/topology
→ admin publishes the verified landmark graph
```

### Day 2 onward — Select and navigate

```text
Employee opens a published graph with a screen reader
→ selects an origin landmark
→ Express returns only destinations reachable through published directed edges
→ employee selects a destination
→ Express computes a deterministic FEWEST_EDGES path using BFS
→ NAVIGATE session starts in AWAITING_START_CONFIRMATION
→ camera observation must match the selected origin landmark
→ after confirmation, mobile speaks the first reviewed RouteEdge cue
→ at each next landmark, FastAPI returns perception and Express performs matching
→ a match advances currentPathIndex and speaks the next edge cue
→ insufficient/conflicting evidence returns STOP_AND_RESCAN without advancing
→ matching the selected destination completes the session
```

`Day 1` and `Day 2 onward` describe the employee journey, not the hackathon schedule.

## Landmark graph rules

A landmark is eligible only when it is stable, useful for orientation, distinguishable by visible text or features, and human verified. People, movable furniture and temporary objects are excluded.

- A landmark may have many incoming and outgoing edges.
- Each edge is directed: `A → B` and `B → A` are separate records and may have different maneuvers/cues.
- A relative maneuver belongs to the edge, never permanently to either landmark.
- `displayOrder` controls stable admin and screen-reader list order only; it is not a coordinate or path sequence.
- Express rejects self-loops, duplicate directed pairs and references outside the graph.
- Express lists only destinations reachable from the selected origin.
- Express computes navigation with deterministic unweighted BFS. Equal-length paths are resolved deterministically by edge `displayOrder`, then edge ID.
- AI may propose uniqueness, but Express and the admin own deduplication and approval.

## Why AI and what remains deterministic

### AI/FastAPI

- Receives one to three ephemeral sampled frames for one observation.
- Checks frame quality and interprets uncontrolled camera scenes.
- Reads visible signs and proposes structured landmark names, types, descriptions and stable features.
- Returns perception only; it does not know the final product action or graph path.

### Deterministic Express code

- Validates AI output and applies timeout/stale-response rules.
- Owns IDs, database writes, duplicate checks and status transitions.
- Owns human-review and publish permissions.
- Owns graph validation, reachability, BFS path planning and session state.
- Matches evidence only against the current expected landmark.
- Decides whether to advance, retry, stop-and-rescan or complete.

### Failure safeguard

A wrong match could misorient the user. Therefore PathMemory never advances on unreadable, insufficient or conflicting evidence; requires human verification before publish; confirms the selected origin before the first cue; ignores stale responses; and never states that a path is safe or obstacle-free.

## MVP

### Must have

- Expo mobile Learn and Navigate modes with accessible controls, TTS, replay, loading, timeout and error announcements.
- Structured perception through Express → FastAPI → hosted vision model.
- One bounded demo graph with four landmarks and one branch: Reception, Elevator Level 2, Meeting Room A and Restroom Level 2.
- Human-reviewed directed edges that support Reception → Meeting Room A and Reception → Restroom Level 2, plus return travel in the demo fixture.
- Accessible React web review: list/edit/verify landmarks; choose from/to landmarks and maneuver; edit cue; publish or mark outdated.
- PostgreSQL persistence for graph, landmarks, directed edges, sessions, observations and reviews.
- Screen-reader origin/destination selection and reachable-destination filtering.
- Deterministic BFS path planning and start-landmark confirmation.
- Landmark states: `AI_DRAFT`, `BUDDY_VERIFIED`, `PUBLISHED`, `OUTDATED`.
- `STOP_AND_RESCAN`, provider error and deterministic mock paths.
- No hard-coded total-landmark limit in API/database/UI.

### Nice to have

- Haptic patterns paired with spoken status.
- Route-outdated workflow and read-only cache of the last published graph.
- Camera-restricted-area notice.
- Friendly graph completeness warnings in the admin web.

### Non-goals

- Exact indoor coordinates, metric distance or exact angle calculation.
- GPS-like free-form or general-purpose indoor navigation.
- Dynamic rerouting from an unknown location, weighted route optimisation or claims of the easiest/fastest/safest path.
- QR/AprilTag anchors, SLAM, ARKit/ARCore mapping, BLE or UWB positioning.
- Obstacle avoidance, hazard detection or `safe to proceed` decisions.
- Replacing a cane, guide dog or orientation-and-mobility skills.
- Automatically saving every detected object or mapping the entire workplace.
- Multiple workplace graphs in the judged demo.
- RAG, vector database, fine-tuning, self-hosted GPU or full HR dashboard.
- Raw image/video retention.
- Authentication/OAuth unless later required by the deployed demo.

## Success metrics

Targets are hypotheses until measured and must not be presented as achieved results.

| Metric | Definition | Target/hypothesis | Evidence method |
|---|---|---|---|
| Navigation task success | Select origin/destination, confirm start and reach the chosen final landmark | Both demo journeys complete without buddy intervention during replay | Script Reception → Meeting Room A and Reception → Restroom Level 2 |
| Path correctness | Planned landmark/edge IDs match the expected BFS result | 100% of graph fixture origin/destination cases | Deterministic unit tests |
| Start confirmation safety | Wrong/unclear start observation does not issue the first movement cue | 100% of defined negative cases | Contract/integration tests |
| Critical landmark extraction | Expected visible text/name extracted for representative landmark frames | At least 9 of 10 controlled cases | Fixed ground-truth eval set |
| Schema validity | AI responses accepted by the shared schema | 100% of recorded eval responses | Contract validation |
| Safe uncertainty behavior | Ambiguous/unreadable cases do not advance | 100% of defined negative cases | Fixed negative cases |
| Accessibility | Core Learn/Review/Navigate controls are operable and status is announced | Complete mobile flow with VoiceOver/TalkBack and web review by keyboard/screen reader | Recorded checklist |
| End-to-end latency | Capture action to beginning of spoken result | P95 at or below 5 seconds in demo conditions | Instrumented requests; report P50/P95 |
| Reliability | Consecutive complete golden-path runs | At least two consecutive runs | Production smoke test |
| Raw-media retention | Raw images/videos stored after processing | Zero | Storage/log review |

## Client and architecture decision

```text
Expo mobile / React web
          ↓ public HTTPS
Express application backend
    ├── PostgreSQL
    ↓ internal HTTPS
FastAPI AI service
    ↓
Hosted vision provider
```

- Mobile is the primary employee client; web is a small admin/buddy console.
- Express is the only public API and owns all product/database/graph behavior.
- FastAPI is an internal perception service owned by Hồng Phúc.
- Canonical interfaces are `contracts/product-api.openapi.yaml` v2.0.0 and `contracts/ai-service.openapi.yaml` v1.1.0.

## Privacy and safety

- Only selected ephemeral frames required for the current observation are sent to the external provider.
- Stored data is structured graph, landmark, observation summary, review state and model/eval metadata.
- Raw image/audio retention is zero by default.
- Employee and workplace must know when camera processing is active; camera-restricted areas must be respected.
- Every landmark and edge cue must be human reviewed before publication.
- Changed layouts, unreadable signs, crowded/poor-light scenes, provider failure and unreviewed/outdated graphs are unsupported or stop conditions.

## Ownership

| Area | Owner | Deliverable |
|---|---|---|
| Mobile, web, Express and PostgreSQL | Bảo Anh | Clients, Product API v2, graph/path/session logic, persistence, AI adapter, accessibility and application deployment |
| FastAPI and model pipeline | Hồng Phúc | AI-service v1.1, preprocessing, provider adapter, structured perception, AI tests/eval and AI-service deployment |
| Shared AI boundary | Bảo Anh + Hồng Phúc | Compatible OpenAPI, examples, validators and integration tests |
| Admin/buddy review | Bảo Anh | Accessible landmark/edge review and graph publication |
| Research and pitch evidence | Team owner TBD | End-user validation, assumptions, deck, video and Q&A |
