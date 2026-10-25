# TASK025 — Hosted Gemini diagnostics verification

26October2026UTC+7. Duy implements/Túreviews. Userapproved A, isolatedscopeonly.

FixedmetadataGET preflight is created only with configuredadapter, does not invoke generation or touch job/ProviderCall/ProviderControl. Manager+opensession route, strictemptybody, no request overrides,1inflight/process and60secondcooldown.10seconddeadline/64KiBJSON/no redirects/retries. Return safe model/methodbooleans or coarsecategory/httpstatus; no providerpayload. Responsebody cancelled on header rejection, boundedreader released. Futuregeneration failures log only event/taskType/category/httpStatus/jsonContentType and validatedjobId; loggerfailure does not change provideroutcome. Existing unknown/quota/http semantics unchanged.

12adapter/preflight unit tests pass: fixedGET/keydestination, cooldown/concurrency, malformed/oversize/nonJSON/timeout/transport, model/method mismatch, providerstatus, field redaction and loggerfailure.24jobs integration tests pass on fresh disposableDockerreplica: Staffdenied, Managerdisabledconfig, requestoverride rejection, closed-sessiondenial, safeHTTPresponse/cooldown/nojob creation plus all existingjob/recovery/media/sourceversion tests. Providerfixturesonly; norealGemini/Atlas, no resends. Newunitfile auto-discovered by existingCIchecks. CI productionbuild/smoke pending.

Reviewer focus: redaction/outputallowlists, no userchosen destination/key/model, bounded cleanup/timeout/concurrency, generationledgerunchanged. Do not infer priorfailure rootcause or realRenderkeyvalidation from mocks. After review/CI/merge/deploy authorize one realmetadataGET, not a generationretry.1/80approved; originalvi attempt remains failed/unknown with receipt retained.
