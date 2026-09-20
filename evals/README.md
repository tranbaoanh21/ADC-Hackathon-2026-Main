# Evaluation

Eval phải kiểm tra claim về AI và user outcome, không chỉ kiểm tra HTTP 200.

Sau khi solution được chốt:

1. Tạo 10–20 representative cases trong `evals/cases/`.
2. Ghi expected facts, forbidden claims và failure behavior.
3. Dùng cùng prompt/schema/model settings cho các lần so sánh.
4. Ghi model ID, prompt/schema version, sample size và test conditions.
5. Báo cả failure cases và limitations.

Metric tùy use case có thể gồm schema validity, task success, critical-fact recall, critical omissions, hallucination rate, correct-language rate, uncertainty handling, end-to-end latency, request success rate và estimated cost.

Không commit private user data hoặc ảnh chưa có quyền sử dụng.

