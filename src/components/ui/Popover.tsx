/**
 * Popover - 弹出面板组件
 * 基于 @radix-ui/react-popover 封装
 */

'use client';

import React, { forwardRef } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

export interface PopoverProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root> {
  /** 触发元素 */
  trigger: React.ReactElement;
  /** 面板内容 */
  content: React.ReactNode;
  /** 位置 */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** 对齐 */
  align?: 'start' | 'center' | 'end';
  /** 偏移 */
  sideOffset?: number;
  /** 对齐偏移 */
  alignOffset?: number;
  /** 是否模态 */
  modal?: boolean;
}

export const Popover = forwardRef<HTMLDivElement, PopoverProps>(
  ({ trigger, content, side = 'bottom', align = 'center', sideOffset = 4, alignOffset = 0, modal = false, ...props }, ref) => (
    <PopoverPrimitive.Root {...props}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          className={cn(
            'z-50 w-72 rounded-lg border border-popover-border',
            'bg-popover-bg text-popover-text shadow-popover',
            'animate-fade-in slide-up'
          )}
        >
          <PopoverPrimitive.Arrow className="fill-popover-bg" width={10} height={5} />
          {content}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
);
Popover.displayName = 'Popover';

export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverContent = PopoverPrimitive.Content;
export const PopoverArrow = PopoverPrimitive.Arrow;
export const PopoverClose = PopoverPrimitive.Close;