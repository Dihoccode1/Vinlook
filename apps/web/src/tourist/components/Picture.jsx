import { useEffect, useState } from 'react';
export function Picture({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? (
    <div className={'picture-fallback ' + className} aria-label={alt}>
      ◇
    </div>
  ) : (
    <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  );
}
