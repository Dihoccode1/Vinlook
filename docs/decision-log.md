# Vinlook decision log

Recorded from user confirmations in this chat. Individual entries record their confirmation date. DEC-043 confirms the consolidated requirement summary; DEC-044 approves PRD v1.0 and authorizes User Story preparation. This log is not an approved architecture, backlog, or implementation plan; each artifact has its own review status.

## DEC-001 MVP definition

- Date: 22 October 2026.
- Topic: Meaning of each five-day MVP checkpoint.
- Decision: Breadth-complete, depth-minimal executable prototype. Cover the main functional scope with the minimum depth needed to demonstrate end-to-end business flows.
- Reason: Explicit definition supplied by the user.
- Affected artifacts: Future milestone scopes, acceptance criteria, quality gates, and thirty-five-day plan.
- Still pending: The minimum demonstrable behaviour and acceptance criteria for each feature at each checkpoint; how Waterfall phases are organized around these checkpoints.

## DEC-002 Project calendar

- Date: 22 October 2026.
- Topic: Project duration and calendar.
- Decision: Thirty-five calendar days beginning 22 October 2026 as Day 1, ending 25 November 2026 as Day 35. Requirement discovery and design are included.
- Reason: User's fixed time constraint.
- Affected artifacts: Future phase schedule and milestone dates.

## DEC-003 Acceptance deadline and subsequent optimization

- Date: 22 October 2026.
- Topic: Role of the subsequent seven days.
- Decision: All must-have features must work and meet acceptance criteria by 25 November 2026. At most seven further days, 26 November through 2 December 2026, may be used for performance and interface optimization.
- Reason: User selected option A when distinguishing acceptance from later optimization.
- Affected artifacts: Final acceptance gate, maintenance and optimization scope, future delivery plan.

## DEC-004 Team lead

- Date: 22 October 2026.
- Topic: Team leadership.
- Decision: Duy, GitHub Dihoccode1, is team lead.
- Reason: User's explicit identification, supplemented by the supplied team document.
- Affected artifacts: Future human review responsibilities and assignments. Other member roles have not been assigned.

## DEC-005 Platform and selected technologies

- Date: 22 October 2026.
- Topic: Platform and technology choices.
- Decision: Mobile-first web app; React 19, Tailwind CSS 4, shadcn; Express.js; MongoDB with Mongoose; JWT and RBAC; Docker and Docker Compose; GitHub Actions; Vercel frontend hosting and Render backend hosting.
- Reason: Technologies explicitly selected by the user.
- Affected artifacts: Future architecture, deployment design, implementation, and test planning.
- Repository supplied by user: https://github.com/Dihoccode1/Vinlook.
- Still pending: Map and routing services, translation and text-to-speech providers, MongoDB hosting, environment configuration, and other details not yet confirmed. These pending choices are not implicitly decided by the stack.

## DEC-006 Offline behaviour

- Date: 22 October 2026.
- Topic: Tourist-facing offline capability.
- Decision: All six behaviours in the interview's offline table must work: GPS positioning; base map and POIs; POI descriptions and images; narration; creating or editing itineraries; directions between POIs. Internet preparation and predownload are acceptable. English is the system source language, and the offline interface, descriptions, and audio use English only. Downloaded language content is English only.
- Reason: User's explicit answers to the offline questions and subsequent language clarification.
- Affected artifacts: Future offline requirements, content pipeline, routing design, data packaging, and acceptance criteria.
- Boundary: This confirmation referred to the six tourist-facing behaviours in that table. Offline operation of admin dashboards, monitoring, or content-generation services has not been specified.

## DEC-007 Geographic coverage and initial POI set

- Date: 22 October 2026.
- Topic: Coverage and initial content count.
- Decision: The map/offline geographic coverage is all Ho Chi Minh City within its current administrative boundary. The initial content set contains all fifteen locations in the user's list; the user selected option A after the discrepancy between the stated ten and the listed fifteen was raised.
- Reason: User confirmation.
- Affected artifacts: FEAT-001 through FEAT-004, future geographic data and offline package requirements, and the initial POI content set.
- POIs in supplied order: Dinh Độc Lập; Nhà thờ Đức Bà Sài Gòn; Bưu Điện Trung Tâm Sài Gòn; Nhà hát Thành phố; Bến Nhà Rồng; Bảo tàng Chứng tích Chiến tranh; Bảo tàng Lịch sử Việt Nam; Bảo tàng Mỹ thuật TP.HCM; Landmark 81; Bitexco; Thảo Cầm Viên Sài Gòn; Phố đi bộ Nguyễn Huệ; Phố Tây Bùi Viện; Địa đạo Củ Chi; Chùa Bà Thiên Hậu.
- Cu Chi visitor destination: Resolved by DEC-009 below.
- Still pending: Geographic dataset and map-detail acceptance criteria.

## DEC-008 POI description research delegation

- Date: 22 October 2026.
- Topic: Preparation of source descriptions.
- Decision: The user authorizes the assistant to research the fifteen POIs using web materials found through search and to determine their descriptions.
- Reason: User explicitly requested help researching the descriptions and expressed trust in the assistant.
- Affected artifacts: FEAT-003 and FEAT-004; [English source descriptions](content/poi-descriptions-en.md).
- Boundary: This authorizes content research and drafting. It does not select map, translation, or speech providers, approve a database schema, or finalize narration duration.

## DEC-009 Cu Chi visitor destination

- Date: 22 October 2026.
- Topic: Destination for POI-014, Cu Chi Tunnels.
- Decision: Use Ben Duoc (Bến Dược) as the initial visitor destination for POI-014.
- Reason: User explicitly chose Bến Dược after the two visitor areas were identified.
- Affected artifacts: FEAT-001, FEAT-002, FEAT-004; POI-014 source description; future coordinates and directions.
- Scope count: The confirmed initial set remains fifteen POIs.
- Still pending: Verification of the entrance coordinates used for navigation; no coordinates have been approved through this destination choice.

## DEC-010 Walking navigation and POI discovery

- Date: 22 October 2026.
- Topic: Transport mode, guidance depth, and discovery flows.
- Decision: Support walking. Use navigation option C from the interview: track the user's moving position, provide turn notifications, and recalculate directions when the user deviates from the route.
- Discovery flow 1: The user searches for a POI and obtains directions to it.
- Discovery flow 2: Suggest three to four nearby POIs within an approximately three-to-four-kilometre radius around the user's coordinates.
- Offline dependency: DEC-006 requires tourist-facing directions to work offline. Its original reference to itinerary creation/editing is subsequently refined by DEC-012: navigation is to individual POIs; multi-stop itineraries are outside the confirmed scope.
- Reason: User's explicit selection of walking, navigation option C, and two discovery flows.
- Affected artifacts: FEAT-001 and FEAT-002; future search, suggestions, navigation, offline design, and acceptance criteria.
- Follow-up: DEC-011 resolves the suggestion interaction, the three-kilometre radius, and behaviour when fewer than three POIs are found. DEC-012 resolves the distance measurement and removes multi-stop itineraries from the confirmed scope. DEC-013 resolves notification modality and foreground operation. No map or routing technology has been selected.

## DEC-011 Nearby suggestions and destination selection

- Date: 22 October 2026.
- Topic: Nearby-POI list, radius, and sparse results.
- Decision: Display suggested POIs as a list. The user selects one POI and receives directions to that destination. Use a three-kilometre radius around the user's position. When only one or two POIs are found, display those actual results rather than expanding the search radius to fill the suggested group.
- Reason: User's explicit answers to the three nearby-discovery questions.
- Affected artifacts: FEAT-001 and FEAT-002; future POI suggestions, destination selection, navigation, and acceptance criteria.
- Follow-up: DEC-012 confirms straight-line measurement and single-destination scope. DEC-013 confirms selecting the four nearest qualifying POIs.

## DEC-012 Straight-line radius and single-destination scope

- Date: 22 October 2026.
- Topic: Nearby-distance measurement and FEAT-002 scope clarification.
- Decision: Measure the three-kilometre suggestion radius as straight-line geographic distance from the user's position, not the length of the walking route. Walking directions may therefore be longer than three kilometres.
- Decision: Support directions to individual POIs only. Do not include user-created or automatically generated multi-stop POI itineraries in the confirmed scope.
- Reason: User selected distance option A and explicitly chose directions to each individual POI after the initial multi-POI feature description was raised for clarification.
- Affected artifacts: FEAT-001, FEAT-002, future POI filtering, route guidance, offline acceptance criteria, and future scope documentation.
- Supersedes: The multi-POI itinerary wording in the initial FEAT-002 description and the itinerary creation/editing item in DEC-006. Single-destination offline navigation remains required.
- Process context: This clarification occurred during the requirement interview, before requirement baseline confirmation, design, or implementation.

## DEC-013 Suggestion ranking and navigation interface

- Date: 22 October 2026.
- Topic: Suggestion selection, turn notifications, and foreground navigation.
- Decision: If more than four POIs qualify within the three-kilometre straight-line radius, suggest the four nearest POIs, using the confirmed straight-line distance measure. When fewer qualify, retain DEC-011's rule to display the available results.
- Decision: Show turn instructions using text and on-screen visuals. Spoken turn instructions are not required. This does not remove the separate POI audio-narration requirement in FEAT-003.
- Decision: Navigation is required while the user is viewing the open Vinlook screen. Continuous navigation after switching apps or turning off the screen is not required.
- Reason: User selected the four nearest POIs, text/visual turn instructions, and foreground operation option A.
- Affected artifacts: FEAT-001, FEAT-002; future nearby-POI ordering, navigation interface, GPS handling, and online/offline acceptance criteria.
- Still pending: Behaviour when location access is unavailable, location accuracy is insufficient, or a walking route cannot be found. These error cases have not been assigned default product behaviour.

## DEC-014 Online languages and POI audio interaction

- Date: 22 October 2026.
- Topic: Language count, narration length, and playback trigger.
- Decision: The online language requirement of more than fifteen languages includes English. Vietnamese must also be supported. English remains the source language; the offline English-only behaviour in DEC-006 remains unchanged.
- Decision: Each POI narration has a target duration of two minutes.
- Decision: Selecting a POI opens its information; narration starts when the user presses Play, not automatically merely by selecting the POI.
- Reason: User's explicit answers to the language-count, duration, and playback questions.
- Affected artifacts: FEAT-003 and FEAT-004; source-content preparation, translation and text-to-speech pipeline requirements, player interaction, and acceptance criteria.
- Content status: The fifteen existing English descriptions are short researched summaries, not completed two-minute narration scripts. Content expansion and duration verification remain outstanding.
- Follow-up: DEC-015 confirms the sixteen-language list, manual pipeline trigger, and staff review before publication. Acceptable narration-duration tolerance and whether the two-minute target applies identically across translations remain pending. No translation or speech provider has been selected.

## DEC-015 Language list and content publication workflow

- Date: 22 October 2026.
- Topic: Supported online languages, processing trigger, and publication review.
- Decision: Support sixteen online languages: English; Mandarin Chinese; Hindi; Spanish; Modern Standard Arabic; French; Bengali; Portuguese; Indonesian; Urdu; Russian; German; Japanese; Nigerian Pidgin; Egyptian Arabic; Vietnamese.
- Count clarification: The user listed fifteen named languages and explicitly added Vietnamese. English is included in the sixteen and remains the source language. Modern Standard Arabic and Egyptian Arabic are separate requested language varieties.
- Decision: Staff finish editing the POI description and explicitly press a processing button to trigger translation and audio generation, corresponding to option B in the interview. Editing alone does not automatically trigger processing.
- Decision: Staff inspect generated translations and audio before publication. Successful generation alone does not authorize public release.
- Reason: User's explicit language list and workflow selections.
- Affected artifacts: FEAT-003, FEAT-004, FEAT-005; future language configuration, pipeline requirements, review/publication workflow, and acceptance criteria.
- Follow-up: DEC-030 confirms Traditional Chinese for Mandarin content, the Portugal variant of Portuguese, and all sixteen languages for the online tourist interface. DEC-017 and DEC-023 resolve publication authority and granularity; DEC-028 resolves partial processing failures. Provider support and output quality for each requested variety still require verification.

## DEC-016 Staff work sessions and guest access

- Date: 22 October 2026.
- Topic: Meaning of sessions, usage monitoring, and tourist login.
- Decision: Each staff member creates one work session each day. It contains staff information and records work performed, including adding, deleting, and editing POIs.
- Decision: Staff need visibility into how many users are currently online and how many are using POI audio narration.
- Decision: Tourists do not need to log in to use the tourist-facing features discussed in the interview: map, POI search, walking directions, narration, and offline downloads.
- Reason: User's explanation of sessions and answer that tourist login is unnecessary.
- Affected artifacts: FEAT-003, FEAT-005, FEAT-006; future work-session requirements, POI activity records, monitoring, guest access, and staff authorization.
- Role status: Subsequently confirmed in DEC-017 after review of the user's reference presentation and the proposed permission table.
- Follow-up: DEC-019 confirms work-session gating, manual and automatic closure, and live system-wide monitoring rather than usage history tied to employee sessions. Staff information fields, metric definitions, staff authentication details, and permissions not included in DEC-017's approved table remain pending.

## DEC-017 Staff and Manager roles

- Date: 22 October 2026.
- Topic: Administrative roles and publication authority.
- Decision: Adopt two roles, Staff (Nhân viên) and Manager (Quản lý), according to the permission table presented immediately before the user's approval.
- Approved for both roles: Create a daily work session; add POIs and edit draft content; explicitly run translation and audio processing; check generated results and submit content for publication review; view online-user and active-narration-listener monitoring.
- Approved for Manager only: Approve content and publish it to the tourist-facing app.
- Reason: User explicitly approved the proposed two-role permission table after reference review.
- Affected artifacts: FEAT-003, FEAT-004, FEAT-005, FEAT-006; future authorization requirements, work-session workflows, review/publication acceptance criteria, and permission implementation.
- Reference: [Reference review and approved table](references/quan4-reference-review.md).
- Follow-up: DEC-018 resolves POI deletion authority, retention of POI records, and employee self-registration with manager approval. DEC-023 confirms the all-sixteen-language publication gate and permits managers to approve their own edits. Other staff-account administration remains pending. No project-team members have been assigned to production application roles by this decision.

## DEC-018 Logical POI deletion and employee registration

- Date: 22 October 2026.
- Topic: POI deletion authority, deletion meaning, and employee onboarding.
- Decision: Only Manager may delete a POI. A staff deletion-request workflow is not included by this selection.
- Decision: Deletion means marking the POI as deleted while retaining the underlying database record. Physical deletion of that POI record is not allowed by this requirement. The particular database field or schema representation has not been selected.
- Decision: Employees register themselves and wait for Manager approval before receiving staff access.
- Reason: User selected deletion-authority option A, explicitly required marking rather than physical deletion, and selected employee-registration option B.
- Affected artifacts: FEAT-004 and FEAT-005; future POI lifecycle, visibility rules, audit trail, staff registration/approval, and authorization acceptance criteria.
- Still pending: Whether to offer a restore action and who may use it; retention of related translations, audio and images; propagation of deletion to previously downloaded offline content; registration information fields and manager-account provisioning.

## DEC-019 Required work sessions and live monitoring scope

- Date: 22 October 2026.
- Topic: Session gating, session closure, and monitoring scope.
- Decision: An open work session is required before adding, editing, or marking POIs deleted, triggering the translation/audio pipeline, or reviewing content. This session requirement does not expand the role permissions in DEC-017 and DEC-018.
- Decision: Users may close their work session manually. A session that remains open closes automatically at midnight in Vietnam time (Asia/Ho_Chi_Minh, UTC+07:00).
- Decision: Online-user and active-narration-listener counts are current system-wide metrics on the Monitoring dashboard. Historical usage statistics linked to each staff work session are not required by this selection. Staff action history inside work sessions remains required.
- Reason: User confirmed mandatory session opening, selected closure option C, and selected current system-wide metrics.
- Affected artifacts: FEAT-005, FEAT-006; future daily-session rules, audit linkage, permission checks, dashboard scope, and acceptance criteria.
- Still pending: Exact definitions and counting unit for online users and active listeners; acceptable monitoring refresh delay; session interruption and date-boundary behaviour; employee identity and registration fields. The earlier one-session-per-day requirement in DEC-016 remains in effect.

## DEC-020 Monitoring refresh and listener start event

- Date: 22 October 2026.
- Topic: Dashboard refresh, online-user counting, and listener start.
- Decision: Refresh the Monitoring dashboard once every thirty seconds.
- Decision: Begin counting a narration listener when the visitor presses Play. Do not silently replace this with a requirement that audio must first be confirmed audible or playing.
- Reason: User specified a thirty-second refresh interval and the Play action as the start point.
- Affected artifacts: FEAT-003, FEAT-006; future player instrumentation, monitoring metric definitions, and acceptance criteria.
- Counting-unit follow-up: DEC-021 resolves the earlier ambiguity in favour of one browser on one device, not unique IP addresses.
- Follow-up: DEC-022 resolves pause, completion, and page-closure behaviour for listeners. Playback failure or lost connection, uniqueness across repeated Play actions/tabs, and the online-presence timeout remain pending. Refreshing every thirty seconds does not itself define the presence timeout or an event aggregation window.

