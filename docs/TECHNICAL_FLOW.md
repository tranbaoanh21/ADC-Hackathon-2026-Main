# PathMemory Technical Flow

Status: `IMPLEMENTED APPLICATION BOUNDARY — PRODUCT API V2 / AI SERVICE V1.1`

This document defines the implementation boundary for the confirmed Stage 4 landmark-graph MVP. Mobile, web, Express and persistence are implemented; Hồng Phúc's live FastAPI runtime and the live provider integration smoke remain pending.

## One-sentence architecture

Mobile and web call Express; Express owns product state, graph routing and PostgreSQL; Express sends ephemeral frame batches to Hồng Phúc's FastAPI service; FastAPI returns perception JSON only.

```text
Expo mobile ─┐
             ├── public HTTPS → Express ─── PostgreSQL
React web ───┘                    │
                                  └── internal HTTPS → FastAPI → hosted vision model
```

Forbidden shortcuts:

```text
Mobile/Web ─X→ FastAPI, model provider or PostgreSQL
FastAPI    ─X→ application PostgreSQL or Product API state
Model      ─X→ graph path, route advance, publish or safety decision
```

## Responsibility by layer

### Expo mobile — Bảo Anh

- Camera preview and one-to-three-frame observation sampling.
- Accessible Learn/Navigate controls, origin/destination pickers, TTS and optional haptics.
- Client request IDs and stale-response suppression.
- Announce only Product API decisions returned by Express.
- Keep cane/guide dog/O&M use explicit; never present the app as obstacle avoidance.

### React web — Bảo Anh

- Open an existing Day-1 draft by the `Route ID` created and displayed by mobile Learn; web does not create a second graph.
- Reload on demand to show newly saved mobile candidates; realtime push is not part of the MVP.
- List stored `AI_DRAFT`, `BUDDY_VERIFIED`, `PUBLISHED` and `OUTDATED` landmarks.
- Edit name, type, description and stable admin `displayOrder`.
- Verify or reject drafts.
- Create each directed edge with accessible from-landmark, to-landmark and maneuver dropdowns plus editable spoken cue.
- Show graph validation errors, publish the verified graph and mark it outdated.
- Support keyboard and screen-reader use with named controls and announced status.

### Express — Bảo Anh

- Only public API for mobile/web; implement `contracts/product-api.openapi.yaml` v2.0.0.
- Validate requests/responses and return the stable error envelope.
- Store accepted candidate landmarks as `AI_DRAFT`; AI never writes the database.
- Own deduplication, human-review transitions and graph publication.
- Validate directed edges, list reachable destinations and compute deterministic BFS paths.
- Start `NAVIGATE` in `AWAITING_START_CONFIRMATION`, then own expected-landmark matching and `currentPathIndex`.
- Call FastAPI through interchangeable live and deterministic mock adapters.
- Map timeout/provider/schema failures without changing session progress.
- Never persist raw frame bytes or log private provider payloads.

### PostgreSQL/Prisma — Bảo Anh

Minimum planned entities:

- `Route`: legacy Product API name for one bounded workplace graph; name, status, timestamps.
- `Landmark`: stable place identity, name, type, visible text, stable features and review status.
- `RouteLandmark`: graph membership and `displayOrder`; display order is not a coordinate/path position.
- `RouteEdge`: graph ID, source/destination landmark IDs, relative maneuver, spoken cue and admin `displayOrder`.
- `RouteSession`: mode, status, selected origin/destination, planned path and current path index.
- `Observation`: structured summary, request ID, quality, model/prompt version and latency; no raw frame.
- `LandmarkReview`: edits, reviewer role, state transition and timestamp.

Recommended deterministic database constraints:

- unique graph membership per `(routeId, landmarkId)`;
- unique directed pair per `(routeId, fromLandmarkId, toLandmarkId)`;
- no self-loop at application validation and database check where supported;
- both edge endpoints must belong to the same graph;
- published graphs contain at least two verified landmarks and at least one valid edge.

### FastAPI — Hồng Phúc

- Implement `contracts/ai-service.openapi.yaml` v1.1.0, especially `POST /internal/v1/perception`.
- Accept one to three ephemeral images from Express.
- Validate/resize/compress input and optionally detect blur/darkness.
- Call the selected OCR/VLM provider and parse into the shared Pydantic schema.
- Return frame quality, detected text, scene type, landmark candidates, stable features, uncertainty, model ID, prompt version and latency.
- Release frame bytes after the request and avoid private payload logs.
- Own AI-service health, provider tests, eval and deployment.

FastAPI does not receive the graph, query PostgreSQL, compute a path or return `turnLeft`, `safeToProceed`, `advanceCheckpoint` or `publish`.

## Day 1 learn flow

```text
1. Mobile creates a draft workplace graph through Express.
2. Mobile starts a LEARN session.
3. Mobile sends a sampled frame batch to Express.
4. Express adds request/session context and calls FastAPI.
5. FastAPI returns schema-valid perception.
6. Express returns accessible scene narration and at most one selected candidate.
7. Employee/buddy explicitly requests save for a useful stable candidate.
8. Express deduplicates and immediately stores the record as AI_DRAFT.
9. Steps 3–8 repeat for the bounded demo area.
10. Buddy opens the mobile-created Route ID on web and reloads the stored candidates.
11. Web admin edits and transitions accepted drafts to BUDDY_VERIFIED.
12. Admin creates directed edges using from/to/maneuver/spoken-cue controls.
13. Express validates references, self-loops and duplicate directed pairs.
14. Express publishes only a human-verified graph with usable directed paths.
```

