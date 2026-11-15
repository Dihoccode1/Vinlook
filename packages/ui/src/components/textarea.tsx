import * as React from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';
/** Native semantics retain browser keyboard/mobile behavior; layout belongs to the feature. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(className)} {...props} />;
}