## DEC-021 Online-user counting unit

- Date: 22 October 2026.
- Topic: Distinct online visitor identity.
- Decision: Count each browser on a device as one visitor. Multiple Vinlook tabs in the same browser count as one. Separate devices sharing an IP are counted separately. Do not use unique IP address as the online-visitor counting unit.
- Reason: User selected option A after the browser/device and IP rules were distinguished.
- Affected artifacts: FEAT-006; future anonymous visitor identification, cross-tab counting, monitoring, and acceptance criteria.
- Follow-up: DEC-022 resolves listener pause, completion, and page-closure behaviour. The online-presence timeout and handling of playback failures or lost connection remain pending. No browser-identifier storage mechanism has been selected, and approval of this counting rule does not decide those details.

## DEC-022 Narration-listener lifecycle

- Date: 22 October 2026.
- Topic: Meaning of the current narration-listener metric.
- Decision: Begin counting when the visitor presses Play. Keep the visitor counted while narration is paused. Stop counting after narration finishes or the visitor closes the page; reflect that removal on the next dashboard update.
- Reason: User explicitly confirmed the clarification table with these three lifecycle rules after the earlier wording was identified as ambiguous.
- Affected artifacts: FEAT-003, FEAT-006; future player-event handling, dashboard metric wording, and listener-count acceptance criteria.
- Semantic note: This metric includes paused narration sessions. It must not be described as a count of audio streams currently producing sound, nor as a cumulative count of completed listens.
- Still pending: Playback failure, loss of connectivity or unreported page closure, repeated Play actions and multiple tabs, and the timeout for stale presence. The approved dashboard refresh interval remains thirty seconds under DEC-020.

## DEC-023 Complete-language publication and revised content

- Date: 22 October 2026.
- Topic: Publication readiness, availability during editing, and manager self-review.
- Decision: Publish a POI only when descriptions and narration audio are available and approved in all sixteen confirmed languages. Do not publish it incrementally language by language.
- Decision: When a published POI is edited and the revision is being processed or reviewed, tourists continue using the previously approved published content. Do not automatically hide the POI merely because its new revision is pending.
- Decision: A Manager may approve and publish content they edited themselves. A different Manager's review is not required.
- Reason: User selected options A for the complete-language gate and keeping the previous approved version, and explicitly permitted manager self-review.
- Affected artifacts: FEAT-003, FEAT-004, FEAT-005; future content revision, review, publication, offline-update, and acceptance requirements.
- Boundary: These are confirmed product behaviours, not a chosen versioning schema or implementation architecture. Logical POI deletion remains governed separately by DEC-018.
- Still pending: Pipeline failure/retry behaviour, external-service providers and budgets, offline update propagation, and verification that translation and narration providers support every required language variety.

## DEC-024 Zero-cost services and two environments

- Date: 22 October 2026.
- Topic: Operating budget and deployment environments.
- Decision: Use only free services. Paid subscriptions or usage charges are not authorized.
- Decision: Use Development and Production environments, corresponding to option A. A separate Staging environment is not required.
- Reason: User explicitly required free services and selected environment option A.
- Affected artifacts: All future service selection, hosting, content-processing capacity, deployment design, and the thirty-five-day delivery plan.
- Existing choices: The previously confirmed Vercel frontend, Render backend, Express.js and MongoDB stack remain the recorded selections. Any change to them requires a user decision.
- Service-selection status: The request for recommendations alone did not approve services. DEC-026 subsequently records explicit approval of the two proposed service/runtime groups. Offline walking routing and map-file distribution remain unselected.
- Follow-up: DEC-025 confirms an educational project and availability of a local machine with 16 GB RAM for specialized audio processing. Free-tier limits and exhaustion behaviour, expected visitor load, account eligibility and service capabilities, and any extra worker runtime still need clarification or approval.
- Research: [Free-service candidates and feasibility notes](research/free-service-options.md).

## DEC-025 Educational purpose and local processing resources

- Date: 22 October 2026.
- Topic: Project purpose and availability of local compute for audio processing.
- Decision: Vinlook is an educational project. A team personal computer with 16 GB RAM is available for specialized audio processing if needed.
- Reason: User explicitly identified an educational project and confirmed a 16 GB RAM computer in response to the local-processing question.
- Affected artifacts: Future free-service eligibility checks, narration-provider evaluation, processing-capacity checks, and deployment planning.
- Boundary: RAM capacity and availability do not establish measured synthesis speed, support for all languages, or continuous worker availability. This answer does not itself approve Meta MMS, Azure, Gemini, a Python runtime, or a particular worker/integration architecture.
- Follow-up: DEC-026 approves the proposed providers and local Python worker. Actual CPU/OS capabilities, observed processing performance, and account-specific provider quotas remain unverified.

## DEC-026 Selected free-service groups and local Python worker

- Date: 22 October 2026.
- Topic: Approval of the two service groups proposed after DEC-025.
- Decision, group 1: MongoDB Atlas Free for database hosting; Cloudinary Free for images and narration files; MapLibre GL JS and PMTiles for map display and offline map packaging, following the Protomaps-based proposal.
- Decision, group 2: Gemini Developer API Free Tier for text translation; Azure Speech F0 for narration in its supported required languages; Meta MMS for Nigerian Pidgin narration on the team's local machine.
- Decision: Add a local Python worker for the MMS processing. Express.js remains the selected main backend.
- Reason: User approved immediately after being asked whether to approve both groups or only group 1, without limiting approval to one group.
- Affected artifacts: FEAT-001, FEAT-003, FEAT-004, FEAT-005; future service integration, content-processing design, database/media hosting and map-display implementation.
- Authorization boundary: This is a technology/runtime selection. It does not authorize paid usage or override the requirement/design confirmation gates before implementation. No service accounts, deployments, working integrations, or successful synthesis tests are claimed by this decision.
- Still pending: Verification of translation and speech output for all sixteen language varieties, the two-minute narration target, free-tier quotas, local worker connectivity and scheduling, account eligibility, mobile performance, offline walking route computation/recalculation, and map-file distribution. MapLibre/PMTiles approval does not resolve those routing and distribution questions.

## DEC-027 Browser coverage, demo concurrency, and cold start

- Date: 22 October 2026.
- Topic: Mobile browser targets and operating conditions for the educational demo/acceptance.
- Decision: Support both Chrome on Android and Safari on iPhone.
- Decision: The demo/acceptance scenario must support up to fifty concurrent tourists.
- Decision: Accept the Render Free backend wake-up delay of approximately one minute after inactivity, as described in the interview. This acceptance does not set normal-response-time targets or waive offline requirements.
- Reason: User selected browser option C, specified fifty concurrent visitors, and accepted the cold-start delay.
- Affected artifacts: FEAT-001 through FEAT-006 as applicable; future browser compatibility, concurrency tests, performance criteria, startup UX, deployment and acceptance planning.
- Boundary: These are required test targets and an accepted operating limitation, not evidence of passed browser or load tests. No minimum OS/browser versions or phone hardware have been selected.
- Still pending: Representative test devices/versions; normal-operation response-time targets; maximum offline download size and acceptable preparation time; offline route/data feasibility on both browser families.

## DEC-028 GPS denial, partial processing failure, and offline downloads

- Date: 22 October 2026.
- Topic: Approval of the three proposed error-handling behaviours.
- Decision: If a tourist does not grant GPS access, map viewing, POI search, narration playback and data downloads remain available. Location-based suggestions and navigation require GPS permission.
- Decision: If translation or audio processing fails for one language, retain successful processing outputs and allow staff to retry the failed part. The revised content remains unpublished until all sixteen languages meet the publication gate; previously approved published content remains available.
- Decision: If downloading or updating an offline package fails, preserve the previous package when one exists, identify the download as incomplete and allow retry. Report ready for offline use only after the complete package has downloaded successfully.
- Reason: User approved all three rows of the proposed error-handling table.
- Affected artifacts: FEAT-001, FEAT-002, FEAT-003, FEAT-004, FEAT-005; future GPS permission UX, processing retries, publication checks, offline-package handling and acceptance cases.
- Boundary: This confirms product behaviour, not package formats, database fields, queue technology, or an approved offline routing engine.
- Still pending: Other GPS or route failures; exact package size, update propagation and stale-content rules; quota exhaustion and local-worker unavailability; normal performance targets.

## DEC-029 Staff registration, login, initial Manager, and session reopening

- Date: 23 October 2026.
- Topic: Account input fields, initial Manager provisioning, and same-day work-session reopening.
- Decision: Employee registration collects full name, email, password, and password confirmation. Email and password are used to log in. The password-confirmation input confirms the entered password; this decision does not authorize storing an additional password-confirmation value in the database.
- Decision: Create the first Manager account during system setup so that it can approve subsequently self-registered employees. No specific person's production role or setup credentials have been assigned in this decision.
- Decision: A user who manually closes a work session may reopen that same session later on the same day, preserving one work session per user per day. The midnight automatic closure rule remains in effect; this decision does not authorize reopening a previous day's session.
- Reason: User approved the proposed registration fields with password confirmation added, specified email/password login, agreed to initial Manager provisioning, and selected reopening option A.
- Affected artifacts: FEAT-005; future account registration/login, password-match validation, account approval, setup provisioning, work-session lifecycle, and acceptance cases.
- Still pending: Other account-recovery or administration needs; exact staff-session identity information and audit-event detail; remaining monitoring, performance, language-variant, and offline lifecycle requirements.

## DEC-030 Language varieties and online tourist interface

- Date: 23 October 2026.
- Topic: Chinese writing system, Portuguese variety, and interface language coverage.
- Decision: Use Traditional Chinese writing for the requested Mandarin Chinese content.
- Decision: Use the Portugal variety of Portuguese, not the Brazil variety.
- Decision: The online tourist-facing interface supports all sixteen confirmed languages, as do the POI descriptions and narration. The offline interface, descriptions and narration remain English-only under DEC-006.
- Reason: User selected Traditional Chinese, Portuguese from Portugal, and interface option A.
- Affected artifacts: FEAT-001 through FEAT-003 as applicable; future interface translations, content translation, voice selection, browser/UI testing, and online/offline language switching acceptance criteria.
- Boundary: The online tourist-interface choice does not select the staff dashboard's interface language, an internationalization library, particular voices, or regional pronunciation for Mandarin. No translated interface bundles have been produced or verified.
- Still pending: Narration duration tolerance and language-specific validation; staff/admin interface language; online/offline language fallback and switching behaviour; remaining monitoring and operational criteria.

## DEC-031 Local worker availability, processing quotas, and system monitoring

- Date: 23 October 2026.
- Topic: Approval of the three proposed operating behaviours.
- Decision: If the local MMS machine is off, Nigerian Pidgin processing waits until it becomes available again. Previously published content remains usable.
- Decision: If a processing provider's free quota is exhausted, pause the affected work, show the reason, retain successful outputs, and allow staff to retry when quota is available again. This does not authorize paid fallback or automatic paid-tier upgrades.
- Decision: In addition to current online-visitor and narration-listener counts, the Monitoring dashboard shows backend status, MongoDB connection status, Python-worker status, and translation/audio task progress and success/failure status.
- Reason: User approved all three rows of the proposed operating table.
- Affected artifacts: FEAT-003, FEAT-005, FEAT-006; future processing status and retry behaviour, worker coordination, dependency monitoring, dashboard views and acceptance criteria.
- Boundary: No specific queue, scheduler, heartbeat protocol, health-check endpoint, or dashboard transport was selected by this approval.
- Still pending: Detailed update intervals for system/task status, stale-presence timeout, offline package update/deletion propagation, narration-duration tolerance, and normal-performance acceptance targets.

## DEC-032 Offline language transition, package updates, and deleted POIs

- Date: 23 October 2026.
- Topic: Approval of the three proposed offline-data lifecycle behaviours.
- Decision: When connectivity is lost while the tourist uses another language, switch the interface and POI descriptions to English and show offline mode. Stop any narration in another language that is currently playing; the tourist presses Play to hear the downloaded English version.
- Decision: Notify the tourist when a new offline-data version is available. The tourist explicitly starts the download. Preserve the old package until the replacement has completely downloaded, consistent with DEC-028.
- Decision: A fully disconnected device may continue showing a previously downloaded POI that a Manager has since marked deleted. After the device reconnects and synchronizes deletion status, hide that POI from the map, search, and suggestions. Keep the underlying database record under DEC-018.
- Reason: User approved all three rows of the proposed offline lifecycle table.
- Affected artifacts: FEAT-001, FEAT-002, FEAT-003, FEAT-004; future language switching, narration controls, package update UX, deletion synchronization, and online/offline acceptance cases.
- Boundary: This approval does not choose a cache, storage schema, package format, or synchronization protocol. It does not authorize physical database deletion.
- Still pending: Language selection when connectivity returns; permissible package size and download/preparation time; narration-duration tolerance; behaviour of a selected navigation destination that is later deleted; remaining data and performance criteria.

## DEC-033 POI radius scope, narration duration, and staff interface language

- Date: 23 October 2026.
- Topic: Remaining POI metadata, narration acceptance range, and staff interface language.
- Decision: Remove the separate radius for each POI from the initial FEAT-004 scope. Retain the shared three-kilometre, straight-line nearby-suggestion radius confirmed in DEC-011 and DEC-012.
- Decision: Accept narration lengths from ninety to one hundred fifty seconds per POI/language around the two-minute target, allowing natural speech across languages.
- Decision: Use English for the Admin and Monitoring interfaces. The separate sixteen-language online tourist-interface requirement remains under DEC-030.
- Reason: User selected radius option A, accepted the ninety-to-one-hundred-fifty-second range, and selected English for both staff dashboards.
- Affected artifacts: FEAT-001, FEAT-003, FEAT-004, FEAT-005, FEAT-006; future POI data requirements, narration-duration checks, dashboard text, and acceptance criteria.
- Supersedes: The per-POI radius metadata mentioned in the initial feature description. This is a requirement-interview clarification before design or database-schema approval.
- Still pending: Normal-operation performance targets, package-size/preparation constraints, remaining offline-routing feasibility, and final requirement-summary confirmation.

## DEC-034 Performance acceptance targets

- Date: 23 October 2026.
- Topic: Approval of proposed performance acceptance thresholds.
- Decision: Under the confirmed load of up to fifty concurrent tourists, at least ninety-five percent of measured operations must meet these targets: interactive map screen within ten seconds; POI search or nearby suggestions within two seconds; narration starts within three seconds of Play; walking-route calculation or recalculation after deviation within five seconds.
- Conditions: Backend is already awake, required data and GPS position are available, and online operations have stable network connectivity. Offline package downloading and the accepted Render cold-start delay are measured separately rather than included in these thresholds.
- Reason: User approved the performance table and its stated measurement conditions.
- Affected artifacts: FEAT-001, FEAT-002, FEAT-003; future performance requirements, browser/device test plan, load testing, and acceptance criteria.
- Boundary: These are approved targets, not observed performance or passed tests. They do not establish specific network bandwidth, phone hardware, sampling plan, browser versions, or an offline routing implementation.
- Still pending: Test-device and network specifications, download/preparation size and timing constraints, offline-routing feasibility, and final requirement-summary confirmation.

## DEC-035 Missing routes, GPS interruption, and stale presence

- Date: 23 October 2026.
- Topic: Approval of the three proposed failure-handling rules.
- Decision: If no walking route can be found, inform the tourist and allow retry or selection of another POI.
- Decision: If GPS becomes unavailable during navigation, retain the route and last known location, show that GPS is unavailable, and resume location updates when GPS returns. The retained position is not presented as a current position.
- Decision: After ninety seconds without a browser presence signal, remove that browser/device from the current online-visitor and narration-listener counts. Paused narration continues to count while the browser continues sending presence signals, consistent with the earlier listener-lifecycle decision.
- Reason: User approved all three rows of the proposed error-handling table.
- Affected artifacts: FEAT-001, FEAT-002, FEAT-006; future route-error UX, GPS status, presence expiry, and acceptance cases.
- Boundary: This selects visible behaviour and a stale-presence timeout, not a heartbeat transport, storage mechanism, or routing engine. The thirty-second dashboard refresh remains unchanged; the expiry does not guarantee immediate detection of a disconnected browser.
- Still pending: Offline reopening expectations, representative test devices, package-size and preparation constraints, offline-routing feasibility, and final requirement-summary confirmation.

## DEC-036 Offline reopening and delegated measurement choices