The admin does not move an object from a temporary store into the database. Drafts already exist in PostgreSQL; review changes their state and graph relations.

## Day 2+ origin/destination navigation flow

```text
1. Mobile loads one PUBLISHED graph.
2. Screen reader reads landmarks in displayOrder; employee selects origin.
3. GET /api/v2/routes/{routeId}/reachable-destinations filters by directed reachability.
4. Employee selects destination from the returned list.
5. POST /api/v2/routes/{routeId}/sessions sends NAVIGATE + origin/destination.
6. Express runs deterministic BFS and stores plannedPath.
7. Session starts AWAITING_START_CONFIRMATION with expectedLandmarkId = origin.
8. Mobile asks the employee to face the selected origin and capture an observation.
9. FastAPI returns perception; Express matches only against the expected origin.
10. If confirmed, Express changes to the first travel step and returns its reviewed spoken cue.
11. The employee moves using their cane/guide dog/O&M skills; the app does not detect obstacles.
12. At the next landmark, another observation is matched against only that expected landmark.
13. A match increments currentPathIndex and returns the next edge cue.
14. Unclear/conflicting input returns STOP_AND_RESCAN without advancing.
15. Matching destination completes the session.
```

## Deterministic graph and path policy

- Edges are directed. Reverse travel requires an explicit reverse edge with its own cue.
- Relative maneuver belongs to the edge and describes what to do after the source landmark is confirmed.
- Reachability and pathfinding use published landmarks/edges only.
- `FEWEST_EDGES` uses unweighted BFS in Express.
- For equal-length alternatives, enqueue outgoing edges by `displayOrder`, then edge ID, so tests and demos are reproducible.
- A missing path returns `NO_ROUTE_AVAILABLE`; AI is not called.
- Origin equal to destination is rejected for the MVP.
- `displayOrder` supports stable UI/screen-reader reading only and never asserts physical location.
- No weighted shortest path, continuous localisation or automatic rerouting from an unknown landmark is in scope.

## Landmark matching policy

- Prefer distinctive visible text such as `RECEPTION`, `LEVEL 2`, `MEETING ROOM A` and `RESTROOM`.
- Express normalises case, whitespace and punctuation before exact/contains comparison.
- Scene type and stable features support a match but are not proof by themselves.
- The current expected landmark is the only match target; the model does not select arbitrary graph state.
- Unreadable, ambiguous or conflicting evidence never advances.
- No model self-reported confidence is treated as a calibrated probability.

## Stable failure behavior

| Failure | Express product behavior |
|---|---|
| Invalid client request | `VALIDATION_ERROR`; no AI call and no state change |
| Unpublished/outdated graph | `INVALID_STATE`; navigation cannot start |
| Origin/destination unreachable | `NO_ROUTE_AVAILABLE`; no AI call |
| Wrong/unconfirmed origin | `200` with `AWAITING_START_CONFIRMATION`, `shouldAdvance: false` and no movement cue |
| Blurry/dark/unreadable input | `STOP_AND_RESCAN`; no path advance |
| FastAPI schema violation | `AI_INVALID_RESPONSE`; no persistence/advance |
| Provider unavailable | `AI_PROVIDER_UNAVAILABLE`; retry offered |
| Timeout/stale response | `AI_TIMEOUT` or ignored stale result; no state change |
| Landmark mismatch | Same expected landmark; ask user to rescan/reorient |
| Layout changed | Mark graph `OUTDATED` and request human review |

## Contract and repository ownership

- Product API v2 source: `contracts/product-api.openapi.yaml` — Bảo Anh.
- AI service v1.1 source: `contracts/ai-service.openapi.yaml` — Hồng Phúc produces, Bảo Anh consumes.
- Shared payload fixtures: `contracts/examples/`.
- Product API v2 is intentionally breaking from the old fixed linear-route API.
- AI-service v1.1 is unchanged by graph/path selection; Hồng Phúc does not need Product API routing code.
- Any AI contract semantic/breaking change requires both owners to update examples and validators together.

## First vertical slice

```text
Published graph:
Reception ↔ Elevator Level 2 ↔ Meeting Room A
                   ↕
          Restroom Level 2

Demo journey A: Reception → Elevator Level 2 → Meeting Room A
Demo journey B: Reception → Elevator Level 2 → Restroom Level 2
```

Build order:

1. Runtime validators and all checked-in contract examples.
2. Express deterministic mock AI adapter plus in-memory graph/BFS/session state.
3. PostgreSQL/Prisma persistence and constraints.
4. Mobile origin/destination selection, start confirmation and one complete path.
5. Web landmark review, directed-edge dropdowns and graph publication.
6. FastAPI live perception integration.
7. Unreadable, unreachable, wrong-start, timeout and stale-response cases.
8. Accessibility checks, AI eval, deployment and recorded fallback.
