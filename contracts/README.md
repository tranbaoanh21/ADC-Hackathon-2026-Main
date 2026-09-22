# PathMemory Contracts

Canonical interfaces between clients, Express and FastAPI.

## Versions

- `product-api.openapi.yaml` — Product API `3.1.0`, served by Express under `/api/v2`.
- `ai-service.openapi.yaml` — internal perception API `1.1.0`, implemented by FastAPI.

Product API 3.1 keeps structured directed graph behavior and adds `GET /api/v2/routes` so the web console can select a workplace by recognisable name instead of entering an internal ID. Express owns graph, BFS, persistence, navigation state and generated EN/VI narration.

AI-service 1.1 is perception-only. FastAPI receives one to three ephemeral frames and returns structured landmark evidence. It does not receive or compute graph paths, maneuvers, session transitions or product actions.

## Ownership

- Bảo Anh owns Product API behavior and the Express consumer of AI-service v1.1.
- Hồng Phúc owns the FastAPI producer of AI-service v1.1.
- Both approve semantic or breaking changes to the AI contract.

## Examples

Product examples include:

- workplace list and published graph;
- observation success and Product API errors;
- structured edge request;
- reachable destinations;
- navigation session request/success;
- confirmed and unconfirmed start observations.

AI examples include:

- `ai-perception-request-metadata.json`;
- `ai-perception-success.json`;
- `ai-validation-error.json`;
- `ai-provider-error.json`.

Examples are fixtures and documentation, not a second schema. OpenAPI plus runtime validators remain authoritative.

## Change rules

Every contract change updates in the same change set:

1. OpenAPI;
2. relevant example JSON;
3. Zod/Pydantic/runtime validation;
4. producer tests;
5. consumer tests;
6. `docs/HANDOFF.md` when another owner must act.

An optional field addition is additive but still requires examples and tests. Removing/renaming a field, changing meaning, or making an optional field required is breaking.

Mock and live providers must use the same response shape. Never expose raw provider output as Product API or AI-service contract.

## FastAPI teammate checkpoint

Before editing the producer, read:

```text
AGENTS.md
services/ai/README.md
contracts/ai-service.openapi.yaml
contracts/examples/ai-*.json
```

Do not change Product API or move graph/navigation responsibilities into FastAPI to resolve a provider implementation issue.
