# Competition Brief

Status: `RECEIVED — CONTEXT CLASSIFIED; TEAM SOLUTION RECORDED SEPARATELY`

Ngày cập nhật: `2026-09-21`

## Source provenance

- Main source: pasted Visual Impairment competition brief supplied by Bảo Anh on 2026-09-21.
- The source contains an English section and a Vietnamese rendering of the same problem space.
- The brief states that it was developed through a collaborative process involving people with lived experience and industry partners at the ADC Hackathon Roundtable Launch in April 2026.
- Supporting competition-level sources already checked:
  - `ADC-main-submission-template/ADC Hackathon 2026 - Briefing session with participating teams (1).pdf`
  - Official ADC 2026 website: `https://industryhub.rmit.edu.vn/ADC/`

The pasted brief is the source for barrier-specific context. The briefing deck and website remain sources for competition rules, agenda, deliverables and judging criteria.

## Evidence classification

### Official competition facts

- Focus area: Visual Impairment — Blind or Low Vision.
- Overall domain: workplace accessibility, inclusion and employability for people with disabilities.
- The brief presents evidence from two perspectives:
  - people with lived experience;
  - HR and industry representatives.
- AI is encouraged only when used meaningfully, responsibly and ethically.
- Final submission includes an English PowerPoint pitch deck based on the official template and an English MP4/MOV solution video shorter than five minutes.
- Evaluation Round criteria: Innovation & Impact; User-Centered Design & Accessibility; Feasibility & Practicality; Utilization of AI. Presentation & Communication is added at the Grand Finale.

### Observed or reported evidence from the official brief

- The barriers below were reported through the brief-development roundtable and are valid competition evidence.
- They are qualitative evidence, not measurements of frequency, prevalence, accuracy, latency or product impact.
- The brief covers six career stages. It does not rank the stages or require a particular technical solution.

### Measured evidence currently available

- No team-run user test, accessibility test, prototype measurement or AI evaluation has been recorded.
- No baseline task time, task-success rate, error rate, sample size or cost has been established.

### Product assumptions and decisions

- The team has now selected a Stage 4 physical-orientation MVP. This is a team decision, not an official competition fact.
- Current primary user, golden path, assumptions and non-goals are maintained only in `docs/SOLUTION_SCOPE.md`; they must not be rewritten here as brief evidence.

## Career-stage map from the brief

### Stage 1 — Learn about careers, build skills and connect with people

People with lived experience reported:

- Job advertisements are sometimes published as images or infographics that screen readers cannot read.
- Company websites and job portals are not consistently accessible.
- Some certification lead times, such as advance IELTS registration, can exceed application deadlines.
- Online CV builders and image-placement workflows are difficult to use with a screen reader.
- Career fairs and networking events depend on visual cues such as logos, printed material and recognising people.
- Limited independent access to networking reduces direct interaction with employers and understanding of workplace expectations.

HR and industry context reported:

- Engineering and design teams often lack specific accessibility expertise.
- Accessibility features may be treated as SEO checklist items rather than tested against user needs.
- Smaller organisations may lack budget, personnel and an owned process for accessibility or accommodation.
- W3C guidance exists but may not be applied consistently or retested after deployment.
- Employers may overestimate the cost or complexity of workplace adjustment and screen-reader support.
- Unfamiliarity creates a “fear of the unknown” around employing and supporting visually impaired people.

Brief-level problem framing:

> Inaccessible online and in-person career information prevents visually impaired people from participating fully in career preparation and networking.

### Stage 2 — Prepare a CV, apply for jobs and prepare for interviews

People with lived experience reported:

- Company websites, job portals and PDF application forms may not work with screen readers.
- Third-party platforms may convert job descriptions or employer content into images.
- AI screening may interpret longer dwell time or different navigation patterns as undesirable behaviour, even without disability disclosure.
- The primary bottleneck identified in the brief is the inability to complete and submit an application at all.

