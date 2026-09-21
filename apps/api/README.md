# Application API

Express/TypeScript backend chịu trách nhiệm public product API, validation, business rules, PostgreSQL, AI-service orchestration, timeout, error mapping và fallback.

Scope landmark graph và Product API v2 đã chốt. Trước khi scaffold, đọc:

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

`GET /health` không gọi PostgreSQL hoặc FastAPI. Product API v2, graph kernel, in-memory/Prisma repositories và deterministic AI mock đã được implement. Raw frame bytes chỉ tồn tại trong request memory và không có cột lưu trong database.
