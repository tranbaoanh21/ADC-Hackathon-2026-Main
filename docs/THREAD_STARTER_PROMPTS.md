# Thread Starter Prompts

Các prompt dưới đây giúp agent mới đọc đúng repository. Chat history không được clone hoặc đồng bộ qua Git.

## Bảo Anh — application implementation thread

```text
Bạn là Application Owner của PathMemory trong repository chính Hackathon Conquerors.

Trước khi sửa file, hãy kiểm tra Git state và đọc đầy đủ theo thứ tự: AGENTS.md, docs/START_HERE.md, docs/PROJECT_STATUS.md, docs/COMPETITION_BRIEF.md, docs/SOLUTION_SCOPE.md, docs/HANDOFF.md, docs/TECHNICAL_FLOW.md, contracts/product-api.openapi.yaml, contracts/ai-service.openapi.yaml và contract examples.

Phạm vi sở hữu: Expo mobile, React web review console, Express Product API v3 trên prototype namespace `/api/v2`, PostgreSQL/Prisma, directed landmark graph, deterministic BFS/session state machine, mock/live FastAPI adapter, accessibility và application deployment.

Hãy bắt đầu bằng vertical slice nhỏ nhất:
1. runtime validators và deterministic mock theo Product API v3 / AI-service v1.1;
2. một demo graph bốn landmark có một nhánh và explicit reverse edges; không hard-code giới hạn landmark trong schema/database/UI;
3. AI_DRAFT → BUDDY_VERIFIED → PUBLISHED;
4. screen-reader origin/destination selection, reachable destinations, BFS plannedPath và start-landmark confirmation;
5. STOP_AND_RESCAN cho input không đủ bằng chứng.

Không tự sửa nghĩa của AI-service fields, không implement model pipeline, không thêm QR, coordinates, SLAM, obstacle detection, RAG, unknown-location rerouting hoặc multiple-workplace scope. Nếu AI contract cần đổi, ghi rõ additive/breaking impact và phối hợp với Hồng Phúc trước.
```

## Hồng Phúc — lần đầu clone và mở agent

```text
Bạn là FastAPI/AI Owner của PathMemory. FastAPI implementation nằm trong repository do Hồng Phúc sở hữu; repository chính Hackathon Conquerors giữ canonical shared contract.

Hãy pull branch/commit handoff mới nhất, kiểm tra git status và đọc đầy đủ AGENTS.md, docs/START_HERE.md, docs/PROJECT_STATUS.md, docs/COMPETITION_BRIEF.md, docs/SOLUTION_SCOPE.md, docs/HANDOFF.md, docs/TECHNICAL_FLOW.md, contracts/ai-service.openapi.yaml, contracts/examples/ai-*.json và evals/ trước khi sửa file.

Hãy tóm tắt:
1. problem và golden path đã được team chốt;
2. AI input/output contract;
3. phần Hồng Phúc sở hữu và phần Bảo Anh sở hữu;
4. model/provider candidates, acceptance cases, latency/cost metrics và known safety risks;
5. contract hoặc thông tin còn thiếu đang chặn implementation.

Phạm vi sở hữu: FastAPI app/route, internal auth, health endpoint, image preprocessing, provider adapter, prompt, Pydantic structured output, provider tests/eval và AI-service deployment. Implement đúng POST /internal/v1/perception; không truy cập application PostgreSQL và không trả navigation/safety action. Không tự đổi product contract hoặc internal schema; nếu cần thay đổi, mô tả additive/breaking impact và chờ thống nhất. Không đọc hoặc in secret.
```

## Thread mới khi implementation đã bắt đầu

```text
Đọc AGENTS.md, docs/START_HERE.md, docs/PROJECT_STATUS.md, docs/HANDOFF.md và mọi contract/README liên quan tới task này. Sau đó kiểm tra git status, branch và diff hiện có.

Hãy báo lại current phase, active work có thể xung đột, contract hiện tại, acceptance criteria và phạm vi file dự kiến sửa. Nếu context đủ rõ thì thực hiện task: [mô tả task]. Giữ thay đổi nhỏ, chạy validation phù hợp và cập nhật handoff/status nếu thay đổi ảnh hưởng teammate.
```

## Thread chỉ để audit hoặc hỏi kiến trúc

```text
Đọc AGENTS.md, docs/START_HERE.md, docs/PROJECT_STATUS.md, docs/COMPETITION_BRIEF.md, docs/SOLUTION_SCOPE.md và contracts hiện tại. Chỉ audit và giải thích bằng evidence từ repository; chưa sửa code, commit, push hoặc deploy. Phân biệt rõ implemented, planned và assumption.
```

## Không đưa vào prompt

- Gemini/API token
- `.env` contents
- Railway database URL
- unique submission link
- raw private user data
- claim hoặc metric chưa đo nhưng được viết như kết quả thật
