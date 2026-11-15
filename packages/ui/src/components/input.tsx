import * as React from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'flex h-10 w-full min-w-0 rounded-[10px] border border-input bg-card px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  );
}
