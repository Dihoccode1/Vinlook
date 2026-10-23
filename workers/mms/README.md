# Local MMS worker boundary

The approved worker pulls jobs from POI & Content over authenticated HTTPS; it does not read Atlas or require an inbound tunnel. Product job polling, leases, model pinning, synthesis and conversion are not implemented by TASK-002. Research artifacts and dependencies under docs/research are not bundled into this unit.