- Date: 23 October 2026.
- Topic: Offline restart acceptance, representative test devices, and package sizing.
- Decision: After the complete offline package has downloaded, closing and reopening Vinlook without Internet must still support map viewing, POI search, walking navigation, and English narration.
- Decision: The user delegates selection of representative common-market test devices to the assistant; no exhaustive device-by-device support list is required. Chrome on Android and Safari on iPhone remain the confirmed browser targets.
- Decision: Measure the offline data before proposing a download-size limit. No numeric size limit has been approved.
- Reason: User answered yes to offline reopening, delegated device selection, and explicitly requested data measurement.
- Authorization boundary: Public-data research, sizing scripts and local measurement artifacts are authorized for this assessment. This does not select an offline routing implementation, approve a complete architecture, or start application implementation before the requirement-confirmation gate.
- Still pending: Actual measured component sizes, representative device selection and eventual physical-device validation, complete offline-package feasibility, and final requirement-summary confirmation.
- Measurement follow-up: docs/research/offline-data-measurement.md records an actual polygon-based PMTiles extract of 32,087,959 bytes and raw OSM highway-source extract of 12,737,308 bytes. The latter is not a selected or validated pedestrian graph. Audio, final graph/runtime and other assets remain unmeasured; no complete-package size or approved cap is claimed. DEC-037 records the delegated device selection.

## DEC-037 Representative test-device selection under DEC-036 delegation

- Date: 23 October 2026.
- Topic: Practical Android and iPhone reference devices.
- Selection: Samsung Galaxy A35 5G with Chrome and iPhone 13 with Safari as representative physical-device test targets. Record the actual OS and stable browser versions at test execution.
- Authority: User explicitly delegated representative device selection in DEC-036. This is an assistant selection under that delegation, not a separate user confirmation or a result of completed tests.
- Boundary: Does not limit functional support to two models, prove compatibility with all common phones, require a purchase, authorize paid testing services, or establish a minimum supported OS version. No Vinlook physical-device test has been performed.
- Evidence: Device-source links and measurement limitations are recorded in docs/research/offline-data-measurement.md.
- Still pending: Physical-device availability and validation during implementation/testing; final offline engine/data and package sizing; final requirement-summary confirmation.

## DEC-038 Project-wide Waterfall, full-data Day 5, and acceptance authority

- Date: 23 October 2026.
- Topic: Organisation of project phases, the first runnable checkpoint, and human acceptance authority.
- Decision: Apply Waterfall to the whole project (option 1A). Requirement and Design must be approved before application coding. Runnable checkpoints take place during Implementation; formal Testing and Deployment acceptance follow the project-wide phase sequence.
- Decision: Select the full-data, real-integration option for Day 5 (option 2B): fifteen POIs, all sixteen confirmed languages, and real integrations functioning from the first checkpoint. The breadth-complete, depth-minimal executable-prototype definition remains in force. Do not silently substitute a reduced one-POI/two-language dataset or simulated external services.
- Calendar implication: Day 5 is 26 October 2026. This does not move Day 1, extend the thirty-five-day deadline, waive the phase-approval gates, or demonstrate that the target is feasible or complete.
- Decision: Duy is the person who approves project phases and performs final acceptance (option 3A). No lecturer/co-approver is required by this selection. This project acceptance responsibility does not assign a production Staff/Manager account.
- Reason: User explicitly answered 1A, 2B, and 3A to the immediately preceding clarification group.
- Affected artifacts: Future requirement confirmation, phase deliverables and approval gates, checkpoint acceptance, risk assessment, milestone scopes and thirty-five-day planning.
- Risk: Requirement and Design approvals, content preparation and review for fifteen POIs and sixteen languages, provider availability/quotas, and unvalidated offline routing all precede or constrain the full-data Day 5 target. Record this as a schedule/feasibility risk; do not claim successful integrations, approved content, passed tests, or a guaranteed delivery date.
- Boundary: The choice does not itself approve the forthcoming Requirement Summary, Design, detailed day-by-day plan, or milestone scopes beyond the specified first-checkpoint conditions. Final Day 35 acceptance still covers all approved requirements and quality targets.
- Still pending: Remaining requirement clarifications and the overall REQUIREMENT READY FOR CONFIRMATION summary; Design decisions and feasibility verification; detailed milestone and task approval.

## DEC-039 Offline scope, tourist-location history, and staff audit visibility

- Date: 23 October 2026.
- Topic: Approval of the three proposed data and access rules.
- Decision: Offline capability covers the approved tourist-facing functions. Admin, Monitoring and translation/audio processing require Internet connectivity. Do not extend the tourist offline requirement to disconnected staff mutations or content generation.
- Decision: Use tourist location for nearby discovery and navigation, without storing movement history in the application database. Monitoring displays usage counts and status, not the location of individual tourists.
- Decision: Work-session history records the actor, time, action, related POI and result. Staff can view their own work-session history; Managers can view the history of all employees.
- Reason: User approved all three rows of the immediately preceding proposed rules table.
- Affected artifacts: FEAT-001, FEAT-002, FEAT-003, FEAT-005 and FEAT-006; future offline boundaries, location-data handling, audit requirements and authorization checks.
- Boundary: This confirms business information and visibility rules, not a database schema, identifier format, retention period, transport or visitor-location display. It does not select a routing engine or establish that third-party infrastructure never processes request metadata.
- Still pending: Account recovery/disable requirements and notification channels; remaining requirement confirmation and later Design choices.

## DEC-040 Account recovery, Staff suspension, and notification channels

- Date: 23 October 2026.
- Topic: Approval of the three proposed account-management and notification rules.
- Decision: Staff who forget their password contact a Manager for identity verification and receive an expiring, single-use recovery code, then set their own new password. Recovery of a Manager who loses access follows a team operating procedure that Duy must approve.
- Decision: Managers may lock and unlock Staff accounts. Locking removes Staff access even from an already logged-in session; retain the employee's work history.
- Decision: Show account-approval, content-processing and offline-update statuses inside the application. Automated email, SMS and push notifications are outside the educational project's approved scope.
- Reason: User approved all three rows of the immediately preceding proposed account and notification rules.
- Affected artifacts: FEAT-003, FEAT-005 and FEAT-006 as applicable; future recovery, authorization revocation, account-status UX, operating documentation and acceptance cases.
- Boundary: In-application status display does not implicitly add a persistent notification inbox. This decision does not choose code lifetime, delivery tooling, token storage/revocation design, a password hashing library, or the Manager recovery procedure. No account credentials have been generated, changed or delivered.
- Research reference: OWASP Forgot Password Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html, consulted 23 October 2026 for identity verification and expiring single-use recovery identifiers. Other recommendations in that source are not automatically adopted as product requirements.
- Still pending: POI restoration and associated-media retention, data backup/recovery requirements, overall requirement confirmation and later Design decisions.

## DEC-041 POI restoration, project-period retention, and manual backups

- Date: 23 October 2026.
- Topic: Approval of the three proposed restoration and data-preservation rules.
- Decision: Only a Manager may restore a logically deleted POI. Restore it to draft status; it must be reviewed again before publication under the existing complete-sixteen-language publication rule.
- Decision: Throughout the thirty-five-day project and subsequent seven-day optimization period, retain logically deleted POI records, associated content/images/audio required for restoration, and staff work-session history. Do not automatically purge these data during that period.
- Decision: Manually back up the database and approved images/audio to a team computer before each MVP checkpoint. Perform at least one restoration trial before final acceptance. The detailed method must be approved in Design.
- Reason: User approved all three rows of the immediately preceding proposed restoration, retention and backup table.
- Affected artifacts: FEAT-003, FEAT-004 and FEAT-005; future POI lifecycle, retention, backup/recovery procedures, checkpoint quality checks and final acceptance evidence.
- Boundary: No backup has yet been made or restored. This does not select a database export tool, backup format, access/encryption mechanism or automatic paid backup service. The project-period retention rule does not authorize physical POI-record deletion after the period ends and does not create an indefinite all-revision archive requirement.
- Still pending: Overall requirement confirmation and subsequent Design decisions, including backup implementation and verification.

## DEC-042 Diagram/testing tools and deferred Design decisions

- Date: 23 October 2026.
- Topic: Approval of the three proposed preparation choices before the overall requirement-summary gate.
- Decision: Use PlantUML for Use Case, Activity, Sequence and Class diagrams; retain diagram source in GitHub and export readable images.
- Decision: Use Vitest for logic tests, Supertest for Express API tests, and Playwright for end-to-end tests. Physical-phone GPS and offline tests remain necessary.
- Decision: Resolve the offline routing engine, offline-package distribution, total package size, security mechanisms and backup implementation in Design. Present options and feasibility evidence for Duy's approval before application implementation.
- Reason: User approved all three rows of the preceding proposal, which explicitly identified unproven offline navigation and the full-data Day 5 schedule as risks.
- Boundary: This selects tools and the phase for remaining technical decisions. It does not approve an architecture, schema, exact package versions, installation, technical feasibility or a reduced requirement. No diagrams, application tests or application implementation have been created by this approval.
- Sources consulted: https://plantuml.com/ ; https://vitest.dev/guide/ ; https://github.com/forwardemail/supertest ; https://playwright.dev/docs/intro .
- Next gate: Present REQUIREMENT READY FOR CONFIRMATION and a consolidated summary; obtain Duy's explicit overall confirmation before PRD and subsequent artifacts.

## DEC-043 Overall requirement confirmation and authorization to prepare PRD

- Date: 23 October 2026.
- Decision: Duy confirms docs/requirement-summary-for-confirmation.md as presented under REQUIREMENT READY FOR CONFIRMATION and authorizes starting the PRD.
- Reason: User answered "có" to the explicit question asking whether to confirm that summary and begin PRD.
- Effect: The consolidated requirements from DEC-001 through DEC-042 are the baseline for PRD preparation. Previously recorded supersessions and exclusions remain applicable.
- Boundary: This is not approval of the PRD yet to be written, Design, schema, detailed milestones, assignments, implementation or deployment. Unresolved Design decisions and stated feasibility/schedule risks remain open.
- Next deliverable: PRD draft for Duy's review, with requirement IDs, feature mappings and acceptance criteria derived from the confirmed baseline.

## DEC-044 PRD v1.0 approval and User Story preparation

- Date: 23 October 2026.
- Decision: Duy approves docs/PRD.md v1.0 and authorizes creating User Stories from that PRD.
- Reason: User answered "có" to the explicit PRD-approval and User Story continuation question.
- Boundary: This does not approve the User Stories yet to be written, any Use Case decomposition, Design, assignments or application implementation. Design decisions and feasibility risks remain open.
- Next deliverable: User Story draft with requirement/feature/acceptance links, preconditions, business rules, priorities and dependencies for review.

## DEC-045 User Story v1.0 approval and microservices/CI-CD change request

- Date: 23 October 2026.
- Decision: Duy approves the existing thirty-four User Stories US-001 through US-034 and requests that the backend be built toward microservices, including CI/CD.
- Existing choices preserved: Express.js, MongoDB/Mongoose, JWT/RBAC, local Python worker, Docker/Compose, GitHub Actions, Vercel/Render, zero paid services, project-wide Waterfall and fixed dates remain unless separately changed by Duy. CI/CD and GitHub Actions were already selected; the new direction requires addressing them across service boundaries.
- Status: The user-requested architectural direction is authorized. CR-001 documents its impact. Exact service boundaries/count, ownership of data, communication, repository layout, deployment topology and pipeline release gates have not been chosen or approved.
- Artifact effect: Preserve PRD v1.0 and approved User Story v1.0 snapshots. PRD v1.1 adds REQ-031/032 and draft AC-031/032; User Stories v1.1 adds proposed US-035/036. Approval of the original thirty-four stories does not approve these new detailed acceptance criteria/stories in advance.
- Timeline: Do not silently extend dates or waive the Day 5 baseline. The required checkpoint for demonstrating the added architecture/CI-CD needs explicit clarification and impact review.
- Boundary: No service, gateway, broker, cluster, shared-schema arrangement, workflow, deployment or GitHub object is created by this decision. Design and application implementation gates remain in force.

## DEC-046 Microservices/CI-CD checkpoint and automated deployment

- Date: 23 October 2026.
- Decision: Microservices and CI/CD must be demonstrated at Day 5, 26 October 2026 (option 1A). The existing fifteen-POI/sixteen-language/real-integration Day 5 baseline and fixed Day 35 remain unchanged.
- Decision: CD deploys automatically when the approved checks and release conditions pass (option 2B). Do not require a new manual approval for each deployment as option 2A would have done. Project-wide Requirement/Design and applicable release/phase approvals must still precede implementation/release.
- Reason: User answered 1A and 2B to the request to approve the addition and select its checkpoint and release mode. Record the added requirement/story specification with these selections; do not interpret it as approving undisclosed architecture choices.
- Affected artifacts: CR-001, PRD v1.1 REQ-031/032 and AC-031/032, User Stories v1.1 US-035/036; their checkpoint and CD-mode blanks are resolved by this decision.
- Still pending: Service boundaries/count, data ownership, communication, repository/topology, exact checks/triggers and release configuration in Design; approval of proposed User Story to Use Case decomposition before detailed Use Cases.
- Boundary: No workflow, credentials, deployment, application code or approved Design exists as a result of these selections. Day 5 feasibility remains unproven and the Render Free shared-quota risk remains open.

## DEC-047 Use Case mapping approval

- Date: 23 October 2026.
- Decision: Duy approves the proposed mapping of 36 stories to 37 Use Cases, including splits and the distinction between 30 product flows and 7 operating/acceptance flows.
- Reason: User replied "duyệt" to the explicit mapping approval question.
- Next: Prepare detailed Use Case drafts for review. This does not approve detailed flows, diagrams or Design in advance.

## DEC-048 Detailed Use Case approval and Activity Diagram preparation

- Date: 23 October 2026.
- Decision: Duy approves docs/use-cases.md v1.0 (UC-001 through UC-037) and authorizes Activity Diagrams derived from those flows.
- Reason: User replied "duyệt" to the explicit detailed-Use-Case approval and Activity Diagram continuation question.
- Effect: Create ACT-001 through ACT-037 with one-to-one links to the approved UC IDs; retain PlantUML source and render diagrams locally for review.
- Boundary: Diagram approval, Use Case Diagram relationships, microservice boundaries, schema, API, deployment and application implementation remain unapproved. Rendering diagrams is not evidence of product test success.

## DEC-049 Activity Diagram approval and Use Case Diagram proposal

- Date: 23 October 2026.
- Decision: Duy approves ACT-001 through ACT-037 and authorizes proposing Use Case Diagrams with explanations of include/extend relationships.
- Reason: User answered "có" to the explicit Activity Diagram approval and Use Case Diagram continuation question.
- Boundary: Proposed diagram relationships require review. No undisclosed Design, service boundaries, API, database, implementation or deployment choice is approved by this decision.

## DEC-050 Independent processing-retry Use Case

- Date: 23 October 2026.
- Decision: Duy selects option B in response to the Use Case Diagram review: keep UC-013 and UC-014 independent; remove the proposed extend arrow and extension point. The presented views are retained with this correction.
- Reason: User answered "B" to the diagram-review and retry-relationship choice.
- Business interpretation: UC-014 starts from an existing failed/waiting job and requires the current authorized employee/work session and processing availability. It may occur later without retaining the original request or session.
- Effect: Update UCD-002, diagram status/explanations, and UC-014 preconditions. No include/extend or actor generalization is added to the diagram set.
- Boundary: Does not change publication gates, quota rules, permissions or approve an architecture/API/database. Next step is a Design proposal for user selection, not application implementation.

## DEC-051 Backend service boundaries and monorepo selection

- Date: 23 October 2026.
- Decision: Select D-001 option 1B: three Express services (Identity & Staff, POI & Content, Usage Monitoring) plus the existing local Python MMS worker. This is four backend/worker runtimes, not four Express services and not four Render deployments.
- Responsibilities selected: Identity & Staff handles accounts/RBAC, Staff state/recovery, daily work sessions and employee action history; POI & Content handles POIs, draft/publication/deletion/restoration, translation/audio processing and retry; Usage Monitoring handles browser presence/listener metrics and dependency status. Local MMS continues Nigerian Pidgin processing for POI & Content.
- Decision: Select option 2A: one monorepo in Dihoccode1/Vinlook for frontend/services/worker, with independent build/test/deploy units to be specified. Do not create additional repositories.
- Reason: User explicitly answered "1.B 2.A" to D-001 choices.
- Boundary: Database topology/credentials, interservice protocol, worker scheduling/security, exact folders, package tooling, API contracts, CI triggers and deployment topology remain pending. No service/app/workflow is implemented, no assignment or detailed plan is approved, and Design as a whole is not accepted yet.
- Unchanged: All functional/quality requirements, free-only operation, Day 5 microservices/CI-CD/full data, and automated CD after approved gates remain in force. The Render shared-hour limitation remains unresolved.

## DEC-052 Database isolation, REST/HTTPS and worker-pull design

