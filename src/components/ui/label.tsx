'use client';
import * as React from 'react';
import { Label as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';
export function Label({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root className={cn('text-sm font-medium', className)} {...props} />;
}
