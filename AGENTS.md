# AGENTS.md — PathMemory team rules

Đây là source of truth ngắn gọn cho người và coding agent làm việc trong repository của **Hackathon Conquerors**. Competition brief hoặc thông báo mới nhất của BTC luôn có ưu tiên cao hơn file này.

## 1. Bắt đầu từ đâu

Trước khi sửa code:

1. Đọc toàn bộ `AGENTS.md`.
2. Đọc contract và README thuộc đúng phạm vi task.
3. Chỉ khi cần hiểu bài toán, đọc `docs/COMPETITION_BRIEF.md` và `docs/SOLUTION_SCOPE.md`.
4. Đọc `docs/HANDOFF.md` để biết trạng thái, việc còn lại và ranh giới giữa hai owner.
5. Chạy `git status --short --branch`; không ghi đè thay đổi chưa commit của người khác.

Read order riêng cho Hồng Phúc hoặc agent làm FastAPI/model:

```text
AGENTS.md
→ services/ai/README.md
→ contracts/ai-service.openapi.yaml
→ contracts/examples/ai-*.json
→ services/ai/app/ và services/ai/tests/
→ evals/README.md
```

Prompt có thể dùng nguyên văn trong thread FastAPI mới:

```text
Đọc đầy đủ AGENTS.md, services/ai/README.md,
contracts/ai-service.openapi.yaml và contracts/examples/ai-*.json.
Kiểm tra git status và branch hiện tại trước khi sửa.

Chỉ làm tầng FastAPI/model trong services/ai và evals. Giữ đúng AI-service
v1.1: perception-only, không truy cập PostgreSQL, không chạy graph/BFS, không
sinh hướng đi hoặc quyết định navigation. Mock và Gemini phải trả cùng schema.
Không sửa mobile, web, Express, Prisma hoặc Product API nếu chưa thống nhất với
Bảo Anh. Sau thay đổi, chạy Ruff, pytest và báo rõ contract impact, model ID,
test/eval đã chạy, latency, limitations và file đã sửa.
```

## 2. Product đã chốt

- Tên: **PathMemory**.
- Competition scope: **Stage 4 — workplace onboarding**.
- Primary user: nhân viên mới khiếm thị hoặc thị lực kém.
- Primary client: Expo mobile dùng screen reader, audio và camera treo trước ngực.
- Secondary client: React web dành cho đồng nghiệp hoặc Human Resources review.
- Spatial model: graph indoor tương đối; không lưu tọa độ chính xác.
- Một graph có thể chứa nhiều điểm mốc; không hard-code giới hạn ba hoặc bốn.

### Ngày đầu — khám phá và tạo graph nháp

```text
Nhân viên đi cùng đồng nghiệp/HR
→ mobile tự chụp tuần tự các khung hình có kiểm soát
→ mobile chỉ gửi request mới khi request trước đã hoàn tất
→ Express gửi 1–3 khung hình tạm thời sang FastAPI
→ FastAPI/Gemini trả structured landmark perception
→ Express validate, deduplicate và lưu AI_DRAFT vào PostgreSQL
→ đồng nghiệp/HR mở workplace trên web
→ duyệt tên và bằng chứng ổn định của điểm mốc
→ tạo từng cạnh có hướng bằng from + to + maneuver
→ publish graph
```

Mobile không yêu cầu người dùng khiếm thị tìm và bấm nút cho từng khung hình. Có một hành động rõ ràng **Kết thúc khám phá / Finish exploring**. Dừng đi hoặc đứng yên không tự động kết thúc hành trình.

Các maneuver hợp lệ:

```text
GO_STRAIGHT
TURN_LEFT
TURN_RIGHT
TAKE_ELEVATOR
ENTER_DOOR
OTHER
```

`A → B` và `B → A` là hai cạnh khác nhau. Đồng nghiệp/HR duyệt structured maneuver, không viết câu đọc. Express sinh narration EN/VI deterministic từ điểm đầu, maneuver và điểm đến.

### Ngày thứ hai trở đi — replay deterministic

