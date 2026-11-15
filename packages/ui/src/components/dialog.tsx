import * as React from 'react';
import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { use_return_focus_on_close } from '../lib/use-return-focus';

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;

export const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof Primitive.Overlay>,
  React.ComponentProps<typeof Primitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <Primitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-(--z-modal) bg-black/45 backdrop-blur-[2px]', className)}
      {...props}
    />
  );
});

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof Primitive.Content> & { showCloseButton?: boolean }) {
  const handle_close_auto_focus = use_return_focus_on_close(onCloseAutoFocus);
  return (
    <Primitive.Portal>
      <DialogOverlay />
      <Primitive.Content
        data-slot="dialog-content"
        onCloseAutoFocus={handle_close_auto_focus}
        className={cn(
          'fixed left-1/2 top-1/2 z-[1201] grid max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-(--dialog-shadow) outline-none',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <Primitive.Close className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-input bg-card text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring outline-none">
            <X className="size-4" />
            <span className="sr-only">Đóng</span>
          </Primitive.Close>
        )}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 text-left', className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}
