import * as React from 'react';
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';
export const AlertDialog = AlertPrimitive.Root;
export const AlertDialogTitle = AlertPrimitive.Title;
export const AlertDialogDescription = AlertPrimitive.Description;
export const AlertDialogCancel = AlertPrimitive.Cancel;
export const AlertDialogAction = AlertPrimitive.Action;
export function AlertDialogContent({
  className,
  container,
  ...props
}: ComponentProps<typeof AlertPrimitive.Content> & { container?: HTMLElement | null }) {
  return (
    <AlertPrimitive.Portal container={container}>
      <AlertPrimitive.Overlay className="fixed inset-0 z-[1000] bg-[#153b327d] backdrop-blur-[4px]" />
      <AlertPrimitive.Content
        className={cn('fixed inset-0 z-[1001] m-auto h-fit outline-none', className)}
        {...props}
      />
    </AlertPrimitive.Portal>
  );
}