- Date: 23 October 2026.
- Decision: Approve all three D-002 proposals: Production uses one Atlas Free cluster with three service-owned logical databases and appropriately restricted DB accounts; services do not directly read/write each other's databases.
- Decision: Use REST over HTTPS between services. Do not add a message broker or gateway at this stage. Long processing is tracked as work with status rather than holding a request open until synthesis finishes.
- Decision: The local Python MMS worker initiates API calls to POI & Content to obtain work and return results/status. Job state belongs to POI & Content. Worker does not directly access Atlas or independently publish POIs; no inbound tunnel to the team computer is selected.
- Reason: User approved the three proposals presented immediately before this confirmation.
- Boundary: No database/accounts/API/workflow is created. Names, collections/fields, environment separation, API contracts, authentication, polling/lease/retry values, audit consistency and deployment remain to be designed and approved. No Redis/Kafka/RabbitMQ/Kubernetes or paid infrastructure is authorized.
- Next: Propose authorization/revocation, durable audit delivery and safe worker job handling before schema/API specification. Design-wide acceptance and feasibility checks remain pending.

## DEC-053 Bcrypt and authentication/audit/job approval

- Date: 23 October 2026.
- Decision: User selects bcrypt (typed "brypt") instead of Argon2id and approves the remainder of D-003.
- Approved: Two-hour JWT in tab memory, no refresh token, current account/role/session checks; transactional outbox with potentially delayed audit visibility; worker lease and idempotent result handling.
- Boundary: Bcrypt cost, password policy, schema/API fields and parameters remain pending. No application implementation or Design-wide acceptance is implied.

## DEC-054 Data model and bcrypt/listener policy approval

- Date: 23 October 2026.
- Decision: User approves all three D-004 items.
- Approved: Collections, relationships and POI versioning as the basis for detailed specification; bcrypt cost 12 for benchmarking with explicit rejection above 72 UTF-8 bytes; unique browserId listener counts across simultaneous tabs, retaining individual playback records.
- Boundary: No benchmark has run. Unspecified constraints, indexes, states, API contracts and implementation remain pending. No Design-wide approval is implied.
- Next: D-005 field/index/state proposal for review.

## DEC-055 Detailed data constraints, indexes and states approval

- Date: 23 October 2026.
- Decision: Duy approves D-005, including proposed field constraints, indexes, state transitions and editVersion conflict detection.
- Decision: At most one working revision (draft or in_review) per POI; concurrent stale edits must report a conflict rather than silently overwrite; the previously published revision remains unchanged.
- Boundary: API contracts, unresolved security/worker parameters, deployment and Design-wide acceptance remain pending. No schema/database/application is implemented or benchmarked.
- Next: Present D-006 API contract outline and consistency/error rules for approval before detailed request/response specification.

## DEC-056 API outline and consistency rules approval

- Date: 23 October 2026.
- Decision: User approves all D-006 items A/B/C: endpoint/permission outline, error conventions, pagination 20/100, 30-second heartbeat, conflict handling, in_review edit lock, and Idempotency-Key for the listed mutations.
- Accepted boundary: A request that already passed authorization may complete if the account is locked while it is executing; account locking does not undo committed work.
- Boundary: Idempotency storage/expiry, detailed request/response contracts, unresolved security and worker parameters and overall Design remain pending. No API or deployment is implemented.
- Next: D-007 security and worker parameter proposal.

## DEC-057 Security and worker parameter approval

- Date: 23 October 2026.
- Decision: User approves all D-007 groups A/B/C, including password/recovery/JWT/rate-limit policies, authVersion and AuthRateLimit, per-caller credentials/CORS, worker lease/poll/reclaim limits, outbox retries and IdempotencyRecord with the presented retention/reconciliation rules.
- Boundary: Approval is of the documented design proposal, not evidence of implementation, provider support, load measurements or deployment feasibility. Manager recovery, detailed contracts, offline routing/package hosting and CI/CD topology remain open.
- Next: Present deployment and CI/CD topology with free-tier constraints for selection.

## DEC-058 On-demand deployment topology and CI/CD approval

- Date: 23 October 2026.
- Decision: User selects D-008 option 1-A and approves all remaining items.
- Approved: Local Development and on-demand Production with monitored free-tier usage; three separate Render Free services, Vercel frontend, Atlas/Cloudinary and local Python worker topology; proposed monorepo layout/npm workspaces and CI/CD release principles.
- Approved: Automated CD for hosted components; manual update of the local worker using the CI-checked packaged version and runbook.
- Boundary: No 24/7 guarantee, proven quota fit, actual workflows, hosting setup or deployment is implied. Offline routing/package distribution and remaining detailed Design still require resolution.
- Next: Review offline package/storage design and isolate the unresolved routing feasibility decision.

## DEC-059 Offline package design approval

- Date: 23 October 2026.
- Decision: User approves all three D-009 items: Service Worker/Cache Storage/IndexedDB package design with old-package preservation, conditional same-origin Vercel static distribution, and storage estimate/headroom/persistence/eviction handling.
- Boundary: Vercel distribution remains conditional on measured artifact and deployment limits. Routing engine/compiled graph, final package size, API details and physical-device tests remain unresolved. No application code or Design-wide approval is implied.
- Next: Present offline routing engine options and a bounded verification proposal.

## DEC-060 Offline routing direction A selection

- Date: 23 October 2026.
- Decision: User selects D-010 direction A: preprocessed OSM walking graph and JavaScript A* in a Web Worker.
- Interpretation: This selects the evaluation direction, not a proven engine, finalized walking profile/graph format or feasibility result.
- Pending: The separate question authorizing an isolated research harness during Design was not answered. Do not infer authorization for that code or product Implementation from the letter A.
- Effect: Prepare a concrete verification evidence plan; retain full coverage and routing requirements.

## DEC-061 Isolated Design feasibility harness authorized

- Date: 23 October 2026.
- Decision: User answers yes to creating/running an isolated technical prototype in Design for routing direction A.
- Scope: Research graph/harness, correctness/sizing/timing evidence; does not authorize product Implementation or deployment. Experimental profile assumptions must be documented and are not approved product rules.
- Boundary: Physical-device results may only be claimed when run on real devices. Final profile, graph format, snap/reroute thresholds and engine acceptance remain open.

## DEC-062 Available physical iOS test device

- Date: 23 October 2026.
- User reports an iPhone 11 Pro Max as the available test device.
- Use this physical device for the next iOS/Safari verification; record the actual iOS version and browser. Earlier iPhone 13 reference remains a historical planning choice, not a tested device.
- Android availability and physical-device results remain pending. No device test is implied by this report.

## DEC-062 Available physical routing test devices

- Date: 23 October 2026.
- User identifies iPhone 11 Pro Max and Samsung Galaxy Note20 Ultra as available devices.
- Effect: Use these as the actual representative physical test targets, superseding the previously delegated model selections. Intended browsers remain Safari on iPhone and Chrome on Android; record actual OS/browser versions before testing.
- Boundary: Availability is not evidence that any test has run or passed. No purchase or remote access is authorized or required.

## DEC-063 User-reported test operating systems

- Date: 23 October 2026.
- User reports iOS 26.5 on the iPhone 11 Pro Max and Android 17 on the Samsung Galaxy Note20 Ultra.
- Effect: Record these as user-reported test configuration, not independently verified compatibility or completed tests. Capture actual OS build/browser version with test evidence when the harness runs.

## DEC-064 Research harness Vercel publication authorized

- Date: 23 October 2026.
- Decision: User approves publishing the isolated routing test harness on free Vercel HTTPS for physical-device tests.
- Scope: Research-only static project, not product deployment or Design-wide acceptance. Do not add paid services or publish credentials.
- Status: Preparing deployment; no live URL confirmed yet.

## DEC-065 Research harness deployed to Vercel

- Date: 23 October 2026.
- Authorization: DEC-064 and user completed Vercel login as dihoccode1.
- Actual: Created research-only project vinlook-routing-research and deployed its static harness. Deployment dpl_E29F7JiL1oThvEU76icupc495h9F reported READY. Public alias https://vinlook-routing-research.vercel.app returned HTTP 200.
- Note: CLI attempted auto-detection of an unrelated parent GitHub remote Dihoccode1/PhamKhanhDuy; connection failed. This was not an intended repository selection. Deployment proceeded from the isolated local static folder; no successful GitHub connection or repository write is claimed.
- Boundary: Research deployment only; not product release, full CI/CD or acceptance of routing requirements. Mobile results and remaining correctness gates remain pending.

## DEC-066 User reports successful harness run

- Date: 23 October 2026.
- Observation: User reports that the published harness ran well.
- Evidence level: User-reported qualitative result; devices, online/offline modes, individual timing/error results and exported JSON were not specified in this message.
- Boundary: Do not infer all four device/mode combinations passed or that physical-device performance, route correctness and navigation acceptance gates are complete.

## DEC-067 Cross-OS qualitative confirmation and submitted result inspection

- Date: 23 October 2026.
- User reports successful operation on both operating systems.
- Actual submitted JSON: userAgent identifies Windows 10 x64 Chrome 155, not iOS/Android. All 31 comparisons agree, zero invalid graph paths, all A* queries under 5 seconds, p95 189.9 ms; one no-route case. Mode online/offline is not encoded.
- Evidence retained: docs/research/routing-spike/evidence/user-submitted-browser-result.json.
- Boundary: Preserve user-reported cross-OS success, but do not label this Windows file as mobile measurements or infer both offline reopen tests passed. Real walking profile/navigation acceptance remains open.

## DEC-068 iPhone browser result and reported offline preparation

- Date: 23 October 2026.
- Actual submitted JSON identifies iPhone OS 26.5.0 and CriOS 155 (Chrome on iOS), not Safari. 31/31 query comparisons agree, zero invalid graph paths, all under 5 seconds; p95 245 ms, graph load 2145 ms. Physical model is user-reported, not encoded by userAgent.
- User reports closing/reopening and Prepare offline harness still running after a Wi-Fi/mode change. Wording does not unambiguously establish both mobile data and Wi-Fi were disabled, nor that Run in Web Worker ran in that state. JSON does not encode network mode.
- Boundary: Accept measured iPhone Chrome algorithm result; Safari, Android and offline calculation evidence remain distinct pending items. Do not mistake Prepare for routing benchmark or infer network state from speed.

## DEC-069 User confirms offline routing benchmark completion

- Date: 23 October 2026.
- User answers that all results were received in response to the explicit question about Run in Web Worker after tab closure/reopening with airplane mode, Wi-Fi and mobile data disabled.
- Evidence: User-confirmed offline execution of all 31 queries in the current iPhone test context. The previously submitted iPhone Chrome JSON remains timing evidence for its recorded run; do not retroactively label that JSON offline or infer identical timings.
- Boundary: No Android-specific JSON, Safari-specific result, field-route correctness, live GPS reroute or full-product offline acceptance is established by this confirmation.

## DEC-070 Android verification waived by project lead

- Date: 23 October 2026.
- Decision: Duy explicitly requests skipping Android testing and treating that condition as accepted for process continuation.
- Recorded disposition: Android device verification is waived/accepted by Duy without measured Android evidence; it is not a fabricated executed/passed test.
- Effect: Android results are no longer a prerequisite for continuing the engine selection review. Performance and offline behavior on the Note20 Ultra remain unverified, with this limitation accepted by Duy.
- Boundary: Does not waive Safari, walking-profile/route correctness, live GPS guidance/rerouting or other engine acceptance conditions. Does not reduce Android product support requirements or approve overall Design/Implementation.

## DEC-071 Routing engine baseline and navigation policies approved

- Date: 23 October 2026.
- Decision: Duy approves all D-011 items. Select JavaScript A* over preprocessed OSM walking graph in a Web Worker as the Design baseline.
- Approved policies: GPS accuracy <=50 m; snap <=50 m; off-route >30 m over three consecutive valid fixes; at least 10 seconds between reroutes with one current calculation; arrival <=25 m with accuracy <=25 m; lost-GPS behavior as documented.
- Decision: Continue Design now, retaining Safari verification before release. Android waiver DEC-070 remains unchanged.
- Boundary: Technology selection is closed; field correctness, complete navigation, performance and release acceptance remain to be demonstrated. No Design-wide or product Implementation approval is implied.
- Next: Specify navigation contract and sequence, followed by remaining interface/data/security/operations Design artifacts.

## DEC-072 Navigation contract and edge-case behavior approved

- Date: 23 October 2026.
- Decision: Duy approves D-012, including UI/Worker messages, sequence/states and terminate/recreate cancellation rather than relying on a CANCEL message to interrupt synchronous A*.
- Decision: Stop navigation when an online-synced deletion makes the destination unavailable. Keep the active graph/destination snapshot during navigation; a new package applies to subsequent navigation, while received deletion tombstones still stop the current route.
- Boundary: No complete navigation implementation or acceptance test is implied. Design-wide approval remains pending.
- Next: Specify content/media processing and revision invalidation contracts.

## DEC-073 Content versioning, media and pipeline contract approved

- Date: 23 October 2026.
- Decision: Duy approves all D-013 items, including sourceVersion/textVersion/entrance additions, immutable input snapshots and invalidation rules, processing/retry/result contracts, restricted signed uploads and immutable published media references with server validation.
- Approved media proposal: JPEG/PNG/WebP thumbnails <=2 MB and <=1600x1600; MP3 mono target 64 kbit/s, <=3 MB and 90-150 seconds, subject to integration and quality checks.
- Boundary: No provider quota/locale/voice quality, generated audio or storage fit is proven; no product Implementation or Design-wide approval is implied.
- Next: Propose Manager recovery and backup/restore operating design.

## DEC-074 Manager recovery and backup/restore design approved

- Date: 23 October 2026.
- Decision: Duy approves all D-014 items: local Identity operator bootstrap/recovery with one-use code and operator audit fields; maintenance window stopping all writers for coordinated three-DB/media backup; isolated restore trial without Production egress.
- Decision: Production restore needs separate target/snapshot/data-loss confirmation, state reconciliation and JWT signing-secret rotation as documented.
- Boundary: Encryption tool/key custodian and detailed commands remain unspecified. No credentials, recovery tool, backup or restore has been executed. Does not authorize arbitrary Production restores or open Implementation.
- Next: Propose UI wireframes and screen-state coverage before Design-wide review.

## DEC-075 UI wireframes and audio/editor lifecycle approved

- Date: 23 October 2026.
- Decision: Duy approves all D-015 items: visitor/staff screen structure and states, one active audio per tab with mini-player after closing the POI sheet, ending the old playback on Close or Play of a different POI, and unsaved-editor/conflict behavior without automatic merging.
- Boundary: Final visual styling, detailed Test Plan, remaining contracts/diagrams and Design-wide approval remain open; no product Implementation authorized.
- Next: Consolidate Design readiness and prepare consistent PlantUML sequence/class views derived from approved responsibilities.

## DEC-076 Sequence and class/responsibility views approved

- Date: 23 October 2026.
- Decision: Duy approves D-016: SEQ-001 through SEQ-009 and CLS-001 through CLS-004, grouped responsibility views with the documented UC/US/REQ traceability.
- Boundary: Conceptual responsibility modules do not mandate an OO framework/pattern. No product implementation, exhaustive API schema, test execution or Design-wide acceptance is implied.
- Next: Finish remaining API/data contracts and browser identity/monitoring semantics for review.

## DEC-077 Remaining API, browser identity and monitoring contracts approved

- Date: 23 October 2026.
- Decision: Duy approves all D-017 groups: identity payloads/validation and Staff-only registration/Manager-action restrictions; public POI and deletion snapshot API; UUID browser identity in visitor-only localStorage with the documented limitations.
- Decision: Approve telemetry end-reason/schema adjustments and out-of-order handling, health timeout/freshness, worker status and memory-only health samples as specified.
- Boundary: No implementation or new test results are implied. Locale/voice/provider placement and remaining Design integration/field catalog/test plan still require completion.
- Next: Specify translation/TTS adapter placement, locale/voice candidates and free-quota handling.

## DEC-078 Translation/TTS adapter placement and integration policies approved

- Date: 23 October 2026.
- Decision: User selects D-018 option B: Gemini/Azure adapters within POI & Content, Python local worker for MMS.
- Decision: Approve all remaining D-018 items: candidate locale/voice registry and versioning, Gemini model pinning after actual Free-tier validation, concurrency one per adapter, FFmpeg for MMS and documented quota/quality safeguards.
- Boundary: Candidate support and real account quota/model/region remain to be verified; no provider credentials, integration tests or product Implementation exist by this decision.
- Next: Prepare Test Plan and traceability with explicit proposed/executed/waived evidence levels.

## DEC-079 Test Plan, test catalog and traceability approved

- Date: 23 October 2026.
- Decision: Duy approves D-019, its 52 TC catalog and 37-UC RTM, proposed performance sampling and acceptance gates.
- Boundary: This approves test specifications, not product test results. NOT RUN/BLOCKED/WAIVED evidence states remain unchanged; Android waiver is not expanded. No assignments, Issues, code or Design-wide acceptance are implied.
- Next: Resolve remaining runtime/dependency/backup configuration choices before consolidated Design review.

## DEC-080 Product language, tooling and backup-key custody approved

