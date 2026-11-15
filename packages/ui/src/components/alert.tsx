import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';

export const alertVariants = cva(
  'flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted/60 text-foreground',
        info: 'border-info/25 bg-info-soft text-info',
        success: 'border-success/25 bg-success-soft text-success',
        warning: 'border-warning/25 bg-warning-soft text-warning',
        destructive: 'border-destructive/30 bg-destructive-soft text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export function Alert({
  className,
  variant,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('font-semibold leading-snug', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('text-xs leading-relaxed opacity-95', className)} {...props} />;
}
