import { useEffect, useRef, useState } from 'react';
import { appendPage } from './catalog.js';
const emptyPage = { items: [], nextCursor: null, snapshotId: null };
export function useTouristCatalog(content, locale, { query, mode, position, reload }) {
  const [page, setPage] = useState(emptyPage),
    [status, setStatus] = useState('loading');
  const loadGeneration = useRef(0),
    moreAbort = useRef(null);
  useEffect(() => {
    const controller = new AbortController(),
      generation = ++loadGeneration.current;
    moreAbort.current?.abort();
    setPage(emptyPage);
    setStatus('loading');
    const timer = setTimeout(async () => {
      if (!content) {
        setStatus('configuration');
        return;
      }
      try {
        const result =
          mode === 'nearby' && position
            ? await content.nearby({ ...position, locale: locale, signal: controller.signal })
            : await content.list({
                locale: locale,
                q: query.trim() || undefined,
                signal: controller.signal,
              });
        if (generation === loadGeneration.current && !controller.signal.aborted) {
          setPage(mode === 'nearby' ? { ...result, nextCursor: null, snapshotId: null } : result);
          setStatus('ready');
        }
      } catch {
        if (generation === loadGeneration.current && !controller.signal.aborted) setStatus('error');
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [content, locale, query, mode, position, reload]);
  useEffect(() => () => moreAbort.current?.abort(), []);

  async function more() {
    if (!page.nextCursor || status !== 'ready') return;
    const generation = loadGeneration.current,
      controller = new AbortController();
    moreAbort.current = controller;
    setStatus('more');
    try {
      const next = await content.list({
        locale: locale,
        q: query.trim() || undefined,
        cursor: page.nextCursor,
        signal: controller.signal,
      });
      if (generation === loadGeneration.current && !controller.signal.aborted) {
        setPage(appendPage(page, next));
        setStatus('ready');
      }
    } catch {
      if (generation === loadGeneration.current && !controller.signal.aborted) setStatus('error');
    }
  }

  return { page, status, more };
}