- Date: 23 October 2026.
- Decision: User selects D-020 option A: JavaScript ESM/JSX/JSDoc, with Python worker unchanged, and approves all remaining items.
- Approved: Proposed Node24 LTS/tooling/dependency/version policy and UI baseline; 7-Zip 7z AES-256 with encrypted filenames, Duy as backup-key custodian. Backup execution responsibility remains unassigned.
- Boundary: No package versions have been installed/pinned for the product, no backup password generated and no product scaffold authorized by this decision alone. Design-wide gate and task/Issue planning remain pending.
- Next: Consolidate Design dossier, field/API catalog and explicit pre-implementation/pre-release conditions for phase review.

## DEC-081 Design phase acceptance and transition to planning

- Date: 23 October 2026.
- Decision: Duy approves D-021, including consolidated data catalog, reclaimCount/audio dependency metadata additions and the documented disposition of remaining verification work.
- Phase: Design baseline accepted. Transition to Product Backlog, GitHub Plan, 35-Day Plan and Implementation Planning.
- Boundary: Product acceptance/release gates remain pending. No product coding until task readiness, confirmed task/Issue/AC and approved planning/assignments; no automatic repository writes or member assignments are implied.
- Next: Inspect actual Vinlook repository read-only, draft dependency/effort-aware backlog and schedule with explicit feasibility risks and proposed assignments for Duy to approve.

## DEC-082 Backlog/assignment/GitHub plan approved; retain full Day5

- Date: 23 October 2026.
- User response 1.A / 2.A / 3.A: interpreted as approval of backlog/proposed assignments/reviewers and P-002 GitHub Plan, and explicit choice of recovery option A retaining full Day5 scope/date.
- Effect: Baseline task and responsibility proposals are approved for planning; investigate a recovery plan, do not silently apply checkpoint-scope change B. The earlier 35-day simulation is not accepted as a compliant Day5 commitment.
- Boundary: Approval does not make low-confidence estimates a delivery guarantee, prove missing resources ready, create actual Issues/assignments or open unrestricted product coding before readiness/Issue gates.
- New input: User confirms no reusable source code beyond the routing harness. Provider account readiness question remains pending.

## DEC-083 Provider setup status confirmed

- Date: 23 October 2026.
- User confirms Atlas, Cloudinary, Render, Gemini API Free and Azure Speech F0 have not been set up.
- Effect: Provider-dependent integration/data-generation/deployment tasks are BLOCKED on account/resource/key/config readiness. Do not infer credentials, free-tier eligibility or tested integrations.
- Boundary: Does not authorize accepting new provider terms, enabling billing or paid tiers. Existing approved free-only service choices remain unchanged. Local documentation/scaffold planning can continue where task readiness permits.

## DEC-084 Atlas project reported and observed setup state

- Date: 23 October 2026.
- User reports logged in to Atlas project multi-narrow.
- Observed read-only: Project multi-narrow, Cluster0 Free, MongoDB8.0.34, AWS Hong Kong ap-east-1; console still displays deployment/configuration work and sample-data loading. No connectivity/integration test has been performed.
- Observed access: One SCRAM database user with atlasAdmin on all resources; one active current-IP /32 allowlist entry, no allow-all entry shown. Do not record IP/password values in this log.
- Effect: Account and Free cluster existence verified; resource readiness is partial, not yet service-isolated integration readiness. Existing admin user is not selected as an application credential.
- Boundary: Read-only inspection only. No user/role/network modification, backup activation, sample-data deletion or credential handling performed.
- Next: Present exact three logical DB/user names and readWrite scopes for approval, then user-controlled password entry and per-action access confirmation.

## DEC-085 Atlas per-service database/user names and scopes approved

- Date: 23 October 2026.
- Decision: User approves vinlook_identity/vinlook_identity_app, vinlook_content/vinlook_content_app, vinlook_usage/vinlook_usage_app, each readWrite only on its respective database.
- Prepared UI: First-user form configured for vinlook_identity_app, readWrite scoped to vinlook_identity with collection blank, restricted to Cluster0. No broad built-in role selected.
- Boundary: Password field left untouched; Add User not submitted. User must enter/store credential and complete creation. No database/collection/connection test or successful user creation claimed.

## DEC-086 User-created Identity credential verified in Atlas UI

- Date: 23 October 2026.
- User reports Identity user created; UI confirms vinlook_identity_app with SCRAM and readWrite@vinlook_identity, one-cluster resource scope.
- Next form prepared: vinlook_content_app with readWrite@vinlook_content and Cluster0 restriction; password untouched, no Add User submission by agent.
- Boundary: Role assignment observed, not successful application connectivity or cross-database isolation test. No secret was requested/read/copied.

## DEC-087 User-created Content credential verified in Atlas UI

- Date: 23 October 2026.
- User reports Content created; UI confirms vinlook_content_app with SCRAM/readWrite@vinlook_content and one-cluster scope. Identity scoped user remains present.
- Prepared Usage form: vinlook_usage_app, readWrite only vinlook_usage, all collections within that DB, restricted Cluster0. Password untouched; creation not submitted.
- Boundary: No credential read/copied, no successful app connectivity/cross-DB isolation test claimed.

## DEC-088 Atlas three service users observed; proceed to Cloudinary onboarding

- Date: 23 October 2026.
- User reports Usage created. UI confirms vinlook_identity_app/readWrite@vinlook_identity, vinlook_content_app/readWrite@vinlook_content, vinlook_usage_app/readWrite@vinlook_usage, each SCRAM and one-cluster scope.
- Status: Three service-scoped users observed. No application connectivity, transaction or cross-DB permission test has run. Cluster console still shows provisioning work; do not label full integration ready.
- Next: Opened Cloudinary Free registration page for user-controlled signup/login and terms acceptance. No signup submitted, no account/resource/key provisioned by agent.

## DEC-089 Cloudinary account/free plan observed

- Date: 23 October 2026.
- User reports Cloudinary login. Read-only UI confirms Image and Video Free, $0; MediaFlows Free, $0; Total $0. Product environment displayed as opyup67u. Observed credits usage0.16/25 at check time, not a future usage guarantee.
- Upload presets list shows ml_default Signed with overwrite=true/use_filename=true/unique_filename=false. No preset changed or selected for application uploads; immutable asset policy still requires correct signed parameters/app validation.
- Boundary: No API key/secret opened/copied, no account plan/resource/preset mutation or real upload/delivery test. Account/free plan verified, integration remains not tested.
- Next: Gemini account/free-tier/model quota setup review, user-controlled credential creation.

## DEC-090 AI Studio existing account/projects observed

- Date: 23 October 2026.
- Read-only observation: AI Studio is already signed in and lists three existing projects, each displaying Free tier after loading. No Vinlook-specific project was selected or created.
- Boundary: Do not adopt an unrelated existing project/key without approval. No API key value opened/copied, no billing enabled, no generation request made. Account badge does not substitute for per-project API tier/quota evidence.
- Proposed next step: Dedicated Gemini project named vinlook for the selected service, requiring user confirmation of name/scope before creation; user controls API credential creation/storage.

## DEC-091 Dedicated Gemini project approved and created

- Date: 23 October 2026. User approved dedicated project vinlook.
- UI confirmed creation, project ID gen-lang-client-0426420304, Free tier. Billing was not enabled. Existing unrelated projects were not adopted.
- Rate Limit page explicitly switched to vinlook. All models view showed Gemini 2.5 Flash: 5 RPM / 250K TPM / 20 RPD; Gemini 2.5 Flash Lite: 10 RPM / 250K TPM / 20 RPD; Gemini 3.1 Flash Lite and Gemini 3.5 Flash Lite: each 15 RPM / 250K TPM / 500 RPD. These are observed limits, not guaranteed throughput or validated translation quality. No model selected or generation request made.
- API-key dialog prepared for vinlook with non-secret label vinlook-content-dev. User must perform credential creation and private storage; agent has not created/read/copied a key. No integration test yet.
- Proof: setup/gemini-vinlook-free-project.png; setup/gemini-key-prepared.png.

## DEC-092 Gemini API key creation reported by user

- Date: 23 October 2026. User reports API key created following the vinlook project handoff.
- Credential value not inspected, copied, or added to repository. Credential creation is user-reported; no API connectivity, model selection, translation quality or batch quota test has run.
- Next: Azure Speech account/subscription eligibility and F0 availability inspection. No paid plan, billing activation or resource creation authorized by this status report.

## DEC-093 Azure login observed; subscription prerequisite unresolved

- Date: 23 October 2026. User reports Azure login; portal confirms authenticated session.
- Read-only subscription list in current Default Directory shows 0 of 0, role/status all. This does not establish that no subscription exists in any other directory.
- No Speech resource created, F0 region/eligibility not yet verified, no paid billing/trial/terms activated.
- Proposed path: user checks eligibility for Azure for Students (official no-credit-card offer) or identifies an existing subscription in another directory. Student verification and acceptance remain user-controlled; credits do not replace the project's F0-only restriction.

## DEC-094 User requests simpler TTS replacement

- Date: 23 October 2026. User has no student verification account and requests replacing the service with a simpler alternative.
- Stop Azure onboarding; evaluate local MMS in existing Python worker. This is not acceptance of missing languages, wrong dialects, reduced quality or unmeasured performance.
- CR-001: setup/tts-replacement-proposal.md. Sixteen-language mapping, Egyptian Arabic / Portuguese Portugal and Traditional Chinese handling need evidence before final replacement registry. No new provider account, paid service or product code introduced.

## DEC-095 MMS replacement evaluation approved; coverage gap found

- Date: 23 October 2026. User approves evaluating local MMS replacement.
- Retrieved official Meta README and parsed 1144 code variants (not a claim of 1144 distinct languages). Thirteen of sixteen candidate codes listed; cmn, jpn, arz not listed. por is generic Portuguese, not verified Portugal accent. ara does not independently verify MSA pronunciation.
- Evidence: setup/mms-language-coverage.json. No model weights downloaded or inference benchmark run. Do not designate MMS alone as a complete sixteen-language replacement.
- Proposed follow-up: evaluate Gemini TTS as a complement using existing project; Google documents TTS generation and style/accent controls. Model/locale/quality/quota approval and sample validation still required. No API call made or credential inspected.

## DEC-096 Gemini TTS complement evaluation approved

- Date: 23 October 2026. User approves extending Gemini evaluation from translation to complementary TTS.
- Official documentation confirms candidate language coverage and Standard Free pricing for gemini-3.8-flash-tts. Candidate registry: 12 MMS / 4 Gemini languages, with Portuguese Portugal and all sample quality still pending verification. See setup/hybrid-tts-registry-review.md.
- Quota risk: observed 10 RPD implies 60 full Gemini outputs consume at least six daily allocations assuming one request/output, before retries/samples. Full Day5 scope remains approved but not supported by this quota path; do not label feasible.
- Candidate model/voice/media handoff are proposed, not approved production configuration. No API key read, synthesis, model installation, product code, or integration test performed.

## DEC-097 Hybrid candidate registry approved; research kit prepared

- Date: 23 October 2026. User approves candidate registry and sample preparation. 12 MMS / 4 Gemini, gemini-3.8-flash-tts / Kore candidate and local conversion handoff approved for evaluation; release remains gated by actual samples and resource evidence.
- Actual GitHub Issue #2 created: https://github.com/Dihoccode1/Vinlook/issues/2, assigned Duy, scope RSH-TTS-001. Four short Gemini sample requests budget, no automatic retries; no full dataset generation.
- Prepared synthetic locale fixtures, standard-library Python one-request runner, secret-safe output records and reviewer instructions in research/tts-spike. Syntax and four dry-run previews passed. No API call, credential inspection, model weight download or audio benchmark occurred.
- User may enter key privately in their own terminal's hidden prompt. Live quota check, locale-qualified review, MMS exact revisions/environment and performance still pending. Day5 quota risk unchanged.

## DEC-098 Continue approved TTS research preparation

- Date: 23 October 2026. User approves continuation; no user-reported audio results inferred.
- Resolved twelve official Meta checkpoint IDs to immutable revisions, each listing safetensors. Evidence: research/tts-spike/mms-checkpoints.json.
- Created CPU English/Pidgin probe with fixed seed and sampled current-process RSS metrics. Syntax verified; no synthesis result yet.
- Separate workspace virtualenv created. Initial PyPI installation timed out; retry downloaded dependencies and remains in installation step at last observation. Requested pins: torch2.14.1, transformers5.20.2, psutil7.2.2, numpy2.5.4. Runtime import/inference not yet verified. Do not claim installation complete.
- Gemini sample generation and qualified locale review still pending; no credential accessed.

## DEC-099 MMS English/Pidgin short inference observed

- Date: 23 October 2026. User approves continuation. Prior dependency installation verified successful; versions locked in research/tts-spike/requirements-lock.txt.
- Actual CPU English and Nigerian Pidgin synthesis succeeded, one short sample each. English6.016s / synthesis3.409s / peakRSS604389376bytes; Pidgin6.304s / synthesis3.699s / peakRSS616562688bytes. RSS is sampled current process, not whole-machine consumption; imports excluded from load timer.
- WAV structural/nonzero-signal checks passed. Results: research/tts-spike/mms-short-sample-results.json. Audio private-results/mms-eng.wav and mms-pcm.wav. No qualified listening review, full narration performance or twelve-language acceptance claimed.
- Gemini four sample requests still not run; no key accessed. RSH-TTS-001 remains open, partial technical evidence only.

## DEC-100 User approves short samples; longer English technical probe

- Date: 23 October 2026. User approves presented English/Pidgin short samples. Do not infer a qualified Pidgin linguist review.
- Extended local English research with synthetic general-guide text, sequential sentence-group synthesis and direct PCM concatenation, no silence padding or speed alteration. First15paragraph attempt159.12s exceeded150s; retained original evidence. Revised13paragraph fixture138.944s fits duration window, synthesis56.964s, sampled process peakRSS788525056bytes (752MiB), cached model load1.127s.
- Both WAV structural/nonzero signal checks passed. Evidence: research/tts-spike/mms-long-sample-results.json; private audio in private-results/mms-eng-long.wav. No semantic completeness, join smoothness, locale quality, MP3 conversion or offline/Cloudinary integration acceptance inferred.
- Four Gemini samples remain pending private user execution/key entry; no API call or key access occurred. RSH-TTS-001 remains open.

## DEC-101 User approves longer English sample

- Date: 23 October 2026. User approves presented 138.944-second English sample. Record user approval without inferring formal transcript/linguist review or all-language acceptance.
- Local representative research milestone has actual English/Pidgin audio and long English duration/resource evidence. Stop repeating these benchmark runs absent a new failure/change.
- Next dependency: four Gemini locale samples on vinlook Free project. Runner is prepared and must receive the key privately in the user's own terminal. No key requested in chat or read from local secrets. User has not reported executing these samples; do not interpret approval as test execution.
- No further architecture approval is required to execute the four already approved sample requests within budget. RSH-TTS-001 remains open pending actual Gemini output and reviews.

## DEC-102 First Gemini sample returned HTTP400; diagnostics corrected

- Date: 23 October 2026. User supplied actual PowerShell output; local zh-Hant.json matches model gemini-3.8-flash-tts / Kore, HTTP400,0.503s, no audio.
- Current request matches the official speech-generation REST example inspected today. HTTP400 alone cannot distinguish malformed input, key eligibility or model/account restrictions. Do not assert invalid key or API schema as proven cause.
- Original runner omitted provider error detail, leaving diagnosis incomplete. Added bounded JSON extraction of status/message only, explicit key/pattern redaction, trimmed key input and one explicit --retry-failed diagnostic attempt preserving original record. No automatic retries or model/billing changes.
- Sanitization test and four request previews passed offline. No agent API request/key inspection. User-run one diagnostic call needed to obtain new sanitized evidence; if executed, counts as an additional attempted request beyond initial four-sample estimate. Stop further locale calls on unresolved failure.

## DEC-103 Existing second Gemini attempt inspected; read-only diagnostic prepared

- Date: 23 October 2026. User's latest invocation stopped before key entry/API call because zh-Hant-attempt2.json already exists. Its actual content records another HTTP400 at06:14:45UTC,0.241s, providerError error_body_unavailable. Do not delete/overwrite or infer success.
- Parser now handles UTF8 BOM, gzip and non-JSON error snippets with bounded secret redaction. Offline JSON/BOM/non-JSON/gzip sanitization tests passed. No cloud request performed by agent.
- Prepared research/tts-spike/check_gemini_model.py: one documented GET models/gemini-3.8-flash-tts with private hidden key entry; no generation, automatic retry or record overwrite. This separates model/auth reachability from the synthesis payload without a third synthesis attempt. User execution pending.
- Source: https://ai.google.dev/api/models. Model metadata success would not itself prove TTS generation or locale quality.

## DEC-104 Gemini metadata HTML400; control experiments and local input checks