```text
Người dùng mở graph đã publish bằng screen reader
→ chọn điểm xuất phát
→ Express chỉ liệt kê điểm đến reachable
→ chọn điểm đến
→ Express chạy unweighted BFS để lấy FEWEST_EDGES path
→ camera phải xác nhận đúng điểm xuất phát
→ Express trả câu chỉ dẫn cho cạnh đầu tiên
→ mỗi observation sau chỉ được so với điểm mốc tiếp theo trong planned path
→ match hợp lệ mới advance; mơ hồ/xung đột trả STOP_AND_RESCAN
→ đến điểm cuối thì complete
```

BFS là fewest-edge path, không phải đường ngắn nhất theo mét, dễ nhất hoặc an toàn nhất. Nếu hai path có cùng số cạnh, tie-break bằng edge `displayOrder`, sau đó edge ID.

Tạm hoãn canonical facing direction/orientation cue. Trong MVP, left/right/straight là metadata do người review chọn cho cạnh; camera/model không tự suy ra góc rẽ.

## 3. Kiến trúc và ownership

```text
Expo mobile / React web
          ↓ public Product API
Express application backend
    ├── PostgreSQL / Prisma
    ↓ internal AI-service API
FastAPI
    ↓
Gemini
```

- Client chỉ gọi Express; không gọi FastAPI hoặc Gemini trực tiếp.
- Express là public API duy nhất và sở hữu business state.
- FastAPI là internal perception service, không phải application backend thứ hai.
- Raw provider output luôn là untrusted input và phải qua schema validation.

| Phạm vi | Owner |
|---|---|
| Expo mobile, React web, accessibility UI | Bảo Anh |
| Express, Product API, timeout/error mapping | Bảo Anh |
| PostgreSQL, Prisma, graph, BFS, navigation FSM, EN/VI narration | Bảo Anh |
| Express → FastAPI adapter và application deployment | Bảo Anh |
| FastAPI shell, provider adapter, prompt, preprocessing, Pydantic | Hồng Phúc |
| Gemini selection/config, model tests, AI eval, latency/cost analysis | Hồng Phúc |
| `contracts/ai-service.openapi.yaml` semantics và breaking change | Cả hai cùng duyệt |

## 4. Ranh giới AI bắt buộc

FastAPI/Gemini được làm:

- kiểm tra chất lượng khung hình;
- đọc visible text/signage;
- diễn giải scene;
- trả structured landmark candidate, stable features và uncertainty;
- từ chối/mô tả thận trọng khi ảnh tối, mờ, che khuất hoặc xung đột.

FastAPI/Gemini không được làm:

- truy cập PostgreSQL hoặc lưu graph;
- tự tạo edge/connectivity từ tập node;
- chạy BFS/DFS/Dijkstra hoặc chọn route;
- quyết định trái/phải/thẳng;
- viết navigation narration;
- quyết định advance, completion hoặc `STOP_AND_RESCAN`;
- tuyên bố đường đi an toàn, phát hiện vật cản hoặc thay thế gậy/chó dẫn đường.

Express/deterministic code sở hữu IDs, validation, deduplication, persistence, review/publish state, graph validation, reachability, BFS, expected-landmark matching, navigation transition và narration.

## 5. Contracts

- Product API: `contracts/product-api.openapi.yaml` v3.1.0, prototype namespace `/api/v2`.
- AI service: `contracts/ai-service.openapi.yaml` v1.1.0.
- Example payloads: `contracts/examples/`.
- Mock và live provider phải dùng cùng response shape.
- Không biến raw Gemini response thành product contract.

Khi đổi contract phải cập nhật cùng lúc:

1. OpenAPI;
2. example JSON;
3. runtime validator/Pydantic/Zod;
4. producer và consumer tests;
5. `docs/HANDOFF.md` nếu teammate cần hành động.

Trước breaking change của AI contract, ghi rõ field/endpoint, lý do, impact phía Express và FastAPI, rồi chờ cả hai owner thống nhất. Product graph/BFS/narration không được đẩy sang FastAPI chỉ vì Product API thay đổi.

