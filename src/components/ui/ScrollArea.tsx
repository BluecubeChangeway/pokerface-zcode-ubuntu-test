/**
 * ScrollArea - 滚动区域组件
 * 基于 @radix-ui/react-scroll-area 封装
 */

'use client';

import React, { forwardRef } from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';

export interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /** 滚动条类型 */
  type?: 'always' | 'auto' | 'hover' | 'scroll';
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, type = 'auto', children, ...props }, ref) => (
    <ScrollAreaPrimitive.Root
      ref={ref}
      type={type}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.ScrollAreaScrollbar
        orientation="vertical"
        className={cn(
          'flex h-full w-2.5 items-end rounded-full border border-transparent bg-transparent px-1 transition-colors duration-200',
          'hover:bg-accent',
          'data-[state=visible]:bg-accent',
          'data-[state=visible]:border-accent-foreground/10'
        )}
      >
        <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
      <ScrollAreaPrimitive.ScrollAreaScrollbar
        orientation="horizontal"
        className={cn(
          'flex w-full h-2.5 items-end justify-center rounded-full border border-transparent bg-transparent py-1 transition-colors duration-200',
          'hover:bg-accent',
          'data-[state=visible]:bg-accent',
          'data-[state=visible]:border-accent-foreground/10'
        )}
      >
        <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
      <ScrollAreaPrimitive.Corner className="bg-transparent" />
    </ScrollAreaPrimitive.Root>
  )
);
ScrollArea.displayName = 'ScrollArea';

export const ScrollBar = ScrollAreaPrimitive.ScrollAreaScrollbar;
export const ScrollThumb = ScrollAreaPrimitive.ScrollAreaThumb;
export const Viewport = ScrollAreaPrimitive.Viewport;
export const Corner = ScrollAreaPrimitive.Corner;