HR and industry context reported:

- Organisations may have UX capability but no dedicated accessibility specialist.
- Employers depend on third-party job platforms whose accessibility they cannot control.
- Visual content is incentivised, while ongoing accessibility testing and maintenance receive limited budget.
- The brief reports a perceived weak business case when applicant volume is low.
- Accessibility may degrade after launch when compliance is not retested.

Brief-level problem framing:

> Inaccessible recruitment platforms, inaccessible content and potentially biased screening behaviour can prevent visually impaired candidates from navigating and submitting applications.

### Stage 3 — Attend interviews and communicate with employers

People with lived experience reported:

- Physical interviews may require clear orientation and support from the entrance to the interview room.
- Online interviews require learning the accessibility behaviour of different platforms.
- Interviewers may first learn about a candidate's visual impairment during the interview and react with discomfort or uncertainty.
- Attention may shift from the candidate's capabilities to assumed limitations, adjustment cost or support burden.
- Smaller organisations may have no process for requesting or arranging reasonable accommodation.
- Candidates may not receive a fair opportunity to demonstrate ability before bias influences the interaction.

HR and industry context reported:

- Bias can be unconscious and reinforced by lack of prior experience with visually impaired colleagues.
- Accommodation may have no clear owner in recruitment or HR.
- Employers may be uncertain about communication, management, productivity, legal obligations and adjustment costs.
- The brief describes bias as a cultural and process problem, not only a technology problem.

Brief-level problem framing:

> Interviewer bias, inaccessible interview processes and unclear accommodation ownership can overshadow a visually impaired candidate's qualifications and potential contribution.

### Stage 4 — Start a new job and learn workplace rules

People with lived experience reported:

- Contracts, schedules, presentations and other onboarding material may be supplied as images or screen-reader-incompatible PDFs.
- Locating offices, canteens and restrooms can require more time or guided support.
- Internal software and data systems may not work with screen readers, preventing completion of daily tasks.
- Colleagues may rely on visual gestures or inaccessible materials and misread a lack of visual response as disengagement.
- Security policies may restrict third-party assistive technology.

HR and industry context reported:

- Accessibility is often absent from internal-system procurement and specifications.
- Colleagues are rarely briefed on accessible communication before a visually impaired employee joins.
- Buddy systems and guided physical orientation are not standard practice.
- Organisations may fear that assistive tools expose confidential data, while retrofitting legacy systems is considered costly and disruptive.
- Longer onboarding may be perceived as a productivity cost.

Key brief insight:

- The brief identifies digital access as the more critical onboarding barrier: physical spaces can be learned over time, while inaccessible systems may prevent an employee from completing probation.
- Accessible text-based material can benefit all employees rather than requiring a separate version for one person.
- Screen-reader security concerns require tool-specific audit instead of a blanket assumption that every screen reader sends data externally.

Brief-level problem framing:

> Inaccessible onboarding material, internal systems and workplace communication can isolate visually impaired employees and prevent effective task completion during probation.

### Stage 5 — Work in the job and perform daily tasks

People with lived experience reported:

- Slides and visual presentations can make meetings impossible to follow in real time.
- Images, icons, screenshots and GIFs in workplace chat may carry information that screen readers cannot access.
- Visual project updates can make a visually impaired employee appear uninformed or disengaged and can exclude them from decisions.
- Internal systems such as SAP, proprietary databases and specialised work tools may not be screen-reader compatible.

HR and industry context reported:

- Visual formats are the workplace default because they are convenient for sighted colleagues.
- Colleagues are not consistently trained or reminded to change communication behaviour.
- Accessibility is often missing from procurement requirements.
- Organisations are concerned about productivity, duplicate material, retrofit cost and third-party assistive-tool security.
- Sustainable improvement requires both accessible systems and changes in colleague behaviour.

Existing workarounds and limitations reported:

