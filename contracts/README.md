# Contracts

Source of truth cho ranh giới giữa client, Express và FastAPI.

Current contract versions:

- Product API `2.0.0`: published landmark graph, reachable destinations, deterministic navigation planning and directed `RouteEdge` relations.
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
    ├── product-reachable-destinations.json
    ├── product-navigation-session-request.json
    ├── product-navigation-session-success.json
    ├── product-navigation-start-confirmed.json
    ├── product-navigation-start-not-confirmed.json
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

Product API `2.0.0` is a breaking change from the fixed linear-route v1 contract:

- a route resource now represents one bounded workplace landmark graph;
- origin and destination are selected per `NAVIGATE` session;
- Express computes a deterministic unweighted path over published directed edges;
- `displayOrder` is only for stable admin/screen-reader list ordering;
- FastAPI remains on AI-service `1.1.0` and does not receive or compute navigation paths.
