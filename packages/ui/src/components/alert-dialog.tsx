import * as React from 'react';
import * as Primitive from '@radix-ui/react-dialog';
import type { ComponentProps } from 'react';
import { Button, type ButtonProps } from './button';
import { cn } from '../lib/utils';
import { use_return_focus_on_close } from '../lib/use-return-focus';

export const AlertDialog = Primitive.Root;
export const AlertDialogTrigger = Primitive.Trigger;
export const AlertDialogTitle = Primitive.Title;
export const AlertDialogDescription = Primitive.Description;

export function AlertDialogContent({
  className,
  busy = false,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  onCloseAutoFocus,
  ...props
}: ComponentProps<typeof Primitive.Content> & { busy?: boolean }) {
  const handle_close_auto_focus = use_return_focus_on_close(onCloseAutoFocus);
  return (
    <Primitive.Portal>
      <Primitive.Overlay
        className={cn(
          'fixed inset-0 z-(--z-modal) bg-black/45 backdrop-blur-[2px] transition-opacity',
          'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
        )}
      />
      <Primitive.Content
        role="alertdialog"
        onCloseAutoFocus={handle_close_auto_focus}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
          onEscapeKeyDown?.(event);
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault();
          onPointerDownOutside?.(event);
        }}
        onInteractOutside={(event) => {
          event.preventDefault();
          onInteractOutside?.(event);
        }}
        className={cn(
          'fixed top-1/2 left-1/2 z-(--z-modal) w-[min(430px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2',
          'rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-(--dialog-shadow) outline-none',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mt-6 flex flex-wrap justify-end gap-2.5', className)} {...props} />;
}

export function AlertDialogCancel({ variant = 'outline', type = 'button', ...props }: ButtonProps) {
  return (
    <Primitive.Close asChild>
      <Button type={type} variant={variant} {...props} />
    </Primitive.Close>
  );
}

export function AlertDialogAction({
  variant = 'destructive',
  type = 'button',
  ...props
}: ButtonProps) {
  return <Button type={type} variant={variant} {...props} />;
}
