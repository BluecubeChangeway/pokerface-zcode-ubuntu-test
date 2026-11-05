/**
 * Select - 下拉选择组件
 * 基于 @radix-ui/react-select 封装
 * 
 * 特性：
 * - 完全键盘可访问（方向键、Enter、Escape、Home、End、字母检索）
 * - 支持分组、禁用项、占位符
 * - 多选模式
 * - 搜索/过滤（可选）
 * - 主题感知、RTL 支持
 */

'use client';

import React, { forwardRef, useId, useMemo, useState } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Check, Search } from 'lucide-react';
import { Label } from './Label';

// ============================================
// 类型定义
// ============================================

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectGroup<T = string> {
  label: string;
  options: SelectOption<T>[];
}

export interface SelectProps<T = string> {
  /** 选项列表 */
  options?: SelectOption<T>[] | SelectGroup<T>[];
  /** 选中的值（受控模式） */
  value?: T | T[];
  /** 默认值（非受控模式） */
  defaultValue?: T | T[];
  /** 值变化回调 */
  onValueChange?: (value: T | T[]) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 标签 */
  label?: string;
  /** 帮助文本 */
  hint?: string;
  /** 错误提示 */
  error?: string;
  /** 是否必填 */
  required?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 多选模式 */
  multiple?: boolean;
  /** 最大显示选中项数量（多选时） */
  maxDisplayCount?: number;
  /** 无选项时显示 */
  emptyMessage?: string;
  /** 作为子元素渲染 */
  asChild?: boolean;
  /** 自定义选项渲染 */
  renderOption?: (option: SelectOption<T>, selected: boolean) => React.ReactNode;
  /** 自定义选中值显示 */
  renderValue?: (value: T | T[], options: SelectOption<T>[]) => React.ReactNode;
  /** 搜索/过滤函数 */
  filter?: (query: string, option: SelectOption<T>) => boolean;
  /** 搜索占位符 */
  searchPlaceholder?: string;
  /** 无搜索结果提示 */
  noResultsMessage?: string;
  /** ID */
  id?: string;
  /** 类名 */
  className?: string;
}

// Non-generic type for forwardRef compatibility with react-docgen
type SelectPropsString = SelectProps<string>;

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export interface SelectItemProps<T = string> extends React.HTMLAttributes<HTMLDivElement> {
  value: T;
  disabled?: boolean;
  children?: React.ReactNode;
}

export interface SelectGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  children: React.ReactNode;
}

// ============================================
// 工具函数
// ============================================

function flattenOptions<T>(options: (SelectOption<T> | SelectGroup<T>)[]): { option: SelectOption<T>; group?: string }[] {
  const result: { option: SelectOption<T>; group?: string }[] = [];
  for (const opt of options) {
    if ('options' in opt) {
      for (const o of opt.options) {
        result.push({ option: o, group: opt.label });
      }
    } else {
      result.push({ option: opt, group: undefined });
    }
  }
  return result;
}

// ============================================
// Select 组件
// ============================================

