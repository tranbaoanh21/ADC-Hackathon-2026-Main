# Solution Scope

Status: `CONFIRMED — STAGE_4_UNIQUE_LANDMARK_ROUTE_MVP`

Last updated: `2026-09-21`

## Decision classification

### Official or brief-reported evidence

- Stage 4 includes the difficulty of locating offices, canteens and restrooms during workplace onboarding.
- Guided physical orientation and buddy systems are not standard practice in every organisation.
- The brief identifies digital access as the more critical Stage 4 barrier; choosing physical orientation is therefore a deliberate narrow product decision, not a claim that it is the largest Stage 4 barrier.

### Team decision

- Primary product: mobile application for a blind or low-vision new employee.
- Secondary product: small accessible web review console for a human admin/buddy.
- The first controlled demo learns and replays one short route with three unique landmarks; the contract and database support additional landmarks later.
- Landmark position is stored topologically: order, previous/next relationship and relative spoken cue. Exact indoor coordinates are not stored.
- A human admin/buddy assigns a directed relative maneuver between consecutive landmarks, such as `GO_STRAIGHT`, `TURN_LEFT` or `TURN_RIGHT`.
- AI produces perception and landmark drafts. Express owns route state, deduplication policy, persistence and all product actions. A human admin/buddy verifies and publishes the route.

### Assumptions requiring validation

- Remembering a verified landmark sequence will reduce repeated dependence on a colleague for the same short route.
- A chest-mounted phone can capture sufficiently readable signs for the controlled demo route.
- A human reviewer is available during onboarding to correct landmark names and spoken cues.
- Three stable, visually distinguishable landmarks are sufficient to demonstrate the value of route replay.

## Problem

- Primary user: a blind or low-vision employee during their first days in a new workplace.
- Workplace context: learning one recurring indoor route during onboarding, such as reception to a meeting room.
- Specific barrier: the employee cannot independently inspect and remember the visual landmarks that sighted colleagues use to orient themselves.
- Existing workaround: a colleague repeatedly guides the employee or verbally explains the route from memory.
- Why current options are insufficient: generic scene description does not create a persistent, workplace-specific route memory; repeated human guidance reduces independence and does not scale.
- Evidence supporting the problem: the official brief reports that locating workplace facilities requires more time and guided support, and that guided orientation is not a standard practice.

## Proposed outcome

- User outcome: after one guided onboarding journey, the employee can replay the same short route using verified landmark cues and accessible audio feedback.
- Before state: the route exists only in a colleague's explanation and the employee's memory.
- After state: the route is represented as an ordered sequence of human-verified unique landmarks that the mobile app can recognise and announce.
- Why it matters: the employee can rehearse and reuse the route without asking a colleague to repeat the entire orientation every time.

## Golden path

### Day 1 — Learn and review

```text
Employee starts Learn Route with a human buddy
→ chest-mounted mobile camera samples frames
→ AI returns structured scene text and landmark candidates
→ employee/buddy saves only a useful unique landmark
→ Express validates, deduplicates and stores an AI_DRAFT
→ repeat until the selected route landmarks are captured; the demo uses three
→ admin/buddy reviews names and assigns relative directions/spoken cues on the web
→ admin/buddy verifies and publishes the route
```

### Day 2 onward — Replay

```text
Employee selects a published route
→ mobile announces the next expected landmark
→ camera observations are interpreted by AI
→ Express compares structured evidence with the expected landmark
→ matched landmark advances the deterministic route state
→ mobile announces the verified relative cue and next landmark
→ insufficient or conflicting evidence causes STOP_AND_RESCAN
→ final matched landmark completes the route
```

`Day 1` and `Day 2 onward` describe the employee journey, not the hackathon schedule.

## Unique landmark rule

A landmark is eligible for the MVP only when it is:

- stable enough for the controlled demo;
- visually or textually distinguishable;
- useful for determining progress along the selected route;
- not already present in that route after deterministic normalisation and human review.

Examples in scope: `RECEPTION`, `LEVEL 2` elevator sign and `MEETING ROOM A` sign.

The architecture can later store additional workplace landmarks such as a check-in gate, restroom, canteen or other meeting rooms. A route should include only the landmarks needed for that journey, while the database may reuse the same approved landmark across multiple routes.

Examples excluded: people, movable chairs, bins, bottles, temporarily open doors and decorative objects that do not identify route progress.

The model may suggest uniqueness, but it does not own the decision. Express checks normalised visible text/type within the current route, and the admin/buddy resolves ambiguous duplicates.

## Why AI

- Task not handled adequately by a simple rule: interpreting uncontrolled camera frames, reading signs and proposing a concise landmark description.
- Model input: one to three ephemeral sampled frames plus locale and analysis mode; no full route or expected answer is required for perception.
- Model output: frame quality, detected text, scene type, landmark candidates, stable visual features and uncertainty reasons.
- AI-generated fields: proposed name, visible text, landmark type, stable features and draft description.
- Deterministic code fields/actions: route/session IDs, sequence index, duplicate check, status transition, expected landmark, match policy, persistence, publish permission and final spoken action.
- Failure consequence: a wrong match could advance the route and misorient the user.
- Safeguard: schema validation, ordered-route constraint, human verification before publish, no advance on insufficient/conflicting evidence, stale-response rejection and `STOP_AND_RESCAN` fallback.

