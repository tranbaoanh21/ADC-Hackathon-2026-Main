# PathMemory Accessibility, Privacy and Safety QA

Last updated: `2026-09-22`

Status: `AUTOMATED CHECKS PASS; PHYSICAL SCREEN-READER QA PENDING`

Implementation inspection and automated tests are not end-user validation. Record device, OS, screen-reader version and result when completing manual checks.

## Evidence recorded

| Area | Evidence | Current result |
|---|---|---|
| Web semantics | Browser accessibility-tree inspection | Headings, labels, buttons, fieldsets, status and alerts exposed in inspected build |
| Web layout | Desktop visual inspection | No clipping/overlap in inspected viewport; hierarchy and focus states visible |
| Mobile compilation | Expo iOS Metro export | Passed |
| Mobile state safeguards | Vitest | 13 tests passed, including stale response, origin confirmation, stop-and-rescan and completion presentation |
| Mobile focus | Code inspection/typecheck | Screen changes reset scroll and request focus on the new heading; device verification pending |
| Automatic capture | Code inspection/typecheck | Camera preview is not an actionable screen-reader target; sequential requests use backpressure; explicit Finish Exploring remains accessible |
| Contrast | WCAG relative-luminance tests | Tested normal text ≥ 4.5:1; focus boundary ≥ 3:1 |
| Raw media | Mobile/Express/Prisma inspection | Temporary camera file deleted after request; frame buffers request-local; no raw-media database field |
| Safety behavior | Domain tests and copy inspection | Mismatch/uncertainty does not advance; UI does not claim obstacle detection or a safe route |

## Measured palette contrast

| Foreground/background | Ratio | Threshold |
|---|---:|---:|
| White / blue `#005FCC` | 5.98:1 | 4.5:1 |
| White / teal `#007A78` | 5.18:1 | 4.5:1 |
| Navy `#0B1F33` / canvas `#F7FAFC` | 15.93:1 | 4.5:1 |
| Muted `#475467` / white | 7.69:1 | 4.5:1 |
| Warning `#7A2E0E` / `#FFF7ED` | 8.89:1 | 7:1 critical-text target |
| Error `#7A271A` / `#FFF4F3` | 9.14:1 | 7:1 critical-text target |
| Success `#067647` / canvas | 5.43:1 | 4.5:1 |
| Focus `#1570EF` / white | 4.57:1 | 3:1 UI-boundary target |

Executable checks are in `apps/mobile/src/theme.test.ts`; web uses the same core palette.

## Manual web checklist

- [ ] Complete the page using `Tab`, `Shift+Tab`, headings and form controls without pointer input.
- [ ] Language switch announces and renders all product labels consistently in EN or VI.
- [ ] Workplace selection is announced by recognisable name; internal UUID is not required from the reviewer.
- [ ] Every landmark field and maneuver select has a visible and accessible label.
- [ ] Add, edit, remove and save a directed edge using keyboard/screen reader.
- [ ] Verify/publish requirements and errors are understandable without color.
- [ ] Status changes are announced once; alerts interrupt when appropriate.
- [ ] Test 200% zoom and long English/Vietnamese names without clipping.

Actual result: `PENDING — no physical VoiceOver/NVDA walkthrough recorded`.

## Manual mobile checklist

- [ ] Home, Explore and Navigate are reachable with VoiceOver/TalkBack using clear Vietnamese-only or English-only labels.
- [ ] Both home mode cards are announced as buttons with their action, title and context.
- [ ] Screen transitions move focus once to the new heading and do not create a focus loop.
- [ ] Camera permission, startup, processing, success, timeout and error states are announced without per-frame chatter.
- [ ] **Capture landmark / Chụp điểm mốc** is reachable by swipe, announced as a button and triggered by one screen-reader double tap.
- [ ] The capture control is disabled while processing and becomes available again after success, insufficient evidence, duplicate or retryable error.
- [ ] A recognized candidate moves focus into a modal that announces the object and exposes **Save landmark** and **Take another photo** as buttons.
- [ ] No landmark draft is persisted until the user confirms the modal.
- [ ] **Finish exploring / Kết thúc khám phá** remains reachable and does not trigger merely because the user stops walking.
- [ ] App speech never overlaps active VoiceOver/TalkBack speech.
- [ ] Select origin and reachable destination without sighted assistance.
- [ ] Wrong origin, unreadable input and timeout do not emit a movement cue and remain recoverable.
- [ ] Complete Reception → Elevator → Meeting Room A twice.
- [ ] Complete Reception → Elevator → Restroom Level 2 twice.
- [ ] Test maximum platform text size; no primary control or status becomes unavailable.
- [ ] Verify no captured image remains in product history after processing.

Actual result: `PENDING — physical camera and VoiceOver/TalkBack unavailable in the current coding environment`.

## Stop conditions

Do not call the prototype accessibility-tested or demo-ready if:

- a mismatch or unclear observation advances a route;
- timeout/error removes retry or recovery;
- app speech overlaps the screen reader;
- a critical control lacks an accessible name or is clipped at maximum text size;
- Vietnamese screen-reader copy mixes avoidable English terms;
- raw media persists after processing;
- UI wording implies obstacle detection, safe passage or replacement of mobility aids.
