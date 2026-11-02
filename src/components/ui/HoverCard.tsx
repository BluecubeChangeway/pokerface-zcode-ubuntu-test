/**
 * HoverCard - 悬浮卡片组件
 * 基于 @radix-ui/react-hover-card 封装
 */

'use client';

import React, { forwardRef } from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import { cn } from '@/lib/utils';

export interface HoverCardProps extends React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Root> {
  /** 触发元素 */
  trigger: React.ReactElement;
  /** 卡片内容 */
  content: React.ReactNode;
  /** 打开延迟 */
  openDelay?: number;
  /** 关闭延迟 */
  closeDelay?: number;
}

export const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(
  ({ trigger, content, openDelay = 200, closeDelay = 100, ...props }, ref) => (
    <HoverCardPrimitive.Root {...props}>
      <HoverCardPrimitive.Trigger asChild>{trigger}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          className={cn(
            'z-50 w-64 rounded-lg border border-popover-border',
            'bg-popover-bg text-popover-text shadow-popover',
            'animate-fade-in slide-up'
          )}
        >
          {content}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  )
);
HoverCard.displayName = 'HoverCard';

export const HoverCardTrigger = HoverCardPrimitive.Trigger;
export const HoverCardContent = HoverCardPrimitive.Content;