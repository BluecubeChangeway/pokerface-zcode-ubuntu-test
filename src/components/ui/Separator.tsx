/**
 * Separator - 分隔线组件
 * 基于 @radix-ui/react-separator 封装
 */

'use client';

import React, { forwardRef } from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';

export interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  /** 方向 */
  orientation?: 'horizontal' | 'vertical';
  /** 是否装饰性（不被屏幕阅读器读取） */
  decorative?: boolean;
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <SeparatorPrimitive.Root
      ref={ref}
      orientation={orientation}
      decorative={decorative}
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = 'Separator';

export const SeparatorRoot = SeparatorPrimitive.Root;