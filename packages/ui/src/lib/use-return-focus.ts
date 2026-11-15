import * as React from 'react';

/**
 * Restores focus to the opener element when a Radix Dialog or AlertDialog
 * closes after being mounted conditionally without a DialogTrigger.
 */
export function use_return_focus_on_close(
  on_close_auto_focus?: (event: Event) => void,
): (event: Event) => void {
  const opener_ref = React.useRef<HTMLElement | null>(null);
  const mounted_ref = React.useRef(false);

  React.useLayoutEffect(() => {
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (!opener_ref.current && active instanceof HTMLElement && active !== document.body) {
      opener_ref.current = active;
    }
  }, []);

  React.useEffect(() => {
    mounted_ref.current = true;
    return () => {
      mounted_ref.current = false;
    };
  }, []);

  return (event: Event) => {
    on_close_auto_focus?.(event);
    if (event.defaultPrevented) return;
    if (!mounted_ref.current && opener_ref.current?.isConnected) {
      event.preventDefault();
      opener_ref.current.focus();
    }
  };
}
