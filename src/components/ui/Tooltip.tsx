/**
 * Tooltip - 提示框组件
 * 基于 @radix-ui/react-tooltip 封装
 * 
 * 特性：
 * - 多位置：top / bottom / left / right
 * - 多变体：default / success / warning / danger / info
 * - 延迟显示/隐藏、可配置
 * - 富文本内容支持
 * - 箭头指示器、动画过渡
 * - 完全键盘可访问、屏幕阅读器友好
 * - 主题感知、RTL 支持
 */

'use client';

import React, { forwardRef, useId, useMemo } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';
export type TooltipAlign = 'start' | 'center' | 'end';
export type TooltipVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface TooltipProps {
  /** 提示内容 */
  content: React.ReactNode;
  /** 触发元素 */
  children: React.ReactElement;
  /** 位置 */
  side?: TooltipSide;
  /** 对齐 */
  align?: TooltipAlign;
  /** 变体 */
  variant?: TooltipVariant;
  /** 偏移距离 */
  sideOffset?: number;
  /** 对齐偏移 */
  alignOffset?: number;
  /** 显示延迟（ms） */
  delayDuration?: number;
  /** 隐藏延迟（ms） */
  skipDelayDuration?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否打开（受控） */
  open?: boolean;
  /** 默认打开（非受控） */
  defaultOpen?: boolean;
  /** 打开/关闭回调 */
  onOpenChange?: (open: boolean) => void;
  /** 提示框 ID */
  tooltipId?: string;
  /** 类名 */
  className?: string;
}

export interface TooltipTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  side?: TooltipSide;
  align?: TooltipAlign;
  variant?: TooltipVariant;
}

export interface TooltipArrowProps extends React.SVGAttributes<SVGSVGElement> {
  width?: number;
  height?: number;
}

export interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
}

// ============================================
// 样式变体
// ============================================

const variantStyles = {
  default: 'bg-popover-bg text-popover-text border border-popover-border shadow-popover',
  success: 'bg-success text-success-foreground border border-success',
  warning: 'bg-warning text-warning-foreground border border-warning',
  danger: 'bg-danger text-danger-foreground border border-danger',
  info: 'bg-primary text-primary-foreground border border-primary',
};

const sideStyles = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
  left: 'right-full mr-2',
  right: 'left-full ml-2',
};

const alignStyles = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
};

// ============================================
// TooltipProvider
// ============================================

export function TooltipProvider({
  children,
  delayDuration = 200,
  skipDelayDuration = 100,
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
    >
      {children}
    </TooltipPrimitive.Provider>
  );
}

// ============================================
// Tooltip 根组件
// ============================================

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      className,
      content,
      children,
      side = 'top',
      align = 'center',
      variant = 'default',
      sideOffset = 6,
      alignOffset = 0,
      delayDuration = 200,
      skipDelayDuration = 100,
      disabled = false,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      tooltipId,
    },
    ref
  ) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const currentOpen = isControlled ? controlledOpen : uncontrolledOpen;
    
    const generatedId = useId();
    const id = tooltipId || generatedId;

    const handleOpenChange = (open: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      onOpenChange?.(open);
    };

    // 只渲染单个子元素
    const child = React.Children.only(children);

    // disabled 状态下不渲染 Tooltip
    if (disabled) {
      return <>{React.Children.only(children)}</>;
    }

    return (
      <TooltipPrimitive.Root
        ref={ref}
        open={currentOpen}
        onOpenChange={handleOpenChange}
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
        className={cn('relative inline-block')}
      >
        <TooltipPrimitive.Trigger asChild>
          {React.Children.only(children)}
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            id={id}
            side={side}
            align={align}
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            className={cn(
              'relative z-50 rounded-lg px-3 py-2 text-sm font-medium',
              'animate-fade-in slide-up',
              variantStyles[variant],
              sideStyles[side],
              alignStyles[align]
            )}
            style={{
              '--radix-tooltip-trigger-area': 'var(--radix-tooltip-trigger-area)',
            } as React.CSSProperties}
          >
            <TooltipPrimitive.Arrow
              className={cn(
                'fill-current',
                variant === 'default' && 'fill-popover-bg',
                variant === 'success' && 'fill-success',
                variant === 'warning' && 'fill-warning',
                variant === 'danger' && 'fill-danger',
                variant === 'info' && 'fill-primary'
              )}
              width={8}
              height={4}
            />
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );
  }
);
Tooltip.displayName = 'Tooltip';

// ============================================
// 便捷子组件
// ============================================

export const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ className, asChild = false, children, ...props }, ref) => (
    <TooltipPrimitive.Trigger
      ref={ref}
      asChild={asChild}
      className={cn('', className)}
      {...props}
    >
      {children}
    </TooltipPrimitive.Trigger>
  )
);
TooltipTrigger.displayName = 'TooltipTrigger';

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = 'top', align = 'center', variant = 'default', children, ...props }, ref) => (
    <TooltipPrimitive.Content
      ref={ref}
      side={side}
      align={align}
      className={cn(
        'relative z-50 rounded-lg px-3 py-2 text-sm font-medium',
        'animate-fade-in slide-up',
        variantStyles[variant],
        sideStyles[side],
        alignStyles[align],
        className
      )}
      {...props}
    >
      <TooltipPrimitive.Arrow
        className={cn(
          'fill-current',
          variant === 'default' && 'fill-popover-bg',
          variant === 'success' && 'fill-success',
          variant === 'warning' && 'fill-warning',
          variant === 'danger' && 'fill-danger',
          variant === 'info' && 'fill-primary'
        )}
        width={8}
        height={4}
      />
      {children}
    </TooltipPrimitive.Content>
  )
);
TooltipContent.displayName = 'TooltipContent';

export const TooltipArrow = forwardRef<SVGSVGElement, TooltipArrowProps>(
  ({ className, width = 8, height = 4, ...props }, ref) => (
    <TooltipPrimitive.Arrow
      ref={ref}
      width={width}
      height={height}
      className={cn('fill-current', className)}
      {...props}
    />
  )
);
TooltipArrow.displayName = 'TooltipArrow';

// ============================================
// 便捷 Hook
// ============================================

export function useTooltip() {
  // 可扩展：返回全局 Tooltip 状态管理
  return {};
}