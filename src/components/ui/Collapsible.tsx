/**
 * Collapsible - 可折叠面板组件
 * 基于 @radix-ui/react-collapsible 封装
 */

'use client';

import React, { forwardRef } from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleProps extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> {
  /** 触发器内容 */
  trigger: React.ReactNode;
  /** 面板内容 */
  children: React.ReactNode;
  /** 是否默认打开 */
  open?: boolean;
  /** 默认打开（非受控） */
  defaultOpen?: boolean;
  /** 打开/关闭回调 */
  onOpenChange?: (open: boolean) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ className, trigger, children, open: controlledOpen, defaultOpen = false, onOpenChange, disabled = false, ...props }, ref) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const currentOpen = isControlled ? controlledOpen : uncontrolledOpen;

    const handleOpenChange = (open: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      onOpenChange?.(open);
    };

    return (
      <CollapsiblePrimitive.Root
        ref={ref}
        open={currentOpen}
        onOpenChange={handleOpenChange}
        disabled={disabled}
        className={cn('border border-border rounded-lg overflow-hidden', className)}
        {...props}
      >
        <CollapsiblePrimitive.Trigger
          className={cn(
            'flex w-full items-center justify-between gap-4 px-4 py-3 text-sm font-medium',
            'bg-accent hover:bg-accent/80 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            disabled && 'opacity-50 pointer-events-none'
          )}
          aria-expanded={currentOpen}
        >
          {trigger}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              currentOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </CollapsiblePrimitive.Trigger>
        <CollapsiblePrimitive.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-4 pb-4">
            {children}
          </div>
        </CollapsiblePrimitive.Content>
      </CollapsiblePrimitive.Root>
    );
  }
);
Collapsible.displayName = 'Collapsible';

export const CollapsibleTrigger = CollapsiblePrimitive.Trigger;
export const CollapsibleContent = CollapsiblePrimitive.Content;