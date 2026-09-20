# Team Handoff

Current state: no active implementation handoff. The repository is waiting for the competition brief.

This file records only the latest information another person or agent needs to continue work. Permanent decisions belong in the brief, scope, contracts or code documentation.

## Current integration boundary

- Product contract: not created
- AI-service contract: not created
- Mock response: not created
- Live provider: not integrated
- Database schema: not created
- Deployment: not started

## Handoff template

Replace or append a concise entry when handing work to another owner:

```text
Date/time:
From:
To:
Branch/commit:
Task objective:

Completed:
- ...

Files changed:
- ...

Contract impact:
- None / compatible / breaking
- Consumer action required: ...

Validation run:
- command: result

Not validated:
- ...

Known limitations or failure cases:
- ...

Next exact action:
- ...
```

## Handoff rules

- Reference a branch or commit; do not say only “code mới nhất”.
- State contract impact explicitly.
- Do not report a live-model test as passed without model ID, test input class and result.
- Do not paste token, `.env`, database URL or private payload.
- If a task is merged, update `docs/PROJECT_STATUS.md` in the same PR or immediately after merge.
- If the next person must make a product decision, list the options and evidence; do not silently choose on their behalf.
