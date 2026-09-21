# Contract examples

JSON request metadata, success response và stable error examples đã được team thống nhất nằm trong thư mục này.

`POST /observations` và `POST /internal/v1/perception` use multipart image bytes, nên `ai-perception-request-metadata.json` chỉ minh họa các metadata parts và không phải full JSON request body để validate; không commit raw frame hoặc base64 demo image vào contract examples.

Example payload phải hợp lệ với OpenAPI/runtime schema và không chứa secret hoặc dữ liệu người dùng thật. Express mock và FastAPI live response phải cùng validate bằng `ai-perception-success.json`.
