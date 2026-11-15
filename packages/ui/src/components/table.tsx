import * as React from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';
/** Native semantics retain browser keyboard/mobile behavior; layout belongs to the feature. */
export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table data-slot="table" className={cn(className)} {...props} />;
}
