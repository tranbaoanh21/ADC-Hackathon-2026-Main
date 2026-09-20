# Project Status

Last updated: 2026-09-20

Current phase: `PRE_BRIEF_READY`

## Confirmed facts

- Team: Hackathon Conquerors
- Focus area: Visual Impairment — Blind or Low Vision
- Competition brief release: Day 1, 21 September 2026, 09:00–10:00
- Final submission deadline: Day 3, 23 September 2026, 07:00
- Main repository: `ADC-Hackathon-2026-Main`
- Official template and submission guides are stored in `ADC-main-submission-template/`

## Working defaults, not brief-specific decisions

- React/Vite for web if web is the primary client.
- Expo/React Native if camera or mobile context is essential.
- Express owns public product API, validation, business logic and PostgreSQL.
- FastAPI is an internal AI service only when a separate Python boundary is useful.
- Google Gemini API is the default hosted model provider unless brief-specific evaluation supports another choice.
- Web deployment: Vercel.
- Express, FastAPI and PostgreSQL deployment: Railway.
- Authentication is omitted unless identity or authorization is necessary for the golden path.

These are defaults. Update `docs/SOLUTION_SCOPE.md` when the brief confirms or rejects them.

## Not decided yet

- Product name and exact problem
- Primary user and workplace moment
- Golden path
- Web, mobile or both
- AI task and structured output
- Database persistence requirement
- API contracts
- Eval dataset and metric targets
- Final architecture and PlantUML diagrams

## Current active work

| Owner | Branch | Task | Status | Contract impact | Blocker |
|---|---|---|---|---|---|
| None | `main` | Waiting for competition brief | Waiting | None | Brief not released |

Update this table when work starts, changes owner or merges. Remove completed rows after recording the result in the relevant source-of-truth file or handoff entry.

## Next gate

After the brief is received:

1. Update `docs/COMPETITION_BRIEF.md`.
2. Resolve clarification questions without inventing facts.
3. Complete and confirm `docs/SOLUTION_SCOPE.md`.
4. Create product and AI contract examples.
5. Assign software and AI branches.
6. Scaffold only the services required by the chosen golden path.

## Runtime and deployment status

| Component | Local | Production | URL/identifier |
|---|---|---|---|
| Web | Not scaffolded | Not deployed | TBD |
| Mobile | Not scaffolded | Not built | TBD |
| Express API | Not scaffolded | Not deployed | TBD |
| PostgreSQL | Not configured | Not provisioned | Secret; never record connection string here |
| FastAPI AI service | Not scaffolded | Not deployed | TBD |
| Gemini | Not integrated | Not verified | Model ID TBD; never record API key here |

## Evidence status

| Evidence | Status |
|---|---|
| End-user insight | Pending Day 2 session |
| Working golden path | Not started |
| AI evaluation | Not started |
| Accessibility verification | Not started |
| Latency and reliability | Not measured |
| Cost estimate | Not calculated |
| Architecture diagram | Not created |
| Submission deck/video | Official template available; content not started |
