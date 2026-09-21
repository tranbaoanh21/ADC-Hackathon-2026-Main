# Contract examples

JSON request metadata, success response và stable error examples đã được team thống nhất nằm trong thư mục này.

`POST /observations` và `POST /internal/v1/perception` use multipart image bytes, nên `ai-perception-request-metadata.json` chỉ minh họa các metadata parts và không phải full JSON request body để validate; không commit raw frame hoặc base64 demo image vào contract examples.

Example payload phải hợp lệ với OpenAPI/runtime schema và không chứa secret hoặc dữ liệu người dùng thật. Express mock và FastAPI live response phải cùng validate bằng `ai-perception-success.json`.

Product API v2 graph/navigation examples:

- `product-route-published.json`: four published landmarks with branching and reverse directed edges.
- `product-route-edges-request.json`: admin replacement payload for human-reviewed relative directions.
- `product-reachable-destinations.json`: screen-reader-friendly destinations reachable from the selected origin.
- `product-navigation-session-request.json`: origin/destination selection for deterministic path planning.
- `product-navigation-session-success.json`: planned path awaiting camera confirmation of the selected start landmark.
- `product-navigation-start-confirmed.json`: origin match advances to the first travel edge and returns its reviewed cue.
- `product-navigation-start-not-confirmed.json`: wrong origin evidence keeps the session waiting and returns no movement cue.
