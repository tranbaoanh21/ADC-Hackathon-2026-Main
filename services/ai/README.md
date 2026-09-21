# AI service integration boundary

FastAPI runtime do **Hồng Phúc** sở hữu và triển khai trong AI repository của Hồng Phúc. Ghi URL/path repository đó vào `docs/HANDOFF.md` khi được cung cấp; không tự đoán hoặc tạo remote mới.

Repository chính này giữ source of truth cho interface dùng chung:

- `contracts/ai-service.openapi.yaml`
- `contracts/examples/ai-*.json`

FastAPI chịu trách nhiệm preprocessing, OCR/VLM provider adapter, structured model output, Pydantic validation, AI-specific tests/eval, health endpoint và deployment. Client không gọi FastAPI hoặc Gemini trực tiếp; chỉ Express gọi internal API.

FastAPI không truy cập application PostgreSQL, không quản lý route/session và không quyết định navigation action. Runtime phải ổn định, deploy được và tuân thủ contract; notebook chỉ dùng cho exploration.
