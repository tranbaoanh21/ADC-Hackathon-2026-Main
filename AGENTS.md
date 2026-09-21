# AGENTS.md — Quy tắc làm việc trong ADC Hackathon 2026

## 1. Mục đích

File này là quy tắc chung để các thành viên và coding agent phối hợp trong ngày thi. File không mô tả một ý tưởng, model hay kiến trúc đã được chốt trước.

Competition brief, end-user evidence và quyết định chung của team trong ngày thi luôn có mức ưu tiên cao hơn giả định chuẩn bị trước.

### 1.1. Repository là shared context

Chat history không được đồng bộ qua Git và không phải source of truth của team. Mọi quyết định mà thành viên hoặc agent khác cần biết phải được ghi vào repository, commit và push.

Phân chia source of truth:

| Nội dung | File/thư mục |
|---|---|
| Quy tắc ổn định, ownership và quality gates | `AGENTS.md` |
| Điểm bắt đầu cho người mới hoặc thread mới | `docs/START_HERE.md` |
| Trạng thái dự án và việc đang làm | `docs/PROJECT_STATUS.md` |
| Competition facts và end-user evidence | `docs/COMPETITION_BRIEF.md` |
| Product decision, golden path và non-goals | `docs/SOLUTION_SCOPE.md` |
| Request/response/error interface | `contracts/` |
| Bàn giao giữa người, branch và agent | `docs/HANDOFF.md` |
| Diagram source và rendering rules | `docs/diagrams/` |

Không chép trạng thái tạm thời vào `AGENTS.md`. Không để shared decision chỉ tồn tại trong chat, terminal output hoặc local note.

### 1.2. Official source pack

Bộ tài liệu chính thức hiện được lưu tại:

```text
ADC-main-submission-template/
├── ADC Hackathon 2026 - Briefing session with participating teams (1).pdf
├── Agenda_RMIT ADC Hackathon 2026.docx
├── ADC 2026_Campus Guide (1).docx
└── Submission template & Requirement/
    ├── ADC 2026_Submission Guide.pdf
    └── Submission Template.pptx
```

Thứ tự ưu tiên khi có khác biệt:

1. Competition brief và thông báo mới nhất của BTC.
2. Submission Guide, official template và briefing files trong source pack.
3. `AGENTS.md` và solution `README.md`.
4. Assumption hoặc ghi chú chuẩn bị trước cuộc thi.

Không chỉnh sửa hoặc ghi đè các file gốc trong `ADC-main-submission-template/`. Deck owner phải tạo working copy từ `Submission Template.pptx`, sau đó đặt tên output theo quy tắc chính thức. Nếu BTC gửi version mới, lưu version mới riêng, so sánh yêu cầu và cập nhật `AGENTS.md` trước khi tiếp tục làm deck.

### 1.3. Official event checkpoints

- Day 1, 09:00–10:00: Opening và Competition Brief release.
- Day 1, 13:00: BTC gửi Mock Pitch registration; form đóng lúc 15:00, giới hạn 20 slots theo first come, first served.
- Day 2, 09:00–10:00: Fireside chat với end users; Visual Impairment room theo email allocation của BTC.
- Day 2, 10:15–11:45: Industry mentoring hoặc technical consultation.
- Day 2, 13:00: BTC gửi unique submission link của team.
- Day 2, 15:00–17:00: Mock pitch cho các đội đã đăng ký.
- Day 3, 07:00: Submission link đóng; không có late submission.
- Day 3, 07:00–12:00: Evaluation Round bởi industry partners và end users.
- Day 3, 13:30–17:00: Grand Finale và awards.

Không thay đổi focus area hoặc team membership sau khi BTC đã xác nhận. Thành viên phải tuân thủ attendance và identity requirements của BTC. Các mốc trên phải được dùng để quyết định feature freeze, deployment, video recording và thời điểm upload; không chờ sát 07:00 Day 3 mới nộp.

Trước khi thực hiện task, mọi thành viên hoặc agent phải đọc theo thứ tự:

1. `AGENTS.md`.
2. `docs/START_HERE.md`.
3. `docs/PROJECT_STATUS.md`.
4. `docs/COMPETITION_BRIEF.md` và `docs/SOLUTION_SCOPE.md`.
5. `docs/HANDOFF.md`.
6. API contracts, example payload và README trong phạm vi task.
7. Git status, branch hiện tại và thay đổi chưa commit.

Trong turn đầu của thread mới, agent phải tóm tắt ngắn gọn những gì đã hiểu, chỉ ra file còn `TBD` liên quan đến task và xác nhận phạm vi trước khi thay đổi lớn. Không được dùng kiến thức từ một chat khác để ghi đè repository hiện tại.

## 2. Nguyên tắc ưu tiên

Khi cần chọn giữa nhiều việc, ưu tiên theo thứ tự:

1. Đúng competition brief.
2. Giải quyết barrier thật của end user.
3. Hoàn thiện một golden path end-to-end.
4. Accessibility, safety và privacy.
5. Reliability của prototype và demo.
6. Evidence, eval và feasibility.
7. Tính năng bổ sung.

