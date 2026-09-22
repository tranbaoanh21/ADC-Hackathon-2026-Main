# PathMemory mobile

Expo/React Native is the primary client for the bounded landmark-graph MVP. It calls only the public Express Product API.

## Implemented flows

- `Learn`: create a draft workplace graph, start a Learn session, explicitly open the camera, upload one sampled frame, review the AI candidate and explicitly save an `AI_DRAFT` landmark for buddy review.
- `Navigate`: load a published graph, choose an ordered origin and reachable destination, start a deterministic Express-planned session, confirm the origin and each expected landmark, hear localised narration derived from the buddy-reviewed maneuver and complete at the destination.
- Recovery: visible and announced loading/error states, timeout messaging, stop-and-rescan instructions, replay and stale-response suppression.

## Mobile interaction model

- Home prioritises the everyday `Navigate` task and keeps Day-1 `Learn with buddy` as a separate secondary action.
- Navigate is split into four short setup screens: open workplace, choose origin, choose a reachable destination and confirm the journey.
- The demo Route ID is hidden from the primary path; a user can reveal an alternate-code field only when needed.
- Every state-machine screen scrolls to the top and moves accessibility focus to its new page heading.
- Landmark types are presented with plain-language Vietnamese labels rather than API enum values.
- The camera preview is excluded from the accessibility tree. Permission, ready, capture and processing states remain available as text and speech/screen-reader announcements.
- Primary controls are at least 56dp high and layouts use minimum heights rather than fixed text containers so platform font scaling can reflow.

The camera is never silently active. A camera capture is held only as a temporary local file, uploaded to Express and deleted after the request settles. The app does not persist raw image URIs. Express and FastAPI must also preserve the repository's no-raw-media-retention rule.

When a screen reader is active, PathMemory stops its own Expo Speech output and uses the platform accessibility announcement. This avoids uncontrolled TTS and VoiceOver/TalkBack overlap. Actual device testing is still required.

## Run locally

From the repository root:

```bash
npm run dev:api
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:3000 npm run dev:mobile
```

`localhost` works only when the mobile runtime shares the host network namespace. A physical phone normally needs the computer's LAN IP or a deployed HTTPS Express URL. Do not put database or model credentials in `EXPO_PUBLIC_*` variables.

Useful checks:

```bash
npm run typecheck --workspace @pathmemory/mobile
npm run test --workspace @pathmemory/mobile
npx expo install --check
npx expo export --platform android --output-dir /tmp/pathmemory-mobile-export
```

## Safety boundary

PathMemory confirms only reviewed landmarks and reads reviewed relative cues. It does not detect obstacles, assert that a route is safe, provide exact coordinates or replace a cane, guide dog or orientation-and-mobility skills.
