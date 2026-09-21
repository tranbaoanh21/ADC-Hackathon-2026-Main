# Application API

Express/TypeScript backend chịu trách nhiệm public product API, validation, business rules, PostgreSQL, AI-service orchestration, timeout, error mapping và fallback.

Scope landmark graph và Product API v2 đã chốt. Trước khi scaffold, đọc:

- `docs/SOLUTION_SCOPE.md`
- `docs/TECHNICAL_FLOW.md`
- `contracts/product-api.openapi.yaml`
- `contracts/ai-service.openapi.yaml`

Vertical slice đầu tiên phải dùng deterministic AI mock và graph fixture bốn landmark có một nhánh. Express sở hữu database write, review/publish, directed `RouteEdge`, reachable-destination filtering, deterministic BFS, start-landmark confirmation, session state và `STOP_AND_RESCAN`. FastAPI chỉ cung cấp perception theo AI-service v1.1; không route, query database hoặc quyết định advance.
