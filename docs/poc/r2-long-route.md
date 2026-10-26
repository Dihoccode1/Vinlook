# R2 long route: Independence Palace to Ben Duoc

The required Cu Chi destination exposed a real limit: previous defaults failed
the centre-to-BenDuoc query within the declared search budget. This change uses
admissible A* over the same full directed graph; it does not add connectors,
restrict a corridor or remove restrictions. The heuristic is the minimum geodesic
distance to a legal terminal vertex plus that terminal's exact partial-edge and
entrance-connector cost. Same-edge direct finishes remain handled separately.
The tile reader now enforces the exact metric lower bound, without its former
0.01m allowance, and rejects unsafe-number costs.

The16MB encoded LRU cache still thrashed on the long query after A*. Increasing
it to32MB found the55,575.13m route through1236geometry points and188,466settled
nodes in10.126s with369responses, below the unchanged500request/200,000settled
limits. The retained encoded data was31,905,664bytes; process heap at the end was
355,250,592bytes, **not peak/mobile memory**. This is a Windows local-file smoke
measurement. Phone memory, hosted latency and field safety are not certified.

No graph archive/manifest/version, dependency, backend, GPS policy or publication
rule changes. The full city stays available on demand; budget exhaustion still
fails explicitly. See the measurement JSON for the prior failed cases.

Focused tests compare against existing monolithic snapped routing, include20
generated directed topologies, a real Worker and rejection of a sub-geodesic edge.