- Presenters may share slides directly so the employee can attempt to read them on screen.
- Team members may replace some visual chat communication with voice.
- Visually impaired professionals already use tools such as Gemini or ChatGPT to interpret images, but the process can be slow and context-dependent.
- Smart glasses may provide faster visual interpretation but remain expensive and introduce privacy concerns.

Brief-level problem framing:

> Visual workplace communication and inaccessible internal systems prevent visually impaired employees from following discussions, contributing to decisions and completing daily work independently.

### Stage 6 — Work with others, improve skills and grow in the job

People with lived experience reported:

- Professional-development courses and self-study material are not consistently accessible.
- Training providers may decline participation because they believe accommodation is unavailable or too costly.
- Career progression paths may be unclear, while senior roles depend on networking and word of mouth.
- Visual communication can exclude employees from the discussions and decisions needed to demonstrate leadership.
- Bias may frame visual observation and non-verbal cues as essential leadership capabilities without considering alternatives.

HR and industry context reported:

- Organisations rarely have career-development plans designed with visually impaired talent in mind.
- Accessibility barriers affect self-directed learning, line-manager support and formal training.
- Promotion requires personal drive, competency and opportunity; a gap in any one can block advancement.
- Employers may question the return on accessible development resources or assume that a visually impaired manager needs additional headcount.
- AI and smart glasses are considered promising but not universally accessible, affordable or privacy-compliant.

Brief-level problem framing:

> Inaccessible development resources, networking-dependent advancement and leadership bias can limit long-term career growth for visually impaired employees.

## Cross-stage themes

- **Digital accessibility:** image-based information, inaccessible PDFs, portals and internal systems repeatedly block access.
- **Communication:** workplaces frequently communicate through visual-only material and non-verbal cues.
- **Process ownership:** accommodation and accessibility often have no named owner.
- **Awareness and bias:** unfamiliarity shifts attention from demonstrated capability to perceived cost and risk.
- **Budget and maintenance:** accessibility is deprioritised or treated as a one-time compliance task.
- **Third-party dependency:** employers cannot fully control job boards, interview tools, training platforms or assistive services.
- **Security and privacy:** internal data and external AI/assistive tools create legitimate questions that require case-specific assessment.
- **Systemic and cultural change:** several barriers require both accessible technology and changed workplace behaviour.

## Claims that require further validation before use in the pitch

The following are reported in the brief but must not be presented as measured team findings without supporting evidence:

- Comparative accessibility of specific platforms such as LinkedIn and VietnamWorks.
- The mechanism or prevalence of disability-related bias in AI recruitment screening.
- The cost of implementing accessibility at build time versus retrofitting.
- The frequency with which screen readers or AI tools transfer confidential information externally.
- Reported lower turnover or higher attention to detail among visually impaired employees.
- Any claim that a barrier is universal across all blind and low-vision users, job roles or organisations.
- Any quantitative claim about productivity, retention, application success or probation outcomes.

## Open questions for clarification and end-user research

- Does the organising committee expect teams to address one stage, or may a solution span stages when one golden path remains clear?
- Which stage and barrier are most urgent to the end users attending the Day 2 session?
- Is the intended primary user a student, job candidate, new employee, established employee, manager, recruiter or HR practitioner?
- Which exact workplace task currently fails, how often does it occur and what is its consequence?
- What workaround is used today, who provides help and how much time or independence is lost?
- Which devices, operating systems, browsers and screen readers are used in the relevant context?
- Are the source materials primarily Vietnamese, English or mixed-language?
- Which inputs may contain confidential, personal or employer-owned data?
- What consent, retention, security or on-device-processing expectations apply?
- What outcome would the user consider a meaningful improvement?
- Which claim can be measured credibly within the hackathon using representative cases and accessibility testing?

## Evidence from Day 2 end-user session

| Evidence | Exact context | Product implication | Status |
|---|---|---|---|
| Pending | Pending | Do not infer before the session | Planned |

Do not record names or identifying information without consent and a clear purpose.
