'use client';
import * as React from 'react';
import { Dialog as Primitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="dialog-overlay" />
      <Primitive.Content className={cn('dialog-content', className)} {...props}>
        {children}
        <Primitive.Close className="dialog-close" aria-label="Close dialog">
          <X size={18} />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-6 space-y-1.5 pr-7', className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center justify-end gap-2 pt-5', className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title className={cn('text-xl font-semibold tracking-tight', className)} {...props} />
  );
}
export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}
