# Contracts

Source of truth cho ranh giới giữa client, Express và FastAPI.

Current contract versions:

- Product API `1.1.0`: scalable landmark list plus directed `RouteEdge` relations.
- AI service `1.1.0`: perception only, with extensible workplace landmark categories; independent of total route landmark count.

Files:

```text
contracts/
├── product-api.openapi.yaml
├── ai-service.openapi.yaml
└── examples/
    ├── product-observation-success.json
    ├── product-validation-error.json
    ├── product-provider-timeout.json
    ├── product-route-published.json
    ├── product-route-edges-request.json
    ├── ai-perception-request-metadata.json
    ├── ai-perception-success.json
    ├── ai-validation-error.json
    └── ai-provider-error.json
```

Mỗi field phải có meaning và owner rõ ràng. Mock và live provider phải dùng cùng response shape. Raw provider response không được trở thành product contract.

Ownership:

- Bảo Anh owns `product-api.openapi.yaml` behavior and consumes `ai-service.openapi.yaml` from Express.
- Hồng Phúc implements the FastAPI producer for `ai-service.openapi.yaml`.
- Both owners approve semantic or breaking changes to the internal contract.

Versioning:

- Adding an optional field is additive but still requires an updated example and validator test.
- Removing/renaming a field, making an optional field required or changing its meaning is breaking.
- Never let provider-specific raw output leak into either contract.
