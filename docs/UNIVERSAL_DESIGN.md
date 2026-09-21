# Seven Principles of Universal Design

Status: `REFERENCE — NOT A PRODUCT DECISION`

The seven principles are a stable design reference for evaluating whether a product, service, process or environment can be used by people with different abilities without requiring a separate, inferior experience.

They originated from the Center for Universal Design at North Carolina State University. In this repository they support product reasoning and accessibility review; they are not an official scoring formula and do not replace WCAG, platform accessibility guidance or testing with blind and low-vision users.

## 1. Equitable Use — Sử dụng công bằng

The design should provide equivalent value, access and dignity to people with different abilities.

Questions to ask:

- Can a screen-reader user access the same essential information and complete the same task?
- Does the accessible path have the same functionality, quality and timeliness as the visual path?
- Does the design avoid segregating or stigmatising disabled users?
- Are privacy and safety protections equivalent for all users?

Relevant examples:

- One application form works with mouse, keyboard and screen reader instead of providing a reduced separate form.
- A blind employee receives the same workplace information at the same time as sighted colleagues.
- Accessible output contains the same critical facts and actions as the visual source.

## 2. Flexibility in Use — Linh hoạt trong cách sử dụng

The design should support different preferences, abilities, devices and interaction methods.

Questions to ask:

- Can the task be completed with keyboard, touch, pointer or assistive technology as appropriate?
- Can users choose text, speech or another suitable output mode?
- Can users pause, replay, skip or adjust the pace of information?
- Is there an alternative when camera, audio or precise visual interaction is unavailable?

Relevant examples:

- Important content can be read visually, through a screen reader or through text-to-speech.
- File upload has a keyboard-accessible control and does not require drag-and-drop.
- A user can type information instead of being forced to capture an image.

## 3. Simple and Intuitive Use — Sử dụng đơn giản và dễ hiểu

The design should be understandable regardless of experience, knowledge, language or concentration level.

Questions to ask:

- Is the current step and next action clear?
- Are controls named by their actual action rather than by vague labels such as `Continue`?
- Is the focus order consistent with the task order?
- Are instructions and errors concise, specific and actionable?
- Does the flow avoid unnecessary modes, choices and hidden states?

Relevant examples:

- Use `Upload onboarding document` instead of an icon-only button.
- Announce when processing begins, completes or fails.
- Explain what must be corrected instead of displaying only `Invalid input`.

## 4. Perceptible Information — Thông tin có thể nhận biết

The design should communicate essential information effectively without depending on one sensory mode.

Questions to ask:

- If the user cannot see the screen, can they still receive all critical information?
- Do images, charts and diagrams have context-appropriate alternatives?
- Are status changes exposed to assistive technology?
- Is meaning communicated by more than colour, position, shape or animation alone?
- Does content remain understandable when text is enlarged or contrast is increased?

Relevant examples:

- Images have useful alt text rather than filenames or generic descriptions.
- A chart provides a summary and an accessible data table.
- Error states use text and screen-reader announcements, not only red colour.
- Video provides captions and, when needed, description of important visual content.

This principle is especially important for the Visual Impairment focus area, but it must be applied together with the other six principles.

## 5. Tolerance for Error — Dung sai đối với lỗi

The design should reduce accidental actions and limit harm when the user or system makes a mistake.

Questions to ask:

- Can the user review and correct information before submission?
- Can an action be undone or safely retried?
- Does the system prevent irreversible action without explicit confirmation?
- Does AI stop or expose uncertainty when the input is unreadable or insufficient?
- Are critical facts linked to a source and presented for confirmation?

Relevant examples:

- A user can correct an application before it is submitted.
- Ambiguous dates, locations or instructions are marked for human confirmation rather than guessed.
- Provider timeout produces a stable error with retry guidance.
- Destructive actions require a clearly labelled confirmation step.

## 6. Low Physical Effort — Ít tốn sức

The design should allow efficient and comfortable use without unnecessary repetition, precision or sustained effort.

Questions to ask:

- Does keyboard navigation require an excessive number of focus movements?
- Must the user repeat information the system already has?
- Does the task require drag-and-drop, precise pointing or prolonged gestures?
- Can users reach important information without listening to or traversing the entire interface?
- Are repeated tasks shortened without hiding necessary control?

Relevant examples:

- Provide headings and landmarks so a screen-reader user can jump to the required section.
- Do not require a user to listen to a complete document merely to find one deadline.
- Preserve entered information after validation errors.
- Provide adequately sized controls and avoid precision-only interactions.

## 7. Size and Space for Approach and Use — Kích thước và không gian tiếp cận phù hợp

The design should provide appropriate space, reach and visibility for different bodies, positions, devices and assistive technologies.

Questions to ask for physical environments:

- Are paths free of obstacles and wide enough for different mobility needs?
- Can signs, controls and service points be located and reached safely?
- Is there space for a guide, mobility aid or assistive device where needed?

Questions to ask for digital products:

- Are touch targets large enough and sufficiently separated?
- Does the interface support zoom and text scaling without losing content or function?
- Is keyboard focus clearly visible?
- Does responsive layout preserve reading and focus order?

Relevant examples:

- Content remains usable at increased text size and browser zoom.
- Controls do not overlap or disappear on a small screen.
- A physical workplace route does not depend only on visually located landmarks.

## Applying the principles in this hackathon

### During problem analysis

- Use the principles to identify exactly how the existing experience excludes users.
- Record which principle is violated by the current workflow and what consequence follows.
- Do not treat a principle by itself as evidence that a barrier is important; connect it to the official brief or observed user evidence.

### During solution scoping

- Check the complete golden path, not only the final screen.
- Avoid creating a separate path with fewer capabilities for blind or low-vision users.
- Define how error, uncertainty, timeout and recovery behave before implementation.
- Select input and output modes based on the confirmed workplace context.

### During implementation and testing

- Test the real workflow with keyboard and the relevant screen reader.
- Check accessible names, roles, focus order, announcements, text scaling, contrast and touch targets.
- Test success, validation failure, unreadable input, provider timeout and retry.
- Verify that critical information is available without colour, image or position alone.

### When presenting evidence

- Report the exact behaviour tested, device, browser, screen reader, task and result.
- Do not claim that a product is `universally accessible`, `WCAG compliant` or `safe` based only on a checklist.
- Separate implemented behaviour from planned improvement.

## Compact review checklist

| Principle | Review question |
|---|---|
| Equitable Use | Does the accessible path provide equivalent value and functionality? |
| Flexibility in Use | Can users choose an interaction method appropriate to their needs? |
| Simple and Intuitive Use | Are the current state, next action and errors clear? |
| Perceptible Information | Is essential information available without relying on sight alone? |
| Tolerance for Error | Can errors be prevented, detected, corrected and safely recovered from? |
| Low Physical Effort | Can the task be completed without unnecessary repetition or precision? |
| Size and Space | Do physical and digital layouts support different users and assistive technologies? |
