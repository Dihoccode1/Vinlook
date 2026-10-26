import { useEffect, useState } from 'react';
export function usePoiDetail(content, selectedId, locale, reload) {
  const [detail, setDetail] = useState(null),
    [detailStatus, setDetailStatus] = useState('idle');
  useEffect(() => {
    if (!selectedId || !content) {
      setDetail(null);
      setDetailStatus('idle');
      return;
    }
    const controller = new AbortController();
    setDetail(null);
    setDetailStatus('loading');
    content
      .detail(selectedId, locale, { signal: controller.signal })
      .then((item) => {
        if (!controller.signal.aborted) {
          setDetail(item);
          setDetailStatus('ready');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetailStatus('error');
      });
    return () => controller.abort();
  }, [selectedId, content, locale, reload]);

  return { detail, detailStatus };
}
