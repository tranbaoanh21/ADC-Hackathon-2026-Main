# PathMemory Team Handoff

Last updated: `2026-09-22`

Current branch: `feat/web-admin-polish`

## Current product state

- Product API `3.1.0` on prototype namespace `/api/v2`.
- AI-service `1.1.0`; perception boundary is unchanged.
- Expo mobile implements accessible EN/VI Explore and Navigate flows.
- Explore uses controlled sequential camera capture with request backpressure and automatic `AI_DRAFT` submission; there is no per-frame capture/save workflow.
- React web lists workplaces by recognisable name, reviews landmarks, creates directed structured maneuvers and publishes the graph.
- Express owns validation, persistence, deduplication, reachability, BFS, navigation state and deterministic EN/VI narration.
- Prisma/PostgreSQL schema, migrations, seed and repository adapters are implemented.
- FastAPI mock and Gemini provider adapters are implemented in `services/ai/`.
- Clients call Express only; Express is the sole consumer of FastAPI.

## Ownership boundary

| Owner | Scope |
|---|---|
| Bảo Anh | Mobile, web, Express, Product API, Prisma/PostgreSQL, graph/BFS/session/narration, Express-to-FastAPI adapter, accessibility and application deployment |
| Hồng Phúc | FastAPI runtime, model/provider, prompt, preprocessing/postprocessing, Pydantic schemas, AI tests/eval and AI-service deployment |
| Shared | `contracts/ai-service.openapi.yaml`, AI examples, semantic changes and integration smoke |

## Hồng Phúc: exact restart path

Read in this order:

```text
AGENTS.md
services/ai/README.md
contracts/ai-service.openapi.yaml
contracts/examples/ai-*.json
services/ai/app/
services/ai/tests/
evals/README.md
```

Then:

1. Pull/rebase this branch or the resulting merged commit without discarding local work.
2. Keep AI-service v1.1 response/error shapes compatible.
3. Work only in `services/ai/`, `evals/` and AI contract/examples when an agreed contract change requires it.
4. Run deterministic mock tests before consuming Gemini quota.
5. Expand the fixed visual set to 10–20 permission-approved positive and negative cases.
6. Record model ID, prompt/schema version, case count, schema validity, semantic failures, latency and estimated cost.
7. Provide the deployed FastAPI URL and matching server-side internal token through environment configuration, never Git/chat/screenshots.
8. Run one Express → FastAPI mock smoke, then one permission-safe Express → FastAPI → Gemini smoke with Bảo Anh.

FastAPI must not implement PostgreSQL, graph creation, edge maneuvers, BFS, navigation sessions, user-facing narration or safety decisions.

## Integration contract

Express sends `multipart/form-data` to `POST /internal/v1/perception` with:

- bearer internal service token;
- `requestId`;
- `locale`;
- `analysisMode`;
- one to three ephemeral JPEG/PNG frames.

Express validates AI-service v1.1 output before storing structured fields. Timeout, provider error, schema error, unreadable evidence and mismatch never advance navigation.

Environment ownership:

| Variable | Owner/runtime |
|---|---|
| `EXPO_PUBLIC_API_URL` | Mobile; public Express URL |
| `VITE_API_URL` | Web; public Express URL |
| `DATABASE_URL` | Express only |
| `AI_SERVICE_URL`, `AI_SERVICE_TOKEN`, `AI_TIMEOUT_MS` | Express only |
| `INTERNAL_SERVICE_TOKEN`, `GEMINI_API_KEY`, `GEMINI_MODEL` | FastAPI only |

## Verification already completed locally

- Application lint passed.
- Typecheck passed across workspaces.
- Web and API production builds passed.
- Mobile state/accessibility tests: 13 passed.
- API tests: 47 passed; 3 database-dependent tests were skipped in the current run environment.
- Expo iOS Metro export passed.
- FastAPI's prior recorded gate: Ruff/format and 53 pytest cases passed.
- Earlier permission-approved pilot: one PNG plus five sampled video observations returned schema-valid responses and passed their defined semantic expectations. This is a small pilot, not a general accuracy claim.

## Still pending

- Physical VoiceOver/TalkBack walkthrough and maximum-text-size QA.
- Real camera golden-path run on a phone.
- One full Express → FastAPI → Gemini smoke after both services use aligned environment values.
- Production PostgreSQL/FastAPI/Express/web deployment and Expo test against HTTPS.
- Two consecutive end-to-end demo journeys.
- Expanded AI eval and end-to-end latency/cost measurement.

## Contract change handoff

Before changing `contracts/ai-service.openapi.yaml`, write:

```text
Field or endpoint:
Reason:
Additive or breaking:
Express consumer impact:
FastAPI producer impact:
Examples, validators and tests updated:
```

Do not merge a breaking change until both owners have compatible implementations or an agreed migration. Every handoff must include branch, commit, contract impact, tests run, known limitations and the next exact action.
