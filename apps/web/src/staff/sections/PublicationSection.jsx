export function PublicationSection({
  canWrite,
  dirty,
  document,
  editable,
  gaps,
  manager,
  mutate,
  reason,
  revision,
}) {
  return (
    <section id="publication" aria-label="Publication">
      <p className="staff-eyebrow">06 / FINAL CHECK</p>
      <h2>Publication</h2>
      <p>
        All 16 languages must have current approved text and audio. A Manager makes the final
        publication decision.
      </p>
      <button
        disabled={!editable || dirty}
        onClick={() => void mutate((a) => a.submit(revision.id, revision.editVersion))}
      >
        Submit for review
      </button>
      {manager && (
        <>
          <button
            disabled={!canWrite || dirty || revision.status !== 'in_review' || !reason.trim()}
            onClick={() =>
              void mutate((a) => a.returnDraft(revision.id, revision.editVersion, reason))
            }
          >
            Return to draft
          </button>
          <ul>
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
          <button
            disabled={!canWrite || dirty || gaps.length > 0}
            onClick={() => {
              if (
                window.confirm(
                  'Confirm geography/entrance and publish this exact version after reviewing all 16 locales?',
                )
              )
                void mutate(
                  (a, s, k) =>
                    a.publish(
                      revision.id,
                      {
                        expectedEditVersion: revision.editVersion,
                        expectedPublishedRevisionId: document.publishedRevision?.id ?? null,
                        confirmGeography: true,
                      },
                      k,
                    ),
                  { idempotent: true },
                );
            }}
          >
            Publish
          </button>
        </>
      )}
    </section>
  );
}
