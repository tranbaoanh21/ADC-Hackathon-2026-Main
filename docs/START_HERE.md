# Start Here

File này là điểm bắt đầu cho thành viên mới, máy mới hoặc coding-agent thread mới.

## Repository purpose

Đây là source chính của team **Hackathon Conquerors** cho RMIT Accessibility Design Competition 2026, focus area **Visual Impairment — Blind or Low Vision**.

Repository là shared context. Chat history giữa Bảo Anh, Hồng Phúc và các agent không tự đồng bộ với nhau.

## Read order

Đọc đủ theo thứ tự trước khi sửa code:

1. `AGENTS.md` — rules, ownership, architecture boundaries và quality gates.
2. `docs/PROJECT_STATUS.md` — dự án đang ở phase nào và task nào đang hoạt động.
3. `docs/COMPETITION_BRIEF.md` — official facts và end-user evidence.
4. `docs/SOLUTION_SCOPE.md` — product decisions, golden path, MVP và non-goals.
5. `docs/HANDOFF.md` — thay đổi mới nhất, contract impact và việc tiếp theo.
6. `contracts/` — interface đã thống nhất.
7. README và tests trong phần code sẽ sửa.

Chỉ đọc `docs/diagrams/README.md` khi task liên quan đến architecture/request-flow diagram.

## New clone boot sequence

```bash
git clone https://github.com/tranbaoanh21/ADC-Hackathon-2026-Main.git
cd ADC-Hackathon-2026-Main
git status
git branch --show-current
git pull --ff-only origin main
```

Sau khi đọc context và xác nhận scope, tạo branch riêng:

```bash
git switch -c feat/<scope-ngan-gon>
```

Không tạo branch implementation nếu `docs/SOLUTION_SCOPE.md` vẫn là `UNDECIDED`, trừ branch chỉ dùng để cập nhật brief, research hoặc contracts.

## New thread boot sequence

Agent phải:

1. Kiểm tra `git status --short --branch`.
2. Đọc các file trong read order.
3. Phân biệt `Official`, `Observed`, `Measured`, `Assumption` và `Decision`.
4. Tóm tắt current phase, locked decisions, open questions và phạm vi được giao.
5. Chỉ bắt đầu sửa khi task không xung đột với active work hoặc shared contract.

Nếu brief chưa có, agent chỉ được cải thiện readiness/documentation. Không được tự chọn product problem hoặc xây feature dựa trên practice project cũ.

## Before implementation gate

Không bắt đầu implementation chính cho tới khi có tối thiểu:

- competition brief đã được nhập;
- primary user và workplace context;
- một barrier cụ thể;
- một golden path;
- non-goals;
- success metrics dạng hypothesis;
- primary client decision;
- success request/response/error examples;
- owner cho application và AI tracks.

## Source-of-truth rule

Khi chat và repository khác nhau, repository được ưu tiên trừ khi người dùng cung cấp thông báo mới hơn từ BTC. Nếu có thông tin mới, cập nhật file source of truth trước hoặc trong cùng thay đổi với implementation.
