# Thread Starter Prompts

Các prompt dưới đây giúp agent mới đọc đúng repository. Chat history không được clone hoặc đồng bộ qua Git.

## Bảo Anh — thread đầu tiên sau khi nhận brief

```text
Bạn đang làm việc trong repository chính của Hackathon Conquerors cho ADC Hackathon 2026.

Trước khi hành động, hãy đọc đầy đủ AGENTS.md, docs/START_HERE.md, docs/PROJECT_STATUS.md, docs/COMPETITION_BRIEF.md, docs/SOLUTION_SCOPE.md, docs/HANDOFF.md và các official submission materials liên quan.

Đây là competition brief chính thức: [dán brief hoặc chỉ ra file vừa thêm].

Trước tiên hãy:
1. phân biệt official facts, evidence, assumptions và open questions;
2. đề xuất primary user, workplace context và một barrier cụ thể;
3. đề xuất một golden path hẹp, non-goals và measurable success metrics;
4. đánh giá web, mobile hoặc cả hai dựa trên golden path;
5. xác định AI làm gì, code deterministic làm gì và failure safeguard;
6. cập nhật COMPETITION_BRIEF.md, SOLUTION_SCOPE.md và PROJECT_STATUS.md.

Chưa scaffold hoặc code sản phẩm cho tới khi tôi xác nhận scope. Không mang solution AccessLens practice sang nếu brief không hỗ trợ.
```

## Hồng Phúc — lần đầu clone và mở agent

```text
Bạn là AI/Model Owner trong repository Hackathon Conquerors.

Hãy kiểm tra git status và đọc đầy đủ AGENTS.md, docs/START_HERE.md, docs/PROJECT_STATUS.md, docs/COMPETITION_BRIEF.md, docs/SOLUTION_SCOPE.md, docs/HANDOFF.md, contracts/ và evals/ trước khi sửa file.

Hãy tóm tắt:
1. problem và golden path đã được team chốt;
2. AI input/output contract;
3. phần Hồng Phúc sở hữu và phần Bảo Anh sở hữu;
4. model/provider default, acceptance cases, latency/cost metrics và known safety risks;
5. contract hoặc thông tin còn thiếu đang chặn implementation.

Chỉ làm trong phạm vi AI provider, prompt, preprocessing/postprocessing, structured output, provider tests và eval. Không tự đổi product contract hoặc public API; nếu cần thay đổi, hãy mô tả breaking impact và chờ thống nhất. Không đọc hoặc in secret.
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
