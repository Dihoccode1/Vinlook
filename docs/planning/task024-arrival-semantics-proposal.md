# TASK-024 — Public arrival point versus visitor entry

25October2026 UTC+7. **A approved by Duy on25October2026.** Duy implements; Tú reviews. The field-verification waiver remains in force. This proposal does not ask for a new field survey.

## Concrete issue found during continued research

The [Nha Rong museum operator closure notice](https://bennharong.vn/thong-bao-dong-cua-trung-tu-bao-tang), dated6May2026, states temporary closure for renovation and says reopening will be separately announced. Direct read25October2026. The [operator announcement page](https://bennharong.vn/thong-bao), also read25October2026, displays a closed status in its visiting-hours section. No reopening confirmation was found in this research. A displayed status can be stale; this does not establish closure indefinitely. Institutional staff events inOctober do not themselves confirm public visitor entry.

This affects POI005, which remains in the approved15POIs. Selecting an internal museum doorway as a presently usable visitor entrance is not supported. Other POIs include public streets, ticketed towers and religious sites, where outdoor arrival and permission to enter are also different questions.

The [Palace operator visitor page](https://dinhdoclap.gov.vn/gio-tham-quan/) identifies135Nam Ky Khoi Nghia and106Nguyen Du gates. It improves semantic evidence but does not by itself numerically locate the outdoor gate. This is why the earlier palace building door must not be relabelled as the perimeter gate.

## A — Public pedestrian arrival outside the POI (recommended for prototype)

Use an evidenced public pedestrian approach point near the appropriate gate/facade as the routing endpoint. For streets, use an identifiable pedestrian-accessible point on that destination. The point must be supported by source/topology review, not an arbitrary closest road or building centroid. Reject private/no-access or unresolved crossings; field waiver does not establish physical accessibility.

Arrival means reaching that public exterior point; it does not assert the venue is open or authorize entering a building, restoration area or ticketed space. For POI005, retain the destination but select an exterior point only if public access there is supported; unresolved exterior access remains pending. Record the operator closure/access limitation in the content handoff before visitor publication. Do not send a route through a closed/private gate.

This changes the interpretation of the existing `entrance` destination from a visitor-entry gate to a reviewed public arrival point where appropriate. No new database field, endpoint, provider, route algorithm or live-hours service is proposed. Existing version/review/publication gates still apply; concrete coordinates and content changes will be reviewed by Tú in a follow-up PR. Finalized endpoints must be checked with the existing graph/profile; failed connections are not routes.

Benefit: supports exterior sightseeing/listening at retained POIs without pretending they are open. Limit: reaching the destination does not promise access inside; this must be clear in the POI content/UI wording already used for arrival. No new UI implementation is included in approving this research interpretation.

## B — Keep strict verified visitor-entry semantics

Keep `entrance` restricted to a gate confirmed for visitor entry. POI005 remains pending until suitable reopening/access evidence is available. Continue research for other POIs; do not mark all15destinations ready or clear TASK024/TASK025 dependencies while required gates remain unresolved. No replacement POI is selected automatically.

Benefit: preserves the narrower entry meaning. Limit: external closure/access evidence may prevent completion of the15POI geography set on the current schedule; no completion date is promised.

## Decision requested

Choose A or B once for TASK024. Approval of research continuation and PR50 merge did not choose between these meanings. Rule1 of the user Master Prompt requires confirmation because this affects navigation behavior and acceptance. No new coordinates are approved simply by choosing A/B; Duy/Tú assignment and waived field step do not need reapproval.

## Decision recorded

User chose A: public exterior pedestrian arrival, no promise of entry. Duy/Tu and field waiver retained. Concrete endpoints still require source/topology checks and Tu review. Earlier B remains alternative history only. No new runtime/schema/API introduced by this decision.