Không bắt đầu từ câu hỏi “dùng model nào” hoặc “thêm công nghệ gì”. Bắt đầu từ:

```text
Ai gặp vấn đề?
Vấn đề xảy ra trong context nào?
Workaround hiện tại là gì?
Barrier nào cần giảm?
Kết quả nào có thể đo được?
```

## 3. Scope control

- Chỉ chọn một primary user, một core problem và một golden path.
- Mỗi tính năng phải trực tiếp cải thiện golden path hoặc tiêu chí chấm.
- Ghi rõ non-goals trước khi code.
- Không xây đồng thời nhiều client đầy đủ nếu một client đã đủ để chứng minh solution.
- Không thêm authentication phức tạp, RAG, fine-tuning, GPU hosting, realtime video hoặc agent automation nếu brief không yêu cầu và golden path chưa ổn định.
- Ưu tiên hosted API, mock fallback và implementation nhỏ có thể kiểm tra.
- Khi golden path đã chạy, chuyển sang accessibility, eval, deployment và pitch thay vì tiếp tục mở rộng.

## 4. Vai trò mặc định

### Bảo Anh — Software/Product Owner

Owner chính của:

- web/mobile client
- Express application backend
- PostgreSQL/Prisma
- product API
- Express-to-FastAPI integration adapter
- deployment, fallback và accessibility implementation

Trách nhiệm:

- chuyển brief và user flow thành scope kỹ thuật khả thi
- duy trì contract cho client và application backend
- xây application flow bằng mock trước
- tích hợp AI service của Hồng Phúc vào sản phẩm
- quản lý persistence, error state, timeout và deployment
- giữ `main` ở trạng thái có thể demo

### Hồng Phúc — AI/Model Owner

Owner chính của:

- FastAPI application shell, internal route và deployment
- model/provider selection
- prompt
- preprocessing và postprocessing
- model provider adapter
- structured AI output
- provider tests
- eval dataset, benchmark, latency, cost và failure analysis

Trách nhiệm:

- thử tối đa một hoặc hai model phù hợp
- duy trì FastAPI runtime có thể deploy và tuân thủ `contracts/ai-service.openapi.yaml`
- bàn giao Python module hoặc provider chạy được, không chỉ notebook
- giữ output đúng contract đã thống nhất
- ghi rõ limitations, unsafe cases và failure behavior
- tạo evidence cho các claim về AI

### Thành viên User Research/Pitch

Owner chính của:

- end-user insights
- problem framing
- persona và user journey
- assumption log
- feasibility/business reasoning
- pitch deck, demo narrative và Q&A

Trách nhiệm:

- kiểm tra solution có thật sự giải quyết brief không
- phân biệt evidence với assumption
- chuyển feedback từ end user/mentor thành quyết định sản phẩm
- bảo đảm slide và demo phản ánh đúng prototype thật

## 5. Shared decisions

Các quyết định sau không thuộc riêng một thành viên:

- problem statement
- golden path
- request/response/error contract
- field do model sinh và field do code tính
- trường hợp cần human confirmation
- safety/privacy rule
- success metric
- model/fallback dùng trong demo
- product claim dùng trong pitch

Mỗi shared file chỉ có một người sửa tại một thời điểm. Trước khi sửa shared contract hoặc schema, thông báo:

```text
File sẽ sửa
Lý do sửa
Breaking change hay không
Branch đang dùng
Người cần cập nhật code liên quan
```

## 6. Architecture boundaries

Kiến trúc mặc định nếu solution cần đầy đủ các tầng:

```text
Client
  ↓
Express application backend
  ├── PostgreSQL
  ↓
FastAPI AI service
  ↓
Model provider
```

Quy tắc:

- Client chỉ gọi public product API.
- Client không giữ model token hoặc database credential.
- Express sở hữu business logic, persistence và public response.
- FastAPI là internal AI service, không phải application backend thứ hai.
- FastAPI không tự quản lý user hoặc business database.
- Model provider không quyết định response shape của client.
- Raw model output luôn là untrusted input.
- Output chỉ được lưu/render sau khi qua schema validation và product policy.

Nếu brief không cần một tầng, được phép loại bỏ tầng đó để giảm complexity. Không giữ service chỉ vì scaffold đã có sẵn.

### 6.1. Deployment target mặc định

Nếu competition brief không tạo ra yêu cầu khác, deployment mặc định của team là:

```text
React/Vite web                → Vercel
Express application backend  → Railway
FastAPI AI service           → Railway
PostgreSQL                   → Railway PostgreSQL
Gemini model                 → Google Gemini API
Expo mobile                  → Expo Go gọi Express HTTPS URL
```

Luồng production:

```text
React trên Vercel / Expo Go
            ↓ HTTPS
Express trên Railway
       ├── PostgreSQL trên Railway
       ↓ HTTPS hoặc Railway private network
FastAPI trên Railway
       ↓ HTTPS
Google Gemini API
```

Quy tắc:

