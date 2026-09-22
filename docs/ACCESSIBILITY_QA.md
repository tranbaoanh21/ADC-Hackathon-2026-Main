# PathMemory Accessibility, Privacy and Safety QA

Last updated: 2026-09-22

Status: `CODE AND DESKTOP BROWSER CHECKS PASS; PHYSICAL-DEVICE SCREEN-READER QA PENDING`

This file records evidence without treating implementation inspection as an end-user or screen-reader test.

## Evidence recorded

| Area | Method | Environment | Result |
|---|---|---|---|
| Web semantics | Browser accessibility-tree inspection | Microsoft Edge on macOS, local Vite build | Headings, labels, buttons, fieldsets, status text, alerts and disabled states exposed |
| Web layout | Desktop screenshot inspection | Microsoft Edge on macOS, local Vite build | No visible clipping or overlap in the inspected viewport; PathMemory mark remains paired with text name |
| Mobile compilation | Expo Android production export | Expo SDK 57 / Metro | Bundle exported successfully |
| Mobile state safeguards | Vitest | Node 24 | Stale response, unconfirmed origin, stop-and-rescan and completion presentation tests pass |
| Mobile focus behavior | Code inspection and TypeScript build | Expo/React Native state-machine screens | Screen changes reset scroll and request accessibility focus on the new page heading; physical VoiceOver/TalkBack verification remains pending |
| Mobile camera semantics | Code inspection and TypeScript build | Expo Camera | Permission/ready/capture states have text and announcements; non-actionable camera preview is excluded from the accessibility tree |
| Color contrast | Deterministic WCAG relative-luminance tests | Vitest | Every tested normal-text pair is at least 4.5:1; focus boundary is above 3:1 |
| Raw-media retention | Code and Prisma-schema inspection | Mobile, Express and PostgreSQL layers | Temporary mobile camera file is deleted after request; Express keeps frame buffers request-local; schema has no raw-media field |
| Safety language | Product-copy inspection | Mobile and web source | Copy says no obstacle detection, no safety assertion and no replacement for cane/guide dog/O&M |

These are implementation and measured test results, not claims that blind or low-vision users have validated the flow.

## Measured palette contrast

| Foreground / background | Ratio | Threshold |
|---|---:|---:|
| White / blue `#005FCC` | 5.98:1 | 4.5:1 |
| White / teal `#007A78` | 5.18:1 | 4.5:1 |
| Navy `#0B1F33` / canvas `#F7FAFC` | 15.93:1 | 4.5:1 |
| Muted `#475467` / white | 7.69:1 | 4.5:1 |
| Warning text `#7A2E0E` / warning surface `#FFF7ED` | 8.89:1 | 7:1 critical-text target |
| Error text `#7A271A` / error surface `#FFF4F3` | 9.14:1 | 7:1 critical-text target |
| Success `#067647` / canvas | 5.43:1 | 4.5:1 |
| Focus `#1570EF` / white | 4.57:1 | 3:1 UI-boundary target |

The executable source is `apps/mobile/src/theme.test.ts`. Web CSS variables use the same locked core palette.

## Manual web checklist

Run with the deployed web URL and record browser plus screen-reader version.

- [ ] Navigate from the address bar through the whole page using `Tab` and `Shift+Tab`; no focus trap or missing focus indicator.
- [ ] Heading navigation reaches page title, each workflow step and each landmark card in logical order.
- [ ] Every input/select/textarea is announced with its visible label and disabled state when graph is published.
- [ ] Creating/loading a graph announces the polite status; API failures interrupt with an alert.
- [ ] Add, edit, remove and save a directed edge without pointer input.
- [ ] Replay a cue, verify the visible cue remains available, and stop browser speech before replaying another cue.
- [ ] Publish remains disabled until textual requirements are met; status is understandable without color.
- [ ] Test at 200% zoom and with long Vietnamese/English landmark names.

Actual result: `PENDING — no VoiceOver/NVDA walkthrough has been recorded`.

## Manual mobile checklist

Run both demo routes on a physical phone. Record phone model, OS, Expo Go/build version and VoiceOver/TalkBack version.

- [ ] Screen reader reaches Learn and Navigate from Home with clear labels and hints.
- [ ] Every screen transition scrolls to the top and moves focus exactly once to the new step heading.
- [ ] Camera permission, camera-active state, camera-ready state and capture button are announced.
- [ ] App TTS does not speak over VoiceOver/TalkBack; replay announces exactly one message.
- [ ] Create a draft, scan one landmark, edit its proposed name and explicitly save it.
- [ ] Select Reception as origin and Meeting Room A as destination without sighted assistance.
- [ ] Wrong origin and unreadable input remain recoverable and never produce a movement cue.
- [ ] Complete Reception → Elevator → Meeting Room A twice.
- [ ] Complete Reception → Elevator → Restroom Level 2 twice.
- [ ] Timeout/error state is announced and retry remains operable.
- [ ] Test maximum platform text size; no primary control or safety copy becomes unavailable.
- [ ] Verify the temporary captured image does not remain in the product UI or application history.

Actual result: `PENDING — physical camera and VoiceOver/TalkBack are not available in the current coding environment`.

## Stop conditions

Do not call the prototype accessibility-tested or demo-ready if any of these remain true:

- an origin mismatch advances the route;
- an AI timeout removes the retry path;
- TTS overlaps the active screen reader;
- a critical control has no accessible name or is clipped at maximum text size;
- raw media persists after processing;
- the interface uses wording that implies obstacle detection or a safe route.
