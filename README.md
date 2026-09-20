# ADC Hackathon 2026 Main

Repository chính của team **Hackathon Conquerors** cho RMIT Accessibility Design Competition 2026.

Focus area đã được BTC xác nhận: **Visual Impairment — Blind or Low Vision**.

Repository hiện ở trạng thái **brief-ready**. Competition brief chưa được chép vào repo, vì vậy chưa có product idea, data model hoặc API contract nào được coi là đã chốt.

## Bắt đầu làm việc

Mọi thành viên và coding agent phải đọc theo thứ tự:

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/COMPETITION_BRIEF.md`](docs/COMPETITION_BRIEF.md)
3. [`docs/SOLUTION_SCOPE.md`](docs/SOLUTION_SCOPE.md)
4. Contract và example payload liên quan
5. README trong phần code đang phụ trách

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

- Bảo Anh phụ trách client, Express, PostgreSQL, integration, deployment và accessibility implementation.
- Hồng Phúc phụ trách model/provider, prompt, preprocessing, structured output, evaluation, latency và limitations.
- Product/Pitch owner giữ problem evidence, user insight, story, deck và Q&A.

Chi tiết ownership, Git workflow, contract-first workflow, deployment và submission rules nằm trong `AGENTS.md`.

## Cấu trúc repository

```text
apps/
  web/              React/Vite client nếu brief cần web
  api/              Express application backend
  mobile/           Expo/React Native client nếu brief cần camera/mobile
services/
  ai/               FastAPI AI service và provider adapter
contracts/
  examples/         OpenAPI và payload mẫu dùng chung
evals/
  cases/            Fixed evaluation cases và kết quả đo
docs/               Brief, scope, decisions và evidence
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
- [ ] Competition brief đã được nhập
- [ ] Solution scope đã được team chốt
- [ ] API/AI contracts đã được tạo
- [ ] Application scaffold đã được tạo theo brief
- [ ] Golden path chạy end-to-end

## Secrets

- Không commit `.env`, API key, database URL hoặc token.
- Chỉ commit `.env.example` với placeholder.
- Gemini key chỉ nằm trong server-side AI service.
- Database credential chỉ nằm trong application backend environment.
- Nếu secret từng bị commit, phải revoke và rotate; xóa file ở commit mới không đủ bảo vệ secret cũ.

