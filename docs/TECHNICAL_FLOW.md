# PathMemory Technical Flow

Status: `PLANNED — CONTRACT V1`

This document explains how the Stage 4 unique-landmark MVP is split across clients, application backend, database and AI service. It does not claim that the runtime has been implemented.

## One-sentence architecture

Mobile and web call Express; Express owns product state and PostgreSQL; Express sends ephemeral frames to Hồng Phúc's FastAPI service; FastAPI returns perception JSON; Express deterministically decides what is stored, announced or advanced.

```text
Expo mobile ─┐
             ├── public HTTPS → Express ─── PostgreSQL
React web ───┘                    │
                                  └── internal HTTPS → FastAPI → hosted vision model
```

Forbidden shortcuts:

```text
Mobile/Web ─X→ FastAPI or model provider
Mobile/Web ─X→ PostgreSQL
FastAPI    ─X→ application PostgreSQL
Model      ─X→ route advance, publish or safety decision
```

## Responsibility by layer

### Expo mobile — Bảo Anh

- Camera preview and frame sampling.
- Accessible Learn/Navigate controls, voice/shortcut activation, TTS and optional haptics.
- One-to-three-frame rolling capture for an observation request.
- Client request IDs and stale-response suppression.
- Display/announce only the Product API response from Express.
- Never store provider credentials or call FastAPI/model directly.

### React web — Bảo Anh

- List one route and its landmark drafts.
- Edit landmark name, type and description.
- Verify/delete/reorder a draft.
- Connect landmarks with accessible dropdowns for relative maneuvers and edit the spoken cue for each directed edge.
- Validate and publish the complete route.
- Mark a published route outdated.
- Keyboard and screen-reader accessible controls/status.

### Express — Bảo Anh

- Only public API for mobile/web.
- Route, session and landmark lifecycle.
- Runtime validation and stable error envelope.
- Call FastAPI through an adapter that supports live and deterministic mock modes.
- Normalise visible text and prevent simple duplicates within a route.
- Deterministic route state machine and ordered checkpoint progression.
- PostgreSQL persistence and transaction boundaries.
- Timeout, stale response, retry mapping and `STOP_AND_RESCAN` behavior.
- No raw media persistence or sensitive payload logging.

### PostgreSQL/Prisma — Bảo Anh

Minimum planned entities:

- `Route`: name, origin/destination label, status and published timestamp.
- `Landmark`: stable place identity, name, visible text, stable features and review status.
- `RouteLandmark`: route ID, landmark ID and sequence index; this lets a landmark be reused in later routes.
- `RouteEdge`: route ID, sequence index, source/destination landmark IDs, relative maneuver and spoken cue.
- `RouteSession`: route ID, mode (`LEARN`/`NAVIGATE`), current sequence and lifecycle status.
- `Observation`: structured perception summary, request ID, quality, model/prompt version and latency; no raw frame.
- `LandmarkReview`: edits, reviewer role, review status and timestamp.

For the single linear demo, ordered `RouteEdge` records are sufficient; no graph algorithm is required. Database/API design must not hard-code three landmarks even though the judged demo uses exactly three.

### FastAPI — Hồng Phúc

- Implement `contracts/ai-service.openapi.yaml`.
- Accept one to three ephemeral images from Express.
- Frame validation, resize/compression and optional blur/darkness checks.
- OCR/VLM provider adapter, structured prompt and Pydantic validation.
- Return independent perception: frame quality, detected text, scene type, candidates, stable features and uncertainty reasons.
- Report model ID, prompt version and service latency for evaluation.
- Delete/release frame bytes after the request and avoid private payload logs.
- Own AI-service health, tests, eval and deployment.

FastAPI must not return `turnLeft`, `safeToProceed`, `advanceCheckpoint`, `publish` or another final product action.

## Day 1 learn flow

