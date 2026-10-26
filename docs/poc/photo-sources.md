# POI photo sources

Fifteen Wikimedia Commons source references and downloaded-thumbnail SHA256s are
recorded in `apps/web/public/credits/photos.json`. Original photograph bytes stay
in the private local preparation directory, outside Git. The human-readable credit
page is linked from the tourist footer. It identifies the creator/source/licence
and WebP/orientation conversion. The Bui Vien derivative retains CC BY-SA4.0;
other selected sources are CC0 or the source page's Public Domain dedication.

Visual relevance was checked with a contact sheet. Selection is not a new human
content approval, proof of current venue access or a statement that all assets
have been uploaded. The History Museum thumbnail is an exhibit, the zoo shows
deer and the Cu Chi photo is a geotagged view at the Ben Duoc site, not Ben Dinh.
No photographer rights are inferred from the separate OSM/ODbL map licence.

Duy approved one CC0 Independence Palace upload as part of the POI001 completion
wave. This PR adds source/credit records, not new upload permissions, cloud keys,
database mutations, narration approvals or publication. Other selected assets
remain prepared for the subsequent media admission step.

Validation: metadata has15unique POI references with source/creator/licence and
hashes; generated HTML escapes source text/attributes and links to HTTPS sources.
Existing production build already supports static public pages. No dependency or
backend contract change.
