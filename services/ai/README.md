# AI service

FastAPI service nội bộ dành cho Python-specific preprocessing, prompt/provider adapter, structured model output và AI-specific tests.

Chỉ giữ service này nếu solution thực sự cần AI boundary riêng. Client không gọi FastAPI hoặc Gemini trực tiếp.

Runtime interface phải ổn định và có thể test; notebook chỉ dùng cho exploration.