## MVP

### Must have

- Expo mobile Learn and Navigate modes.
- Camera sampling with accessible start/stop/save controls.
- Structured perception through Express → FastAPI → hosted vision model.
- One controlled demo route containing three unique ordered landmarks, with no hard-coded three-landmark limit in the API/database.
- Directed `RouteEdge` records containing source landmark, destination landmark, relative maneuver and human-reviewed spoken cue.
- PostgreSQL persistence for routes, sessions, landmarks, observations and reviews.
- Accessible React web review flow for a human admin/buddy.
- Landmark states: `AI_DRAFT`, `BUDDY_VERIFIED`, `PUBLISHED`, `OUTDATED`.
- Deterministic route state machine and `STOP_AND_RESCAN` behavior.
- TTS, replay, loading, timeout and error announcements.
- Mock AI adapter using exactly the same contract as the live service.

### Nice to have

- Haptic patterns paired with spoken status.
- Route-outdated workflow.
- Camera-restricted-area note.
- Local caching of the last published route for read-only fallback.

### Non-goals

- Exact indoor coordinates, metric distance or angle calculation.
- GPS-like turn-by-turn indoor navigation.
- QR/AprilTag anchors in the core demo.
- SLAM, ARKit/ARCore mapping, BLE/UWB positioning or Dijkstra/A* routing.
- Obstacle avoidance, hazard detection or claims that the path is safe.
- Replacing a cane, guide dog or orientation-and-mobility skills.
- Automatically saving every object detected by the camera.
- More than one route in the judged demo; additional production landmarks remain supported by the architecture.
- RAG, vector database, fine-tuning, self-hosted GPU or full HR dashboard.
- Raw image/video retention.
- Authentication/OAuth unless later required for the deployed demo.

## Success metrics

Targets are hypotheses until measured and must not be presented as achieved results.

| Metric | Definition | Target/hypothesis | Evidence method |
|---|---|---|---|
| Route replay success | Complete the controlled three-landmark route in the correct order | 1 complete route without buddy intervention during replay | Repeated scripted demo plus user test if available |
| Critical landmark extraction | Expected visible text/name extracted for representative landmark frames | At least 9 of 10 controlled cases | Fixed ground-truth eval set |
| Schema validity | AI responses accepted by the shared schema | 100% of recorded eval responses | Contract validation |
| Safe uncertainty behavior | Ambiguous/unreadable cases that do not advance the route | 100% of defined negative cases | Fixed negative cases |
| Accessibility | Core Learn/Review/Navigate controls operable and status announced | Complete mobile flow with VoiceOver/TalkBack and web review by keyboard/screen reader | Recorded accessibility checklist |
| End-to-end latency | Capture action to beginning of spoken result | P95 at or below 5 seconds in demo conditions | Instrumented requests; report P50/P95 |
| Reliability | Consecutive complete golden-path runs | At least two consecutive runs | Production smoke test |
| Raw-media retention | Raw images/videos stored after processing | Zero | Storage/log review |

## Client and architecture decision

- Primary client: Expo/React Native mobile.
- Secondary client: minimal React/Vite admin/buddy review console.
- Express required: yes; it is the only public product API and owns deterministic product logic.
- PostgreSQL required: yes; it stores persistent workplace-specific routes and review state.
- FastAPI required: yes; Hồng Phúc owns the Python AI runtime and provider integration in the AI repository.
- AI provider/model: hosted vision model; exact Gemini model ID remains pending a controlled comparison.

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

The canonical shared interfaces are:

- `contracts/product-api.openapi.yaml`
- `contracts/ai-service.openapi.yaml`

## Privacy and safety

- Data sent to external provider: only selected ephemeral frames needed for the current observation.
- Data stored: structured route, landmark, observation summary, review status and model/eval metadata.
- Raw image/audio retention: none by default.
- Consent: the employee and workplace must know when camera processing is active; camera-restricted areas must be respected.
- Human confirmation: every landmark must be verified by an admin/buddy before route publication.
- Unsupported cases: changed furniture/layout, unreadable signs, crowded/poor-light scenes, network/provider failure, unreviewed routes and general-purpose safety navigation.

## Ownership

| Area | Owner | Deliverable |
|---|---|---|
| Mobile, web, Express and PostgreSQL | Bảo Anh | Clients, public API, route FSM, persistence, AI adapter, accessibility and application deployment |
| FastAPI and model pipeline | Hồng Phúc | Internal API, preprocessing, provider adapter, structured perception, AI tests/eval and AI-service deployment |
| Shared contract | Bảo Anh + Hồng Phúc | Versioned OpenAPI, examples, compatible validators and integration tests |
| Admin/buddy review | Bảo Anh | Accessible review/edit/verify/publish flow |
| Research and pitch evidence | Team owner TBD | End-user validation, assumptions, deck, video and Q&A |
