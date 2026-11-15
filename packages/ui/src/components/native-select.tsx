import * as React from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';
/** Native semantics retain browser keyboard/mobile behavior; layout belongs to the feature. */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select data-slot="native-select" className={cn(className)} {...props} />;
}