- Vercel chỉ host static React/Vite web; web chỉ biết public URL của Express.
- Expo mobile chỉ biết public HTTPS URL của Express.
- Express là public API duy nhất cho web/mobile.
- FastAPI chỉ nhận request từ Express; client không gọi FastAPI hoặc Gemini trực tiếp.
- PostgreSQL chỉ được truy cập từ Express/application backend.
- Gemini đã được Google host; team không deploy model, không thuê GPU và không tải model vào Railway.
- Prototype không cần login/OAuth trừ khi brief bắt buộc phải có identity, account sync hoặc authorization.
- Local Docker PostgreSQL chỉ dùng cho development; production dùng Railway PostgreSQL managed.
- Không dùng URL `localhost`, `127.0.0.1` hoặc IP LAN trong production configuration.
- Mỗi production service phải có health endpoint và log đủ để xác định lỗi theo tầng.
- Giữ một replica là đủ cho demo nếu tải thấp; không scale-to-zero trong thời gian pitch nếu plan cho phép.

### 6.2. Environment ownership

Biến môi trường phải được đặt đúng nơi sở hữu:

| Biến | Nơi đặt | Ghi chú |
|---|---|---|
| `VITE_API_URL` | Vercel web | Public Express HTTPS URL; không phải secret |
| `EXPO_PUBLIC_API_URL` | Expo/mobile environment | Public Express HTTPS URL; không phải secret |
| `DATABASE_URL` | Railway Express | Railway PostgreSQL connection string |
| `AI_SERVICE_URL` | Railway Express | FastAPI service URL |
| `CORS_ORIGINS` | Railway Express | Chỉ cho phép web production và origin local cần thiết |
| `AI_TIMEOUT_MS` | Railway Express | Bao phủ AI primary/fallback path |
| `GEMINI_API_KEY` | Railway FastAPI | Secret; không được đưa xuống client |
| `AI_PROVIDER`, `VISION_PROVIDER` | Railway FastAPI | Provider runtime configuration |
| `GEMINI_MODEL`, `GEMINI_VISION_MODEL` | Railway FastAPI | Model ID dùng trong demo |

Không đặt `DATABASE_URL`, `GEMINI_API_KEY` hoặc credential khác trong biến có prefix `VITE_` hay `EXPO_PUBLIC_`. Mọi biến public đều phải được coi là có thể đọc từ client bundle.

### 6.3. Deployment order

Deploy theo thứ tự để mỗi service phụ thuộc đều có URL hoặc credential trước khi consumer khởi động:

1. Push commit đã pass test lên remote branch dùng để deploy.
2. Tạo Railway PostgreSQL và lấy `DATABASE_URL` bằng Railway variable reference hoặc secret configuration.
3. Deploy FastAPI từ thư mục AI service.
4. Đặt Gemini secrets/config trong FastAPI và kiểm tra `GET /health`.
5. Gọi một AI smoke request trực tiếp tới FastAPI để xác nhận FastAPI → Gemini.
6. Deploy Express từ thư mục application backend.
7. Đặt `DATABASE_URL`, `AI_SERVICE_URL`, timeout và temporary CORS trong Express.
8. Chạy production database migration bằng migration command của repository; không dùng development migration command trên production.
9. Kiểm tra Express health, database history và một request Express → FastAPI → Gemini.
10. Deploy React/Vite web lên Vercel với root directory của web app và output `dist`.
11. Đặt `VITE_API_URL` thành Express public HTTPS URL rồi redeploy web.
12. Cập nhật `CORS_ORIGINS` của Express bằng Vercel production URL.
13. Đặt `EXPO_PUBLIC_API_URL` thành Express public HTTPS URL và restart Expo với cache sạch.
14. Test golden path trên web và điện thoại thật.

Không coi deployment thành công chỉ vì dashboard báo `deployed`. Phải kiểm tra lần lượt:

```text
FastAPI health
→ FastAPI gọi Gemini
→ Express health
→ Express gọi PostgreSQL
→ Express gọi FastAPI
→ Web gọi Express
→ Expo mobile gọi Express
→ golden path end-to-end
```

### 6.4. Production commands và migrations

- Đọc `package.json`, Python configuration và README của repository trước khi đặt Railway/Vercel commands.
- Node service dùng lockfile đã commit và ưu tiên reproducible install như `npm ci`.
- Express phải build trước khi start production process.
- FastAPI chạy Uvicorn/Gunicorn production command trên `0.0.0.0:$PORT`; không dùng auto-reload.
- Prisma production migration dùng `prisma migrate deploy` hoặc script tương đương của repository; không dùng `prisma migrate dev`.
- Migration file phải được commit và review trước khi deploy.
- Không seed dữ liệu phá hủy hoặc ghi đè production data trong build/start command.
- Một deploy mới không được tự động xóa database, media hoặc history hiện có.

### 6.5. Cold start, warm-up và demo fallback

React/Vite static web trên Vercel không phải nguồn cold start chính. Express và FastAPI có thể chậm ở request đầu nếu container vừa deploy, restart hoặc scale-to-zero; Gemini vẫn có provider latency riêng.