## 6. Accessibility, privacy và safety

- Mọi control có accessible name; focus order và heading hierarchy hợp lý.
- Loading, success, timeout và error phải được screen reader announce.
- Không dùng màu làm tín hiệu duy nhất; hỗ trợ text scaling, contrast và touch target phù hợp.
- App TTS không nói chồng VoiceOver/TalkBack.
- Bản tiếng Việt phải dùng từ thuần Việt trong câu đọc cho người dùng, ví dụ `điểm mốc`, `khung hình`, `máy ảnh`; tránh câu lai Anh–Việt.
- Không lưu raw image/video mặc định. Chỉ structured observation, graph và metadata cần thiết được persist.
- Không log token, frame bytes, raw provider payload hoặc private workplace data.
- `GEMINI_API_KEY`, `DATABASE_URL` và internal token chỉ ở server-side environment; không đặt trong `VITE_` hoặc `EXPO_PUBLIC_`.
- Mơ hồ, unreadable, provider error hoặc mismatch không được advance navigation.
- Không claim obstacle detection, safe route hoặc general-purpose indoor navigation.

## 7. Non-goals MVP

- GPS, tọa độ indoor chính xác, metric distance hoặc heading degrees.
- Compass/gyroscope/sensor fusion để tự tạo maneuver.
- QR/AprilTag, SLAM, ARKit/ARCore, BLE hoặc UWB.
- Obstacle/hazard detection hoặc dynamic rerouting từ vị trí không xác định.
- RAG/vector database, fine-tuning hoặc self-hosted GPU.
- Full HR platform, phức tạp authentication hoặc raw-media archive.

## 8. Git workflow

Không code trực tiếp trên `main` trừ hotfix đã thống nhất. Không pull mù khi worktree đang bẩn.

Task mới:

```bash
git status
git switch main
git pull --ff-only origin main
git switch -c feat/<scope-ngan-gon>
```

Feature branch cá nhân:

```bash
git status
git fetch origin
git rebase origin/main
```

Chỉ rebase branch cá nhân. Không force-push `main`, không dùng destructive reset để bỏ thay đổi của người khác và không commit `.env`, token hoặc private media.

Shared contract/schema chỉ có một người sửa tại một thời điểm. Handoff phải ghi branch, commit, contract impact, tests, limitations và next action; không nói chung chung “code mới nhất”.

## 9. Quality gate

Đọc script thực tế trước khi chạy. Gate tối thiểu theo phạm vi:

### Application

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Nếu đổi Prisma, chạy migration validation và database integration tests phù hợp.

### FastAPI/model

Từ `services/ai/` với virtual environment đã cài:

```bash
python -m ruff check .
python -m ruff format --check .
python -m pytest
```

Live-model eval tiêu thụ quota: chỉ chạy trên dữ liệu được phép dùng, ghi model ID, prompt/schema version, case count, schema validity, semantic failures, latency và estimated cost. Mock chỉ là integration evidence, không phải AI-quality evidence.

Một feature chỉ hoàn thành khi contract/examples/validators/tests đồng bộ, error path rõ, accessibility liên quan được kiểm tra, không lộ secret và không tạo claim vượt quá evidence.

## 10. Tài liệu còn lại

| File | Mục đích |
|---|---|
| `README.md` | Quickstart toàn repository |
| `docs/COMPETITION_BRIEF.md` | Official facts và end-user evidence; không trộn solution claim |
| `docs/SOLUTION_SCOPE.md` | Golden path, assumptions, non-goals và metrics |
| `docs/HANDOFF.md` | Trạng thái hiện tại và next action giữa hai owner |
| `docs/ACCESSIBILITY_QA.md` | Evidence/checklist accessibility, privacy, safety |
| `contracts/README.md` | Contract index và change rules |
| `services/ai/README.md` | FastAPI setup, boundary và verification |
| `evals/README.md` | AI eval workflow |

Official source pack nằm trong `ADC-main-submission-template/`; không sửa hoặc ghi đè file gốc. Deck phải dùng working copy của official PowerPoint template và chỉ đưa claim có evidence.
