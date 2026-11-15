import * as React from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-22 w-full rounded-[10px] border border-input bg-card px-3 py-2.5 text-[13px] text-foreground transition-colors outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  );
}
