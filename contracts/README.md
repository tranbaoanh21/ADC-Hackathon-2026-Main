# Contracts

Source of truth cho ranh giới giữa client, Express và FastAPI.

Sau khi scope được chốt, tạo tối thiểu:

```text
contracts/
├── product-api.openapi.yaml
├── ai-service.openapi.yaml
└── examples/
    ├── success-request.json
    ├── success-response.json
    ├── validation-error.json
    └── provider-error.json
```

Mỗi field phải có meaning và owner rõ ràng. Mock và live provider phải dùng cùng response shape. Raw provider response không được trở thành product contract.

