# Application API

Express/TypeScript backend chịu trách nhiệm public product API, validation, business rules, PostgreSQL, AI-service orchestration, timeout, error mapping và fallback.

Scope và contract v1 đã chốt. Trước khi scaffold, đọc:

- `docs/SOLUTION_SCOPE.md`
- `docs/TECHNICAL_FLOW.md`
- `contracts/product-api.openapi.yaml`
- `contracts/ai-service.openapi.yaml`

Vertical slice đầu tiên phải dùng deterministic AI mock, một demo route ba landmark và cùng response schema với FastAPI live. Express sở hữu duplicate policy, `RouteEdge`, route state, database write, review/publish và `STOP_AND_RESCAN`. Ba landmark là demo policy, không phải hard limit của API/database.
