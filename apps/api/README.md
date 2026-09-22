# Application API

Express/TypeScript backend chịu trách nhiệm public product API, validation, business rules, PostgreSQL, AI-service orchestration, timeout, error mapping và fallback.

Scope landmark graph và Product API v3 trên prototype route namespace `/api/v2` đã chốt. Trước khi sửa, đọc:

- `docs/SOLUTION_SCOPE.md`
- `docs/TECHNICAL_FLOW.md`
- `contracts/product-api.openapi.yaml`
- `contracts/ai-service.openapi.yaml`

Vertical slice đầu tiên phải dùng deterministic AI mock và graph fixture bốn landmark có một nhánh. Express sở hữu database write, review/publish, directed `RouteEdge`, reachable-destination filtering, deterministic BFS, start-landmark confirmation, session state và `STOP_AND_RESCAN`. FastAPI chỉ cung cấp perception theo AI-service v1.1; không route, query database hoặc quyết định advance.

Chạy nhanh với in-memory persistence và deterministic AI mock:

```bash
npm install
npm run dev:api
npm run test --workspace @pathmemory/api
```

Chạy với PostgreSQL local:

```bash
docker compose up -d postgres
cp apps/api/.env.example apps/api/.env
```

Trong `apps/api/.env`, đặt:

```dotenv
PERSISTENCE_MODE=postgres
DATABASE_URL=postgresql://pathmemory:pathmemory_local_only@127.0.0.1:5432/pathmemory?schema=public
```

Sau đó:

```bash
npm run db:migrate:deploy --workspace @pathmemory/api
npm run db:seed --workspace @pathmemory/api
npm run dev:api
```

`GET /health` không gọi PostgreSQL hoặc FastAPI. Product API v3, graph kernel, deterministic EN/VI navigation narration, in-memory/Prisma repositories, deterministic AI mock và live HTTP adapter đã được implement. Database chỉ lưu structured maneuver; không có authored `spokenCue`. Raw frame bytes chỉ tồn tại trong request memory và không có cột lưu trong database.

## AI adapter modes

Development defaults to an explicit deterministic mock:

```dotenv
AI_ADAPTER=mock
```

Live mode requires all server-side values:

```dotenv
AI_ADAPTER=live
AI_SERVICE_URL=https://YOUR_FASTAPI_SERVICE
AI_SERVICE_TOKEN=replace-with-server-side-token
AI_TIMEOUT_MS=18000
```

Express forwards one to three JPEG/PNG frames as multipart to `POST /internal/v1/perception`, authenticates with a bearer token, validates the returned perception schema and maps timeout/provider failures into the stable Product API error envelope. The server logs whether it started in `mock` or `live` mode. It never silently falls back from a failed live request to mock output.

`AI_TIMEOUT_MS` must be slightly longer than FastAPI's `PROVIDER_TIMEOUT_SECONDS`, so Express can receive and map FastAPI's stable timeout response instead of aborting first. The checked-in defaults are 18 seconds and 15 seconds respectively. Do not increase them without checking mobile feedback, provider cost and measured latency.

The local Express-to-FastAPI mock smoke passes. A real end-to-end Gemini smoke remains pending until deployment/runtime credentials are available; do not report the local mock as AI-quality evidence.
