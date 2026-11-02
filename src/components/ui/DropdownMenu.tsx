/**
 * DropdownMenu - 下拉菜单组件
 * 基于 @radix-ui/react-dropdown-menu 封装
 */

'use client';

import React, { forwardRef } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, Circle } from 'lucide-react';

// ============================================
// 类型定义
// ============================================

export interface DropdownMenuItem {
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  shortcut?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'checkbox' | 'radio';
  checked?: boolean;
  value?: string;
  items?: DropdownMenuItem[]; // 子菜单
}

export interface DropdownMenuProps {
  /** 触发元素 */
  trigger: React.ReactElement;
  /** 菜单项 */
  items: DropdownMenuItem[];
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end';
  /** 偏移量 */
  sideOffset?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 模态模式 */
  modal?: boolean;
}

function DropdownMenu({
  trigger,
  items,
  align = 'start',
  sideOffset = 4,
  disabled = false,
  modal = false,
}: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger}
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={sideOffset}
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-lg border border-popover-border',
            'bg-popover-bg text-popover-text shadow-popover',
            'animate-fade-in slide-up'
          )}
        >
          {items.map((item, index) => (
            <DropdownMenuItemComponent key={index} item={item} />
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

function DropdownMenuItemComponent({ item }: { item: DropdownMenuItem }) {
  // 子菜单
  if (item.items && item.items.length > 0) {
    return (
      <DropdownMenuPrimitive.Sub>
        <DropdownMenuPrimitive.SubTrigger
          className={cn(
            'flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm outline-none',
            'focus:bg-accent focus:text-accent-foreground',
            'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
            item.disabled && 'pointer-events-none opacity-50'
          )}
          disabled={item.disabled}
        >
          {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
          {item.label}
          <ChevronRight className="ml-auto h-4 w-4" />
          {item.shortcut && (
            <span className="ml-auto text-xs tracking-widest opacity-60">{item.shortcut}</span>
          )}
        </DropdownMenuPrimitive.SubTrigger>
        <DropdownMenuPrimitive.SubContent className="z-50 min-w-[8rem] overflow-hidden rounded-lg border border-popover-border bg-popover-bg text-popover-text shadow-popover">
          {item.items.map((subItem, subIndex) => (
            <DropdownMenuItemComponent key={subIndex} item={subItem} />
          ))}
        </DropdownMenuPrimitive.SubContent>
      </DropdownMenuPrimitive.Sub>
    );
  }

  // 分割线
  if (item.label === '---') {
    return <DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />;
  }

// Checkbox 项
  if (item.variant === 'checkbox') {
    return (
      <DropdownMenuPrimitive.CheckboxItem
        checked={item.checked}
        disabled={item.disabled}
        onCheckedChange={item.onSelect}
        className={cn(
          'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-3 text-sm outline-none',
          'focus:bg-accent focus:text-accent-foreground',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
        )}
      >
        <span className="absolute left-3 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <Check className="h-4 w-4" />
          </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
        {item.label}
        {item.shortcut && (
          <span className="ml-auto text-xs tracking-widest opacity-60">{item.shortcut}</span>
        )}
      </DropdownMenuPrimitive.CheckboxItem>
    );
  }

  // Radio 项
  if (item.variant === 'radio') {
    return (
      <DropdownMenuPrimitive.RadioGroup
        value={item.checked ? item.value || item.label : ''}
        onValueChange={item.onSelect}
      >
        <DropdownMenuPrimitive.RadioItem
          value={item.value || item.label}
          disabled={item.disabled}
          className={cn(
            'relative flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm outline-none transition-colors',
            'focus:bg-accent focus:text-accent-foreground',
            'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
          )}
        >
          <span className="absolute left-3 flex h-3.5 w-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
              <Circle className="h-2.5 w-2.5 fill-current" />
            </DropdownMenuPrimitive.ItemIndicator>
          </span>
          {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
          {item.label}
          {item.shortcut && (
            <span className="ml-auto text-xs tracking-widest opacity-60">{item.shortcut}</span>
          )}
          {item.checked && (
            <span className="absolute right-3 flex h-4 w-4 items-center justify-center text-primary">
              <Check className="h-4 w-4" />
            </span>
          )}
        </DropdownMenuPrimitive.RadioItem>
      </DropdownMenuPrimitive.RadioGroup>
    );
  }

  // 普通项
  return (
    <DropdownMenuPrimitive.Item
      disabled={item.disabled}
      onSelect={item.onSelect}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        item.variant === 'destructive' && 'text-danger focus:bg-danger/10 focus:text-danger'
      )}
    >
      {item.icon && <span className="absolute left-3 h-4 w-4">{item.icon}</span>}
      {item.label}
      {item.shortcut && (
        <span className="ml-auto text-xs tracking-widest opacity-60">{item.shortcut}</span>
      )}
      {item.variant === 'destructive' && (
        <span className="absolute right-3 text-danger">!</span>
      )}
    </DropdownMenuPrimitive.Item>
  );
}

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuContent = DropdownMenuPrimitive.Content;
export const DropdownMenuItem = DropdownMenuPrimitive.Item;
export const DropdownMenuCheckboxItem = DropdownMenuPrimitive.CheckboxItem;
export const DropdownMenuRadioItem = DropdownMenuPrimitive.RadioItem;
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator;
export const DropdownMenuLabel = DropdownMenuPrimitive.Label;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuSubTrigger = DropdownMenuPrimitive.SubTrigger;
export const DropdownMenuSubContent = DropdownMenuPrimitive.SubContent;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
export const DropdownMenuArrow = DropdownMenuPrimitive.Arrow;