- Date: 23 October 2026. User's read-only metadata call returned HTTP400 text/html with minimal Error400 page. No audio requested. This differs from a structured Google API error; cause remains unproven.
- Agent control calls without real credentials: unauthenticated models list and selected-model GET returned JSON403 PERMISSION_DENIED; an intentionally invalid nonsecret placeholder key returned JSON400 API_KEY_INVALID through the research virtualenv. No user key inspected or used. Agent execution path may differ from user's ordinary terminal; controls do not rule out a user-side proxy/path issue.
- Updated check_gemini_model.py: local key-format boolean checks only, no actual key/prefix/hash/length logged; nonstandard input stops before transmission. A standard39character AIza shape is a diagnostic assumption, not proof a key is valid or invalid under all Google credential schemes.
- If shape passes, records no-key control status/content-type in the same user-terminal invocation and then the single metadata GET. No synthesis or automatic retry. Invalid-input no-network branch and syntax tested. Next evidence requires user private execution, not another approval or credential disclosure.

## DEC-105 Authorization key accepted; four Gemini TTS samples observed

- Date: 23 October 2026. User explicitly supplies credential and authorizes direct tests. Do not reproduce credential in documents. Entered through hidden prompts; not persisted to files or command arguments. Credential disclosed in chat; user should replace/revoke it before further use.
- Correction: prior AIza-only local validation was too restrictive. Official Gemini API key guide documents authorization keys and new AI Studio defaults. Removed prefix/length rejection; retain basic safe-header checks. AQ-pattern redaction added and offline-tested.
- Metadata GET succeeded for gemini-3.8-flash-tts. User authorization permitted one explicit third Mandarin attempt preserving errors, followed by three remaining approved language samples; all returned audio. Mandarin7.32s/7.85s wall; Japanese8.84s/8.497s; EgyptianArabic8.64s/8.007s; Portuguese9.04s/6.921s. No automatic retry, model/voice/billing change.
- Four WAV mono PCM16/24kHz/nonzero-signal checks passed. Source records and audio private-results, shareable metrics research/tts-spike/gemini-short-sample-results.json. Actual locale/dialect/accent review and full90–150second synthesis remain pending. Earlier HTML400 root cause not proven; do not retroactively attribute it to the prefix validator.
- RSH-TTS-001 now has representative MMS metrics and four actual Gemini short outputs, but quality/full product integration checks remain open. Stop additional calls with disclosed key. Source: https://ai.google.dev/gemini-api/docs/api-key .

## DEC-106 User approves Gemini short-sample results

- Date: 23 October 2026. User approves presented four Gemini TTS short-sample results. Record approval without inventing language-qualified review of all four recordings or full-duration acceptance.
- Hybrid replacement now has actual sample generation evidence on both providers. Keep quality, all-twelve-MMS language coverage, full Gemini narration, MP3 conversion, upload/offline and durable-job integration gates open.
- No additional calls using the chat-disclosed key; replacement/revocation is user-controlled and remains unconfirmed.
- Continue external-service readiness with Render account/workspace inspection only. Do not create hosted services before repository Dockerfiles/commands/CI contracts are ready or enable any paid resource.

## DEC-107 Render account/workspace readiness observed

- Date: 23 October 2026. Render opened and existing login session automatically resolved to dashboard; stale login-button action did not execute. Read-only My Workspace plan observed Hobby, no card on file, current/projected month charges$0.
- Billing snapshot: Free Instance Hours0.68/750 workspace-shared, bandwidth0/5GB, pipeline0/500min. These are point-in-time counters, not future cost guarantees. Billing counts2included services; overview has unrelated existing projects and deployed Docker service core-probe (Oregon). Do not infer these resources belong to Vinlook or modify/delete them.
- Account readiness verified, no Vinlook service created, GitHub access/region/Free instance/CD deployment not verified. Need usable Vinlook repository Dockerfiles and approved CI/CD bootstrap before provisioning.
- Proof: setup/render-workspace-billing.png. No plan/billing/payment/security mutation.

## DEC-108 Credential rotation reported; documentation bootstrap prepared

- Date: 23 October 2026. User reports old Gemini key deleted and replacement created, then requests continuation. Record user report; do not inspect replacement key or reuse old credential.
- Read-only repository remains empty. Actual Issue1 state is closed/completed, without commits/PR evidence. Corrected local issue map; do not treat task as delivered or reopen it silently.
- Prepared README, CONTRIBUTING, .gitignore, bootstrap approach/review package and hashed104text-file publication allowlist. Automated credential-pattern scan reported no findings; this is not complete human/security review.
- Proposed empty-main exception A: exact README-only initial seed, then codex/task-001-docs-baseline branch/draftPR for baseline; Tú human review, no auto-merge. Alternative B: externally review entire root baseline before initial commit. No choice previously selected, no remote commit/permission/settings change performed.
- Product scaffold/Docker/CI tasks remain dependent on baseline delivery/review and actual Issues. Do not write application code under docs-only TASK001.

## DEC-109 Empty-repository bootstrap A approved

- Date: 23 October 2026. User selects A: exact README-only initial main commit; then codex/task-001-docs-baseline branch and draftPR with approved documentation/conventions; Tú human review; no auto-merge.
- Authority is limited to documentation bootstrap. No product implementation, CI/deployment execution, permission change or paid resource authorized by this choice.

## DEC-110 Actual bootstrap commits and draft PR created

- Date: 23 October 2026. Executed approved A in Dihoccode1/Vinlook only. README seed on main: e9f378c5284f8918e6b254c80a0fa616c273d2f7. Created codex/task-001-docs-baseline and baseline commit0afb8e72c928c7325d53f722da9f8f3f9ede06f4.
- Actual draft PR3: https://github.com/Dihoccode1/Vinlook/pull/3, open, not merged,103added files.104total files including README. Local/remote Git blob hashes compared exactly with original line endings preserved; zero missing/extra/mismatched files. Initial verification used newline-normalizing read_text and reported mismatches; corrected verifier to compare the exact uploaded bytes before creating the baseline commit.
- Tree contains reviewed documentation/conventions only, no application code or workflow. Credential pattern scan had no findings. No product CI/deployment/tests or formal human review claimed.
- Actual issue map updated with seed/branch/PR links. Issue1 remains previously closed; task acceptance still pending Tú review and merge. No reviewer notification, permission/settings change, automatic merge or resource deployment performed.

## DEC-111 User reports Tu review; formal result not yet observed

- Date: 23 October 2026. User reports Tú has reviewed PR3. Read-only GitHub inspection: PR open, draft=false, head5751c4f4bfb6aeeed8d0f45d74c1fc753d52b968, mergeable=true/clean. Reviews, inline threads and merged discussion lists are empty.
- Distinguish user-reported review activity from an observed approval. No change request observed, but absence of comments does not establish approval. Clarify review outcome / ask reviewer to submit the completed review, rather than re-request the review itself.
- No PR commit, merge, reviewer impersonation or permission change performed. Keep reviewed head unchanged while result is clarified.

## DEC-112 User confirms review and own merge; PR merge verified

- Date: 23 October 2026. User confirms review and that they merged PR3. GitHub reports closed/merged=true, mergedBy Dihoccode1, mergedAt06:46:48UTC, merge commitc32f98b07fa9866993f9639930ee1f6a03e82ed8. Reviews collection remains empty: review is user-reported, not fabricated GitHub approval. Do not require duplicate review or perform another merge.
- Documentation baseline predecessor delivered/merged. Created actual TASK002 Issue4: https://github.com/Dihoccode1/Vinlook/issues/4 with scaffold AC and boundaries. Approved owner Tú/reviewer Duy recorded; remote assignment not applied without assignability evidence. No product scaffold code or CI/deployment run yet.
- Local mapping updated. These tracking changes are local and will accompany the next reviewed implementation branch, not a direct unreviewed main push.

## DEC-113 TASK002 checked/closed by user; scaffold implemented for review

- Date: 23 October 2026. User reports checking and closing TASK002; GitHub confirms Issue4 closed, but remote main initially still contained documentation only and no related PR. Record approval of task contents, not prior code completion. Continued implementation under the approved task/AC.
- Prepared npm workspaces, React19.3.1/Vite8.3.5/ReactRouter8.5.0 DataMode/Tailwind4.3.3 preview, three independent Express5.3.0 ESM scaffolds and reserved local worker boundary. Node24.18.1/npm11.16.0 pinned; dependency lockfile committed for review. No shadcn component dependencies added until needed; component directory and alias prepared.
- Registry versions/peers checked. Initial full npm packument read timed out; compact latest metadata succeeded. npm install and clean npm ci succeeded; audit reported0vulnerabilities at install time. Clean-install frontend build, backend syntax checks and real three-listener HTTP404/header/closure smoke passed. Backend paths intentionally unimplemented; no fake business features or health contract outside TASK003.
- Browser first127.0.0.1 attempt timed out. After restarting dev outside sandbox, localhost:5173 AX showed actual rendered heading and unavailable-guide notice. Screenshot follow-up failed with session binding error; no screenshot or mobile visual acceptance claimed. No provider calls, secrets, database operations, CI/CD deployment or Docker creation.
- Owner/reviewer approval remains Tú/Duy; AI-produced scaffold requires human review. Existing closed Issue is retained without silently reopening. Do not call TASK002 Done before PR review/merge.

## DEC-114 TASK002 implementation PR created

- Date:23October2026. Actual scaffold commit a8b0368a2019ba4831e2cc05f2ea9fc59cc0b7a2 on codex/task-002-scaffold. Draft PR5: https://github.com/Dihoccode1/Vinlook/pull/5, open/not merged,29changed files. All29Git blob hashes matched uploaded local content. Main untouched.
- Clean install/build/listener smoke passed as DEC113. Temporary Vite server stopped after browser check; no hosted deployment. Human review pending despite already-closed Issue4. No automatic merge, false review submission or permission change performed.
- PR/map links recorded locally after commit to preserve review head; will accompany later reviewed tracking changes.

## DEC-115 TASK002 review reported and merge observed; TASK003 Issue opened

- Date:23October2026. User reports review. PR5 GitHub inspection shows closed, draft=false, merged=true, merge commita6f7cbbc819f7dc91795951b2106770acff408f3. Reviews/threads/comments empty; do not fabricate a formal approval. No extra merge or duplicate review requested.
- TASK002 scaffold delivery now merged, with earlier clean-install/build/smoke evidence. No Docker/CI/deployment inferred.
- Created TASK003 Issue6: https://github.com/Dihoccode1/Vinlook/issues/6. Runtime config/env boundaries/minimal health; dependency TASK002 satisfied. Exact names/required sets/health visibility must reconcile approved contracts before implementation. No TASK003 code yet. Local issue map updated; tracking will accompany next review branch.

## DEC-116 TASK003 scope approved; missing minimal runtime/health contract proposed

- Date:23October2026. User reports checking and approving TASK003. Existing design reviewed: staff-protected /monitoring/health/jobs, secret ownership, on-demand checks and timeouts approved; exact public process-health paths/env names/defaults not specified.
- Prepared planning/task003-config-health-contract.md with A recommended process config + liveness200/readiness503until verified, or B livenessonly/defer readiness. Required production host/port, native env-file loading and safe response envelopes stated explicitly.
- Master Prompt Rule1 requires asking before unspecified API/deployment contract choices. Prepared concrete proposal; no TASK003 code or provider/secret mutation. Existing TASK002 code remains unchanged while contract decision is pending.

## DEC-117 TASK003 contract A approved

- Date:23October2026. User selects A from planning/task003-config-health-contract.md, including NODE_ENV/HOST/PORT semantics, native env-file loading, public health paths/envelopes and truthful503 readiness. No real dependency success or production deployment implied.

## DEC-118 TASK003 implemented and verified locally

- Date:23October2026. Implemented service-owned Zod4.6.7 process config, filtered nonsecret return fields, safe ConfigurationError before socket bind, optional Node24env-file start/dev commands and nonsecret per-service examples.
- All three services return liveness200 and readiness503 DEPENDENCIES_UNVERIFIED with server UUID/no-store; protected monitoring/business routes remain404. No DB/provider sampling or background keep-awake traffic added.
- npm install updated exact dependency/lockfile and reported0vulnerabilities. Final15runtime/health tests passed: default/production config, invalid input matrices/redaction, invalid actual entrypoints, native env-file loading/override precedence, real HTTP routes/no reflection/no cache. Frontend build/backend syntax and three-listener scaffold smoke passed. No hosted/Docker/CI/CD acceptance or real dependency readiness claimed.
- Branch codex/task-003-runtime-health created from merged TASK002 main a6f7cbbc819f7dc91795951b2106770acff408f3. Draft review PR pending creation; no direct main push or auto-merge.

## DEC-119 TASK003 draft PR created

- Date:23October2026. Actual commit f693192c7ce575a3132ae0f5dc0388d54af5a5ab on codex/task-003-runtime-health. Draft PR7: https://github.com/Dihoccode1/Vinlook/pull/7, open/not merged,24changed files. All24uploaded blob hashes matched local content.
- Fifteen runtime/health tests, build and scaffold smoke passed; evidence/limits included in PR. No direct main update, provider credential use, background listener left running or deployment. Await human review/merge; do not claim Task003Done yet.
- Actual PR/head links recorded locally after publication to preserve review head. These metadata updates accompany a later reviewed change.

## DEC-120 TASK003 merge observed; TASK004 opened

- Date:23October2026. User reports review/merge PR7. GitHub confirms closed/merged=true, mergedBy Dihoccode1, merge commit99128915198ddbeaa3837983fc9b2b457040f5a7. Prior15tests/build/smoke evidence applies to reviewed head; no new deployment inferred.
- Created TASK004 Issue8: https://github.com/Dihoccode1/Vinlook/issues/8, assigned Duy; reviewer Tú per approved backlog. Scope service-owned Identity schemas/index declarations/synthetic fixtures. No auth endpoint or production DB mutation. Exact catalog reconciliation and isolated DB execution evidence required; no TASK004 code yet.
- Local tracking updated for next reviewed branch. No additional merge, credentials or paid resource changes.

## DEC-121 TASK004 reviewed; concrete schema gaps proposed

- Date:23October2026. User reports review of TASK004. Inspected consolidated catalog and D004/005/007/014/017: core entities approved; AuditLog target account/reason required by D014 omitted from consolidated fields, result shape/hash encodings/rate indexes/operator alias representation unspecified.
- Read-only Docker check first denied in sandbox, elevated read succeeded engine29.8.2. No container or Atlas mutation. npm registry Mongoose9.11.3 engine compatible with Node24.
- Prepared planning/task004-identity-schema-contract.md: proposed explicit collection names, targetAccountId/reason, typed result, operator aliases, hash encodings/rate unique+TTL indexes, strict/no-auto-schema-write settings and isolated replica-set test plan. Existing behavior preserved; scope/data/API changes require Rule1 confirmation. No TASK004 schema code written pending A/details approval.

## DEC-122 TASK004 schema contract approved

- Date:23October2026. User approves planning/task004-identity-schema-contract.md in full: collection names, AuditLog.targetAccountId/reason, typed result, operator aliases, hashing encodings/rate indexes and strict/no-auto-write settings. Test-only local replica set authorized; no Atlas/real staff accounts.

## DEC-123 TASK004 schema and real Mongo evidence

- Date:23October2026. Added Identity-owned Mongoose9.11.3 models and synthetic fixtures; no service startup DB connection or auth endpoint added. Catalog updated with approved Identity addendum. Default query projections and serialization hide hash/key fields; safeIdentityError excludes original values and errors.
- Official mongo8.0.34 image pulled, digestsha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907. Created only vinlook-task004-mongo-20261023, labelvinlook.task=TASK-004, port published only on127.0.0.1; fresh named test DB/replica set verified before explicit index creation. No Atlas/other existing containers modified.
- Seven schema test groups passed. Five actual Mongo integration groups passed: concurrent normalized email dedup, staff/day uniqueness, audit event dedup/hash projections, rate window uniqueness/index TTL inspection and multi-collection transaction rollback. Recovery expired record retained (no TTL), demonstrating API expiry enforcement is still required. No exact TTL cleanup timing or atomic recovery API behavior claimed.
- Package install reported0audit vulnerabilities; full regression and task-owned container cleanup to be recorded before PR. Readiness remains503; schema presence is not a verified DB-backed service.

## DEC-124 TASK004 regressions passed and disposable resources cleaned

- Date:23October2026. Final7schema/5actualMongo tests and15existingruntime tests passed; frontend/backend build and three-listener smoke passed. Catalog encoding update initially failed on Windows default charmap, then reapplied explicitly as UTF8; no source/model change or hidden failed test was ignored.
- Verified task container3f7e694df97be60763855f396399d15a9bcd5c0f4b5e72034136161a9fa36d8c, task label and only expected anonymous Mongo mounts; stopped/removed that container with its own volumes. No other containers/volumes touched; image retained. No test listener remains active.
- Model documentation explains query-update/document-hook limits, explicit index migration, API enforcement still pending and no readiness promotion. Reproduction/actual checks in planning/task004-implementation-evidence.md. Review PR pending creation.

## DEC-125 Final Identity validation refinement and index recheck

