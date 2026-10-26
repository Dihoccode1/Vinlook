import { emptyDraftInput as initial } from './draft-input.js';
import { WorkSessionSection } from './sections/WorkSessionSection.jsx';
import { OpenPoiSection } from './sections/OpenPoiSection.jsx';
import { DraftEditorSection } from './sections/DraftEditorSection.jsx';
import { LanguageReviewSection } from './sections/LanguageReviewSection.jsx';
import { ProcessingJobsSection } from './sections/ProcessingJobsSection.jsx';
import { PublicationSection } from './sections/PublicationSection.jsx';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createAdminAdapter } from '../adapters/admin.js';
import { createAdminState, publicationGaps } from './admin-state.js';
import './staff.css';
import { Monitor } from './monitor/Monitor.jsx';

function createRuntimeAdminAdapter() {
  try {
    return createAdminAdapter({
      identityOrigin: import.meta.env.VITE_IDENTITY_ORIGIN,
      contentOrigin: import.meta.env.VITE_CONTENT_ORIGIN,
      usageOrigin: import.meta.env.VITE_USAGE_ORIGIN,
    });
  } catch {
    return null;
  }
}
export function Admin({ api: providedApi }) {
  const api = useMemo(() => providedApi ?? createRuntimeAdminAdapter(), [providedApi]);
  return (
    <div className="staff" lang="en" dir="ltr">
      {api ? (
        <ContentEditor api={api} />
      ) : (
        <main>
          <h1>Vinlook Staff</h1>
          <p role="alert">Service origins are not configured. Contact the operator.</p>
        </main>
      )}
    </div>
  );
}
function ContentEditor({ api }) {
  const store = useMemo(() => createAdminState(api), [api]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [poiId, setPoiId] = useState(''),
    [languageCode, setLanguageCode] = useState('en'),
    [localeText, setLocaleText] = useState(''),
    [reason, setReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(null),
    [dirty, setDirty] = useState(false),
    [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadIntent, setUploadIntent] = useState(null);
  const [jobDispatch, setJobDispatch] = useState(null);
  const [view, setView] = useState('content');
  const document = state.document,
    revision = document?.workingRevision,
    localizedContents = document?.localizedContents ?? [],
    localizedContent = localizedContents.find((r) => r.languageCode === languageCode);
  const principal = state.principal,
    canWrite = Boolean(principal?.currentWorkSession) && !state.busy && !state.conflict;
  const editable = canWrite && (!document || revision?.status === 'draft');
  const manager = principal?.account?.role === 'Manager',
    gaps = publicationGaps(document);
  const run = async (fn) => {
    try {
      await fn();
    } catch {
      /* centralized safe error in store */
    }
  };
  const change = (field, value) => {
    setDirty('metadata');
    setIdempotencyKey(null);
    store.setInput({ ...state.input, [field]: value });
  };
  useEffect(() => {
    setLocaleText(localizedContent?.text ?? '');
  }, [localizedContent?.text, languageCode]);
  useEffect(() => {
    const leave = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);
  const load = () => {
    if (dirty && !window.confirm('Discard unsaved input and load the server version?')) return;
    void run(async () => {
      await store.read(poiId);
      setDirty(false);
      setIdempotencyKey(null);
      setThumbnailFile(null);
    });
  };
  const mutate = (fn, { idempotent = false } = {}) =>
    run(async () => {
      const attemptKey = idempotent ? (idempotencyKey ?? crypto.randomUUID()) : null;
      if (attemptKey) setIdempotencyKey(attemptKey);
      await store.mutate((adapter, s) => fn(adapter, s, attemptKey));
      setIdempotencyKey(null);
      setDirty(false);
    });
  const clearWorkspace = () => {
    store.logout();
    setView('content');
    setDirty(false);
    setJobDispatch(null);
    setUploadIntent(null);
    setThumbnailFile(null);
  };
  const signOut = () => {
    if (dirty && !window.confirm('Discard unsaved input and sign out?')) return;
    clearWorkspace();
  };
  if (!principal)
    return (
      <main className="staff-login">
        <a className="staff-brand" href="/">
          VINLOOK <span>Content studio</span>
        </a>
        <div className="staff-intro">
          <p className="staff-eyebrow">FOR STAFF & MANAGERS</p>
          <h1>Bring the city’s stories to life.</h1>
          <p>Create places, prepare narration and review every language before publishing.</p>
        </div>
        <h2>Vinlook Staff</h2>
        <p>Sign in with an existing approved account. Tokens stay in this tab only.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fields = new FormData(e.currentTarget);
            const password = String(fields.get('password'));
            e.currentTarget.reset();
            void run(() => store.login(String(fields.get('email')), password));
          }}
        >
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button disabled={state.busy}>Sign in</button>
        </form>
        {state.error && <p role="alert">{state.error}</p>}
      </main>
    );
  const input = state.input ?? initial;
  if (view === 'monitor')
    return (
      <>
        <nav className="staff-monitor-nav" aria-label="Staff workspace">
          <button onClick={() => setView('content')}>Back to content</button>
          <button onClick={signOut}>Sign out</button>
        </nav>
        <Monitor api={api.monitor} onUnauthorized={clearWorkspace} />
      </>
    );
  return (
    <main>
      <header className="staff-header">
        <div>
          <p className="staff-eyebrow">VINLOOK / CONTENT STUDIO</p>
          <h1>Vinlook Staff</h1>
          <p>
            {principal.account.fullName} · {principal.account.role}
          </p>
        </div>
        <div className="staff-account">
          <span className={`staff-badge ${principal.currentWorkSession ? 'is-open' : ''}`}>
            Session: {principal.currentWorkSession ? 'Open' : 'Closed'}
          </span>
          <button className="staff-secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <nav className="staff-nav" aria-label="Content workflow">
        <a href="#work-session">01 Session</a>
        <a href="#open-poi">02 Open place</a>
        <a href="#draft-editor">03 Draft</a>
        {revision && (
          <>
            <a href="#language-review">04 Languages</a>
            <a href="#processing-jobs">05 Jobs</a>
            <a href="#publication">06 Publish</a>
          </>
        )}
        <button
          className="staff-secondary"
          disabled={state.busy}
          onClick={() => setView('monitor')}
        >
          Monitoring
        </button>
      </nav>
      {dirty && (
        <p className="staff-notice" role="status">
          Unsaved {dirty === 'locale' ? 'language text' : 'draft details'} — save before moving to
          another step.
        </p>
      )}
      <WorkSessionSection
        canWrite={canWrite}
        reason={reason}
        run={run}
        setReason={setReason}
        state={state}
        store={store}
      />
      {state.error && (
        <p role="alert">
          {state.error}
          {state.conflict
            ? ' — Your input is preserved. Load the server version explicitly before retrying.'
            : ''}
        </p>
      )}
      {state.busy && <p role="status">Working…</p>}
      <OpenPoiSection
        canWrite={canWrite}
        dirty={dirty}
        load={load}
        poiId={poiId}
        setDirty={setDirty}
        setIdempotencyKey={setIdempotencyKey}
        setPoiId={setPoiId}
        state={state}
        store={store}
      />
      {document && (
        <aside className="staff-context" aria-label="Loaded revision">
          <strong>
            {revision?.nameEN ?? document.publishedRevision?.nameEN ?? 'Loaded place'}
          </strong>
          <p>
            POI {document.poi.id} · working {revision?.status ?? 'none'} · editVersion{' '}
            {revision?.editVersion ?? '—'} · published {document.publishedRevision?.id ?? 'none'}
          </p>
          <p>Changes stay in the working revision until a Manager publishes them.</p>
        </aside>
      )}
      {document && !revision && (
        <button
          disabled={!canWrite}
          onClick={() =>
            void mutate(
              (a, s, k) => a.clone(s.document.poi.id, s.document.publishedRevision.id, k),
              { idempotent: true },
            )
          }
        >
          Create draft from published
        </button>
      )}
      <DraftEditorSection
        change={change}
        dirty={dirty}
        document={document}
        editable={editable}
        input={input}
        uploadIntent={uploadIntent}
        mutate={mutate}
        revision={revision}
        run={run}
        setUploadIntent={setUploadIntent}
        setThumbnailFile={setThumbnailFile}
        state={state}
        store={store}
        thumbnailFile={thumbnailFile}
      />
      {revision && (
        <>
          <LanguageReviewSection
            canWrite={canWrite}
            languageCode={languageCode}
            dirty={dirty}
            editable={editable}
            mutate={mutate}
            reason={reason}
            revision={revision}
            localizedContent={localizedContent}
            setLanguageCode={setLanguageCode}
            setDirty={setDirty}
            setIdempotencyKey={setIdempotencyKey}
            setLocaleText={setLocaleText}
            state={state}
            localeText={localeText}
          />
          <ProcessingJobsSection
            canWrite={canWrite}
            dirty={dirty}
            jobDispatch={jobDispatch}
            mutate={mutate}
            revision={revision}
            run={run}
            setJobDispatch={setJobDispatch}
            state={state}
            store={store}
          />
          <PublicationSection
            canWrite={canWrite}
            dirty={dirty}
            document={document}
            editable={editable}
            gaps={gaps}
            manager={manager}
            mutate={mutate}
            reason={reason}
            revision={revision}
          />
        </>
      )}
    </main>
  );
}
