/**
 * Dialog - 对话框组件
 * 基于 @radix-ui/react-dialog 封装
 */

'use client';

import React, { forwardRef, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface DialogProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  /** 是否打开（受控） */
  open?: boolean;
  /** 默认打开（非受控） */
  defaultOpen?: boolean;
  /** 打开/关闭回调 */
  onOpenChange?: (open: boolean) => void;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 子元素 */
  children: React.ReactNode;
  /** 是否显示关闭按钮 */
  showClose?: boolean;
  /** 大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 类名 */
  className?: string;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({
    className,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    title,
    description,
    children,
    showClose = true,
    size = 'md',
    ...props
  }, ref) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const currentOpen = isControlled ? controlledOpen : uncontrolledOpen;

    const handleOpenChange = (open: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      onOpenChange?.(open);
    };

    const titleId = React.useId();
    const descriptionId = React.useId();

    // ESC 关闭
    useEffect(() => {
      if (!currentOpen) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleOpenChange(false);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentOpen, handleOpenChange]);

    // 防止 body 滚动
    useEffect(() => {
      if (currentOpen) {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [currentOpen]);

    const sizeStyles = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-4xl',
    };

    return (
      <DialogPrimitive.Root open={currentOpen} onOpenChange={handleOpenChange} {...props}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" />
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              'fixed z-50 w-full max-h-[90vh] overflow-y-auto rounded-xl',
              'bg-background text-foreground shadow-popover',
              'animate-slide-up',
              sizeStyles[size]
            )}
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
          >
            {(title || showClose) && (
              <div className="flex items-start justify-between gap-4 p-4 border-b border-border">
                <div>
                  {title && (
                    <DialogPrimitive.Title id={titleId} className="text-lg font-semibold">
                      {title}
                    </DialogPrimitive.Title>
                  )}
                  {description && (
                    <DialogPrimitive.Description id={descriptionId} className="text-sm text-muted-foreground mt-1">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                </div>
                {showClose && (
                  <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                    <span className="sr-only">关闭</span>
                  </DialogPrimitive.Close>
                )}
              </div>
            )}
            <div className="p-4">{children}</div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }
);
Dialog.displayName = 'Dialog';

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;
export const DialogOverlay = DialogPrimitive.Overlay;
export const DialogContent = DialogPrimitive.Content;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;