Trước demo:

1. Mở web production.
2. Gọi health endpoint của Express và FastAPI.
3. Gửi một request text Gemini ngắn qua Express.
4. Nếu camera là golden path, gửi một ảnh đại diện đã được phép dùng.
5. Kiểm tra record vừa tạo trong history/database.
6. Test lại Expo Go trên mạng di động hoặc Wi-Fi thực tế tại venue.
7. Giữ video, screenshot và mock/cached response dự phòng.

Warm-up request thật có thể tiêu thụ quota. Không chạy polling AI liên tục để giữ service nóng. Health check không được gọi Gemini hoặc tạo database record không cần thiết.

Nếu live provider thất bại trong demo:

- báo trung thực trạng thái live service;
- chuyển sang mock/cached/recorded fallback đã chuẩn bị;
- không trình bày fallback như kết quả inference live;
- vẫn giải thích contract, evaluation, latency đo trước đó và failure handling.

### 6.6. Deployment gate

Chỉ coi production prototype sẵn sàng khi:

- các health endpoint trả `2xx`;
- database migration đã chạy đúng version;
- không có secret trong Git hoặc frontend/mobile bundle;
- web và mobile chỉ gọi Express;
- Express gọi được PostgreSQL và FastAPI;
- FastAPI gọi được Gemini bằng production key/quota;
- CORS chỉ chứa origin cần thiết;
- loading, timeout, retry và provider-error state đã được kiểm tra;
- model ID, latency và failure được ghi lại cho eval;
- golden path chạy được ít nhất hai lần liên tiếp trên production;
- đã có phương án demo dự phòng.

## 7. FastAPI ownership

### Bảo Anh phụ trách

- Express-to-FastAPI integration
- public/internal contract boundary phía Express
- timeout, retry, error mapping và mock adapter phía Express
- deterministic product/safety rules

### Hồng Phúc phụ trách

- FastAPI application shell và internal route
- internal authentication phía FastAPI
- FastAPI deployment configuration và health endpoint
- provider adapter
- prompt và model request
- text/image preprocessing
- raw response parsing
- AI-specific postprocessing
- model/provider tests và eval

### Cùng duyệt

- Pydantic schemas
- `contracts/ai-service.openapi.yaml` và example payload
- AI pipeline output
- meaning của `requiresHumanReview` hoặc field tương đương
- blocking/safety cases
- integration tests

Notebook chỉ dùng cho thử nghiệm. Runtime phải là code có thể import, test và gọi qua một interface ổn định.

## 8. Contract-first workflow

Trước khi code song song, chốt tối thiểu:

1. Một success request.
2. Một success response.
3. Một validation error.
4. Một provider/timeout error.
5. Ý nghĩa và owner của từng field.
6. Một mock response đúng contract.
7. Các acceptance cases quan trọng nhất.

Contract phải có source of truth trong repository, ví dụ:

```text
contracts/*.openapi.yaml
contracts/examples/*.json
runtime validators
tests
```

Khi thay đổi contract:

- cập nhật OpenAPI, examples, validators và tests cùng lúc
- thông báo cho thành viên phụ thuộc vào field đó
- không merge breaking change nếu phần consumer chưa được cập nhật
- không để raw provider response trở thành product contract
- giữ mock và live provider dùng cùng một response shape

## 9. Git synchronization

Trước khi bắt đầu code phải đồng bộ remote, nhưng không được pull mù khi working tree đang có thay đổi.

### Bắt đầu task mới

```bash
git status
git switch main
git pull --ff-only origin main
git switch -c feat/<scope-ngan-gon>
```

### Đang ở feature branch cá nhân

```bash
git status
git fetch origin
git rebase origin/main
```

Chỉ rebase branch cá nhân. Không rebase branch đang được nhiều người cùng sử dụng nếu chưa thống nhất.

### Trước khi push hoặc mở PR

```bash
git status
git fetch origin
git rebase origin/main
```

Sau đó chạy test phù hợp, rồi push feature branch.

### Quy tắc Git

- Không code trực tiếp trên `main` trừ hotfix đã được team đồng ý.
- Không force-push `main`.
- Không commit `.env`, token, credential hoặc raw sensitive data.
- Commit nhỏ, tên rõ và chỉ chứa một mục đích.
- Pull/fetch trước mỗi phiên làm việc và sau khi contract mới được merge.
- Merge sớm; không để branch lệch `main` quá lâu.
- `main` phải luôn build được và ưu tiên luôn demo được.
- Không dùng reset/destructive command để bỏ thay đổi của thành viên khác.
- Conflict ở contract/schema phải được giải quyết cùng owner, không chọn `ours` hoặc `theirs` theo cảm tính.

## 10. Parallel workflow

Sau khi scope và contract được chốt:

### Software track

```text
Client → Express → FastAPI mock → persistence → Client
```

### AI track

```text
Representative inputs → model/provider → structured output → eval
```

### Product/pitch track

