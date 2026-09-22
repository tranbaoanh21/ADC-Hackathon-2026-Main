# PathMemory

PathMemory là prototype Stage 4 của team **Hackathon Conquerors** cho RMIT Accessibility Design Competition 2026. Sản phẩm giúp nhân viên mới khiếm thị ghi nhận các điểm mốc trong ngày đầu cùng đồng nghiệp/HR, sau đó dùng graph đã được con người duyệt để nghe hướng dẫn tương đối trong các hành trình quen thuộc.

## Đọc trước khi code

- Mọi thành viên/agent: [`AGENTS.md`](AGENTS.md).
- FastAPI/model: [`services/ai/README.md`](services/ai/README.md) và [`contracts/ai-service.openapi.yaml`](contracts/ai-service.openapi.yaml).
- Product scope: [`docs/SOLUTION_SCOPE.md`](docs/SOLUTION_SCOPE.md).
- Trạng thái bàn giao: [`docs/HANDOFF.md`](docs/HANDOFF.md).

## Kiến trúc

```text
Expo mobile / React web
          ↓
Express Product API
    ├── PostgreSQL / Prisma
    ↓
FastAPI perception service
    ↓
Gemini
```

- Bảo Anh: mobile, web, Express, Prisma/PostgreSQL, Product API và integration.
- Hồng Phúc: FastAPI, Gemini/provider, prompt, preprocessing và AI eval.
- Web/mobile chỉ gọi Express. FastAPI không sở hữu graph, database, BFS hoặc navigation narration.

## Chạy application local

Yêu cầu: Node.js 24+, npm 11+ và Docker nếu dùng PostgreSQL.

```bash
npm install
docker compose up -d postgres
```

Tạo `apps/api/.env` từ `apps/api/.env.example`. Để dùng PostgreSQL local:

```dotenv
PORT=3000
DATABASE_URL=postgresql://pathmemory:pathmemory_local_only@localhost:5432/pathmemory
PERSISTENCE_MODE=prisma
AI_ADAPTER=mock
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_TOKEN=replace-with-local-token
AI_TIMEOUT_MS=18000
CORS_ORIGINS=http://localhost:5173
```

Chạy migration và seed:

```bash
npm run db:migrate:deploy --workspace @pathmemory/api
npm run db:seed --workspace @pathmemory/api
```

Mở ba terminal:

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

- Web: tạo `apps/web/.env` với `VITE_API_URL=http://localhost:3000`.
- Mobile trên máy thật: tạo `apps/mobile/.env` với `EXPO_PUBLIC_API_URL=http://<LAN-IP-của-máy>:3000`; không dùng `localhost` từ điện thoại.
- FastAPI mock/live: làm theo [`services/ai/README.md`](services/ai/README.md). Khi tích hợp FastAPI local, đặt `AI_ADAPTER=live` và dùng cùng internal token ở hai service.

## Kiểm tra

Application:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

FastAPI:

```bash
cd services/ai
python -m ruff check .
python -m ruff format --check .
python -m pytest
```

## Repository map

```text
apps/mobile/       Expo app cho nhân viên khiếm thị
apps/web/          React console cho đồng nghiệp/HR
apps/api/          Express, Prisma, graph/BFS/session/narration
services/ai/       FastAPI perception service
contracts/         Product API và AI-service OpenAPI + examples
evals/             AI evaluation cases/scripts guidance
docs/              Brief, scope, handoff và accessibility evidence
demo-assets/       Chỉ asset có quyền sử dụng cho demo/fallback
```

## Trạng thái

FE/BE/DB/contracts và FastAPI mock/Gemini adapter đã có implementation local. Product API đang ở v3.1.0; AI-service vẫn ở v1.1.0. Device screen-reader QA, production deployment và một smoke end-to-end Express → FastAPI → Gemini vẫn là việc cần hoàn tất. Xem trạng thái chính xác tại [`docs/HANDOFF.md`](docs/HANDOFF.md).

Không commit `.env`, API key, database URL thật, internal token hoặc raw workplace media.
