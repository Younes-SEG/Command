import * as React from 'react';
import { cn } from '@/lib/utils';
export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn('input min-h-24 resize-y py-3', className)} {...props} />;
}
