/**
 * Input - 输入框组件
 * 
 * 特性：
 * - 多变体：default / filled / outlined / ghost
 * - 多尺寸：sm / md / lg
 * - 标签、错误提示、帮助文本、前后缀图标
 * - 完整的表单集成（React Hook Form / Zod 兼容）
 * - 键盘可访问、屏幕阅读器友好
 * - 主题感知
 */

'use client';

import React, { forwardRef, useId, useMemo } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'readonly'> {
  /** 标签文本 */
  label?: string;
  /** 帮助文本 */
  hint?: string;
  /** 错误提示 */
  error?: string;
  /** 变体 */
  variant?: 'default' | 'filled' | 'outlined' | 'ghost';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 前置元素 */
  prefix?: React.ReactNode;
  /** 后置元素 */
  suffix?: React.ReactNode;
  /** 前置图标 */
  leftIcon?: React.ReactNode;
  /** 后置图标 */
  rightIcon?: React.ReactNode;
  /** 是否必填 */
  required?: boolean;
  /** 作为子元素渲染 */
  asChild?: boolean;
  /** 错误消息 ID（用于 aria-describedby） */
  errorId?: string;
  /** 帮助文本 ID */
  hintId?: string;
  /** 只读 */
  readonly?: boolean;
}

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size' | 'readonly'> {
  label?: string;
  hint?: string;
  error?: string;
  variant?: 'default' | 'filled' | 'outlined' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  required?: boolean;
  asChild?: boolean;
  errorId?: string;
  hintId?: string;
  readonly?: boolean;
}

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  asChild?: boolean;
}

// ============================================
// 样式变体
// ============================================

const inputVariants = {
  default: [
    'bg-input-bg border border-input-border',
    'placeholder:text-input-placeholder',
    'focus:border-input-focus-border focus:ring-2 focus:ring-input-focus-ring',
    'disabled:bg-disabled-bg disabled:text-disabled-text disabled:border-disabled-border disabled:cursor-not-allowed',
  ],
  filled: [
    'bg-accent border-none',
    'placeholder:text-input-placeholder',
    'focus:ring-2 focus:ring-input-focus-ring',
    'disabled:bg-disabled-bg disabled:text-disabled-text disabled:cursor-not-allowed',
  ],
  outlined: [
    'bg-transparent border-2 border-input-border',
    'placeholder:text-input-placeholder',
    'focus:border-input-focus-border focus:ring-2 focus:ring-input-focus-ring',
    'disabled:border-disabled-border disabled:text-disabled-text disabled:cursor-not-allowed',
  ],
  ghost: [
    'bg-transparent border-none border-b border-input-border rounded-none',
    'placeholder:text-input-placeholder',
    'focus:border-input-focus-border focus:ring-0',
    'disabled:border-disabled-border disabled:text-disabled-text disabled:cursor-not-allowed',
  ],
};

const sizeVariants = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-3 text-sm gap-2',
  lg: 'h-12 px-4 text-base gap-2.5',
};

// ============================================
// Label 组件
// ============================================

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required = false, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'label';
    return (
      <Comp
        ref={ref}
        className={cn('block text-sm font-medium text-foreground mb-1.5', className)}
        {...props}
      >
        {children}
        {required && (
          <span className="text-danger ml-0.5" aria-hidden="true">*</span>
        )}
      </Comp>
    );
  }
);
Label.displayName = 'Label';

// ============================================
// Input 组件
// ============================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      hint,
      error,
      variant = 'default',
      size = 'md',
      prefix,
      suffix,
      leftIcon,
      rightIcon,
      required = false,
      asChild = false,
      id: providedId,
      disabled,
      readonly,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      'aria-required': ariaRequired,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = useId();
    const hintId = useId();
    
    const describedBy = useMemo(() => {
      const ids = [];
      if (error) ids.push(errorId);
      if (hint && !error) ids.push(hintId);
      if (ariaDescribedBy) ids.push(ariaDescribedBy);
      return ids.length > 0 ? ids.join(' ') : undefined;
    }, [error, hint, errorId, hintId, ariaDescribedBy]);

    const Comp = asChild ? Slot : 'input';

    return (
      <div className="w-full">
        {label && (
          <Label htmlFor={id} required={required} className="mb-1.5">
            {label}
          </Label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-muted-foreground pointer-events-none flex items-center">
              {prefix}
            </span>
          )}
          {leftIcon && (
            <span className="absolute left-3 text-muted-foreground pointer-events-none flex items-center">
              {leftIcon}
            </span>
          )}
          <Comp
            ref={ref}
            id={id}
            type={type}
            className={cn(
              'w-full outline-none transition-all duration-fast ease-standard',
              'rounded-lg',
              inputVariants[variant],
              sizeVariants[size],
              (prefix || leftIcon) && 'pl-10',
              (suffix || rightIcon) && 'pr-10',
              className
            )}
            disabled={disabled}
            readOnly={readonly}
            required={required}
            aria-invalid={error ? 'true' : ariaInvalid}
            aria-required={required ? 'true' : ariaRequired}
            aria-describedby={describedBy}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-muted-foreground pointer-events-none flex items-center">
              {suffix}
            </span>
          )}
          {rightIcon && (
            <span className="absolute right-3 text-muted-foreground pointer-events-none flex items-center">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ============================================
// Textarea 组件
// ============================================

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      hint,
      error,
      variant = 'default',
      size = 'md',
      required = false,
      asChild = false,
      id: providedId,
      disabled,
      readonly,
      rows = 3,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      'aria-required': ariaRequired,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = useId();
    const hintId = useId();
    
    const describedBy = useMemo(() => {
      const ids = [];
      if (error) ids.push(errorId);
      if (hint && !error) ids.push(hintId);
      if (ariaDescribedBy) ids.push(ariaDescribedBy);
      return ids.length > 0 ? ids.join(' ') : undefined;
    }, [error, hint, errorId, hintId, ariaDescribedBy]);

    const Comp = asChild ? Slot : 'textarea';

    return (
      <div className="w-full">
        {label && (
          <Label htmlFor={id} required={required} className="mb-1.5">
            {label}
          </Label>
        )}
        <Comp
          ref={ref}
          id={id}
          className={cn(
            'w-full outline-none transition-all duration-fast ease-standard resize-none',
            'rounded-lg p-3',
            inputVariants[variant],
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base',
            disabled && 'disabled:bg-disabled-bg disabled:text-disabled-text disabled:border-disabled-border disabled:cursor-not-allowed',
            className
          )}
          disabled={disabled}
          readOnly={readonly}
          required={required}
          rows={rows}
          aria-invalid={error ? 'true' : ariaInvalid}
          aria-required={required ? 'true' : ariaRequired}
          aria-describedby={describedBy}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ============================================
// InputGroup 组合组件
// ============================================

export interface InputGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('flex w-full items-center', className)} {...props}>
      {children}
    </div>
  )
);
InputGroup.displayName = 'InputGroup';

export const InputGroupAddon = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center px-3 text-sm text-muted-foreground bg-accent border border-border',
        'first:rounded-r-none last:rounded-l-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
InputGroupAddon.displayName = 'InputGroupAddon';

// 类型已在声明处导出