```text
1. Mobile creates a draft route through Express.
2. Mobile starts a LEARN session.
3. Camera sends an observation request with sampled frame bytes.
4. Express assigns request/session context and calls FastAPI.
5. FastAPI returns validated perception JSON.
6. Express returns an accessible narration and a candidate landmark.
7. Employee/buddy explicitly saves a useful unique candidate.
8. Express normalises text, rejects/merges simple duplicates and stores AI_DRAFT.
9. Steps 3–8 repeat until the selected route landmarks are captured; the controlled demo stops at three.
10. Web admin/buddy edits and verifies every landmark.
11. Admin/buddy selects a relative maneuver and spoken cue for each directed edge.
12. Express publishes only when all landmarks are BUDDY_VERIFIED and edges form one continuous route.
```

The AI does not directly write the database. The save operation always passes through Express policy and validation.

## Day 2+ replay flow

```text
1. Mobile loads a PUBLISHED route and starts a NAVIGATE session.
2. Express returns the first expected landmark and the next verified RouteEdge cue.
3. Mobile sends current sampled frames as an observation.
4. FastAPI returns perception without knowing the final action.
5. Express compares normalised evidence with only the expected ordered landmark.
6. Match advances `currentSequence`; mobile announces the outgoing RouteEdge cue and next expected landmark.
7. Insufficient/conflicting evidence keeps the same sequence and returns STOP_AND_RESCAN.
8. Matching the third/final landmark completes the route.
```

## Matching and uniqueness policy for MVP

- Prefer distinctive visible text such as `RECEPTION`, `LEVEL 2` and `MEETING ROOM A`.
- Express normalises case, whitespace and punctuation before exact/contains comparison.
- Scene type and stable features are supporting evidence, not proof by themselves.
- A landmark with the same normalised visible text and type in the same route is a duplicate candidate.
- Ambiguous duplicate cases remain drafts for human resolution.
- Route topology rejects self-loops, duplicate edge indexes, missing intermediate connections and landmark IDs outside the route.
- Relative maneuver belongs to `RouteEdge`; it is not a permanent direction property of a landmark.
- No model self-reported probability is treated as calibrated confidence.
- No vector search or visual embedding is required for the demo.

## Contract and repository ownership

- Canonical public contract: `contracts/product-api.openapi.yaml`.
- Canonical internal contract: `contracts/ai-service.openapi.yaml`.
- Canonical examples: `contracts/examples/`.
- Bảo Anh owns public Product API behavior and the Express consumer of the internal contract.
- Hồng Phúc owns the FastAPI producer of the internal contract.
- The two owners jointly approve internal schema or semantic changes.
- Additive optional fields require examples/tests; removing, renaming or changing meaning is a breaking version change.
- Mock and live FastAPI responses must validate against the same schema.

## Stable failure behavior

| Failure | Express product behavior |
|---|---|
| Invalid client request | `VALIDATION_ERROR`; no AI call and no state change |
| Blurry/dark/unreadable input | `STOP_AND_RESCAN`; no route advance |
| FastAPI schema violation | `AI_INVALID_RESPONSE`; no persistence/advance |
| Provider unavailable | `AI_PROVIDER_UNAVAILABLE`; retry offered |
| Timeout | `AI_TIMEOUT`; stale result ignored |
| Landmark mismatch | Same expected sequence; ask user to rescan |
| Unreviewed route | Navigation session cannot start |
| Route marked outdated | Stop replay and request human review |

## First vertical slice

```text
RECEPTION
→ LEVEL 2 ELEVATOR
→ MEETING ROOM A
```

Build order:

1. OpenAPI validators and example payloads.
2. Express mock AI adapter plus in-memory route state.
3. PostgreSQL persistence.
4. Mobile Learn and Navigate happy path with a three-landmark demo fixture.
5. Web review, relative-direction dropdowns and publish.
6. FastAPI live integration.
7. Unreadable/timeout/stale-response cases.
8. Accessibility, eval, deployment and recorded fallback.