- Date:23October2026. Actor/issuer conditional checks use document path validators instead of pre-validation hooks, reducing dependence on asynchronous validation hooks. Supported async validate/save remains the intended API; deprecated validateSync probe was removed from tests after framework warning.
- Seven model groups passed with final validator implementation. A fresh task-owned vinlook-task004-mongo-final with same pinned image/loopback/label passed all5Mongo groups again. Exact returned container ID/label/mounts verified, then only that final disposable container and its anonymous volumes removed. No test DB/container retained or Atlas changed.
- This recheck was justified by validator changes; prior runtime/build/smoke evidence remains valid because runtime/HTTP files were unchanged. Main remains untouched, review PR to follow.

## DEC-126 TASK004 draft PR created

- Date:23October2026. Actual commit62f2e43d13dc0075c7814ff6c47beb2b2619ff8e on codex/task-004-identity-models. Draft PR9: https://github.com/Dihoccode1/Vinlook/pull/9, open/not merged,14changed files. All14uploaded local/remote blob hashes matched. Main untouched.
- Seven schema/five Mongo/fifteen runtime tests and build/scaffold checks passed; actual evidence and limits included. Test-only Mongo containers/anonymous volumes removed; no Atlas/production writes or auth API/deployment. Await Tú human review/merge; no review notification or auto-merge sent.
- Local map includes actual PR/head links after publication; tracking updates accompany a later reviewed change to preserve this review head.

## DEC-127 TASK004 review reported and merge verified; TASK005 opened

- Date:23October2026. User reports Tú review. GitHub PR9 is closed/merged=true, draft=false, merge commit607e5d7e72ba79fcb61da169babf390905e59e55. Formal reviews/threads empty; retain user-reported reviewer evidence, not fabricated formal approval. No additional review/merge requested.
- TASK004 model/index delivery merged with prior real test evidence. Actual TASK005 Issue10 created: https://github.com/Dihoccode1/Vinlook/issues/10, ownerDuy/reviewerTú. Scope registration/pending, active login, bcrypt12/JWT/rate counters. Exact env/claim/proxy/index contracts must be reconciled before coding; no TASK005 implementation yet.
- Local tracking updated for later reviewed branch. No Production credential/database/deployment change.

## DEC-128 TASK005 confirmation acknowledged; concrete auth contract prepared

- Date:23October2026. User reports Tú confirmation then requests next step. Treat as task-scope confirmation, not delivered code. Reconciled UC019/020 and D006/007/017 against existing process config/model boundaries.
- Prepared planning/task005-auth-contract.md with unified A: Identity-only secret env/encoding, index/startup gate, safe auth payload/statuses, explicit JWT namespace/claims, fixed-window durable rate races, CORS/proxy safety and fixture evidence. Existing password/bcrypt12/token2h/rate thresholds preserved. No guessed Render trust ranges, keys requested or product code change.
- Under Rule1, genuinely missing schema/API/deployment semantics in this contract await user approval before implementation. Current review/merge of prior tasks remains valid.

## DEC-129 TASK005 contract A approved

- Date:23October2026. User approved A in full. Implement the exact secret configuration, auth endpoints, bcrypt12, JWT2h, durable fixed-window rate limits, CORS/proxy and read-only index gate in planning/task005-auth-contract.md.
- Isolated local fixture tests and draft PR are authorized. No Atlas mutation, real account provisioning, deployment or merge is implied. Human reviewer remains Tú.

## DEC-130 TASK005 implemented and verified in isolated Mongo

- Date:23October2026. Added strict pending signup/active login, official bcrypt6.0.0 cost12, jose6.2.13 HS256 two-hour claims, separate private config/read-only startup catalog gate, exact-origin CORS and durable HMAC fixed-window rate counters with bounded insert races.
- Actual4auth helper/10real Mongo HTTP/7schema/15runtime groups passed; build and three-service smoke passed. Wrong-login race5×401/3×429; IP budget30of40 admitted; new Node process retained Mongo registration limit. Final local bcrypt sample203ms hash/202ms compare, not hosted load acceptance.
- Restricted-shell loopbackEACCES was resolved by authorized local execution; no false pass. Both exact task-owned Mongo containers/anonymous volumes removed after ID/label/mount verification. No Atlas, production user or paid resource changed. TASK006 authority/RBAC, migration, proxy/deployment/CI remain open; readiness stays503. Full evidence in planning/task005-implementation-evidence.md; draft review PR follows.

## DEC-131 TASK005 draft PR created

- Date:23October2026. Draft PR11 https://github.com/Dihoccode1/Vinlook/pull/11 opened on codex/task-005-auth, head9df30e5b5cd99ccfb143a209a1b0b10e946af966,20changed files. All20published blob hashes matched local inventory. Main unchanged.
- Actual36passed groups/build/smoke and remaining gates included. Await designated Tu human review/user merge; no reviewer message or auto-merge sent. Postpublication tracking kept locally for a later reviewed change to preserve this review head.

## DEC-132 TASK005 merge verified; TASK006 issue and concrete contract prepared

- Date:23October2026. User reports review/merge. GitHub PR11 verified merged=true; main is merge ce8e050449eaf784928d8c70ab79544a7ca62b04. Formal reviews list empty; preserve user-reported review rather than inventing GitHub approval. TASK005 deliverable complete with actual prior36passed groups/build/smoke evidence.
- Actual Issue12 TASK006 opened, ownerDuy/reviewerTu. Prepared planning/task006-authorization-contract.md: current authority/me/internal endpoint, scoped caller header/env and old-key expiry, read-only current VN-day session, role gates and fail-closed3000ms service adapters. Existing D003/D007/D017 approvals retained. Genuinely missing concrete transport/config/error details await contract A approval under Master Prompt Rule1 before TASK006 code. No production credential/DB/deployment or reviewer notification changed.

## DEC-133 TASK006 contract A approved

- Date:23October2026. User explicitly approved A and implementation/tests. Covers current DB principal/me/internal authorization, scoped caller credentials/rotation, current VN-day session context, role gates and3000ms fail-closed adapters in planning/task006-authorization-contract.md. No production secret/provisioning/deployment permission implied.

## DEC-134 TASK006 implementation and actual isolated evidence

- Date:23October2026. Added current-principal/me/internal authorization, scoped caller credentials with absolute previous-key expiry, read-only current Vietnam-day session context, server role/session gates and separately owned Content/Usage fail-closed adapters. No positive authority cache, retry, redirects or cross-service Mongo access. Deadline3000ms covers response body.
- Actual5adapter/config +8real Mongo authorization +36regression groups passed (49total), build and three-service smoke passed. Fixture lock/version/role changes affect subsequent requests; Vietnam midnight/context, credential expiry/removal and both timeout phases checked. All3task-only test containers/anonymous volumes removed after exact ID/label/mount checks. No production/provider/paid changes. Full evidence planning/task006-implementation-evidence.md.
- Draft PR and Tu human review follow. Actual business endpoints/Manager mutations/session lifecycle/audit/production migration/deployment/CI remain pending; readiness503.

## DEC-135 TASK006 draft PR created

- Date:23October2026. Draft PR13 https://github.com/Dihoccode1/Vinlook/pull/13, branch codex/task-006-authorization, head0e2c88215b64bd5c88d4bd11390ec7c11365aa3d;22changed files and22blob hashes verified. Main untouched.49passed groups/build/smoke and remaining gates documented.
- Await Tu human review/user merge; no reviewer notification or auto-merge sent. Postpublication map/log updated locally for the next reviewed change, preserving this review head.

## DEC-136 TASK006 merge verified; TASK007 scope and contract prepared

- Date:23October2026. User reports review/merge. PR13 verified merged=true and main99b63dd14162cc751c94ca0e8fa8260850eb2a15; formal reviews empty, preserve user report. TASK006 complete with prior49passed groups/build/smoke evidence.
- Actual Issue14 TASK007 opened,ownerDuy/reviewerTu. Prepared planning/task007-session-contract.md for missing endpoint/status/retry semantics, manual-close reason in local atomic audit, original openedAt preservation and midnight reconciliation timestamps/races. Existing one-session/Vietnam-day requirement retained; no new scheduler/paid resource. Contract A awaits approval under Master Prompt Rule1 before product code. Local tracking to accompany next reviewed branch.

## DEC-137 TASK007 contract A approved

- Date:23October2026. User explicitly approved A (implement/test). Includes same-ID reopen/original openedAt, strict close reason in atomic local AuditLog transaction, logical midnight and lazy/startup materialization, timestamps/error/retry/race semantics. Existing TASK006 read-only session context is explicitly extended for prior-day reconciliation. No production database/credential/deployment permission implied.

## DEC-138 TASK007 implementation and actual evidence

- Date:23October2026. Added daily open/close/reopen endpoints, original openedAt/ID preservation, atomic manual-close AuditLog reason and approved midnight/startup/current-principal reconciliation. Unique account/day retained; bounded3contention attempts; unknown commit not replayed. No schema/index/dependency/env additions.
- Actual9session +49regression groups passed (58total), build and three-service smoke passed. Real Mongo rollback on audit failure,8concurrent open/close, exact Vietnam midnight and new Node startup reconciliation verified. All3task-only Mongo containers/own volumes removed after exact ID/label/mount checks. No Atlas/real staff/hosting/paid changes. Full evidence planning/task007-implementation-evidence.md.
- Await Tu review/user merge after draft PR. History/audit ingestion/Manager APIs/UI/deployment/CI remain pending; readiness503.

## DEC-139 TASK007 draft PR created

- Date:23October2026. Draft PR15 https://github.com/Dihoccode1/Vinlook/pull/15, branch codex/task-007-sessions, head9fbbc6d4a77b8d5eba36b8fed7d48c625c8be075;16changed files, all16blob hashes verified. Main untouched.58passed groups/build/smoke and remaining gates included.
- Await Tu human review/user merge; no reviewer notification or auto-merge sent. Postpublication tracking retained locally for a later reviewed change to preserve this review head.

## DEC-140 TASK007 merge verified; TASK008 issue/contract prepared

- Date:23October2026. User reports approval/merge. PR15 merged=true and maina3d46e9214b083f628dd48a80e756ada40939175 verified; formal reviews empty, retain user-reported review. TASK007 complete with prior58passed groups/build/smoke evidence.
- Actual Issue16 TASK008 opened with approved ownerTu/reviewerDuy; no remote assignment/identity impersonation or reviewer notification. Prepared planning/task008-audit-contract.md: Content-only append/dedup receiver, original session/delayed-event rules, action/result registry, Staff/Manager history filtering and bound signed cursor. Missing concrete data/API details await A approval under Master Prompt Rule1 before code. No production/paid/deployment changes. Local tracking accompanies next reviewed branch.

## DEC-141 TASK008 contract A approved

- Date:23October2026. User explicitly approved A (implement/test). Covers Content-only receiver/action/result schema, exact replay/conflicting event IDs, delayed original session and historical actor handling, Staff/Manager query scopes/filters and signed role/requester/filter-bound cursor, Manager authorized session reconciliation. OwnerTu/reviewerDuy retained; AI assistance does not impersonate either. No production changes implied.

## DEC-142 TASK008 implementation and actual isolated evidence

- Date:23October2026. Added Content-only audit receiver with original session/actor semantics, normalized replay/conflict detection, bounded insert races; Staff-own/Manager account+operator history with strict filters, signed requester/role/filter/endpoint cursor and authorized stale-session reconciliation. No schema/index/secret/dependency additions.
- Actual9audit +58regression groups passed (67unique total), build/smoke passed. Initial stopped Docker engine recovered through hidden existing Desktop startup; one initial child-start10s timeout recorded, unchanged separate runtime15/15 passed. Causes not invented; no skipped checks or timeout edits. All4exact task test containers/own volumes removed after ID/label/mount checks. No Atlas/real staff/paid/provider/deployment changes.
- OwnerTu/reviewerDuy retained, publication via Duy connector/AI not impersonated Tu authorship or human approval. Full evidence planning/task008-implementation-evidence.md; draft PR follows. Content outbox/sender/UI/operator writers/production/CI remain separate; readiness503.

## DEC-143 TASK008 draft PR created

- Date:23October2026. Draft PR17 https://github.com/Dihoccode1/Vinlook/pull/17, branch codex/task-008-audit-history, heade248b5b37f0130fa8226699488c46067c1eae312;13changed files, all13blob hashes verified. Main untouched.67passed groups/build/smoke, actual initial failures/rechecks and remaining gates documented.
- Approved ownerTu/reviewerDuy retained; publication via Duy connector/AI assistance not impersonation or human approval. Await Duy human review/user merge, no notification or auto-merge sent. Postpublication tracking retained locally for next reviewed change to preserve this review head.

## DEC-144 TASK008 user approval reported; merge pending

- Date:23October2026. User says approved. PR17 verified open,draft=true,merged=false,unchanged heade248b5b37f0130fa8226699488c46067c1eae312. Record Duy user-reported approval,not formal GitHub approval or merge. A provisional merge_commit_sha on an open PR is not merge evidence.
- Actual67passed groups/build/smoke evidence retained. Await user merge under established workflow; no auto-merge/reviewer message or Done claim. Local tracking only,published reviewed head unchanged.

## DEC-145 TASK008 merge verified; TASK009 issue/contract prepared

- Date:23October2026. User requests continuation. PR17 verified closed/draftfalse/mergedtrue and maine9b7bd5d83d44feeef066d02a6f863bcf3309707. Prior Duy approval report retained; no duplicate review requested. TASK008 complete with prior67passed groups/build/smoke evidence.
- Actual Issue18 TASK009 opened,ownerDuy/reviewerTu. Prepared planning/task009-staff-recovery-contract.md for exact Staff lifecycle/listing, code/reset state/error/transaction semantics, local audit and durable reset rate budgets. Newly proposed lock/issuance JWT invalidation enables serialized issuance/reset without new schema fields and is explicitly called out for approval. Missing concrete details await A approval under Master Prompt Rule1; no product code or production credentials changed.

## DEC-146 TASK009 contract A approved

- Date:23October2026. User explicitly approved A (implement/test), including lock/issuance JWT invalidation, version-write serialization, Staff listing, exact lifecycle state commands/local audit and15minute single-use code/password reset transaction, reset IP30 and account5failed/15minute counters. OwnerDuy/reviewerTu retained; no real Manager or production changes authorized.

## DEC-147 TASK009 implementation and actual isolated evidence

- Date:23October2026. Added Manager-only Staff list/approve/lock/unlock/code issuance and public atomic reset with approved authVersion revocation/serialization, raw-once32byte code/SHA256/15minute expiry/one-use, local account audit and reset IP30/account5fixed-window guards. No schema/index/secret/dependency additions; Staff cursor endpoint separately bound.
- Final10Staff groups +67regressions passed (77unique total), build/smoke passed. Earlier9group Staff run retained separately, not double-counted. Real Mongo concurrent issue/reset, actual bcrypt12 Unicode, expired-at-consumption rollback, audit-failure rollback, version bound, token invalidation and new-process rate persistence proved with synthetic fixtures. All6task-only containers/own volumes removed after exact ID/label/mount checks.
- No Atlas/real Manager/staff/provider/paid/hosting changes. Full evidence planning/task009-implementation-evidence.md. Operator bootstrap/issuance TASK010, UI/verificationdelivery/production/CI remain pending; readiness503. Draft PR for Tu review/user merge follows.

## DEC-148 TASK009 draft PR created

- Date:23October2026. Draft PR19 https://github.com/Dihoccode1/Vinlook/pull/19, branch codex/task-009-staff-recovery, head2c3830b326c342d7f1082e1d52d2824cb67feba4;13changed files, all13blob hashes verified. Main untouched.77passed groups/build/smoke and remaining gates included.
- Await Tu human review/user merge; no notification or auto-merge sent. Postpublication tracking retained locally for next reviewed change to preserve this review head.

## DEC-149 TASK009 merge verified; TASK010 issue/contract prepared

- Date:23October2026. User reports approval/merge. PR19 verified merged=true/draftfalse and maincb6ae68ef215d8da40a5c904b40d96ffd7029fbb; prior77passed groups/build/smoke evidence retained. TASK009 complete, no duplicate review requested.
- Actual Issue20 TASK010 opened,ownerDuy/reviewerTu. Prepared planning/task010-operator-contract.md: separate local operator URI/key verifier/alias, hidden TTY/default dry-run/explicit apply, verified target and namespaced bootstrap audit race guard, recovery transaction and separate Manager unlock command. Newly specified CLI/data/concurrency semantics await A approval under Master Prompt Rule1 before code. No actual operator assigned/secret/Manager/Atlas write; real operations require separate Duy authorization.

## DEC-150 TASK010 contract A approved

- Date:23October2026. User explicitly approved A (implement/test): private operator config, hidden TTY/default dry-run/explicit apply, verified target/namespaced bootstrap audit guard, recovery and separate unlock, bounded transactions and truthful failed audit. Scope limited to code and synthetic isolated tests,not actual operator/secret/Manager/Atlas provisioning. OwnerDuy/reviewerTu retained.

## DEC-151 TASK010 implementation and actual isolated evidence

