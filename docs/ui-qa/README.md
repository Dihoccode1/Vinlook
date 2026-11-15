# UI migration verification

Screenshots use local fixture data, with no production writes or secrets. Admin desktop: 1440x1000; mobile views: 390x844. Compare matching before/after filenames. Charts and external map tiles can change between captures; this is a visual layout review, not a pixel-identical image assertion.

| Screen | Before | After |
| --- | --- | --- |
| Admin desktop | [Before](admin-desktop-before.jpg) | [After](admin-desktop-after.jpg) |
| Admin mobile | [Before](admin-mobile-before.jpg) | [After](admin-mobile-after.jpg) |
| POI editor mobile | [Before](editor-mobile-before.jpg) | [After](editor-mobile-after.jpg) |
| Visitor mobile | [Before](user-mobile-before.jpg) | [After](user-mobile-after.jpg) |
| Monitor mobile | [Before](monitor-mobile-before.jpg) | [After](monitor-mobile-after.jpg) |

Additional checks: [account confirmation](account-alert-mobile-after.jpg), [route planner](route-mobile-after.jpg). Verified cancel initial focus, Escape dismissal and focus restoration; visitor search, POI selection, native language selection, adding a route stop and mobile-sheet expansion/collapse. Shared-control tests verify native form payload and disabled/submit behavior. Existing tests cover monitoring states, location and route logic.

Not established by this fixture run: real GPS device output, mobile OS keyboard behavior, external routing/TTS provider generation or production writes. These remain device/provider validation items. Existing compound/responsive CSS is retained where a partial move would alter cascade behavior; the migration intentionally preserves those property families.
