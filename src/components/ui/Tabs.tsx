/**
 * Tabs - 标签页组件
 * 基于 @radix-ui/react-tabs 封装 (v1.2.1)
 * 
 * 特性：
 * - 完全键盘可访问（方向键、Home、End、Enter/Space）
 * - 受控/非受控模式
 * - 多变体：line / enclosed / soft / pills
 * - 图标支持、禁用态、懒加载内容
 * - 主题感知、RTL 支持
 */

'use client';

import React, { forwardRef, useId, useMemo, useState } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
  tooltip?: string;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 标签项列表 */
  items: TabItem[];
  /** 当前激活标签（受控） */
  value?: string;
  /** 默认激活标签（非受控） */
  defaultValue?: string;
  /** 变体 */
  variant?: 'line' | 'enclosed' | 'soft' | 'pills';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 方向 */
  orientation?: 'horizontal' | 'vertical' | undefined;
  /** 激活回调 */
  onValueChange?: (value: string) => void;
  /** 是否懒加载内容 */
  lazy?: boolean;
  /** 全宽 */
  fullWidth?: boolean;
  /** 类名 */
  className?: string;
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: React.ReactNode;
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children?: React.ReactNode;
  forceMount?: boolean;
}

// ============================================
// 样式变体
// ============================================

const listVariants = {
  line: 'bg-transparent',
  enclosed: 'bg-muted rounded-lg p-1',
  soft: 'bg-transparent',
  pills: 'bg-transparent',
};

const triggerVariants = {
  line: 'bg-transparent hover:bg-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none',
  enclosed: 'data-[state=active]:bg-background data-[state=active]:shadow-sm',
  soft: 'data-[state=active]:bg-accent data-[state=active]:text-accent-foreground',
  pills: 'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
};

// ============================================
// Tabs 根组件
// ============================================

export function Tabs({
  items,
  value: controlledValue,
  defaultValue,
  variant = 'line',
  size = 'md',
  orientation = 'horizontal',
  onValueChange,
  lazy = false,
  fullWidth = false,
  className,
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || items[0]?.value || '');
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : uncontrolledValue;
  
  const handleValueChange = (value: string) => {
    if (!isControlled) {
      setUncontrolledValue(value);
    }
    onValueChange?.(value);
  };

  const generatedId = useId();
  const tabsId = `tabs-${generatedId}`;

  const variantStyles = useMemo(() => ({
    list: listVariants[variant],
    trigger: triggerVariants[variant],
  }), [variant]);

  const sizeStyles = useMemo(() => ({
    sm: 'px-2 py-1.5 text-xs gap-1',
    md: 'px-3 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-base gap-2',
  }), []);

  return (
    <TabsPrimitive.Root
      value={currentValue}
      onValueChange={handleValueChange}
      orientation={orientation}
      dir="ltr"
      activationMode="automatic"
      className={cn('w-full', fullWidth && 'w-full', className)}
      {...props}
    >
      {/* 标签列表 */}
      <TabsPrimitive.List
        aria-label="标签页"
        className={cn(
          'flex items-center gap-1',
          orientation === 'vertical' && 'flex-col',
          fullWidth && 'w-full',
          variantStyles.list,
          'relative'
        )}
        role="tablist"
      >
        {items.map((item, index) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              'relative flex items-center gap-1.5 font-medium transition-all duration-fast ease-standard',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
              'rounded-md',
              triggerVariants[variant],
              sizeStyles[size],
              orientation === 'vertical' && 'w-full justify-start',
              fullWidth && 'flex-1 justify-center'
            )}
            aria-controls={`${tabsId}-panel-${item.value}`}
            aria-selected={currentValue === item.value}
          >
            {item.icon && <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
            {item.badge !== undefined && item.badge !== '' && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-accent-foreground">
                {item.badge}
              </span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {/* 标签内容 */}
      {items.map(item => (
        <TabsPrimitive.Content
          key={item.value}
          value={item.value}
          forceMount={!lazy}
          className={cn(
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'mt-4',
            orientation === 'vertical' && 'mt-0 ml-4',
            lazy && 'animate-fade-in'
          )}
          aria-labelledby={`${tabsId}-trigger-${item.value}`}
          id={`${tabsId}-panel-${item.value}`}
          role="tabpanel"
          tabIndex={0}
        >
          {children}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

Tabs.displayName = 'Tabs';

// ============================================
// 便捷子组件
// ============================================

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  )
);
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, disabled, icon, badge, children, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      disabled={disabled}
      className={cn(
        'relative flex items-center gap-1.5 font-medium transition-all duration-fast ease-standard',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'rounded-md px-3 py-2 text-sm',
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
      <span className="truncate">{children}</span>
      {badge !== undefined && badge !== '' && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-accent-foreground">
          {badge}
        </span>
      )}
    </TabsPrimitive.Trigger>
  )
);
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, forceMount, children, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      value={value}
      forceMount={forceMount}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'mt-4 p-0',
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Content>
  )
);
TabsContent.displayName = 'TabsContent';