```text
User evidence → user journey → value proposition → pitch evidence
```

Không để một track chờ track khác:

- Software track dùng mock JSON đúng contract.
- AI track dùng fixed example inputs đúng contract.
- Pitch track dùng evidence đã xác nhận, không tự tạo product claim.

Merge provider thật ngay khi có một response hợp lệ. Không đợi gần submission mới integration.

## 11. Mock và fallback

- Mock phải deterministic và dùng cùng schema với live provider.
- Mock dùng để phát triển UI, database và integration; không dùng làm evidence về AI quality.
- Live-provider failure phải được map thành error ổn định.
- UI phải có loading, timeout, retry và failure state dễ hiểu.
- Có cách chuyển về mock hoặc cached demo nếu provider/network lỗi.
- Quay demo video và lưu screenshots của golden path trước submission.
- Không che giấu với judges khi demo đang dùng mock hoặc recorded fallback.

## 12. AI rules

- Dùng structured output/JSON Schema khi provider hỗ trợ.
- Validate model output bằng runtime schema.
- Không dùng LLM self-reported confidence như xác suất đáng tin cậy.
- Model có thể extract, classify hoặc đề xuất; code quyết định authorization, safety và irreversible action.
- Ghi lại model ID, provider, prompt/schema version và generation parameters cho eval.
- Không chọn model chỉ dựa trên một output đẹp.
- So sánh model bằng cùng dataset, prompt và metric.
- Không fine-tune khi chưa có dữ liệu hợp lệ, baseline, metric và đủ thời gian.
- Không tự host GPU nếu hosted API đáp ứng golden path.
- Không gọi provider trực tiếp từ browser/mobile.
- Không tự động thực hiện external action nếu thiếu explicit confirmation.

## 13. Eval requirements

Eval phải phục vụ quyết định sản phẩm và claim trong pitch.

Bộ eval tối thiểu nên có:

- representative success cases
- missing-information cases
- malformed hoặc low-quality input
- safety/privacy edge cases
- provider failure/timeout case

Metric chọn theo use case, ví dụ:

- schema validity
- critical-fact recall
- critical omission rate
- hallucination/false-information rate
- review/safety classification
- correct-language rate
- latency và failure rate
- estimated cost per request

Nếu dùng image/OCR/VLM, cân nhắc:

- date/time/location/name accuracy
- character/word error
- blurry-image detection
- uncertainty behavior

Không cần benchmark học thuật lớn trong hackathon. Một tập nhỏ có ground truth và liên quan trực tiếp đến user barrier có giá trị hơn.

## 14. Accessibility và visual impairment

Nếu solution phục vụ blind/low-vision users:

- test với screen reader phù hợp
- mọi interactive control có accessible name
- focus order hợp lý
- loading/error/status được announce
- không dùng màu sắc làm tín hiệu duy nhất
- hỗ trợ text scaling, contrast và touch target phù hợp
- output quan trọng có thể đọc lại bằng TTS nếu cần
- camera flow có audio/haptic guidance nếu brief yêu cầu
- uncertainty được diễn đạt rõ ràng
- không thể hiện sự chắc chắn giả

Không tuyên bố general-purpose AI thay thế gậy, chó dẫn đường hoặc kỹ năng orientation and mobility. Không xây realtime safety navigation nếu chưa có evidence, latency phù hợp và safety validation.

## 15. Privacy và secrets

- `.env` không được commit.
- Chỉ commit `.env.example` với placeholder.
- Model token chỉ tồn tại ở server-side AI service.
- Database credential chỉ tồn tại ở application backend/server environment.
- Không lưu raw image/audio mặc định.
- Nếu cần lưu media, phải có mục đích, retention rule và quyền truy cập rõ ràng.
- Không log secret, private document content hoặc sensitive provider payload.
- Secret không xuất hiện trong frontend bundle, screenshot, slide, issue hoặc chat.
- Nếu secret bị lộ, revoke và thay mới ngay.

## 16. Test và merge gate

Trước khi merge, chạy các lệnh kiểm tra được định nghĩa trong repository. Không tự giả định command; đọc `package.json`, Python configuration và README hiện tại.

Gate tối thiểu theo phạm vi thay đổi:

- format/lint nếu repository có cấu hình
- typecheck
- build
- unit tests
- contract/integration tests
- database migration validation nếu có schema change
- eval/smoke test nếu có thay đổi AI provider hoặc prompt

Live-model eval tiêu thụ credit. Không chạy lặp vô ích; ghi lại model, version, dataset và kết quả.

Khi bàn giao task, báo rõ:

```text
Đã thay đổi gì
Contract có đổi không
Test nào đã chạy
Test nào chưa chạy
Known limitations
Việc tiếp theo
```

## 17. Feature freeze và stop rules

Dừng thêm feature khi có một trong các điều kiện:

- golden path chưa ổn định
- contract còn thay đổi liên tục
- live integration chưa chạy
- chưa có fallback
- chưa có representative eval
- còn ít thời gian trước submission
- feature mới không cải thiện user outcome hoặc judging criteria

