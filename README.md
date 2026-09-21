# ADC Hackathon 2026 Main

Repository chính của team **Hackathon Conquerors** cho RMIT Accessibility Design Competition 2026.

Focus area đã được BTC xác nhận: **Visual Impairment — Blind or Low Vision**.

Repository hiện ở trạng thái **landmark-graph scope confirmed / contract-first implementation ready**. Team đã chọn Stage 4: ngày đầu nhân viên và buddy ghi nhận các landmark ổn định; admin duyệt và nối chúng bằng cạnh có hướng; từ ngày sau nhân viên dùng screen reader chọn điểm đầu–điểm đến và nhận speech theo đường đi do Express tính trên graph đã publish. Demo dùng bốn landmark có một nhánh; contract/database không hard-code tổng số landmark.

## Bắt đầu làm việc

Mọi thành viên và coding agent phải đọc theo thứ tự:

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/START_HERE.md`](docs/START_HERE.md)
3. [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)
4. [`docs/COMPETITION_BRIEF.md`](docs/COMPETITION_BRIEF.md)
5. [`docs/SOLUTION_SCOPE.md`](docs/SOLUTION_SCOPE.md)
6. [`docs/HANDOFF.md`](docs/HANDOFF.md)
7. [`docs/TECHNICAL_FLOW.md`](docs/TECHNICAL_FLOW.md)
8. Contract, example payload và README trong phần code đang phụ trách

Prompt mẫu cho thread mới và teammate nằm tại [`docs/THREAD_STARTER_PROMPTS.md`](docs/THREAD_STARTER_PROMPTS.md).

Không bắt đầu code feature trước khi team điền tối thiểu primary user, workplace context, barrier, golden path, non-goals và success metrics trong `docs/SOLUTION_SCOPE.md`.

## Kiến trúc mặc định

Kiến trúc chỉ được giữ nếu competition brief thực sự cần đủ các tầng:

```text
React/Vite web hoặc Expo mobile
                ↓
       Express application API
          ├── PostgreSQL
          ↓
       FastAPI AI service
          ↓
       Google Gemini API
```

- Bảo Anh phụ trách Expo mobile, React web, Express, PostgreSQL, integration, deployment và accessibility implementation trong application repository.
- Hồng Phúc phụ trách FastAPI repository/runtime, model/provider, prompt, preprocessing, structured output, evaluation, latency và limitations.
- `contracts/ai-service.openapi.yaml` trong repository này là source of truth cho ranh giới Express ↔ FastAPI.
- Product/Pitch owner giữ problem evidence, user insight, story, deck và Q&A.

Chi tiết ownership, Git workflow, contract-first workflow, deployment và submission rules nằm trong `AGENTS.md`.

## Cấu trúc repository

```text
apps/
  web/              React/Vite client nếu brief cần web
  api/              Express application backend
  mobile/           Expo/React Native client nếu brief cần camera/mobile
services/
  ai/               Integration notes; FastAPI runtime do Hồng Phúc sở hữu
contracts/
  examples/         OpenAPI và payload mẫu dùng chung
evals/
  cases/            Fixed evaluation cases và kết quả đo
docs/               Brief, scope, decisions và evidence
  diagrams/          PlantUML source và SVG dùng trong deck
demo-assets/        Asset được phép dùng cho demo/fallback
ADC-main-submission-template/
                    Tài liệu và PowerPoint template chính thức
```

Không bắt buộc xây cả web và mobile. Sau khi đọc brief, chọn client nhỏ nhất có thể chứng minh golden path đáng tin cậy.

## Workflow ngay sau khi nhận brief

1. Chép nguyên văn brief và yêu cầu chính vào `docs/COMPETITION_BRIEF.md`.
2. Tách `Official fact`, `Observed evidence`, `Assumption` và `Decision`.
3. Điền `docs/SOLUTION_SCOPE.md` và khóa một golden path.
4. Chốt request, response và error contract bằng example JSON.
5. Software track phát triển với mock; AI track thử provider bằng cùng contract.
6. Integrate sớm, sau đó ưu tiên accessibility, eval, deployment và submission evidence.

## Trạng thái hiện tại

- [x] Git repository và remote đã được tạo
- [x] Team workflow và ownership đã được ghi trong `AGENTS.md`
- [x] Official submission template và guides đã được lưu
- [x] Repository skeleton đã sẵn sàng
- [x] New-thread, teammate onboarding và handoff workflow đã được chuẩn hóa
- [x] PlantUML source/rendering convention đã được định nghĩa
- [x] Competition brief đã được nhập
- [x] Solution scope Stage 4 đã được team chốt
- [x] Product API v2 và AI-service v1.1 contracts đã được tạo
- [x] Application workspace và API/web/mobile shells đã được scaffold theo brief
- [ ] Golden path chạy end-to-end

## Secrets

- Không commit `.env`, API key, database URL hoặc token.
- Chỉ commit `.env.example` với placeholder.
- Gemini key chỉ nằm trong server-side AI service.
- Database credential chỉ nằm trong application backend environment.
- Nếu secret từng bị commit, phải revoke và rotate; xóa file ở commit mới không đủ bảo vệ secret cũ.
