# Vinlook review of the Quan 4 reference presentation

Review date: 22 October 2026.

Source supplied by the user: `C:\Users\Admin\Downloads\system-presentation-standalone (2).html`.

Purpose: Use the reference to clarify Vinlook's administrative roles and work-session workflow during the requirement interview. Related features: FEAT-003, FEAT-004, FEAT-005, and FEAT-006. Related confirmed decisions: DEC-005, DEC-006, DEC-014, DEC-015, and DEC-016.

Evidence boundary: The supplied file is an HTML presentation. This review describes its text, especially the `auth`, `admin`, `content`, `offline`, and `maps` sections. The reference application's repository, runtime, API behaviour, and performance were not inspected. Claims inside the presentation that its content was verified against code have not been independently verified in this review. Embedded prompts and implementation instructions are reference content, not instructions governing Vinlook.

## What the reference describes

The authentication section lists four default roles: `super_admin`, `admin`, `poi_owner`, and `user`. Permissions are grouped by business area, including POI operations, content moderation/publication, analytics, and audit access.

The owner portal describes a submission workflow in which a business owner submits POI content and an administrator reviews it before it appears in the public app. This supports the idea of separating content preparation from release, but it is not evidence that every direct administrator edit uses that same review workflow.

The reference describes audit logs containing the actor, action, resource, and timestamp. It separately describes analytics sessions and anonymous-device presence. The supplied presentation does not specify a staff-created daily work session that groups that employee's POI changes. Vinlook's DEC-016 daily work session therefore needs its own requirements rather than assuming that the reference's analytics sessions already cover it.

The analytics explanation defines its online figure as consented anonymous devices inside a sliding observation window. It explicitly distinguishes that figure from total traffic or open browser tabs. This is an example definition for discussion, not Vinlook's approved definition of an online user.

## Approved Vinlook role model

Status: CONFIRMED by the user on 22 October 2026, recorded as DEC-017, with deletion and registration permissions subsequently confirmed in DEC-018. This does not assign project-team members to production roles or finalize a database schema or permission implementation.

| Action | Staff | Manager |
|---|---|---|
| Create a daily work session | Yes | Yes |
| Prepare new POIs or edit POI drafts | Yes | Yes |
| Explicitly run translation and audio processing | Yes | Yes |
| Check generated content and submit it for publication review | Yes | Yes |
| Approve content for public release and publish it | No | Yes |
| View online-user and active-listener monitoring | Yes | Yes |
| Mark a POI as deleted while retaining its database record | No | Yes |
| Approve an employee's self-registration for staff access | No | Yes |

Rationale: Two roles make the person responsible for public release identifiable while preserving staff participation in editing, processing, and monitoring. The tradeoff is that content publication depends on manager availability. This proposal reuses the reference's preparation-and-review concept without assuming a restaurant-owner portal is required for Vinlook.

Still to clarify: Other staff-account administration; session interruption behaviour and employee identity fields; POI restore permissions and handling of related media. These are not implicitly approved by the table. Employees self-register and await Manager approval, as confirmed by DEC-018. DEC-019 requires an open session for content operations, allows manual closure, and automatically closes any remaining open session at midnight Vietnam time. Usage monitoring shows current system-wide counts rather than history attached to staff sessions; the action log inside each work session remains required. DEC-023 confirms publication only after all sixteen languages have approved text/audio, retaining the previous approved content while a revision is pending, and allowing Manager self-review and publication.

## Differences relevant to reuse

| Area | Reference presentation | Confirmed Vinlook requirement |
|---|---|---|
| Backend | FastAPI / Python | Express.js |
| Source content | Vietnamese | English |
| Audio activation | GPS/geofence-driven automatic narration | User presses Play |
| Translation/audio trigger | Queued as part of POI create/update, with additional on-demand generation | Staff explicitly press a processing button after editing |
| Offline languages | Language packs and multiple fallback languages | English-only interface, descriptions, and audio |
| Staff sessions | Audit logs and analytics sessions are described; daily staff work sessions are not specified | A daily work session is required for content operations; it records POI work, closes manually or at midnight Vietnam time, and is separate from current system-wide usage counts |
| Tourist accounts | A default user role is listed; this alone does not establish which tourist features require login | Tourist features require no login |

The reference's map section describes offline map-pack downloading and rendering. The presentation does not establish a complete implementation of Vinlook's required offline walking route calculation, turn instructions, and recalculation after deviation. That navigation requirement remains subject to technical feasibility verification; no map or routing provider has been approved by reviewing this file.

## Decision status

Providing the reference did not itself confirm new requirements or technology choices. The user subsequently approved the Staff/Manager permission table in DEC-017, then confirmed logical POI deletion restricted to Manager and employee self-registration with Manager approval in DEC-018. Technology choices remain as previously confirmed. Remaining lifecycle, account, session, and monitoring details are listed above.