Sau feature freeze, ưu tiên:

1. Fix blocker.
2. Accessibility và safety.
3. Test/eval và evidence.
4. Deployment reliability.
5. Demo video/screenshots.
6. Pitch và Q&A.

## 18. Definition of done

Một feature chỉ hoàn thành khi:

- phục vụ golden path
- contract và examples đã đồng bộ
- input/output được validate
- mock và error path hoạt động
- live path hoạt động nếu phụ thuộc AI
- accessibility behavior liên quan đã được kiểm tra
- test/eval phù hợp pass
- không lộ secret hoặc lưu dữ liệu thừa
- không tạo claim vượt quá evidence
- `main` vẫn build và demo được

Prototype sẵn sàng submission khi:

- problem statement rõ
- một golden path end-to-end
- deployed prototype hoặc thiết bị demo ổn định
- fallback/video dự phòng
- eval evidence và limitations
- latency/cost/feasibility cơ bản
- slide, appendix và demo phản ánh đúng sản phẩm thật

## 19. Submission deck và appendix

Deck là phần kể câu chuyện ngắn; appendix là evidence pack để judges kiểm chứng các claim. Không dùng appendix như nơi liệt kê công nghệ hoặc chèn thêm marketing content.

### 19.1. Quy tắc template chính thức

Nếu BTC không gửi hướng dẫn mới thay thế, submission deck phải:

- tạo working copy từ `ADC-main-submission-template/Submission template & Requirement/Submission Template.pptx`
- viết bằng English
- nộp dưới dạng PowerPoint `.pptx`, không thay bằng PDF hoặc link Canva/Google Slides
- giữ nguyên thứ tự Slides 1–6; không tự thêm, xóa hoặc đảo các slide này
- dùng Slides 7–8 là hai Appendix layouts đã có sẵn trong file chính thức
- nếu cần Slide 9 trở đi, duplicate một Appendix layout có sẵn thay vì tạo deck/layout mới
- giữ header và các thành phần bắt buộc của template
- thay placeholder bằng nội dung có contrast và kích thước chữ dễ đọc
- ưu tiên screenshot, diagram và bảng ngắn thay vì đoạn văn dài
- chỉ đưa claim có evidence hoặc ghi rõ đó là assumption/planned validation
- không ghi đè file template gốc

File PowerPoint chính thức hiện có **8 slides** theo tỷ lệ 16:9. Slides 1–6 là main submission bắt buộc; Slides 7–8 là Appendix placeholders. Quy định “không thêm slide” áp dụng cho phần main Slides 1–6; team được thêm supporting Appendix từ Slide 7 onward.

Cấu trúc Slides 1–6 hiện tại:

1. `Project Title` — team name, focus area và chọn một solution category phù hợp: `Attitudinal & Communication Solutions`, `Architectural & Industrial Solutions` hoặc `Technological Solutions`.
2. `Instruction (Must-read)` — slide hướng dẫn nằm trong template; không tự xóa nếu BTC chưa cho phép.
3. `Problem statement` — barrier, primary user, workplace context và evidence từ brief/end user.
4. `Solution overview` — golden path, value và cách solution giải quyết barrier.
5. `Prototype (1)` — phần đầu của working flow.
6. `Prototype (2)` — kết quả, accessible output hoặc phần hoàn tất nhiệm vụ.

Slides 1–6 phải giúp người xem hiểu được problem, solution và working prototype mà không cần đọc appendix. Không nhồi architecture, bảng benchmark hoặc business detail vào main slides nếu chúng làm yếu story và demo.

Deck và appendix phải đối chiếu trực tiếp với năm judging criteria đã được BTC công bố:

1. `Innovation & Impact` — barrier thật, existing gap, điểm khác biệt và expected/measured user outcome.
2. `User-Centered Design & Accessibility` — end-user evidence, design iteration và accessibility behavior đã kiểm tra.
3. `Feasibility & Practicality` — architecture, deployment, latency, cost, privacy, adoption và pilot path.
4. `Utilization of AI` — why AI, model/pipeline choice, evaluation, failure modes, safeguards và fallback.
5. `Presentation & Communication` — story, demo và Q&A; tiêu chí này được BTC ghi là Finale only.

Không tự tạo scoring weight hoặc scoring formula nếu BTC chưa công bố. Trước Finale, ưu tiên evidence cho bốn tiêu chí đầu; presentation tốt không thay thế problem, prototype hoặc AI evidence còn yếu.

### 19.2. Cấu trúc appendix mặc định

Sau khi nhận competition brief, điều chỉnh nội dung nhưng giữ thứ tự evidence hợp lý sau:

