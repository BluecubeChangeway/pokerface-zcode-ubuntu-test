/**
 * Switch - 开关组件
 * 基于 @radix-ui/react-switch 封装 (v1.4.1)
 * 
 * 特性：
 * - 完全键盘可访问（Space、Enter）
 * - 受控/非受控模式
 * - 多尺寸：sm / md / lg
 * - 标签、描述、错误状态
 * - 主题感知、动效支持
 * - RTL 支持
 */

'use client';

import React, { forwardRef, useId, useMemo, useState, useEffect, useCallback } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

export interface SwitchProps {
  /** 是否选中（受控） */
  checked?: boolean;
  /** 默认选中（非受控） */
  defaultChecked?: boolean;
  /** 变化回调 */
  onCheckedChange?: (checked: boolean) => void;
  /** 标签文本 */
  label?: string;
  /** 描述文本 */
  description?: string;
  /** 错误提示 */
  error?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否必填 */
  required?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 标签位置 */
  labelPosition?: 'left' | 'right';
  /** 作为子元素渲染 */
  asChild?: boolean;
  /** 存储键名（用于持久化） */
  storageKey?: string;
  /** ID */
  id?: string;
  /** 类名 */
  className?: string;
  /** 标签/描述/错误/子内容 */
  children?: React.ReactNode;
}

// ============================================
// 样式变体
// ============================================

const thumbStyles = cn(
  'block rounded-full bg-background shadow-sm ring-0 transition-transform duration-fast ease-standard',
  'data-[state=checked]:translate-x-full data-[state=unchecked]:translate-x-0',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

const trackStyles = cn(
  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full',
  'border-2 border-border transition-colors duration-fast ease-standard',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
  'data-[state=unchecked]:bg-input-bg data-[state=unchecked]:border-input-border',
  'disabled:opacity-50 disabled:cursor-not-allowed',
);

const sizeStyles = {
  sm: {
    track: 'h-5 w-9',
    thumb: 'h-4 w-4',
  },
  md: {
    track: 'h-6 w-11',
    thumb: 'h-5 w-5',
  },
  lg: {
    track: 'h-7 w-13',
    thumb: 'h-6 w-6',
  },
};

// ============================================
// Switch 组件
// ============================================

export const Switch = forwardRef<HTMLLabelElement, SwitchProps>(
  (
    {
      className,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      label,
      description,
      error,
      disabled = false,
      required = false,
      size = 'md',
      labelPosition = 'right',
      asChild = false,
      storageKey,
      id: providedId,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const currentChecked = isControlled ? controlledChecked : uncontrolledChecked;
    
    const generatedId = useId();
    const id = providedId || generatedId;
    const descriptionId = useId();
    const errorId = useId();
    
    const describedBy = useMemo(() => {
      const ids = [];
      if (description) ids.push(descriptionId);
      if (error) ids.push(errorId);
      return ids.length > 0 ? ids.join(' ') : undefined;
    }, [description, error, descriptionId, errorId]);

    const handleChange = useCallback((checked: boolean) => {
      if (!isControlled) {
        setUncontrolledChecked(checked);
      }
      onCheckedChange?.(checked);
      
      // 持久化
      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, String(checked));
      }
    }, [isControlled, onCheckedChange, storageKey]);

    // 从存储恢复（仅非受控模式）
    useEffect(() => {
      if (!isControlled && storageKey && typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
          setUncontrolledChecked(stored === 'true');
        }
      }
    }, [isControlled, storageKey]);

    const s = sizeStyles[size];

    return (
      <SwitchPrimitive.Root
        checked={currentChecked}
        onCheckedChange={handleChange}
        disabled={disabled}
        required={required}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        aria-required={required}
        className={cn('flex items-center gap-3 cursor-pointer', labelPosition === 'left' && 'flex-row-reverse', className)}
        {...props}
      >
        <SwitchPrimitive.Thumb className={cn(thumbStyles, s.thumb)} />
        <SwitchPrimitive.Switch
          className={cn(trackStyles, s.track)}
          aria-label={label}
        >
          <input type="checkbox" className="peer h-4 w-4" />
        </SwitchPrimitive.Switch>
        
        {(label || description || error || children) && (
          <div className="flex flex-col gap-0.5 text-sm">
            {label && (
              <span className={cn('font-medium text-foreground', disabled && 'opacity-50')}>
                {label}
                {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
              </span>
            )}
            {description && !error && (
              <p id={descriptionId} className="text-muted-foreground">
                {description}
              </p>
            )}
            {error && (
              <p id={errorId} className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            {children && (
              <span className="text-muted-foreground">{children}</span>
            )}
          </div>
        )}
      </SwitchPrimitive.Root>
    );
  }
);
Switch.displayName = 'Switch';

// ============================================
// 便捷子组件
// ============================================

export const SwitchThumb = SwitchPrimitive.Thumb;
export const SwitchSwitch = SwitchPrimitive.Switch;