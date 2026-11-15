import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';

export const selectVariants = cva(
  'w-full appearance-none rounded-[10px] border border-input bg-card pr-9 text-foreground transition-colors outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive aria-invalid:ring-destructive/20',
  {
    variants: {
      size: {
        default: 'h-10 px-3 text-[13px]',
        sm: 'h-9 px-2.5 text-xs',
        lg: 'h-11 px-3.5 text-sm',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export type SelectProps = Omit<ComponentProps<'select'>, 'size'> &
  VariantProps<typeof selectVariants> & {
    wrapperClassName?: string;
  };

export function Select({ className, wrapperClassName, size, children, ...props }: SelectProps) {
  return (
    <div className={cn('relative inline-flex w-full items-center', wrapperClassName)}>
      <select className={cn(selectVariants({ size }), className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground"
      />
    </div>
  );
}
