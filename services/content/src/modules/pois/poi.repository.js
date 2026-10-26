/** Read queries only. Mutations keep the existing service-owned Mongo transaction. */
export function createPoiReadRepository(models) {
  return {
    findPublishedRevision(poiId, revisionId) {
      return models.POIRevision.findOne({ _id: revisionId, poiId, status: 'published' });
    },
    findWorkingRevision(poiId) {
      return models.POIRevision.findOne({ poiId, status: { $in: ['draft', 'in_review'] } });
    },
    findLocalizedContents(revisionId) {
      return models.LocalizedContent.find({ revisionId }).sort({ languageCode: 1 });
    },
  };
}