| Slide | Tiêu đề gợi ý | Nội dung bắt buộc |
|---|---|---|
| 7 | `Evidence Map` | Judging criterion → claim → evidence → nơi xuất hiện trong prototype |
| 8 | `User Insight to Design Decisions` | Evidence/feedback, assumption ban đầu và quyết định sản phẩm đã thay đổi |
| 9 | `End-to-End User Flow` | Golden path cùng uncertainty, retry, timeout và failure path quan trọng |
| 10 | `System Architecture and Data Boundaries` | Client → Express → PostgreSQL/FastAPI → Gemini; public/internal boundary, secret và dữ liệu được lưu |
| 11 | `AI Pipeline and Safeguards` | Input/preprocessing → prompt → model → structured JSON → validation → deterministic rules → accessible output |
| 12 | `AI Evaluation Methodology` | Dataset/cases, ground truth, expected facts, forbidden claims, metric và test conditions |
| 13 | `Evaluation Results and Failure Cases` | Kết quả đo được, sample size, representative failures, limitation và fallback |
| 14 | `Accessibility and Feasibility` | Screen-reader evidence, latency, reliability, cost, privacy, deployment và pilot assumptions |

Slides 7–8 đã tồn tại trong official template và được dùng cho hai appendix topics đầu tiên. Với Slides 9–14, duplicate Slide 7 hoặc Slide 8 để giữ đúng logo, header line, margins, fonts và visual system. Không xây appendix bằng một design system khác với official template.

Nếu còn evidence quan trọng và deck vẫn dễ đọc, có thể thêm:

- `Deployed Prototype and Reproducibility`: QR/link, model ID, prompt/schema version, commit/deployment version và ngày chạy eval.
- `Pilot Roadmap`: stakeholder, resources, adoption assumptions và bước từ prototype tới pilot.
- `Competitor or Existing-Workflow Comparison`: chỉ dùng khi có nguồn/evidence rõ; không tạo bảng so sánh chung chung.

Architecture diagram một mình không phải competitive evidence. Giá trị của appendix đến từ việc nối được:

```text
User barrier
→ product decision
→ implemented behavior
→ measured evidence
→ known limitation/safeguard
```

### 19.3. Evidence và metric rules

Mọi evidence phải được phân loại đúng:

- `Observed`: điều thực sự được quan sát hoặc nghe từ end user/mentor.
- `Measured`: kết quả từ test có method và sample size.
- `Assumption`: điều chưa được xác minh.
- `Planned`: việc sẽ thực hiện trong pilot hoặc roadmap.

Không biến assumption thành user evidence. Không dùng từ `accurate`, `safe`, `reliable`, `real-time` hoặc phần trăm chất lượng nếu chưa có cách đo phù hợp.

AI evaluation trong appendix ưu tiên 10–20 representative cases sát barrier hơn benchmark học thuật lớn. Tùy use case, báo các metric phù hợp như:

- task success rate
- schema validity
- critical-fact accuracy/recall
- critical omission rate
- hallucination/false-information rate
- correct-language rate
- uncertainty/unreadable-input behavior
- request success, retry và fallback rate
- end-to-end latency P50/P95
- estimated cost per request hoặc pilot

Mọi bảng kết quả phải ghi:

```text
Model/provider
Prompt/schema version
Sample size
Input conditions
Metric definition
Measured result
Known limitation
```

Latency phải là end-to-end latency từ thao tác gửi của user tới lúc UI render output. Nếu có thể, tách capture/compression, upload, Express, FastAPI/model và render. Không trình bày provider inference time như toàn bộ user latency.

Nếu so sánh model hoặc prompt:

- dùng cùng input set, expected output và metric
- chỉ so sánh model/prompt thật sự liên quan đến quyết định sản phẩm
- ưu tiên so sánh generic baseline với structured prompt + validation hoặc primary với fallback
- không chạy benchmark lớn chỉ để tạo số liệu cho slide

### 19.4. Accessibility evidence

Appendix phải cho thấy accessibility đã được kiểm tra trong working prototype, không chỉ liệt kê guideline. Tùy client, evidence có thể gồm:

- VoiceOver/screen-reader test và thiết bị/browser đã dùng
- accessible names và focus order
- loading, error và result announcements
- text scaling, contrast, touch target và không phụ thuộc vào màu
- TTS, stop/replay và mixed-language limitation
- camera guidance nếu có
- uncertainty wording và user confirmation
- failure case chứng minh hệ thống không đoán bừa khi input không đọc được

Không tuyên bố camera hoặc VLM hỗ trợ safe navigation nếu chưa có safety validation tương ứng.

### 19.5. Ownership

- Thành viên User Research/Pitch giữ source of truth cho problem evidence, user quote, assumptions, story và final deck.
- Bảo Anh cung cấp user flow, architecture, deployment, privacy boundary, application latency và accessibility evidence.
- Hồng Phúc cung cấp AI pipeline, model choice, eval methodology/results, AI latency/cost, limitations và failure cases.
- Mọi thành viên kiểm tra claim trong deck có khớp với prototype, code, eval và deployment thật hay không.

Deck owner chịu trách nhiệm hợp nhất nội dung; không để nhiều người chỉnh cùng một deck file mà chưa thống nhất ownership.

### 19.6. Solution video và submission package

Solution video phải:

