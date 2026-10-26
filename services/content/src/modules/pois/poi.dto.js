function documentDto(document) {
  if (!document) return null;
  const { _id, ...fields } = document.toObject();
  return { id: String(_id), ...fields };
}
export function draftReadDto({ poi, published, working, rows, revision }) {
  return {
    poi: documentDto(poi),
    publishedRevision: documentDto(published),
    workingRevision: documentDto(working),
    localizedContents: rows.map((row) => ({
      ...documentDto(row),
      isSourceCurrent: row.sourceVersion === revision.sourceVersion,
      isAudioCurrent:
        row.sourceVersion === revision.sourceVersion &&
        Boolean(row.audioAsset) &&
        row.audioAsset.textVersion === row.textVersion,
    })),
  };
}
