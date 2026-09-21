# Team Handoff

Current state: no active implementation handoff. The Visual Impairment competition brief has been received and classified, but solution discussion and stage selection are intentionally on hold.

This file records only the latest information another person or agent needs to continue work. Permanent decisions belong in the brief, scope, contracts or code documentation.

## Current integration boundary

- Product contract: not created
- AI-service contract: not created
- Mock response: not created
- Live provider: not integrated
- Database schema: not created
- Deployment: not started

## Latest context handoff

```text
Date/time: 2026-09-21
From: Bảo Anh / context-analysis thread
To: Hackathon Conquerors team and future agent threads
Branch/commit: docs/brief-source-gate / uncommitted
Task objective: Import and classify the main Visual Impairment competition brief without selecting a solution.

Completed:
- Recorded source provenance and the lived-experience plus HR/industry perspectives.
- Classified barriers across all six career stages.
- Separated official/qualitative evidence from measured evidence, assumptions and claims requiring validation.
- Recorded cross-stage themes and Day 2 clarification questions.

Files changed:
- docs/COMPETITION_BRIEF.md
- docs/UNIVERSAL_DESIGN.md
- docs/README.md
- docs/START_HERE.md
- docs/PROJECT_STATUS.md
- docs/SOLUTION_SCOPE.md
- docs/HANDOFF.md

Contract impact:
- None
- Consumer action required: do not create contracts or implementation tasks until the team confirms a solution scope.

Validation run:
- Documentation diff and whitespace checks only.

Not validated:
- No end-user statements beyond the supplied brief have been collected.
- No product, AI, accessibility or feasibility hypothesis has been tested.

Known limitations or failure cases:
- Several platform, AI-bias, cost, security and employment-outcome statements are brief-reported claims rather than team measurements.

Next exact action:
- Review and confirm the competition-context summary before beginning solution-stage discussion.
```

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