- Date:23October2026. Added local operator CLI/private config/hidden TTY/default dry-run/explicit apply, namespaced bootstrap audit concurrency guard, operator recovery and separate unlock with atomic audit/version updates. No public route/schema/index/dependency; new operator-only env examples intentionally invalid. Runbook separates code availability from actual operator/target authorization.
- Initial Mongo1pass/6failures exposed parallel transaction preflight; changed queries to sequential, then fresh Mongo7/7passed. Operator unit/stream/actual help/nonTTY4/4 plus50relevant regressions passed (61unique), build/smoke passed. Actual human native TTY acceptance remains pending; injected prompts/streams not misrepresented. Full evidence planning/task010-implementation-evidence.md.
- All4task-only Mongo containers/own volumes removed after exact ID/label/mount checks. No actual operator/scoped DB identity/secret/Manager/Atlas/paid/hosting changes. Readiness503; actual operational use/UI/deployment/CI remain separate. Draft PR for Tu human review/user merge follows.

## DEC-152 TASK010 draft PR created

- Date:23October2026. Draft PR21 https://github.com/Dihoccode1/Vinlook/pull/21, branch codex/task-010-manager-operator, headb5c7918a1c773351c401520b0234282da5404b30;14changed files and14blob hashes verified. Main untouched.61relevant passed groups/build/smoke, corrected initial failure and manual TTY/real operation limits documented.
- Await Tu human review/user merge; no reviewer message or auto-merge. Native human terminal acceptance remains pending, no real operator/Manager/Atlas changes. Postpublication tracking retained locally for next reviewed change,preserving this review head.

## DEC-153 TASK010 code merge verified; TASK011 issue/contract prepared

- Date:23October2026. User reports approval/merge. PR21 verified mergedtrue/draftfalse and maine7d3327dc9d545e078f65c3606dd883ccee4f140;61relevant passed groups/build/smoke retained. Code merged, but native human TTY and real operational acceptance remain pending; merge is not device/terminal evidence. No repeat review requested.
- Actual Issue22 TASK011 opened with approved ownerTu/reviewerDuy,no remote assignment/impersonation. Prepared planning/task011-content-schema-contract.md: exact3Content collections/fields/assets/GeoJSON/review/version bounds and single working-state partial unique index. Missing concrete schema details await A approval under Master Prompt Rule1 before code. No actual POI/asset/Atlas/production changes. TASK011 independent of operator terminal gate.

## DEC-154 TASK011 contract A approved

- Date:23October2026. User explicitly approved A (implement/test): exact3Content collections/field bounds/GeoJSON/assets/16locales/review/version schemas and single cross-status partial unique working index, model/API/geography limits retained. OwnerTu/reviewerDuy; no actual POI/media/Atlas/provider mutation authorized. TASK010 human native TTY remains separate/pending.

## DEC-155 TASK011 implementation and isolated evidence

- Date:23October2026. Implemented approved Content POI/Revision/LocalizedContent schema factories, strict fields/assets/16locales and exact partial/unique/geo indexes; explicit Content Mongoose9.11.3 dependency reuses existing runtime. No API/startup DB connection/real seed/provider/Atlas change. OwnerTu/reviewerDuy retained.
- Disconnected7/7, actual Mongo6/6 and27relevant regressions passed (40unique groups); workspace build/three-service smoke passed. Actual concurrent draft/in_review unique slot and transaction rollback proved. Deliberate raw invalid-approved fixture demonstrates schema bypass, not full publication enforcement. Evidence planning/task011-implementation-evidence.md.
- Initial stopped Docker Engine and lost execution sessions retained honestly; unchanged checks rerun to confirmed exit0. Only exact task container/own volumes removed after ID/label/mount verification. Human review/merge pending; TASK010 native human TTY/real operations independently pending.

## DEC-156 TASK011 draft PR created

- Date:23October2026. Draft PR23 https://github.com/Dihoccode1/Vinlook/pull/23, branch codex/task-011-content-models, head56ac03c2f79124fab4e3fd5350c691da7bf4d6e4;14changed files and all14remote blob hashes verified. PR open/drafttrue/mergedfalse, main untouched.40relevant passed groups/build/smoke and remaining boundaries documented.
- Await Duy human review/user merge; approved ownerTu retained, no reviewer message or auto-merge. Postpublication tracking retained locally for next reviewed change to preserve review head.

## DEC-157 TASK011 merge verified

- Date:23October2026. User approved TASK011. GitHub PR23 verified merged=true,closed,draft=false; merge commit c1251196541b23958aca9a5448770ab09b5b9492. User approval recorded without inventing a formal GitHub review.40relevant passed groups/build/smoke retained; no repeated tests or review requested.
- Next planned task TASK012 draft save/conflict/invalidation API, ownerDuy/reviewerTu. Concrete API details and outbox/idempotency prerequisite boundaries still require a reviewable contract under Master Prompt Rule1 before implementation. TASK010 native human TTY remains separately pending.

## DEC-158 TASK011 issue closure and reported review

- Date:23October2026. User reports Tu review and calls closed item TASK012. Verified actual Issue22 is TASK011 and closed at2026-10-23T14:11:28Z; repository issue inventory contains no TASK012 issue. Recorded reported Tu review without changing approved ownerTu/reviewerDuy or fabricating formal approval. TASK011 closed;TASK012 remains planned,not implemented/closed.

## DEC-159 TASK011 closure confirmation

- Date:23October2026. User explicitly confirms Tu reviewed and closed TASK011. Issue22 independently verified closed at2026-10-23T14:11:28Z. This confirmation explicitly names TASK011; the TASK012 wording in DEC158 is not attributed to this message. User-reported Tu review supplements prior Duy approval without changing approved assignment or fabricating a formal GitHub review. TASK011 complete;TASK012 remains next planned work.

## DEC-160 TASK012 actual issue and prerequisite proposal

- Date:23October2026. Created actual Issue24 TASK012 with existing traceability/ownerDuy/reviewerTu. Detected omitted TASK015 prerequisite: approved mutation+outbox atomicity and create idempotency cannot be supplied by TASK011 three-model definitions or TASK008 receiver. TASK015 dependencies are merged; no cycle.
- Proposed A reorder TASK015 before TASK012 implementation; alternative B prepare TASK012 contract first, then fulfill TASK015 prerequisite. Full scope/impact/acceptance in planning/task012-prerequisite-proposal.md. Await user sequence decision under Master Prompt Rule1; no new schema/API/code/Atlas or unapproved assignment change.

## DEC-161 TASK015-first sequencing approved; contract prepared

- Date:23October2026. User selected A: TASK015 before TASK012. Updated TASK012 dependency/backlog/Issue24; actual Issue25 TASK015 created. Existing ownerDuy/reviewerTu retained. Scope/deadline unchanged, no schedule success inferred.
- Proposed concrete planning/task015-outbox-contract.md covers two owned models, atomic replay/outbox runner,24h replay/no TTL/in_progress quarantine, bounded authenticated sender/retry/lifecycle and isolated evidence. Await contract A approval under Master Prompt Rule1 before product code. No schema/Atlas/real credentials provisioned.

## DEC-162 TASK015 contract A approved and implemented

- Date:23October2026. User explicitly approved A implement/test: strict outbox/replay models, atomic runner,24h expiry/quarantine, bounded sender/retry/lifecycle. Added scoped primitives with no startup connection/public endpoints/new dependency/Atlas writes. OwnerDuy/reviewerTu retained.
- Final6durability+12actualMongo/HTTP+34relevant regressions passed (52unique); full workspace build and final Content build/three-service health checks passed. Actual Node restart, post-commit injected unknown acknowledgement, receiver dedup, expiry/concurrency/rollback/backoff/counter starvation evidenced. Initial Windows launch failure, fixture0/9 and sandbox35/40 followed by unchanged elevated40/40 retained honestly in planning/task015-implementation-evidence.md.
- All4exact task containers/own volumes removed after ID/label/mount checks. No real business endpoint/Atlas/provider/production changes, readiness503. Await Tu human review/user merge;TASK012 remains pending.

## DEC-163 TASK015 draft PR created and diff focused

- Date:23October2026. Draft PR26 https://github.com/Dihoccode1/Vinlook/pull/26, branch codex/task-015-content-durability, final head9b6e2ebb2dd920a5ebc5203aac6c6e649b37bb93;16final changed files and all16blob hashes verified. PR open/drafttrue/mergedfalse. Main untouched.
- Removed two locally existing but previously untracked large backlog documents from PR and restored prior development.md blob, leaving exact dependency/approved contract and evidence in focused planning artifacts/Issues24,25. Local planning edits retained; no product code changed after final tests. Await Tu human review/user merge, no auto-merge/reviewer message. Postpublication tracking remains local for next reviewed change.

## DEC-164 TASK015 merge verified

- Date:23October2026. User reports review and merge. PR26 verified closed/mergedtrue/draftfalse, merge commit7dcf6f4520286aaacb3bba108ab04a33e7b44ead.52relevant passed groups/build/health evidence retained, no duplicate tests/review requested or formal GitHub approval fabricated.
- TASK012 implementation prerequisite TASK015 now satisfied; detailed endpoint/version/invalidation contract still requires approval before code. No production/Atlas or operational acceptance inferred from merge.

## DEC-165 TASK012 draft API contract prepared

- Date:23October2026. Existing Issue24, ownerDuy/reviewerTu. TASK015 prerequisite merged. Prepared planning/task012-draft-api-contract.md with exact create/clone/PATCH/read shapes, revision.draft replay enum proposal, source/locale invalidation, no-op/conflict semantics, media verifier/runtime/index gates and explicit POI.mutationVersion schema amendment for parent concurrency.
- Await A approval under Master Prompt Rule1 before implementation. No new schema field implemented, API code, Atlas/provider call or production activation performed; new mutationVersion field awaits explicit approval, no no-op locking claim.

## DEC-166 TASK012 contract A approved and implemented

- Date:23October2026. User explicitly approved A implement/test, including POI.mutationVersion and revision.draft operation. Added protected create/clone/PATCH/locale/read with current authority/session, atomic outbox/replay and source/text invalidation preserving published graph; opt-in verified runtime no automatic schema/index/data repair. OwnerDuy/reviewerTu retained.
-4draft groups+14actualMongo/HTTP+40relevant regressions passed (58unique), full build/three-service health checks passed. Initial11integrationgroups passed then expanded14on fresh DB; no failures/double counting. True parent-write/delete race, localized/outbox rollback, actual receiver and startup process fail-closed demonstrated. Evidence planning/task012-implementation-evidence.md.
-Only2verified task containers/own volumes removed. No real Atlas/backfill/provider/media/geography/deployment or CI/CD acceptance; nonnull production thumbnail safely blocked pending TASK019 verifier. Overall readiness503; await Tu human review/user merge.

## DEC-167 TASK012 draft PR created

- Date:23October2026. Draft PR27 https://github.com/Dihoccode1/Vinlook/pull/27, branch codex/task-012-draft-api, final headc13096e75fe59d8508bf8d4275689ad4802f83a6;20changed files. All initial20blob hashes verified; preserved original mixed log/model line endings in final tree and verified those2remote files byte-for-byte, other18blobs unchanged. Diff focused: log21added/0deleted, model2added/1deleted. PR open/drafttrue/mergedfalse, main untouched.
-58unique passed groups/build/health, cleanup and limits documented. Credential pattern scanner initially matched a synthetic credential-shaped invalid-URI fixture; replaced with credential-free wrong-DB URI and reran4unitgroups to exit0. No secret exposed or real credential used. Await Tu human review/user merge; no notification/auto-merge. Postpublication tracking retained locally to preserve review head.

## DEC-168 TASK012 merge verified

- Date:23October2026. User reports review and merge. PR27 independently verified closed/mergedtrue/draftfalse; merge commit255d71c1da96bc428618954743ca243dbf674cdb.58relevant passed groups/build/health retained; no repeated tests/review requested or formal GitHub review fabricated. Issue closure not inferred from PR merge.
-Next work must follow backlog dependencies and approved concrete contracts; TASK013 requires TASK019 media verification in addition to now-merged TASK012. No real Atlas/migration/provider/production acceptance inferred.

## DEC-169 TASK019 issue and upload approach decision prepared

- Date:23October2026. Created actual Issue28 TASK019, approved ownerDuy/reviewerTu retained. Prerequisites merged; TASK013 depends on media verification. Official Cloudinary docs confirm1h signature validity and exclusion of file/resource_type from signed fields, requiring honest capability limits.
- Proposed A direct signed fixed intent +post-upload verification (recommended), alternative B server-proxied upload with local admission/byte checks and extra host load. Concrete impact/next detailed contract in planning/task019-upload-approach-proposal.md. Await approach decision under Master Prompt Rule1; no product code/model/provider/Atlas change.

## DEC-170 TASK019 backend upload B selected; concrete contract prepared

- Date:23October2026. User selected B upload through backend, superseding direct-upload recommendation. Prepared planning/task019-backend-upload-contract.md with proposed strict MediaUpload collection, bounded backend multipart/binary probing, durable unknown-outcome reconciliation, immutable Cloudinary adapter, TASK012 attachment/runtime amendment and scoped internal audio primitive.
-Read-only official npm metadata checked: busboy1.6.0,sharp0.35.5,music-metadata12.2.3; no package installed. Await detailed implementation contract approval under Master Prompt Rule1; transport B not reopened. No real key/provider/Atlas write/deployment.

## DEC-171 TASK019 contract B approved and implemented

- Approval23October2026; completion24October2026 UTC+7. User explicitly approved detailed backend transport/model/dependency/API/runtime contract B. Added private bounded backend media upload, binary child probe, durable intent/uncertain reconciliation and same-POI atomic attachment; no public audio worker bypass. OwnerDuy/reviewerTu retained.
-8media+15actual mediaMongo/HTTP+14draftMongo+44related regressions passed (81unique), full build/final Content build/health passed. Earlier5/7units,0/3integration,12/13and13/14HTTP reset failures retained with corrections in planning/task019-implementation-evidence.md; no double counting or weakened large-file test. Fixed --env-file inheritance during review using synthetic-only regression.
-All7TASK019 and1TASK012 regression exact containers/own volumes removed after ID/label/mount checks. No real Cloudinary/Atlas/key/provider/production write, narration/Linux/Render acceptance not implied. Readiness503; await Tu human review/user merge.


## DEC-172 TASK019 draft PR created

- Date:24October2026 UTC+7. Draft PR29 https://github.com/Dihoccode1/Vinlook/pull/29, branch codex/task-019-backend-media, final head9b44ae933d4ba3d0531ab2315b07c699a944c1e8;29changed files.28blob hashes and exact preserved-prefix log bytes verified; PR open/drafttrue/mergedfalse. Main untouched. Issue28 updated with actual implementation/test/PR state.
-81unique passed groups/build/health, all8exact containers/own volumes removed and fixture-only provider limits documented. Await Tu human review/user merge; no reviewer message/auto-merge or real provider/Atlas activation. Postpublication tracking retained locally to preserve human review head.

## DEC-173 TASK019 merge verified

- Date:24October2026 UTC+7. User reports review and merge. GitHub PR29 verified closed/merged with merge commit6af58ec282babb3c66e6103f95a55855c432d222. Retain81unique passed groups/build/health evidence; no formal GitHub review or Issue28 closure inferred.
- TASK012 and TASK019 code prerequisites for TASK013 are merged. Next step is preparing the concrete submit/review/publication contract for approval before implementation. Real Cloudinary/Atlas/Render acceptance and TASK010 native operator acceptance remain separate pending gates.

## DEC-174 TASK013 publication contract proposed

- Date:24October2026 UTC+7. Following user continuation, created actual Issue30 and planning/task013-review-publication-contract.md. TASK012/019 code prerequisites merged; ownerDuy/reviewerTu unchanged. Proposal A reuses current models/media/outbox and details review/submit/return/publish, exact current16locale gates, pointer/version/replay protection, explicit human geography attestation and fail-closed approved registry manifest with60s verification budget. Alternative B adds review-history/staging complexity and requires replacement design.
- Await user approval under Master Prompt Rule1 before code. No dependency installed, business endpoint added, tests run, real registry selected, Atlas/provider write or deployment. Separate real provider/registry/hosted and TASK010 native terminal acceptance gates retained.

## DEC-175 TASK013 contract A approved and implemented

- Date:24October2026 UTC+7. User explicitly approved A for isolated implementation/testing. Added version-bound per-language review, submit/Manager return and atomic publication using existing schemas/outbox/replay. Strict trusted registry manifest is injected server-side only; actual model selection/integration remains pending and runtime fails closed without it. Manager geography attestation is manual, not automatic verification. OwnerDuy/reviewerTu retained.
-113unique passed groups:16publicationMongo/HTTP,56unit/relevant regressions (55combined plus1new fake-clock deadline group; overlapping tests counted once),14draftMongo,15mediaMongo,12durabilityMongo. Full workspace build and final Content build passed. Failed fixture API-path assertion/Mongo nested-timeout runs and sandbox EACCES regression are documented with corrections; no skips or failed runs counted.
-All6TASK013 and3regression exact containers/own volumes removed after identity/mount checks. No real provider/Atlas/key/deployment or registry/actual narration acceptance. Await draft PR/Tu human review/user merge; overall readiness503.