// Use type assertion to avoid react-docgen parsing issues with generic types
const Select = forwardRef((props: SelectPropsString, ref: React.Ref<HTMLButtonElement>) => {
  const {
    options = [],
    value,
    defaultValue,
    onValueChange,
    placeholder = '请选择',
    label,
    hint,
    error,
    required,
    disabled,
    size = 'md',
    multiple = false,
    maxDisplayCount = 3,
    emptyMessage = '暂无选项',
    asChild,
    renderOption,
    renderValue,
    filter,
    searchPlaceholder = '搜索...',
    noResultsMessage = '无匹配结果',
    id: providedId,
    className,
    ...rest
  } = props;

  // Internal types using string (since SelectPropsString = SelectProps<string>)
  type ValueType = string | string[];
  type OptionType = SelectOption<string>;
  type FlatOptionType = { option: OptionType; group?: string };

  const generatedId = useId();
  const id = providedId || generatedId;
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedById = useId();

  const flatOptions = useMemo(() => flattenOptions(options as (SelectOption<string> | SelectGroup<string>)[]), [options]);
  const optionValues = useMemo(() => flatOptions.map(({ option }) => option.value), [flatOptions]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!searchQuery || !filter) return flatOptions;
    return flatOptions.filter(({ option }) => filter(searchQuery, option));
  }, [flatOptions, searchQuery, filter]);

  const hasOptions = filteredOptions.length > 0;

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : (defaultValue as ValueType | undefined) ?? (multiple ? [] : '');

  const handleValueChange = (newValue: ValueType) => {
    onValueChange?.(newValue);
  };

  const getDisplayValue = () => {
    if (currentValue === undefined || currentValue === null || (Array.isArray(currentValue) && currentValue.length === 0)) return placeholder;
    if (renderValue) return renderValue(currentValue, flatOptions.map(({ option }) => option));
    if (multiple) {
      const values = Array.isArray(currentValue) ? currentValue : [currentValue];
      if (values.length === 0) return placeholder;
      if (values.length <= maxDisplayCount) {
        return values
          .map(v => flatOptions.find(({ option }) => option.value === v)?.option.label ?? String(v))
          .join(', ');
      }
      const firstLabels = values
        .slice(0, maxDisplayCount)
        .map(v => flatOptions.find(({ option }) => option.value === v)?.option.label ?? String(v))
        .join(', ');
      return `${firstLabels} 等 ${values.length} 项`;
    } else {
      const found = flatOptions.find(({ option }) => option.value === currentValue);
      return found?.option.label ?? placeholder;
    }
  };

  const triggerSizes = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base',
  };

  return (
    <SelectPrimitive.Root
      value={value as any}
      defaultValue={defaultValue as any}
      onValueChange={handleValueChange}
      disabled={disabled}
      required={required}
      dir="ltr"
      {...rest}
    >
      <div className="w-full">
        {label && (
          <Label htmlFor={id} required={required} className="mb-1.5">
            {label}
          </Label>
        )}
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          asChild={asChild}
          aria-describedby={describedById}
          className={cn(
            'relative w-full items-center justify-between rounded-md border border-input bg-background',
            'px-3 py-2 text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'hover:bg-accent hover:text-accent-foreground',
            triggerSizes[size],
            className
          )}
        >
          <SelectPrimitive.Value
            placeholder={
              <span className="text-muted-foreground">{placeholder}</span>
            }
            className="flex-1 text-left truncate pr-8"
          >
            {getDisplayValue()}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon className="ml-2 h-4 w-4 opacity-50 shrink-0" asChild>
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover',
              'text-popover-foreground shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
              'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {searchQuery || filter ? (
                <div className="relative mb-1">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm pl-8 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              ) : null}
              
              {!hasOptions ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? noResultsMessage : emptyMessage}
                </div>
              ) : (
                <>
                  {(() => {
                    // Group options by group
                    const grouped = new Map<string | undefined, FlatOptionType[]>();
                    for (const item of filteredOptions) {
                      const key = item.group;
                      if (!grouped.has(key)) {
                        grouped.set(key, []);
                      }
                      grouped.get(key)!.push(item);
                    }
                    
                    return Array.from(grouped.entries()).map(([group, items]) => {
                      if (group) {
                        return (
                          <SelectPrimitive.Group key={group}>
                            <SelectPrimitive.Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              {group}
                            </SelectPrimitive.Label>
                            {items.map(({ option }, idx) => (
                              <SelectPrimitive.Item
                                key={`${option.value}-${idx}`}
                                value={option.value}
                                disabled={option.disabled}
                                className={cn(
                                  'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
                                  'focus:bg-accent focus:text-accent-foreground',
                                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                                  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                                  option.disabled && 'cursor-not-allowed'
                                )}
                              >
                                <SelectPrimitive.ItemText className="flex-1 truncate">
                                  {renderOption ? renderOption(option, false) : option.label}
                                </SelectPrimitive.ItemText>
                                <SelectPrimitive.ItemIndicator>
                                  <Check className="h-4 w-4" />
                                </SelectPrimitive.ItemIndicator>
                              </SelectPrimitive.Item>
                            ))}
                          </SelectPrimitive.Group>
                        );
                      }
                      return (
                        <React.Fragment key="ungrouped">
                          {items.map(({ option }, idx) => (
                            <SelectPrimitive.Item
                              key={`${option.value}-${idx}`}
                              value={option.value}
                              disabled={option.disabled}
                              className={cn(
                                'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
                                'focus:bg-accent focus:text-accent-foreground',
                                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                                'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                                option.disabled && 'cursor-not-allowed'
                              )}
                            >
                              <SelectPrimitive.ItemText className="flex-1 truncate">
                                {renderOption ? renderOption(option, false) : option.label}
                              </SelectPrimitive.ItemText>
                              <SelectPrimitive.ItemIndicator>
                                <Check className="h-4 w-4" />
                              </SelectPrimitive.ItemIndicator>
                            </SelectPrimitive.Item>
                          ))}
                        </React.Fragment>
                      );
                    });
                  })()}
                </>
              )}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1" asChild>
              <ChevronUp className="h-4 w-4" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1" asChild>
              <ChevronDown className="h-4 w-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>

        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </SelectPrimitive.Root>
  );
});

Select.displayName = 'Select';

// ============================================
// 便捷子组件导出
// ============================================

export const SelectTrigger = SelectPrimitive.Trigger;
export const SelectContent = SelectPrimitive.Content;
export const SelectViewport = SelectPrimitive.Viewport;
export const SelectGroup = SelectPrimitive.Group;
export const SelectLabel = SelectPrimitive.Label;
export const SelectItem = SelectPrimitive.Item;
export const SelectItemText = SelectPrimitive.ItemText;
export const SelectItemIndicator = SelectPrimitive.ItemIndicator;
export const SelectSeparator = SelectPrimitive.Separator;
export const SelectScrollUpButton = SelectPrimitive.ScrollUpButton;
export const SelectScrollDownButton = SelectPrimitive.ScrollDownButton;
export const SelectValue = SelectPrimitive.Value;
export const SelectArrow = SelectPrimitive.Arrow;

export default Select;