- ngắn hơn 5 phút; `5:00` không được coi là hợp lệ
- dùng English
- giữ slide hiển thị rõ trong suốt video
- quay landscape 16:9
- xuất MP4 hoặc MOV
- có audio rõ và dễ hiểu
- có thể quay bằng Microsoft Teams hoặc Google Meet
- khuyến khích tất cả thành viên cùng đóng góp

Team quality gate cho accessibility của video:

- caption phải khớp với lời nói
- text và cursor phải đủ lớn để xem trong video
- không giải thích thông tin quan trọng chỉ bằng việc trỏ vào hình
- demo voice-over phải nói rõ loading, input, output và user outcome
- kiểm tra video từ đầu đến cuối trên một máy khác trước khi upload

Submission package gồm đúng:

```text
TEAM NAME_PROJECT TITLE.pptx
TEAM NAME_PROJECT TITLE.mp4 hoặc .mov
```

Deck và video dùng cùng base filename nhưng khác extension. Trước khi upload phải kiểm tra file mở được, đúng version và không chứa secret hoặc private user data. Submission phải là original work, không plagiarism hoặc dùng third-party IP khi chưa có quyền.

Unique submission link được gửi lúc 13:00 Day 2, chỉ dành cho team và không được chia sẻ. Link đóng đúng 07:00 Day 3. Upload sớm, tải lại hoặc mở trực tiếp file đã upload nếu hệ thống cho phép, và lưu local backup của final deck/video.

### 19.7. Time-box và deck gate

Nếu thiếu thời gian, ưu tiên appendix theo thứ tự:

1. User evidence và design changes.
2. Architecture và AI pipeline.
3. AI evaluation và failure cases.
4. Accessibility verification.
5. Latency, cost, limitations và deployed prototype.

Trước submission, kiểm tra:

- Slides 1–6 đúng thứ tự và Appendix bắt đầu từ Slide 7.
- Nội dung bằng English và tên file đúng quy định của BTC.
- Mỗi product/AI/accessibility claim có evidence hoặc được ghi rõ là assumption.
- Metric có định nghĩa, sample size và test condition.
- Diagram phản ánh đúng production flow và data boundary.
- Screenshot khớp với build đang dùng để demo.
- Không có token, secret, private payload hoặc raw sensitive data trên slide.
- QR/link hoạt động trên một thiết bị khác.
- Deck mở đúng font, hình ảnh và layout trên máy khác.
- Appendix nhất quán với demo video, live pitch và câu trả lời Q&A.

### 19.8. Diagram generation workflow

- Chỉ tạo diagram khi nó giúp giải thích architecture, request flow, AI pipeline, data boundary hoặc judging evidence rõ hơn text.
- Trước khi vẽ, agent phải đọc brief, code hiện tại, contracts và production configuration liên quan.
- PlantUML là lựa chọn mặc định cho system architecture, component/request flow và sequence diagram; không dùng PlantUML cho UI mockup, user journey hoặc evaluation chart.
- Diagram chỉ được chứa component và luồng thực sự tồn tại hoặc được đánh dấu rõ là `planned`.
- Giới hạn khoảng 6–8 node chính trên một slide; không đưa class, source file hoặc endpoint chi tiết nếu không cần cho claim.
- Label dùng English, ngắn, dễ hiểu với judges không chuyên sâu kỹ thuật.
- Không đưa secret, credential, private URL, private payload hoặc raw user data vào source/diagram.
- Lưu source tại `docs/diagrams/<diagram-name>.puml` và bản dùng cho deck tại `docs/diagrams/<diagram-name>.svg`.
- File `.puml` là source of truth; SVG phải được render lại sau mỗi thay đổi nội dung.
- Agent phải báo assumption và không tự phát minh service, database, safety mechanism hoặc fallback chưa được implement.
- Owner liên quan kiểm tra accuracy; deck owner kiểm tra text size, contrast, layout và tính nhất quán với official template.
- Chỉ đọc `docs/diagrams/README.md` khi task có liên quan đến tạo hoặc cập nhật diagram.

## 20. Coding-agent behavior

Coding agent phải:

- đọc brief, `AGENTS.md`, README, contracts và file liên quan trước khi sửa
- đọc `docs/PROJECT_STATUS.md` và `docs/HANDOFF.md` để tránh làm lại hoặc xung đột task đang hoạt động
- kiểm tra Git state và không ghi đè thay đổi không thuộc task
- nêu assumption khi brief hoặc contract chưa đủ rõ
- giữ thay đổi nhỏ, đúng scope và dễ review
- không tự mở rộng solution hoặc thêm dependency không cần thiết
- không đổi shared contract mà thiếu cập nhật consumer và tests
- không đọc, in hoặc commit secret
- không thực hiện commit, push, deploy hoặc external action nếu chưa được yêu cầu
- chạy verification tương xứng với rủi ro thay đổi
- báo trung thực test chưa chạy, limitation và blocker
- cập nhật project status/handoff khi thay đổi làm ảnh hưởng người hoặc branch khác
- ưu tiên golden path, accessibility và reliability hơn độ phức tạp kỹ thuật
