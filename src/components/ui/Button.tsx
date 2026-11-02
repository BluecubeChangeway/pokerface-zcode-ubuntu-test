/**
 * Button - 基础按钮组件
 * 
 * 特性：
 * - 多变体：primary / secondary / success / warning / danger / ghost / subtle / outline
 * - 多尺寸：sm / md / lg / xl
 * - 加载状态、禁用状态
 * - 图标支持（前置/后置）
 * - 全键盘可访问、屏幕阅读器友好
 * - 主题感知（语义色自动适配 light/dark）
 */

'use client';

import React, { forwardRef, useMemo } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ============================================
// 类型定义
// ============================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'subtle' | 'outline';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 加载时文本 */
  loadingText?: string;
  /** 前置图标 */
  leftIcon?: React.ReactNode;
  /** 后置图标 */
  rightIcon?: React.ReactNode;
  /** 是否全宽 */
  fullWidth?: boolean;
  /** 作为子元素渲染（用于 Link 等） */
  asChild?: boolean;
}

// ============================================
// CVA 变体定义
// ============================================

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-fast ease-standard',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
    'rounded-lg',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary text-primary-foreground',
          'hover:bg-primary-hover',
          'shadow-sm',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground',
          'hover:bg-secondary-hover',
        ],
        success: [
          'bg-success text-success-foreground',
          'hover:bg-success-hover',
        ],
        warning: [
          'bg-warning text-warning-foreground',
          'hover:bg-warning-hover',
        ],
        danger: [
          'bg-danger text-danger-foreground',
          'hover:bg-danger-hover',
        ],
        ghost: [
          'bg-transparent text-foreground',
          'hover:bg-accent hover:text-accent-foreground',
        ],
        subtle: [
          'bg-primary-subtle text-primary',
          'hover:bg-primary hover:text-primary-foreground',
        ],
        outline: [
          'border border-border bg-transparent',
          'hover:bg-accent hover:text-accent-foreground',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2',
        xl: 'h-14 px-8 text-lg gap-2.5',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

// ============================================
// Button 组件
// ============================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth,
      asChild = false,
      disabled,
      children,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    
    const isDisabled = disabled || loading;
    
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{loadingText || '加载中...'}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>}
            <span className="truncate">{children}</span>
            {rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

// ============================================
// 便捷导出：预设变体组件
// ============================================

export const PrimaryButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <Button ref={ref} variant="primary" className={className} {...props} />
  )
);
PrimaryButton.displayName = 'PrimaryButton';

export const SecondaryButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <Button ref={ref} variant="secondary" className={className} {...props} />
  )
);
SecondaryButton.displayName = 'SecondaryButton';

export const DangerButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <Button ref={ref} variant="danger" className={className} {...props} />
  )
);
DangerButton.displayName = 'DangerButton';

export const GhostButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <Button ref={ref} variant="ghost" className={className} {...props} />
  )
);
GhostButton.displayName = 'GhostButton';

export const SubtleButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <Button ref={ref} variant="subtle" className={className} {...props} />
  )
);
SubtleButton.displayName = 'SubtleButton';

export const OutlineButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <Button ref={ref} variant="outline" className={className} {...props} />
  )
);
OutlineButton.displayName = 'OutlineButton';

// 类型已在声明处导出
export { buttonVariants };